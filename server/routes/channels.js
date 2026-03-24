import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/**
 * GET /api/channels — Channels with cost efficiency metrics
 * Query: ?pageId=x&search=x&page=1&limit=50&status=ACTIVE
 */
router.get('/', async (req, res) => {
    try {
        const { pageId, search, page = 1, limit = 50, status } = req.query;
        const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
        const lim = Math.min(200, Math.max(1, parseInt(limit)));

        let conditions = [];
        let params = [];
        let paramIdx = 1;

        if (pageId) { conditions.push(`page_id = $${paramIdx++}`); params.push(pageId); }
        if (search) { conditions.push(`name ILIKE $${paramIdx++}`); params.push(`%${search}%`); }
        if (status) { conditions.push(`status = $${paramIdx++}`); params.push(status); }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const { rows: [{ count: total }] } = await query(
            `SELECT COUNT(*) AS count FROM channels ${where}`, params
        );

        const sql = `
      SELECT *,
        CASE WHEN impressions > 0 THEN ROUND(clicks::numeric / impressions * 100, 2) ELSE 0 END AS ctr,
        CASE WHEN clicks > 0 THEN ROUND(spend / clicks, 0) ELSE 0 END AS cpc,
        CASE WHEN conversations > 0 THEN ROUND(spend / conversations, 0) ELSE 0 END AS cost_per_conversation,
        CASE WHEN phones > 0 THEN ROUND(spend / phones, 0) ELSE 0 END AS cpl,
        CASE WHEN conversations > 0 THEN ROUND(phones::numeric / conversations * 100, 1) ELSE 0 END AS conversion_rate
      FROM channels
      ${where}
      ORDER BY spend DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
        params.push(lim, offset);

        const { rows } = await query(sql, params);
        res.json({
            data: rows,
            pagination: { page: parseInt(page), limit: lim, total: parseInt(total), totalPages: Math.ceil(parseInt(total) / lim) },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/channels/summary — Total cost efficiency metrics
 * Query: ?pageId=x
 */
router.get('/summary', async (req, res) => {
    try {
        const { pageId } = req.query;
        const where = pageId ? 'WHERE page_id = $1' : '';
        const params = pageId ? [pageId] : [];

        const { rows: [summary] } = await query(`
      SELECT
        COUNT(*) AS total_ads,
        COALESCE(SUM(spend), 0) AS total_spend,
        COALESCE(SUM(impressions), 0) AS total_impressions,
        COALESCE(SUM(clicks), 0) AS total_clicks,
        COALESCE(SUM(conversations), 0) AS total_conversations,
        COALESCE(SUM(phones), 0) AS total_phones,
        CASE WHEN SUM(impressions) > 0 THEN ROUND(SUM(clicks)::numeric / SUM(impressions) * 100, 2) ELSE 0 END AS avg_ctr,
        CASE WHEN SUM(clicks) > 0 THEN ROUND(SUM(spend) / SUM(clicks), 0) ELSE 0 END AS avg_cpc,
        CASE WHEN SUM(phones) > 0 THEN ROUND(SUM(spend) / SUM(phones), 0) ELSE 0 END AS avg_cpl,
        CASE WHEN SUM(conversations) > 0 THEN ROUND(SUM(phones)::numeric / SUM(conversations) * 100, 1) ELSE 0 END AS avg_conversion_rate,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_ads,
        COUNT(*) FILTER (WHERE status != 'ACTIVE') AS inactive_ads
      FROM channels ${where}
    `, params);

        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/channels/marketing — Marketing analytics with tag-based conversion funnel
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&pageId=x
 */
router.get('/marketing', async (req, res) => {
    try {
        const now = new Date();
        const from = req.query.from || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString().split('T')[0];
        const to = req.query.to || now.toISOString().split('T')[0];
        const pageId = req.query.pageId;

        // 1. Spend & impressions from channels table (aggregated per page)
        const spendWhere = pageId ? 'WHERE page_id = $1' : '';
        const spendParams = pageId ? [pageId] : [];
        const { rows: [spendRow] } = await query(`
            SELECT
                COALESCE(SUM(spend::numeric), 0) AS total_spend,
                COALESCE(SUM(impressions), 0) AS total_impressions,
                COUNT(*) AS total_ads,
                COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_ads
            FROM channels ${spendWhere}
        `, spendParams);

        // 2. Conversion metrics from daily_reports (date-filtered)
        let drWhere = 'WHERE date >= $1 AND date <= $2';
        let drParams = [from, to];
        if (pageId) { drWhere += ' AND page_id = $3'; drParams.push(pageId); }

        const { rows: [convRow] } = await query(`
            SELECT
                COALESCE(SUM(conversations), 0) AS total_conversations,
                COALESCE(SUM(total_messages), 0) AS total_messages,
                COALESCE(SUM(has_phone), 0) AS total_phones,
                COALESCE(SUM(signed), 0) AS total_signed,
                COALESCE(SUM(wrong_target), 0) AS total_wrong,
                COALESCE(SUM(unique_customers), 0) AS total_customers,
                COALESCE(SUM(inbox_count), 0) AS total_inbox,
                COALESCE(SUM(comment_count), 0) AS total_comment
            FROM daily_reports ${drWhere}
        `, drParams);

        // 3. Tags breakdown aggregation
        const { rows: tagRows } = await query(`
            SELECT tags_breakdown FROM daily_reports
            ${drWhere} AND tags_breakdown IS NOT NULL AND tags_breakdown != '{}'
        `, drParams);

        const tagTotals = {};
        for (const r of tagRows) {
            try {
                const tags = JSON.parse(r.tags_breakdown);
                for (const [k, v] of Object.entries(tags)) {
                    tagTotals[k] = (tagTotals[k] || 0) + (Number(v) || 0);
                }
            } catch { }
        }

        // Load tag classifications from DB
        const { rows: tagCats } = await query('SELECT tag_name, category FROM tag_categories');
        const catMap = Object.fromEntries(tagCats.map(t => [t.tag_name, t.category]));

        // Auto-classify unknown tags and insert them
        const autoPatterns = [
            { pattern: /KÍ|KÝ|CỌC|CHỐT/i, category: 'customer_status' },
            { pattern: /HẸN/i, category: 'customer_status' },
            { pattern: /THAM KHẢO/i, category: 'customer_status' },
            { pattern: /MẤT/i, category: 'customer_status' },
            { pattern: /SAI/i, category: 'customer_status' },
            { pattern: /CHỤP/i, category: 'service' },
        ];
        const newTags = [];
        for (const name of Object.keys(tagTotals)) {
            if (!catMap[name]) {
                let cat = 'other';
                for (const ap of autoPatterns) {
                    if (ap.pattern.test(name)) { cat = ap.category; break; }
                }
                catMap[name] = cat;
                newTags.push({ name, cat });
            }
        }
        // Batch insert new tags
        if (newTags.length > 0) {
            const vals = newTags.map((t, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
            const params = newTags.flatMap(t => [t.name, t.cat]);
            try {
                await query(`INSERT INTO tag_categories (tag_name, category) VALUES ${vals} ON CONFLICT (tag_name) DO NOTHING`, params);
            } catch { }
        }

        // Map categories to funnel groups
        const catToFunnel = (cat, tagName) => {
            if (cat === 'customer_status') {
                const n = tagName.toUpperCase();
                if (/KÍ|KÝ|CỌC|CHỐT/.test(n)) return 'signed';
                if (/HẸN/.test(n)) return 'appointment';
                if (/THAM KHẢO/.test(n)) return 'considering';
                if (/MẤT/.test(n)) return 'lost';
                if (/SAI/.test(n)) return 'wrong_target';
                return 'other';
            }
            if (cat === 'service') return 'service';
            if (cat === 'branch') return 'branch';
            if (cat === 'staff') return 'staff';
            return 'other';
        };

        const funnel = { signed: 0, appointment: 0, considering: 0, lost: 0, wrong_target: 0, service: 0, branch: 0, staff: 0, other: 0 };
        const tagDetails = [];
        for (const [name, count] of Object.entries(tagTotals)) {
            const cat = catMap[name] || 'other';
            const group = catToFunnel(cat, name);
            funnel[group] = (funnel[group] || 0) + count;
            tagDetails.push({ name, count, group, category: cat });
        }
        tagDetails.sort((a, b) => b.count - a.count);

        // 4. Per-page breakdown
        const { rows: pageRows } = await query(`
            SELECT
                dr.page_id,
                COALESCE(p.name, dr.page_id) AS page_name,
                SUM(dr.conversations) AS conversations,
                SUM(dr.total_messages) AS messages,
                SUM(dr.has_phone) AS phones,
                SUM(dr.signed) AS signed,
                SUM(dr.wrong_target) AS wrong_target
            FROM daily_reports dr
            LEFT JOIN pages p ON p.page_id = dr.page_id
            ${drWhere}
            GROUP BY dr.page_id, p.name
            ORDER BY SUM(dr.conversations) DESC
        `, drParams);

        // Get spend per page from channels
        const { rows: spendByPage } = await query(`
            SELECT page_id, COALESCE(SUM(spend::numeric), 0) AS spend, COALESCE(SUM(impressions), 0) AS impressions
            FROM channels GROUP BY page_id
        `);
        const spendMap = Object.fromEntries(spendByPage.map(r => [r.page_id, { spend: Number(r.spend), impressions: Number(r.impressions) }]));

        const perPage = pageRows.map(r => ({
            pageId: r.page_id,
            pageName: r.page_name,
            conversations: Number(r.conversations),
            messages: Number(r.messages),
            phones: Number(r.phones),
            signed: Number(r.signed),
            wrongTarget: Number(r.wrong_target),
            spend: spendMap[r.page_id]?.spend || 0,
            impressions: spendMap[r.page_id]?.impressions || 0,
            cpl: (spendMap[r.page_id]?.spend || 0) > 0 && Number(r.phones) > 0 ? Math.round((spendMap[r.page_id]?.spend || 0) / Number(r.phones)) : 0,
            cpa: (spendMap[r.page_id]?.spend || 0) > 0 && Number(r.signed) > 0 ? Math.round((spendMap[r.page_id]?.spend || 0) / Number(r.signed)) : 0,
        }));

        // 5. Trend data (last 30 days by date)
        const { rows: trendRows } = await query(`
            SELECT date,
                SUM(conversations) AS conversations,
                SUM(has_phone) AS phones,
                SUM(signed) AS signed,
                SUM(wrong_target) AS wrong_target
            FROM daily_reports ${drWhere}
            GROUP BY date ORDER BY date
        `, drParams);

        const spend = Number(spendRow.total_spend);
        const phones = Number(convRow.total_phones);
        // Use tag-based signed count (funnel.signed) — daily_reports.signed is not populated
        const tagSigned = funnel.signed || 0;
        const conversations = Number(convRow.total_conversations);

        res.json({
            kpis: {
                totalSpend: spend,
                totalImpressions: Number(spendRow.total_impressions),
                totalAds: Number(spendRow.total_ads),
                activeAds: Number(spendRow.active_ads),
                totalConversations: conversations,
                totalMessages: Number(convRow.total_messages),
                totalPhones: phones,
                totalSigned: tagSigned,
                totalWrong: funnel.wrong_target || 0,
                totalCustomers: Number(convRow.total_customers),
                cpl: phones > 0 ? Math.round(spend / phones) : 0,
                cpa: tagSigned > 0 ? Math.round(spend / tagSigned) : 0,
                conversionRate: conversations > 0 ? ((phones / conversations) * 100).toFixed(1) : '0.0',
                wrongRate: conversations > 0 ? (((funnel.wrong_target || 0) / conversations) * 100).toFixed(1) : '0.0',
            },
            funnel,
            tagDetails: tagDetails.slice(0, 20),
            perPage,
            trend: trendRows.map(r => ({
                date: r.date,
                conversations: Number(r.conversations),
                phones: Number(r.phones),
                signed: Number(r.signed),
                wrongTarget: Number(r.wrong_target),
            })),
        });
    } catch (err) {
        console.error('Marketing API error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
