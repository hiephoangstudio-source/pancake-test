import { fmtNumber } from '../utils/format.js';

export function renderKpiCard({ label, value, icon, color, delta }) {
    const deltaHtml = delta
        ? `<span class="kpi-delta ${delta.direction}">${delta.label}</span>`
        : '';
    return `
        <div class="kpi-card">
            <div class="kpi-label">
                <i data-lucide="${icon}" style="color:${color}"></i>
                ${label}
            </div>
            <div style="display:flex;align-items:baseline;gap:4px">
                <span class="kpi-value" style="color:${color}">${value}</span>
                ${deltaHtml}
            </div>
        </div>
    `;
}

export function renderKpiGrid(cards) {
    return `<div class="kpi-grid">${cards.join('')}</div>`;
}
