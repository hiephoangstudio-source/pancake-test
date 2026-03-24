import { apiGet } from '../utils/api.js';
import { fmtNumber, fmtPercent, getDateRange, getPrevRange } from '../utils/format.js';
import { renderKpiCard, renderKpiGrid } from '../components/kpiCard.js';

export function destroy() {}

export async function render(container, { branch, tagMap }) {
    const branchName = branch || 'Chưa chọn';
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = `Chi nhánh ${branchName}`;

    const filtersEl = document.getElementById('header-filters');
    if (filtersEl) {
        filtersEl.innerHTML = `
            <div class="filter-group">
                <i data-lucide="clock"></i>
                <select class="filter-select" id="branch-time">
                    <option value="this_month">Tháng này</option>
                    <option value="today">Hôm nay</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_quarter">Quý này</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>
        `;
    }

    container.innerHTML = `
        <div id="branch-kpis" class="kpi-grid">
            ${Array(6).fill('<div class="kpi-card"><div class="skeleton" style="height:14px;width:60px;margin-bottom:8px"></div><div class="skeleton" style="height:28px;width:80px"></div></div>').join('')}
        </div>
        <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="card">
                <div class="chart-title"><i data-lucide="users-2"></i> Nhân viên chi nhánh</div>
                <div id="branch-staff-list" style="margin-top:8px">
                    <div class="skeleton" style="height:200px"></div>
                </div>
            </div>
            <div class="card">
                <div class="chart-title"><i data-lucide="activity"></i> Phễu chuyển đổi chi nhánh</div>
                <div id="branch-funnel" style="margin-top:8px">
                    <div class="skeleton" style="height:200px"></div>
                </div>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    const load = () => fetchBranchData(branch, tagMap);
    document.getElementById('branch-time')?.addEventListener('change', load);
    await load();
}

async function fetchBranchData(branchTag, tagMap) {
    const preset = document.getElementById('branch-time')?.value || 'this_month';
    const { from, to } = getDateRange(preset);

    try {
        // Fetch customers filtered by branch tag
        const customers = await apiGet(`/dashboard/customers?tag=${encodeURIComponent(branchTag)}&limit=200`);
        const totalCustomers = customers.pagination?.total || 0;

        // Count lifecycle stages from customer tags
        let signed = 0, phoneCount = 0, potential = 0, visiting = 0;
        for (const c of (customers.data || [])) {
            const tags = (c.tags || []).map(t => typeof t === 'string' ? t : t.name || '');
            const tagsStr = tags.join(' ').toLowerCase();
            if (tagsStr.includes('ký') || tagsStr.includes('kí') || tagsStr.includes('chốt')) signed++;
            if (c.phone || (c.phone_numbers && c.phone_numbers.length > 0)) phoneCount++;
            if (tagsStr.includes('tiềm năng')) potential++;
            if (tagsStr.includes('hẹn đến') || tagsStr.includes('đã đến')) visiting++;
        }

        // KPIs
        const kpiEl = document.getElementById('branch-kpis');
        if (kpiEl) {
            const phoneRate = totalCustomers > 0 ? (phoneCount / totalCustomers * 100) : 0;
            const signedRate = totalCustomers > 0 ? (signed / totalCustomers * 100) : 0;
            kpiEl.innerHTML = renderKpiGrid([
                renderKpiCard({ label: 'Tổng khách', value: fmtNumber(totalCustomers), icon: 'users', color: 'var(--blue)' }),
                renderKpiCard({ label: 'Tiềm năng', value: fmtNumber(potential), icon: 'star', color: 'var(--orange)' }),
                renderKpiCard({ label: 'Có SĐT', value: fmtNumber(phoneCount), icon: 'phone', color: 'var(--green)' }),
                renderKpiCard({ label: 'Tỷ lệ SĐT', value: fmtPercent(phoneRate), icon: 'percent', color: 'var(--cyan)' }),
                renderKpiCard({ label: 'Đã chốt', value: fmtNumber(signed), icon: 'check-circle', color: '#10B981' }),
                renderKpiCard({ label: 'Tỷ lệ chốt', value: fmtPercent(signedRate), icon: 'target', color: '#10B981' }),
            ]);
            if (window.lucide) window.lucide.createIcons();
        }

        // Staff list for this branch (from customer tags matching staff category)
        const staffEl = document.getElementById('branch-staff-list');
        if (staffEl) {
            const staffTags = Object.values(tagMap).filter(t => t.category === 'staff');
            const staffCounts = {};
            for (const c of (customers.data || [])) {
                const tags = (c.tags || []).map(t => typeof t === 'string' ? t : t.name || '');
                for (const tag of tags) {
                    const match = staffTags.find(s => s.tag_name.toLowerCase() === tag.toLowerCase());
                    if (match) {
                        if (!staffCounts[match.display_name]) staffCounts[match.display_name] = { count: 0, signed: 0 };
                        staffCounts[match.display_name].count++;
                        const tagsStr = tags.join(' ').toLowerCase();
                        if (tagsStr.includes('ký') || tagsStr.includes('kí')) staffCounts[match.display_name].signed++;
                    }
                }
            }
            const sortedStaff = Object.entries(staffCounts).sort((a, b) => b[1].count - a[1].count);
            if (sortedStaff.length === 0) {
                staffEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu nhân viên cho chi nhánh này</div>';
            } else {
                staffEl.innerHTML = `<table class="data-table"><thead><tr><th>Nhân viên</th><th class="text-right">Khách</th><th class="text-right">Chốt</th></tr></thead><tbody>${sortedStaff.map(([name, data]) => `
                    <tr><td style="font-weight:600">${name}</td><td class="text-right">${fmtNumber(data.count)}</td><td class="text-right" style="color:var(--green)">${fmtNumber(data.signed)}</td></tr>
                `).join('')}</tbody></table>`;
            }
        }

        // Funnel
        const funnelEl = document.getElementById('branch-funnel');
        if (funnelEl) {
            const steps = [
                { label: 'Tổng khách', value: totalCustomers, color: 'var(--blue)' },
                { label: 'Tiềm năng', value: potential, color: 'var(--orange)' },
                { label: 'Hẹn đến', value: visiting, color: '#8B5CF6' },
                { label: 'Có SĐT', value: phoneCount, color: 'var(--cyan)' },
                { label: 'Đã chốt', value: signed, color: 'var(--green)' },
            ];
            const maxVal = Math.max(totalCustomers, 1);
            funnelEl.innerHTML = `<div class="funnel">${steps.map(s => `
                <div class="funnel-step">
                    <div class="funnel-label">${s.label}</div>
                    <div class="funnel-bar-wrapper">
                        <div class="funnel-bar" style="width:${Math.max((s.value / maxVal * 100), 3)}%;background:${s.color}">${fmtNumber(s.value)}</div>
                    </div>
                    <div class="funnel-count">${totalCustomers > 0 ? fmtPercent(s.value / totalCustomers * 100) : ''}</div>
                </div>
            `).join('')}</div>`;
        }
    } catch (err) {
        console.error('Lỗi tải chi nhánh:', err);
    }
}
