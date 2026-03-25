const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-C6vEoKGd.js","assets/index-DgLaZb3A.css"])))=>i.map(i=>d[i]);
import{_ as f,a as u,b as p,t as g,d as c}from"./index-C6vEoKGd.js";function T(){}async function I(n){var i,a,s,d,y;const e=document.getElementById("header-title");e&&(e.textContent="Cấu hình");const t=document.getElementById("header-filters");t&&(t.innerHTML=""),n.innerHTML=`
        <!-- Master Token + Sync -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="settings-grid">
            <div class="card">
                <div class="chart-title"><i data-lucide="key"></i> Pancake Master Token</div>
                <p style="font-size:12px;color:var(--text-muted);margin:8px 0">Token xác thực API Pancake để đồng bộ dữ liệu.</p>
                <div id="token-status" style="font-size:12px;margin-bottom:8px"></div>
                <input id="master-token-input" placeholder="Nhập master token mới..." type="password"
                    style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;margin-bottom:8px;font-family:monospace" />
                <button class="btn btn-primary" id="save-token-btn" style="width:100%"><i data-lucide="save"></i> Lưu Token</button>
            </div>
            <div class="card">
                <div class="chart-title"><i data-lucide="refresh-cw"></i> Đồng bộ dữ liệu</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                    <button class="btn" id="sync-today-btn"><i data-lucide="zap"></i> Hôm nay</button>
                    <button class="btn" id="sync-week-btn"><i data-lucide="calendar"></i> 7 ngày</button>
                    <button class="btn" id="sync-month-btn"><i data-lucide="calendar-range"></i> 30 ngày</button>
                </div>
                <div id="sync-status" style="margin-top:8px;font-size:12px;color:var(--text-muted)"></div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
                    <div class="chart-title" style="margin-bottom:4px"><i data-lucide="user"></i> Thông tin đăng nhập</div>
                    <div id="user-info" style="font-size:12px;color:var(--text-secondary)"></div>
                </div>
            </div>
        </div>

        <!-- Pages + Tags -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px" class="settings-grid">
            <div class="card">
                <div class="chart-title"><i data-lucide="file-text"></i> Quản lý Pages (Trang Facebook)</div>
                <div id="pages-list" style="margin-top:8px">Đang tải...</div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
                    <h4 style="font-size:12px;font-weight:600;margin-bottom:8px">Thêm trang mới</h4>
                    <input id="new-page-id" placeholder="Page ID" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;margin-bottom:6px" />
                    <input id="new-page-name" placeholder="Tên trang" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;margin-bottom:6px" />
                    <input id="new-page-token" placeholder="Access Token" type="password" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;margin-bottom:6px" />
                    <button class="btn btn-primary" id="add-page-btn" style="width:100%">Thêm trang</button>
                </div>
            </div>
            <div class="card">
                <div class="chart-title"><i data-lucide="tag"></i> Phân loại Tags</div>
                <div id="tags-config" style="margin-top:8px">Đang tải...</div>
            </div>
        </div>
    `,window.lucide&&window.lucide.createIcons();try{const{getUser:o}=await f(async()=>{const{getUser:h}=await import("./index-C6vEoKGd.js").then(b=>b.e);return{getUser:h}},__vite__mapDeps([0,1])),r=o(),v=document.getElementById("user-info");v&&r&&(v.innerHTML=`<strong>${r.name||"Admin"}</strong> · ${r.role||"admin"}`)}catch{}try{const o=document.getElementById("token-status"),r=await u("/sync/status");o&&(o.innerHTML=r!=null&&r.hasToken?'<span style="color:var(--green)">✅ Token đã được cấu hình</span>':'<span style="color:var(--red)">❌ Chưa có token — cần nhập để đồng bộ</span>')}catch{const o=document.getElementById("token-status");o&&(o.innerHTML='<span style="color:var(--text-muted)">Không thể kiểm tra trạng thái</span>')}await l(),await x(),(i=document.getElementById("add-page-btn"))==null||i.addEventListener("click",k),(a=document.getElementById("save-token-btn"))==null||a.addEventListener("click",w),(s=document.getElementById("sync-today-btn"))==null||s.addEventListener("click",()=>m(1)),(d=document.getElementById("sync-week-btn"))==null||d.addEventListener("click",()=>m(7)),(y=document.getElementById("sync-month-btn"))==null||y.addEventListener("click",()=>m(30))}async function l(){try{const n=await u("/pages"),e=document.getElementById("pages-list");if(!e)return;if(n.length===0){e.innerHTML='<div style="color:var(--text-muted);font-size:13px">Chưa có trang nào</div>';return}e.innerHTML=`<table class="data-table"><thead><tr><th>Tên</th><th>Page ID</th><th>Token</th><th>Trạng thái</th></tr></thead><tbody>${n.map(t=>`
            <tr>
                <td>
                    <span class="page-name-display" data-page-id="${t.page_id}" style="font-weight:600;cursor:pointer" title="Click để sửa tên">${t.name}
                        <button class="btn-icon btn-icon-sm page-edit-btn" data-page-id="${t.page_id}" data-page-name="${t.name}" title="Sửa tên">✏️</button>
                    </span>
                    <span class="page-name-edit" data-page-id="${t.page_id}" style="display:none">
                        <input class="inline-edit-input page-name-input" data-page-id="${t.page_id}" value="${t.name}" />
                    </span>
                </td>
                <td style="font-size:11px;color:var(--text-muted)">${t.page_id}</td>
                <td style="font-size:11px">${t._hasToken?"✅ Đã cấu hình":"❌ Chưa có"}</td>
                <td>${t.is_active?'<span class="tag tag-lifecycle">Hoạt động</span>':'<span class="tag" style="color:var(--red)">Tắt</span>'}</td>
            </tr>
        `).join("")}</tbody></table>`,document.querySelectorAll(".page-edit-btn").forEach(t=>{t.addEventListener("click",i=>{i.stopPropagation();const a=t.dataset.pageId;document.querySelector(`.page-name-display[data-page-id="${a}"]`).style.display="none";const s=document.querySelector(`.page-name-edit[data-page-id="${a}"]`);s.style.display="inline-block";const d=s.querySelector("input");d.focus(),d.select()})}),document.querySelectorAll(".page-name-input").forEach(t=>{const i=async()=>{const a=t.dataset.pageId,s=t.value.trim();if(s)try{await p("/sync/page-name",{pageId:a,name:s}),g(`Đã đổi tên → ${s}`),await l()}catch(d){c(d.message)}};t.addEventListener("keydown",a=>{a.key==="Enter"&&i(),a.key==="Escape"&&l()}),t.addEventListener("blur",i)})}catch(n){console.error(n)}}async function x(){try{const n=await u("/tag-config"),e=document.getElementById("tags-config");if(!e)return;const t={};for(const a of n)t[a.category]||(t[a.category]=[]),t[a.category].push(a);const i={branch:"🏢 Chi nhánh",staff:"👤 Nhân viên",lifecycle:"📊 Trạng thái KH",service:"📸 Dịch vụ",location:"📍 Địa điểm chụp"};e.innerHTML=Object.entries(t).map(([a,s])=>`
            <div style="margin-bottom:12px">
                <div style="font-size:12px;font-weight:600;margin-bottom:4px">${i[a]||a} (${s.length})</div>
                <div style="display:flex;flex-wrap:wrap;gap:4px">
                    ${s.map(d=>`<span class="tag tag-${d.category}" style="${d.color?`border-left:3px solid ${d.color}`:""}">${d.display_name||d.tag_name}</span>`).join("")}
                </div>
            </div>
        `).join("")}catch(n){console.error(n)}}async function k(){var i,a,s;const n=(i=document.getElementById("new-page-id"))==null?void 0:i.value,e=(a=document.getElementById("new-page-name"))==null?void 0:a.value,t=(s=document.getElementById("new-page-token"))==null?void 0:s.value;if(!n||!e){c("Vui lòng nhập Page ID và tên");return}try{await p("/pages",{page_id:n,name:e,access_token:t}),g("Đã thêm trang!"),document.getElementById("new-page-id").value="",document.getElementById("new-page-name").value="",document.getElementById("new-page-token").value="",await l()}catch(d){c(d.message)}}async function w(){var e,t;const n=(t=(e=document.getElementById("master-token-input"))==null?void 0:e.value)==null?void 0:t.trim();if(!n){c("Vui lòng nhập master token");return}try{await p("/sync/master-token",{token:n}),g("Đã cập nhật Master Token!"),document.getElementById("master-token-input").value="";const i=document.getElementById("token-status");i&&(i.innerHTML='<span style="color:var(--green)">✅ Token đã được cấu hình</span>')}catch(i){c(i.message)}}async function m(n){const e=document.getElementById("sync-status");e&&(e.textContent=`⏳ Đang đồng bộ ${n} ngày...`);try{await p("/sync/trigger",{days:n}),e&&(e.textContent=`✅ Đã kích hoạt đồng bộ ${n} ngày`),g(`Đã kích hoạt đồng bộ ${n} ngày`)}catch(t){e&&(e.textContent=`❌ Lỗi: ${t.message}`),c(t.message)}}export{T as destroy,I as render};
