import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/**
 * GET /api/stats/pages — Hourly page statistics
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&page_id=xxx
 */
router.get('/pages', async (req, res) => {
    try {
        const { from, to, page_id } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'from and to required' });

        let sql = `SELECT * FROM page_statistics WHERE hour >= $1::timestamptz AND hour <= ($2::date + 1)::timestamptz`;
        const params = [from, to];

        if (page_id) {
            sql += ` AND page_id = $${params.length + 1}`;
            params.push(page_id);
        }
        sql += ' ORDER BY hour ASC';

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/stats/pages/summary — Daily aggregated page statistics
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get('/pages/summary', async (req, res) => {
    try {
        const { from, to, page_id } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'from and to required' });

        let sql = `
            SELECT 
                date_trunc('day', hour)::date AS date,
                SUM(new_customer_count) AS new_customers,
                SUM(customer_inbox_count) AS inbox,
                SUM(customer_comment_count) AS comments,
                SUM(phone_number_count) AS phones,
                SUM(new_inbox_count) AS new_inbox,
                SUM(inbox_interactive_count) AS interactive,
                SUM(uniq_phone_number_count) AS unique_phones
            FROM page_statistics 
            WHERE hour >= $1::timestamptz AND hour <= ($2::date + 1)::timestamptz
        `;
        const params = [from, to];
        if (page_id) {
            sql += ` AND page_id = $${params.length + 1}`;
            params.push(page_id);
        }
        sql += ' GROUP BY date ORDER BY date ASC';

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/stats/users — User performance with response time
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&page_id=xxx
 */
router.get('/users', async (req, res) => {
    try {
        const { from, to, page_id } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'from and to required' });

        let sql = `
            SELECT 
                us.user_pancake_id,
                u.name AS user_name,
                SUM(us.inbox_count) AS inbox,
                SUM(us.comment_count) AS comments,
                SUM(us.phone_number_count) AS phones,
                SUM(us.unique_inbox_count) AS unique_inbox,
                AVG(NULLIF(us.average_response_time, 0))::int AS avg_response_time_sec,
                MIN(NULLIF(us.average_response_time, 0)) AS fastest_response_sec,
                MAX(us.average_response_time) AS slowest_response_sec,
                SUM(us.private_reply_count) AS private_replies,
                COUNT(DISTINCT date_trunc('day', us.hour)) AS active_days
            FROM user_statistics us
            LEFT JOIN users u ON u.pancake_id = us.user_pancake_id
            WHERE us.hour >= $1::timestamptz AND us.hour <= ($2::date + 1)::timestamptz
        `;
        const params = [from, to];
        if (page_id) {
            sql += ` AND us.page_id = $${params.length + 1}`;
            params.push(page_id);
        }
        sql += ' GROUP BY us.user_pancake_id, u.name ORDER BY inbox DESC';

        const { rows } = await query(sql, params);

        // Format response times to human-readable
        const formatted = rows.map(r => ({
            ...r,
            avg_response_time: r.avg_response_time_sec
                ? `${Math.floor(r.avg_response_time_sec / 60)}m ${r.avg_response_time_sec % 60}s`
                : null,
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/stats/users/hourly — User hourly heatmap data
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&user_id=xxx
 */
router.get('/users/hourly', async (req, res) => {
    try {
        const { from, to, user_id, page_id } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'from and to required' });

        let sql = `
            SELECT 
                EXTRACT(DOW FROM hour)::int AS day_of_week,
                EXTRACT(HOUR FROM hour)::int AS hour_of_day,
                SUM(inbox_count) AS inbox,
                SUM(comment_count) AS comments,
                AVG(NULLIF(average_response_time, 0))::int AS avg_response_sec
            FROM user_statistics 
            WHERE hour >= $1::timestamptz AND hour <= ($2::date + 1)::timestamptz
        `;
        const params = [from, to];
        if (user_id) {
            sql += ` AND user_pancake_id = $${params.length + 1}`;
            params.push(user_id);
        }
        if (page_id) {
            sql += ` AND page_id = $${params.length + 1}`;
            params.push(page_id);
        }
        sql += ' GROUP BY day_of_week, hour_of_day ORDER BY day_of_week, hour_of_day';

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
