import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import { initDB, pingDB, closeDB, query } from './db.js';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import pagesRoutes from './routes/pages.js';
import usersRoutes from './routes/users.js';
import channelsRoutes from './routes/channels.js';
import syncRoutes from './routes/sync.js';
import webhookRoutes from './routes/webhook.js';
import statsRoutes from './routes/stats.js';
import ordersRoutes from './routes/orders.js';
import tagConfigRoutes from './routes/tagConfig.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// ── Security ───────────────────────────────
app.use(helmet());
app.use(cors({
    origin: [
        'https://pancake.2hstudio.vn',
        'https://2hstudio.gpems.app',
        'http://localhost:5173',      // Vite dev
        'http://localhost:3000',
    ],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Public routes (BEFORE auth middleware) ──
app.get('/api/health', async (req, res) => {
    try {
        const dbTime = await pingDB();
        res.json({ status: 'ok', db: dbTime, uptime: process.uptime() });
    } catch (err) {
        res.status(503).json({ status: 'error', message: err.message });
    }
});
app.use('/api/auth', authRoutes);

// SSE events — public endpoint (EventSource can't send custom headers)
const _sseClients = new Set();
export function getSSEClients() { return _sseClients; }
app.get('/api/sync/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });
    res.write('data: connected\n\n');
    _sseClients.add(res);
    const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch { clearInterval(hb); } }, 30000);
    req.on('close', () => { _sseClients.delete(res); clearInterval(hb); });
});

// JWT auth — protects all remaining /api/* routes
app.use('/api', authMiddleware);

// Request timing middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        if (ms > 500) console.warn(`⚠️ Slow: ${req.method} ${req.path} ${ms}ms`);
    });
    next();
});

// ── Protected routes ──────────────────────────
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/tag-config', tagConfigRoutes);

// ── Server-side cache for hot queries ──────
export const queryCache = new Map();
const CACHE_TTL = 60_000; // 60 seconds

export function getCached(key) {
    const entry = queryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
        queryCache.delete(key);
        return null;
    }
    return entry.data;
}

export function setCache(key, data, ttl = CACHE_TTL) {
    queryCache.set(key, { data, ts: Date.now(), ttl });
}

export function clearCache(prefix) {
    if (!prefix) { queryCache.clear(); return; }
    for (const key of queryCache.keys()) {
        if (key.startsWith(prefix)) queryCache.delete(key);
    }
}

// ── Smart Sync Strategy ────────────────────
function broadcast(eventName, data) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of _sseClients) {
        try { c.write(payload); } catch { _sseClients.delete(c); }
    }
}

// Delta sync: every 15 min — only changes since last sync (lightweight, avoids rate limits)
cron.schedule('*/15 * * * *', async () => {
    try {
        const { deltaSyncAllPages } = await import('./services/pancakeSync.js');
        const result = await deltaSyncAllPages();
        if (result.totalChanges > 0) {
            clearCache('dash');
            broadcast('data-updated', {
                changes: result.totalChanges,
                pages: result.pageCount,
                time: new Date().toISOString(),
            });
            console.log(`⚡ Delta sync: ${result.totalChanges} changes → SSE pushed`);
        }
    } catch (err) {
        console.error('❌ Delta sync error:', err.message);
    }
});

// Full sync: every 6 hours — last 30 days (catches updates/backfill/statistics)
cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Full sync: 30 days...');
    try {
        const { syncAllPages } = await import('./services/pancakeSync.js');
        await syncAllPages(30);
        clearCache('dash');
        broadcast('data-updated', { type: 'full', time: new Date().toISOString() });
        console.log('✅ Full sync done');
    } catch (err) {
        console.error('❌ Full sync error:', err.message);
    }
});

// Startup: check if initial seed is needed (data from Jan 2025)
setTimeout(async () => {
    try {
        const { rows } = await query('SELECT COUNT(*) AS c FROM daily_reports');
        const reportCount = parseInt(rows[0].c);

        if (reportCount < 100) {
            // First run — full seed from Jan 2025 (approx 450 days)
            const daysBack = Math.ceil((Date.now() - new Date('2025-01-01').getTime()) / 86400000);
            console.log(`🚀 Initial seed: pulling ${daysBack} days (since Jan 2025)...`);
            const { syncAllPages } = await import('./services/pancakeSync.js');
            await syncAllPages(daysBack);
            clearCache('dash');
            console.log('✅ Initial seed complete');
        } else {
            // Subsequent restarts — quick sync today only
            console.log('🚀 Startup sync: today...');
            const { syncAllPages } = await import('./services/pancakeSync.js');
            await syncAllPages(1);
            clearCache('dash');
            console.log('✅ Startup sync done');
        }
    } catch (err) {
        console.error('❌ Startup sync error:', err.message);
    }
}, 5000);

// ── Start ──────────────────────────────────
async function start() {
    try {
        await initDB();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 2H Studio API running on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Failed to start:', err);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await closeDB();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await closeDB();
    process.exit(0);
});

start();
