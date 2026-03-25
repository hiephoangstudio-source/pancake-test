import{a as w}from"./index-C6vEoKGd.js";import{g as K,a as N,f as d,b as T,c as b,d as j,e as P}from"./format-B1Yfxcsd.js";import{r as u,a as W}from"./kpiCard-DWM33mve.js";import{o as q}from"./conversationModal-_4a_wgJD.js";let m={};function rt(){Object.values(m).forEach(i=>i.destroy()),m={}}async function ct(i,{tagMap:t}){var c;const a=document.getElementById("header-title");a&&(a.textContent="Tổng quan");const e=Object.values(t).filter(l=>l.category==="branch").map(l=>`<option value="${l.tag_name}">${l.display_name}</option>`).join(""),n=Object.values(t).filter(l=>l.category==="staff").map(l=>`<option value="${l.tag_name}">${l.display_name}</option>`).join(""),r=Object.values(t).filter(l=>l.category==="lifecycle").map(l=>`<option value="${l.tag_name}">${l.display_name}</option>`).join(""),o=Object.values(t).filter(l=>l.category==="service").map(l=>`<option value="${l.tag_name}">${l.display_name}</option>`).join(""),h=document.getElementById("header-filters");h&&(h.innerHTML=`
            <div class="filter-group">
                <i data-lucide="clock"></i>
                <select class="filter-select" id="time-preset">
                    <option value="this_month">Tháng này</option>
                    <option value="today">Hôm nay</option>
                    <option value="yesterday">Hôm qua</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_quarter">Quý này</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="building-2"></i>
                <select class="filter-select" id="filter-branch">
                    <option value="">Tất cả CN</option>
                    ${e}
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="user-check"></i>
                <select class="filter-select" id="filter-staff">
                    <option value="">Tất cả NV</option>
                    ${n}
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="activity"></i>
                <select class="filter-select" id="filter-status">
                    <option value="">Trạng thái</option>
                    ${r}
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="camera"></i>
                <select class="filter-select" id="filter-service">
                    <option value="">Dịch vụ</option>
                    ${o}
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="file-text"></i>
                <select class="filter-select" id="page-filter">
                    <option value="">Tất cả trang</option>
                </select>
            </div>
            <button class="btn btn-sm" id="refresh-btn">
                <i data-lucide="refresh-cw"></i> Làm mới
            </button>
        `),i.innerHTML=`
        <div class="kpi-grid" id="kpi-container">
            ${Array(14).fill('<div class="kpi-card"><div class="skeleton" style="height:14px;width:60px;margin-bottom:8px"></div><div class="skeleton" style="height:28px;width:80px"></div></div>').join("")}
        </div>
        <div class="chart-grid chart-grid-3" style="margin-top:12px" id="charts-row-1">
            ${Array(3).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join("")}
        </div>
        <div class="chart-grid chart-grid-2" style="margin-top:12px" id="charts-row-2">
            ${Array(2).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join("")}
        </div>
        <div class="chart-grid chart-grid-3" style="margin-top:12px" id="charts-row-3">
            ${Array(3).fill('<div class="chart-card"><div class="skeleton" style="height:260px"></div></div>').join("")}
        </div>
        <!-- Row 3: Staff Performance Table -->
        <div class="card" style="margin-top:16px">
            <div class="chart-title"><i data-lucide="users-2"></i> Chi tiết nhân viên</div>
            <div id="dash-staff-table" style="margin-top:8px;overflow-x:auto">
                <div class="skeleton" style="height:200px"></div>
            </div>
        </div>
        <!-- Row 4: Customer Detail Table -->
        <div class="card" style="margin-top:16px">
            <div class="chart-title"><i data-lucide="contact-2"></i> Chi tiết khách hàng</div>
            <div id="dash-customer-table" style="margin-top:8px;overflow-x:auto">
                <div class="skeleton" style="height:200px"></div>
            </div>
            <div id="dash-cust-pagination" style="display:flex;gap:8px;justify-content:center;margin-top:12px"></div>
        </div>
    `,window.lucide&&window.lucide.createIcons();try{const l=await w("/pages"),g=document.getElementById("page-filter");g&&l.forEach(y=>{const f=document.createElement("option");f.value=y.page_id,f.textContent=y.name,g.appendChild(f)})}catch{}const s=()=>O(i,t);["time-preset","page-filter","filter-branch","filter-staff","filter-status","filter-service"].forEach(l=>{var g;(g=document.getElementById(l))==null||g.addEventListener("change",s)}),(c=document.getElementById("refresh-btn"))==null||c.addEventListener("click",s),await O(i,t)}async function O(i,t){var y,f,v,x,p,B;const a=((y=document.getElementById("time-preset"))==null?void 0:y.value)||"this_month",e=((f=document.getElementById("page-filter"))==null?void 0:f.value)||"",n=((v=document.getElementById("filter-branch"))==null?void 0:v.value)||"",r=((x=document.getElementById("filter-staff"))==null?void 0:x.value)||"",o=((p=document.getElementById("filter-status"))==null?void 0:p.value)||"",h=((B=document.getElementById("filter-service"))==null?void 0:B.value)||"",{from:s,to:c}=K(a),{prevFrom:l,prevTo:g}=N(s,c);try{let $=`/dashboard/kpis?from=${s}&to=${c}&prevFrom=${l}&prevTo=${g}`;e&&($+=`&pageId=${e}`);const A=await w($);U(A);let E=`/dashboard/trend?from=${s}&to=${c}`;e&&(E+=`&pageId=${e}`);const S=await w(E);let F=`/dashboard/top-campaigns?from=${s}&to=${c}`;e&&(F+=`&pageId=${e}`);const R=await w(F);let _=`/dashboard/staff?from=${s}&to=${c}`;e&&(_+=`&pageId=${e}`);const H=await w(_);G(S,R,H,t,{from:s,to:c,preset:a});const k=[n,r,o,h].filter(Boolean);let L="/dashboard/customers?limit=100";k.length>0&&(L+=`&tag=${encodeURIComponent(k[0])}`);let I=(await w(L)).data||[];k.length>1&&(I=I.filter(z=>{const M=(z.tags||[]).map(C=>typeof C=="string"?C.toLowerCase():(C.name||"").toLowerCase());return k.slice(1).every(C=>M.includes(C.toLowerCase()))})),et(H,I,t,r),at(I,t)}catch($){console.error("Lỗi tải dashboard:",$)}}function U(i){const t=i.current,a=i.prev,e=t.conversations>0?t.phone/t.conversations*100:0,n=t.conversations>0?t.signed/t.conversations*100:0,r=t.inbox>0?t.spend/t.inbox:0,o=[u({label:"HỘI THOẠI",value:d(t.conversations),icon:"message-circle",color:"var(--blue)",delta:a?b(t.conversations,a.conversations):null}),u({label:"KHÁCH HÀNG",value:d(t.customers),icon:"users",color:"var(--green)",delta:a?b(t.customers,a.customers):null}),u({label:"SỐ LƯỢNG SĐT",value:d(t.phone),icon:"phone",color:"var(--orange)",delta:a?b(t.phone,a.phone):null}),u({label:"Tỷ lệ SĐT",value:T(e),icon:"percent",color:"var(--cyan)",delta:a&&a.conversations>0?b(e,a.phone/a.conversations*100):null}),u({label:"Đã chốt",value:d(t.signed),icon:"check-circle",color:"var(--green)",delta:a?b(t.signed,a.signed):null}),u({label:"Tỷ lệ chốt",value:T(n),icon:"target",color:"#10B981",delta:null}),u({label:"Ký online",value:d(t.kyOnline||0),icon:"wifi",color:"#6366F1",delta:a?b(t.kyOnline||0,a.kyOnline||0):null}),u({label:"Ký offline",value:d(t.kyOffline||0),icon:"store",color:"#8B5CF6",delta:a?b(t.kyOffline||0,a.kyOffline||0):null}),u({label:"Hẹn đến",value:d(t.henDen||0),icon:"calendar",color:"#F59E0B",delta:a?b(t.henDen||0,a.henDen||0):null}),u({label:"Mất",value:d(t.lost||0),icon:"user-x",color:"#EF4444",delta:a?b(t.lost||0,a.lost||0):null}),u({label:"Chi phí MKT",value:j(t.spend||0),icon:"wallet",color:"var(--blue)",delta:null}),u({label:"Chi phí / Inbox",value:j(r),icon:"coins",color:"#D946EF",delta:null}),u({label:"Đang chạy",value:d(t.adsRunning||0),icon:"play-circle",color:"#10B981",delta:null}),u({label:"Tạm dừng",value:d(t.adsPaused||0),icon:"pause-circle",color:"#94A3B8",delta:null})],h=document.getElementById("kpi-container");h&&(h.innerHTML=W(o)),window.lucide&&window.lucide.createIcons()}function G(i,t,a,e,n){window.lucide&&window.lucide.createIcons(),Object.values(m).forEach(r=>r&&r.destroy&&r.destroy()),V(i),D(i),X(i),J(i),Q(t),Y(a),Z(a,n),tt(a)}function V(i){var e;const t=document.getElementById("charts-row-1");if(!t)return;t.querySelector("#chart-conversations")||(t.innerHTML=`
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="message-circle" class="text-blue-500"></i> Xu hướng hội thoại</div>
                <div style="height:260px"><canvas id="chart-conversations"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="dollar-sign" class="text-green-500"></i> Xu hướng Đơn chốt</div>
                <div style="height:260px"><canvas id="chart-revenue"></canvas></div>
            </div>
        `,window.lucide&&window.lucide.createIcons());const a=(e=document.getElementById("chart-conversations"))==null?void 0:e.getContext("2d");!a||!i||!i.length||(m.c1=new Chart(a,{type:"bar",data:{labels:i.map(n=>n.label),datasets:[{label:"Hội thoại",data:i.map(n=>n.conversations),backgroundColor:"#3B82F6",borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},datalabels:{display:!1}},scales:{x:{grid:{display:!1},ticks:{font:{size:10}}},y:{grid:{color:"#F1F5F9"},ticks:{font:{size:10}}}}}}))}function D(i){var a;const t=(a=document.getElementById("chart-revenue"))==null?void 0:a.getContext("2d");!t||!i||!i.length||(m.c2=new Chart(t,{type:"bar",data:{labels:i.map(e=>e.label),datasets:[{label:"Đơn chốt",data:i.map(e=>e.signed),backgroundColor:"#10B981",borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},datalabels:{display:!1}},scales:{x:{grid:{display:!1},ticks:{font:{size:10}}},y:{grid:{color:"#F1F5F9"},ticks:{font:{size:10}}}}}}))}function X(i){var e;const t=document.getElementById("charts-row-2");if(!t)return;t.querySelector("#chart-marketing")||(t.innerHTML=`
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="trending-up" class="text-purple-500"></i> Hiệu suất MKT (Inbox vs Hội thoại Ads)</div>
                <div style="height:260px"><canvas id="chart-marketing"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="alert-triangle" class="text-red-500"></i> Xu hướng Sai đối tượng</div>
                <div style="height:260px"><canvas id="chart-wrong-target"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="award" class="text-orange-500"></i> Top 10 Chiến dịch</div>
                <div style="height:260px"><canvas id="chart-top-campaigns"></canvas></div>
            </div>
        `,window.lucide&&window.lucide.createIcons());const a=(e=document.getElementById("chart-marketing"))==null?void 0:e.getContext("2d");!a||!i||!i.length||(m.c3=new Chart(a,{type:"bar",data:{labels:i.map(n=>n.label),datasets:[{type:"line",label:"Inbox",data:i.map(n=>n.messages),borderColor:"#8B5CF6",backgroundColor:"#8B5CF6",yAxisID:"y1",tension:.4},{type:"bar",label:"Hội thoại Ads",data:i.map(n=>n.spend),backgroundColor:"rgba(59,130,246,0.3)",yAxisID:"y",borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{font:{size:11}}},datalabels:{display:!1}},scales:{x:{grid:{display:!1},ticks:{font:{size:10}}},y:{type:"linear",display:!0,position:"left",grid:{color:"#F1F5F9"},title:{display:!0,text:"Hội thoại Ads",font:{size:10}}},y1:{type:"linear",display:!0,position:"right",grid:{drawOnChartArea:!1},title:{display:!0,text:"Inbox",font:{size:10}},min:0}}}}))}function J(i){var a;const t=(a=document.getElementById("chart-wrong-target"))==null?void 0:a.getContext("2d");!t||!i||!i.length||(m.c4=new Chart(t,{type:"bar",data:{labels:i.map(e=>e.label),datasets:[{type:"line",label:"Tỷ lệ Sai ĐT",data:i.map(e=>e.conversations?e.wrongTarget/e.conversations*100:0),borderColor:"#EF4444",backgroundColor:"#EF4444",yAxisID:"y1",tension:.4},{type:"bar",label:"Sai ĐT",data:i.map(e=>e.wrongTarget),backgroundColor:"rgba(239,68,68,0.3)",yAxisID:"y",borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{font:{size:11}}},datalabels:{display:!1}},scales:{x:{grid:{display:!1},ticks:{font:{size:10}}},y:{type:"linear",display:!0,position:"left",grid:{color:"#F1F5F9"}},y1:{type:"linear",display:!0,position:"right",grid:{drawOnChartArea:!1},min:0}}}}))}function Q(i){var e;const t=(e=document.getElementById("chart-top-campaigns"))==null?void 0:e.getContext("2d");if(!t||!i||!i.length)return;const a=[...i].sort((n,r)=>r.conversations-n.conversations).slice(0,10);m.c5=new Chart(t,{type:"bar",data:{labels:a.map(n=>n.name.length>20?n.name.substring(0,20)+"...":n.name),datasets:[{label:"Hội thoại",data:a.map(n=>n.conversations),backgroundColor:"#F59E0B",borderRadius:4}]},options:{indexAxis:"y",responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},datalabels:{display:!1},tooltip:{callbacks:{title:n=>a[n[0].dataIndex].name}}},scales:{x:{grid:{color:"#F1F5F9"},ticks:{font:{size:10}}},y:{grid:{display:!1},ticks:{font:{size:10}}}}}})}function Y(i){var h;const t=document.getElementById("charts-row-3");if(!t)return;t.querySelector("#chart-message-status")||(t.innerHTML=`
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="pie-chart" class="text-indigo-500"></i> Phân bố tin nhắn theo trạng thái</div>
                <div style="height:260px"><canvas id="chart-message-status"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="map" class="text-teal-500"></i> So sánh chi nhánh</div>
                <div style="height:260px"><canvas id="chart-branch-comparison"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><i data-lucide="filter" class="text-cyan-500"></i> Phễu chuyển đổi</div>
                <div id="funnel-container" style="height:260px;overflow-y:auto;padding:8px 0"></div>
            </div>
        `,window.lucide&&window.lucide.createIcons());const a=(h=document.getElementById("chart-message-status"))==null?void 0:h.getContext("2d");if(!a||!i||!i.totals)return;const e=i.totals,n=e.inbox||0,r=e.comment||0,o=Math.max(0,(e.messages||0)-n-r);n+r+o>0&&(m.c6=new Chart(a,{type:"doughnut",data:{labels:["Inbox","Comment","Khác"],datasets:[{data:[n,r,o],backgroundColor:["#3B82F6","#8B5CF6","#94A3B8"],borderWidth:0,cutout:"55%"}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{font:{size:11},padding:12,usePointStyle:!0}},datalabels:{display:!1}}}}))}async function Z(i,t,a){var n;const e=(n=document.getElementById("chart-branch-comparison"))==null?void 0:n.getContext("2d");if(e)try{const r=await w(`/dashboard/branch-summary?from=${t.from}&to=${t.to}`);r.length&&(m.c7=new Chart(e,{type:"bar",data:{labels:r.map(o=>o.display_name),datasets:[{label:"Khách hàng",data:r.map(o=>o.total_customers),backgroundColor:r.map(o=>(o.color||"#3B82F6")+"80"),borderColor:r.map(o=>o.color||"#3B82F6"),borderWidth:1,borderRadius:6,barPercentage:.7},{label:"Đã chốt",data:r.map(o=>o.signed),backgroundColor:"#10B98180",borderColor:"#10B981",borderWidth:1,borderRadius:6,barPercentage:.7}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{font:{size:11}}},datalabels:{display:!1}},scales:{x:{grid:{display:!1},ticks:{font:{size:11}}},y:{grid:{color:"#F1F5F9"},ticks:{font:{size:10}}}}}}))}catch{}}function tt(i){const t=document.getElementById("funnel-container");if(!t||!(i!=null&&i.totals))return;const a=i.totals,e=[{label:"Hội thoại",value:a.conversations,color:"var(--blue)"},{label:"Khách hàng",value:a.customers,color:"#8B5CF6"},{label:"Có SĐT",value:a.phone,color:"var(--orange)"},{label:"Đã chốt",value:a.signed,color:"var(--green)"}],n=Math.max(e[0].value,1);t.innerHTML=`<div class="funnel">${e.map(r=>`
        <div class="funnel-step">
            <div class="funnel-label">${r.label}</div>
            <div class="funnel-bar-wrapper">
                <div class="funnel-bar" style="width:${Math.max(r.value/n*100,3)}%;background:${r.color}">
                    ${d(r.value)}
                </div>
            </div>
            <div class="funnel-count">${r.value>0&&r!==e[0]?T(r.value/e[0].value*100):""}</div>
        </div>
    `).join("")}</div>`}function et(i,t,a,e){const n=document.getElementById("dash-staff-table");if(!n)return;const r=i.staff||[],o=e?r.filter(s=>(s.userName||"").toLowerCase().includes(e.toLowerCase())):r;if(o.length===0){n.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu nhân viên</div>';return}const h={};for(const s of t){const c=(s.tags||[]).map(v=>typeof v=="string"?v:v.name||""),l=c.join(" ").toLowerCase(),g=l.includes("ký")||l.includes("kí")||l.includes("chốt"),y=l.includes("hẹn đến")||l.includes("đã đến"),f=l.includes("sai đối tượng");for(const v of c){const x=Object.values(a).find(p=>p.category==="staff"&&p.tag_name.toLowerCase()===v.toLowerCase());if(x){const p=x.display_name.toLowerCase();h[p]||(h[p]={signed:0,visiting:0,wrong:0}),g&&h[p].signed++,y&&h[p].visiting++,f&&h[p].wrong++}}}n.innerHTML=`<table class="data-table"><thead><tr>
        <th>Nhân viên</th>
        <th class="text-right">Hội thoại</th>
        <th class="text-right">Tin nhắn</th>
        <th class="text-right">Inbox</th>
        <th class="text-right">Comment</th>
        <th class="text-right">Khách hàng</th>
        <th class="text-right">Hẹn đến</th>
        <th class="text-right">Có SĐT</th>
        <th class="text-right">Sai ĐT</th>
        <th class="text-right">Đã chốt</th>
        <th class="text-right">Tỷ lệ chốt</th>
    </tr></thead><tbody>${o.map(s=>{const c=(s.userName||"").toLowerCase();let l=h[c];if(!l){for(const[x,p]of Object.entries(h))if(c.includes(x)||x.includes(c)){l=p;break}}l=l||{};const g=l.signed||s.signed||0,y=l.visiting||0,f=l.wrong||s.wrongTarget||0,v=s.customers>0?g/s.customers*100:0;return`<tr>
            <td style="font-weight:600">${s.userName||"—"}</td>
            <td class="text-right">${d(s.conversations)}</td>
            <td class="text-right">${d(s.messages)}</td>
            <td class="text-right">${d(s.inbox)}</td>
            <td class="text-right">${d(s.comment)}</td>
            <td class="text-right">${d(s.customers)}</td>
            <td class="text-right" style="color:var(--purple)">${d(y)}</td>
            <td class="text-right" style="color:var(--green)">${d(s.phone)}</td>
            <td class="text-right" style="color:var(--red)">${d(f)}</td>
            <td class="text-right" style="color:var(--green);font-weight:600">${d(g)}</td>
            <td class="text-right" style="color:${v>10?"var(--green)":"var(--orange)"}">${T(v)}</td>
        </tr>`}).join("")}
    <tr style="font-weight:700;border-top:2px solid var(--border)">
        <td>Tổng</td>
        <td class="text-right">${d(o.reduce((s,c)=>s+c.conversations,0))}</td>
        <td class="text-right">${d(o.reduce((s,c)=>s+c.messages,0))}</td>
        <td class="text-right">${d(o.reduce((s,c)=>s+c.inbox,0))}</td>
        <td class="text-right">${d(o.reduce((s,c)=>s+c.comment,0))}</td>
        <td class="text-right">${d(o.reduce((s,c)=>s+c.customers,0))}</td>
        <td class="text-right">${d(Object.values(h).reduce((s,c)=>s+c.visiting,0))}</td>
        <td class="text-right">${d(o.reduce((s,c)=>s+c.phone,0))}</td>
        <td class="text-right">${d(Object.values(h).reduce((s,c)=>s+c.wrong,0))}</td>
        <td class="text-right">${d(Object.values(h).reduce((s,c)=>s+c.signed,0))}</td>
        <td class="text-right">—</td>
    </tr>
    </tbody></table>`}function at(i,t){const a=document.getElementById("dash-customer-table");if(a){if(i.length===0){a.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có khách hàng (thay đổi bộ lọc để xem)</div>';return}a.innerHTML=`<table class="data-table"><thead><tr>
        <th>Khách hàng</th>
        <th>SĐT</th>
        <th>Tags</th>
        <th class="text-right">Hội thoại</th>
        <th>Hoạt động cuối</th>
    </tr></thead><tbody>${i.slice(0,50).map(e=>{let n="";if(e.phone)try{const o=typeof e.phone=="string"&&e.phone.startsWith("{")?JSON.parse(e.phone):e.phone;n=typeof o=="object"?o.captured||o.phone_number||"":o}catch{n=e.phone}if(!n&&e.phone_numbers&&e.phone_numbers.length>0){const o=e.phone_numbers[0];n=typeof o=="object"?o.captured||o.phone_number||"":o}const r=(e.tags||[]).slice(0,4).map(o=>{const h=typeof o=="string"?o:o.name||"",s=t[h.toLowerCase()];return`<span class="tag ${s?`tag-${s.category}`:""}">${(s==null?void 0:s.display_name)||h}</span>`}).join(" ");return`<tr class="clickable" data-customer-id="${e.pancake_id}" data-customer-name="${e.name||""}">
            <td style="font-weight:600">${e.name||"—"}</td>
            <td style="font-size:12px">${n||'<span style="color:var(--text-muted)">—</span>'}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap">${r}</td>
            <td class="text-right">${d(e.total_conversations)}</td>
            <td style="font-size:12px;color:var(--text-secondary)">${P(e.last_active)}</td>
        </tr>`}).join("")}</tbody></table>`,a.querySelectorAll("tr.clickable").forEach(e=>{e.addEventListener("click",()=>{q({pancake_id:e.dataset.customerId,name:e.dataset.customerName})})})}}export{rt as destroy,ct as render,G as render8Charts};
