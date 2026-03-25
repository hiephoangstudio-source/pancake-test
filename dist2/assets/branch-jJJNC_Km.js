import{a as D}from"./index-C6vEoKGd.js";import{g as z,f as i,b as w}from"./format-B1Yfxcsd.js";import{a as K,r as m}from"./kpiCard-DWM33mve.js";import{o as O}from"./conversationModal-_4a_wgJD.js";function q(){}async function G(L,{branch:v,tagMap:_}){var d;const S=v||"Chưa chọn",T=document.getElementById("header-title");T&&(T.textContent=`Chi nhánh ${S}`);const y=document.getElementById("header-filters");y&&(y.innerHTML=`
            <div class="filter-group">
                <i data-lucide="clock"></i>
                <select class="filter-select" id="branch-time">
                    <option value="this_month">Tháng này</option>
                    <option value="today">Hôm nay</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_quarter">Quý này</option>
                    <option value="this_year">Năm nay</option>
                    <option value="all_time">Tất cả</option>
                </select>
            </div>
        `),L.innerHTML=`
        <div id="branch-kpis" class="kpi-grid">
            ${Array(6).fill('<div class="kpi-card"><div class="skeleton" style="height:14px;width:60px;margin-bottom:8px"></div><div class="skeleton" style="height:28px;width:80px"></div></div>').join("")}
        </div>

        <!-- Row 2: Staff Performance Table -->
        <div class="card" style="margin-top:16px">
            <div class="chart-title"><i data-lucide="users-2"></i> Nhân viên chi nhánh</div>
            <div id="branch-staff-table" style="margin-top:8px;overflow-x:auto">
                <div class="skeleton" style="height:200px"></div>
            </div>
        </div>

        <!-- Row 3: Customer Detail Table -->
        <div class="card" style="margin-top:16px">
            <div class="chart-title"><i data-lucide="contact-2"></i> Chi tiết khách hàng</div>
            <div id="branch-customer-table" style="margin-top:8px;overflow-x:auto">
                <div class="skeleton" style="height:200px"></div>
            </div>
            <div id="branch-cust-pagination" style="display:flex;gap:8px;justify-content:center;margin-top:12px"></div>
        </div>

        <!-- Row 4: Conversion Funnel -->
        <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="card">
                <div class="chart-title"><i data-lucide="activity"></i> Phễu chuyển đổi chi nhánh</div>
                <div id="branch-funnel" style="margin-top:8px">
                    <div class="skeleton" style="height:200px"></div>
                </div>
            </div>
            <div class="card" id="branch-extra-stats">
                <div class="chart-title"><i data-lucide="pie-chart"></i> Tỷ lệ</div>
                <div id="branch-rates" style="margin-top:8px">
                    <div class="skeleton" style="height:200px"></div>
                </div>
            </div>
        </div>
    `,window.lucide&&window.lucide.createIcons();const x=()=>A(v,_);(d=document.getElementById("branch-time"))==null||d.addEventListener("change",x),await x()}async function A(L,v){var y,x;const _=((y=document.getElementById("branch-time"))==null?void 0:y.value)||"this_month",{from:S,to:T}=z(_);try{const d=await D(`/dashboard/customers?tag=${encodeURIComponent(L)}&limit=200`),l=((x=d.pagination)==null?void 0:x.total)||0;let f=0,b=0,E=0,H=0,j=0;for(const r of d.data||[]){const s=(r.tags||[]).map(c=>typeof c=="string"?c:c.name||"").join(" ").toLowerCase();(s.includes("ký")||s.includes("kí")||s.includes("chốt"))&&f++,(r.phone||r.phone_numbers&&r.phone_numbers.length>0)&&b++,s.includes("tiềm năng")&&E++,(s.includes("hẹn đến")||s.includes("đã đến"))&&H++,s.includes("sai đối tượng")&&j++}const B=document.getElementById("branch-kpis");if(B){const r=l>0?b/l*100:0,a=l>0?f/l*100:0;B.innerHTML=K([m({label:"Tổng khách",value:i(l),icon:"users",color:"var(--blue)"}),m({label:"Tiềm năng",value:i(E),icon:"star",color:"var(--orange)"}),m({label:"Có SĐT",value:i(b),icon:"phone",color:"var(--green)"}),m({label:"Tỷ lệ SĐT",value:w(r),icon:"percent",color:"var(--cyan)"}),m({label:"Đã chốt",value:i(f),icon:"check-circle",color:"#10B981"}),m({label:"Tỷ lệ chốt",value:w(a),icon:"target",color:"#10B981"})]),window.lucide&&window.lucide.createIcons()}const k=document.getElementById("branch-staff-table");if(k)try{const a=(await D(`/dashboard/staff?from=${S}&to=${T}`)).staff||[],s=new Set;for(const n of d.data||[]){const t=(n.tags||[]).map(e=>typeof e=="string"?e:e.name||"");for(const e of t){const o=Object.values(v).find(u=>u.category==="staff"&&u.tag_name.toLowerCase()===e.toLowerCase());o&&s.add(o.display_name.toLowerCase())}}const c=a.filter(n=>{const t=(n.userName||"").toLowerCase();return s.size>0?s.has(t)||Array.from(s).some(e=>t.includes(e)):!0}),h=c.length>0?c:a;if(h.length===0)k.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có dữ liệu nhân viên</div>';else{const n={};for(const t of d.data||[]){const e=(t.tags||[]).map(p=>typeof p=="string"?p:p.name||""),o=e.join(" ").toLowerCase(),u=o.includes("ký")||o.includes("kí")||o.includes("chốt"),I=o.includes("hẹn đến")||o.includes("đã đến"),M=o.includes("sai đối tượng");for(const p of e){const $=Object.values(v).find(g=>g.category==="staff"&&g.tag_name.toLowerCase()===p.toLowerCase());if($){const g=$.display_name.toLowerCase();n[g]||(n[g]={signed:0,visiting:0,wrong:0}),u&&n[g].signed++,I&&n[g].visiting++,M&&n[g].wrong++}}}k.innerHTML=`<table class="data-table"><thead><tr>
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
                    </tr></thead><tbody>${h.map(t=>{const e=(t.userName||"").toLowerCase();let o=n[e];if(!o){for(const[$,g]of Object.entries(n))if(e.includes($)||$.includes(e)){o=g;break}}o=o||{};const u=o.signed||t.signed||0,I=o.visiting||0,M=o.wrong||t.wrongTarget||0,p=t.customers>0?u/t.customers*100:0;return`<tr>
                            <td style="font-weight:600">${t.userName||"—"}</td>
                            <td class="text-right">${i(t.conversations)}</td>
                            <td class="text-right">${i(t.messages)}</td>
                            <td class="text-right">${i(t.inbox)}</td>
                            <td class="text-right">${i(t.comment)}</td>
                            <td class="text-right">${i(t.customers)}</td>
                            <td class="text-right" style="color:var(--purple)">${i(I)}</td>
                            <td class="text-right" style="color:var(--green)">${i(t.phone)}</td>
                            <td class="text-right" style="color:var(--red)">${i(M)}</td>
                            <td class="text-right" style="color:var(--green);font-weight:600">${i(u)}</td>
                            <td class="text-right" style="color:${p>10?"var(--green)":"var(--orange)"}">${w(p)}</td>
                        </tr>`}).join("")}
                    <tr style="font-weight:700;border-top:2px solid var(--border)">
                        <td>Tổng</td>
                        <td class="text-right">${i(h.reduce((t,e)=>t+e.conversations,0))}</td>
                        <td class="text-right">${i(h.reduce((t,e)=>t+e.messages,0))}</td>
                        <td class="text-right">${i(h.reduce((t,e)=>t+e.inbox,0))}</td>
                        <td class="text-right">${i(h.reduce((t,e)=>t+e.comment,0))}</td>
                        <td class="text-right">${i(h.reduce((t,e)=>t+e.customers,0))}</td>
                        <td class="text-right">${i(H)}</td>
                        <td class="text-right">${i(h.reduce((t,e)=>t+e.phone,0))}</td>
                        <td class="text-right">${i(j)}</td>
                        <td class="text-right">${i(f)}</td>
                        <td class="text-right">—</td>
                    </tr>
                    </tbody></table>`}}catch(r){console.error("Staff data error:",r),k.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:16px">Không thể tải dữ liệu nhân viên</div>'}const C=document.getElementById("branch-customer-table");if(C){const r=d.data||[];r.length===0?C.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:16px">Chưa có khách hàng</div>':(C.innerHTML=`<table class="data-table"><thead><tr>
                    <th>Khách hàng</th>
                    <th>SĐT</th>
                    <th>Tags</th>
                    <th class="text-right">Hội thoại</th>
                    <th>Hoạt động cuối</th>
                </tr></thead><tbody>${r.map(a=>{let s="";if(a.phone)try{const n=typeof a.phone=="string"&&a.phone.startsWith("{")?JSON.parse(a.phone):a.phone;s=typeof n=="object"?n.captured||n.phone_number||"":n}catch{s=a.phone}if(!s&&a.phone_numbers&&a.phone_numbers.length>0){const n=a.phone_numbers[0];s=typeof n=="object"?n.captured||n.phone_number||"":n}const c=(a.tags||[]).slice(0,4).map(n=>{const t=typeof n=="string"?n:n.name||"",e=v[t.toLowerCase()];return`<span class="tag ${e?`tag-${e.category}`:""}">${(e==null?void 0:e.display_name)||t}</span>`}).join(" "),h=n=>{if(!n)return"—";const t=new Date(n);return`${t.getDate()}/${t.getMonth()+1}/${t.getFullYear()}`};return`<tr class="clickable" data-customer-id="${a.pancake_id}" data-customer-name="${a.name||""}">
                        <td style="font-weight:600">${a.name||"—"}</td>
                        <td style="font-size:12px">${s||'<span style="color:var(--text-muted)">—</span>'}</td>
                        <td style="display:flex;gap:4px;flex-wrap:wrap">${c}</td>
                        <td class="text-right">${i(a.total_conversations)}</td>
                        <td style="font-size:12px;color:var(--text-secondary)">${h(a.last_active)}</td>
                    </tr>`}).join("")}</tbody></table>`,C.querySelectorAll("tr.clickable").forEach(a=>{a.addEventListener("click",()=>{O({pancake_id:a.dataset.customerId,name:a.dataset.customerName})})}))}const N=document.getElementById("branch-funnel");if(N){const r=[{label:"Tổng khách",value:l,color:"var(--blue)"},{label:"Tiềm năng",value:E,color:"var(--orange)"},{label:"Hẹn đến",value:H,color:"#8B5CF6"},{label:"Có SĐT",value:b,color:"var(--cyan)"},{label:"Đã chốt",value:f,color:"var(--green)"}],a=Math.max(l,1);N.innerHTML=`<div class="funnel">${r.map(s=>`
                <div class="funnel-step">
                    <div class="funnel-label">${s.label}</div>
                    <div class="funnel-bar-wrapper">
                        <div class="funnel-bar" style="width:${Math.max(s.value/a*100,3)}%;background:${s.color}">${i(s.value)}</div>
                    </div>
                    <div class="funnel-count">${l>0?w(s.value/l*100):""}</div>
                </div>
            `).join("")}</div>`}const R=document.getElementById("branch-rates");if(R){const r=l>0?b/l*100:0,a=l>0?f/l*100:0,s=l>0?j/l*100:0;R.innerHTML=`
                <div style="display:flex;flex-direction:column;gap:12px">
                    ${[{label:"Tỷ lệ có SĐT",value:r,color:"var(--green)"},{label:"Tỷ lệ chốt",value:a,color:"var(--blue)"},{label:"Tỷ lệ sai ĐT",value:s,color:"var(--red)"}].map(c=>`
                        <div>
                            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                                <span>${c.label}</span>
                                <span style="font-weight:600;color:${c.color}">${w(c.value)}</span>
                            </div>
                            <div style="height:8px;background:var(--border-light);border-radius:4px;overflow:hidden">
                                <div style="height:100%;width:${Math.min(c.value,100)}%;background:${c.color};border-radius:4px;transition:width 0.5s"></div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `}}catch(d){console.error("Lỗi tải chi nhánh:",d)}}export{q as destroy,G as render};
