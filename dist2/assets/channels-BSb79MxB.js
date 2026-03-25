import{a as E}from"./index-C6vEoKGd.js";import{g as N,d as g,f as a,b as T}from"./format-B1Yfxcsd.js";import{a as B,r as n}from"./kpiCard-DWM33mve.js";let $={};function S(){Object.values($).forEach(p=>p.destroy()),$={}}async function q(p,{tagMap:b}){var u,i;const m=document.getElementById("header-title");m&&(m.textContent="Hiệu quả kênh quảng cáo");const f=document.getElementById("header-filters");f&&(f.innerHTML=`
            <div class="filter-group">
                <i data-lucide="clock"></i>
                <select class="filter-select" id="ch-time">
                    <option value="this_month">Tháng này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_quarter">Quý này</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>
            <div class="filter-group">
                <i data-lucide="file-text"></i>
                <select class="filter-select" id="ch-page">
                    <option value="">Tất cả trang</option>
                </select>
            </div>
        `),p.innerHTML=`
        <div id="ch-kpis" class="kpi-grid" style="margin-bottom:12px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div class="card">
                <div class="chart-title"><i data-lucide="megaphone"></i> Phễu quảng cáo</div>
                <div id="ads-funnel" style="margin-top:8px"></div>
            </div>
            <div class="card">
                <div class="chart-title"><i data-lucide="bar-chart-3"></i> So sánh Pages (chi phí)</div>
                <div style="height:260px"><canvas id="page-spend-chart"></canvas></div>
            </div>
        </div>
        <div class="card">
            <div class="chart-title"><i data-lucide="list"></i> Danh sách chiến dịch QC</div>
            <table class="data-table" id="campaigns-table">
                <thead>
                    <tr>
                        <th>Tên chiến dịch</th>
                        <th>Trang</th>
                        <th class="text-right">Chi phí</th>
                        <th class="text-right">Hiển thị</th>
                        <th class="text-right">Click</th>
                        <th class="text-right">Hội thoại</th>
                        <th class="text-right">SĐT</th>
                        <th class="text-right">Chi phí/SĐT</th>
                        <th class="text-center">Trạng thái</th>
                    </tr>
                </thead>
                <tbody id="campaigns-body">
                    <tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">Đang tải...</td></tr>
                </tbody>
            </table>
        </div>
    `,window.lucide&&window.lucide.createIcons();try{const d=await E("/pages"),l=document.getElementById("ch-page");d.forEach(o=>{const e=document.createElement("option");e.value=o.page_id,e.textContent=o.name,l==null||l.appendChild(e)})}catch{}const r=()=>M();(u=document.getElementById("ch-time"))==null||u.addEventListener("change",r),(i=document.getElementById("ch-page"))==null||i.addEventListener("change",r),await r()}async function M(){var r,u;const p=((r=document.getElementById("ch-time"))==null?void 0:r.value)||"this_month",b=((u=document.getElementById("ch-page"))==null?void 0:u.value)||"",{from:m,to:f}=N(p);try{let i=`/channels?from=${m}&to=${f}`;b&&(i+=`&pageId=${b}`);const d=await E(i),l=Array.isArray(d)?d:d.data||d.channels||[];let o=0,e=0,h=0,y=0,v=0;for(const t of l)o+=Number(t.spend||0),e+=Number(t.impressions||0),h+=Number(t.clicks||0),y+=Number(t.conversations||0),v+=Number(t.phones||0);const I=h>0?o/h:0,k=v>0?o/v:0,H=e>0?h/e*100:0,C=document.getElementById("ch-kpis");C&&(C.innerHTML=B([n({label:"Tổng chi QC",value:g(o),icon:"wallet",color:"var(--blue)"}),n({label:"Hiển thị",value:a(e),icon:"eye",color:"#8B5CF6"}),n({label:"Click",value:a(h),icon:"mouse-pointer",color:"var(--orange)"}),n({label:"CTR",value:T(H),icon:"percent",color:"var(--cyan)"}),n({label:"Hội thoại",value:a(y),icon:"message-circle",color:"var(--blue)"}),n({label:"SĐT",value:a(v),icon:"phone",color:"var(--green)"}),n({label:"CPC",value:g(I),icon:"coins",color:"var(--orange)"}),n({label:"Chi phí/SĐT",value:g(k),icon:"target",color:"var(--red)"})]),window.lucide&&window.lucide.createIcons());const w=document.getElementById("ads-funnel");if(w){const t=[{label:"Hiển thị",value:e,color:"#8B5CF6"},{label:"Click",value:h,color:"var(--orange)"},{label:"Hội thoại",value:y,color:"var(--blue)"},{label:"Có SĐT",value:v,color:"var(--green)"}],s=Math.max(e,1);w.innerHTML=`<div class="funnel">${t.map(c=>`
                <div class="funnel-step">
                    <div class="funnel-label">${c.label}</div>
                    <div class="funnel-bar-wrapper">
                        <div class="funnel-bar" style="width:${Math.max(c.value/s*100,2)}%;background:${c.color}">${a(c.value)}</div>
                    </div>
                    <div class="funnel-count">${e>0?T(c.value/e*100):""}</div>
                </div>
            `).join("")}</div>`}const x=document.getElementById("campaigns-body");x&&(l.length===0?x.innerHTML='<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">Chưa có dữ liệu quảng cáo</td></tr>':x.innerHTML=l.sort((t,s)=>Number(s.spend||0)-Number(t.spend||0)).map(t=>{const s=Number(t.phones)>0?Number(t.spend)/Number(t.phones):0,c=t.status==="ACTIVE"?"var(--green)":"var(--text-muted)";return`
                        <tr>
                            <td style="font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name||t.ad_id}</td>
                            <td style="font-size:12px;color:var(--text-secondary)">${t.pageName||t.page_id||"—"}</td>
                            <td class="text-right" style="font-weight:600">${g(t.spend)}</td>
                            <td class="text-right">${a(t.impressions)}</td>
                            <td class="text-right">${a(t.clicks)}</td>
                            <td class="text-right">${a(t.conversations)}</td>
                            <td class="text-right">${a(t.phones)}</td>
                            <td class="text-right" style="color:${s>5e5?"var(--red)":"var(--green)"}; font-weight:600">${s>0?g(s):"—"}</td>
                            <td class="text-center"><span class="tag" style="color:${c}">${t.status||"—"}</span></td>
                        </tr>`}).join(""))}catch(i){console.error("Lỗi tải kênh QC:",i)}}export{S as destroy,q as render};
