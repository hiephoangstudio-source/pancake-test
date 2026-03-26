import { apiGet } from '../utils/api.js';
import { fmtNumber, fmtMoney, fmtPercent, fmtDate, fmtTick, getDateRange, getPrevRange, calcDelta } from '../utils/format.js';
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
    container.innerHTML = ''
        + '<div class="kpi-grid" id="kpi-container" style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px">'
        + Array(14).fill('<div class="kpi-card"><div class="skeleton" style="height:14px;width:60px;margin-bottom:8px"></div><div class="skeleton" style="height:28px;width:80px"></div></div>').join('')
        + '</div>'
        + '<div class="chart-grid chart-grid-3" style="margin-top:12px" id="charts-row-1">'
        + Array(3).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join('')
        + '</div>'
        + '<div class="chart-grid chart-grid-3" style="margin-top:12px" id="charts-row-2">'
        + Array(3).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join('')
        + '</div>'
        + '<div class="chart-grid chart-grid-3" style="margin-top:12px" id="charts-row-3">'
        + Array(3).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join('')
        + '</div>'
        + '<div class="card" style="margin-top:16px">'
        + '<div class="chart-title"><i data-lucide="users-2"></i> Chi tiết nhân viên</div>'
        + '<div id="dash-staff-table" style="margin-top:8px;overflow-x:auto"><div class="skeleton" style="height:200px"></div></div>'
        + '</div>'
        + '<div class="card" style="margin-top:16px">'
        + '<div class="chart-title" style="display:flex;justify-content:space-between;align-items:center">'
        + '<span><i data-lucide="contact-2"></i> Chi tiết khách hàng</span>'
        + '<span id="dash-cust-info" style="font-size:12px;color:var(--text-muted)"></span></div>'
        + '<div id="dash-customer-table" style="margin-top:8px;overflow-x:auto"><div class="skeleton" style="height:200px"></div></div>'
        + '<div id="dash-cust-pagination" style="display:flex;gap:8px;justify-content:center;align-items:center;margin-top:12px"></div>'
        + '</div>';
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

        // Fetch trend (now includes signed, wrongTarget, spend)
        let trendUrl = `/dashboard/trend?from=${from}&to=${to}`;
        if (pageId) trendUrl += `&pageId=${pageId}`;
        const trendData = await apiGet(trendUrl);

        // Fetch top-campaigns
        let topCampUrl = `/dashboard/top-campaigns?from=${from}&to=${to}`;
        if (pageId) topCampUrl += `&pageId=${pageId}`;
        const topCampData = await apiGet(topCampUrl);

        // Fetch staff
        let staffUrl = `/dashboard/staff?from=${from}&to=${to}`;
        if (pageId) staffUrl += `&pageId=${pageId}`;
        const staffData = await apiGet(staffUrl);

        // Fetch channels data for Phễu QC + Page Spend
        let chUrl = '/channels?from=' + from + '&to=' + to;
        if (pageId) chUrl += '&pageId=' + pageId;
        const chData = await apiGet(chUrl).catch(() => []);
        const channels = Array.isArray(chData) ? chData : (chData.data || []);

        // Render 9 Charts (3×3)
        render8Charts(trendData, topCampData, staffData, tagMap, { from, to, preset }, channels);

        // ─── Fetch customers with tag filters (paginated) ───
        const tagFilters = [branchFilter, staffFilter, statusFilter, serviceFilter].filter(Boolean);
        const custPage = window._dashCustPage || 1;
        let custUrl = `/dashboard/customers?limit=25&page=${custPage}`;
        if (tagFilters.length > 0) custUrl += `&tag=${encodeURIComponent(tagFilters.join(','))}`;

        const customers = await apiGet(custUrl);
        const custData = customers.data || [];

        let staffTagUrl = `/dashboard/staff-tag-stats?from=${from}&to=${to}`;
        if (pageId) staffTagUrl += `&pageId=${pageId}`;
        const staffTagStats = await apiGet(staffTagUrl).catch(() => ({}));

        // ─── Staff Performance Table (from daily_reports + new API stats) ───
        renderStaffTable(staffData, staffTagStats, tagMap, staffFilter);

        // ─── Customer Detail Table (paginated) ───
        renderCustomerTable(custData, tagMap, customers.pagination, container);

    } catch (err) {
        console.error('Lỗi tải dashboard:', err);
    }
}

function renderKpis(data) {
    const c = data.current;
    const p = data.prev;
    const phoneRate = c.conversations > 0 ? (c.phone / c.conversations * 100) : 0;
    const signedRate = c.conversations > 0 ? (c.signed / c.conversations * 100) : 0;
    const costPerInbox = c.inbox > 0 ? (c.spend / c.inbox) : 0;

    const cards = [
        renderKpiCard({ label: 'HỘI THOẠI', value: fmtNumber(c.conversations), icon: 'message-circle', color: 'var(--blue)', delta: p ? calcDelta(c.conversations, p.conversations) : null }),
        renderKpiCard({ label: 'KHÁCH HÀNG', value: fmtNumber(c.customers), icon: 'users', color: 'var(--green)', delta: p ? calcDelta(c.customers, p.customers) : null }),
        renderKpiCard({ label: 'SỐ LƯỢNG SĐT', value: fmtNumber(c.phone), icon: 'phone', color: 'var(--orange)', delta: p ? calcDelta(c.phone, p.phone) : null }),
        renderKpiCard({ label: 'Tỷ lệ SĐT', value: fmtPercent(phoneRate), icon: 'percent', color: 'var(--cyan)', delta: p && p.conversations > 0 ? calcDelta(phoneRate, p.phone / p.conversations * 100) : null }),
        renderKpiCard({ label: 'Đã chốt', value: fmtNumber(c.signed), icon: 'check-circle', color: 'var(--green)', delta: p ? calcDelta(c.signed, p.signed) : null }),
        renderKpiCard({ label: 'Tỷ lệ chốt', value: fmtPercent(signedRate), icon: 'target', color: '#10B981', delta: null }),
        renderKpiCard({ label: 'Ký online', value: fmtNumber(c.kyOnline || 0), icon: 'wifi', color: '#6366F1', delta: p ? calcDelta(c.kyOnline || 0, p.kyOnline || 0) : null }),
        renderKpiCard({ label: 'Ký offline', value: fmtNumber(c.kyOffline || 0), icon: 'store', color: '#8B5CF6', delta: p ? calcDelta(c.kyOffline || 0, p.kyOffline || 0) : null }),
        renderKpiCard({ label: 'Hẹn đến', value: fmtNumber(c.henDen || 0), icon: 'calendar', color: '#F59E0B', delta: p ? calcDelta(c.henDen || 0, p.henDen || 0) : null }),
        renderKpiCard({ label: 'Mất', value: fmtNumber(c.lost || 0), icon: 'user-x', color: '#EF4444', delta: p ? calcDelta(c.lost || 0, p.lost || 0) : null }),
        renderKpiCard({ label: 'Chi phí MKT', value: fmtMoney(c.spend || 0), icon: 'wallet', color: 'var(--blue)', delta: null }),
        renderKpiCard({ label: 'Chi phí / Inbox', value: fmtMoney(costPerInbox), icon: 'coins', color: '#D946EF', delta: null }),
        renderKpiCard({ label: 'Đang chạy', value: fmtNumber(c.adsRunning || 0), icon: 'play-circle', color: '#10B981', delta: null }),
        renderKpiCard({ label: 'Tạm dừng', value: fmtNumber(c.adsPaused || 0), icon: 'pause-circle', color: '#94A3B8', delta: null }),
    ];

    const el = document.getElementById('kpi-container');
    if (el) el.innerHTML = cards.join('');
    if (window.lucide) window.lucide.createIcons();
}

export async function render8Charts(trendData, topCampData, staffData, tagMap, reqData, channels) {
    if (window.lucide) window.lucide.createIcons();

    // Tooltip styling only
    if (!Chart._2hSetup) {
        Chart._2hSetup = true;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15,23,42,0.95)';
        Chart.defaults.plugins.tooltip.titleColor = '#F8FAFC';
        Chart.defaults.plugins.tooltip.bodyColor = '#E2E8F0';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(148,163,184,0.2)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
    }

    // Destroy old charts
    Object.values(charts).forEach(c => c && c.destroy && c.destroy());

    // Row 1: Conversations, Revenue, Branch Comparison
    renderChart1_Conversations(trendData);
    renderChart2_Revenue(trendData);
    await renderChart7_Branch(staffData, reqData, tagMap);

    // Row 2: MKT, WrongTarget, StatusPie
    renderChart3_Marketing(trendData);
    renderChart4_WrongTarget(trendData);
    await renderChart6_StatusByTag(tagMap);

    // Row 3: Top10, Ads Funnel, Page Spend
    renderChart5_TopCampaigns(topCampData);
    renderCustomersPerPage(reqData);
    renderPageSpend(channels || []);
}

function renderChart1_Conversations(data) {
    const row = document.getElementById('charts-row-1');
    if (!row) return;
    if (!row.querySelector('#chart-conversations')) {
        row.innerHTML = ''
            + '<div class="chart-card"><div class="chart-title"><i data-lucide="message-circle"></i> Xu hướng hội thoại</div><div style="height:260px"><canvas id="chart-conversations"></canvas></div></div>'
            + '<div class="chart-card"><div class="chart-title"><i data-lucide="dollar-sign"></i> Xu hướng Đơn chốt</div><div style="height:260px"><canvas id="chart-revenue"></canvas></div></div>'
            + '<div class="chart-card"><div class="chart-title"><i data-lucide="map"></i> So sánh chi nhánh</div><div style="height:260px"><canvas id="chart-branch-comparison"></canvas></div></div>';
        if (window.lucide) window.lucide.createIcons();
    }
    
    const ctx = document.getElementById('chart-conversations')?.getContext('2d');
    if (!ctx || !data || !data.length) return;
    
    charts.c1 = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Hội thoại',
                data: data.map(d => d.conversations),
                backgroundColor: '#3B82F6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'end', font: { size: 9, weight: '600' }, color: '#334155', formatter: v => v > 0 ? fmtTick(v) : '' } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { font: { size: 10 }, callback: fmtTick } } }
        }
    });
}

function renderChart2_Revenue(data) {
    const ctx = document.getElementById('chart-revenue')?.getContext('2d');
    if (!ctx || !data || !data.length) return;
    
    charts.c2 = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Đơn chốt',
                data: data.map(d => d.signed),
                backgroundColor: '#10B981',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'end', font: { size: 9, weight: '600' }, color: '#334155', formatter: v => v > 0 ? fmtTick(v) : '' } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { font: { size: 10 }, callback: fmtTick } } }
        }
    });
}

function renderChart3_Marketing(data) {
    const row = document.getElementById('charts-row-2');
    if (!row) return;
    if (!row.querySelector('#chart-marketing')) {
        row.innerHTML = ''
            + '<div class="chart-card"><div class="chart-title"><i data-lucide="trending-up"></i> Hiệu suất MKT (Inbox vs Chi phí Ads)</div><div style="height:260px"><canvas id="chart-marketing"></canvas></div></div>'
            + '<div class="chart-card"><div class="chart-title"><i data-lucide="alert-triangle"></i> Xu hướng Sai đối tượng</div><div style="height:260px"><canvas id="chart-wrong-target"></canvas></div></div>'
            + '<div class="chart-card"><div class="chart-title"><i data-lucide="pie-chart"></i> Phân bố trạng thái KH</div><div style="height:260px"><canvas id="chart-message-status"></canvas></div></div>';
        if (window.lucide) window.lucide.createIcons();
    }
    
    const ctx = document.getElementById('chart-marketing')?.getContext('2d');
    if (!ctx || !data || !data.length) return;
    
    charts.c3 = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [
                {
                    type: 'line',
                    label: 'Inbox',
                    data: data.map(d => d.messages),
                    borderColor: '#8B5CF6',
                    backgroundColor: '#8B5CF6',
                    yAxisID: 'y1',
                    tension: 0.4
                },
                {
                    type: 'bar',
                    label: 'Hội thoại Ads',
                    data: data.map(d => d.spend),
                    backgroundColor: 'rgba(59,130,246,0.3)',
                    yAxisID: 'y',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, datalabels: { anchor: 'end', align: 'end', font: { size: 8, weight: '600' }, color: '#334155', formatter: v => v > 0 ? fmtTick(v) : '' } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(148,163,184,0.08)' }, title: { display: true, text: 'Chi phí Ads', font: { size: 10} }, ticks: { callback: fmtTick } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Inbox', font: { size: 10} }, min: 0, ticks: { callback: fmtTick } }
            }
        }
    });
}

function renderChart4_WrongTarget(data) {
    const ctx = document.getElementById('chart-wrong-target')?.getContext('2d');
    if (!ctx || !data || !data.length) return;
    
    charts.c4 = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [
                {
                    type: 'line',
                    label: 'Tỷ lệ Sai ĐT',
                    data: data.map(d => d.conversations ? (d.wrongTarget / d.conversations)*100 : 0),
                    borderColor: '#EF4444',
                    backgroundColor: '#EF4444',
                    yAxisID: 'y1',
                    tension: 0.4
                },
                {
                    type: 'bar',
                    label: 'Sai ĐT',
                    data: data.map(d => d.wrongTarget),
                    backgroundColor: 'rgba(239,68,68,0.3)',
                    yAxisID: 'y',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, datalabels: { anchor: 'end', align: 'end', font: { size: 8, weight: '600' }, color: '#334155', formatter: v => v > 0 ? fmtTick(v) : '' } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { callback: fmtTick } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, min: 0 }
            }
        }
    });
}

function renderChart5_TopCampaigns(topCampData) {
    const row = document.getElementById('charts-row-3');
    if (!row) return;
    if (!row.querySelector('#chart-top-campaigns')) {
        row.innerHTML = ''
            + '<div class="chart-card"><div class="chart-title"><i data-lucide="award"></i> Top 10 Chiến dịch</div><div style="height:260px"><canvas id="chart-top-campaigns"></canvas></div></div>'
            + '<div class="chart-card"><div class="chart-title"><i data-lucide="users"></i> SỐ LƯỢNG KHÁCH HÀNG theo trang</div><div style="height:260px"><canvas id="chart-customers-per-page"></canvas></div></div>'
            + '<div class="chart-card"><div class="chart-title"><i data-lucide="bar-chart-3"></i> So sánh Pages (chi phí)</div><div style="height:260px"><canvas id="page-spend-chart"></canvas></div></div>';
        if (window.lucide) window.lucide.createIcons();
    }

    const ctx = document.getElementById('chart-top-campaigns')?.getContext('2d');
    if (!ctx || !topCampData || !topCampData.length) return;
    
    const sorted = [...topCampData].sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 10);
    if (sorted.length === 0) return;
    
    charts.c5 = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(d => d.name.length > 25 ? d.name.substring(0,25)+'...' : d.name),
            datasets: [{
                label: 'Chi phí',
                data: sorted.map(d => d.spend || 0),
                backgroundColor: '#F59E0B',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, datalabels: { display: false }, tooltip: { callbacks: { title: (ctx) => sorted[ctx[0].dataIndex].name } } },
            scales: {
                x: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { font: { size: 10 }, callback: fmtTick } },
                y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#1E293B' } }
            }
        }
    });
}

async function renderChart6_StatusByTag(tagMap) {
    const pieCtx = document.getElementById('chart-message-status')?.getContext('2d');
    if (!pieCtx) return;

    try {
        const tagCounts = await apiGet('/dashboard/tag-counts');
        const lifecycleTags = Object.values(tagMap).filter(t => t.category === 'lifecycle');
        const labels = [];
        const data = [];
        const colors = [];
        for (const t of lifecycleTags) {
            const count = tagCounts[t.tag_name.toLowerCase()] || 0;
            if (count > 0) {
                labels.push(t.display_name);
                data.push(count);
                colors.push(t.color || '#94A3B8');
            }
        }
        if (data.length > 0) {
            charts.c6 = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{ data, backgroundColor: colors, borderWidth: 0, cutout: '55%' }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, usePointStyle: true } }, datalabels: { display: false } },
                },
            });
        }
    } catch (err) {
        console.error('Chart6 tag status error:', err);
    }
}

async function renderChart7_Branch(staffData, reqData, tagMap) {
    const ctx = document.getElementById('chart-branch-comparison')?.getContext('2d');
    if (!ctx) return;
    
    try {
        const branches = await apiGet(`/dashboard/branch-summary?from=${reqData.from}&to=${reqData.to}`);
        if (branches.length) {
            charts.c7 = new Chart(ctx, {
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
}

// ─── Customers per Page Chart (from daily_reports) ───
function renderCustomersPerPage(reqData) {
    var ctx = document.getElementById('chart-customers-per-page')?.getContext('2d');
    if (!ctx) return;
    
    apiGet(`/dashboard/customers-per-page?from=${reqData.from}&to=${reqData.to}`)
        .then(data => {
            if (!data || !data.length) return;
            const colors = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#6366F1','#14B8A6','#F97316','#84CC16'];
            charts.cCustomersPage = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.name),
                    datasets: [{ label: 'Khách hàng', data: data.map(d => d.customers), backgroundColor: colors, borderRadius: 4 }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'end', font: { size: 9, weight: '600' }, color: '#1E293B', formatter: v => v > 0 ? fmtTick(v) : '' } },
                    scales: {
                        x: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { font: { size: 10 }, callback: fmtTick } },
                        y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#1E293B' } }
                    }
                }
            });
        })
        .catch(err => console.error('Customers per page error:', err));
}

// ─── Page Spend Chart (from channels data) ───
function renderPageSpend(channels) {
    var ctx = document.getElementById('page-spend-chart')?.getContext('2d');
    if (!ctx) return;
    // Agg spend by page
    var pageMap = {};
    for (var i = 0; i < channels.length; i++) {
        var pn = channels[i].pageName || channels[i].page_id || 'Unknown';
        pageMap[pn] = (pageMap[pn] || 0) + Number(channels[i].spend || 0);
    }
    var entries = Object.entries(pageMap).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return;
    charts.cPageSpend = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: entries.map(e => e[0]),
            datasets: [{ label: 'Chi phí', data: entries.map(e => e[1]), backgroundColor: ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#6366F1','#14B8A6','#F97316','#84CC16'], borderRadius: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, datalabels: { display: false } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { font: { size: 10 }, callback: fmtTick } } }
        }
    });
}

// ─── Staff Performance Table ───
function renderStaffTable(staffData, staffTagCounts, tagMap, staffFilter) {
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
        <th class="text-right">Tỷ lệ SĐT</th>
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
            <td class="text-right" style="color:${s.conversations > 0 ? ((s.phone / s.conversations * 100) > 5 ? 'var(--green)' : 'var(--orange)') : 'var(--text-muted)'}">${s.conversations > 0 ? fmtPercent(s.phone / s.conversations * 100) : '—'}</td>
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
        <td class="text-right">—</td>
        <td class="text-right">${fmtNumber(Object.values(staffTagCounts).reduce((a,t) => a+t.signed, 0))}</td>
        <td class="text-right">—</td>
    </tr>
    </tbody></table>`;
}

// ─── Customer Detail Table with Pagination ───
function renderCustomerTable(custData, tagMap, pagination, container) {
    const el = document.getElementById('dash-customer-table');
    if (!el) return;

    const infoEl = document.getElementById('dash-cust-info');
    const pgn = pagination || {};
    if (infoEl && pgn.total) {
        infoEl.textContent = fmtNumber(pgn.total) + ' khách';
    }

    if (!custData || custData.length === 0) {
        el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có khách hàng (thay đổi bộ lọc để xem)</div>';
        return;
    }

    let html = '<table class="data-table"><thead><tr>';
    html += '<th>Khách hàng</th><th>Nguồn</th><th>SĐT</th><th>Tags</th><th class="text-right">Hội thoại</th><th>Hoạt động cuối</th>';
    html += '</tr></thead><tbody>';
    for (const c of custData) {
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
        let tagHtml = '';
        const tags = (c.tags || []).slice(0, 4);
        for (const t of tags) {
            const name = typeof t === 'string' ? t : (t.name || '');
            const entry = tagMap[name.toLowerCase()];
            const cls = entry ? 'tag-' + entry.category : '';
            tagHtml += '<span class="tag ' + cls + '">' + (entry ? entry.display_name : name) + '</span> ';
        }
        html += '<tr class="clickable" data-customer-id="' + c.pancake_id + '" data-customer-name="' + (c.name || '') + '">';
        html += '<td style="font-weight:600">' + (c.name || '—') + '</td>';
        html += '<td style="font-size:11px;color:var(--text-secondary)">' + (c.page_name || c.source || '—') + '</td>';
        html += '<td style="font-size:12px">' + (phone || '<span style="color:var(--text-muted)">—</span>') + '</td>';
        html += '<td style="display:flex;gap:4px;flex-wrap:wrap">' + tagHtml + '</td>';
        html += '<td class="text-right">' + fmtNumber(c.total_conversations) + '</td>';
        html += '<td style="font-size:12px;color:var(--text-secondary)">' + fmtDate(c.last_active) + '</td>';
        html += '</tr>';
    }
    html += '</tbody></table>';
    el.innerHTML = html;

    // Click handlers → conversation modal
    el.querySelectorAll('tr.clickable').forEach(row => {
        row.addEventListener('click', () => {
            openConversationModal({ pancake_id: row.dataset.customerId, name: row.dataset.customerName });
        });
    });

    // Pagination
    const pgnEl = document.getElementById('dash-cust-pagination');
    if (pgnEl && pgn.totalPages > 1) {
        const curPage = pgn.page || 1;
        const totalPages = pgn.totalPages || 1;
        let pgnHtml = '';
        pgnHtml += '<button class="btn btn-sm" id="cust-prev" ' + (curPage <= 1 ? 'disabled' : '') + '>← Trước</button>';
        pgnHtml += '<span style="font-size:12px;color:var(--text-secondary)">Trang ' + curPage + '/' + totalPages + ' (' + fmtNumber(pgn.total) + ' khách)</span>';
        pgnHtml += '<button class="btn btn-sm" id="cust-next" ' + (curPage >= totalPages ? 'disabled' : '') + '>Sau →</button>';
        pgnEl.innerHTML = pgnHtml;
        document.getElementById('cust-prev')?.addEventListener('click', () => {
            window._dashCustPage = Math.max(1, curPage - 1);
            fetchAndRender(container, tagMap);
        });
        document.getElementById('cust-next')?.addEventListener('click', () => {
            window._dashCustPage = Math.min(totalPages, curPage + 1);
            fetchAndRender(container, tagMap);
        });
    } else if (pgnEl) {
        pgnEl.innerHTML = '';
    }
}
