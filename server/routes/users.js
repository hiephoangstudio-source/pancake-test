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

export default router;
