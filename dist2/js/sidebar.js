/**
 * Sidebar toggle — edge button at sidebar/main border, logo click, proper collapse.
 */
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const pref = localStorage.getItem('sidebar_collapsed');
  const isMobile = () => window.matchMedia('(max-width: 1024px)').matches;

  // --- Toggle logic ---
  const updateHeaderIcon = () => {
    const btn = document.getElementById('sidebar-toggle');
    if (!btn) return;
    const icon = btn.querySelector('i, svg');
    if (icon && icon.dataset) {
      const collapsed = body.classList.contains('sidebar-collapsed');
      icon.setAttribute('data-lucide', collapsed ? 'panel-left-open' : 'panel-left-close');
      if (window.lucide) lucide.createIcons({ nodes: [icon] });
    }
  };

  const toggle = () => {
    const collapsed = body.classList.toggle('sidebar-collapsed');
    body.classList.remove('sidebar-mobile-open');
    localStorage.setItem('sidebar_collapsed', collapsed ? 'true' : 'false');
    updateEdgeIcon();
    updateHeaderIcon();
  };

  const openMobile = () => {
    body.classList.add('sidebar-mobile-open');
    body.classList.remove('sidebar-collapsed');
  };

  const closeMobile = () => {
    body.classList.remove('sidebar-mobile-open');
  };

  // --- Edge toggle button (sits at sidebar right edge) ---
  let edgeBtn = document.getElementById('sidebar-edge-toggle');
  if (!edgeBtn) {
    edgeBtn = document.createElement('button');
    edgeBtn.id = 'sidebar-edge-toggle';
    edgeBtn.setAttribute('aria-label', 'Toggle Sidebar');
    edgeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    sidebar.appendChild(edgeBtn);
  }

  const updateEdgeIcon = () => {
    const collapsed = body.classList.contains('sidebar-collapsed');
    edgeBtn.innerHTML = collapsed
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
  };

  edgeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMobile()) {
      closeMobile();
    } else {
      toggle();
    }
  });

  // --- Header toggle button (for mobile hamburger) ---
  const headerBtn = document.getElementById('sidebar-toggle');
  if (headerBtn) {
    headerBtn.addEventListener('click', () => {
      if (isMobile()) {
        if (body.classList.contains('sidebar-mobile-open')) closeMobile();
        else openMobile();
      } else {
        toggle();
      }
    });
  }

  // --- Logo click toggles sidebar ---
  const logoArea = sidebar.querySelector('.sidebar-logo, div:first-child');
  if (logoArea) {
    logoArea.style.cursor = 'pointer';
    logoArea.addEventListener('click', (e) => {
      // Don't toggle if clicking a link inside logo area
      if (e.target.closest('a')) return;
      if (isMobile()) {
        closeMobile();
      } else {
        toggle();
      }
    });
  }

  // --- Overlay for mobile ---
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
  overlay.addEventListener('click', closeMobile);

  // --- Auto-close mobile on nav click ---
  sidebar.querySelectorAll('nav a').forEach(a => {
    a.addEventListener('click', () => {
      if (isMobile()) closeMobile();
    });
  });

  // --- Initial state ---
  if (isMobile()) {
    body.classList.add('sidebar-collapsed');
  } else if (pref === 'true') {
    body.classList.add('sidebar-collapsed');
  }
  updateEdgeIcon();

  // --- Inject CSS ---
  const style = document.createElement('style');
  style.textContent = `
    /* Edge toggle button */
    #sidebar-edge-toggle {
      position: absolute;
      top: 50%;
      right: -12px;
      transform: translateY(-50%);
      z-index: 30;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748b;
      transition: all 0.15s;
      opacity: 0;
    }
    #sidebar:hover #sidebar-edge-toggle,
    #sidebar-edge-toggle:hover { opacity: 1; }
    #sidebar-edge-toggle:hover {
      background: #f1f5f9;
      color: #0ea5e9;
      border-color: #0ea5e9;
    }

    /* Sidebar must be relative for edge button */
    #sidebar { position: relative; }

    /* Collapsed state */
    .sidebar-collapsed #sidebar {
      width: 0 !important;
      min-width: 0 !important;
      overflow: hidden;
      padding: 0;
      border: none;
    }
    .sidebar-collapsed #sidebar * { opacity: 0; pointer-events: none; }
    .sidebar-collapsed #sidebar-edge-toggle {
      opacity: 1 !important;
      right: -28px;
      pointer-events: auto !important;
      background: #f8fafc;
    }

    /* Mobile overlay */
    #sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.3);
      z-index: 20;
    }

    /* Mobile: sidebar is off-screen by default */
    @media (max-width: 1024px) {
      #sidebar {
        position: fixed;
        left: -280px;
        top: 0;
        bottom: 0;
        z-index: 25;
        width: 260px !important;
        transition: left 0.25s ease;
      }
      .sidebar-mobile-open #sidebar { left: 0; }
      .sidebar-mobile-open #sidebar * { opacity: 1; pointer-events: auto; }
      .sidebar-mobile-open #sidebar-overlay { display: block; }

      /* On mobile the edge toggle is inside the sidebar header area */
      #sidebar-edge-toggle { display: none; }
    }
  `;
  document.head.appendChild(style);
});
