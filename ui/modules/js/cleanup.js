// ─── Windows Cleanup ─────────────────────────────────────────
async function loadWindowsCleanup() {
    const grid = document.getElementById('winCleanupGrid')
    if (!grid) return

    const cats = await invoke('get-windows-cleanup')
    if (!cats) { grid.innerHTML = '<div class="dc-loading">Could not scan system.</div>'; return }

    const total = cats.reduce((s, c) => s + c.size, 0)
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
    set('win-total-size', total.toFixed(2) + ' GB')
    set('win-cat-count', cats.filter(c => c.size > 0).length + ' types')

    const colors = ['var(--text)','var(--text)','var(--text)','var(--text)','var(--text)','var(--text)']

    grid.innerHTML = ''
    cats.forEach((cat, i) => {
        if (!cat.exists && cat.size === 0) return
        const col = colors[i % colors.length]
        const pct = total > 0 ? Math.round((cat.size / total) * 100) : 0
        const card = document.createElement('div')
        card.className = 'dc-card'
        card.innerHTML = `
            <div class="dc-card-accent" style="--c:${col};background:${col}"></div>
            <div class="dc-card-top">
                <div class="dc-card-icon" style="background:${col}20;border:1px solid ${col}40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                </div>
                <div class="dc-card-meta"><h4>${cat.label}</h4><span class="dc-card-loc">${cat.path || 'All drives'}</span></div>
                <div class="dc-card-size" style="color:${col}">${cat.size > 0 ? cat.size.toFixed(2) + ' GB' : '<1 MB'}</div>
            </div>
            <div class="dc-card-bar-wrap"><div class="dc-card-bar" style="width:${pct}%;background:${col}"></div></div>
            <div class="dc-card-footer">
                <span class="dc-card-pct" style="color:${col}">${pct}% of total</span>
                <button class="dc-btn" data-path="${cat.path || ''}" data-label="${cat.label}" style="--btn-c:${col};--btn-cg:${col}20;--btn-cb:${col}40">${cat.id === 'recycle' ? 'Empty' : 'Clean'}</button>
            </div>
        `
        grid.appendChild(card)
    })

    // Bind clean buttons
    grid.querySelectorAll('.dc-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (this.classList.contains('running')) return
            const orig = this.textContent
            this.classList.add('running')
            this.textContent = 'Cleaning...'
            const result = await invoke('clean-path', { dirPath: this.dataset.path, label: this.dataset.label })
            this.classList.remove('running')
            this.classList.add('done')
            this.textContent = '✓ Done'
            addLog(`${this.dataset.label} cleaned`, 'success')
            setTimeout(() => { this.classList.remove('done'); this.textContent = orig }, 4000)
        })
    })
}

// Clean All
document.getElementById('win-clean-all')?.addEventListener('click', async function () {
    this.classList.add('running')
    this.textContent = 'Cleaning all...'
    const cats = await invoke('get-windows-cleanup')
    if (cats) {
        for (const c of cats.filter(c => c.size > 0)) {
            if (c.path) await invoke('clean-path', { dirPath: c.path, label: c.label })
        }
    }
    this.classList.remove('running')
    this.textContent = '✓ All Cleaned'
    addLog('Windows cleanup complete', 'success')
    const el = document.getElementById('win-last-clean'); if (el) el.textContent = 'Just now'
    setTimeout(() => { this.textContent = 'Clean Selected' }, 4000)
})


