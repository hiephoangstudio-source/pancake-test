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

/**
 * GET /api/stats/tags — Tag usage over time
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&page_id=xxx&category=lifecycle
 */
router.get('/tags', async (req, res) => {
    try {
        const { from, to, page_id, category } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'from and to required' });

        let sql = `
            SELECT tag_val AS tag_name, c.date,
                   COUNT(*) AS count,
                   tc.display_name, tc.category, tc.color, tc.sort_order
            FROM conversations c,
                 jsonb_array_elements_text(c.tags) AS tag_val
            LEFT JOIN tag_classifications tc ON LOWER(tc.tag_name) = LOWER(tag_val)
            WHERE c.date::date >= $1::date AND c.date::date <= $2::date
              AND jsonb_array_length(c.tags) > 0
        `;
        const params = [from, to];

        if (page_id) {
            sql += ` AND c.page_id = $${params.length + 1}`;
            params.push(page_id);
        }
        if (category) {
            sql += ` AND tc.category = $${params.length + 1}`;
            params.push(category);
        }

        sql += ` GROUP BY tag_val, c.date, tc.display_name, tc.category, tc.color, tc.sort_order
                 ORDER BY count DESC, c.date ASC`;

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/stats/tags/funnel — Lifecycle tag funnel
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&page_id=xxx
 */
router.get('/tags/funnel', async (req, res) => {
    try {
        const { from, to, page_id } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'from and to required' });

        let sql = `
            SELECT tc.display_name, tc.tag_name, tc.color, tc.sort_order,
                   COUNT(DISTINCT c.id) AS count
            FROM conversations c,
                 jsonb_array_elements_text(c.tags) AS tag_val
            JOIN tag_classifications tc ON LOWER(tc.tag_name) = LOWER(tag_val)
            WHERE tc.category = 'lifecycle'
              AND c.date::date >= $1::date AND c.date::date <= $2::date
        `;
        const params = [from, to];

        if (page_id) {
            sql += ` AND c.page_id = $${params.length + 1}`;
            params.push(page_id);
        }

        sql += ` GROUP BY tc.display_name, tc.tag_name, tc.color, tc.sort_order
                 ORDER BY tc.sort_order ASC`;

        const { rows } = await query(sql, params);

        // Calculate conversion rates between funnel stages
        const total = rows.reduce((sum, r) => sum + parseInt(r.count), 0);
        const funnel = rows.map(r => ({
            ...r,
            count: parseInt(r.count),
            percentage: total > 0 ? Math.round(parseInt(r.count) / total * 1000) / 10 : 0,
        }));

        res.json({ stages: funnel, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/stats/tags/summary — Tag usage summary (totals per tag)
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&page_id=xxx
 */
router.get('/tags/summary', async (req, res) => {
    try {
        const { from, to, page_id } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'from and to required' });

        let sql = `
            SELECT tag_val AS tag_name,
                   COUNT(*) AS count,
                   tc.display_name, tc.category, tc.color
            FROM conversations c,
                 jsonb_array_elements_text(c.tags) AS tag_val
            LEFT JOIN tag_classifications tc ON LOWER(tc.tag_name) = LOWER(tag_val)
            WHERE c.date::date >= $1::date AND c.date::date <= $2::date
              AND jsonb_array_length(c.tags) > 0
        `;
        const params = [from, to];

        if (page_id) {
            sql += ` AND c.page_id = $${params.length + 1}`;
            params.push(page_id);
        }

        sql += ` GROUP BY tag_val, tc.display_name, tc.category, tc.color
                 ORDER BY count DESC`;

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/stats/campaigns — Campaign-level performance metrics
 * Query: ?page_id=xxx&status=ACTIVE&sort=spend
 */
router.get('/campaigns', async (req, res) => {
    try {
        const { page_id, status, sort = 'spend' } = req.query;

        let conditions = [];
        let params = [];

        if (page_id) {
            conditions.push(`ch.page_id = $${params.length + 1}`);
            params.push(page_id);
        }
        if (status) {
            conditions.push(`ch.status = $${params.length + 1}`);
            params.push(status);
        }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const validSorts = ['spend', 'impressions', 'clicks', 'conversations', 'phones', 'cpl'];
        const orderBy = validSorts.includes(sort) ? sort : 'spend';

        // Join ad data (channels) with conversation data (daily_reports) per page
        const sql = `
            WITH ad_stats AS (
                SELECT ch.page_id,
                       COALESCE(pg.name, ch.page_id) AS page_name,
                       COUNT(*) AS ad_count,
                       SUM(ch.spend) AS total_spend,
                       SUM(ch.impressions) AS total_impressions,
                       SUM(ch.clicks) AS total_clicks
                FROM channels ch
                LEFT JOIN pages pg ON pg.page_id = ch.page_id
                ${where}
                GROUP BY ch.page_id, pg.name
            ),
            conv_stats AS (
                SELECT page_id,
                       COALESCE(SUM(conversations), 0) AS total_conversations,
                       COALESCE(SUM(has_phone), 0) AS total_phones
                FROM daily_reports
                GROUP BY page_id
            )
            SELECT a.page_id, a.page_name, a.ad_count,
                   a.total_spend, a.total_impressions, a.total_clicks,
                   COALESCE(c.total_conversations, 0) AS total_conversations,
                   COALESCE(c.total_phones, 0) AS total_phones,
                   CASE WHEN a.total_impressions > 0
                        THEN ROUND(a.total_clicks::numeric / a.total_impressions * 100, 2)
                        ELSE 0 END AS ctr,
                   CASE WHEN a.total_clicks > 0
                        THEN ROUND(a.total_spend / a.total_clicks, 0)
                        ELSE 0 END AS cpc,
                   CASE WHEN COALESCE(c.total_phones, 0) > 0
                        THEN ROUND(a.total_spend / c.total_phones, 0)
                        ELSE 0 END AS cpl,
                   CASE WHEN COALESCE(c.total_conversations, 0) > 0
                        THEN ROUND(COALESCE(c.total_phones, 0)::numeric / c.total_conversations * 100, 1)
                        ELSE 0 END AS conversion_rate
            FROM ad_stats a
            LEFT JOIN conv_stats c ON c.page_id = a.page_id
            ORDER BY ${orderBy === 'cpl' ? 'cpl' : orderBy === 'conversations' ? 'total_conversations' : orderBy === 'phones' ? 'total_phones' : `a.total_${orderBy}`} DESC
        `;

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
