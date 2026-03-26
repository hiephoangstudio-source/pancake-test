/**
 * Pancake CRM Service — Live API interactions for customer care.
 * Separate from pancakeSync.js to keep sync logic clean.
 *
 * Endpoints used:
 *   GET  /pages/{id}/conversations/{cid}/messages  — Read messages
 *   POST /pages/{id}/conversations/{cid}/tags      — Add/remove tags
 *   GET  /pages/{id}/page_customers                — List customers
 */

const PAGES_API_V1 = 'https://pages.fm/api/public_api/v1';

async function fetchJsonSafe(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
}

/**
 * Get messages from a conversation.
 */
export async function getMessages(pageId, convId, token, { pageSize = 20, beforeId } = {}) {
    let url = `${PAGES_API_V1}/pages/${pageId}/conversations/${convId}/messages?page_access_token=${token}&page_size=${pageSize}`;
    if (beforeId) url += `&before_id=${beforeId}`;
    return fetchJsonSafe(url);
}

/**
 * Add a tag to a conversation.
 */
export async function addTag(pageId, convId, token, tagName) {
    const url = `${PAGES_API_V1}/pages/${pageId}/conversations/${convId}/tags?page_access_token=${token}`;
    return fetchJsonSafe(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagName, action: 'add' }),
    });
}

/**
 * Remove a tag from a conversation.
 */
export async function removeTag(pageId, convId, token, tagName) {
    const url = `${PAGES_API_V1}/pages/${pageId}/conversations/${convId}/tags?page_access_token=${token}`;
    return fetchJsonSafe(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagName, action: 'remove' }),
    });
}

/**
 * Get page customers from Pancake.
 */
export async function getPageCustomers(pageId, token, { since, until, pageNumber = 1, pageSize = 20 } = {}) {
    let url = `${PAGES_API_V1}/pages/${pageId}/page_customers?page_access_token=${token}&page_number=${pageNumber}&page_size=${pageSize}`;
    if (since) url += `&since=${since}`;
    if (until) url += `&until=${until}`;
    return fetchJsonSafe(url);
}

/**
 * Assign a conversation to a user.
 */
export async function assignConversation(pageId, convId, token, userId) {
    const url = `${PAGES_API_V1}/pages/${pageId}/conversations/${convId}/assign?page_access_token=${token}`;
    return fetchJsonSafe(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
    });
}

/**
 * Mark a conversation as read.
 */
export async function markAsRead(pageId, convId, token) {
    const url = `${PAGES_API_V1}/pages/${pageId}/conversations/${convId}/read?page_access_token=${token}`;
    return fetchJsonSafe(url, { method: 'POST' });
}
