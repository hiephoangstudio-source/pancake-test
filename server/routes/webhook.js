import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/**
 * GET /api/webhook/config — Get webhook config
 */
router.get('/config', async (req, res) => {
    try {
        const { rows } = await query('SELECT id, provider, app_id, is_active, last_push_at FROM webhook_config LIMIT 1');
        res.json(rows[0] || { provider: 'appsheet', app_id: '', is_active: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/webhook/config — Save webhook config
 * Body: { app_id, api_key, is_active }
 * User will set APPSHEET_APP_ID and APPSHEET_API_KEY here
 */
router.post('/config', async (req, res) => {
    try {
        const { app_id, api_key, is_active = true } = req.body;

        await query(`
      INSERT INTO webhook_config (id, provider, app_id, api_key, is_active, updated_at)
      VALUES (1, 'appsheet', $1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        app_id = EXCLUDED.app_id,
        api_key = EXCLUDED.api_key,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `, [app_id || '', api_key || '', is_active]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/webhook/appsheet/push — Manually push data to AppSheet
 * Will use the configured app_id and api_key
 */
router.post('/appsheet/push', async (req, res) => {
    try {
        // Get config
        const { rows: [config] } = await query('SELECT * FROM webhook_config WHERE provider = $1 AND is_active = true LIMIT 1', ['appsheet']);

        if (!config || !config.app_id || !config.api_key) {
            return res.status(400).json({ error: 'AppSheet webhook not configured. Set app_id and api_key first.' });
        }

        // Get latest data to push
        const { from, to, pageId } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const fromDate = from || today;
        const toDate = to || today;
        const pageFilter = pageId ? 'AND page_id = $3' : '';
        const params = pageId ? [fromDate, toDate, pageId] : [fromDate, toDate];

        // Fetch daily reports for the range
        const { rows: reports } = await query(`
      SELECT date, user_pancake_id, user_name, page_id, conversations, total_messages,
             inbox_count, comment_count, unique_customers, has_phone, signed, wrong_target
      FROM daily_reports
      WHERE date >= $1 AND date <= $2 ${pageFilter}
      ORDER BY date DESC
    `, params);

        // Build AppSheet API request
        // AppSheet API: https://api.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action
        const appsheetUrl = `https://api.appsheet.com/api/v2/apps/${config.app_id}/tables/DailyReports/Action`;

        const payload = {
            Action: 'Add',
            Properties: { Locale: 'vi-VN', Timezone: 'Asia/Ho_Chi_Minh' },
            Rows: reports.map(r => ({
                Date: r.date,
                UserID: r.user_pancake_id,
                UserName: r.user_name,
                PageID: r.page_id || '',
                Conversations: r.conversations,
                Messages: r.total_messages,
                Inbox: r.inbox_count,
                Comment: r.comment_count,
                Customers: r.unique_customers,
                Phone: r.has_phone,
                Signed: r.signed,
                WrongTarget: r.wrong_target,
            })),
        };

        const response = await fetch(appsheetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ApplicationAccessKey': config.api_key,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({ status: response.status }));

        // Update last push time
        await query('UPDATE webhook_config SET last_push_at = NOW() WHERE id = $1', [config.id]);

        res.json({
            success: response.ok,
            status: response.status,
            rowsPushed: reports.length,
            appsheetResponse: result,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/webhook/appsheet/test — Test webhook connectivity
 */
router.post('/appsheet/test', async (req, res) => {
    try {
        const { rows: [config] } = await query('SELECT * FROM webhook_config WHERE provider = $1 LIMIT 1', ['appsheet']);

        if (!config?.app_id || !config?.api_key) {
            return res.json({ success: false, message: 'Chưa cấu hình AppSheet App ID hoặc API Key' });
        }

        // Simple ping to AppSheet
        const testUrl = `https://api.appsheet.com/api/v2/apps/${config.app_id}/tables/DailyReports/Action`;
        const testPayload = { Action: 'Find', Properties: { Locale: 'vi-VN' }, Rows: [] };

        const response = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ApplicationAccessKey': config.api_key },
            body: JSON.stringify(testPayload),
        });

        res.json({
            success: response.ok,
            status: response.status,
            message: response.ok ? 'Kết nối AppSheet thành công ✅' : `Lỗi AppSheet: ${response.statusText}`,
        });
    } catch (err) {
        res.json({ success: false, message: `Lỗi: ${err.message}` });
    }
});

export default router;
