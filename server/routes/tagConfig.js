import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/** GET /api/tag-config — Lấy danh sách phân loại tags */
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        let sql = 'SELECT * FROM tag_classifications';
        const params = [];
        if (category) {
            sql += ' WHERE category = $1';
            params.push(category);
        }
        sql += ' ORDER BY sort_order, tag_name';
        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/tag-config/branches — Chi nhánh + thống kê */
router.get('/branches', async (req, res) => {
    try {
        const { rows } = await query(`
            SELECT * FROM tag_classifications
            WHERE category = 'branch' AND is_active = TRUE
            ORDER BY sort_order
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** POST /api/tag-config — Thêm/cập nhật phân loại tag */
router.post('/', async (req, res) => {
    try {
        const { tag_name, category, display_name, color, sort_order, parent_tag } = req.body;
        if (!tag_name || !category) {
            return res.status(400).json({ error: 'tag_name và category là bắt buộc' });
        }
        await query(`
            INSERT INTO tag_classifications (tag_name, category, display_name, color, sort_order, parent_tag)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (tag_name)
            DO UPDATE SET category = $2, display_name = $3, color = $4, sort_order = $5, parent_tag = $6
        `, [tag_name, category, display_name || tag_name, color || '#6B7280', sort_order || 0, parent_tag || null]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** DELETE /api/tag-config/:id */
router.delete('/:id', async (req, res) => {
    try {
        await query('DELETE FROM tag_classifications WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
