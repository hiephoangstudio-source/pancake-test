import { renderSidebar, toggleSidebar } from './components/sidebar.js';
import { checkAuth } from './utils/auth.js';
import { loadTagClassifications } from './utils/tagClassifier.js';
import './components/toast.js';

// Page modules (lazy loaded)
const PAGES = {
    dashboard: () => import('./pages/dashboard.js'),
    branch: () => import('./pages/branch.js'),
    staff: () => import('./pages/staff.js'),
    channels: () => import('./pages/channels.js'),
    customers: () => import('./pages/customers.js'),
    orders: () => import('./pages/orders.js'),
    settings: () => import('./pages/settings.js'),
    tags: () => import('./pages/tags.js'),
};

let currentPage = null;
let tagMap = {};

function getPageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        page: params.get('page') || 'dashboard',
        branch: params.get('branch') || null,
        extra: Object.fromEntries(params.entries()),
    };
}

function getSidebarActiveId(route) {
    return route.page;
}

async function navigate() {
    const route = getPageFromUrl();
    const contentEl = document.getElementById('app-content');
    const sidebarEl = document.getElementById('sidebar');

    // Update sidebar
    renderSidebar(sidebarEl, getSidebarActiveId(route));

    // Load page module
    const loader = PAGES[route.page];
    if (!loader) {
        contentEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">Trang không tìm thấy</div>`;
        return;
    }

    // Show loading
    contentEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-muted)">
            <i data-lucide="loader-2" style="width:24px;height:24px;animation:spin 1s linear infinite"></i>
            <span style="margin-left:8px">Đang tải...</span>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    try {
        const module = await loader();
        if (currentPage && currentPage.destroy) currentPage.destroy();
        currentPage = module;
        await module.render(contentEl, { ...route, tagMap });
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('Lỗi tải trang:', err);
        contentEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red)">Lỗi: ${err.message}</div>`;
    }
}

async function init() {
    if (!checkAuth()) return;

    // Load tag classifications
    tagMap = await loadTagClassifications();

    // Sidebar toggle
    document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);

    // SPA router
    window.addEventListener('popstate', navigate);

    // SSE real-time
    try {
        const es = new EventSource('/api/sync/events');
        es.addEventListener('data-updated', async (e) => {
            const data = JSON.parse(e.data);
            const { toastInfo } = await import('./components/toast.js');
            toastInfo(`🔄 Đã cập nhật ${data.changes || ''} dữ liệu mới`);
            navigate(); // reload current page
        });
    } catch { /* SSE not available */ }

    // Initial render
    navigate();
}

init();
