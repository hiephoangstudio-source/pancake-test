export function fmtNumber(n) {
    if (n == null || isNaN(n)) return '0';
    return Number(n).toLocaleString('vi-VN');
}

export function fmtMoney(n) {
    if (n == null || isNaN(n)) return '0đ';
    const num = Number(n);
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr';
    if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
    return num.toLocaleString('vi-VN') + 'đ';
}

export function fmtTick(v) {
    if (v >= 1e9) return (v/1e9).toFixed(1) + ' tỷ';
    if (v >= 1e6) return (v/1e6).toFixed(v >= 1e7 ? 0 : 1) + 'tr';
    if (v >= 1e3) return (v/1e3).toFixed(0) + 'K';
    return v;
}

export function fmtPercent(n, decimals = 1) {
    if (n == null || isNaN(n)) return '0%';
    return Number(n).toFixed(decimals) + '%';
}

export function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function fmtTimeDuration(seconds) {
    if (!seconds || seconds <= 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
    return `${(seconds / 3600).toFixed(1)} giờ`;
}

export function calcDelta(current, prev) {
    if (!prev || prev === 0) return null;
    const pct = ((current - prev) / prev) * 100;
    const diff = current - prev;
    const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '';
    const sign = pct > 0 ? '+' : '';
    return {
        value: pct,
        label: sign + pct.toFixed(1) + '% ' + arrow,
        sublabel: sign + fmtNumber(diff) + ' so kỳ trước',
        direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'
    };
}

export function getDateRange(preset) {
    const today = new Date();
    const fmt = d => d.toISOString().slice(0, 10);
    const startOf = (d, unit) => {
        const r = new Date(d);
        if (unit === 'week') { r.setDate(r.getDate() - r.getDay() + 1); }
        else if (unit === 'month') { r.setDate(1); }
        else if (unit === 'quarter') { r.setMonth(Math.floor(r.getMonth() / 3) * 3, 1); }
        else if (unit === 'year') { r.setMonth(0, 1); }
        r.setHours(0, 0, 0, 0);
        return r;
    };

    switch (preset) {
        case 'today': return { from: fmt(today), to: fmt(today) };
        case 'yesterday': { const y = new Date(today); y.setDate(y.getDate() - 1); return { from: fmt(y), to: fmt(y) }; }
        case 'this_week': return { from: fmt(startOf(today, 'week')), to: fmt(today) };
        case 'this_month': return { from: fmt(startOf(today, 'month')), to: fmt(today) };
        case 'last_month': {
            const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const e = new Date(today.getFullYear(), today.getMonth(), 0);
            return { from: fmt(s), to: fmt(e) };
        }
        case 'this_quarter': return { from: fmt(startOf(today, 'quarter')), to: fmt(today) };
        case 'last_quarter': {
            const q = Math.floor(today.getMonth() / 3);
            const s = new Date(today.getFullYear(), (q - 1) * 3, 1);
            const e = new Date(today.getFullYear(), q * 3, 0);
            return { from: fmt(s), to: fmt(e) };
        }
        case 'this_year': return { from: fmt(startOf(today, 'year')), to: fmt(today) };
        case 'all_time': return { from: '2025-01-01', to: fmt(today) };
        default: return { from: fmt(startOf(today, 'month')), to: fmt(today) };
    }
}

export function getPrevRange(from, to) {
    const f = new Date(from);
    const t = new Date(to);
    const diff = t - f;
    const pf = new Date(f - diff - 86400000);
    const pt = new Date(f);
    pt.setDate(pt.getDate() - 1);
    return { prevFrom: pf.toISOString().slice(0, 10), prevTo: pt.toISOString().slice(0, 10) };
}
