import{a as u}from"./index-C6vEoKGd.js";import{g as m,f as i,b as f}from"./format-B1Yfxcsd.js";function k(){}async function $(v,{tagMap:g}){var l,a;const c=document.getElementById("header-title");c&&(c.textContent="Nhân viên");const r=document.getElementById("header-filters");r&&(r.innerHTML=`
            <div class="filter-group">
                <i data-lucide="clock"></i>
                <select class="filter-select" id="staff-time">
                    <option value="this_month">Tháng này</option>
                    <option value="today">Hôm nay</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="file-text"></i>
                <select class="filter-select" id="staff-page">
                    <option value="">Tất cả trang</option>
                </select>
            </div>
        `),v.innerHTML=`
        <div id="staff-summary" class="kpi-grid" style="margin-bottom:12px"></div>
        <div class="card">
            <table class="data-table" id="staff-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nhân viên</th>
                        <th class="text-right">Hội thoại</th>
                        <th class="text-right">Tin nhắn</th>
                        <th class="text-right">Inbox</th>
                        <th class="text-right">Comment</th>
                        <th class="text-right">Khách hàng</th>
                        <th class="text-right">Có SĐT</th>
                        <th class="text-right" style="color:var(--red)">Sai đối tượng</th>
                        <th class="text-right" style="color:var(--green)">Đã chốt</th>
                        <th class="text-right">Tỷ lệ chốt</th>
                    </tr>
                </thead>
                <tbody id="staff-body">
                    <tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted)">Đang tải...</td></tr>
                </tbody>
            </table>
        </div>
    `,window.lucide&&window.lucide.createIcons();try{const d=await u("/pages"),e=document.getElementById("staff-page");d.forEach(o=>{const s=document.createElement("option");s.value=o.page_id,s.textContent=o.name,e==null||e.appendChild(s)})}catch{}const n=()=>y();(l=document.getElementById("staff-time"))==null||l.addEventListener("change",n),(a=document.getElementById("staff-page"))==null||a.addEventListener("change",n),await n()}async function y(){var n,l;const v=((n=document.getElementById("staff-time"))==null?void 0:n.value)||"this_month",g=((l=document.getElementById("staff-page"))==null?void 0:l.value)||"",{from:c,to:r}=m(v);try{let a=`/dashboard/staff?from=${c}&to=${r}`;g&&(a+=`&pageId=${g}`);const d=await u(a),e=d.totals,o=document.getElementById("staff-summary");if(o&&e){const t=e.conversations>0?e.phone/e.conversations*100:0,h=e.conversations>0?e.signed/e.conversations*100:0;o.innerHTML=`
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="users"></i>Tổng NV</div><div class="kpi-value">${d.staff.length}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="message-circle"></i>Hội thoại</div><div class="kpi-value">${i(e.conversations)}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="phone"></i>Có SĐT</div><div class="kpi-value">${i(e.phone)}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="check-circle"></i>Đã chốt</div><div class="kpi-value" style="color:var(--green)">${i(e.signed)}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="percent"></i>Tỷ lệ SĐT</div><div class="kpi-value" style="color:var(--cyan)">${f(t)}</div></div>
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="target"></i>Tỷ lệ chốt</div><div class="kpi-value" style="color:var(--green)">${f(h)}</div></div>
            `,window.lucide&&window.lucide.createIcons()}const s=document.getElementById("staff-body");if(!s)return;if(d.staff.length===0){s.innerHTML='<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted)">Không có dữ liệu</td></tr>';return}s.innerHTML=d.staff.map((t,h)=>{const p=t.conversations>0?t.signed/t.conversations*100:0;return`
                <tr>
                    <td style="font-weight:700;color:${h<3?"var(--blue)":"var(--text-muted)"}">${h+1}</td>
                    <td style="font-weight:600">${t.userName}</td>
                    <td class="text-right">${i(t.conversations)}</td>
                    <td class="text-right">${i(t.messages)}</td>
                    <td class="text-right">${i(t.inbox)}</td>
                    <td class="text-right">${i(t.comment)}</td>
                    <td class="text-right">${i(t.customers)}</td>
                    <td class="text-right">${i(t.phone)}</td>
                    <td class="text-right" style="color:var(--red)">${t.wrongTarget>0?i(t.wrongTarget):"—"}</td>
                    <td class="text-right" style="color:var(--green);font-weight:600">${i(t.signed)}</td>
                    <td class="text-right" style="font-weight:600;color:${p>=15?"var(--green)":p>=10?"var(--orange)":"var(--red)"}">${f(p)}</td>
                </tr>
            `}).join("")}catch(a){console.error("Lỗi tải nhân viên:",a)}}export{k as destroy,$ as render};
