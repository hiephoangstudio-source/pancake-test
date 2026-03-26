import { apiGet, apiPost } from '../utils/api.js';
import { fmtNumber, fmtDate } from '../utils/format.js';

let activeConvId = null;
let activePageId = null;
let activeCustomerPancakeId = null;
let currentOffset = 0;
let isLoadingMore = false;
let allLoaded = false;
let staffList = [];

export function destroy() {
    activeConvId = null;
    activePageId = null;
    activeCustomerPancakeId = null;
    currentOffset = 0;
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
            </div>
            <div class="filter-group"><i data-lucide="eye"></i>
                <select class="filter-select" id="conv-read-filter">
                    <option value="">Tất cả</option>
                    <option value="false">🔵 Chưa đọc</option>
                    <option value="true">Đã đọc</option>
                </select>
            </div>
            <div class="filter-group"><i data-lucide="user"></i>
                <select class="filter-select" id="conv-user-filter"><option value="">Tất cả NV</option></select>
            </div>`;
    }

    container.innerHTML = `
        <div class="crm-layout">
            <div class="crm-sidebar">
                <div class="crm-sidebar-search">
                    <input type="text" id="crm-search" placeholder="Tìm tên, SĐT, nội dung..." />
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

    // Load staff for NV filter
    try {
        const users = await apiGet('/users');
        staffList = users || [];
        const sel = document.getElementById('conv-user-filter');
        staffList.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.pancake_id;
            opt.textContent = u.name || u.pancake_id;
            sel?.appendChild(opt);
        });
    } catch {}

    // Bind search + filters
    let searchTimeout;
    document.getElementById('crm-search')?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => resetAndLoad(), 300);
    });
    document.getElementById('conv-page-filter')?.addEventListener('change', resetAndLoad);
    document.getElementById('conv-tag-filter')?.addEventListener('change', resetAndLoad);
    document.getElementById('conv-read-filter')?.addEventListener('change', resetAndLoad);
    document.getElementById('conv-user-filter')?.addEventListener('change', resetAndLoad);

    // Infinite scroll
    const listEl = document.getElementById('crm-contact-list');
    listEl?.addEventListener('scroll', () => {
        if (isLoadingMore || allLoaded) return;
        if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 60) {
            loadMoreConversations();
        }
    });

    await resetAndLoad();
}

function resetAndLoad() {
    currentOffset = 0;
    allLoaded = false;
    loadConversations(true);
}

async function loadConversations(reset = false) {
    const listEl = document.getElementById('crm-contact-list');
    if (!listEl) return;

    if (reset) {
        listEl.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';
    }

    const search = document.getElementById('crm-search')?.value || '';
    const pageId = document.getElementById('conv-page-filter')?.value || '';
    const tagFilter = document.getElementById('conv-tag-filter')?.value || '';
    const readFilter = document.getElementById('conv-read-filter')?.value || '';
    const userFilter = document.getElementById('conv-user-filter')?.value || '';

    try {
        let url = `/dashboard/conversations?limit=50&offset=${currentOffset}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (pageId) url += `&page_id=${pageId}`;
        if (tagFilter) url += `&tag=${encodeURIComponent(tagFilter)}`;
        if (readFilter) url += `&is_read=${readFilter}`;
        if (userFilter) url += `&user_id=${userFilter}`;

        const convs = await apiGet(url);
        const data = Array.isArray(convs) ? convs : (convs.data || []);

        if (data.length < 50) allLoaded = true;

        if (reset && data.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:12px">Không tìm thấy hội thoại</div>';
            return;
        }

        const html = data.map(c => renderContact(c)).join('');
        if (reset) {
            listEl.innerHTML = html;
        } else {
            // Remove loading indicator and append
            const loader = listEl.querySelector('.crm-load-more');
            if (loader) loader.remove();
            listEl.insertAdjacentHTML('beforeend', html);
        }

        currentOffset += data.length;

        // Bind click events on new items
        bindContactClicks(listEl);

    } catch (err) {
        if (reset) {
            listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red);font-size:12px">${err.message}</div>`;
        }
    }
}

async function loadMoreConversations() {
    if (isLoadingMore || allLoaded) return;
    isLoadingMore = true;
    const listEl = document.getElementById('crm-contact-list');
    listEl?.insertAdjacentHTML('beforeend', '<div class="crm-load-more" style="text-align:center;padding:12px"><div class="spinner" style="width:20px;height:20px"></div></div>');

    await loadConversations(false);
    isLoadingMore = false;
}

function renderContact(c) {
    const initial = (c.customer_name || 'K')[0].toUpperCase();
    const tags = (c.tags || []).slice(0, 2);
    const timeAgo = formatTimeAgo(c.updated_at || c.date);
    const isUnread = !c.is_read;
    const waiting = c.waiting_minutes;

    let waitingBadge = '';
    if (waiting !== null && waiting !== undefined && waiting > 0) {
        const waitClass = waiting > 60 ? 'wait-critical' : waiting > 15 ? 'wait-warning' : 'wait-ok';
        const waitText = waiting > 60 ? `${Math.floor(waiting / 60)}h${waiting % 60}p` : `${waiting}p`;
        waitingBadge = `<span class="crm-wait-badge ${waitClass}">⏳ ${waitText}</span>`;
    }

    return `
        <div class="crm-contact ${isUnread ? 'crm-unread' : ''}" data-conv-id="${c.pancake_id}" data-page-id="${c.page_id}" data-cust-id="${c.customer_pancake_id}" data-is-read="${c.is_read}" data-customer="${escapeAttr(JSON.stringify({
            name: c.customer_name,
            phone: c.phone,
            id: c.pancake_id,
            customer_id: c.customer_pancake_id,
            page_id: c.page_id,
            page_name: c.page_name,
            user_name: c.user_name,
            tags: c.tags || [],
            snippet: c.snippet,
            date: c.date,
            is_read: c.is_read,
            waiting_minutes: c.waiting_minutes,
            response_time_seconds: c.response_time_seconds,
        }))}">
            ${isUnread ? '<div class="crm-unread-dot"></div>' : ''}
            <div class="crm-contact-avatar">${initial}</div>
            <div class="crm-contact-info">
                <div class="crm-contact-name">${c.customer_name || 'Khách hàng'}</div>
                <div class="crm-contact-snippet">${stripHtml(c.snippet || '')}</div>
                <div class="crm-contact-meta">
                    ${c.page_name ? `<span class="tag tag-page" style="font-size:9px">${c.page_name}</span>` : ''}
                    ${c.user_name ? `<span class="tag tag-staff" style="font-size:9px">${c.user_name}</span>` : ''}
                    ${tags.map(t => `<span class="tag" style="font-size:9px">${t}</span>`).join('')}
                </div>
            </div>
            <div class="crm-contact-time">
                <div>${timeAgo}</div>
                ${waitingBadge}
            </div>
        </div>`;
}

function bindContactClicks(listEl) {
    listEl.querySelectorAll('.crm-contact:not([data-bound])').forEach(el => {
        el.dataset.bound = '1';
        el.addEventListener('click', () => {
            listEl.querySelectorAll('.crm-contact').forEach(e => e.classList.remove('active'));
            el.classList.add('active');
            const customer = JSON.parse(el.dataset.customer);
            activeConvId = el.dataset.convId;
            activePageId = el.dataset.pageId;
            activeCustomerPancakeId = el.dataset.custId;
            loadMessages(activeConvId, activePageId, customer);
            renderProfile(customer);
        });
    });
}

async function loadMessages(convId, pageId, customer) {
    const msgEl = document.getElementById('crm-chat-messages');
    const headerEl = document.getElementById('crm-chat-header');
    if (!msgEl || !headerEl) return;

    headerEl.innerHTML = `
        <div>
            <span style="font-weight:600;font-size:14px">${customer.name || 'Khách hàng'}</span>
            ${customer.phone ? `<span style="font-size:12px;color:var(--text-muted);margin-left:8px">${customer.phone}</span>` : ''}
        </div>
        <div style="display:flex;gap:4px;align-items:center">
            ${customer.page_name ? `<span class="tag tag-page" style="font-size:10px">${customer.page_name}</span>` : ''}
            <span class="tag tag-staff" style="font-size:10px">${customer.user_name || 'Chưa gán'}</span>
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

async function renderProfile(customer) {
    const el = document.getElementById('crm-profile');
    if (!el) return;

    const tags = customer.tags || [];
    const isRead = customer.is_read;
    const waitMin = customer.waiting_minutes;
    const respSec = customer.response_time_seconds;

    // Format response time
    let respText = '—';
    if (respSec) {
        const m = Math.round(respSec / 60);
        respText = m > 60 ? `${Math.floor(m / 60)}h ${m % 60}p` : `${m} phút`;
    }

    // Waiting badge
    let waitHtml = '';
    if (waitMin && waitMin > 0) {
        const cls = waitMin > 60 ? 'wait-critical' : waitMin > 15 ? 'wait-warning' : 'wait-ok';
        waitHtml = `<div class="crm-wait-alert ${cls}">⚠️ KH đang chờ phản hồi ${waitMin > 60 ? Math.floor(waitMin / 60) + 'h ' + (waitMin % 60) + 'p' : waitMin + ' phút'}</div>`;
    }

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
            ${waitHtml}
        </div>

        <div class="crm-profile-section">
            <div class="crm-profile-label">Thông tin</div>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
                <div><span style="color:var(--text-muted)">NV phụ trách:</span> <strong>${customer.user_name || 'Chưa gán'}</strong></div>
                <div><span style="color:var(--text-muted)">Trang:</span> <strong>${customer.page_name || '—'}</strong></div>
                <div><span style="color:var(--text-muted)">Ngày:</span> ${customer.date || '—'}</div>
                <div><span style="color:var(--text-muted)">Phản hồi TB:</span> <strong>${respText}</strong></div>
                <div><span style="color:var(--text-muted)">Trạng thái:</span> ${isRead ? '<span style="color:var(--green)">✅ Đã đọc</span>' : '<span style="color:var(--blue)">🔵 Chưa đọc</span>'}</div>
            </div>
        </div>

        <div class="crm-profile-section" id="crm-cross-page-section">
            <div class="crm-profile-label">🔗 Lịch sử cross-page</div>
            <div id="crm-cross-page-content" style="font-size:12px;color:var(--text-muted)">Đang kiểm tra...</div>
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
                <button class="btn btn-sm" id="crm-btn-toggle-read" style="justify-content:center">
                    ${isRead
                        ? '<i data-lucide="eye-off" style="width:14px;height:14px"></i> Đánh dấu chưa đọc'
                        : '<i data-lucide="check-check" style="width:14px;height:14px"></i> Đánh dấu đã đọc'}
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

    // Toggle read/unread handler
    document.getElementById('crm-btn-toggle-read')?.addEventListener('click', async () => {
        if (!activeConvId || !activePageId) return;
        try {
            const endpoint = isRead ? 'unread' : 'read';
            await apiPost(`/crm/conversations/${activeConvId}/${endpoint}`, { page_id: activePageId });
            const { toastInfo } = await import('../components/toast.js');
            toastInfo(isRead ? '🔵 Đã đánh dấu chưa đọc' : '✅ Đã đánh dấu đã đọc');
            customer.is_read = !isRead;

            // Update contact in list
            const contactEl = document.querySelector(`.crm-contact[data-conv-id="${activeConvId}"]`);
            if (contactEl) {
                contactEl.dataset.isRead = String(!isRead);
                if (isRead) {
                    contactEl.classList.add('crm-unread');
                    if (!contactEl.querySelector('.crm-unread-dot')) {
                        contactEl.insertAdjacentHTML('afterbegin', '<div class="crm-unread-dot"></div>');
                    }
                } else {
                    contactEl.classList.remove('crm-unread');
                    contactEl.querySelector('.crm-unread-dot')?.remove();
                }
            }

            // Update sidebar badge
            updateUnreadBadge();

            // Re-render profile with updated state
            renderProfile(customer);
        } catch (err) { alert('Lỗi: ' + err.message); }
    });

    // Load cross-page data
    if (customer.customer_id) {
        loadCrossPageInfo(customer.customer_id);
    }
}

async function loadCrossPageInfo(customerId) {
    const el = document.getElementById('crm-cross-page-content');
    if (!el) return;

    try {
        const data = await apiGet(`/dashboard/conversations/cross-page/${customerId}`);

        if (data.pages.length <= 1 && data.phone_matches.length === 0) {
            el.innerHTML = '<span style="color:var(--text-muted)">Chỉ xuất hiện trên 1 trang</span>';
            return;
        }

        let html = '<div style="display:flex;flex-direction:column;gap:6px">';
        for (const p of data.pages) {
            const icon = p.via_phone ? '📱' : '💬';
            html += `<div style="display:flex;align-items:center;gap:6px">
                <span>${icon}</span>
                <span class="tag tag-page" style="font-size:10px">${p.page_name}</span>
                ${p.via_phone ? '<span style="font-size:10px;color:var(--orange)">(cùng SĐT)</span>' : ''}
            </div>`;
        }
        if (data.phone_matches.length > 0) {
            html += '<div style="margin-top:4px;font-size:11px;color:var(--orange);font-weight:600">⚠️ KH đã tư vấn tại ' + data.phone_matches.map(m => m.page_name).join(', ') + '</div>';
        }
        html += '</div>';
        el.innerHTML = html;
    } catch {
        el.innerHTML = '<span style="color:var(--text-muted)">—</span>';
    }
}

export async function updateUnreadBadge() {
    try {
        const { count } = await apiGet('/dashboard/conversations/unread-count');
        const badge = document.getElementById('sidebar-unread-badge');
        if (badge) {
            badge.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    } catch {}
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
