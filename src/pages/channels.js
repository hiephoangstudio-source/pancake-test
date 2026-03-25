import { apiGet } from '../utils/api.js';
import { fmtNumber, fmtMoney, fmtPercent, getDateRange } from '../utils/format.js';
import { renderKpiCard, renderKpiGrid } from '../components/kpiCard.js';

let charts = {};
let currentPage = 1;
const PAGE_SIZE = 25;

export function destroy() { Object.values(charts).forEach(c => c.destroy()); charts = {}; }

export async function render(container, { tagMap }) {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = 'Hiệu quả kênh quảng cáo';

    const filtersEl = document.getElementById('header-filters');
    if (filtersEl) {
        filtersEl.innerHTML = `
            <div class="filter-group">
                <i data-lucide="clock"></i>
                <select class="filter-select" id="ch-time">
                    <option value="this_month">Tháng này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_quarter">Quý này</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="file-text"></i>
                <select class="filter-select" id="ch-page">
                    <option value="">Tất cả trang</option>
                </select>
            </div>
        `;
    }

    container.innerHTML = `
        <div id="ch-kpis" class="kpi-grid" style="margin-bottom:12px"></div>
        <div class="card">
            <div class="chart-title"><i data-lucide="list"></i> Danh sách chiến dịch QC</div>
            <table class="data-table" id="campaigns-table">
                <thead>
                    <tr>
                        <th>Tên chiến dịch</th>
                        <th>Trang</th>
                        <th class="text-right">Chi phí</th>
                        <th class="text-right">Hiển thị</th>
                        <th class="text-right">Click</th>
                        <th class="text-right">Hội thoại</th>
                        <th class="text-right">SĐT</th>
                        <th class="text-right">Chi phí/SĐT</th>
                        <th class="text-center">Trạng thái</th>
                    </tr>
                </thead>
                <tbody id="campaigns-body">
                    <tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">Đang tải...</td></tr>
                </tbody>
            </table>
            <div id="ch-pagination" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid var(--border);font-size:13px"></div>
        </div>
    `;

    // Load pages dropdown
    try {
        const pages = await apiGet('/pages');
        const sel = document.getElementById('ch-page');
        pages.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.page_id;
            opt.textContent = p.name;
            sel?.appendChild(opt);
        });
    } catch {}

    if (window.lucide) window.lucide.createIcons();

    const load = () => { currentPage = 1; fetchChannels(); };
    document.getElementById('ch-time')?.addEventListener('change', load);
    document.getElementById('ch-page')?.addEventListener('change', load);
    await fetchChannels();
}

async function fetchChannels() {
    const preset = document.getElementById('ch-time')?.value || 'this_month';
    const pageId = document.getElementById('ch-page')?.value || '';
    const { from, to } = getDateRange(preset);

    try {
        let url = `/channels?from=${from}&to=${to}&limit=${PAGE_SIZE}&page=${currentPage}`;
        if (pageId) url += `&pageId=${pageId}`;
        const data = await apiGet(url);
        const channels = Array.isArray(data) ? data : (data.data || data.channels || []);
        const pagination = data.pagination || {};
        const total = pagination.total || channels.length;
        const totalPages = pagination.totalPages || Math.ceil(total / PAGE_SIZE);

        // Aggregate KPIs from summary endpoint for accurate totals
        let summaryUrl = `/channels/summary`;
        if (pageId) summaryUrl += `?pageId=${pageId}`;
        let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConv = 0, totalPhones = 0;
        let activeAds = 0, inactiveAds = 0;
        try {
            const summary = await apiGet(summaryUrl);
            totalSpend = Number(summary.total_spend || 0);
            totalImpressions = Number(summary.total_impressions || 0);
            totalClicks = Number(summary.total_clicks || 0);
            totalConv = Number(summary.total_conversations || 0);
            totalPhones = Number(summary.total_phones || 0);
            activeAds = Number(summary.active_ads || 0);
            inactiveAds = Number(summary.inactive_ads || 0);
        } catch {
            for (const ch of channels) {
                totalSpend += Number(ch.spend || 0);
                totalImpressions += Number(ch.impressions || 0);
                totalClicks += Number(ch.clicks || 0);
                totalConv += Number(ch.conversations || 0);
                totalPhones += Number(ch.phones || 0);
            }
        }

        const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
        const cpl = totalPhones > 0 ? totalSpend / totalPhones : 0;
        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;

        // KPIs
        const kpiEl = document.getElementById('ch-kpis');
        if (kpiEl) {
            kpiEl.innerHTML = renderKpiGrid([
                renderKpiCard({ label: 'Tổng chi QC', value: fmtMoney(totalSpend), icon: 'wallet', color: 'var(--blue)' }),
                renderKpiCard({ label: 'Hiển thị', value: fmtNumber(totalImpressions), icon: 'eye', color: '#8B5CF6' }),
                renderKpiCard({ label: 'Click', value: fmtNumber(totalClicks), icon: 'mouse-pointer', color: 'var(--orange)' }),
                renderKpiCard({ label: 'CTR', value: fmtPercent(ctr), icon: 'percent', color: 'var(--cyan)' }),
                renderKpiCard({ label: 'Hội thoại', value: fmtNumber(totalConv), icon: 'message-circle', color: 'var(--blue)' }),
                renderKpiCard({ label: 'SĐT', value: fmtNumber(totalPhones), icon: 'phone', color: 'var(--green)' }),
                renderKpiCard({ label: 'Đang chạy', value: fmtNumber(activeAds), icon: 'play-circle', color: 'var(--green)' }),
                renderKpiCard({ label: 'Tạm dừng', value: fmtNumber(inactiveAds), icon: 'pause-circle', color: 'var(--text-muted)' }),
            ]);
            if (window.lucide) window.lucide.createIcons();
        }

        // Campaigns table
        const tbody = document.getElementById('campaigns-body');
        if (tbody) {
            if (channels.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">Chưa có dữ liệu quảng cáo</td></tr>';
            } else {
                tbody.innerHTML = channels.map(ch => {
                    const costPerPhone = Number(ch.phones) > 0 ? Number(ch.spend) / Number(ch.phones) : 0;
                    const statusColor = ch.status === 'ACTIVE' ? 'var(--green)' : 'var(--text-muted)';
                    return `
                    <tr>
                        <td style="font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ch.name || ch.ad_id}</td>
                        <td style="font-size:12px;color:var(--text-secondary)">${ch.pageName || ch.page_id || '—'}</td>
                        <td class="text-right" style="font-weight:600">${fmtMoney(ch.spend)}</td>
                        <td class="text-right">${fmtNumber(ch.impressions)}</td>
                        <td class="text-right">${fmtNumber(ch.clicks)}</td>
                        <td class="text-right">${fmtNumber(ch.conversations)}</td>
                        <td class="text-right">${fmtNumber(ch.phones)}</td>
                        <td class="text-right" style="color:${costPerPhone > 500000 ? 'var(--red)' : 'var(--green)'}; font-weight:600">${costPerPhone > 0 ? fmtMoney(costPerPhone) : '—'}</td>
                        <td class="text-center"><span class="tag" style="color:${statusColor}">${ch.status || '—'}</span></td>
                    </tr>`;
                }).join('');
            }
        }

        // Pagination
        const pgnEl = document.getElementById('ch-pagination');
        if (pgnEl) {
            pgnEl.innerHTML = `
                <button class="btn btn-sm" id="ch-prev" ${currentPage <= 1 ? 'disabled' : ''} style="padding:4px 12px;font-size:12px;cursor:pointer">← Trước</button>
                <span style="color:var(--text-secondary)">Trang ${currentPage}/${totalPages} (${fmtNumber(total)} chiến dịch)</span>
                <button class="btn btn-sm" id="ch-next" ${currentPage >= totalPages ? 'disabled' : ''} style="padding:4px 12px;font-size:12px;cursor:pointer">Sau →</button>
            `;
            document.getElementById('ch-prev')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; fetchChannels(); } });
            document.getElementById('ch-next')?.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; fetchChannels(); } });
        }
    } catch (err) {
        console.error('Lỗi tải kênh QC:', err);
    }
}
