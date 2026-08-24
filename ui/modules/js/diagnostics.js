// ─── Battery ─────────────────────────────────────────────────
async function loadBattery() {
    const el = document.getElementById('batteryInfo')
    if (!el) return
    const data = await invoke('get-battery')
    if (!data || !data.hasBattery) {
        el.innerHTML = '<div class="bat-no-battery">No battery detected. This feature is for laptops only.</div>'
        return
    }

    const health = data.designCapacity && data.currentCapacity
        ? Math.round((data.currentCapacity / data.designCapacity) * 100) : null

    el.innerHTML = `
        <div class="battery-card">
            <div class="bat-header">
                <div class="bat-icon">${data.isCharging ? '🔌' : data.percent > 20 ? '🔋' : '🪫'}</div>
                <div>
                    <div class="bat-label">${data.percent}% ${data.isCharging ? '— Charging' : data.acConnected ? '— Plugged In' : '— On Battery'}</div>
                    <div class="bat-sub">${data.timeRemaining ? 'Est. ' + data.timeRemaining + ' min remaining' : ''}</div>
                </div>
            </div>
            <div class="bat-bar-wrap"><div class="bat-bar" style="width:${data.percent}%"></div></div>
            <div class="bat-grid" style="margin-top:16px">
                ${data.designCapacity ? `<div class="bat-stat"><div class="bat-stat-label">Design Capacity</div><div class="bat-stat-val">${(data.designCapacity/1000).toFixed(0)} Wh</div></div>` : ''}
                ${data.currentCapacity ? `<div class="bat-stat"><div class="bat-stat-label">Full Charge Capacity</div><div class="bat-stat-val">${(data.currentCapacity/1000).toFixed(0)} Wh</div></div>` : ''}
                ${health ? `<div class="bat-stat"><div class="bat-stat-label">Battery Health</div><div class="bat-stat-val" style="color:${health>80?'var(--text)':health>60?'var(--text)':'var(--text)'}">${health}%</div></div>` : ''}
                ${data.cycleCount ? `<div class="bat-stat"><div class="bat-stat-label">Cycle Count</div><div class="bat-stat-val">${data.cycleCount}</div></div>` : ''}
                ${data.voltage ? `<div class="bat-stat"><div class="bat-stat-label">Voltage</div><div class="bat-stat-val">${data.voltage.toFixed(2)} V</div></div>` : ''}
                ${data.manufacturer ? `<div class="bat-stat"><div class="bat-stat-label">Manufacturer</div><div class="bat-stat-val">${data.manufacturer}</div></div>` : ''}
            </div>
        </div>
    `
}


