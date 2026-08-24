// ─── RAM Gauge ────────────────────────────────────────────────
function updateRamGauge(pct, usedGB, totalGB, commitGB, standbyGB) {
    const circle = document.getElementById('ramGaugeCircle')
    if (!circle) return

    const circumference = 2 * Math.PI * 80
    circle.style.strokeDashoffset = circumference - (pct / 100) * circumference

    if (pct >= 85) circle.setAttribute('stroke', 'url(#ramGradDanger)')
    else if (pct >= 65) circle.setAttribute('stroke', 'url(#ramGradWarn)')
    else circle.setAttribute('stroke', 'url(#ramGrad)')

    const pctEl = document.getElementById('ram-gauge-pct')
    if (pctEl) {
        pctEl.textContent = pct + '%'
        pctEl.style.backgroundImage = pct >= 85
            ? 'linear-gradient(135deg,var(--text),var(--text))'
            : pct >= 65
            ? 'linear-gradient(135deg,var(--text),var(--text))'
            : 'linear-gradient(135deg,var(--text),var(--text))'
    }

    const total = parseFloat(totalGB) || 16
    const used  = parseFloat(usedGB)  || (total * pct / 100)
    const free  = (total - used).toFixed(1)

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    const setW = (id, w) => { const el = document.getElementById(id); if (el) el.style.width = w + '%' }

    set('ram-gauge-abs',  parseFloat(used).toFixed(1) + ' GB')
    set('ram-total-disp', parseFloat(total).toFixed(1) + ' GB')
    set('ram-used',       parseFloat(used).toFixed(1) + ' GB')
    set('ram-free',       free + ' GB')
    set('ram-used-badge', pct + '%')
    set('ram-free-badge', Math.round(100 - pct) + '%')
    setW('ram-used-bar', pct)
    setW('ram-free-bar', 100 - pct)

    if (commitGB) {
        set('ram-commit', parseFloat(commitGB).toFixed(1) + ' GB')
        setW('ram-commit-bar', Math.min((parseFloat(commitGB) / parseFloat(total)) * 100, 100))
    }
    if (standbyGB) {
        set('ram-standby', parseFloat(standbyGB).toFixed(1) + ' GB')
        setW('ram-standby-bar', Math.min((parseFloat(standbyGB) / parseFloat(total)) * 100, 100))
    }

    // Health badge (not in HTML v2 directly but update status badge)
    const sbadge = document.getElementById('statusBadge')
    const stext  = document.getElementById('statusText')
    if (pct >= 85 && sbadge && stext) {
        sbadge.className = 'status-badge danger'
        stext.textContent = 'RAM Critical'
    }
}


// ─── Disk I/O Section ─────────────────────────────────────────
async function loadDiskIO() {
    const data = await invoke('get-disk-io')
    if (!data) return
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    set('disk-read-val',  data.readSec)
    set('disk-write-val', data.writeSec)
    set('disk-tio-val',   data.tIO)
    if (latestStats) set('disk-fill-val', latestStats.diskPct + '%')
}


// ─── Thermal ──────────────────────────────────────────────────
async function loadThermal() {}   // data already from live poll
async function loadThermalDiag() {
    const data = await invoke('get-thermal')
    if (!data) return
    if (data.cpuFreq) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
        const setW = (id, w) => { const el = document.getElementById(id); if (el) el.style.width = w + '%' }
        set('tc2-cpu-freq', parseFloat(data.cpuFreq).toFixed(2) + ' GHz')
        setW('tc2-freq-bar', Math.min((data.cpuFreq / 5) * 100, 100))
        set('tc2-freq-status', 'Clock speed')
    }
}


// ─── Network Monitor ──────────────────────────────────────────
async function loadNetworkMonitor() {
    const data = await invoke('get-network-diagnostics')
    if (!data) return
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    if (data.ping)  set('net-ping-val', data.ping.toFixed(0) + ' ms')
    if (data.dnsMs) set('net-dns-val',  data.dnsMs.toFixed(0) + ' ms')
    set('net-dl-val', (data.rx || 0) + ' KB/s')
    set('net-ul-val', (data.tx || 0) + ' KB/s')

    const grid = document.getElementById('netAdapterInfo')
    if (grid && data.iface) {
        const { name, ip, mac, speed, type } = data.iface
        grid.innerHTML = `
            <div class="adapter-info-item"><div class="ai-label">Adapter</div><div class="ai-val">${name || '--'}</div></div>
            <div class="adapter-info-item"><div class="ai-label">IP Address</div><div class="ai-val">${ip || '--'}</div></div>
            <div class="adapter-info-item"><div class="ai-label">MAC Address</div><div class="ai-val">${mac || '--'}</div></div>
            <div class="adapter-info-item"><div class="ai-label">Speed</div><div class="ai-val">${speed ? speed + ' Mbps' : '--'}</div></div>
            <div class="adapter-info-item"><div class="ai-label">Type</div><div class="ai-val">${type || '--'}</div></div>
            <div class="adapter-info-item"><div class="ai-label">Gateway</div><div class="ai-val">${data.gateway || '--'}</div></div>
        `
    }
}


// ─── Disk Health ─────────────────────────────────────────────
async function loadDiskHealth() {
    const grid    = document.getElementById('diskHealthGrid')
    const optArea = document.getElementById('driveOptActions')
    if (!grid) return

    const data = await invoke('get-disk-health')
    if (!data || !data.drives || !data.drives.length) {
        grid.innerHTML = '<div class="dc-loading">Could not detect drives.</div>'
        return
    }

    const typeColors = { SSD: 'var(--text)', HDD: 'var(--text)' }

    grid.innerHTML = ''
    data.drives.forEach(d => {
        const col = typeColors[d.type] || 'var(--text)'
        const card = document.createElement('div')
        card.className = 'dc-card'
        card.innerHTML = `
            <div class="dc-card-accent" style="background:${col}"></div>
            <div class="dc-card-top">
                <div class="dc-card-icon" style="background:${col}20;border:1px solid ${col}40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                </div>
                <div class="dc-card-meta"><h4>${d.name}</h4><span class="dc-card-loc">${d.vendor || ''} · ${d.interfaceType}</span></div>
                <div class="dc-card-size" style="color:${col}">${d.size}</div>
            </div>
            <div class="dc-card-desc">
                Type: <strong>${d.type}</strong> · SMART: <strong>${d.smartStatus}</strong>
                ${d.type === 'SSD' && data.trimEnabled !== null ? `· TRIM: <strong>${data.trimEnabled ? '✓ Enabled' : '⚠ Disabled'}</strong>` : ''}
                ${d.temperature ? `· Temp: <strong>${d.temperature}°C</strong>` : ''}
                ${d.type === 'HDD' ? '<br><small>⚠ Do not run traditional defragmentation on SSDs.</small>' : ''}
            </div>
        `
        grid.appendChild(card)
    })

    // Optimization buttons
    if (optArea) {
        optArea.innerHTML = ''
        data.drives.forEach(d => {
            const btn = document.createElement('button')
            btn.className = 'drive-opt-btn'
            btn.textContent = d.type === 'SSD'
                ? `⚡ Optimize ${d.name} (TRIM / Re-trim)`
                : `🔧 Defragment ${d.name}`
            btn.addEventListener('click', async () => {
                btn.textContent = 'Running...'
                btn.disabled = true
                await invoke('optimize-drive', { drive: d.name, isSSD: d.type === 'SSD' })
                btn.textContent = '✓ Done'
                addLog(`Drive optimized: ${d.name}`, 'success')
            })
            optArea.appendChild(btn)
        })
    }
}


// ─── Network Diagnostics ─────────────────────────────────────
document.getElementById('netDiagRunBtn')?.addEventListener('click', async function () {
    this.textContent = 'Running diagnostics...'
    this.disabled = true
    const data = await invoke('get-network-diagnostics')
    this.textContent = 'Run Network Diagnostics'
    this.disabled = false

    const results = document.getElementById('netDiagResults')
    if (!results) return

    if (!data) {
        results.innerHTML = '<div class="dc-loading">Could not run network diagnostics.</div>'
        return
    }

    const pingStatus  = !data.ping ? 'ndc-bad' : data.ping < 30 ? 'ndc-good' : data.ping < 80 ? 'ndc-warn' : 'ndc-bad'
    const dnsStatus   = !data.dnsMs ? 'ndc-bad' : data.dnsMs < 50 ? 'ndc-good' : data.dnsMs < 150 ? 'ndc-warn' : 'ndc-bad'

    results.innerHTML = `
        <div class="net-diag-card"><span class="ndc-icon">📡</span><div><div class="ndc-label">Ping (8.8.8.8)</div><div class="ndc-val">${data.ping ? data.ping.toFixed(0) + ' ms' : 'Failed'}</div></div><span class="ndc-status ${pingStatus}">${!data.ping ? 'No connectivity' : data.ping < 30 ? '✓ Excellent' : data.ping < 80 ? '⚠ Moderate' : '⚠ High latency'}</span></div>
        <div class="net-diag-card"><span class="ndc-icon">🌐</span><div><div class="ndc-label">DNS Resolution Time</div><div class="ndc-val">${data.dnsMs ? data.dnsMs.toFixed(0) + ' ms' : 'N/A'}</div></div><span class="ndc-status ${dnsStatus}">${!data.dnsMs ? 'N/A' : data.dnsMs < 50 ? '✓ Fast' : data.dnsMs < 150 ? '⚠ Slow DNS' : '⚠ Very slow DNS'}</span></div>
        <div class="net-diag-card"><span class="ndc-icon">⬇️</span><div><div class="ndc-label">Download Rate</div><div class="ndc-val">${data.rx} KB/s</div></div><span class="ndc-status ndc-good">Live data</span></div>
        <div class="net-diag-card"><span class="ndc-icon">⬆️</span><div><div class="ndc-label">Upload Rate</div><div class="ndc-val">${data.tx} KB/s</div></div><span class="ndc-status ndc-good">Live data</span></div>
        ${data.iface ? `<div class="net-diag-card"><span class="ndc-icon">🔌</span><div><div class="ndc-label">Adapter: ${data.iface.name}</div><div class="ndc-val">${data.iface.ip || 'No IP'}</div><div style="font-size:11px;color:var(--text3)">${data.iface.type} · ${data.iface.speed ? data.iface.speed + ' Mbps' : ''}  · Gateway: ${data.gateway || '--'}</div></div></div>` : ''}
    `
})

// Network tool buttons
const netActions = { 'net-dns': 'net-flush-dns', 'net-winsock': 'net-reset-winsock', 'net-ip': 'net-renew-ip', 'net-tcp': 'net-reset-tcp' }
const netLabels  = { 'net-dns': 'DNS cache flushed', 'net-winsock': 'Winsock reset (restart required)', 'net-ip': 'IP released and renewed', 'net-tcp': 'TCP/IP stack reset (restart required)' }
document.querySelectorAll('[data-action^="net-"]').forEach(btn => {
    btn.addEventListener('click', async function () {
        if (this.classList.contains('running')) return
        const orig = this.textContent
        this.classList.add('running'); this.textContent = 'Running...'
        await invoke(netActions[this.dataset.action])
        this.classList.remove('running'); this.classList.add('done'); this.textContent = '✓ Done'
        addLog(netLabels[this.dataset.action], 'success')
        const panel = document.getElementById('net-result')
        if (panel) { panel.style.display = 'block'; panel.querySelector('.result-body').innerHTML = `<div class="result-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>${netLabels[this.dataset.action]}</div>` }
        setTimeout(() => { this.classList.remove('done'); this.textContent = orig }, 4000)
    })
})


// ─── GPU Monitor ──────────────────────────────────────────────
async function loadGpuMonitor() {
    // Pull static GPU info from systeminformation
    const data = await invoke('get-smart-profile')
    if (data && data.gpu) {
        const nameEl = document.getElementById('gm-model-name')
        const vendorEl = document.getElementById('gm-model-vendor')
        if (nameEl) nameEl.textContent = data.gpu
        if (vendorEl) {
            const v = data.gpu.toLowerCase()
            vendorEl.textContent = v.includes('nvidia') ? 'NVIDIA Corporation' : v.includes('amd') || v.includes('radeon') ? 'Advanced Micro Devices' : v.includes('intel') ? 'Intel Corporation' : ''
        }
    }

    // Pull extended GPU data
    const gd = await invoke('get-thermal')  // reuse thermal which includes GPU data
    if (gd) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
        if (gd.gpuDriver)   set('gm-spec-driver',    gd.gpuDriver)
        if (gd.gpuBus)      set('gm-spec-bus',        gd.gpuBus)
        if (gd.gpuVendor)   set('gm-spec-subvendor',  gd.gpuVendor)
    }

    // Populate from live stats that are already cached
    if (typeof latestStats !== 'undefined' && latestStats) updateGpuMonitorLive(latestStats)
}

function updateGpuMonitorLive(data) {
    if (!data) return
    const set  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    const setW = (id, w)   => { const el = document.getElementById(id); if (el) el.style.width = Math.min(w, 100) + '%' }

    // ── Load ring ──
    const load = data.gpuLoad ?? 0
    const ring = document.getElementById('gpuLoadCircle')
    if (ring) ring.style.strokeDashoffset = 314 - (load / 100) * 314

    set('gm-load',      load + ' %')
    set('gm-ring-load', load + '%')
    set('gm-load-pct',  load + '%')
    setW('gm-load-bar', load)

    // ── Temperature ──
    const temp = data.gpuTemp ?? null
    if (temp !== null) {
        set('gm-temp',     temp + ' °C')
        set('gm-temp-pct', temp + ' °C')
        setW('gm-temp-bar', (temp / 100) * 100)

        // Thermal row
        set('gm-th-current', temp + ' °C')
        const isHot  = temp >= 90
        const isWarm = temp >= 75
        const statusEl   = document.getElementById('gm-th-status')
        const throttleEl = document.getElementById('gm-th-throttle')
        const summaryEl  = document.getElementById('gm-thermal-summary')
        const warnEl     = document.getElementById('gmThermalWarn')
        const badge      = document.getElementById('gm-status-badge')
        const dot        = document.getElementById('gm-status-dot')
        const statusTxt  = document.getElementById('gm-status-text')

        if (statusEl)   statusEl.textContent   = isHot ? '🔴 Danger' : isWarm ? '🟡 Warm' : '🟢 Normal'
        if (throttleEl) throttleEl.textContent = isHot ? '⚠ HIGH RISK' : isWarm ? 'Possible' : 'None'
        if (statusEl)   statusEl.style.color   = isHot ? 'var(--text)' : isWarm ? 'var(--text)' : 'var(--text)'
        if (throttleEl) throttleEl.style.color  = isHot ? 'var(--text)' : isWarm ? 'var(--text)' : 'var(--text)'
        if (summaryEl)  summaryEl.textContent   = isHot ? '⚠ CRITICAL — Throttling risk' : isWarm ? '⚠ Above optimal — check airflow' : '✓ Temperature nominal'
        if (warnEl)     warnEl.style.display    = isHot ? 'flex' : 'none'

        if (badge) {
            badge.className = 'gpu-status-badge' + (isHot ? ' hot' : isWarm ? ' warn' : '')
        }
        if (dot) {
            dot.style.background   = isHot ? 'var(--text)' : isWarm ? 'var(--text)' : 'var(--text)'
            dot.style.boxShadow    = isHot ? '0 0 7px var(--text)' : isWarm ? '0 0 7px var(--text)' : '0 0 7px var(--text)'
        }
        if (statusTxt) statusTxt.textContent = isHot ? '⚠ GPU Overheating' : isWarm ? '⚠ Running Warm' : '✓ Temperature OK'
    } else {
        set('gm-temp', 'N/A °C')
        set('gm-th-current', 'N/A')
        const summaryEl = document.getElementById('gm-thermal-summary')
        if (summaryEl) summaryEl.textContent = 'Temperature data not available'
    }

    // ── VRAM ──
    const vramUsed  = data.vramUsed  ? (data.vramUsed  / 1024).toFixed(2) : null
    const vramTotal = data.vramTotal ? (data.vramTotal / 1024).toFixed(2) : null
    if (vramUsed && vramTotal) {
        const pct = Math.min((data.vramUsed / data.vramTotal) * 100, 100)
        set('gm-vram-used',        vramUsed + ' GB')
        set('gm-vram-total',       vramTotal + ' GB')
        set('gm-vram-label',       vramUsed + ' / ' + vramTotal + ' GB')
        set('gm-vram-total-label', vramTotal + ' GB')
        set('gm-spec-vram',        vramTotal + ' GB')
        setW('gm-vram-bar', pct)

        // Segments
        const segs = document.getElementById('gmVramSegments')
        if (segs) {
            segs.innerHTML = `
                <span class="gpu-vram-seg"><i style="background:var(--text)"></i>Used: ${vramUsed} GB</span>
                <span class="gpu-vram-seg"><i style="background:rgba(255,255,255,0.12)"></i>Free: ${(parseFloat(vramTotal) - parseFloat(vramUsed)).toFixed(2)} GB</span>
            `
        }
    } else {
        set('gm-vram-used', 'N/A')
        set('gm-vram-label', 'Not available')
    }

    // ── Top bar stat cards ──
    set('gm-load', (data.gpuLoad ?? '--') + (data.gpuLoad !== undefined ? ' %' : ''))
    if (data.gpuName) set('gm-model-name', data.gpuName)

    // Clock/power/fan are only available via nvidia-smi or WMI — mark if not present
    const noData = 'N/A'
    const clockEl = document.getElementById('gm-core-clock')
    if (clockEl && clockEl.textContent === '--') clockEl.textContent = noData
    const memClockEl = document.getElementById('gm-mem-clock')
    if (memClockEl && memClockEl.textContent === '--') memClockEl.textContent = noData
    const powerEl = document.getElementById('gm-power')
    if (powerEl && powerEl.textContent === '--') powerEl.textContent = noData
    const fanEl = document.getElementById('gm-fan')
    if (fanEl && fanEl.textContent === '--') fanEl.textContent = noData
}

document.getElementById('nvPresetToggle')?.addEventListener('change', async function() {
    const statusText = document.getElementById('nvPresetStatus')
    this.disabled = true
    if (statusText) statusText.textContent = this.checked ? 'Applying...' : 'Restoring...'
    
    const result = await invoke('toggle-nvidia-preset', { enable: this.checked })
    
    this.disabled = false
    if (this.checked) {
        if (statusText) { statusText.textContent = 'Active'; statusText.style.color = 'var(--text)' }
        addLog('NVIDIA Performance Mode applied', 'success')
    } else {
        if (statusText) { statusText.textContent = 'Inactive'; statusText.style.color = 'var(--text3)' }
        addLog('NVIDIA defaults restored', 'info')
    }
})


