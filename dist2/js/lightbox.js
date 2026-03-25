/**
 * Chart Lightbox — fullscreen zoom for any chart card.
 * Auto-scans for .chart-card elements and adds a zoom icon.
 * Works with both Chart.js canvas and HTML-based charts (like CSS funnel).
 */
(function () {
    // Create lightbox overlay (singleton)
    const overlay = document.createElement('div');
    overlay.id = 'chart-lightbox';
    overlay.innerHTML = `
        <div class="lb-backdrop"></div>
        <div class="lb-content">
            <button class="lb-close" title="Đóng">✕</button>
            <div class="lb-body"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        #chart-lightbox {
            position: fixed; inset: 0; z-index: 9999;
            display: none; align-items: center; justify-content: center;
        }
        #chart-lightbox.active { display: flex; }
        #chart-lightbox .lb-backdrop {
            position: absolute; inset: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
        }
        #chart-lightbox .lb-content {
            position: relative; z-index: 1;
            background: #fff; border-radius: 12px;
            width: 92vw; max-width: 900px;
            height: 80vh; max-height: 600px;
            padding: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            display: flex; flex-direction: column;
        }
        #chart-lightbox .lb-close {
            position: absolute; top: 8px; right: 12px;
            background: none; border: none; font-size: 20px;
            color: #64748b; cursor: pointer; z-index: 2;
            width: 32px; height: 32px; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
        }
        #chart-lightbox .lb-close:hover { background: #f1f5f9; color: #0f172a; }
        #chart-lightbox .lb-body {
            flex: 1; overflow: auto;
            display: flex; align-items: center; justify-content: center;
        }
        #chart-lightbox .lb-body canvas {
            width: 100% !important;
            height: 100% !important;
        }
        /* Zoom button on chart cards */
        .chart-zoom-btn {
            position: absolute; top: 6px; right: 6px;
            width: 24px; height: 24px; border-radius: 4px;
            background: rgba(255,255,255,0.9); border: 1px solid #e2e8f0;
            color: #64748b; cursor: pointer; z-index: 3;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; transition: all 0.15s;
            opacity: 0;
        }
        .chart-zoom-btn:hover { background: #f1f5f9; color: #0ea5e9; border-color: #0ea5e9; }
        .chart-card:hover .chart-zoom-btn,
        [class*="rounded-xl"]:hover .chart-zoom-btn { opacity: 1; }
        @media (max-width: 768px) {
            #chart-lightbox .lb-content { width: 96vw; height: 85vh; padding: 10px; }
            .chart-zoom-btn { opacity: 1; } /* Always show on mobile */
        }
    `;
    document.head.appendChild(style);

    // Close handlers
    overlay.querySelector('.lb-backdrop').addEventListener('click', closeLightbox);
    overlay.querySelector('.lb-close').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

    function closeLightbox() {
        overlay.classList.remove('active');
        overlay.querySelector('.lb-body').innerHTML = '';
    }

    function openLightbox(sourceEl) {
        const body = overlay.querySelector('.lb-body');
        body.innerHTML = '';

        // Find chart content: canvas or HTML
        const canvas = sourceEl.querySelector('canvas');
        if (canvas) {
            // Clone canvas as image for lightbox
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
            body.appendChild(img);
        } else {
            // HTML-based chart (CSS funnel etc) — clone the content
            const chartContainer = sourceEl.querySelector('.chart-container') || sourceEl.querySelector('[style*="flex-direction:column"]')?.parentElement || sourceEl;
            const clone = chartContainer.cloneNode(true);
            clone.style.cssText = 'width:100%;height:100%;overflow:auto;';
            // Remove any zoom buttons from clone
            clone.querySelectorAll('.chart-zoom-btn').forEach(b => b.remove());
            body.appendChild(clone);
        }

        overlay.classList.add('active');
    }

    // Auto-attach zoom buttons after DOM is ready
    function attachZoomButtons() {
        // Find all chart containers — look for canvas parents and chart-card classes
        const targets = new Set();

        // Chart.js canvases
        document.querySelectorAll('canvas').forEach(c => {
            const card = c.closest('.chart-card') || c.closest('.rounded-xl') || c.closest('[class*="bg-white"]');
            if (card) targets.add(card);
        });

        // CSS funnel or other HTML charts inside chart-card
        document.querySelectorAll('.chart-card, .chart-container').forEach(el => {
            const card = el.closest('.chart-card') || el.closest('.rounded-xl') || el;
            targets.add(card);
        });

        targets.forEach(card => {
            if (card.querySelector('.chart-zoom-btn')) return; // Already has button
            card.style.position = 'relative';

            const btn = document.createElement('button');
            btn.className = 'chart-zoom-btn';
            btn.innerHTML = '⤢';
            btn.title = 'Phóng lớn';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openLightbox(card);
            });
            card.appendChild(btn);
        });
    }

    // Run on DOM ready and also observe for dynamically added charts
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(attachZoomButtons, 1500));
    } else {
        setTimeout(attachZoomButtons, 1500);
    }

    // Re-scan periodically for dynamically rendered charts
    let scanCount = 0;
    const scanner = setInterval(() => {
        attachZoomButtons();
        if (++scanCount >= 10) clearInterval(scanner);
    }, 3000);

    // Expose for manual triggering
    window.ChartLightbox = { attach: attachZoomButtons, open: openLightbox };
})();
