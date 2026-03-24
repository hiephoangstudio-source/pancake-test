import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/**
 * GET /api/orders — Orders list with search, pagination, and revenue summary
 * Query: ?page=1&limit=50&search=x&status=x&from=YYYY-MM-DD&to=YYYY-MM-DD&pageId=x
 */
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, search, status, from, to, pageId } = req.query;
        const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
        const lim = Math.min(200, Math.max(1, parseInt(limit)));

        let conditions = [];
        let params = [];
        let paramIdx = 1;

        if (pageId) { conditions.push(`page_id = $${paramIdx++}`); params.push(pageId); }
        if (status) { conditions.push(`status = $${paramIdx++}`); params.push(status); }
        if (search) {
            conditions.push(`(customer_name ILIKE $${paramIdx} OR customer_phone ILIKE $${paramIdx} OR order_id ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
            paramIdx++;
        }
        if (from) { conditions.push(`created_date >= $${paramIdx++}::timestamptz`); params.push(from); }
        if (to) { conditions.push(`created_date <= ($${paramIdx++}::date + 1)::timestamptz`); params.push(to); }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Count + paginated data
        const [countResult, dataResult] = await Promise.all([
            query(`SELECT COUNT(*) AS count FROM orders ${where}`, params),
            query(`SELECT * FROM orders ${where} ORDER BY created_date DESC NULLS LAST LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
                [...params, lim, offset]),
        ]);

        const total = parseInt(countResult.rows[0].count);
        const rows = dataResult.rows.map(r => ({
            ...r,
            items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
            tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []),
        }));

        res.json({
            data: rows,
            pagination: { page: parseInt(page), limit: lim, total, totalPages: Math.ceil(total / lim) },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/orders/summary — Revenue summary
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&pageId=x
 */
router.get('/summary', async (req, res) => {
    try {
        const { from, to, pageId } = req.query;
        let conditions = [];
        let params = [];
        let paramIdx = 1;

        if (pageId) { conditions.push(`page_id = $${paramIdx++}`); params.push(pageId); }
        if (from) { conditions.push(`created_date >= $${paramIdx++}::timestamptz`); params.push(from); }
        if (to) { conditions.push(`created_date <= ($${paramIdx++}::date + 1)::timestamptz`); params.push(to); }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const { rows: [summary] } = await query(`
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(SUM(discount), 0) AS total_discount,
        COALESCE(SUM(shipping_fee), 0) AS total_shipping,
        COALESCE(AVG(total_amount), 0)::int AS avg_order_value,
        COUNT(DISTINCT customer_phone) FILTER (WHERE customer_phone IS NOT NULL AND customer_phone != '') AS unique_customers,
        COUNT(*) FILTER (WHERE status = 'COMPLETED' OR status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'CANCELLED' OR status = 'cancelled') AS cancelled
      FROM orders ${where}
    `, params);

        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
