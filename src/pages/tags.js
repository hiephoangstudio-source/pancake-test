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
        + '<div class="card" style="margin-bottom:12px"><div class="chart-title"><i data-lucide="camera"></i> Dịch vụ (theo tag)</div><div id="service-cross-table" style="margin-top:8px;overflow-x:auto">Đang tải...</div></div>'
        + '<div class="card" style="margin-bottom:12px"><div class="chart-title"><i data-lucide="activity"></i> Trạng thái KH (lifecycle)</div><div id="lifecycle-cross-table" style="margin-top:8px;overflow-x:auto">Đang tải...</div></div>'
        + '<div class="card"><div class="chart-title"><i data-lucide="map-pin"></i> Địa điểm chụp</div><div id="location-cross-table" style="margin-top:8px;overflow-x:auto">Đang tải...</div></div>';
    if (window.lucide) window.lucide.createIcons();

    var load = function() { return fetchTagsReport(tagMap); };
    document.getElementById('tags-time')?.addEventListener('change', load);
    await load();
}

async function fetchTagsReport(tagMap) {
    var preset = document.getElementById('tags-time')?.value || 'this_month';
    var dr = getDateRange(preset);

    try {
        var results = await Promise.all([
            apiGet('/dashboard/branch-summary?from=' + dr.from + '&to=' + dr.to),
            apiGet('/dashboard/tag-cross-branch'),
            apiGet('/dashboard/customer-kpis'),
        ]);
        var branches = results[0];
        var crossData = results[1];
        var customerKpis = results[2];

        var kpiEl = document.getElementById('tags-kpis');
        if (kpiEl) {
            var totalCustomers = 0, totalSigned = 0, totalPhone = 0;
            for (var i = 0; i < branches.length; i++) {
                totalCustomers += branches[i].total_customers;
                totalSigned += branches[i].signed;
                totalPhone += branches[i].has_phone;
            }
            kpiEl.innerHTML = renderKpiGrid([
                renderKpiCard({ label: 'Tổng KH (có tag CN)', value: fmtNumber(totalCustomers), icon: 'users', color: 'var(--blue)' }),
                renderKpiCard({ label: 'Có SĐT', value: fmtNumber(totalPhone), icon: 'phone', color: 'var(--green)' }),
                renderKpiCard({ label: 'Đã chốt (tag)', value: fmtNumber(totalSigned), icon: 'check-circle', color: '#10B981' }),
                renderKpiCard({ label: 'Chốt (DB)', value: fmtNumber(customerKpis.signed || 0), icon: 'target', color: 'var(--purple)' }),
            ]);
            if (window.lucide) window.lucide.createIcons();
        }

        var branchNames = crossData.branches || [];
        renderTransposedTable('service-cross-table', crossData.service || [], branchNames);
        renderTransposedTable('lifecycle-cross-table', crossData.lifecycle || [], branchNames);
        renderTransposedTable('location-cross-table', crossData.location || [], branchNames);
    } catch (err) {
        console.error('Lỗi tải báo cáo tags:', err);
    }
}

/**
 * Render transposed table:
 *   Rows = branches (5 CN + 1 Tổng)
 *   Columns = tag values (e.g. Chụp gia đình, Chụp studio, ...)
 */
function renderTransposedTable(containerId, data, branchNames) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!data || data.length === 0) {
        el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu</div>';
        return;
    }

    // Column headers = tag display names
    var tagNames = [];
    for (var i = 0; i < data.length; i++) tagNames.push(data[i].display_name);

    // Compute totals per column
    var colTotals = [];
    for (var j = 0; j < data.length; j++) {
        var colSum = 0;
        for (var k = 0; k < branchNames.length; k++) colSum += (data[j].branches[branchNames[k]] || 0);
        colTotals.push(colSum);
    }

    var html = '<table class="data-table"><thead><tr>';
    html += '<th style="min-width:120px">Chi nhánh</th>';
    for (var i = 0; i < tagNames.length; i++) html += '<th class="text-right" style="font-size:11px">' + tagNames[i] + '</th>';
    html += '<th class="text-right" style="font-weight:700">Tổng</th>';
    html += '</tr></thead><tbody>';

    // One row per branch
    for (var b = 0; b < branchNames.length; b++) {
        var brName = branchNames[b];
        var rowTotal = 0;
        html += '<tr><td style="font-weight:600">' + brName + '</td>';
        for (var j = 0; j < data.length; j++) {
            var val = data[j].branches[brName] || 0;
            rowTotal += val;
            html += '<td class="text-right">' + fmtNumber(val) + '</td>';
        }
        html += '<td class="text-right" style="font-weight:700;color:var(--blue)">' + fmtNumber(rowTotal) + '</td></tr>';
    }

    // Totals row
    var grandTotal = 0;
    for (var j = 0; j < colTotals.length; j++) grandTotal += colTotals[j];
    html += '<tr style="font-weight:700;border-top:2px solid var(--border)"><td>Tổng</td>';
    for (var j = 0; j < colTotals.length; j++) html += '<td class="text-right">' + fmtNumber(colTotals[j]) + '</td>';
    html += '<td class="text-right" style="color:var(--blue)">' + fmtNumber(grandTotal) + '</td></tr>';
    html += '</tbody></table>';
    el.innerHTML = html;
}
