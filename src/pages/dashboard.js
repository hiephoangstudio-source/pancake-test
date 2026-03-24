import { apiGet } from '../utils/api.js';
import { fmtNumber, fmtMoney, fmtPercent, fmtDate, getDateRange, getPrevRange, calcDelta } from '../utils/format.js';
import { renderKpiCard, renderKpiGrid } from '../components/kpiCard.js';
import { getBranchTagNames } from '../utils/tagClassifier.js';
import { openConversationModal } from '../components/conversationModal.js';

let charts = {};

export function destroy() {
    Object.values(charts).forEach(c => c.destroy());
    charts = {};
}

export async function render(container, { tagMap }) {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = 'Tổng quan';

    // ─── Build filter options from tagMap ───
    const branchOptions = Object.values(tagMap).filter(t => t.category === 'branch')
        .map(t => `<option value="${t.tag_name}">${t.display_name}</option>`).join('');
    const staffOptions = Object.values(tagMap).filter(t => t.category === 'staff')
        .map(t => `<option value="${t.tag_name}">${t.display_name}</option>`).join('');
    const lifecycleOptions = Object.values(tagMap).filter(t => t.category === 'lifecycle')
        .map(t => `<option value="${t.tag_name}">${t.display_name}</option>`).join('');
    const serviceOptions = Object.values(tagMap).filter(t => t.category === 'service')
        .map(t => `<option value="${t.tag_name}">${t.display_name}</option>`).join('');

    // Filters
    const filtersEl = document.getElementById('header-filters');
    if (filtersEl) {
        filtersEl.innerHTML = `
            <div class="filter-group">
                <i data-lucide="clock"></i>
                <select class="filter-select" id="time-preset">
                    <option value="this_month">Tháng này</option>
                    <option value="today">Hôm nay</option>
                    <option value="yesterday">Hôm qua</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_quarter">Quý này</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="building-2"></i>
                <select class="filter-select" id="filter-branch">
                    <option value="">Tất cả CN</option>
                    ${branchOptions}
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="user-check"></i>
                <select class="filter-select" id="filter-staff">
                    <option value="">Tất cả NV</option>
                    ${staffOptions}
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="activity"></i>
                <select class="filter-select" id="filter-status">
                    <option value="">Trạng thái</option>
                    ${lifecycleOptions}
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="camera"></i>
                <select class="filter-select" id="filter-service">
                    <option value="">Dịch vụ</option>
                    ${serviceOptions}
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="file-text"></i>
                <select class="filter-select" id="page-filter">
                    <option value="">Tất cả trang</option>
                </select>
            </div>
            <button class="btn btn-sm" id="refresh-btn">
                <i data-lucide="refresh-cw"></i> Làm mới
            </button>
        `;
    }

    // Layout skeleton
    container.innerHTML = `
        <div class="kpi-grid" id="kpi-container">
            ${Array(8).fill('<div class="kpi-card"><div class="skeleton" style="height:14px;width:60px;margin-bottom:8px"></div><div class="skeleton" style="height:28px;width:80px"></div></div>').join('')}
        </div>
        <div class="chart-grid chart-grid-3" style="margin-top:12px" id="charts-row-1">
            ${Array(3).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join('')}
        </div>
        <div class="chart-grid chart-grid-2" style="margin-top:12px" id="charts-row-2">
            ${Array(2).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join('')}
        </div>
        <!-- Row 3: Staff Performance Table -->
        <div class="card" style="margin-top:16px">
            <div class="chart-title"><i data-lucide="users-2"></i> Chi tiết nhân viên</div>
            <div id="dash-staff-table" style="margin-top:8px;overflow-x:auto">
                <div class="skeleton" style="height:200px"></div>
            </div>
        </div>
        <!-- Row 4: Customer Detail Table -->
        <div class="card" style="margin-top:16px">
            <div class="chart-title"><i data-lucide="contact-2"></i> Chi tiết khách hàng</div>
            <div id="dash-customer-table" style="margin-top:8px;overflow-x:auto">
                <div class="skeleton" style="height:200px"></div>
            </div>
            <div id="dash-cust-pagination" style="display:flex;gap:8px;justify-content:center;margin-top:12px"></div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    // Load pages list for filter
    try {
        const pages = await apiGet('/pages');
        const pageSelect = document.getElementById('page-filter');
        if (pageSelect) {
            pages.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.page_id;
                opt.textContent = p.name;
                pageSelect.appendChild(opt);
            });
        }
    } catch { /* ignore */ }

    // Event listeners
    const loadData = () => fetchAndRender(container, tagMap);
    ['time-preset', 'page-filter', 'filter-branch', 'filter-staff', 'filter-status', 'filter-service'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', loadData);
    });
    document.getElementById('refresh-btn')?.addEventListener('click', loadData);

    await fetchAndRender(container, tagMap);
}

async function fetchAndRender(container, tagMap) {
    const preset = document.getElementById('time-preset')?.value || 'this_month';
    const pageId = document.getElementById('page-filter')?.value || '';
    const branchFilter = document.getElementById('filter-branch')?.value || '';
    const staffFilter = document.getElementById('filter-staff')?.value || '';
    const statusFilter = document.getElementById('filter-status')?.value || '';
    const serviceFilter = document.getElementById('filter-service')?.value || '';
    const { from, to } = getDateRange(preset);
    const { prevFrom, prevTo } = getPrevRange(from, to);

    try {
        // Fetch KPIs
        let kpiUrl = `/dashboard/kpis?from=${from}&to=${to}&prevFrom=${prevFrom}&prevTo=${prevTo}`;
        if (pageId) kpiUrl += `&pageId=${pageId}`;
        const kpis = await apiGet(kpiUrl);
        renderKpis(kpis);

        // Fetch trend
        let trendUrl = `/dashboard/trend?from=${from}&to=${to}`;
        if (pageId) trendUrl += `&pageId=${pageId}`;
        const trendData = await apiGet(trendUrl);
        renderTrendChart(trendData);

        // Fetch staff
        let staffUrl = `/dashboard/staff?from=${from}&to=${to}`;
        if (pageId) staffUrl += `&pageId=${pageId}`;
        const staffData = await apiGet(staffUrl);
        renderStaffChart(staffData);

        // Render branch comparison + funnel
        await renderBranchComparison(staffData, tagMap);

        // ─── Fetch customers with tag filters ───
        const tagFilters = [branchFilter, staffFilter, statusFilter, serviceFilter].filter(Boolean);
        let custUrl = `/dashboard/customers?limit=100`;
        if (tagFilters.length > 0) custUrl += `&tag=${encodeURIComponent(tagFilters[0])}`;

        const customers = await apiGet(custUrl);
        let custData = customers.data || [];

        // Client-side multi-tag filtering (for 2nd+ filters)
        if (tagFilters.length > 1) {
            custData = custData.filter(c => {
                const tags = (c.tags || []).map(t => typeof t === 'string' ? t.toLowerCase() : (t.name || '').toLowerCase());
                return tagFilters.slice(1).every(f => tags.includes(f.toLowerCase()));
            });
        }

        // ─── Staff Performance Table (from daily_reports + customer tags) ───
        renderStaffTable(staffData, custData, tagMap, staffFilter);

        // ─── Customer Detail Table (filtered) ───
        renderCustomerTable(custData, tagMap);

    } catch (err) {
        console.error('Lỗi tải dashboard:', err);
    }
}

function renderKpis(data) {
    const c = data.current;
    const p = data.prev;
    const phoneRate = c.conversations > 0 ? (c.phone / c.conversations * 100) : 0;
    const signedRate = c.conversations > 0 ? (c.signed / c.conversations * 100) : 0;

    const cards = [
        renderKpiCard({ label: 'Hội thoại', value: fmtNumber(c.conversations), icon: 'message-circle', color: 'var(--blue)', delta: p ? calcDelta(c.conversations, p.conversations) : null }),
        renderKpiCard({ label: 'Tin nhắn', value: fmtNumber(c.messages), icon: 'mail', color: '#8B5CF6', delta: p ? calcDelta(c.messages, p.messages) : null }),
        renderKpiCard({ label: 'Khách hàng', value: fmtNumber(c.customers), icon: 'users', color: 'var(--green)', delta: p ? calcDelta(c.customers, p.customers) : null }),
        renderKpiCard({ label: 'Có SĐT', value: fmtNumber(c.phone), icon: 'phone', color: 'var(--orange)', delta: p ? calcDelta(c.phone, p.phone) : null }),
        renderKpiCard({ label: 'Chi QC', value: fmtMoney(c.adsLinked || 0), icon: 'wallet', color: 'var(--blue)', delta: null }),
        renderKpiCard({ label: 'Tỷ lệ SĐT', value: fmtPercent(phoneRate), icon: 'percent', color: 'var(--cyan)', delta: p && p.conversations > 0 ? calcDelta(phoneRate, p.phone / p.conversations * 100) : null }),
        renderKpiCard({ label: 'Đã chốt', value: fmtNumber(c.signed), icon: 'check-circle', color: 'var(--green)', delta: p ? calcDelta(c.signed, p.signed) : null }),
        renderKpiCard({ label: 'Tỷ lệ chốt', value: fmtPercent(signedRate), icon: 'target', color: '#10B981', delta: null }),
    ];

    const el = document.getElementById('kpi-container');
    if (el) el.innerHTML = renderKpiGrid(cards);
    if (window.lucide) window.lucide.createIcons();
}

function renderTrendChart(data) {
    const row = document.getElementById('charts-row-1');
    if (!row) return;

    row.innerHTML = `
        <div class="chart-card">
            <div class="chart-title"><i data-lucide="trending-up"></i> Xu hướng hội thoại</div>
            <div style="height:260px"><canvas id="trend-chart"></canvas></div>
        </div>
        <div class="chart-card">
            <div class="chart-title"><i data-lucide="pie-chart"></i> Phân bố tin nhắn</div>
            <div style="height:260px"><canvas id="type-chart"></canvas></div>
        </div>
        <div class="chart-card">
            <div class="chart-title"><i data-lucide="user-check"></i> Top nhân viên</div>
            <div style="height:260px" id="top-staff-list"></div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    const ctx = document.getElementById('trend-chart')?.getContext('2d');
    if (!ctx || !data.length) return;

    if (charts.trend) charts.trend.destroy();
    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Hội thoại',
                data: data.map(d => d.conversations),
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                fill: true, tension: 0.4, pointRadius: 2,
            }, {
                label: 'Tin nhắn',
                data: data.map(d => d.messages),
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139,92,246,0.05)',
                fill: true, tension: 0.4, pointRadius: 2,
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, datalabels: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
            },
        },
    });
}

function renderStaffChart(data) {
    const el = document.getElementById('top-staff-list');
    if (!el || !data.staff) return;

    const top5 = data.staff.slice(0, 5);
    const maxConv = Math.max(...top5.map(s => s.conversations), 1);

    el.innerHTML = top5.map((s, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;${i < 4 ? 'border-bottom:1px solid var(--border-light)' : ''}">
            <span style="font-size:12px;font-weight:700;color:${i < 3 ? 'var(--blue)' : 'var(--text-muted)'};min-width:20px">#${i + 1}</span>
            <div style="flex:1">
                <div style="font-size:12px;font-weight:600">${s.userName}</div>
                <div style="font-size:10px;color:var(--text-muted)">${fmtNumber(s.conversations)} hội thoại · ${fmtNumber(s.signed)} chốt</div>
            </div>
            <div style="width:60px">
                <div class="progress"><div class="progress-bar" style="width:${(s.conversations / maxConv * 100)}%"></div></div>
            </div>
        </div>
    `).join('');

    // Pie chart
    const totalInbox = data.staff.reduce((s, r) => s + (r.inbox || 0), 0);
    const totalComment = data.staff.reduce((s, r) => s + (r.comment || 0), 0);
    const totalOther = data.totals ? Math.max(0, (data.totals.messages || 0) - totalInbox - totalComment) : 0;

    const pieCtx = document.getElementById('type-chart')?.getContext('2d');
    if (pieCtx && (totalInbox + totalComment + totalOther) > 0) {
        if (charts.type) charts.type.destroy();
        charts.type = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Inbox', 'Comment', 'Khác'],
                datasets: [{ data: [totalInbox, totalComment, totalOther], backgroundColor: ['#3B82F6', '#8B5CF6', '#94A3B8'], borderWidth: 0, cutout: '55%' }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, usePointStyle: true } }, datalabels: { display: false } },
            },
        });
    }
}

async function renderBranchComparison(staffData, tagMap) {
    const row = document.getElementById('charts-row-2');
    if (!row) return;

    const preset = document.getElementById('time-preset')?.value || 'this_month';
    const { from, to } = getDateRange(preset);

    row.innerHTML = `
        <div class="chart-card">
            <div class="chart-title"><i data-lucide="building-2"></i> So sánh chi nhánh (theo tag)</div>
            <div style="height:260px"><canvas id="branch-chart"></canvas></div>
        </div>
        <div class="chart-card">
            <div class="chart-title"><i data-lucide="activity"></i> Phễu chuyển đổi</div>
            <div id="funnel-container" style="height:260px;overflow-y:auto;padding:8px 0"></div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    try {
        const branches = await apiGet(`/dashboard/branch-summary?from=${from}&to=${to}`);
        const ctx = document.getElementById('branch-chart')?.getContext('2d');
        if (ctx && branches.length) {
            if (charts.branch) charts.branch.destroy();
            charts.branch = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: branches.map(b => b.display_name),
                    datasets: [
                        { label: 'Khách hàng', data: branches.map(b => b.total_customers), backgroundColor: branches.map(b => (b.color || '#3B82F6') + '80'), borderColor: branches.map(b => b.color || '#3B82F6'), borderWidth: 1, borderRadius: 6, barPercentage: 0.7 },
                        { label: 'Đã chốt', data: branches.map(b => b.signed), backgroundColor: '#10B98180', borderColor: '#10B981', borderWidth: 1, borderRadius: 6, barPercentage: 0.7 },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, datalabels: { display: false } },
                    scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } } },
                },
            });
        }
    } catch { /* ignore */ }

    // Funnel
    const funnelEl = document.getElementById('funnel-container');
    if (funnelEl && staffData?.totals) {
        const t = staffData.totals;
        const steps = [
            { label: 'Hội thoại', value: t.conversations, color: 'var(--blue)' },
            { label: 'Khách hàng', value: t.customers, color: '#8B5CF6' },
            { label: 'Có SĐT', value: t.phone, color: 'var(--orange)' },
            { label: 'Đã chốt', value: t.signed, color: 'var(--green)' },
        ];
        const maxVal = Math.max(steps[0].value, 1);
        funnelEl.innerHTML = `<div class="funnel">${steps.map(s => `
            <div class="funnel-step">
                <div class="funnel-label">${s.label}</div>
                <div class="funnel-bar-wrapper">
                    <div class="funnel-bar" style="width:${Math.max((s.value / maxVal * 100), 3)}%;background:${s.color}">
                        ${fmtNumber(s.value)}
                    </div>
                </div>
                <div class="funnel-count">${s.value > 0 && s !== steps[0] ? fmtPercent(s.value / steps[0].value * 100) : ''}</div>
            </div>
        `).join('')}</div>`;
    }
}

// ─── Staff Performance Table ───
function renderStaffTable(staffData, custData, tagMap, staffFilter) {
    const el = document.getElementById('dash-staff-table');
    if (!el) return;

    const staffList = staffData.staff || [];
    const displayStaff = staffFilter
        ? staffList.filter(s => (s.userName || '').toLowerCase().includes(staffFilter.toLowerCase()))
        : staffList;

    if (displayStaff.length === 0) {
        el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu nhân viên</div>';
        return;
    }

    // Compute signed/visiting from customer tag cross-reference
    const staffTagCounts = {};
    for (const c of custData) {
        const tags = (c.tags || []).map(t => typeof t === 'string' ? t : t.name || '');
        const tagsStr = tags.join(' ').toLowerCase();
        const isSigned = tagsStr.includes('ký') || tagsStr.includes('kí') || tagsStr.includes('chốt');
        const isVisiting = tagsStr.includes('hẹn đến') || tagsStr.includes('đã đến');
        const isWrong = tagsStr.includes('sai đối tượng');
        for (const tag of tags) {
            const match = Object.values(tagMap).find(t => t.category === 'staff' && t.tag_name.toLowerCase() === tag.toLowerCase());
            if (match) {
                const key = match.display_name.toLowerCase();
                if (!staffTagCounts[key]) staffTagCounts[key] = { signed: 0, visiting: 0, wrong: 0 };
                if (isSigned) staffTagCounts[key].signed++;
                if (isVisiting) staffTagCounts[key].visiting++;
                if (isWrong) staffTagCounts[key].wrong++;
            }
        }
    }

    el.innerHTML = `<table class="data-table"><thead><tr>
        <th>Nhân viên</th>
        <th class="text-right">Hội thoại</th>
        <th class="text-right">Tin nhắn</th>
        <th class="text-right">Inbox</th>
        <th class="text-right">Comment</th>
        <th class="text-right">Khách hàng</th>
        <th class="text-right">Hẹn đến</th>
        <th class="text-right">Có SĐT</th>
        <th class="text-right">Sai ĐT</th>
        <th class="text-right">Đã chốt</th>
        <th class="text-right">Tỷ lệ chốt</th>
    </tr></thead><tbody>${displayStaff.map(s => {
        const name = (s.userName || '').toLowerCase();
        let tc = staffTagCounts[name];
        if (!tc) {
            for (const [key, val] of Object.entries(staffTagCounts)) {
                if (name.includes(key) || key.includes(name)) { tc = val; break; }
            }
        }
        tc = tc || {};
        const staffSigned = tc.signed || s.signed || 0;
        const staffVisiting = tc.visiting || 0;
        const staffWrong = tc.wrong || s.wrongTarget || 0;
        const rate = s.customers > 0 ? (staffSigned / s.customers * 100) : 0;
        return `<tr>
            <td style="font-weight:600">${s.userName || '—'}</td>
            <td class="text-right">${fmtNumber(s.conversations)}</td>
            <td class="text-right">${fmtNumber(s.messages)}</td>
            <td class="text-right">${fmtNumber(s.inbox)}</td>
            <td class="text-right">${fmtNumber(s.comment)}</td>
            <td class="text-right">${fmtNumber(s.customers)}</td>
            <td class="text-right" style="color:var(--purple)">${fmtNumber(staffVisiting)}</td>
            <td class="text-right" style="color:var(--green)">${fmtNumber(s.phone)}</td>
            <td class="text-right" style="color:var(--red)">${fmtNumber(staffWrong)}</td>
            <td class="text-right" style="color:var(--green);font-weight:600">${fmtNumber(staffSigned)}</td>
            <td class="text-right" style="color:${rate > 10 ? 'var(--green)' : 'var(--orange)'}">${fmtPercent(rate)}</td>
        </tr>`;
    }).join('')}
    <tr style="font-weight:700;border-top:2px solid var(--border)">
        <td>Tổng</td>
        <td class="text-right">${fmtNumber(displayStaff.reduce((a,s) => a+s.conversations, 0))}</td>
        <td class="text-right">${fmtNumber(displayStaff.reduce((a,s) => a+s.messages, 0))}</td>
        <td class="text-right">${fmtNumber(displayStaff.reduce((a,s) => a+s.inbox, 0))}</td>
        <td class="text-right">${fmtNumber(displayStaff.reduce((a,s) => a+s.comment, 0))}</td>
        <td class="text-right">${fmtNumber(displayStaff.reduce((a,s) => a+s.customers, 0))}</td>
        <td class="text-right">${fmtNumber(Object.values(staffTagCounts).reduce((a,t) => a+t.visiting, 0))}</td>
        <td class="text-right">${fmtNumber(displayStaff.reduce((a,s) => a+s.phone, 0))}</td>
        <td class="text-right">${fmtNumber(Object.values(staffTagCounts).reduce((a,t) => a+t.wrong, 0))}</td>
        <td class="text-right">${fmtNumber(Object.values(staffTagCounts).reduce((a,t) => a+t.signed, 0))}</td>
        <td class="text-right">—</td>
    </tr>
    </tbody></table>`;
}

// ─── Customer Detail Table ───
function renderCustomerTable(custData, tagMap) {
    const el = document.getElementById('dash-customer-table');
    if (!el) return;

    if (custData.length === 0) {
        el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có khách hàng (thay đổi bộ lọc để xem)</div>';
        return;
    }

    el.innerHTML = `<table class="data-table"><thead><tr>
        <th>Khách hàng</th>
        <th>SĐT</th>
        <th>Tags</th>
        <th class="text-right">Hội thoại</th>
        <th>Hoạt động cuối</th>
    </tr></thead><tbody>${custData.slice(0, 50).map(c => {
        let phone = '';
        if (c.phone) {
            try {
                const parsed = typeof c.phone === 'string' && c.phone.startsWith('{') ? JSON.parse(c.phone) : c.phone;
                phone = typeof parsed === 'object' ? (parsed.captured || parsed.phone_number || '') : parsed;
            } catch { phone = c.phone; }
        }
        if (!phone && c.phone_numbers && c.phone_numbers.length > 0) {
            const pn = c.phone_numbers[0];
            phone = typeof pn === 'object' ? (pn.captured || pn.phone_number || '') : pn;
        }

        const tagHtml = (c.tags || []).slice(0, 4).map(t => {
            const name = typeof t === 'string' ? t : (t.name || '');
            const entry = tagMap[name.toLowerCase()];
            const cls = entry ? `tag-${entry.category}` : '';
            return `<span class="tag ${cls}">${entry?.display_name || name}</span>`;
        }).join(' ');

        return `<tr class="clickable" data-customer-id="${c.pancake_id}" data-customer-name="${c.name || ''}">
            <td style="font-weight:600">${c.name || '—'}</td>
            <td style="font-size:12px">${phone || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap">${tagHtml}</td>
            <td class="text-right">${fmtNumber(c.total_conversations)}</td>
            <td style="font-size:12px;color:var(--text-secondary)">${fmtDate(c.last_active)}</td>
        </tr>`;
    }).join('')}</tbody></table>`;

    // Click handlers → conversation modal
    el.querySelectorAll('tr.clickable').forEach(row => {
        row.addEventListener('click', () => {
            openConversationModal({ pancake_id: row.dataset.customerId, name: row.dataset.customerName });
        });
    });
}
