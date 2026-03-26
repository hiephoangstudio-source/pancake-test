import { apiGet } from '../utils/api.js';
import { fmtNumber, getDateRange } from '../utils/format.js';
import { renderKpiCard, renderKpiGrid } from '../components/kpiCard.js';

export function destroy() {}

export async function render(container, { tagMap }) {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = 'Báo cáo Tags';

    const filtersEl = document.getElementById('header-filters');
    if (filtersEl) {
        filtersEl.innerHTML = `
            <div class="filter-group"><i data-lucide="clock"></i>
                <select class="filter-select" id="tags-time">
                    <option value="this_month">Tháng này</option>
                    <option value="today">Hôm nay</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_quarter">Quý này</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>`;
    }

    container.innerHTML = `
        <div class="chart-grid chart-grid-2" style="margin-bottom:12px">
            <div class="card">
                <div class="chart-title"><i data-lucide="filter"></i> Phễu Chuyển Đổi KH</div>
                <div id="tag-funnel" style="margin-top:8px">Đang tải...</div>
            </div>
            <div class="card">
                <div class="chart-title"><i data-lucide="pie-chart"></i> Phân Bổ Tags (Top 15)</div>
                <div id="tag-summary-chart" style="margin-top:8px">Đang tải...</div>
            </div>
        </div>
        <div id="tags-kpis" class="kpi-grid" style="margin-bottom:12px"></div>
        <div class="card" style="margin-bottom:12px">
            <div class="chart-title"><i data-lucide="camera"></i> Dịch vụ (theo tag)</div>
            <div id="service-cross-table" style="margin-top:8px;overflow-x:auto">Đang tải...</div>
        </div>
        <div class="card" style="margin-bottom:12px">
            <div class="chart-title"><i data-lucide="activity"></i> Trạng thái KH (lifecycle)</div>
            <div id="lifecycle-cross-table" style="margin-top:8px;overflow-x:auto">Đang tải...</div>
        </div>
        <div class="card">
            <div class="chart-title"><i data-lucide="map-pin"></i> Địa điểm chụp</div>
            <div id="location-cross-table" style="margin-top:8px;overflow-x:auto">Đang tải...</div>
        </div>`;
    if (window.lucide) window.lucide.createIcons();

    const load = () => fetchTagsReport(tagMap);
    document.getElementById('tags-time')?.addEventListener('change', load);
    await load();
}

async function fetchTagsReport(tagMap) {
    const preset = document.getElementById('tags-time')?.value || 'this_month';
    const dr = getDateRange(preset);

    try {
        const [branches, crossData, customerKpis, funnelData, summaryData] = await Promise.all([
            apiGet(`/dashboard/branch-summary?from=${dr.from}&to=${dr.to}`),
            apiGet('/dashboard/tag-cross-branch'),
            apiGet('/dashboard/customer-kpis'),
            apiGet(`/stats/tags/funnel?from=${dr.from}&to=${dr.to}`),
            apiGet(`/stats/tags/summary?from=${dr.from}&to=${dr.to}`),
        ]);

        // KPIs
        const kpiEl = document.getElementById('tags-kpis');
        if (kpiEl) {
            let totalCustomers = 0, totalSigned = 0, totalPhone = 0;
            for (const b of branches) {
                totalCustomers += b.total_customers;
                totalSigned += b.signed;
                totalPhone += b.has_phone;
            }
            kpiEl.innerHTML = renderKpiGrid([
                renderKpiCard({ label: 'Tổng KH (có tag CN)', value: fmtNumber(totalCustomers), icon: 'users', color: 'var(--blue)' }),
                renderKpiCard({ label: 'Có SĐT', value: fmtNumber(totalPhone), icon: 'phone', color: 'var(--green)' }),
                renderKpiCard({ label: 'Đã chốt (tag)', value: fmtNumber(totalSigned), icon: 'check-circle', color: '#10B981' }),
                renderKpiCard({ label: 'Chốt (DB)', value: fmtNumber(customerKpis.signed || 0), icon: 'target', color: 'var(--purple)' }),
            ]);
            if (window.lucide) window.lucide.createIcons();
        }

        // Tag Funnel
        renderFunnel('tag-funnel', funnelData);

        // Tag Summary
        renderTagSummary('tag-summary-chart', summaryData);

        // Cross-branch tables
        const branchNames = crossData.branches || [];
        renderTransposedTable('service-cross-table', crossData.service || [], branchNames);
        renderTransposedTable('lifecycle-cross-table', crossData.lifecycle || [], branchNames);
        renderTransposedTable('location-cross-table', crossData.location || [], branchNames);
    } catch (err) {
        console.error('Lỗi tải báo cáo tags:', err);
    }
}

function renderFunnel(containerId, funnelData) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!funnelData?.stages?.length) {
        el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu funnel</div>';
        return;
    }

    const maxCount = Math.max(...funnelData.stages.map(s => s.count));

    el.innerHTML = `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
            Tổng: <strong style="color:var(--text-primary)">${fmtNumber(funnelData.total)}</strong> hội thoại
        </div>
        <div class="funnel">
            ${funnelData.stages.map(s => {
                const pct = maxCount > 0 ? Math.max(8, (s.count / maxCount) * 100) : 0;
                const color = s.color || 'var(--blue)';
                return `
                    <div class="funnel-step">
                        <div class="funnel-label">${s.display_name || s.tag_name}</div>
                        <div class="funnel-bar-wrapper">
                            <div class="funnel-bar" style="width:${pct}%;background:${color}">
                                ${s.count}
                            </div>
                        </div>
                        <div class="funnel-count" style="color:${color}">${s.percentage}%</div>
                    </div>`;
            }).join('')}
        </div>`;
}

function renderTagSummary(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!data?.length) {
        el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu</div>';
        return;
    }

    const top = data.slice(0, 15);
    const maxCount = Math.max(...top.map(t => parseInt(t.count)));

    const categoryColors = {
        lifecycle: 'var(--green)',
        staff: 'var(--orange)',
        service: 'var(--purple)',
        branch: 'var(--blue)',
        location: 'var(--cyan)',
    };

    el.innerHTML = `
        <div class="tag-bar-chart">
            ${top.map(t => {
                const count = parseInt(t.count);
                const pct = maxCount > 0 ? Math.max(5, (count / maxCount) * 100) : 0;
                const color = t.color || categoryColors[t.category] || 'var(--blue)';
                const catLabel = t.category ? `<span class="tag tag-${t.category}" style="font-size:9px;margin-left:4px">${t.category}</span>` : '';
                return `
                    <div class="tag-bar-row">
                        <div class="tag-bar-label" title="${t.tag_name}">${t.display_name || t.tag_name}${catLabel}</div>
                        <div class="tag-bar-track">
                            <div class="tag-bar-fill" style="width:${pct}%;background:${color}">${count}</div>
                        </div>
                    </div>`;
            }).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center">
            Hiển thị ${top.length} / ${data.length} tags
        </div>`;
}

function renderTransposedTable(containerId, data, branchNames) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!data || data.length === 0) {
        el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu</div>';
        return;
    }

    const tagNames = data.map(d => d.display_name);
    const colTotals = data.map(d => {
        let sum = 0;
        for (const b of branchNames) sum += (d.branches[b] || 0);
        return sum;
    });

    let html = '<table class="data-table"><thead><tr>';
    html += '<th style="min-width:120px">Chi nhánh</th>';
    for (const name of tagNames) html += `<th class="text-right" style="font-size:11px">${name}</th>`;
    html += '<th class="text-right" style="font-weight:700">Tổng</th></tr></thead><tbody>';

    for (const brName of branchNames) {
        let rowTotal = 0;
        html += `<tr><td style="font-weight:600">${brName}</td>`;
        for (const d of data) {
            const val = d.branches[brName] || 0;
            rowTotal += val;
            html += `<td class="text-right">${fmtNumber(val)}</td>`;
        }
        html += `<td class="text-right" style="font-weight:700;color:var(--blue)">${fmtNumber(rowTotal)}</td></tr>`;
    }

    const grandTotal = colTotals.reduce((a, b) => a + b, 0);
    html += '<tr style="font-weight:700;border-top:2px solid var(--border)"><td>Tổng</td>';
    for (const ct of colTotals) html += `<td class="text-right">${fmtNumber(ct)}</td>`;
    html += `<td class="text-right" style="color:var(--blue)">${fmtNumber(grandTotal)}</td></tr>`;
    html += '</tbody></table>';
    el.innerHTML = html;
}
