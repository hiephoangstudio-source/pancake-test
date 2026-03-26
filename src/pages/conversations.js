import { apiGet, apiPost } from '../utils/api.js';
import { fmtNumber, fmtDate } from '../utils/format.js';

let activeConvId = null;
let activePageId = null;

export function destroy() {
    activeConvId = null;
    activePageId = null;
}

export async function render(container, { tagMap }) {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = 'Hội thoại';

    const filtersEl = document.getElementById('header-filters');
    if (filtersEl) {
        filtersEl.innerHTML = `
            <div class="filter-group"><i data-lucide="file-text"></i>
                <select class="filter-select" id="conv-page-filter"><option value="">Tất cả trang</option></select>
            </div>
            <div class="filter-group"><i data-lucide="tag"></i>
                <select class="filter-select" id="conv-tag-filter"><option value="">Tất cả tags</option></select>
            </div>`;
    }

    container.innerHTML = `
        <div class="crm-layout">
            <div class="crm-sidebar">
                <div class="crm-sidebar-search">
                    <input type="text" id="crm-search" placeholder="Tìm tên, SĐT..." />
                </div>
                <div class="crm-sidebar-list" id="crm-contact-list">
                    <div style="text-align:center;padding:40px;color:var(--text-muted)">
                        <div class="spinner"></div>
                        <div style="margin-top:8px;font-size:12px">Đang tải...</div>
                    </div>
                </div>
            </div>
            <div class="crm-chat">
                <div class="crm-chat-header" id="crm-chat-header">
                    <span style="color:var(--text-muted);font-size:13px">← Chọn hội thoại</span>
                </div>
                <div class="crm-chat-messages" id="crm-chat-messages">
                    <div style="text-align:center;padding:60px;color:var(--text-muted);font-size:13px">
                        <i data-lucide="message-circle" style="width:48px;height:48px;opacity:0.3"></i>
                        <div style="margin-top:12px">Chọn một hội thoại ở bên trái để xem tin nhắn</div>
                    </div>
                </div>
            </div>
            <div class="crm-profile" id="crm-profile">
                <div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px">
                    <i data-lucide="user" style="width:36px;height:36px;opacity:0.3"></i>
                    <div style="margin-top:8px">Profile KH</div>
                </div>
            </div>
        </div>`;

    if (window.lucide) window.lucide.createIcons();

    // Load pages dropdown
    try {
        const pages = await apiGet('/pages');
        const sel = document.getElementById('conv-page-filter');
        pages.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.page_id;
            opt.textContent = p.name;
            sel?.appendChild(opt);
        });
    } catch {}

    // Load tags dropdown
    try {
        const tags = await apiGet('/tag-config');
        const sel = document.getElementById('conv-tag-filter');
        if (Array.isArray(tags)) {
            tags.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.tag_name;
                opt.textContent = t.display_name || t.tag_name;
                sel?.appendChild(opt);
            });
        }
    } catch {}

    // Bind search + filters
    let searchTimeout;
    document.getElementById('crm-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadConversations(), 300);
    });
    document.getElementById('conv-page-filter')?.addEventListener('change', () => loadConversations());
    document.getElementById('conv-tag-filter')?.addEventListener('change', () => loadConversations());

    await loadConversations();
}

async function loadConversations() {
    const listEl = document.getElementById('crm-contact-list');
    if (!listEl) return;

    const search = document.getElementById('crm-search')?.value || '';
    const pageId = document.getElementById('conv-page-filter')?.value || '';
    const tagFilter = document.getElementById('conv-tag-filter')?.value || '';

    listEl.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';

    try {
        let url = '/dashboard/conversations?limit=50';
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (pageId) url += `&page_id=${pageId}`;
        if (tagFilter) url += `&tag=${encodeURIComponent(tagFilter)}`;

        const convs = await apiGet(url);
        const data = Array.isArray(convs) ? convs : (convs.data || []);

        if (data.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:12px">Không tìm thấy hội thoại</div>';
            return;
        }

        listEl.innerHTML = data.map(c => {
            const initial = (c.customer_name || 'K')[0].toUpperCase();
            const tags = (c.tags || []).slice(0, 3);
            const timeAgo = formatTimeAgo(c.updated_at || c.date);
            return `
                <div class="crm-contact" data-conv-id="${c.pancake_id}" data-page-id="${c.page_id}" data-customer="${escapeAttr(JSON.stringify({
                    name: c.customer_name,
                    phone: c.phone,
                    id: c.pancake_id,
                    page_id: c.page_id,
                    user_name: c.user_name,
                    tags: c.tags || [],
                    snippet: c.snippet,
                    total_messages: c.total_messages,
                    date: c.date,
                }))}">
                    <div class="crm-contact-avatar">${initial}</div>
                    <div class="crm-contact-info">
                        <div class="crm-contact-name">${c.customer_name || 'Khách hàng'}</div>
                        <div class="crm-contact-snippet">${stripHtml(c.snippet || '')}</div>
                        <div class="crm-contact-meta">
                            ${tags.map(t => `<span class="tag" style="font-size:9px">${t}</span>`).join('')}
                        </div>
                    </div>
                    <div class="crm-contact-time">${timeAgo}</div>
                </div>`;
        }).join('');

        // Bind click events
        listEl.querySelectorAll('.crm-contact').forEach(el => {
            el.addEventListener('click', () => {
                listEl.querySelectorAll('.crm-contact').forEach(e => e.classList.remove('active'));
                el.classList.add('active');
                const customer = JSON.parse(el.dataset.customer);
                activeConvId = el.dataset.convId;
                activePageId = el.dataset.pageId;
                loadMessages(activeConvId, activePageId, customer);
                renderProfile(customer);
            });
        });

    } catch (err) {
        listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red);font-size:12px">${err.message}</div>`;
    }
}

async function loadMessages(convId, pageId, customer) {
    const msgEl = document.getElementById('crm-chat-messages');
    const headerEl = document.getElementById('crm-chat-header');
    if (!msgEl || !headerEl) return;

    // Update chat header
    headerEl.innerHTML = `
        <div>
            <span style="font-weight:600;font-size:14px">${customer.name || 'Khách hàng'}</span>
            ${customer.phone ? `<span style="font-size:12px;color:var(--text-muted);margin-left:8px">${customer.phone}</span>` : ''}
        </div>
        <div style="display:flex;gap:4px;align-items:center">
            <span class="tag tag-staff" style="font-size:10px">${customer.user_name || 'Chưa gán'}</span>
            <span style="font-size:11px;color:var(--text-muted)">${fmtNumber(customer.total_messages || 0)} tin nhắn</span>
        </div>`;

    msgEl.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div><div style="margin-top:8px;font-size:12px;color:var(--text-muted)">Đang tải tin nhắn...</div></div>';

    try {
        const data = await apiGet(`/crm/conversations/${convId}/messages?page_id=${pageId}&page_size=30`);
        const messages = data.messages || data.data || [];

        if (!messages || messages.length === 0) {
            msgEl.innerHTML = `
                <div style="text-align:center;padding:60px;color:var(--text-muted)">
                    <div style="font-size:13px">Chưa có tin nhắn</div>
                    <div style="font-size:11px;margin-top:4px">Cần re-save page token trong Cấu hình</div>
                </div>`;
            return;
        }

        // Reverse for chronological order (API returns newest first)
        const sorted = [...messages].reverse();

        msgEl.innerHTML = `
            <div class="msg-list">
                ${sorted.map(m => {
                    const isPage = m.from?.type === 'page' || m.sender_type === 'page';
                    const senderName = m.from?.name || (isPage ? 'Trang' : customer.name || 'Khách');
                    const content = m.original_message || m.message || m.content || '';
                    return `
                        <div class="msg-bubble ${isPage ? 'msg-page' : 'msg-customer'}">
                            <div class="msg-sender">${senderName}</div>
                            <div class="msg-content">${stripHtml(content).replace(/\n/g, '<br>')}</div>
                            ${renderAttachments(m.attachments)}
                            <div class="msg-time">${formatMsgTime(m.created_time || m.created_at)}</div>
                        </div>`;
                }).join('')}
            </div>`;
        msgEl.scrollTop = msgEl.scrollHeight;
    } catch (err) {
        msgEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red);font-size:13px">${err.message}</div>`;
    }
}

function renderProfile(customer) {
    const el = document.getElementById('crm-profile');
    if (!el) return;

    const tags = customer.tags || [];

    el.innerHTML = `
        <div class="crm-profile-section">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div class="crm-contact-avatar" style="width:48px;height:48px;font-size:18px">
                    ${(customer.name || 'K')[0].toUpperCase()}
                </div>
                <div>
                    <div style="font-weight:700;font-size:15px">${customer.name || 'Khách hàng'}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${customer.phone || 'Chưa có SĐT'}</div>
                </div>
            </div>
        </div>

        <div class="crm-profile-section">
            <div class="crm-profile-label">Thông tin</div>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
                <div><span style="color:var(--text-muted)">Tin nhắn:</span> <strong>${fmtNumber(customer.total_messages || 0)}</strong></div>
                <div><span style="color:var(--text-muted)">NV phụ trách:</span> <strong>${customer.user_name || 'Chưa gán'}</strong></div>
                <div><span style="color:var(--text-muted)">Ngày:</span> ${customer.date || '—'}</div>
            </div>
        </div>

        <div class="crm-profile-section">
            <div class="crm-profile-label">Tags</div>
            <div class="crm-profile-tags" id="crm-profile-tags">
                ${tags.map(t => `<span class="tag tag-lifecycle" data-tag="${t}">${t}</span>`).join('')}
                <span class="crm-tag-add" id="crm-add-tag">+ Tag</span>
            </div>
        </div>

        <div class="crm-profile-section">
            <div class="crm-profile-label">Hành động</div>
            <div style="display:flex;flex-direction:column;gap:6px">
                <button class="btn btn-sm" id="crm-btn-read" style="justify-content:center">
                    <i data-lucide="check-check" style="width:14px;height:14px"></i> Đánh dấu đã đọc
                </button>
                <a class="btn btn-sm" href="https://pages.fm" target="_blank" style="justify-content:center;text-decoration:none">
                    <i data-lucide="external-link" style="width:14px;height:14px"></i> Mở trên Pancake
                </a>
            </div>
        </div>`;

    if (window.lucide) window.lucide.createIcons();

    // Tag add handler
    document.getElementById('crm-add-tag')?.addEventListener('click', async () => {
        const tag = prompt('Nhập tên tag:');
        if (!tag || !activeConvId || !activePageId) return;
        try {
            await apiPost(`/crm/conversations/${activeConvId}/tags`, { page_id: activePageId, tag, action: 'add' });
            customer.tags = [...(customer.tags || []), tag];
            renderProfile(customer);
        } catch (err) { alert('Lỗi: ' + err.message); }
    });

    // Mark as read handler
    document.getElementById('crm-btn-read')?.addEventListener('click', async () => {
        if (!activeConvId || !activePageId) return;
        try {
            await apiPost(`/crm/conversations/${activeConvId}/read`, { page_id: activePageId });
            const { toastInfo } = await import('../components/toast.js');
            toastInfo('✅ Đã đánh dấu đã đọc');
        } catch (err) { alert('Lỗi: ' + err.message); }
    });
}

function renderAttachments(attachments) {
    if (!attachments) return '';
    try {
        const atts = typeof attachments === 'string' ? JSON.parse(attachments) : attachments;
        if (!Array.isArray(atts) || atts.length === 0) return '';
        return atts.map(a => {
            if (a.type === 'image' || a.image_data) {
                const url = a.image_data?.url || a.payload?.url || a.url || '';
                return url ? `<div class="msg-attachment"><img src="${url}" alt="Ảnh" style="max-width:200px;border-radius:8px" /></div>` : '';
            }
            return `<div class="msg-attachment" style="font-size:11px;color:var(--text-muted)">[${a.type || 'Tệp'}]</div>`;
        }).join('');
    } catch { return ''; }
}

function stripHtml(str) { return (str || '').replace(/<[^>]*>/g, '').trim() || ''; }
function escapeAttr(str) { return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function formatMsgTime(ts) {
    if (!ts) return '';
    const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)}p`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${d.getDate()}/${d.getMonth() + 1}`;
}
