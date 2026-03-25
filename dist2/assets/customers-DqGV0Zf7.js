import{a as _,c as T,g as w}from"./index-C6vEoKGd.js";import{f as v,e as I}from"./format-B1Yfxcsd.js";import{o as k}from"./conversationModal-_4a_wgJD.js";function S(){}async function j(b,{tagMap:n}){var u,g,a;const d=document.getElementById("header-title");d&&(d.textContent="Khách hàng");const r=document.getElementById("header-filters");r&&(r.innerHTML=`
            <div class="filter-group">
                <i data-lucide="search"></i>
                <input type="text" id="cust-search" placeholder="Tìm tên, SĐT..." style="border:none;background:transparent;font-size:12px;outline:none;width:160px" />
            </div>
            <div class="filter-group">
                <i data-lucide="tag"></i>
                <select class="filter-select" id="cust-tag-filter">
                    <option value="">Tất cả tags</option>
                    <option value="__NEW_TODAY__">Khách mới (30 ngày)</option>
                    <option value="__HAS_PHONE__">Có SĐT</option>
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="file-text"></i>
                <select class="filter-select" id="cust-page">
                    <option value="">Tất cả trang</option>
                </select>
            </div>
        `),b.innerHTML=`
        <div id="cust-segments" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"></div>
        <div class="card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Khách hàng</th>
                        <th>SĐT</th>
                        <th>Chi nhánh</th>
                        <th>Tags</th>
                        <th class="text-right">Hội thoại</th>
                        <th>Hoạt động cuối</th>
                    </tr>
                </thead>
                <tbody id="cust-body">
                    <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Đang tải...</td></tr>
                </tbody>
            </table>
            <div id="cust-pagination" style="display:flex;justify-content:center;gap:8px;padding:12px"></div>
        </div>
    `,window.lucide&&window.lucide.createIcons();try{const o=await _("/pages"),c=document.getElementById("cust-page");o.forEach(i=>{const l=document.createElement("option");l.value=i.page_id,l.textContent=i.name,c==null||c.appendChild(l)})}catch{}let p;const f=()=>{clearTimeout(p),p=setTimeout(()=>y(1,n),300)};(u=document.getElementById("cust-search"))==null||u.addEventListener("input",f),(g=document.getElementById("cust-tag-filter"))==null||g.addEventListener("change",()=>y(1,n)),(a=document.getElementById("cust-page"))==null||a.addEventListener("change",()=>y(1,n)),await y(1,n)}async function y(b,n){var f,u,g;const d=((f=document.getElementById("cust-search"))==null?void 0:f.value)||"",r=((u=document.getElementById("cust-tag-filter"))==null?void 0:u.value)||"",p=((g=document.getElementById("cust-page"))==null?void 0:g.value)||"";try{let a=`/dashboard/customers?page=${b}&limit=50`;d&&(a+=`&search=${encodeURIComponent(d)}`),r&&(a+=`&tagFilter=${encodeURIComponent(r)}`),p&&(a+=`&pageId=${p}`);const o=await _(a),c=document.getElementById("cust-segments");if(c&&o.segments){const t=o.segments;c.innerHTML=[{label:"Mới",count:t.new,color:"var(--blue)"},{label:"Hoạt động",count:t.active,color:"var(--green)"},{label:"Trung thành",count:t.loyal,color:"#8B5CF6"},{label:"Có nguy cơ",count:t.at_risk,color:"var(--orange)"},{label:"Mất",count:t.churned,color:"var(--red)"}].map(s=>`
                <div class="kpi-card" style="min-width:120px;cursor:pointer">
                    <div class="kpi-label" style="color:${s.color}">${s.label}</div>
                    <div class="kpi-value" style="color:${s.color}">${v(s.count)}</div>
                </div>
            `).join("")}const i=document.getElementById("cust-body");if(!i)return;if(!o.data||o.data.length===0){i.innerHTML='<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Không tìm thấy khách hàng</td></tr>';return}i.innerHTML=o.data.map(t=>{const s=T(t.tags,n),$=w(t.tags,n);let h="";if(t.phone)try{const e=typeof t.phone=="string"&&t.phone.startsWith("{")?JSON.parse(t.phone):t.phone;h=typeof e=="object"?e.captured||e.phone_number||"":e}catch{h=t.phone}if(!h&&t.phone_numbers&&t.phone_numbers.length>0){const e=t.phone_numbers[0];h=typeof e=="object"?e.captured||e.phone_number||"":e}const E=(t.tags||[]).slice(0,4).map(e=>{const x=typeof e=="string"?e:e.name||"",m=n[x.toLowerCase()];return`<span class="tag ${m?`tag-${m.category}`:""}">${(m==null?void 0:m.display_name)||x}</span>`}).join(" ");return`
                <tr class="clickable" data-customer-id="${t.pancake_id}" data-customer-name="${t.name||""}">
                    <td style="font-weight:600">${t.name||"—"}</td>
                    <td style="font-size:12px">${h||'<span style="color:var(--text-muted)">—</span>'}</td>
                    <td><span class="tag tag-branch">${$}</span></td>
                    <td style="display:flex;gap:4px;flex-wrap:wrap">${E}</td>
                    <td class="text-right">${v(t.total_conversations)}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${I(t.last_active)}</td>
                </tr>
            `}).join(""),document.querySelectorAll("#cust-body tr.clickable").forEach(t=>{t.addEventListener("click",()=>{k({pancake_id:t.dataset.customerId,name:t.dataset.customerName})})});const l=document.getElementById("cust-pagination");if(l&&o.pagination){const t=o.pagination;l.innerHTML=`
                <button class="btn btn-sm" ${t.page<=1?"disabled":""} onclick="window.__custPage(${t.page-1})">← Trước</button>
                <span style="font-size:12px;color:var(--text-muted);padding:4px 8px">Trang ${t.page}/${t.totalPages} (${v(t.total)} khách)</span>
                <button class="btn btn-sm" ${t.page>=t.totalPages?"disabled":""} onclick="window.__custPage(${t.page+1})">Sau →</button>
            `,window.__custPage=s=>y(s,n)}}catch(a){console.error("Lỗi tải khách hàng:",a)}}export{S as destroy,j as render};
