import { Router } from 'express';
import { query } from '../db.js';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto.js';

const router = Router();

/** GET /api/pages — List all pages */
router.get('/', async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM pages ORDER BY name');
        // Mask access_token in response for security
        const safe = rows.map(p => ({
            ...p,
            access_token: p.access_token ? '********' : '',
            _hasToken: !!p.access_token,
        }));
        res.json(safe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/pages/internal — Full pages with tokens (server-only, decrypted) */
router.get('/internal', async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM pages WHERE is_active = true AND access_token IS NOT NULL');
        // Decrypt tokens for server-side use
        const decrypted = rows.map(p => ({
            ...p,
            access_token: decrypt(p.access_token),
        }));
        res.json(decrypted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** POST /api/pages — Upsert a page (encrypts access_token) */
router.post('/', async (req, res) => {
    try {
        const { page_id, name, access_token, is_active = true } = req.body;
        if (!page_id || !name) return res.status(400).json({ error: 'page_id and name required' });

        // Encrypt the access token before storing
        const tokenToStore = (access_token && access_token !== '********') ? encrypt(access_token) : access_token;

        await query(`
      INSERT INTO pages (page_id, name, access_token, is_active, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (page_id)
      DO UPDATE SET name = $2,
        access_token = CASE WHEN $3 = '********' THEN pages.access_token ELSE $3 END,
        is_active = $4,
        updated_at = NOW()
    `, [page_id, name, tokenToStore || '', is_active]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** DELETE /api/pages/:id — Delete a page by DB id */
router.delete('/:id', async (req, res) => {
    try {
        await query('DELETE FROM pages WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/pages/migrate-encryption — One-time: encrypt existing plaintext tokens
 */
router.post('/migrate-encryption', async (req, res) => {
    try {
        const { rows } = await query('SELECT id, access_token FROM pages WHERE access_token IS NOT NULL');
        let migrated = 0;
        for (const row of rows) {
            if (row.access_token && !isEncrypted(row.access_token)) {
                const encrypted = encrypt(row.access_token);
                await query('UPDATE pages SET access_token = $1 WHERE id = $2', [encrypted, row.id]);
                migrated++;
            }
        }
        res.json({ success: true, migrated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
