import { apiGet, apiPost } from '../utils/api.js';
import { toastSuccess, toastError } from '../components/toast.js';

export function destroy() {}

export async function render(container) {
    var headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = 'Cấu hình';

    var filtersEl = document.getElementById('header-filters');
    if (filtersEl) {
        filtersEl.innerHTML = '<button class="btn btn-primary" id="save-config-btn" style="display:flex;align-items:center;gap:6px"><i data-lucide="save" style="width:14px;height:14px"></i> Lưu cấu hình</button>';
    }

    container.innerHTML = ''
        // Row 1: Users + Pages side by side
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="settings-grid">'
        + '<div class="card">'
        + '<div class="chart-title"><i data-lucide="users-2"></i> Quản lý nhân viên</div>'
        + '<div id="users-table" style="margin-top:8px;overflow-x:auto;max-height:360px;overflow-y:auto">Đang tải...</div>'
        + '</div>'
        + '<div class="card">'
        + '<div class="chart-title"><i data-lucide="file-text"></i> Quản lý Pages</div>'
        + '<div id="pages-list" style="margin-top:8px;overflow-x:auto;max-height:360px;overflow-y:auto">Đang tải...</div>'
        + '</div>'
        + '</div>'
        // Row 2: Token + Sync + Add Page
        + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px" class="settings-grid">'
        + '<div class="card">'
        + '<div class="chart-title"><i data-lucide="key"></i> Master Token</div>'
        + '<div id="token-status" style="font-size:12px;margin:8px 0"></div>'
        + '<input id="master-token-input" placeholder="Nhập master token..." type="password" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;margin-bottom:8px;font-family:monospace" />'
        + '<button class="btn btn-primary" id="save-token-btn" style="width:100%"><i data-lucide="save"></i> Lưu Token</button>'
        + '</div>'
        + '<div class="card">'
        + '<div class="chart-title"><i data-lucide="refresh-cw"></i> Đồng bộ dữ liệu</div>'
        + '<div style="display:flex;gap:8px;align-items:center;margin:8px 0">'
        + '<select class="filter-select" id="sync-preset" style="flex:1"><option value="1">Hôm nay</option><option value="7" selected>7 ngày</option><option value="14">14 ngày</option><option value="30">30 ngày</option><option value="60">60 ngày</option><option value="90">90 ngày</option><option value="custom">Tự chọn...</option></select>'
        + '<button class="btn btn-primary" id="sync-run-btn"><i data-lucide="play"></i> Chạy</button>'
        + '</div>'
        + '<div id="sync-custom-dates" style="display:none;gap:8px;margin-bottom:8px"><input type="date" id="sync-from" class="filter-select" /><span style="color:var(--text-muted)">→</span><input type="date" id="sync-to" class="filter-select" /></div>'
        + '<div id="sync-status" style="font-size:12px;color:var(--text-muted)"></div>'
        + '</div>'
        + '<div class="card">'
        + '<div class="chart-title"><i data-lucide="plus-circle"></i> Thêm trang mới</div>'
        + '<input id="new-page-id" placeholder="Page ID" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;margin-top:8px;margin-bottom:6px" />'
        + '<input id="new-page-name" placeholder="Tên trang" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;margin-bottom:6px" />'
        + '<input id="new-page-token" placeholder="Access Token" type="password" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;margin-bottom:6px" />'
        + '<button class="btn btn-primary" id="add-page-btn" style="width:100%">Thêm trang</button>'
        + '</div>'
        + '</div>';
    if (window.lucide) window.lucide.createIcons();

    // Check token
    try {
        var res = await apiGet('/sync/status');
        var statusEl = document.getElementById('token-status');
        if (statusEl) statusEl.innerHTML = res?.hasToken ? '<span style="color:var(--green)">✅ Đã cấu hình</span>' : '<span style="color:var(--red)">❌ Chưa có token</span>';
    } catch {}

    // Custom date toggle
    document.getElementById('sync-preset')?.addEventListener('change', function() {
        var el = document.getElementById('sync-custom-dates');
        if (el) el.style.display = this.value === 'custom' ? 'flex' : 'none';
    });

    await Promise.all([loadPages(), loadUsers()]);

    document.getElementById('add-page-btn')?.addEventListener('click', addPage);
    document.getElementById('save-token-btn')?.addEventListener('click', saveToken);
    document.getElementById('sync-run-btn')?.addEventListener('click', runSync);
    document.getElementById('save-config-btn')?.addEventListener('click', function() { toastSuccess('✅ Cấu hình đã được lưu!'); });
}

async function loadUsers() {
    try {
        var users = await apiGet('/users');
        var el = document.getElementById('users-table');
        if (!el) return;
        if (!users || users.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px">Chưa có dữ liệu</div>'; return; }
        var html = '<table class="data-table"><thead><tr><th></th><th>Tên</th><th>ID</th><th>Quyền</th></tr></thead><tbody>';
        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            var init = (u.name || 'U')[0].toUpperCase();
            var av = u.avatar ? '<img src="' + u.avatar + '" style="width:26px;height:26px;border-radius:50%;object-fit:cover" onerror="this.style.display=\'none\'" />'
                : '<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#8B5CF6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">' + init + '</div>';
            var badge = u.role === 'admin' ? '<span class="tag tag-lifecycle" style="font-size:10px">Admin</span>' : '<span class="tag" style="font-size:10px">User</span>';
            html += '<tr><td style="width:36px">' + av + '</td><td style="font-weight:600">' + (u.name || '\u2014') + '</td><td style="font-size:11px;color:var(--text-muted);font-family:monospace">' + u.pancake_id.substring(0,8) + '...</td><td>' + badge + '</td></tr>';
        }
        html += '</tbody></table>';
        el.innerHTML = html;
    } catch (err) { console.error('Load users error:', err); }
}

async function loadPages() {
    try {
        var pages = await apiGet('/pages');
        var el = document.getElementById('pages-list');
        if (!el) return;
        if (pages.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Chưa có trang nào</div>'; return; }
        var html = '<table class="data-table"><thead><tr><th>Tên</th><th>ID</th><th>Token</th></tr></thead><tbody>';
        for (var i = 0; i < pages.length; i++) {
            var p = pages[i];
            var isLong = p.page_id.length > 16;
            html += '<tr><td style="font-weight:600">' + p.name + '</td>';
            html += '<td style="font-size:11px;color:var(--text-muted)">' + (isLong ? p.page_id.substring(0,16)+'...' : p.page_id) + '</td>';
            html += '<td style="font-size:11px">' + (p._hasToken ? '✅' : '❌') + '</td></tr>';
        }
        html += '</tbody></table>';
        el.innerHTML = html;
    } catch (err) { console.error(err); }
}

async function addPage() {
    var pid = document.getElementById('new-page-id')?.value;
    var name = document.getElementById('new-page-name')?.value;
    var token = document.getElementById('new-page-token')?.value;
    if (!pid || !name) { toastError('Nhập Page ID và tên'); return; }
    try {
        await apiPost('/pages', { page_id: pid, name: name, access_token: token });
        toastSuccess('Đã thêm trang!');
        document.getElementById('new-page-id').value = '';
        document.getElementById('new-page-name').value = '';
        document.getElementById('new-page-token').value = '';
        await loadPages();
    } catch (err) { toastError(err.message); }
}

async function saveToken() {
    var token = document.getElementById('master-token-input')?.value?.trim();
    if (!token) { toastError('Nhập master token'); return; }
    try {
        await apiPost('/sync/master-token', { token: token });
        toastSuccess('Đã cập nhật Token!');
        document.getElementById('master-token-input').value = '';
        var s = document.getElementById('token-status');
        if (s) s.innerHTML = '<span style="color:var(--green)">✅ Đã cấu hình</span>';
    } catch (err) { toastError(err.message); }
}

async function runSync() {
    var preset = document.getElementById('sync-preset')?.value;
    var statusEl = document.getElementById('sync-status');
    var days = parseInt(preset) || 7;
    if (preset === 'custom') {
        var f = document.getElementById('sync-from')?.value;
        var t = document.getElementById('sync-to')?.value;
        if (!f || !t) { toastError('Chọn ngày bắt đầu và kết thúc'); return; }
        days = Math.ceil((new Date(t) - new Date(f)) / 86400000);
    }
    if (statusEl) statusEl.textContent = '\u23F3 Đang đồng bộ ' + days + ' ngày...';
    try {
        await apiPost('/sync/trigger', { days: days });
        if (statusEl) statusEl.textContent = '\u2705 Đồng bộ ' + days + ' ngày OK';
        toastSuccess('Đồng bộ ' + days + ' ngày thành công');
    } catch (err) {
        if (statusEl) statusEl.textContent = '\u274C ' + err.message;
        toastError(err.message);
    }
}
