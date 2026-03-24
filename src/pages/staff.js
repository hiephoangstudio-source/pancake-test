import { apiGet } from '../utils/api.js';
import { fmtNumber, fmtPercent, fmtTimeDuration, getDateRange } from '../utils/format.js';

export function destroy() {}

export async function render(container, { tagMap }) {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = 'Nhân viên';

    const filtersEl = document.getElementById('header-filters');
    if (filtersEl) {
        filtersEl.innerHTML = `
            <div class="filter-group">
                <i data-lucide="clock"></i>
                <select class="filter-select" id="staff-time">
                    <option value="this_month">Tháng này</option>
                    <option value="today">Hôm nay</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="file-text"></i>
                <select class="filter-select" id="staff-page">
                    <option value="">Tất cả trang</option>
                </select>
            </div>
        `;
    }

    container.innerHTML = `
        <div id="staff-summary" class="kpi-grid" style="margin-bottom:12px"></div>
        <div class="card">
            <table class="data-table" id="staff-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nhân viên</th>
                        <th class="text-right">Hội thoại</th>
                        <th class="text-right">Tin nhắn</th>
                        <th class="text-right">Inbox</th>
                        <th class="text-right">Comment</th>
                        <th class="text-right">Khách hàng</th>
                        <th class="text-right">Có SĐT</th>
                        <th class="text-right" style="color:var(--red)">Sai đối tượng</th>
                        <th class="text-right" style="color:var(--green)">Đã chốt</th>
                        <th class="text-right">Tỷ lệ chốt</th>
                    </tr>
                </thead>
                <tbody id="staff-body">
                    <tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted)">Đang tải...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    // Load pages filter
    try {
        const pages = await apiGet('/pages');
        const sel = document.getElementById('staff-page');
        pages.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.page_id;
            opt.textContent = p.name;
            sel?.appendChild(opt);
        });
    } catch {}

    const load = () => fetchStaff();
    document.getElementById('staff-time')?.addEventListener('change', load);
    document.getElementById('staff-page')?.addEventListener('change', load);
    await load();
}

async function fetchStaff() {
    const preset = document.getElementById('staff-time')?.value || 'this_month';
    const pageId = document.getElementById('staff-page')?.value || '';
    const { from, to } = getDateRange(preset);

    try {
        let url = `/dashboard/staff?from=${from}&to=${to}`;
        if (pageId) url += `&pageId=${pageId}`;
        const data = await apiGet(url);

        // Summary KPIs
        const t = data.totals;
        const summaryEl = document.getElementById('staff-summary');
        if (summaryEl && t) {
            const phoneRate = t.conversations > 0 ? (t.phone / t.conversations * 100) : 0;
            const signedRate = t.conversations > 0 ? (t.signed / t.conversations * 100) : 0;
            summaryEl.innerHTML = `
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="users"></i>Tổng NV</div><div class="kpi-value">${data.staff.length}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="message-circle"></i>Hội thoại</div><div class="kpi-value">${fmtNumber(t.conversations)}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="phone"></i>Có SĐT</div><div class="kpi-value">${fmtNumber(t.phone)}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="check-circle"></i>Đã chốt</div><div class="kpi-value" style="color:var(--green)">${fmtNumber(t.signed)}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="percent"></i>Tỷ lệ SĐT</div><div class="kpi-value" style="color:var(--cyan)">${fmtPercent(phoneRate)}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="target"></i>Tỷ lệ chốt</div><div class="kpi-value" style="color:var(--green)">${fmtPercent(signedRate)}</div></div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }

        // Table
        const tbody = document.getElementById('staff-body');
        if (!tbody) return;

        if (data.staff.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted)">Không có dữ liệu</td></tr>';
            return;
        }

        tbody.innerHTML = data.staff.map((s, i) => {
            const signedRate = s.conversations > 0 ? (s.signed / s.conversations * 100) : 0;
            return `
                <tr>
                    <td style="font-weight:700;color:${i < 3 ? 'var(--blue)' : 'var(--text-muted)'}">${i + 1}</td>
                    <td style="font-weight:600">${s.userName}</td>
                    <td class="text-right">${fmtNumber(s.conversations)}</td>
                    <td class="text-right">${fmtNumber(s.messages)}</td>
                    <td class="text-right">${fmtNumber(s.inbox)}</td>
                    <td class="text-right">${fmtNumber(s.comment)}</td>
                    <td class="text-right">${fmtNumber(s.customers)}</td>
                    <td class="text-right">${fmtNumber(s.phone)}</td>
                    <td class="text-right" style="color:var(--red)">${s.wrongTarget > 0 ? fmtNumber(s.wrongTarget) : '—'}</td>
                    <td class="text-right" style="color:var(--green);font-weight:600">${fmtNumber(s.signed)}</td>
                    <td class="text-right" style="font-weight:600;color:${signedRate >= 15 ? 'var(--green)' : signedRate >= 10 ? 'var(--orange)' : 'var(--red)'}">${fmtPercent(signedRate)}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Lỗi tải nhân viên:', err);
    }
}
