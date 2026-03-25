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
            ${Array(14).fill('<div class="kpi-card"><div class="skeleton" style="height:14px;width:60px;margin-bottom:8px"></div><div class="skeleton" style="height:28px;width:80px"></div></div>').join('')}
        </div>
        <div class="chart-grid chart-grid-3" style="margin-top:12px" id="charts-row-1">
            ${Array(3).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join('')}
        </div>
        <div class="chart-grid chart-grid-2" style="margin-top:12px" id="charts-row-2">
            ${Array(2).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join('')}
        </div>
        <div class="chart-grid chart-grid-3" style="margin-top:12px" id="charts-row-3">
            ${Array(3).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join('')}
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

        // Render 8 Charts Layout
        render8Charts(trendData, topCampData, staffData, tagMap, { from, to, preset });

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

        // ─── Fetch Staff Tag Stats directly from Backend ───
        const staffTagStats = await apiGet('/dashboard/staff-tag-stats').catch(() => ({}));

        // ─── Staff Performance Table (from daily_reports + new API stats) ───
        renderStaffTable(staffData, staffTagStats, tagMap, staffFilter);

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
    if (el) el.innerHTML = renderKpiGrid(cards);
    if (window.lucide) window.lucide.createIcons();
}

export async function render8Charts(trendData, topCampData, staffData, tagMap, reqData) {
    if (window.lucide) window.lucide.createIcons();
    
    // Destroy old charts to prevent memory leaks and overlapping renders
    Object.values(charts).forEach(c => c && c.destroy && c.destroy());
    
    // R1
    renderChart1_Conversations(trendData);
    renderChart2_Revenue(trendData);
    
    // R2
    renderChart3_Marketing(trendData);
    renderChart4_WrongTarget(trendData);
    renderChart5_TopCampaigns(topCampData);
    
    // R3
    await renderChart6_StatusByTag(tagMap);
    renderChart7_Branch(staffData, reqData, tagMap);
    renderChart8_Funnel(staffData);
}

function renderChart1_Conversations(data) {
    const row = document.getElementById('charts-row-1');
    if (!row) return;
    if (!row.querySelector('#chart-conversations')) {
        row.innerHTML = `
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="message-circle" class="text-blue-500"></i> Xu hướng hội thoại</div>
                <div style="height:260px"><canvas id="chart-conversations"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="dollar-sign" class="text-green-500"></i> Xu hướng Đơn chốt</div>
                <div style="height:260px"><canvas id="chart-revenue"></canvas></div>
            </div>
        `;
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
            plugins: { legend: { display: false }, datalabels: { display: false } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } } }
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
            plugins: { legend: { display: false }, datalabels: { display: false } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } } }
        }
    });
}

function renderChart3_Marketing(data) {
    const row = document.getElementById('charts-row-2');
    if (!row) return;
    if (!row.querySelector('#chart-marketing')) {
        row.innerHTML = `
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="trending-up" class="text-purple-500"></i> Hiệu suất MKT (Inbox vs Hội thoại Ads)</div>
                <div style="height:260px"><canvas id="chart-marketing"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="alert-triangle" class="text-red-500"></i> Xu hướng Sai đối tượng</div>
                <div style="height:260px"><canvas id="chart-wrong-target"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="award" class="text-orange-500"></i> Top 10 Chiến dịch</div>
                <div style="height:260px"><canvas id="chart-top-campaigns"></canvas></div>
            </div>
        `;
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
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, datalabels: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { type: 'linear', display: true, position: 'left', grid: { color: '#F1F5F9' }, title: { display: true, text: 'Hội thoại Ads', font: { size: 10} } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Inbox', font: { size: 10} }, min: 0 }
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
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, datalabels: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { type: 'linear', display: true, position: 'left', grid: { color: '#F1F5F9' } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, min: 0 }
            }
        }
    });
}

function renderChart5_TopCampaigns(topCampData) {
    const ctx = document.getElementById('chart-top-campaigns')?.getContext('2d');
    if (!ctx || !topCampData || !topCampData.length) return;
    
    const sorted = [...topCampData].sort((a, b) => b.conversations - a.conversations).slice(0, 10);
    
    charts.c5 = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(d => d.name.length > 20 ? d.name.substring(0,20)+'...' : d.name),
            datasets: [{
                label: 'Hội thoại',
                data: sorted.map(d => d.conversations),
                backgroundColor: '#F59E0B',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, datalabels: { display: false }, tooltip: { callbacks: { title: (ctx) => sorted[ctx[0].dataIndex].name } } },
            scales: { x: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
        }
    });
}

async function renderChart6_StatusByTag(tagMap) {
    const row = document.getElementById('charts-row-3');
    if (!row) return;
    if (!row.querySelector('#chart-message-status')) {
        row.innerHTML = `
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="pie-chart" class="text-indigo-500"></i> Phân bố trạng thái KH</div>
                <div style="height:260px"><canvas id="chart-message-status"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="map" class="text-teal-500"></i> So sánh chi nhánh</div>
                <div style="height:260px"><canvas id="chart-branch-comparison"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="filter" class="text-cyan-500"></i> Phễu chuyển đổi</div>
                <div id="funnel-container" style="height:260px;overflow-y:auto;padding:8px 0"></div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }

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

function renderChart8_Funnel(staffData) {
    const funnelEl = document.getElementById('funnel-container');
    if (!funnelEl || !staffData?.totals) return;
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
