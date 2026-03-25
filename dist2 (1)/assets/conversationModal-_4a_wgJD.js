import{a as r}from"./index-C6vEoKGd.js";import{e as v}from"./format-B1Yfxcsd.js";let s=null;function y(a){o();const e=a.name||"Khách hàng",t=a.pancake_id||a.id;s=document.createElement("div"),s.className="conv-modal-overlay",s.innerHTML=`
        <div class="conv-modal">
            <div class="conv-modal-header">
                <div>
                    <h3 style="margin:0;font-size:16px;font-weight:700">${e}</h3>
                    <span style="font-size:12px;color:var(--text-muted)">${t||""}</span>
                </div>
                <button class="conv-modal-close" id="conv-modal-close">&times;</button>
            </div>
            <div class="conv-modal-body" id="conv-modal-body">
                <div style="text-align:center;padding:40px;color:var(--text-muted)">
                    <div class="spinner"></div>
                    <div style="margin-top:8px">Đang tải lịch sử tư vấn...</div>
                </div>
            </div>
        </div>
    `,document.body.appendChild(s),document.getElementById("conv-modal-close").addEventListener("click",o),s.addEventListener("click",n=>{n.target===s&&o()}),m(t)}function o(){s&&(s.remove(),s=null)}async function m(a){const e=document.getElementById("conv-modal-body");if(e)try{const t=await r(`/dashboard/customer/${a}/conversations`);if(!t||t.length===0){e.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)">Chưa có lịch sử hội thoại</div>';return}e.innerHTML=`
            <div class="conv-list" id="conv-list">
                ${t.map((n,i)=>`
                    <div class="conv-item ${i===0?"active":""}" data-conv-id="${n.pancake_id}" data-customer-id="${a}">
                        <div class="conv-item-header">
                            <span class="conv-staff">${n.user_name||"Chưa gán"}</span>
                            <span class="conv-date">${v(n.date)}</span>
                        </div>
                        <div class="conv-snippet">${l(n.snippet||"Không có nội dung")}</div>
                        <div class="conv-tags">
                            ${(n.tags||[]).slice(0,3).map(d=>`<span class="tag" style="font-size:10px">${d}</span>`).join(" ")}
                        </div>
                    </div>
                `).join("")}
            </div>
            <div class="conv-messages" id="conv-messages">
                <div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px">
                    ← Chọn hội thoại để xem tin nhắn
                </div>
            </div>
        `,document.querySelectorAll(".conv-item").forEach(n=>{n.addEventListener("click",()=>{document.querySelectorAll(".conv-item").forEach(i=>i.classList.remove("active")),n.classList.add("active"),c(n.dataset.customerId)})}),t.length>0&&c(a)}catch(t){e.innerHTML=`<div style="text-align:center;padding:40px;color:var(--red)">${t.message}</div>`}}async function c(a){const e=document.getElementById("conv-messages");if(e){e.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted)"><div class="spinner"></div></div>';try{const t=await r(`/dashboard/customer/${a}/messages?limit=200`);if(!t||t.length===0){e.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)">Chưa có tin nhắn (cần page token để đồng bộ)</div>';return}e.innerHTML=`
            <div class="msg-list">
                ${t.map(n=>{const i=n.sender_type==="page";return`
                        <div class="msg-bubble ${i?"msg-page":"msg-customer"}">
                            <div class="msg-sender">${n.sender_name||(i?"Trang":"Khách")}</div>
                            <div class="msg-content">${l(n.content||"").replace(/\n/g,"<br>")}</div>
                            ${n.attachments&&n.attachments!=="[]"?g(n.attachments):""}
                            <div class="msg-time">${p(n.created_at)}</div>
                        </div>
                    `}).join("")}
            </div>
        `,e.scrollTop=e.scrollHeight}catch(t){e.innerHTML=`<div style="text-align:center;padding:20px;color:var(--red)">${t.message}</div>`}}}function g(a){try{const e=typeof a=="string"?JSON.parse(a):a;return!Array.isArray(e)||e.length===0?"":e.map(t=>{var n,i;if(t.type==="image"||t.image_data){const d=((n=t.image_data)==null?void 0:n.url)||((i=t.payload)==null?void 0:i.url)||t.url||"";return d?`<div class="msg-attachment"><img src="${d}" alt="Ảnh" style="max-width:200px;border-radius:8px" /></div>`:""}return`<div class="msg-attachment" style="font-size:11px;color:var(--text-muted)">[${t.type||"Tệp đính kèm"}]</div>`}).join("")}catch{return""}}function l(a){return a.replace(/<[^>]*>/g,"").trim()||"Không có nội dung"}function p(a){if(!a)return"";const e=new Date(a);return`${e.getDate()}/${e.getMonth()+1} ${e.getHours().toString().padStart(2,"0")}:${e.getMinutes().toString().padStart(2,"0")}`}export{y as o};
