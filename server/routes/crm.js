import { Router } from 'express';
import { query } from '../db.js';
import { decrypt } from '../utils/crypto.js';
import { getMessages, addTag, removeTag, getPageCustomers, assignConversation, markAsRead } from '../services/pancakeCRM.js';

const router = Router();

/**
 * Helper: get decrypted page access token from DB
 */
async function getPageToken(pageId) {
    const { rows } = await query('SELECT access_token FROM pages WHERE page_id = $1 AND is_active = true', [pageId]);
    if (!rows[0]?.access_token) throw new Error(`No token found for page ${pageId}`);
    return decrypt(rows[0].access_token);
}

/**
 * GET /api/crm/conversations/:convId/messages
 * Query: ?page_id=xxx&page_size=20&before_id=xxx
 */
router.get('/conversations/:convId/messages', async (req, res) => {
    try {
        const { convId } = req.params;
        const { page_id, page_size = 20, before_id } = req.query;
        if (!page_id) return res.status(400).json({ error: 'page_id required' });

        const token = await getPageToken(page_id);
        const data = await getMessages(page_id, convId, token, {
            pageSize: parseInt(page_size),
            beforeId: before_id,
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/crm/conversations/:convId/tags
 * Body: { page_id, tag, action: 'add' | 'remove' }
 */
router.post('/conversations/:convId/tags', async (req, res) => {
    try {
        const { convId } = req.params;
        const { page_id, tag, action = 'add' } = req.body;
        if (!page_id || !tag) return res.status(400).json({ error: 'page_id and tag required' });

        const token = await getPageToken(page_id);
        const result = action === 'remove'
            ? await removeTag(page_id, convId, token, tag)
            : await addTag(page_id, convId, token, tag);

        // Also update the local conversation record
        if (action === 'add') {
            await query(`
                UPDATE conversations SET tags = tags || $1::jsonb, updated_at = NOW()
                WHERE pancake_id = $2
            `, [JSON.stringify([tag]), convId]);
        } else {
            await query(`
                UPDATE conversations SET tags = tags - $1, updated_at = NOW()
                WHERE pancake_id = $2
            `, [tag, convId]);
        }

        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/crm/customers
 * Query: ?page_id=xxx&since=YYYY-MM-DD&until=YYYY-MM-DD&page_number=1&page_size=20
 */
router.get('/customers', async (req, res) => {
    try {
        const { page_id, since, until, page_number = 1, page_size = 20 } = req.query;
        if (!page_id) return res.status(400).json({ error: 'page_id required' });

        const token = await getPageToken(page_id);
        const data = await getPageCustomers(page_id, token, {
            since, until,
            pageNumber: parseInt(page_number),
            pageSize: parseInt(page_size),
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/crm/conversations/:convId/assign
 * Body: { page_id, user_id }
 */
router.post('/conversations/:convId/assign', async (req, res) => {
    try {
        const { convId } = req.params;
        const { page_id, user_id } = req.body;
        if (!page_id || !user_id) return res.status(400).json({ error: 'page_id and user_id required' });

        const token = await getPageToken(page_id);
        const result = await assignConversation(page_id, convId, token, user_id);

        // Update local record
        await query('UPDATE conversations SET user_pancake_id = $1, updated_at = NOW() WHERE pancake_id = $2', [user_id, convId]);

        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/crm/conversations/:convId/read
 * Body: { page_id }
 */
router.post('/conversations/:convId/read', async (req, res) => {
    try {
        const { convId } = req.params;
        const { page_id } = req.body;
        if (!page_id) return res.status(400).json({ error: 'page_id required' });

        const token = await getPageToken(page_id);
        const result = await markAsRead(page_id, convId, token);
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
