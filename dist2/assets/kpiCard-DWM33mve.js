function n({label:i,value:l,icon:e,color:s,delta:a}){const d=a?`<span class="kpi-delta ${a.direction}">${a.label}</span>`:"";return`
        <div class="kpi-card">
            <div class="kpi-label">
                <i data-lucide="${e}" style="color:${s}"></i>
                ${i}
            </div>
            <div style="display:flex;align-items:baseline;gap:4px">
                <span class="kpi-value" style="color:${s}">${l}</span>
                ${d}
            </div>
        </div>
    `}function r(i){return`<div class="kpi-grid">${i.join("")}</div>`}export{r as a,n as r};
