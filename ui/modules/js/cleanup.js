// ─── Windows Cleanup ─────────────────────────────────────────
const CLEANUP_DEMO_MODE = true

async function loadWindowsCleanup() {
    const windowsGrid = document.getElementById('winCleanupGrid')
    if (!windowsGrid) return
    const browserGrid = document.getElementById('browserCleanupGrid')
    const developerGrid = document.getElementById('devCleanupGrid')
    const rescanButton = document.getElementById('cleanup-rescan')
    if (rescanButton) rescanButton.disabled = true

    const setText = (id, text) => {
        const element = document.getElementById(id)
        if (element) element.textContent = text
    }
    const formatSize = sizeGB => sizeGB >= 1 ? `${sizeGB.toFixed(2)} GB` : `${Math.round(sizeGB * 1000)} MB`
    const makeRow = ({ title, description, detail, actionLabel, action, disabled = false }) => {
        const row = document.createElement('div')
        row.className = 'tweak-item cleanup-method-row'
        const icon = document.createElement('div')
        icon.className = 'tweak-icon cleanup-method-icon'
        icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M6 7l1 14h10l1-14M9 7V4h6v3"></path></svg>'
        const info = document.createElement('div')
        info.className = 'tweak-info'
        const heading = document.createElement('h3')
        heading.textContent = title
        const summary = document.createElement('p')
        summary.textContent = description
        info.append(heading, summary)
        if (detail) {
            const size = document.createElement('span')
            size.className = 'cleanup-method-size'
            size.textContent = detail
            info.appendChild(size)
        }
        const button = document.createElement('button')
        button.className = 'run-btn cleanup-method-button'
        button.type = 'button'
        button.textContent = actionLabel
        button.disabled = disabled
        button.addEventListener('click', async () => {
            if (button.disabled || button.classList.contains('running')) return
            button.disabled = true
            if (CLEANUP_DEMO_MODE) {
                button.textContent = 'Demo only'
                button.title = 'Demo data is active; no files will be changed.'
                addLog(`${title} previewed (demo mode)`, 'info')
                setTimeout(() => {
                    button.disabled = disabled
                    button.textContent = actionLabel
                }, 1800)
                return
            }
            button.classList.add('running')
            button.textContent = 'Working...'
            try {
                const result = await action()
                if (!result || result.success === false) throw new Error(result?.error || 'Action failed')
                button.classList.remove('running')
                button.classList.add('done')
                button.textContent = 'Done'
                addLog(`${title} completed`, 'success')
            } catch (error) {
                button.classList.remove('running')
                button.textContent = 'Retry'
                button.title = error.message
                addLog(`${title} failed: ${error.message}`, 'warning')
            }
            setTimeout(() => {
                button.classList.remove('running', 'done')
                button.disabled = disabled
                button.textContent = actionLabel
            }, 3500)
        })
        row.append(icon, info, button)
        return row
    }

    try {
        const [categories, browsers, developerCaches] = CLEANUP_DEMO_MODE
            ? [[
                { id: 'temp', label: 'User Temp Files', path: 'C:\\Users\\Demo\\AppData\\Local\\Temp', size: 0.68, exists: true },
                { id: 'wtemp', label: 'Windows Temp', path: 'C:\\Windows\\Temp', size: 0.14, exists: true },
                { id: 'wu', label: 'Windows Update Cache', path: 'C:\\Windows\\SoftwareDistribution\\Download', size: 1.21, exists: true },
                { id: 'delivopt', label: 'Delivery Optimization Cache', path: 'C:\\Windows\\SoftwareDistribution\\DeliveryOptimization', size: 0.42, exists: true },
                { id: 'thumb', label: 'Thumbnail Cache', path: 'C:\\Users\\Demo\\AppData\\Local\\Microsoft\\Windows\\Explorer', size: 0.13, exists: true },
                { id: 'shader', label: 'DirectX Shader Cache', path: 'C:\\Users\\Demo\\AppData\\Local\\D3DSCache', size: 0.31, exists: true },
                { id: 'wer', label: 'Windows Error Reports', path: 'C:\\Users\\Demo\\AppData\\Local\\CrashDumps', size: 0.05, exists: true },
                { id: 'dumps', label: 'Crash Dumps', path: 'C:\\Windows\\Minidump', size: 0.02, exists: true },
                { id: 'logs', label: 'Windows Logs', path: 'C:\\Windows\\Logs', size: 0.09, exists: true },
                { id: 'prefetch', label: 'Prefetch Cache', path: 'C:\\Windows\\Prefetch', size: 0.03, exists: true },
                { id: 'recycle', label: 'Recycle Bin', path: null, size: 0.74, exists: true },
                { id: 'setup', label: 'Setup Leftover Files', path: 'C:\\$WINDOWS.~BT', size: 0, exists: false },
            ], [
                { label: 'Google Chrome', cachePaths: ['C:\\Demo\\Chrome\\Cache'], cacheSize: 0.64 },
                { label: 'Microsoft Edge', cachePaths: ['C:\\Demo\\Edge\\Cache'], cacheSize: 0.28 },
                { label: 'Mozilla Firefox', cachePaths: ['C:\\Demo\\Firefox\\cache2'], cacheSize: 0.11 },
                { label: 'Brave Browser', cachePaths: ['C:\\Demo\\Brave\\Cache'], cacheSize: 0.34 },
                { label: 'Opera', cachePaths: ['C:\\Demo\\Opera\\Cache'], cacheSize: 0.19 },
            ], [
                { label: 'npm cache', path: 'C:\\Demo\\npm-cache', size: 1.6 },
                { label: 'pip cache', path: 'C:\\Demo\\pip\\Cache', size: 0.82 },
                { label: 'Yarn cache', path: 'C:\\Demo\\Yarn\\Cache', size: 0.43 },
                { label: 'pnpm store', path: 'C:\\Demo\\pnpm\\store', size: 1.12 },
                { label: 'Gradle caches', path: 'C:\\Demo\\.gradle\\caches', size: 0.76 },
                { label: 'Maven repository', path: 'C:\\Demo\\.m2\\repository', size: 0.58 },
                { label: 'NuGet cache', path: 'C:\\Demo\\.nuget\\packages', size: 0.91 },
                { label: 'Cargo cache', path: 'C:\\Demo\\.cargo\\registry', size: 0.37 },
            ]]
            : await Promise.all([
                invoke('get-windows-cleanup'),
                invoke('get-browser-caches'),
                invoke('get-dev-caches'),
            ])

        const total = categories.reduce((sum, category) => sum + (Number(category.size) || 0), 0)
        setText('win-total-size', formatSize(total))
        setText('win-cat-count', `${categories.filter(category => category.exists).length} found`)
        setText('cleanup-demo-status', CLEANUP_DEMO_MODE ? 'Demo data · actions preview only' : '')
        windowsGrid.replaceChildren()
        categories.filter(category => category.exists).forEach(category => {
            const size = Number(category.size) || 0
            const description = category.id === 'recycle'
                ? 'Permanently removes items currently in the Recycle Bin.'
                : category.id === 'wu'
                ? 'Clears downloaded Windows Update files; the update service is paused and restarted.'
                : `Removes temporary contents from ${category.path}.`
            const action = category.id === 'recycle'
                ? () => invoke('empty-recycle-bin')
                : category.id === 'wu'
                ? () => invoke('windows-update-cleanup')
                : () => invoke('clean-path', { dirPath: category.path, label: category.label })
            windowsGrid.appendChild(makeRow({
                title: category.label,
                description,
                detail: `${formatSize(size)} available`,
                actionLabel: category.id === 'recycle' ? 'Empty' : 'Clean',
                action,
            }))
        })
        if (!windowsGrid.children.length) windowsGrid.textContent = 'No Windows cleanup categories found.'

        browserGrid.replaceChildren()
        ;(Array.isArray(browsers) ? browsers : []).forEach(browser => {
            const paths = browser.cachePaths || (browser.cache ? [browser.cache] : [])
            const safePaths = paths.filter(cachePath => cachePath && !cachePath.toLowerCase().includes('cookies'))
            browserGrid.appendChild(makeRow({
                title: browser.label,
                description: 'Clear browser cache files only. Cookies, saved passwords, and browsing history are kept.',
                detail: `${formatSize(Number(browser.cacheSize) || 0)} cache`,
                actionLabel: 'Clear Cache',
                disabled: !safePaths.length,
                action: async () => {
                    for (const cachePath of safePaths) {
                        const result = await invoke('clean-path', { dirPath: cachePath, label: `${browser.label} cache` })
                        if (!result?.success) return result
                    }
                    return { success: true }
                },
            }))
        })
        if (!browserGrid.children.length) browserGrid.textContent = 'No supported browser caches found.'

        developerGrid.replaceChildren()
        ;(Array.isArray(developerCaches) ? developerCaches : []).forEach(cache => {
            developerGrid.appendChild(makeRow({
                title: cache.label,
                description: 'Package cache; contents can usually be downloaded again when needed.',
                detail: `${formatSize(Number(cache.size) || 0)} cache`,
                actionLabel: 'Clear Cache',
                action: () => invoke('clean-path', { dirPath: cache.path, label: cache.label }),
            }))
        })
        if (!developerGrid.children.length) developerGrid.textContent = 'No developer caches found.'
    } catch (error) {
        windowsGrid.textContent = `Could not scan cleanup targets: ${error.message}`
        if (browserGrid) browserGrid.textContent = 'Browser cache scan failed.'
        if (developerGrid) developerGrid.textContent = 'Developer cache scan failed.'
    } finally {
        if (rescanButton) rescanButton.disabled = false
    }
}

document.getElementById('cleanup-rescan')?.addEventListener('click', loadWindowsCleanup)

document.querySelectorAll('.cleanup-drive-action').forEach(button => {
    button.addEventListener('click', async () => {
        button.disabled = true
        const label = button.textContent
        if (CLEANUP_DEMO_MODE) {
            button.textContent = 'Demo only'
            button.title = 'Demo data is active; no drive operation will run.'
            addLog(`${label} previewed (demo mode)`, 'info')
            setTimeout(() => { button.textContent = label; button.disabled = false }, 1800)
            return
        }
        button.textContent = 'Working...'
        try {
            const result = await invoke('optimize-drive', {
                drive: button.dataset.drive,
                isSSD: button.dataset.ssd === 'true',
            })
            if (!result?.success) throw new Error(result?.error || 'Drive maintenance failed')
            button.textContent = 'Done'
            addLog(`${label} completed for ${button.dataset.drive}`, 'success')
        } catch (error) {
            button.textContent = 'Retry'
            button.title = error.message
            addLog(`Drive maintenance failed: ${error.message}`, 'warning')
        }
        setTimeout(() => { button.textContent = label; button.disabled = false }, 3500)
    })
})


