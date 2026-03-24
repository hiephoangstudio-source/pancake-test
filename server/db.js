import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Log pool errors
pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
});

/**
 * Run a query with automatic connection management.
 */
export async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 200) {
        console.warn(`Slow query (${duration}ms):`, text.substring(0, 80));
    }
    return result;
}

/**
 * Get a client from the pool for transactions.
 */
export async function getClient() {
    return pool.connect();
}

/**
 * Initialize database schema.
 */
export async function initDB() {
    try {
        const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
        await pool.query(schemaSQL);
        console.log('✅ Database schema initialized');
    } catch (err) {
        console.error('❌ Schema init error:', err.message);
        throw err;
    }
}

/**
 * Health check — ping the database.
 */
export async function pingDB() {
    const { rows } = await pool.query('SELECT NOW() AS now');
    return rows[0].now;
}

/**
 * Graceful shutdown.
 */
export async function closeDB() {
    await pool.end();
    console.log('Database pool closed');
}

export default pool;
