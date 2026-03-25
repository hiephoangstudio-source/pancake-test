import{a as y,g as E}from"./index-C6vEoKGd.js";import{f as w,e as I}from"./format-B1Yfxcsd.js";function L(){}async function _(h,{tagMap:r}){var n,a;const d=document.getElementById("header-title");d&&(d.textContent="Đơn đã chốt");const i=document.getElementById("header-filters");i&&(i.innerHTML=`
            <div class="filter-group">
                <i data-lucide="search"></i>
                <input type="text" id="order-search" placeholder="Tìm khách, SĐT..." style="border:none;background:transparent;font-size:12px;outline:none;width:160px" />
            </div>
            <div class="filter-group">
                <i data-lucide="file-text"></i>
                <select class="filter-select" id="order-page">
                    <option value="">Tất cả trang</option>
                </select>
            </div>
        `),h.innerHTML=`
        <div id="order-kpis" class="kpi-grid" style="margin-bottom:12px"></div>
        <div class="card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Khách hàng</th>
                        <th>Trang</th>
                        <th>SĐT</th>
                        <th>Chi nhánh</th>
                        <th>Tags</th>
                        <th>Hoạt động cuối</th>
                    </tr>
                </thead>
                <tbody id="order-body">
                    <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Đang tải...</td></tr>
                </tbody>
            </table>
        </div>
    `,window.lucide&&window.lucide.createIcons();try{const m=await y("/pages"),o=document.getElementById("order-page");m.forEach(c=>{const e=document.createElement("option");e.value=c.page_id,e.textContent=c.name,o==null||o.appendChild(e)})}catch{}let s;const g=()=>{clearTimeout(s),s=setTimeout(()=>f(r),300)};(n=document.getElementById("order-search"))==null||n.addEventListener("input",g),(a=document.getElementById("order-page"))==null||a.addEventListener("change",()=>f(r)),await f(r)}async function f(h){var i,s,g;const r=((i=document.getElementById("order-search"))==null?void 0:i.value)||"",d=((s=document.getElementById("order-page"))==null?void 0:s.value)||"";try{let n=`/dashboard/customers?tag=${encodeURIComponent("KÝ,KÍ,CHỐT,KH KÝ ONLINE,KH KÍ OFFLINE")}&limit=200`;r&&(n+=`&search=${encodeURIComponent(r)}`),d&&(n+=`&pageId=${d}`);const a=await y(n),m=document.getElementById("order-kpis");m&&(m.innerHTML=`
                <div class="kpi-card"><div class="kpi-label"><i data-lucide="check-circle"></i>Tổng đơn chốt</div><div class="kpi-value" style="color:var(--green)">${w(((g=a.pagination)==null?void 0:g.total)||0)}</div></div>
            `,window.lucide&&window.lucide.createIcons());const o=document.getElementById("order-body");if(!o)return;if(!a.data||a.data.length===0){o.innerHTML='<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Chưa có đơn chốt</td></tr>';return}let c={};try{(await y("/pages")).forEach(u=>{c[u.page_id]=u.name})}catch{}o.innerHTML=a.data.map(e=>{const u=E(e.tags,h);let l="";if(e.phone)try{const t=typeof e.phone=="string"&&e.phone.startsWith("{")?JSON.parse(e.phone):e.phone;l=typeof t=="object"?t.captured||t.phone_number||"":t}catch{l=e.phone}if(!l&&e.phone_numbers&&e.phone_numbers.length>0){const t=e.phone_numbers[0];l=typeof t=="object"?t.captured||t.phone_number||"":t}const b=c[e.page_id]||e.page_id||"—",x=(e.tags||[]).slice(0,3).map(t=>{const v=typeof t=="string"?t:t.name||"",p=h[v.toLowerCase()];return`<span class="tag ${p?`tag-${p.category}`:""}">${(p==null?void 0:p.display_name)||v}</span>`}).join(" ");return`
                <tr>
                    <td style="font-weight:600">${e.name||"—"}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${b}</td>
                    <td style="font-size:12px">${l||"—"}</td>
                    <td><span class="tag tag-branch">${u}</span></td>
                    <td style="display:flex;gap:4px;flex-wrap:wrap">${x}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${I(e.last_active)}</td>
                </tr>
            `}).join("")}catch(n){console.error("Lỗi tải đơn chốt:",n)}}export{L as destroy,_ as render};
