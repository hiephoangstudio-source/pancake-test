import{a as s}from"./index-C6vEoKGd.js";import{g as _,f as d}from"./format-B1Yfxcsd.js";import{a as w,r as g}from"./kpiCard-DWM33mve.js";function K(){}async function D(l,{tagMap:n}){var a;const i=document.getElementById("header-title");i&&(i.textContent="Báo cáo Tags");const t=document.getElementById("header-filters");t&&(t.innerHTML=`
            <div class="filter-group">
                <i data-lucide="clock"></i>
                <select class="filter-select" id="tags-time">
                    <option value="this_month">Tháng này</option>
                    <option value="today">Hôm nay</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_quarter">Quý này</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>
        `),l.innerHTML=`
        <div id="tags-kpis" class="kpi-grid" style="margin-bottom:12px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div class="card">
                <div class="chart-title"><i data-lucide="building-2"></i> Chi nhánh (theo tag)</div>
                <div id="branch-tags-table" style="margin-top:8px">Đang tải...</div>
            </div>
            <div class="card">
                <div class="chart-title"><i data-lucide="camera"></i> Dịch vụ (theo tag)</div>
                <div id="service-tags-table" style="margin-top:8px">Đang tải...</div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="card">
                <div class="chart-title"><i data-lucide="activity"></i> Trạng thái KH (lifecycle)</div>
                <div id="lifecycle-tags-table" style="margin-top:8px">Đang tải...</div>
            </div>
            <div class="card">
                <div class="chart-title"><i data-lucide="map-pin"></i> Địa điểm chụp</div>
                <div id="location-tags-table" style="margin-top:8px">Đang tải...</div>
            </div>
        </div>
    `,window.lucide&&window.lucide.createIcons();const e=()=>C(n);(a=document.getElementById("tags-time"))==null||a.addEventListener("change",e),await e()}async function C(l){var e;const n=((e=document.getElementById("tags-time"))==null?void 0:e.value)||"this_month",{from:i,to:t}=_(n);try{const a=await s(`/dashboard/trend?from=${i}&to=${t}`),u=await s("/dashboard/customer-kpis"),o=await s(`/dashboard/branch-summary?from=${i}&to=${t}`),v=document.getElementById("tags-kpis");if(v){const T=o.reduce((r,c)=>r+c.total_customers,0),k=o.reduce((r,c)=>r+c.signed,0),x=o.reduce((r,c)=>r+c.has_phone,0);v.innerHTML=w([g({label:"Tổng KH (có tag CN)",value:d(T),icon:"users",color:"var(--blue)"}),g({label:"Có SĐT",value:d(x),icon:"phone",color:"var(--green)"}),g({label:"Đã chốt (tag)",value:d(k),icon:"check-circle",color:"#10B981"}),g({label:"Chốt (DB)",value:d(u.signed||0),icon:"target",color:"var(--purple)"})]),window.lucide&&window.lucide.createIcons()}h("branch-tags-table",o,[{key:"display_name",label:"Chi nhánh"},{key:"total_customers",label:"Khách",align:"right"},{key:"has_phone",label:"SĐT",align:"right"},{key:"potential",label:"Tiềm năng",align:"right"},{key:"signed",label:"Chốt",align:"right",color:"var(--green)"},{key:"close_rate",label:"Tỷ lệ",align:"right",suffix:"%"}]);const p=await s("/dashboard/tag-counts"),y=m("service",l,p);h("service-tags-table",y,[{key:"display_name",label:"Dịch vụ"},{key:"count",label:"Khách",align:"right"}]);const b=m("lifecycle",l,p);h("lifecycle-tags-table",b,[{key:"display_name",label:"Trạng thái"},{key:"count",label:"Khách",align:"right"}]);const f=m("location",l,p);h("location-tags-table",f,[{key:"display_name",label:"Địa điểm"},{key:"count",label:"Khách",align:"right"}])}catch(a){console.error("Lỗi tải báo cáo tags:",a)}}function m(l,n,i){return Object.values(n).filter(t=>t.category===l).map(t=>({...t,count:i[t.tag_name.toLowerCase()]||0})).sort((t,e)=>e.count-t.count)}function h(l,n,i){const t=document.getElementById(l);if(t){if(!n||n.length===0){t.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu</div>';return}t.innerHTML=`
        <table class="data-table">
            <thead><tr>${i.map(e=>`<th class="${e.align==="right"?"text-right":""}">${e.label}</th>`).join("")}</tr></thead>
            <tbody>${n.map(e=>`
                <tr>${i.map(a=>{const u=e[a.key],o=a.color?`color:${a.color};font-weight:600`:"";return`<td class="${a.align==="right"?"text-right":""}" style="${o}">${u}${a.suffix||""}</td>`}).join("")}</tr>
            `).join("")}</tbody>
        </table>
    `}}export{K as destroy,D as render};
