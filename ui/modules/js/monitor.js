// ─── RAM Gauge ────────────────────────────────────────────────
function updateRamGauge(pct, usedGB, totalGB, commitGB, standbyGB, modifiedGB, availableGB) {
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
    const available = Number(availableGB)
    const free  = (Number.isFinite(available) ? available : total - used).toFixed(1)

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    const setW = (id, w) => { const el = document.getElementById(id); if (el) el.style.width = w + '%' }

    set('ram-gauge-abs',  parseFloat(used).toFixed(1) + ' GB')
    set('ram-total-disp', parseFloat(total).toFixed(1) + ' GB')
    set('ram-used',       parseFloat(used).toFixed(1) + ' GB')
    set('ram-free',       free + ' GB')
    set('ram-used-badge', pct + '%')
    set('ram-free-badge', Math.round((parseFloat(free) / total) * 100) + '%')
    setW('ram-used-bar', pct)
    setW('ram-free-bar', (parseFloat(free) / total) * 100)

    if (commitGB) {
        set('ram-commit', parseFloat(commitGB).toFixed(1) + ' GB')
        setW('ram-commit-bar', Math.min((parseFloat(commitGB) / parseFloat(total)) * 100, 100))
    }
    if (standbyGB !== undefined && standbyGB !== null) {
        set('ram-standby', parseFloat(standbyGB).toFixed(1) + ' GB')
        setW('ram-standby-bar', Math.min((parseFloat(standbyGB) / parseFloat(total)) * 100, 100))
    }
    if (modifiedGB !== undefined && modifiedGB !== null) {
        set('ram-modified', parseFloat(modifiedGB).toFixed(1) + ' GB')
        setW('ram-modified-bar', Math.min((parseFloat(modifiedGB) / parseFloat(total)) * 100, 100))
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
const diskSamples = []
let diskMonitorTimer = null
let diskMonitorLoading = false
const DISK_HISTORY_LIMIT = 30

function diskText(id, value) {
    const element = document.getElementById(id)
    if (element) element.textContent = value
}

function diskFormatNumber(value, fractionDigits = 0) {
    return Number.isFinite(Number(value))
        ? Number(value).toLocaleString(undefined, { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits })
        : '--'
}

function diskFormatBytes(bytes) {
    const value = Math.max(0, Number(bytes) || 0)
    const unit = value >= 1e12 ? 'TB' : 'GB'
    const divisor = unit === 'TB' ? 1e12 : 1e9
    return `${(value / divisor).toFixed(1)} ${unit}`
}

function renderDiskDrives(drives = []) {
    const grid = document.getElementById('disk-drive-grid')
    if (!grid) return
    grid.replaceChildren()
    if (!drives.length) {
        const empty = document.createElement('div')
        empty.className = 'disk-empty-state'
        empty.textContent = 'No mounted volumes detected.'
        grid.appendChild(empty)
        return
    }

    drives.slice(0, 8).forEach(drive => {
        const card = document.createElement('article')
        card.className = 'disk-drive-card'
        const head = document.createElement('div')
        head.className = 'disk-drive-head'
        const icon = document.createElement('div')
        icon.className = 'disk-drive-icon'
        icon.textContent = String(drive.mount || '?').replace(/[\\/]/g, '').slice(0, 2) || '?'
        const identity = document.createElement('div')
        identity.className = 'disk-drive-identity'
        const name = document.createElement('strong')
        name.textContent = drive.label || drive.mount || 'Volume'
        const detail = document.createElement('span')
        detail.textContent = [drive.model, drive.protocol].filter(Boolean).join(' · ') || drive.mount || 'Mounted volume'
        const percent = document.createElement('b')
        percent.textContent = `${Math.round(drive.usePercent || 0)}%`
        identity.append(name, detail)
        head.append(icon, identity, percent)
        const track = document.createElement('div')
        track.className = 'disk-drive-track'
        const fill = document.createElement('i')
        fill.style.width = `${Math.min(100, Math.max(0, Number(drive.usePercent) || 0))}%`
        track.appendChild(fill)
        const footer = document.createElement('div')
        footer.className = 'disk-drive-footer'
        footer.textContent = `${diskFormatBytes(drive.usedBytes)} used of ${diskFormatBytes(drive.sizeBytes)}`
        card.append(head, track, footer)
        grid.appendChild(card)
    })
}

function renderDiskProcesses(processes = []) {
    const body = document.getElementById('disk-activity-body')
    if (!body) return
    body.replaceChildren()
    if (!processes.length) {
        const row = document.createElement('tr')
        const cell = document.createElement('td')
        cell.colSpan = 5
        cell.className = 'disk-empty-state'
        cell.textContent = 'Per-process I/O counters are unavailable.'
        row.appendChild(cell)
        body.appendChild(row)
        return
    }

    const maxTotal = Math.max(...processes.map(process => Number(process.totalBytesPerSec) || 0), 1)
    processes.forEach(process => {
        const row = document.createElement('tr')
        const name = document.createElement('td')
        name.className = 'disk-process-name'
        name.textContent = process.name || 'Unknown process'
        const read = document.createElement('td')
        read.textContent = `${diskFormatNumber((Number(process.readBytesPerSec) || 0) / 1e6, 1)}`
        const write = document.createElement('td')
        write.textContent = `${diskFormatNumber((Number(process.writeBytesPerSec) || 0) / 1e6, 1)}`
        const totalValue = Number(process.totalBytesPerSec) || 0
        const total = document.createElement('td')
        total.textContent = diskFormatNumber(totalValue / 1e6, 1)
        const barCell = document.createElement('td')
        const bar = document.createElement('div')
        bar.className = 'disk-process-track'
        const fill = document.createElement('i')
        fill.style.width = `${Math.min(100, totalValue / maxTotal * 100)}%`
        bar.appendChild(fill)
        barCell.appendChild(bar)
        row.append(name, read, write, total, barCell)
        body.appendChild(row)
    })
}

function drawDiskChart() {
    const canvas = document.getElementById('disk-throughput-chart')
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * ratio)
    canvas.height = Math.round(rect.height * ratio)
    const context = canvas.getContext('2d')
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    const width = rect.width
    const height = rect.height
    const inset = { left: 34, right: 6, top: 10, bottom: 20 }
    const plotWidth = width - inset.left - inset.right
    const plotHeight = height - inset.top - inset.bottom
    const maxValue = Math.max(1, ...diskSamples.flatMap(sample => [sample.read, sample.write]))

    context.clearRect(0, 0, width, height)
    context.font = '10px "IBM Plex Sans", sans-serif'
    context.textBaseline = 'middle'
    for (let line = 0; line <= 3; line++) {
        const y = inset.top + plotHeight * line / 3
        context.strokeStyle = 'rgba(255,255,255,0.07)'
        context.beginPath()
        context.moveTo(inset.left, y)
        context.lineTo(width - inset.right, y)
        context.stroke()
        context.fillStyle = '#78828a'
        context.fillText((maxValue * (1 - line / 3)).toFixed(1), 0, y)
    }
    context.fillStyle = '#78828a'
    context.fillText('60s ago', inset.left, height - 7)
    context.fillText('now', width - 27, height - 7)
    if (diskSamples.length < 2) return

    const drawSeries = (key, color, fillColor) => {
        context.beginPath()
        diskSamples.forEach((sample, index) => {
            const timelineIndex = DISK_HISTORY_LIMIT - diskSamples.length + index
            const x = inset.left + (plotWidth * timelineIndex / (DISK_HISTORY_LIMIT - 1))
            const y = inset.top + plotHeight * (1 - sample[key] / maxValue)
            if (index === 0) context.moveTo(x, y)
            else context.lineTo(x, y)
        })
        context.strokeStyle = color
        context.lineWidth = 2
        context.lineJoin = 'round'
        context.stroke()
        if (fillColor) {
            const firstTimelineIndex = DISK_HISTORY_LIMIT - diskSamples.length
            const lastTimelineIndex = DISK_HISTORY_LIMIT - 1
            context.lineTo(inset.left + plotWidth * lastTimelineIndex / (DISK_HISTORY_LIMIT - 1), inset.top + plotHeight)
            context.lineTo(inset.left + plotWidth * firstTimelineIndex / (DISK_HISTORY_LIMIT - 1), inset.top + plotHeight)
            context.closePath()
            context.fillStyle = fillColor
            context.fill()
        }
    }
    drawSeries('read', '#62a8ff', 'rgba(98,168,255,0.11)')
    drawSeries('write', '#f3bd55', null)
}

function renderDiskIO(data) {
    const read = data.readOps == null ? NaN : Number(data.readOps)
    const write = data.writeOps == null ? NaN : Number(data.writeOps)
    const totalOps = data.totalOps == null ? NaN : Number(data.totalOps)
    diskText('disk-read-val', Number.isFinite(read) ? `${diskFormatNumber(read)} ops/s` : '--')
    diskText('disk-write-val', Number.isFinite(write) ? `${diskFormatNumber(write)} ops/s` : '--')
    diskText('disk-tio-val', Number.isFinite(totalOps) ? `${diskFormatNumber(totalOps)} ops/s` : '--')
    diskText('disk-read-rate', data.readMBps === null ? '-- MB/s' : `${diskFormatNumber(data.readMBps, 1)} MB/s`)
    diskText('disk-write-rate', data.writeMBps === null ? '-- MB/s' : `${diskFormatNumber(data.writeMBps, 1)} MB/s`)
    const totalMBps = data.readMBps === null || data.writeMBps === null ? null : data.readMBps + data.writeMBps
    diskText('disk-total-rate', totalMBps === null ? '-- MB/s' : `${diskFormatNumber(totalMBps, 1)} MB/s`)

    if (data.fillPercent !== null) {
        diskText('disk-fill-val', `${Math.round(data.fillPercent)}%`)
        diskText('disk-fill-detail', `${diskFormatBytes(data.usedBytes)} of ${diskFormatBytes(data.totalBytes)}`)
    }
    const active = data.activePercent == null ? NaN : Number(data.activePercent)
    diskText('disk-active-time', Number.isFinite(active) ? `${Math.min(100, Math.max(0, active)).toFixed(0)}%` : '--')
    const activeBar = document.getElementById('disk-active-bar')
    if (activeBar) activeBar.style.width = `${Math.min(100, Math.max(0, active || 0))}%`
    const response = data.responseMs == null ? NaN : Number(data.responseMs)
    diskText('disk-response-time', Number.isFinite(response) ? `${response.toFixed(1)} ms` : '--')
    const responseBar = document.getElementById('disk-response-bar')
    if (responseBar) responseBar.style.width = `${Math.min(100, Math.max(0, response || 0) * 5)}%`
    const queue = data.queueLength == null ? NaN : Number(data.queueLength)
    diskText('disk-queue-length', Number.isFinite(queue) ? queue.toFixed(1) : '--')
    const queueBar = document.getElementById('disk-queue-bar')
    if (queueBar) queueBar.style.width = `${Math.min(100, Math.max(0, queue || 0) * 10)}%`

    if (Number.isFinite(read) && Number.isFinite(write) && data.readMBps != null && data.writeMBps != null) {
        diskSamples.push({ read: data.readMBps, write: data.writeMBps })
        if (diskSamples.length > DISK_HISTORY_LIMIT) diskSamples.shift()
        const empty = document.getElementById('disk-chart-empty')
        if (empty) empty.hidden = true
        drawDiskChart()
    } else {
        const empty = document.getElementById('disk-chart-empty')
        if (empty) {
            empty.hidden = false
            empty.textContent = Number.isFinite(read) ? 'Waiting for Windows throughput counters...' : 'Collecting disk samples...'
        }
    }
    renderDiskDrives(data.drives)
    renderDiskProcesses(data.processes)
    diskText('disk-activity-updated', `Updated ${new Date(data.sampledAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
}

async function refreshDiskIO() {
    if (diskMonitorLoading || !document.getElementById('section-mon-disk')?.classList.contains('active')) return
    diskMonitorLoading = true
    try {
        const data = await invoke('get-disk-io')
        if (data) renderDiskIO(data)
    } catch {
        diskText('disk-health-status', 'Unavailable')
    } finally {
        diskMonitorLoading = false
    }
}

function startDiskPolling() {
    if (diskMonitorTimer !== null || document.visibilityState === 'hidden') return
    refreshDiskIO()
    diskMonitorTimer = setInterval(refreshDiskIO, 2000)
}

function stopDiskPolling() {
    if (diskMonitorTimer !== null) clearInterval(diskMonitorTimer)
    diskMonitorTimer = null
}

function loadDiskIO() {
    startDiskPolling()
}

document.getElementById('disk-refresh-btn')?.addEventListener('click', refreshDiskIO)
const diskSection = document.getElementById('section-mon-disk')
if (diskSection) {
    new MutationObserver(() => {
        if (diskSection.classList.contains('active') && document.visibilityState !== 'hidden') startDiskPolling()
        else stopDiskPolling()
    }).observe(diskSection, { attributes: true, attributeFilter: ['class'] })
    document.addEventListener('visibilitychange', () => {
        if (diskSection.classList.contains('active') && document.visibilityState !== 'hidden') startDiskPolling()
        else stopDiskPolling()
    })
    window.addEventListener('resize', drawDiskChart)
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
                ? `Optimize ${d.name} (TRIM / Re-trim)`
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


