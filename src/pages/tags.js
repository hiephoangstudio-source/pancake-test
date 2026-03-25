import { apiGet } from '../utils/api.js';
import { fmtNumber, getDateRange } from '../utils/format.js';
import { renderKpiCard, renderKpiGrid } from '../components/kpiCard.js';

export function destroy() {}

export async function render(container, { tagMap }) {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = 'Báo cáo Tags';

    const filtersEl = document.getElementById('header-filters');
    if (filtersEl) {
        filtersEl.innerHTML = '<div class="filter-group"><i data-lucide="clock"></i><select class="filter-select" id="tags-time"><option value="this_month">Tháng này</option><option value="today">Hôm nay</option><option value="this_week">Tuần này</option><option value="last_month">Tháng trước</option><option value="this_quarter">Quý này</option><option value="this_year">Năm nay</option><option value="all_time">Tất cả</option></select></div>';
    }

    container.innerHTML = '<div id="tags-kpis" class="kpi-grid" style="margin-bottom:12px"></div>'
        + '<div class="card" style="margin-bottom:12px"><div class="chart-title"><i data-lucide="camera"></i> Dịch vụ (theo tag) × Chi nhánh</div><div id="service-cross-table" style="margin-top:8px;overflow-x:auto">Đang tải...</div></div>'
        + '<div class="card" style="margin-bottom:12px"><div class="chart-title"><i data-lucide="activity"></i> Trạng thái KH (lifecycle) × Chi nhánh</div><div id="lifecycle-cross-table" style="margin-top:8px;overflow-x:auto">Đang tải...</div></div>'
        + '<div class="card"><div class="chart-title"><i data-lucide="map-pin"></i> Địa điểm chụp × Chi nhánh</div><div id="location-cross-table" style="margin-top:8px;overflow-x:auto">Đang tải...</div></div>';
    if (window.lucide) window.lucide.createIcons();

    const load = () => fetchTagsReport(tagMap);
    document.getElementById('tags-time')?.addEventListener('change', load);
    await load();
}

async function fetchTagsReport(tagMap) {
    const preset = document.getElementById('tags-time')?.value || 'this_month';
    const { from, to } = getDateRange(preset);

    try {
        const [branches, crossData, customerKpis] = await Promise.all([
            apiGet('/dashboard/branch-summary?from=' + from + '&to=' + to),
            apiGet('/dashboard/tag-cross-branch'),
            apiGet('/dashboard/customer-kpis'),
        ]);

        const kpiEl = document.getElementById('tags-kpis');
        if (kpiEl) {
            const totalCustomers = branches.reduce((s, b) => s + b.total_customers, 0);
            const totalSigned = branches.reduce((s, b) => s + b.signed, 0);
            const totalPhone = branches.reduce((s, b) => s + b.has_phone, 0);
            kpiEl.innerHTML = renderKpiGrid([
                renderKpiCard({ label: 'Tổng KH (có tag CN)', value: fmtNumber(totalCustomers), icon: 'users', color: 'var(--blue)' }),
                renderKpiCard({ label: 'Có SĐT', value: fmtNumber(totalPhone), icon: 'phone', color: 'var(--green)' }),
                renderKpiCard({ label: 'Đã chốt (tag)', value: fmtNumber(totalSigned), icon: 'check-circle', color: '#10B981' }),
                renderKpiCard({ label: 'Chốt (DB)', value: fmtNumber(customerKpis.signed || 0), icon: 'target', color: 'var(--purple)' }),
            ]);
            if (window.lucide) window.lucide.createIcons();
        }

        const branchNames = crossData.branches || [];
        renderCrossBranchTable('service-cross-table', crossData.service || [], branchNames, 'Dịch vụ');
        renderCrossBranchTable('lifecycle-cross-table', crossData.lifecycle || [], branchNames, 'Trạng thái');
        renderCrossBranchTable('location-cross-table', crossData.location || [], branchNames, 'Địa điểm');
    } catch (err) {
        console.error('Lỗi tải báo cáo tags:', err);
    }
}

function renderCrossBranchTable(containerId, data, branchNames, firstColLabel) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!data || data.length === 0) {
        el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu</div>';
        return;
    }
    const branchTotals = {};
    for (const br of branchNames) branchTotals[br] = 0;
    let grandTotal = 0;

    for (const row of data) {
        grandTotal += row.total;
        for (const br of branchNames) {
            branchTotals[br] += (row.branches[br] || 0);
        }
    }

    let html = '<table class="data-table"><thead><tr>';
    html += '<th>' + firstColLabel + '</th>';
    for (const b of branchNames) html += '<th class="text-right">' + b + '</th>';
    html += '<th class="text-right" style="font-weight:700">Tổng</th>';
    html += '</tr></thead><tbody>';

    for (const row of data) {
        html += '<tr><td style="font-weight:600">' + row.display_name + '</td>';
        for (const b of branchNames) html += '<td class="text-right">' + fmtNumber(row.branches[b] || 0) + '</td>';
        html += '<td class="text-right" style="font-weight:700;color:var(--blue)">' + fmtNumber(row.total) + '</td></tr>';
    }

    html += '<tr style="font-weight:700;border-top:2px solid var(--border)"><td>Tổng</td>';
    for (const b of branchNames) html += '<td class="text-right">' + fmtNumber(branchTotals[b]) + '</td>';
    html += '<td class="text-right" style="color:var(--blue)">' + fmtNumber(grandTotal) + '</td></tr>';
    html += '</tbody></table>';
    el.innerHTML = html;
}
