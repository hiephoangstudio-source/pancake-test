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
        // Row 2: Token + Sync + Auto-Sync
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
        + '<div class="chart-title"><i data-lucide="timer"></i> Smart Sync</div>'
        + '<div style="margin-top:8px">'
        + '<select class="filter-select" id="auto-sync-interval" style="width:100%;margin-bottom:8px">'
        + '<option value="0">Tắt</option>'
        + '<option value="0.5">Mỗi 30 phút</option>'
        + '<option value="1">Mỗi 1 giờ</option>'
        + '<option value="3">Mỗi 3 giờ</option>'
        + '<option value="6">Mỗi 6 giờ</option>'
        + '<option value="12">Mỗi 12 giờ</option>'
        + '<option value="24">Mỗi ngày</option>'
        + '</select>'
        + '<div id="auto-sync-status" style="font-size:12px;color:var(--text-muted);margin-bottom:8px"></div>'
        + '<button class="btn btn-primary" id="save-auto-sync-btn" style="width:100%"><i data-lucide="save"></i> Lưu lịch</button>'
        + '</div>'
        + '</div>'
        + '</div>'
        // Row 3: Add Page
        + '<div style="display:grid;grid-template-columns:1fr;gap:16px;margin-top:16px;max-width:400px">'
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
    document.getElementById('save-auto-sync-btn')?.addEventListener('click', saveAutoSync);

    // Load auto-sync status
    try {
        var autoSync = await apiGet('/sync/auto-sync');
        var intervalEl = document.getElementById('auto-sync-interval');
        var statusEl = document.getElementById('auto-sync-status');
        if (intervalEl && autoSync.interval_hours != null) intervalEl.value = autoSync.interval_hours;
        if (statusEl) {
            if (autoSync.interval_hours > 0) {
                var label = autoSync.interval_hours < 1 ? (autoSync.interval_hours * 60) + ' phút' : autoSync.interval_hours + 'h';
                statusEl.innerHTML = '<span style="color:var(--green)">✅ Smart Sync: mỗi ' + label + '</span>' + 
                    (autoSync.last_sync ? '<br>Lần cuối: ' + new Date(autoSync.last_sync).toLocaleString('vi-VN') : '');
            } else {
                statusEl.textContent = '⏸ Đang tắt';
            }
        }
    } catch {}
}

async function loadUsers() {
    try {
        var users = await apiGet('/users');
        var el = document.getElementById('users-table');
        if (!el) return;
        if (!users || users.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px">Chưa có dữ liệu</div>'; return; }
        var html = '<table class="data-table"><thead><tr><th></th><th>Tên</th><th>ID</th><th>Quyền</th><th style="width:40px"></th></tr></thead><tbody>';
        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            var init = (u.name || 'U')[0].toUpperCase();
            var av = u.avatar ? '<img src="' + u.avatar + '" style="width:26px;height:26px;border-radius:50%;object-fit:cover" onerror="this.style.display=\'none\'" />'
                : '<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#8B5CF6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">' + init + '</div>';
            var badge = u.role === 'admin' ? '<span class="tag tag-lifecycle" style="font-size:10px">Admin</span>' : '<span class="tag" style="font-size:10px">User</span>';
            html += '<tr data-user-id="' + u.pancake_id + '" data-user-name="' + (u.name || '') + '">';
            html += '<td style="width:36px">' + av + '</td>';
            html += '<td style="font-weight:600" class="user-name-cell">' + (u.name || '\u2014') + '</td>';
            html += '<td style="font-size:11px;color:var(--text-muted);font-family:monospace">' + u.pancake_id.substring(0,8) + '...</td>';
            html += '<td>' + badge + '</td>';
            html += '<td><button class="btn-icon btn-icon-sm edit-user-btn" title="Sửa tên"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button></td>';
            html += '</tr>';
        }
        html += '</tbody></table>';
        el.innerHTML = html;

        // Bind edit handlers
        el.querySelectorAll('.edit-user-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var row = btn.closest('tr');
                var cell = row.querySelector('.user-name-cell');
                var uid = row.dataset.userId;
                var curName = row.dataset.userName;
                cell.innerHTML = '<input class="inline-edit-input" value="' + curName + '" />';
                var inp = cell.querySelector('input');
                inp.focus(); inp.select();
                var save = async function() {
                    var newName = inp.value.trim();
                    if (newName && newName !== curName) {
                        try { await apiPost('/users/' + uid, { name: newName }); toastSuccess('Đã đổi tên!'); } catch(e) { toastError(e.message); }
                    }
                    await loadUsers();
                };
                inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') save(); if (e.key === 'Escape') loadUsers(); });
                inp.addEventListener('blur', save);
            });
        });
    } catch (err) { console.error('Load users error:', err); }
}

async function loadPages() {
    try {
        var pages = await apiGet('/pages');
        var el = document.getElementById('pages-list');
        if (!el) return;
        if (pages.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Chưa có trang nào</div>'; return; }
        var html = '<table class="data-table"><thead><tr><th>Tên</th><th>ID</th><th>Token</th><th style="width:70px"></th></tr></thead><tbody>';
        for (var i = 0; i < pages.length; i++) {
            var p = pages[i];
            var isLong = p.page_id.length > 16;
            html += '<tr data-page-id="' + p.page_id + '" data-page-name="' + (p.name || '') + '">';
            html += '<td style="font-weight:600" class="page-name-cell">' + p.name + '</td>';
            html += '<td style="font-size:11px;color:var(--text-muted)">' + (isLong ? p.page_id.substring(0,16)+'...' : p.page_id) + '</td>';
            html += '<td style="font-size:11px">' + (p._hasToken ? '✅' : '❌') + '</td>';
            html += '<td style="display:flex;gap:2px">';
            html += '<button class="btn-icon btn-icon-sm edit-page-btn" title="Sửa tên"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>';
            html += '<button class="btn-icon btn-icon-sm update-token-btn" title="Cập nhật Token" style="color:var(--orange)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></button>';
            html += '</td>';
            html += '</tr>';
        }
        html += '</tbody></table>';
        el.innerHTML = html;

        // Bind edit name handlers
        el.querySelectorAll('.edit-page-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var row = btn.closest('tr');
                var cell = row.querySelector('.page-name-cell');
                var pid = row.dataset.pageId;
                var curName = row.dataset.pageName;
                cell.innerHTML = '<input class="inline-edit-input" value="' + curName + '" />';
                var inp = cell.querySelector('input');
                inp.focus(); inp.select();
                var save = async function() {
                    var newName = inp.value.trim();
                    if (newName && newName !== curName) {
                        try { await apiPost('/pages', { page_id: pid, name: newName, access_token: '********' }); toastSuccess('Đã đổi tên!'); } catch(e) { toastError(e.message); }
                    }
                    await loadPages();
                };
                inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') save(); if (e.key === 'Escape') loadPages(); });
                inp.addEventListener('blur', save);
            });
        });

        // Bind update token handlers
        el.querySelectorAll('.update-token-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var row = btn.closest('tr');
                var pid = row.dataset.pageId;
                var name = row.dataset.pageName;
                var cell = row.querySelector('.page-name-cell');
                cell.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Token mới cho ' + name + ':</div><input class="inline-edit-input" type="password" placeholder="Dán page_access_token..." style="font-family:monospace;font-size:11px" />';
                var inp = cell.querySelector('input');
                inp.focus();
                var save = async function() {
                    var newToken = inp.value.trim();
                    if (newToken) {
                        try {
                            await apiPost('/pages', { page_id: pid, name: name, access_token: newToken });
                            toastSuccess('✅ Token đã cập nhật cho ' + name);
                        } catch(e) { toastError(e.message); }
                    }
                    await loadPages();
                };
                inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') save(); if (e.key === 'Escape') loadPages(); });
                inp.addEventListener('blur', function() { setTimeout(loadPages, 200); });
            });
        });
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
        await apiPost('/sync/all', { days_back: days });
        if (statusEl) statusEl.textContent = '\u2705 Đồng bộ ' + days + ' ngày OK';
        toastSuccess('Đồng bộ ' + days + ' ngày thành công');
    } catch (err) {
        if (statusEl) statusEl.textContent = '\u274C ' + err.message;
        toastError(err.message);
    }
}

async function saveAutoSync() {
    var interval = parseInt(document.getElementById('auto-sync-interval')?.value || '0');
    var statusEl = document.getElementById('auto-sync-status');
    try {
        await apiPost('/sync/auto-sync', { interval_hours: interval });
        if (statusEl) {
            if (interval > 0) {
                var label = interval < 1 ? (interval * 60) + ' phút' : interval + 'h';
                statusEl.innerHTML = '<span style="color:var(--green)">✅ Smart Sync: mỗi ' + label + '</span>';
            } else {
                statusEl.textContent = '⏸ Đã tắt';
            }
        }
        toastSuccess(interval > 0 ? 'Smart Sync mỗi ' + (interval < 1 ? (interval*60) + ' phút' : interval + 'h') : 'Đã tắt Smart Sync');
    } catch (err) {
        toastError(err.message);
    }
}
