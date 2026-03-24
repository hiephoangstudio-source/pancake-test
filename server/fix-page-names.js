// Fetch real page names from Pancake API (using Node.js to decrypt tokens)
import 'dotenv/config';
import { query } from './db.js';
import { decrypt } from './utils/crypto.js';

const API_V1 = 'https://pages.fm/api/public_api/v1';

async function fixPageNames() {
    console.log('Fetching real page names from Pancake API...');
    const { rows: pages } = await query('SELECT page_id, access_token FROM pages WHERE is_active = true');

    for (const page of pages) {
        try {
            const token = decrypt(page.access_token);
            const url = `${API_V1}/pages/${page.page_id}?page_access_token=${encodeURIComponent(token)}`;
            const res = await fetch(url);
            if (!res.ok) { console.warn(`  ${page.page_id}: HTTP ${res.status}`); continue; }
            const data = await res.json();
            const name = data.page?.name || data.name || '';
            if (name) {
                await query('UPDATE pages SET name = $1 WHERE page_id = $2', [name, page.page_id]);
                console.log(`  ✅ ${page.page_id} → ${name}`);
            } else {
                console.warn(`  ⚠️ ${page.page_id}: no name in response`);
            }
        } catch (e) {
            console.error(`  ❌ ${page.page_id}: ${e.message}`);
        }
    }

    // Show results
    const { rows: updated } = await query('SELECT page_id, name FROM pages ORDER BY name');
    console.log('\nUpdated page names:');
    for (const p of updated) console.log(`  ${p.page_id} → ${p.name}`);

    process.exit(0);
}

fixPageNames().catch(e => { console.error(e); process.exit(1); });
