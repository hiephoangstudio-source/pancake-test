import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/** GET /api/users */
router.get('/', async (req, res) => {
    try {
        const { rows } = await query('SELECT pancake_id, name, email, role, avatar FROM users ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** POST /api/users/:id — Update user name */
router.post('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'name required' });
        await query('UPDATE users SET name = $1 WHERE pancake_id = $2', [name, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
