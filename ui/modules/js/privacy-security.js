// ─── Privacy ─────────────────────────────────────────────────
async function loadPrivacy() {
    const grid = document.getElementById('privacyGrid')
    if (!grid) return
    const settings = await invoke('get-privacy-settings')
    if (!settings || !settings.length) { grid.innerHTML = '<div class="dc-loading">Could not read privacy settings.</div>'; return }

    grid.innerHTML = settings.map(s => {
        const isEnabled = s.current !== null && s.current !== 0
        const statusClass = isEnabled ? 'prv-enabled' : 'prv-disabled'
        const statusText  = isEnabled ? '⚠ Enabled' : '✓ Disabled'
        return `
            <div class="privacy-card">
                <div class="prv-info">
                    <div class="prv-label">${s.label}</div>
                    <div class="prv-desc">${s.desc}</div>
                </div>
                <span class="prv-status ${statusClass}">${statusText}</span>
            </div>
        `
    }).join('')
}


// ─── Security ────────────────────────────────────────────────
async function loadSecurity() {
    const grid = document.getElementById('securityGrid')
    if (!grid) return
    const data = await invoke('get-security-status')
    if (!data) { grid.innerHTML = '<div class="dc-loading">Could not check security status.</div>'; return }

    const items = [
        { label: 'Windows Defender', desc: 'Real-time malware protection', ok: data.defender, doNotModify: true },
        { label: 'Windows Firewall', desc: 'Network traffic protection', ok: data.firewallEnabled, doNotModify: true },
        { label: 'User Account Control (UAC)', desc: 'Admin privilege escalation prompt', ok: data.uacEnabled, doNotModify: true },
        { label: 'SMBv1 Protocol', desc: 'Legacy file sharing — security risk if enabled', ok: data.smb1Disabled, doNotModify: false },
    ]

    grid.innerHTML = items.map(item => `
        <div class="security-card">
            <div class="sec-info">
                <div class="sec-label">${item.label}</div>
                <div class="sec-desc">${item.desc}</div>
                ${item.doNotModify ? '<div class="sec-donotmodify">🔴 Do NOT disable for performance — this protects your system</div>' : ''}
            </div>
            <span class="sec-badge ${item.ok ? 'sec-ok' : 'sec-warn'}">${item.ok ? '✓ Protected' : '⚠ At Risk'}</span>
        </div>
    `).join('')
}


