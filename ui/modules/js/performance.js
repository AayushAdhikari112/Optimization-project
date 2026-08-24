// ─── Startup Manager ─────────────────────────────────────────
async function loadStartupItems() {
    const tbody = document.getElementById('startupBody')
    const count  = document.getElementById('startup-count')
    if (!tbody) return

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">Loading startup items...</td></tr>'
    const items = await invoke('get-startup-items')
    if (!items || !items.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">Could not load startup items. Admin rights required.</td></tr>'
        return
    }
    if (count) count.textContent = items.length + ' items found'

    const recs = {
        Required: 'Keep — Required',
        High:     'Disable recommended',
        Medium:   'Optional',
        Low:      'Keep',
    }
    const impactClass = { Required: 'impact-required', High: 'impact-high', Medium: 'impact-medium', Low: 'impact-low' }

    tbody.innerHTML = ''
    items.forEach(item => {
        const tr = document.createElement('tr')
        const isReq = item.required
        tr.innerHTML = `
            <td>${item.Name || '--'}</td>
            <td style="font-size:11px;color:var(--text3)">${(item.Location || '').replace('HKEY_CURRENT_USER','HKCU').replace('HKEY_LOCAL_MACHINE','HKLM')}</td>
            <td><span class="impact-badge ${impactClass[item.impact] || 'impact-low'}">${item.impact}</span></td>
            <td style="font-size:12px;color:var(--text2)">${recs[item.impact] || '--'}</td>
            <td>
                <label class="toggle">
                    <input type="checkbox" ${item.Enabled ? 'checked' : ''} ${isReq ? 'disabled' : ''} data-name="${item.Name}" data-location="${item.Location}" data-command="${(item.Command || '').replace(/"/g,'&quot;')}">
                    <span class="toggle-slider"></span>
                </label>
            </td>
        `
        tbody.appendChild(tr)
    })

    tbody.querySelectorAll('input[type=checkbox]:not([disabled])').forEach(cb => {
        cb.addEventListener('change', async function () {
            const result = await invoke('toggle-startup-item', {
                name:     this.dataset.name,
                location: this.dataset.location,
                command:  this.dataset.command,
                enable:   this.checked,
            })
            addLog(`${this.dataset.name} startup ${this.checked ? 'enabled' : 'disabled'}`, this.checked ? 'info' : 'warning')
        })
    })
}


// ─── Services ────────────────────────────────────────────────
async function loadServices() {
    const tbody  = document.getElementById('svcBody')
    const count  = document.getElementById('svc-count')
    if (!tbody) return
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">Loading services...</td></tr>'

    const services = await invoke('get-services')
    if (!services) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">Could not load services.</td></tr>'; return }
    if (count) count.textContent = services.length + ' services'

    let allSvcs = services

    function renderSvcs(list) {
        tbody.innerHTML = ''
        list.forEach(s => {
            const tr = document.createElement('tr')
            const catClass = { 'essential': 'svc-essential', 'optional': 'svc-optional', 'depends': 'svc-depends', 'do-not-modify': 'svc-do-not-modify' }[s.category] || 'svc-depends'
            const catLabel = { 'essential': '🟢 Essential', 'optional': '🟡 Optional', 'depends': '🟠 Depends', 'do-not-modify': '🔴 Do Not Modify' }[s.category] || s.category
            const statusClass = s.status === 'Running' ? 'svc-status-running' : 'svc-status-stopped'
            tr.innerHTML = `<td style="font-size:12px">${s.name}</td><td>${s.displayName}</td><td class="${statusClass}">${s.status}</td><td>${s.startType}</td><td><span class="svc-cat ${catClass}">${catLabel}</span></td>`
            tbody.appendChild(tr)
        })
    }

    renderSvcs(allSvcs)

    const search = document.getElementById('svcSearch')
    const filter = document.getElementById('svcFilter')
    function applyFilter() {
        const q   = (search?.value || '').toLowerCase()
        const cat = filter?.value || 'all'
        const filtered = allSvcs.filter(s => {
            const matchQ = !q || s.name.toLowerCase().includes(q) || s.displayName.toLowerCase().includes(q)
            const matchC = cat === 'all' || s.category === cat
            return matchQ && matchC
        })
        renderSvcs(filtered)
    }
    search?.addEventListener('input', applyFilter)
    filter?.addEventListener('change', applyFilter)
}


// ─── Power Plans ─────────────────────────────────────────────
async function loadPowerPlans() {
    const data = await invoke('get-power-plan')
    const el   = document.getElementById('powerCurrent')
    if (el && data) el.textContent = '⚡ Active: ' + (data.active || 'Unknown')

    // Highlight active card
    document.querySelectorAll('.power-card').forEach(card => card.classList.remove('active'))
    if (data && data.active === 'Balanced')         document.getElementById('power-balanced')?.classList.add('active')
    if (data && data.active === 'High Performance') document.getElementById('power-performance')?.classList.add('active')
    if (data && data.active === 'Power Saver')      document.getElementById('power-saver')?.classList.add('active')

    document.querySelectorAll('.power-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const guid = this.dataset.guid
            await invoke('set-power-plan', { guid })
            loadPowerPlans()
            addLog('Power plan changed to ' + this.textContent.replace('Set ', ''), 'info')
        })
    })
}


// ─── Gaming Mode ─────────────────────────────────────────────
async function loadGamingMode() {
    const active = await invoke('gaming-mode-status')
    updateGamingModeUI(active)
}

function updateGamingModeUI(active) {
    const card    = document.getElementById('gamingModeCard')
    const text    = document.getElementById('gmStatusText')
    const startBtn= document.getElementById('gmStartBtn')
    const stopBtn = document.getElementById('gmStopBtn')
    if (card)  { card.classList.toggle('active', active) }
    if (text)  text.textContent = active ? 'Gaming Mode ACTIVE' : 'Gaming Mode Inactive'
    if (startBtn) startBtn.style.display = active ? 'none' : ''
    if (stopBtn)  stopBtn.style.display  = active ? '' : 'none'
}

document.getElementById('gmStartBtn')?.addEventListener('click', async function () {
    const result = await invoke('gaming-mode-start')
    if (result && result.success) {
        updateGamingModeUI(true)
        addLog('Gaming Mode activated', 'info')
    }
})

document.getElementById('gmStopBtn')?.addEventListener('click', async function () {
    const result = await invoke('gaming-mode-stop')
    updateGamingModeUI(false)
    addLog('Gaming Mode deactivated — settings restored', 'success')
})


