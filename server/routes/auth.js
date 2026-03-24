import { Router } from 'express';
import { query } from '../db.js';
import { generateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, user }
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'username and password required' });
        }

        // Find user by name (case-insensitive)
        const { rows } = await query(
            'SELECT * FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [username]
        );

        let user;

        if (rows.length === 0) {
            // Built-in admin fallback (no DB row needed)
            if (username.toLowerCase() === 'admin' && password === '123') {
                user = { pancake_id: 'admin', name: 'Administrator', role: 'admin', avatar: null };
            } else {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        } else {
            user = rows[0];

            // Simple password check: hash password and compare
            // Default password for all users: "123"
            const hash = crypto.createHash('sha256').update(password).digest('hex');
            const defaultHash = crypto.createHash('sha256').update('123').digest('hex');

            // Accept if password matches default OR is "admin" with "admin123"
            const isAdmin = user.role === 'admin';
            const validPassword = hash === defaultHash || (isAdmin && password === 'admin123');

            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }

        const token = generateToken({
            id: user.pancake_id,
            name: user.name,
            role: user.role,
        });

        res.json({
            token,
            user: {
                id: user.pancake_id,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
