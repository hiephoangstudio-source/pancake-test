/**
 * Help / Readme modal — contextual help for each page.
 * Auto-detects page and shows relevant guide content.
 */
(function () {
    // Help content per page
    const helpContent = {
        'index': {
            title: 'Hướng dẫn — Tổng quan',
            sections: [
                {
                    heading: '📊 KPI Cards (8 thẻ chỉ số)', body: `
          <b>Conversations</b> — Tổng số cuộc hội thoại trong khoảng thời gian được chọn.<br>
          <b>Messages</b> — Tổng tin nhắn gửi/nhận.<br>
          <b>Khách hàng</b> — Số khách hàng duy nhất (unique) từ conversations.<br>
          <b>Số điện thoại</b> — Số khách có SĐT (khách tiềm năng).<br>
          <b>Total Spend</b> — Tổng chi phí quảng cáo từ Facebook Ads (qua Pancake).<br>
          <b>Tỷ lệ SĐT</b> — % khách có SĐT / tổng conversations → đo chất lượng lead.<br>
          <b>Tỷ lệ Ký/Chốt</b> — % khách ký đơn / tổng khách hàng → conversion rate.<br>
          <b>Tags Chốt đơn</b> — Số khách được gắn tag KÍ/KÝ/CHỐT.` },
                { heading: '📈 Biểu đồ xu hướng', body: 'Hiển thị số conversations và messages theo ngày. Giúp nhận biết ngày nào có hiệu quả quảng cáo tốt/kém.' },
                { heading: '🎯 Phân bố theo loại', body: 'Tỷ lệ Inbox vs Comment — cho biết nguồn tương tác chính.' },
                { heading: '👥 Hiệu suất nhân viên', body: 'So sánh số lượng conversations mà mỗi nhân viên xử lý trong 30 ngày. Giúp đánh giá năng suất.' },
                { heading: '⏱️ Bộ lọc thời gian', body: 'Chọn khoảng thời gian: Hôm nay, Tuần này, Tháng này, Quý, Năm, hoặc Tùy chọn. Tất cả KPI và biểu đồ tự động cập nhật.' }
            ]
        },
        'channels': {
            title: 'Hướng dẫn — Hiệu quả Kênh',
            sections: [
                {
                    heading: '💰 Chi phí & ROI', body: `
          <b>Total Spend</b> — Tổng ngân sách quảng cáo đã chi.<br>
          <b>CPL (Cost Per Lead)</b> — Chi phí trung bình để có 1 SĐT = Spend ÷ Số SĐT.<br>
          <b>CPA (Cost Per Acquisition)</b> — Chi phí để có 1 đơn ký = Spend ÷ Đơn ký/chốt.<br>
          <small>CPL thấp + CPA thấp = Kênh hiệu quả.</small>` },
                { heading: '🔄 Phễu chuyển đổi', body: 'Hiển thị hành trình từ Conversations → Tham khảo → Hẹn đến → SĐT → Ký/Chốt. Thanh càng hẹp = tỷ lệ rớt cao. "Sai ĐT" hiện riêng để đo lãng phí.' },
                { heading: '📊 Hiệu quả theo Page', body: 'So sánh conversations, SĐT, đơn ký giữa các fanpage. Xác định page nào mang khách chất lượng nhất.' },
                { heading: '📈 Xu hướng chuyển đổi', body: 'Tỷ lệ SĐT/conversations theo thời gian. Trend giảm = cần tối ưu quảng cáo.' },
                { heading: '📋 Bảng Ads', body: 'Chi tiết từng mẫu quảng cáo: impressions, clicks, spend, CPM, CPC. Lọc theo status (Active/Paused) và Page.' }
            ]
        },
        'tags': {
            title: 'Hướng dẫn — Báo cáo Tags',
            sections: [
                { heading: '🏷️ Tags theo ngày', body: 'Bảng crosstab hiển thị số lượng mỗi loại tag được gắn trong từng ngày. Giúp theo dõi xu hướng phân loại khách.' },
                { heading: '📊 Tổng hợp Tag', body: 'Tổng số và tỷ lệ % của mỗi tag. Tags phổ biến nhất cho biết tình trạng khách hàng chung.' },
                {
                    heading: '💡 Ý nghĩa tags', body: `
          <b>KÍ/KÝ/CHỐT</b> — Khách đã ký hợp đồng/chốt đơn.<br>
          <b>THAM KHẢO</b> — Khách đang tìm hiểu.<br>
          <b>HẸN ĐẾN</b> — Đã hẹn lịch.<br>
          <b>SAI ĐỐI TƯỢNG</b> — Không phải khách tiềm năng.` }
            ]
        },
        'customers': {
            title: 'Hướng dẫn — Khách hàng',
            sections: [
                { heading: '👤 Danh sách khách', body: 'Tất cả khách hàng từ Pancake, được đồng bộ tự động. Bao gồm tên, SĐT, tags, và thời gian hoạt động cuối.' },
                {
                    heading: '🏷️ Cột Tags', body: `
          <b>Trạng thái</b> — Tags phân loại: Tham khảo, Hẹn đến, Ký/Chốt, Sai ĐT...<br>
          <b>Sản phẩm</b> — Tags dịch vụ/sản phẩm khách quan tâm.<br>
          <b>NV Sale</b> — Nhân viên phụ trách.` },
                { heading: '🔍 Tìm kiếm', body: 'Tìm theo tên hoặc SĐT. Hỗ trợ phân trang server-side.' }
            ]
        }
    };

    // Detect current page
    const path = window.location.pathname;
    let pageKey = 'index';
    if (path.includes('channels')) pageKey = 'channels';
    else if (path.includes('tags')) pageKey = 'tags';
    else if (path.includes('customers')) pageKey = 'customers';

    const content = helpContent[pageKey];
    if (!content) return;

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'help-modal';
    modal.innerHTML = `
    <div class="help-backdrop"></div>
    <div class="help-panel">
      <div class="help-header">
        <h2>${content.title}</h2>
        <button class="help-close">✕</button>
      </div>
      <div class="help-body">
        ${content.sections.map(s => `
          <div class="help-section">
            <h3>${s.heading}</h3>
            <p>${s.body}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
    document.body.appendChild(modal);

    // Styles
    const style = document.createElement('style');
    style.textContent = `
    #help-modal { display:none; position:fixed; inset:0; z-index:9998; }
    #help-modal.active { display:flex; align-items:center; justify-content:center; }
    #help-modal .help-backdrop { position:absolute; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(3px); }
    #help-modal .help-panel {
      position:relative; z-index:1; background:#fff; border-radius:12px;
      width:90vw; max-width:560px; max-height:80vh; overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,0.2); display:flex; flex-direction:column;
    }
    #help-modal .help-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:12px 16px; border-bottom:1px solid #e2e8f0;
    }
    #help-modal .help-header h2 { font-size:14px; font-weight:700; color:#1e293b; margin:0; }
    #help-modal .help-close {
      width:28px; height:28px; border:none; background:none; cursor:pointer;
      border-radius:6px; font-size:16px; color:#64748b; display:flex; align-items:center; justify-content:center;
    }
    #help-modal .help-close:hover { background:#f1f5f9; }
    #help-modal .help-body { padding:16px; overflow-y:auto; flex:1; }
    #help-modal .help-section { margin-bottom:14px; }
    #help-modal .help-section:last-child { margin-bottom:0; }
    #help-modal .help-section h3 { font-size:13px; font-weight:600; color:#334155; margin:0 0 4px; }
    #help-modal .help-section p { font-size:12px; color:#64748b; line-height:1.5; margin:0; }
    #help-modal .help-section b { color:#1e293b; }
    #help-modal .help-section small { color:#94a3b8; }
  `;
    document.head.appendChild(style);

    // Open/close
    const openHelp = () => modal.classList.add('active');
    const closeHelp = () => modal.classList.remove('active');
    modal.querySelector('.help-backdrop').addEventListener('click', closeHelp);
    modal.querySelector('.help-close').addEventListener('click', closeHelp);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeHelp(); });

    // Expose
    window.openHelp = openHelp;

    // Auto-inject help button into header if not already present
    setTimeout(() => {
        if (document.getElementById('help-btn')) return;
        const header = document.querySelector('header');
        if (!header) return;

        // Find the rightmost container in header
        const rightDiv = header.querySelector('.justify-end') || header.querySelector('div:last-child');
        if (rightDiv) {
            const btn = document.createElement('button');
            btn.id = 'help-btn';
            btn.className = 'p-1.5 hover:bg-slate-100 rounded-lg text-slate-500';
            btn.title = 'Hướng dẫn';
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
            btn.addEventListener('click', openHelp);
            rightDiv.appendChild(btn);
        }
    }, 500);
})();
