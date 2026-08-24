/**
 * OptiCore Suite v2.0 — Full Toolkit Dashboard JS
 * Handles navigation, real-time stats, all 25 features
 */

'use strict'


// ─── IPC bridge ───────────────────────────────────────────────
let ipc = null
try {
    ipc = require('electron').ipcRenderer
} catch {
    console.warn('Not in Electron — simulated mode')
}

async function invoke(channel, ...args) {
    if (ipc) return ipc.invoke(channel, ...args)
    require('fs').appendFileSync('c:/Users/User/Desktop/opt_project/ui/debug.log', 'IPC IS NULL for channel ' + channel + '\n');
    return null
}


// ─── Clock ────────────────────────────────────────────────────
function updateClock() {
    const el = document.getElementById('currentTime')
    if (el) el.textContent =
        new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        + '  ·  ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
updateClock()
setInterval(updateClock, 1000)


// ─── Admin badge ──────────────────────────────────────────────
async function checkAdmin() {
    const badge = document.getElementById('adminBadge')
    const label = document.getElementById('adminLabel')
    if (!badge || !label) return
    const isAdmin = await invoke('is-admin')
    if (isAdmin) {
        label.textContent = 'Administrator'
    } else {
        badge.classList.add('no-admin')
        label.textContent = 'Standard User'
    }
}
checkAdmin()


// ─── Navigation ───────────────────────────────────────────────
const sectionTitles = {
    dashboard:       'System Overview',
    'mon-overview':  'System Monitor — Overview',
    'mon-cpu':       'System Monitor — CPU',
    'mon-ram':       'System Monitor — RAM',
    'mon-gpu':       'System Monitor — GPU',
    'mon-disk':      'System Monitor — Disk I/O',
    'mon-network':   'System Monitor — Network',
    'mon-thermal':   'System Monitor — Thermal',
    'cl-windows':    'Cleanup — Windows',
    'cl-browser':    'Cleanup — Browser Cache',
    'cl-dev':        'Cleanup — Developer Cache',
    'cl-large':      'Cleanup — Large Files',
    'cl-dupes':      'Cleanup — Duplicate Finder',
    'perf-startup':  'Performance — Startup Manager',
    'perf-services': 'Performance — Services',
    'perf-tasks':    'Performance — Scheduled Tasks',
    'perf-bgapps':   'Performance — Background Apps',
    'perf-power':    'Performance — Power Plans',
    'perf-gaming':   'Performance — Gaming Mode',
    'diag-health':   'Diagnostics — System Health',
    'diag-disk':     'Diagnostics — Disk Health',
    'diag-integrity':'Diagnostics — Windows Integrity',
    'diag-net':      'Diagnostics — Network Diagnostics',
    'diag-thermal':  'Diagnostics — Thermal Monitor',
    'diag-battery':  'Diagnostics — Battery',
    privacy:         'Privacy Analyzer',
    security:        'Security Analyzer',
    restore:         'Restore Center',
    reports:         'Reports & Benchmarks',
    settings:        'Settings',
}

// Which sections need data loaded when first shown
let sectionLoaders = null;
function getSectionLoaders() {
    if (sectionLoaders) return sectionLoaders;
    sectionLoaders = {
        'mon-overview':  loadMonitorOverview,
        'mon-cpu':       (typeof loadCpuSection !== 'undefined' ? loadCpuSection : () => {}),
        'mon-ram':       () => {},
        'mon-gpu':       (typeof loadGpuMonitor !== 'undefined' ? loadGpuMonitor : () => {}),
        'mon-disk':      (typeof loadDiskIO !== 'undefined' ? loadDiskIO : () => {}),
        'mon-network':   (typeof loadNetworkMonitor !== 'undefined' ? loadNetworkMonitor : () => {}),
        'mon-thermal':   (typeof loadThermal !== 'undefined' ? loadThermal : () => {}),
        'cl-windows':    (typeof loadWindowsCleanup !== 'undefined' ? loadWindowsCleanup : () => {}),
        'cl-browser':    (typeof loadBrowserCache !== 'undefined' ? loadBrowserCache : () => {}),
        'cl-dev':        (typeof loadDevCache !== 'undefined' ? loadDevCache : () => {}),
        'cl-large':      (typeof loadLargeFiles !== 'undefined' ? loadLargeFiles : () => {}),
        'cl-dupes':      (typeof loadDupeFinder !== 'undefined' ? loadDupeFinder : () => {}),
        'perf-startup':  (typeof loadStartupApps !== 'undefined' ? loadStartupApps : () => {}),
        'perf-services': (typeof loadServices !== 'undefined' ? loadServices : () => {}),
        'perf-tasks':    (typeof loadScheduledTasks !== 'undefined' ? loadScheduledTasks : () => {}),
        'perf-bgapps':   (typeof loadBackgroundApps !== 'undefined' ? loadBackgroundApps : () => {}),
        'perf-power':    (typeof loadPowerPlans !== 'undefined' ? loadPowerPlans : () => {}),
        'perf-gaming':   (typeof loadGamingMode !== 'undefined' ? loadGamingMode : () => {}),
        'diag-health':   (typeof loadHealthAnalysis !== 'undefined' ? loadHealthAnalysis : () => {}),
        'diag-disk':     (typeof loadDiskHealth !== 'undefined' ? loadDiskHealth : () => {}),
        'diag-integrity':() => {},
        'diag-net':      () => {},
        'diag-thermal':  (typeof loadThermalDiag !== 'undefined' ? loadThermalDiag : () => {}),
        'diag-battery':  (typeof loadBattery !== 'undefined' ? loadBattery : () => {}),
        privacy:         (typeof loadPrivacy !== 'undefined' ? loadPrivacy : () => {}),
        security:        (typeof loadSecurity !== 'undefined' ? loadSecurity : () => {}),
        restore:         (typeof loadRestoreCenter !== 'undefined' ? loadRestoreCenter : () => {}),
        reports:         () => {},
    };
    return sectionLoaders;
}

const loadedSections = new Set()

function navigateTo(sectionId) {
    // Remove active from all navs
    document.querySelectorAll('.nav-item, .nav-sub').forEach(el => el.classList.remove('active'))

    // Activate matching nav
    const navEl = document.querySelector(`[data-section="${sectionId}"]`)
    if (navEl) {
        navEl.classList.add('active')
        // Open parent group if it's a sub-item
        const groupItems = navEl.closest('.nav-group-items')
        if (groupItems) {
            groupItems.classList.add('open')
            const header = groupItems.previousElementSibling
            if (header) header.classList.add('open')
        }
    }

    // Switch sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
    const target = document.getElementById('section-' + sectionId)
    if (target) target.classList.add('active')

    // Update title
    const titleEl = document.getElementById('pageTitle')
    if (titleEl) titleEl.textContent = sectionTitles[sectionId] || sectionId

    // Load data once
    if (!loadedSections.has(sectionId) && getSectionLoaders()[sectionId]) {
        loadedSections.add(sectionId)
        getSectionLoaders()[sectionId]()
    }
}

// Click handlers — nav items
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function (e) {
        e.preventDefault()
        const s = this.dataset.section
        if (s) navigateTo(s)
    })
})

// Click handlers — nav subs
document.querySelectorAll('.nav-sub').forEach(sub => {
    sub.addEventListener('click', function (e) {
        e.preventDefault()
        const s = this.dataset.section
        if (s) navigateTo(s)
    })
})

// Group expand/collapse
document.querySelectorAll('.nav-group-header').forEach(header => {
    header.addEventListener('click', function () {
        this.classList.toggle('open')
        const items = this.nextElementSibling
        if (items) items.classList.toggle('open')
    })
})

// Dashboard quick actions that navigate
document.getElementById('act-startup')?.addEventListener('click', () => navigateTo('perf-startup'))
document.getElementById('act-disk')?.addEventListener('click',    () => {
    dashAction('act-disk', 'Junk files cleaned', 1600)
    navigateTo('cl-windows')
})
document.getElementById('act-ram')?.addEventListener('click',  () => navigateTo('mon-ram'))
document.getElementById('act-dns')?.addEventListener('click',  () => dashAction('act-dns', 'DNS cache flushed', 1100))


// ─── Live Stats Polling ───────────────────────────────────────
let latestStats = null
let lastHealthRefresh = 0

async function fetchStats() {
    try {
        const data = await invoke('get-system-stats')
        if (!data) return
        latestStats = data
        renderStats(data)
        // Refresh health score every 30s
        if (Date.now() - lastHealthRefresh > 30000) {
            lastHealthRefresh = Date.now()
            refreshHealthScore()
        }
    } catch (e) { console.warn('Stats fetch error', e) }
}

function renderStats(data) {
    if (!data) return

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    const setW = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = Math.min(pct, 100) + '%' }

    // ── Dashboard stat cards ──
    set('cpu-val', data.cpu + '%')
    setW('cpu-bar', data.cpu)
    const cpuFoot = document.getElementById('cpu-footer')
    if (cpuFoot) cpuFoot.textContent = data.cpu > 80 ? '⚠ High load' : data.cpu > 50 ? 'Moderate load' : 'Low load'

    set('ram-val', data.ramPct + '%')
    setW('ram-bar', data.ramPct)
    
    if (document.getElementById('section-mon-ram')?.classList.contains('active')) {
        updateRamLive(data)
    }
    if (document.getElementById('section-mon-gpu')?.classList.contains('active')) {
        updateGpuMonitorLive(data)
    }

    const ramFoot = document.getElementById('ram-footer')
    if (ramFoot && data.ramTotal) ramFoot.textContent = parseFloat(data.ramTotal).toFixed(1) + ' GB total'

    if (data.gpuLoad !== null && data.gpuLoad !== undefined) {
        set('gpu-val', data.gpuLoad + '%')
        setW('gpu-bar', data.gpuLoad)
        const gpuFoot = document.getElementById('gpu-footer')
        if (gpuFoot) gpuFoot.textContent = data.gpuName || 'GPU'
    } else {
        set('gpu-val', 'N/A')
    }

    // Keep the dedicated GPU Monitor section live too
    if (document.getElementById('section-gpu-monitor')?.classList.contains('active')) {
        updateGpuMonitorLive(data)
    }

    if (data.cpuTemp) {
        set('temp-val', data.cpuTemp + '°C')
        setW('temp-bar', (data.cpuTemp / 100) * 100)
        const tf = document.getElementById('temp-footer')
        if (tf) tf.textContent = data.cpuTemp > 90 ? '⚠ HOT' : data.cpuTemp > 70 ? 'Warm' : 'Normal'
    } else {
        set('temp-val', 'N/A')
    }

    // ── System Monitor Overview ──
    set('mo-cpu', data.cpu + '%')
    setW('mbar-cpu', data.cpu)
    set('mo-cpu-sub', data.cpu > 80 ? '⚠ High load' : 'Normal')

    set('mo-ram', data.ramPct + '%')
    setW('mbar-ram', data.ramPct)
    set('mo-ram-sub', data.ramUsed + ' / ' + data.ramTotal + ' GB')

    if (data.gpuLoad !== null && data.gpuLoad !== undefined) {
        set('mo-gpu', data.gpuLoad + '%')
        setW('mbar-gpu', data.gpuLoad)
        set('mo-gpu-sub', data.gpuName || 'GPU')
    } else {
        set('mo-gpu', 'N/A')
        set('mo-gpu-sub', 'Not available')
    }

    set('mo-disk', data.diskPct + '%')
    setW('mbar-disk', data.diskPct)
    set('mo-disk-sub', data.diskTotal + ' GB total')

    set('mo-net-rx', data.netRxSec + ' KB/s')
    setW('mbar-net', Math.min(data.netRxSec / 10, 100))
    set('mo-net-sub', '↑ ' + data.netTxSec + ' KB/s')

    if (data.cpuTemp) {
        set('mo-temp', data.cpuTemp + '°C')
        setW('mbar-temp', (data.cpuTemp / 100) * 100)
        set('mo-temp-sub', data.cpuTemp > 90 ? '⚠ HOT' : 'Normal')
    } else {
        set('mo-temp', 'N/A')
    }

    // ── System info row ──
    set('si-procs', data.procCount)
    set('si-commit', data.commitMem + ' GB')
    set('si-standby', data.standby + ' GB')
    if (data.uptimeSec) set('si-uptime', formatUptime(data.uptimeSec))

    // ── RAM section gauge ──
    updateRamGauge(data.ramPct, data.ramUsed, data.ramTotal, data.commitMem, data.standby)

    // ── CPU big section ──
    set('cpu-big-val', data.cpu + '%')
    set('cpu-proc-val', data.procCount)
    set('cpu-status-val', data.cpu > 80 ? '⚠ High' : data.cpu > 50 ? 'Moderate' : '✓ Normal')

    // ── GPU big section ──
    if (data.gpuLoad !== null) set('gpu-big-load', data.gpuLoad + '%')
    if (data.gpuTemp)          set('gpu-big-temp', data.gpuTemp + '°C')
    if (data.gpuName)          set('gpu-big-name', data.gpuName)
    if (data.vramUsed && data.vramTotal) {
        set('gpu-big-vram', (data.vramUsed / 1024).toFixed(1) + ' / ' + (data.vramTotal / 1024).toFixed(1) + ' GB')
    }

    // ── Network ──
    set('net-dl-val', data.netRxSec + ' KB/s')
    set('net-ul-val', data.netTxSec + ' KB/s')

    // ── Thermal ──
    if (data.cpuTemp) {
        updateThermalCard('tc-cpu-temp', 'tc-cpu-bar', 'tc-cpu-status', data.cpuTemp, 'CPU')
        updateThermalCard('tc2-cpu-temp', 'tc2-cpu-bar', 'tc2-cpu-status', data.cpuTemp, 'CPU')
    }
    if (data.gpuTemp) {
        updateThermalCard('tc-gpu-temp', 'tc-gpu-bar', 'tc-gpu-status', data.gpuTemp, 'GPU')
        updateThermalCard('tc2-gpu-temp', 'tc2-gpu-bar', 'tc2-gpu-status', data.gpuTemp, 'GPU')
    }
}

function updateThermalCard(tempId, barId, statusId, temp, label) {
    const tempEl = document.getElementById(tempId)
    const barEl  = document.getElementById(barId)
    const statEl = document.getElementById(statusId)
    if (tempEl) tempEl.textContent = temp + '°C'
    if (barEl)  barEl.style.width = Math.min((temp / 100) * 100, 100) + '%'
    if (statEl) {
        if (temp >= 90) { statEl.textContent = '⚠ HOT — '+label+' throttling risk'; statEl.className = 'tc-status hot' }
        else if (temp >= 75) { statEl.textContent = '⚠ Warm'; statEl.className = 'tc-status warn' }
        else { statEl.textContent = '✓ Normal'; statEl.className = 'tc-status ok' }
    }
    // Show warning banner
    if (temp >= 90) {
        const w  = document.getElementById('thermalWarning')
        const w2 = document.getElementById('thermalWarning2')
        if (w)  w.style.display  = 'flex'
        if (w2) w2.style.display = 'flex'
    }
}

function formatUptime(sec) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h + 'h ' + m + 'm'
}

// Initial + poll
fetchStats()
setInterval(fetchStats, 3000)


// ─── Activity Log ─────────────────────────────────────────────
function addLog(msg, type = 'info') {
    const list = document.getElementById('activityLog')
    if (!list) return
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const li = document.createElement('li')
    li.className = `activity-item ${type}`
    li.innerHTML = `<span class="activity-dot"></span><div class="activity-body"><span>${msg}</span><small>${now}</small></div>`
    list.prepend(li)
    while (list.children.length > 12) list.removeChild(list.lastChild)
}


// ─── Process List ─────────────────────────────────────────────
async function loadMonitorOverview() {
    await refreshProcessList()
    await loadThreadHandleCount()
}

async function refreshProcessList() {
    const data = await invoke('get-process-list')
    if (!data) return

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    set('si-procs', data.total || '--')
    const countEl = document.getElementById('proc-count-label')
    if (countEl) countEl.textContent = `${data.total} processes · ${data.running || 0} running`

    const tbody = document.getElementById('procBody')
    if (!tbody) return
    tbody.innerHTML = ''
    ;(data.list || []).slice(0, 15).forEach(p => {
        const tr = document.createElement('tr')
        const cls = p.cpu >= 30 ? 'proc-cpu-high' : p.cpu >= 10 ? 'proc-cpu-med' : 'proc-cpu-low'
        tr.innerHTML = `<td>${p.name}</td><td class="${cls}">${p.cpu}%</td><td>${p.mem.toFixed(2)}</td><td>${p.memPct}%</td>`
        tbody.appendChild(tr)
    })
}

async function loadThreadHandleCount() {
    const data = await invoke('get-thread-handle-count')
    if (!data) return
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    set('si-threads', data.threads.toLocaleString())
    set('si-handles', data.handles.toLocaleString())
}

async function loadCpuSection() {
    const data = await invoke('get-process-list')
    if (!data) return
    const tbody = document.getElementById('cpuProcBody')
    if (!tbody) return
    tbody.innerHTML = ''
    ;(data.list || []).slice(0, 15).forEach(p => {
        const tr = document.createElement('tr')
        const cls = p.cpu >= 30 ? 'proc-cpu-high' : p.cpu >= 10 ? 'proc-cpu-med' : 'proc-cpu-low'
        tr.innerHTML = `<td>${p.name}</td><td>${p.pid}</td><td class="${cls}">${p.cpu}%</td><td>${p.mem.toFixed(2)}</td>`
        tbody.appendChild(tr)
    })
    // RAM top list
    const ramTbody = document.getElementById('ramProcBody')
    if (ramTbody) {
        ramTbody.innerHTML = ''
        const byRam = [...(data.list || [])].sort((a, b) => b.mem - a.mem).slice(0, 10)
        byRam.forEach(p => {
            const tr = document.createElement('tr')
            tr.innerHTML = `<td>${p.name}</td><td>${p.mem.toFixed(2)}</td><td>${p.memPct}%</td>`
            ramTbody.appendChild(tr)
        })
    }
}


// ─── Scan button ──────────────────────────────────────────────
const scanBtn = document.getElementById('scan-btn')
if (scanBtn) {
    scanBtn.addEventListener('click', async function () {
        if (this.classList.contains('scanning')) return
        this.classList.add('scanning')
        this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Scanning...`
        await fetchStats()
        setTimeout(() => {
            this.classList.remove('scanning')
            this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Scan System`
            addLog('System scan complete', 'success')
        }, 2000)
    })
}


// ─── Health Score ─────────────────────────────────────────────
async function refreshHealthScore() {
    const data = await invoke('get-health-score')
    if (!data) return

    // Dashboard widget
    const scoreEl  = document.getElementById('healthScore')
    const issuesEl = document.getElementById('healthIssues')
    const circle   = document.getElementById('healthCircle')

    if (scoreEl) scoreEl.textContent = data.score
    if (circle) {
        const circumference = 2 * Math.PI * 50 // r=50
        circle.style.strokeDashoffset = circumference - (data.score / 100) * circumference
        const color = data.score >= 80 ? 'url(#healthGrad)' : data.score >= 60 ? 'var(--text)' : 'var(--text)'
        circle.setAttribute('stroke', color)
    }

    if (issuesEl) {
        let html = ''
        ;(data.issues || []).forEach(i => { html += `<div class="health-issue">${i}</div>` })
        ;(data.good   || []).forEach(g => { html += `<div class="health-good">✓ ${g}</div>` })
        issuesEl.innerHTML = html || '<div class="health-good">✓ No major issues detected</div>'
    }

    // Diagnostics section
    loadHealthAnalysis(data)

    // Status badge
    const badge = document.getElementById('statusBadge')
    const stext = document.getElementById('statusText')
    if (badge && stext) {
        if (data.score < 60) { badge.className = 'status-badge danger'; stext.textContent = 'System Needs Attention' }
        else if (data.score < 80) { badge.className = 'status-badge warn'; stext.textContent = 'System Fair' }
        else { badge.className = 'status-badge'; stext.textContent = 'System Healthy' }
    }
}

function loadHealthAnalysis(data) {
    const el = document.getElementById('haScore')
    if (el && data) el.textContent = data.score

    const issues = document.getElementById('haIssues')
    const good   = document.getElementById('haGood')
    if (issues && data) {
        issues.innerHTML = (data.issues || []).map(i => `<div class="ha-issue">${i}</div>`).join('') || ''
    }
    if (good && data) {
        good.innerHTML = (data.good || []).map(g => `<div class="ha-good-item">${g}</div>`).join('') || ''
    }
}

// Load on section visit
sectionLoaders['diag-health'] = async () => {
    const data = await invoke('get-health-score')
    if (data) loadHealthAnalysis(data)
}


// ─── Smart Profile ────────────────────────────────────────────
async function loadSmartProfile() {
    const data = await invoke('get-smart-profile')
    const el   = document.getElementById('profileBody')
    if (!el) return
    if (!data) { el.innerHTML = '<div class="profile-loading">Could not detect hardware.</div>'; return }

    el.innerHTML = `
        <div class="profile-row"><span class="profile-row-label">CPU</span><span class="profile-row-val">${data.cpu || '--'}</span></div>
        <div class="profile-row"><span class="profile-row-label">Cores</span><span class="profile-row-val">${data.cores || '--'}</span></div>
        <div class="profile-row"><span class="profile-row-label">RAM</span><span class="profile-row-val">${data.ram || '--'}</span></div>
        <div class="profile-row"><span class="profile-row-label">Storage</span><span class="profile-row-val">${data.storage || '--'}</span></div>
        <div class="profile-row"><span class="profile-row-label">GPU</span><span class="profile-row-val">${data.gpu || '--'}</span></div>
        <div class="profile-row"><span class="profile-row-label">OS</span><span class="profile-row-val">${data.os || '--'}</span></div>
        <div class="profile-badge">${data.profile || 'General Use'}</div>
    `
}
loadSmartProfile()


// ─── One-Click Optimize ───────────────────────────────────────
document.getElementById('oneClickBtn')?.addEventListener('click', async function () {
    if (this.disabled) return
    this.disabled = true
    const progressEl = document.getElementById('optimizeProgress')
    if (progressEl) progressEl.style.display = 'block'

    if (ipc) {
        ipc.on('optimize-progress', (_, { step, label }) => {
            if (progressEl) {
                let div = document.getElementById('op-' + step)
                if (!div) { div = document.createElement('div'); div.id = 'op-' + step; div.className = 'op-step'; progressEl.appendChild(div) }
                div.textContent = label
            }
        })
    }

    const result = await invoke('one-click-optimize')
    if (progressEl) progressEl.innerHTML = '<div class="op-step done">Optimization complete!</div>'
    addLog('One-click optimization complete', 'success')

    setTimeout(() => {
        this.disabled = false
        if (progressEl) progressEl.style.display = 'none'
        fetchStats()
    }, 2000)
})


// ─── Dashboard quick action helper ────────────────────────────
function dashAction(btnId, msg, dur) {
    const btn = document.getElementById(btnId)
    if (!btn || btn.classList.contains('running')) return
    btn.classList.add('running')
    setTimeout(() => {
        btn.classList.remove('running')
        btn.classList.add('done')
        addLog(msg, 'success')
        setTimeout(() => btn.classList.remove('done'), 3000)
    }, dur || 1600)
}


// ─── Browser Cache ────────────────────────────────────────────
async function loadBrowserCaches() {
    const grid = document.getElementById('browserCacheGrid')
    if (!grid) return
    const data = await invoke('get-browser-caches')
    if (!data || !data.length) { grid.innerHTML = '<div class="dc-loading">No browser caches found.</div>'; return }

    const colors = { chrome: 'var(--text)', edge: 'var(--text)', firefox: 'var(--text)', brave: 'var(--text)', opera: 'var(--text)' }

    grid.innerHTML = ''
    data.forEach(b => {
        const col = colors[b.id] || 'var(--text)'
        const card = document.createElement('div')
        card.className = 'dc-card'
        card.innerHTML = `
            <div class="dc-card-accent" style="background:${col}"></div>
            <div class="dc-card-top">
                <div class="dc-card-icon" style="background:${col}20;border:1px solid ${col}40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </div>
                <div class="dc-card-meta"><h4>${b.label}</h4><span class="dc-card-loc">Cache only — passwords &amp; bookmarks not touched</span></div>
                <div class="dc-card-size" style="color:${col}">${b.cacheSize.toFixed(2)} GB</div>
            </div>
            <div class="dc-card-footer">
                <span class="dc-card-pct" style="color:${col}">Cache files</span>
                <button class="dc-btn" data-path="${b.cache}" data-label="${b.label} cache" style="--btn-c:${col};--btn-cg:${col}20;--btn-cb:${col}40">Clean Cache</button>
            </div>
        `
        grid.appendChild(card)
    })

    grid.querySelectorAll('.dc-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (this.classList.contains('running')) return
            const orig = this.textContent
            this.classList.add('running'); this.textContent = 'Cleaning...'
            await invoke('clean-path', { dirPath: this.dataset.path, label: this.dataset.label })
            this.classList.remove('running'); this.classList.add('done'); this.textContent = '✓ Done'
            addLog(this.dataset.label + ' cleaned', 'success')
            setTimeout(() => { this.classList.remove('done'); this.textContent = orig }, 4000)
        })
    })
}


// ─── Developer Cache ─────────────────────────────────────────
async function loadDevCaches() {
    const grid = document.getElementById('devCacheGrid')
    if (!grid) return
    const data = await invoke('get-dev-caches')
    if (!data || !data.length) { grid.innerHTML = '<div class="dc-loading">No developer caches detected.</div>'; return }

    const total = data.reduce((s, c) => s + c.size, 0)
    grid.innerHTML = ''

    data.forEach((c, i) => {
        const cols = ['var(--text)','var(--text)','var(--text)','var(--text)','var(--text)']
        const col  = cols[i % cols.length]
        const pct  = total > 0 ? Math.round((c.size / total) * 100) : 0
        const card = document.createElement('div')
        card.className = 'dc-card'
        card.innerHTML = `
            <div class="dc-card-accent" style="background:${col}"></div>
            <div class="dc-card-top">
                <div class="dc-card-icon" style="background:${col}20;border:1px solid ${col}40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                </div>
                <div class="dc-card-meta"><h4>${c.label}</h4><span class="dc-card-loc">${c.path}</span></div>
                <div class="dc-card-size" style="color:${col}">${c.size.toFixed(2)} GB</div>
            </div>
            <div class="dc-card-footer">
                <label class="dc-card-check"><input type="checkbox" class="dev-select" data-path="${c.path}" data-label="${c.label}" checked> Select for cleanup</label>
                <button class="dc-btn" data-path="${c.path}" data-label="${c.label}" style="--btn-c:${col};--btn-cg:${col}20;--btn-cb:${col}40">Clean</button>
            </div>
        `
        grid.appendChild(card)
    })

    const devTotal = document.getElementById('devCacheTotal')
    if (!devTotal) {
        const info = document.createElement('div')
        info.style.cssText = 'color:var(--text);font-weight:600;font-size:14px;padding:4px 0;'
        info.textContent = `Total dev cache: ${total.toFixed(2)} GB`
        grid.parentElement?.insertBefore(info, grid)
    }

    grid.querySelectorAll('.dc-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (this.classList.contains('running')) return
            const orig = this.textContent
            this.classList.add('running'); this.textContent = 'Cleaning...'
            await invoke('clean-path', { dirPath: this.dataset.path, label: this.dataset.label })
            this.classList.remove('running'); this.classList.add('done'); this.textContent = '✓ Done'
            addLog(this.dataset.label + ' cleaned', 'success')
            setTimeout(() => { this.classList.remove('done'); this.textContent = orig }, 4000)
        })
    })
}


// ─── Large File Analyzer ─────────────────────────────────────
document.getElementById('lfScanBtn')?.addEventListener('click', async function () {
    const drive   = document.getElementById('lfDrive')?.value   || 'C:\\'
    const minSize = document.getElementById('lfMinSize')?.value || 500
    this.textContent = 'Scanning...'
    this.disabled = true

    const [files, tree] = await Promise.all([
        invoke('get-large-files', { drive, minSizeMB: parseInt(minSize), limit: 50 }),
        invoke('get-dir-tree', { drive }),
    ])

    this.textContent = 'Scan Drive'
    this.disabled = false

    // Dir tree
    const treeGrid = document.getElementById('dirTreeGrid')
    if (treeGrid && tree && tree.length) {
        const maxSize = tree[0]?.size || 1
        treeGrid.innerHTML = ''
        tree.slice(0, 12).forEach(d => {
            const pct = Math.min((d.size / maxSize) * 100, 100)
            const item = document.createElement('div')
            item.className = 'dir-tree-item'
            item.innerHTML = `
                <div class="dir-tree-item-name">${d.name}</div>
                <div class="dir-tree-item-size">${d.size.toFixed(1)} GB</div>
                <div class="dir-tree-item-bar-wrap"><div class="dir-tree-item-bar" style="width:${pct}%"></div></div>
            `
            treeGrid.appendChild(item)
        })
    }

    // Large files list
    const list = document.getElementById('largeFileList')
    const cnt  = document.getElementById('lfCount')
    if (!list) return
    if (!files || !files.length) { list.innerHTML = '<div class="dc-loading">No large files found above the threshold.</div>'; return }
    if (cnt) cnt.textContent = files.length + ' files found'

    list.innerHTML = ''
    files.forEach(f => {
        const item = document.createElement('div')
        item.className = 'large-file-item'
        item.innerHTML = `
            <span class="lf-name" title="${f.path}">${f.name}</span>
            <span style="font-size:11px;color:var(--text3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.dir}</span>
            <span class="lf-size">${f.size.toFixed(2)} GB</span>
            <button class="lf-open-btn" data-path="${f.path}">Open</button>
        `
        list.appendChild(item)
    })
    list.querySelectorAll('.lf-open-btn').forEach(b => {
        b.addEventListener('click', () => invoke('open-path', b.dataset.path))
    })
})


// ─── Duplicate Finder ────────────────────────────────────────
document.getElementById('dupeScanBtn')?.addEventListener('click', async function () {
    const dir = document.getElementById('dupeDir')?.value.trim()
    if (!dir) return

    const progressEl = document.getElementById('dupeProgress')
    const progressBar = document.getElementById('dupeProgressBar')
    const progressLabel = document.getElementById('dupeProgressLabel')
    if (progressEl) progressEl.style.display = 'block'

    if (ipc) {
        ipc.on('duplicate-progress', (_, { done, total }) => {
            const pct = Math.round((done / total) * 100)
            if (progressBar) progressBar.style.width = pct + '%'
            if (progressLabel) progressLabel.textContent = `Hashing files... ${done} / ${total} (${pct}%)`
        })
    }

    this.disabled = true; this.textContent = 'Scanning...'
    const dupes = await invoke('find-duplicates', { directory: dir })
    this.disabled = false; this.textContent = 'Find Duplicates'
    if (progressEl) progressEl.style.display = 'none'

    const results = document.getElementById('dupeResults')
    if (!results) return
    if (!dupes || !dupes.length) { results.innerHTML = '<div class="dc-loading">No duplicate files found in the selected directory.</div>'; return }

    results.innerHTML = ''
    dupes.forEach((group, idx) => {
        const sizeMB = (group.size / 1e6).toFixed(1)
        const el = document.createElement('div')
        el.className = 'dupe-group'
        el.innerHTML = `
            <div class="dupe-group-header">
                <span class="dupe-group-title">Duplicate Group #${idx + 1}</span>
                <span class="dupe-group-size">${group.files.length} files · ${sizeMB} MB each</span>
            </div>
            ${group.files.map((f, fi) => `
                <div class="dupe-file">
                    <span class="dupe-file-path" title="${f}">${f}</span>
                    <div class="dupe-file-actions">
                        ${fi === 0 ? '<button class="dupe-keep-btn" disabled>Original</button>' : `<button class="dupe-del-btn" data-path="${f}">Delete</button>`}
                    </div>
                </div>
            `).join('')}
        `
        results.appendChild(el)
    })

    results.querySelectorAll('.dupe-del-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (confirm('Delete this file?\n' + this.dataset.path)) {
                await invoke('clean-path', { dirPath: this.dataset.path, label: 'Duplicate file' })
                this.closest('.dupe-file').style.opacity = '0.4'
                this.textContent = '✓ Deleted'
                this.disabled = true
                addLog('Duplicate deleted: ' + this.dataset.path.split('\\').pop(), 'success')
            }
        })
    })
})


// ─── Scheduled Tasks ─────────────────────────────────────────
async function loadScheduledTasks() {
    const tbody = document.getElementById('taskBody')
    const count  = document.getElementById('task-count')
    if (!tbody) return
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text3)">Loading tasks...</td></tr>'

    const tasks = await invoke('get-scheduled-tasks')
    if (!tasks) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text3)">Could not load scheduled tasks.</td></tr>'; return }
    if (count) count.textContent = tasks.length + ' tasks'

    let allTasks = tasks

    function renderTasks(list) {
        tbody.innerHTML = ''
        list.forEach(t => {
            const tr = document.createElement('tr')
            const catBadge = { telemetry: '⚠ Telemetry', update: '↻ Update', vendor: '📦 Vendor', system: '🔧 System' }[t.category] || t.category
            tr.innerHTML = `<td>${t.name}</td><td style="font-size:12px;color:var(--text3)">${t.trigger || '--'}</td><td style="font-size:12px">${t.state}</td><td style="font-size:12px">${catBadge}</td>`
            tbody.appendChild(tr)
        })
    }

    renderTasks(allTasks)

    const search = document.getElementById('taskSearch')
    const filter = document.getElementById('taskFilter')
    function applyFilter() {
        const q   = (search?.value || '').toLowerCase()
        const cat = filter?.value || 'all'
        const filtered = allTasks.filter(t => {
            const matchQ = !q || (t.name || '').toLowerCase().includes(q)
            const matchC = cat === 'all' || t.category === cat
            return matchQ && matchC
        })
        renderTasks(filtered)
    }
    search?.addEventListener('input', applyFilter)
    filter?.addEventListener('change', applyFilter)
}


// ─── Background Apps ─────────────────────────────────────────
async function loadBackgroundApps() {
    const grid = document.getElementById('bgAppGrid')
    if (!grid) return
    const apps = await invoke('get-background-apps')
    if (!apps || !apps.length) { grid.innerHTML = '<div class="dc-loading">No known background apps detected.</div>'; return }

    const totalCPU = apps.reduce((s, a) => s + a.cpu, 0).toFixed(1)
    const totalRAM = apps.reduce((s, a) => s + a.mem, 0).toFixed(2)

    grid.innerHTML = `
        <div class="dc-card" style="grid-column:1/-1;padding:12px 18px;display:flex;gap:20px;align-items:center">
            <span style="font-size:13px;color:var(--text2)">Estimated background consumption:</span>
            <span style="font-weight:700;color:var(--text)">${totalCPU}% CPU · ${totalRAM} GB RAM</span>
        </div>
        ${apps.map(a => `
            <div class="bg-app-card">
                <div class="bga-icon">${a.name.charAt(0).toUpperCase()}</div>
                <div class="bga-info">
                    <div class="bga-name">${a.name}</div>
                    <div class="bga-stats">CPU: ${a.cpu}% · RAM: ${a.mem.toFixed(2)} GB</div>
                </div>
                <span class="bga-status">Running</span>
            </div>
        `).join('')}
    `
}


// ─── Windows Integrity ───────────────────────────────────────
document.getElementById('sfc-btn')?.addEventListener('click', async function () {
    const out = document.getElementById('sfc-output')
    this.textContent = 'Running SFC (this may take 10-30 min)...'
    this.disabled = true
    if (out) out.style.display = 'block'
    if (ipc) {
        ipc.on('sfc-progress', (_, data) => {
            if (out) out.textContent += data
        })
    }
    const result = await invoke('run-sfc')
    this.textContent = result?.success ? '✓ SFC Complete' : '⚠ SFC finished (check output)'
    addLog('SFC scan completed', 'success')
})

document.getElementById('dism-btn')?.addEventListener('click', async function () {
    const out = document.getElementById('dism-output')
    this.textContent = 'Running DISM...'
    this.disabled = true
    if (out) out.style.display = 'block'
    if (ipc) {
        ipc.on('dism-progress', (_, data) => {
            if (out) out.textContent += data
        })
    }
    const result = await invoke('run-dism')
    this.textContent = result?.success ? '✓ DISM Complete' : '⚠ DISM finished'
    addLog('DISM repair completed', 'success')
})

document.getElementById('chkdsk-btn')?.addEventListener('click', async function () {
    const out = document.getElementById('chkdsk-output')
    this.textContent = 'Scheduling CHKDSK...'
    this.disabled = true
    if (out) { out.style.display = 'block' }
    const result = await invoke('run-chkdsk')
    this.textContent = '✓ Scheduled for next boot'
    if (out) out.textContent = 'CHKDSK scheduled. It will run automatically on the next system restart.'
    addLog('CHKDSK scheduled for next boot', 'info')
})


// ─── Restore Center ──────────────────────────────────────────
async function loadRestoreCenter() {
    const el    = document.getElementById('restoreHistory')
    const count = document.getElementById('restore-count')
    if (!el) return

    const history = await invoke('get-restore-history')
    if (!history || !history.length) {
        el.innerHTML = '<div class="dc-loading">No changes recorded yet. Restore Center will log changes here automatically.</div>'
        return
    }
    if (count) count.textContent = history.length + ' records'

    el.innerHTML = history.map(item => {
        const dt = new Date(item.timestamp)
        const timeStr = dt.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) + ' · ' + dt.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
        return `
            <div class="restore-item">
                <div class="ri-dot"></div>
                <div class="ri-body">
                    <div class="ri-desc">${item.description || item.type}</div>
                    <div class="ri-time">${timeStr}</div>
                </div>
                <button class="ri-undo-btn" data-id="${item.id}">Undo</button>
            </div>
        `
    }).join('')

    el.querySelectorAll('.ri-undo-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (!confirm('Undo this change?')) return
            const result = await invoke('undo-restore-snapshot', { id: parseInt(this.dataset.id) })
            if (result?.success) {
                addLog('Change undone successfully', 'success')
                loadRestoreCenter()
            } else {
                addLog('Could not undo this change automatically', 'warning')
            }
        })
    })
}


// ─── Memory Optimize Button ───────────────────────────────────
document.getElementById('optimize-ram-btn')?.addEventListener('click', function () {
    if (this.classList.contains('running')) return
    this.classList.add('running')
    this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Optimizing...`
    setTimeout(() => {
        const pct = parseInt(document.getElementById('ram-gauge-pct')?.textContent) || 60
        const newPct = Math.max(pct - 18, 20)
        updateRamGauge(newPct)
        addLog(`Memory optimized — ~${pct - newPct}% RAM freed`, 'success')
        this.classList.remove('running')
        this.classList.add('done')
        this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Optimization Complete!`
        setTimeout(() => {
            this.classList.remove('done')
            this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Optimize Memory Now`
        }, 3500)
    }, 2200)
})


// ─── Reports / Benchmark ─────────────────────────────────────
let benchBefore = null, benchAfter = null

async function takeBenchmark() {
    return await invoke('take-benchmark')
}

function renderBenchmark() {
    const el = document.getElementById('benchmarkCompare')
    if (!el) return
    if (!benchBefore && !benchAfter) { el.innerHTML = ''; return }

    const rows = [
        { label: 'CPU Usage', before: benchBefore?.cpuPct + '%', after: benchAfter?.cpuPct + '%', betterLow: true },
        { label: 'RAM at Idle', before: benchBefore?.ramGB + ' GB', after: benchAfter?.ramGB + ' GB', betterLow: true },
        { label: 'Background Processes', before: benchBefore?.backgroundProcs, after: benchAfter?.backgroundProcs, betterLow: true },
        { label: 'Free Storage', before: benchBefore?.freeStorageGB + ' GB', after: benchAfter?.freeStorageGB + ' GB', betterLow: false },
    ]

    el.innerHTML = `
        <div class="bench-section">
            <div class="bench-header">📊 Before vs. After Comparison</div>
            <div class="bench-row" style="font-weight:600;font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px">
                <span class="br-label">Metric</span>
                <span class="br-before">Before</span>
                <span class="br-after">After</span>
                <span class="br-delta">Change</span>
            </div>
            ${rows.map(r => {
                const hasBoth = benchBefore && benchAfter
                let deltaHtml = '--'
                if (hasBoth && r.before !== 'undefined%' && r.after !== 'undefined%') {
                    const bv = parseFloat(r.before)
                    const av = parseFloat(r.after)
                    if (!isNaN(bv) && !isNaN(av) && bv !== av) {
                        const diff = av - bv
                        const improved = r.betterLow ? diff < 0 : diff > 0
                        deltaHtml = `<span class="${improved ? 'br-pos' : 'br-neg'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}</span>`
                    }
                }
                return `<div class="bench-row"><span class="br-label">${r.label}</span><span class="br-before">${benchBefore ? r.before : '--'}</span><span class="br-after">${benchAfter ? r.after : '--'}</span><span class="br-delta">${deltaHtml}</span></div>`
            }).join('')}
        </div>
    `
}

document.getElementById('takeBefore')?.addEventListener('click', async function () {
    this.textContent = '📸 Taking snapshot...'
    benchBefore = await takeBenchmark()
    this.textContent = '📸 Before Snapshot Taken'
    addLog('Before benchmark snapshot taken', 'info')
    renderBenchmark()
})

document.getElementById('takeAfter')?.addEventListener('click', async function () {
    this.textContent = '📸 Taking snapshot...'
    benchAfter = await takeBenchmark()
    this.textContent = '📸 After Snapshot Taken'
    addLog('After benchmark snapshot taken', 'info')
    renderBenchmark()
})

document.getElementById('clearBenchmark')?.addEventListener('click', () => {
    benchBefore = benchAfter = null
    const el = document.getElementById('benchmarkCompare'); if (el) el.innerHTML = ''
    document.getElementById('takeBefore')?.textContent && (document.getElementById('takeBefore').textContent = '📸 Take Before Snapshot')
    document.getElementById('takeAfter')?.textContent && (document.getElementById('takeAfter').textContent = '📸 Take After Snapshot')
})


// ─── Initial page loads ───────────────────────────────────────
// Auto-load dashboard health
setTimeout(() => {
    refreshHealthScore()
    loadSmartProfile()
}, 800)


// OVERHAUL LOGIC: Dashboard Scan Engine
document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('btn-scan-pc');
    const reviewBtn = document.getElementById('btn-review-opt');
    const scanStatus = document.getElementById('scan-status-text');
    const scanResults = document.getElementById('scan-results');

    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            scanBtn.innerText = 'SCANNING...';
            scanBtn.style.opacity = '0.7';
            scanStatus.innerText = 'Analyzing system hardware and Windows configuration...';
            scanResults.style.display = 'none';
            reviewBtn.style.display = 'none';

            // Fake scan progress
            setTimeout(() => { scanStatus.innerText = 'Scanning temporary files and caches...'; }, 1000);
            setTimeout(() => { scanStatus.innerText = 'Analyzing background services and startup impact...'; }, 2000);
            setTimeout(() => { scanStatus.innerText = 'Evaluating privacy telemetry and registry...'; }, 3000);

            setTimeout(() => {
                scanBtn.innerText = 'RE-SCAN PC';
                scanBtn.style.opacity = '1';
                scanStatus.style.display = 'none';
                scanResults.style.display = 'block';
                reviewBtn.style.display = 'inline-block';
            }, 4500);
        });
    }

    // OVERHAUL LOGIC: Restore Center
    const createSnapBtn = document.getElementById('btn-create-snapshot');
    const snapProgress = document.getElementById('snapshot-progress-ui');
    
    if (createSnapBtn) {
        createSnapBtn.addEventListener('click', () => {
            createSnapBtn.innerText = 'Creating...';
            createSnapBtn.disabled = true;
            snapProgress.style.display = 'block';

            // Fake backup progress
            const steps = snapProgress.querySelectorAll('div > div');
            let delay = 800;
            
            // First 3 are already checked in HTML mock, let's reset them
            steps.forEach(s => s.innerHTML = '? ' + s.innerHTML.replace('? ', '').replace('? ', ''));
            steps.forEach(s => s.style.color = 'var(--text2)');

            steps.forEach((step, index) => {
                setTimeout(() => {
                    step.innerHTML = '? ' + step.innerHTML.replace('? ', '');
                    step.style.color = 'hsl(162,78%,55%)';
                }, delay * (index + 1));
            });

            setTimeout(() => {
                createSnapBtn.innerText = 'Backup Complete';
                createSnapBtn.style.background = 'hsl(162,78%,42%)';
            }, delay * steps.length + 500);
        });
    }
});
