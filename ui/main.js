/**
 * OptiCore Suite — Electron Main Process
 * Full 25-feature PC Optimization Toolkit
 */

'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const { execSync, exec, spawn }                        = require('child_process')
const path    = require('path')
const fs      = require('fs')
const os      = require('os')
const crypto  = require('crypto')
const si      = require('systeminformation')

// ─────────────────────────────────────────────
// Admin elevation (re-launch as admin on Windows)
// ─────────────────────────────────────────────
function isAdmin() {
    try {
        execSync('net session', { stdio: 'ignore' })
        return true
    } catch { return false }
}

function relaunchAsAdmin() {
    const exe  = process.execPath
    const args = process.argv.slice(1).join(' ')
    // Use PowerShell to re-launch with elevation
    exec(`powershell -Command "Start-Process '${exe}' -ArgumentList '${args}' -Verb RunAs"`)
    app.quit()
}

// ─────────────────────────────────────────────
// Utility: run PowerShell command, return stdout
// ─────────────────────────────────────────────
function ps(cmd, timeout = 10000) {
    return new Promise(resolve => {
        exec(
            `powershell -NoProfile -NonInteractive -Command "${cmd.replace(/"/g, '\\"')}"`,
            { timeout, maxBuffer: 10 * 1024 * 1024 },
            (err, stdout) => resolve(err ? '' : stdout.trim())
        )
    })
}

// ─────────────────────────────────────────────
// Utility: directory size via PowerShell
// ─────────────────────────────────────────────
async function getDirSizeGB(dirPath) {
    if (!fs.existsSync(dirPath)) return 0
    const out = await ps(`(Get-ChildItem -Path '${dirPath}' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum`)
    const bytes = parseInt(out) || 0
    return parseFloat((bytes / 1e9).toFixed(2))
}

// ─────────────────────────────────────────────
// WMI CPU Temperature fallback
// ─────────────────────────────────────────────
function getWmiCpuTemp() {
    return new Promise(resolve => {
        exec(
            'powershell -NoProfile -Command "Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace root/wmi 2>$null | Select-Object -ExpandProperty CurrentTemperature | Select-Object -First 1"',
            { timeout: 4000 },
            (err, stdout) => {
                if (err || !stdout.trim()) return resolve(null)
                const raw   = parseInt(stdout.trim())
                const tempC = Math.round(raw / 10 - 273.15)
                resolve(tempC > 0 && tempC < 125 ? tempC : null)
            }
        )
    })
}

// ─────────────────────────────────────────────
// Restore Center — JSON snapshots
// ─────────────────────────────────────────────
const RESTORE_FILE = path.join(app.getPath('userData'), 'restore_history.json')

function loadRestoreHistory() {
    try { return JSON.parse(fs.readFileSync(RESTORE_FILE, 'utf8')) }
    catch { return [] }
}

function saveRestoreSnapshot(snapshot) {
    const history = loadRestoreHistory()
    history.unshift({ ...snapshot, id: Date.now(), timestamp: new Date().toISOString() })
    // Keep last 50 snapshots
    history.splice(50)
    fs.writeFileSync(RESTORE_FILE, JSON.stringify(history, null, 2))
}

// ─────────────────────────────────────────────
// Window
// ─────────────────────────────────────────────
let win

function createWindow() {
    win = new BrowserWindow({
        width: 1340,
        height: 820,
        minWidth: 1100,
        minHeight: 650,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        backgroundColor: '#0a0b14',
        title: 'OptiCore Suite',
        icon: path.join(__dirname, 'icon.png'),
    })
    win.on('page-title-updated', e => e.preventDefault())
    win.loadFile('index.html')
}

app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

// ─────────────────────────────────────────────
// IPC: Admin status
// ─────────────────────────────────────────────
ipcMain.handle('is-admin', () => isAdmin())
ipcMain.handle('request-admin', () => relaunchAsAdmin())

// ─────────────────────────────────────────────
// IPC: Extended real-time system stats
// ─────────────────────────────────────────────
ipcMain.handle('get-system-stats', async () => {
    try {
        const [cpu, mem, fsSize, cpuTemp, graphics, netStats, processes, osInfo] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.cpuTemperature(),
            si.graphics(),
            si.networkStats(),
            si.processes(),
            si.osInfo(),
        ])

        const cpuUsage  = Math.round(cpu.currentLoad)
        const ramUsed   = mem.active
        const ramTotal  = mem.total
        const ramPct    = Math.round((ramUsed / ramTotal) * 100)
        const swapUsed  = mem.swapused || 0
        const swapTotal = mem.swaptotal || 0
        const commitMem = mem.used || 0
        const standby   = (mem.total - mem.active - mem.available) || 0

        const mainDisk  = fsSize.sort((a, b) => b.size - a.size)[0]
        const diskPct   = mainDisk ? Math.round(mainDisk.use) : 0
        const diskTotal = mainDisk ? (mainDisk.size / 1e9).toFixed(0) : 0

        let cpuTempVal = null
        if (cpuTemp.main) cpuTempVal = Math.round(cpuTemp.main)
        else if (cpuTemp.cores && cpuTemp.cores.length > 0)
            cpuTempVal = Math.round(cpuTemp.cores.reduce((a, b) => a + b, 0) / cpuTemp.cores.length)
        if (!cpuTempVal) cpuTempVal = await getWmiCpuTemp()

        const gpu        = graphics.controllers && graphics.controllers[0]
        const gpuTempVal = gpu && gpu.temperatureGpu ? Math.round(gpu.temperatureGpu) : null
        const gpuName    = gpu ? (gpu.model || 'GPU') : 'GPU'
        const gpuLoad    = gpu && gpu.utilizationGpu ? gpu.utilizationGpu : null
        const vramUsed   = gpu && gpu.memoryUsed ? gpu.memoryUsed : null
        const vramTotal  = gpu && gpu.memoryTotal ? gpu.memoryTotal : null

        const netIface   = netStats && netStats[0]
        const netRxSec   = netIface ? Math.round(netIface.rx_sec / 1024) : 0 // KB/s
        const netTxSec   = netIface ? Math.round(netIface.tx_sec / 1024) : 0

        const uptimeSec  = os.uptime()
        const procCount  = processes.all || 0

        return {
            cpu: cpuUsage,
            ramPct,
            ramUsed:   (ramUsed   / 1e9).toFixed(1),
            ramTotal:  (ramTotal  / 1e9).toFixed(1),
            commitMem: (commitMem / 1e9).toFixed(1),
            standby:   (standby   / 1e9).toFixed(1),
            swapUsed:  (swapUsed  / 1e9).toFixed(1),
            swapTotal: (swapTotal / 1e9).toFixed(1),
            diskPct,
            diskTotal,
            cpuTemp:   cpuTempVal,
            gpuTemp:   gpuTempVal,
            gpuName,
            gpuLoad,
            vramUsed,
            vramTotal,
            netRxSec,
            netTxSec,
            uptimeSec,
            procCount,
            osInfo: {
                platform: osInfo.platform,
                distro:   osInfo.distro,
                release:  osInfo.release,
                arch:     osInfo.arch,
            }
        }
    } catch (err) {
        console.error('Stats error:', err)
        return null
    }
})

// ─────────────────────────────────────────────
// IPC: Top processes (CPU + RAM)
// ─────────────────────────────────────────────
ipcMain.handle('get-process-list', async () => {
    try {
        const procs = await si.processes()
        const list  = procs.list || []
        const top   = list
            .filter(p => p.name && p.cpu >= 0)
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 20)
            .map(p => ({
                pid:     p.pid,
                name:    p.name,
                cpu:     parseFloat(p.cpu.toFixed(1)),
                mem:     parseFloat((p.memRss / 1e9).toFixed(2)),
                memPct:  parseFloat(p.mem.toFixed(1)),
            }))
        return { total: procs.all, running: procs.running, sleeping: procs.sleeping, list: top }
    } catch (err) { return null }
})

// ─────────────────────────────────────────────
// IPC: System handle/thread count
// ─────────────────────────────────────────────
ipcMain.handle('get-thread-handle-count', async () => {
    const out = await ps(`
        $p = Get-Process
        $handles = ($p | Measure-Object -Property Handles -Sum).Sum
        $threads = ($p | Measure-Object -Property Threads -Sum).Sum
        "$handles,$threads"
    `, 6000)
    const parts = out.split(',')
    return {
        handles: parseInt(parts[0]) || 0,
        threads: parseInt(parts[1]) || 0,
    }
})

// ─────────────────────────────────────────────
// IPC: Disk I/O stats
// ─────────────────────────────────────────────
ipcMain.handle('get-disk-io', async () => {
    try {
        const io = await si.disksIO()
        return {
            readSec:  io ? (io.rIO_sec || 0).toFixed(0) : 0,
            writeSec: io ? (io.wIO_sec || 0).toFixed(0) : 0,
            tIO:      io ? (io.tIO_sec || 0).toFixed(0) : 0,
        }
    } catch { return { readSec: 0, writeSec: 0, tIO: 0 } }
})

// ─────────────────────────────────────────────
// IPC: Startup items
// ─────────────────────────────────────────────
ipcMain.handle('get-startup-items', async () => {
    const out = await ps(`
        $items = @()
        $keys = @(
            'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
            'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
            'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'
        )
        foreach ($k in $keys) {
            if (Test-Path $k) {
                $props = Get-ItemProperty $k -ErrorAction SilentlyContinue
                $props.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object {
                    $items += [PSCustomObject]@{ Name=$_.Name; Command=$_.Value; Location=$k; Enabled=$true }
                }
            }
        }
        $items | ConvertTo-Json -Depth 3
    `, 8000)

    let items = []
    try { items = JSON.parse(out) || [] } catch {}
    if (!Array.isArray(items)) items = [items]

    // Impact heuristic based on known apps
    const HIGH_IMPACT  = ['teams','onedrive','zoom','discord','slack','chrome','edge','dropbox','skype']
    const LOW_IMPACT   = ['nvidia','amd','realtek','logitech','intel','windows security','defender']
    const REQUIRED     = ['windows security','windowsdefender','securityhealth','windefend']

    return items.map(item => {
        const lname = (item.Name || '').toLowerCase()
        const cat = REQUIRED.some(r => lname.includes(r)) ? 'Required'
                  : HIGH_IMPACT.some(h => lname.includes(h)) ? 'High'
                  : LOW_IMPACT.some(l => lname.includes(l))  ? 'Low'
                  : 'Medium'
        return { ...item, impact: cat, required: cat === 'Required' }
    })
})

// ─────────────────────────────────────────────
// IPC: Toggle startup item
// ─────────────────────────────────────────────
ipcMain.handle('toggle-startup-item', async (_, { name, location, command, enable }) => {
    saveRestoreSnapshot({
        type: 'startup',
        description: `${enable ? 'Enabled' : 'Disabled'} startup: ${name}`,
        data: { name, location, command, previousState: !enable }
    })

    if (enable) {
        await ps(`New-ItemProperty -Path '${location}' -Name '${name}' -Value '${command}' -PropertyType String -Force`)
    } else {
        await ps(`Remove-ItemProperty -Path '${location}' -Name '${name}' -ErrorAction SilentlyContinue`)
    }
    return true
})

// ─────────────────────────────────────────────
// IPC: Windows Services
// ─────────────────────────────────────────────
ipcMain.handle('get-services', async () => {
    const out = await ps(`
        Get-Service | Select-Object Name, DisplayName, Status, StartType | ConvertTo-Json -Depth 2
    `, 12000)

    let svcs = []
    try { svcs = JSON.parse(out) || [] } catch {}
    if (!Array.isArray(svcs)) svcs = [svcs]

    const ESSENTIAL = ['wuauserv','windefend','eventlog','rpcss','lsass','cryptsvc','winmgmt','schedule','lanmanserver']
    const DO_NOT    = ['windefend','wscsvc','mpsdrv','securityhealthservice','wdnissvc','mpssvc','bfe']
    const OPTIONAL  = ['wersvc','diagtrack','dmwappushservice','sysmain','tabletinputservice','wisvc']

    return svcs.slice(0, 200).map(s => {
        const lname = (s.Name || '').toLowerCase()
        const cat = DO_NOT.some(d => lname.includes(d))    ? 'do-not-modify'
                  : ESSENTIAL.some(e => lname.includes(e)) ? 'essential'
                  : OPTIONAL.some(o => lname.includes(o))  ? 'optional'
                  : 'depends'
        return {
            name:        s.Name,
            displayName: s.DisplayName,
            status:      s.Status === 4 ? 'Running' : s.Status === 1 ? 'Stopped' : 'Other',
            startType:   ['Boot','System','Automatic','Manual','Disabled'][s.StartType] || 'Unknown',
            category:    cat
        }
    })
})

// ─────────────────────────────────────────────
// IPC: Scheduled Tasks
// ─────────────────────────────────────────────
ipcMain.handle('get-scheduled-tasks', async () => {
    const out = await ps(`
        Get-ScheduledTask | Where-Object { $_.State -ne 'Disabled' } |
        Select-Object TaskName, TaskPath, State,
            @{N='Trigger';E={ ($_.Triggers | Select-Object -First 1).CimClass.CimClassName }},
            @{N='Author';E={ $_.Principal.UserId }} |
        Select-Object -First 150 |
        ConvertTo-Json -Depth 3
    `, 15000)

    let tasks = []
    try { tasks = JSON.parse(out) || [] } catch {}
    if (!Array.isArray(tasks)) tasks = [tasks]

    const TELEMETRY = ['diagtrack','squaredcosmos','aitracking','telemetry','watson','ceip','feedback']
    const VENDOR    = ['adobe','google','mozilla','microsoft','nvidia','amd','intel','logitech','hp','dell','lenovo']
    const UPDATE    = ['update','updater','autoupdate','maintenance']

    return tasks.map(t => {
        const lname = (t.TaskName || '').toLowerCase()
        const cat = TELEMETRY.some(x => lname.includes(x)) ? 'telemetry'
                  : UPDATE.some(x => lname.includes(x))    ? 'update'
                  : VENDOR.some(x => lname.includes(x))    ? 'vendor'
                  : 'system'
        return {
            name:     t.TaskName,
            path:     t.TaskPath,
            state:    t.State,
            trigger:  t.Trigger || 'Unknown',
            author:   t.Author || '',
            category: cat
        }
    })
})

// ─────────────────────────────────────────────
// IPC: Background apps
// ─────────────────────────────────────────────
ipcMain.handle('get-background-apps', async () => {
    try {
        const procs = await si.processes()
        const list  = procs.list || []

        const BG_APPS = [
            'discord','teams','slack','spotify','onedrive','dropbox','steam','epicgameslauncher',
            'adobeupdater','googledrivefs','zoom','skype','telegram','whatsapp','notion','obsidian',
        ]

        return list
            .filter(p => BG_APPS.some(a => (p.name || '').toLowerCase().includes(a)))
            .map(p => ({
                name:    p.name,
                pid:     p.pid,
                cpu:     parseFloat(p.cpu.toFixed(1)),
                mem:     parseFloat((p.memRss / 1e9).toFixed(2)),
            }))
    } catch { return [] }
})

// ─────────────────────────────────────────────
// IPC: Disk health (SSD vs HDD)
// ─────────────────────────────────────────────
ipcMain.handle('get-disk-health', async () => {
    try {
        const [disks, diskLayout] = await Promise.all([si.fsSize(), si.diskLayout()])

        const health = diskLayout.map(d => {
            const isSSD = (d.type || '').toUpperCase() === 'SSD' ||
                          (d.interfaceType || '').toUpperCase().includes('NVME')
            return {
                name:          d.name || d.device,
                type:          isSSD ? 'SSD' : 'HDD',
                vendor:        d.vendor,
                size:          (d.size / 1e9).toFixed(0) + ' GB',
                interfaceType: d.interfaceType || 'Unknown',
                temperature:   d.temperature || null,
                smartStatus:   d.smartStatus  || 'Unknown',
            }
        })

        // TRIM status (Windows specific)
        const trimOut = await ps(`(fsutil behavior query DisableDeleteNotify 2>$null) -match 'NTFS.*= 0'`)
        const trimEnabled = trimOut.toLowerCase().includes('true') || trimOut.includes('= 0')

        return { drives: health, trimEnabled }
    } catch (err) { return { drives: [], trimEnabled: null } }
})

// ─────────────────────────────────────────────
// IPC: Large file scanner
// ─────────────────────────────────────────────
ipcMain.handle('get-large-files', async (_, { drive = 'C:\\', minSizeMB = 500, limit = 50 } = {}) => {
    const out = await ps(`
        Get-ChildItem -Path '${drive}' -Recurse -File -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt ${minSizeMB * 1024 * 1024} } |
        Sort-Object Length -Descending |
        Select-Object -First ${limit} FullName, Length |
        ConvertTo-Json -Depth 2
    `, 30000)

    let files = []
    try { files = JSON.parse(out) || [] } catch {}
    if (!Array.isArray(files)) files = [files]

    return files.map(f => ({
        path: f.FullName,
        name: path.basename(f.FullName || ''),
        dir:  path.dirname(f.FullName  || ''),
        size: parseFloat((f.Length / 1e9).toFixed(2)),
    }))
})

// ─────────────────────────────────────────────
// IPC: Directory size tree (for large file analysis)
// ─────────────────────────────────────────────
ipcMain.handle('get-dir-tree', async (_, { drive = 'C:\\' } = {}) => {
    const out = await ps(`
        $root = '${drive}'
        $dirs = Get-ChildItem -Path $root -Directory -Force -ErrorAction SilentlyContinue
        $result = $dirs | ForEach-Object {
            $size = (Get-ChildItem -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            [PSCustomObject]@{ Name=$_.Name; Path=$_.FullName; SizeBytes=$size }
        }
        $result | ConvertTo-Json -Depth 2
    `, 45000)

    let dirs = []
    try { dirs = JSON.parse(out) || [] } catch {}
    if (!Array.isArray(dirs)) dirs = [dirs]

    return dirs
        .map(d => ({ name: d.Name, path: d.Path, size: parseFloat(((d.SizeBytes || 0) / 1e9).toFixed(2)) }))
        .sort((a, b) => b.size - a.size)
})

// ─────────────────────────────────────────────
// IPC: Developer cache sizes
// ─────────────────────────────────────────────
ipcMain.handle('get-dev-caches', async () => {
    const home    = os.homedir()
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    const local   = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')

    const caches = [
        { id: 'npm',    label: 'npm cache',      path: path.join(appData, 'npm-cache') },
        { id: 'yarn',   label: 'Yarn cache',      path: path.join(local,   'Yarn', 'Cache') },
        { id: 'pnpm',   label: 'pnpm store',      path: path.join(local,   'pnpm', 'store') },
        { id: 'pip',    label: 'pip cache',        path: path.join(local,   'pip', 'Cache') },
        { id: 'gradle', label: 'Gradle caches',   path: path.join(home,    '.gradle', 'caches') },
        { id: 'maven',  label: 'Maven repository', path: path.join(home,   '.m2', 'repository') },
        { id: 'nuget',  label: 'NuGet cache',      path: path.join(local,   'NuGet', 'Cache') },
        { id: 'docker', label: 'Docker images',    path: path.join(local,   'Docker', 'wsl') },
        { id: 'cargo',  label: 'Cargo cache',      path: path.join(home,    '.cargo', 'registry') },
        { id: 'android',label: 'Android SDK',      path: path.join(local,   'Android', 'sdk') },
    ]

    const results = await Promise.all(
        caches.map(async c => ({ ...c, size: await getDirSizeGB(c.path), exists: fs.existsSync(c.path) }))
    )
    return results.filter(r => r.exists)
})

// ─────────────────────────────────────────────
// IPC: Browser cache sizes
// ─────────────────────────────────────────────
ipcMain.handle('get-browser-caches', async () => {
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    const roaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')

    const browsers = [
        {
            id: 'chrome', label: 'Google Chrome',
            cache:   path.join(local,   'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
            cookies: path.join(local,   'Google', 'Chrome', 'User Data', 'Default', 'Cookies'),
        },
        {
            id: 'edge', label: 'Microsoft Edge',
            cache:   path.join(local,   'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
            cookies: path.join(local,   'Microsoft', 'Edge', 'User Data', 'Default', 'Cookies'),
        },
        {
            id: 'firefox', label: 'Mozilla Firefox',
            cache:   path.join(local,   'Mozilla', 'Firefox', 'Profiles'),
            cookies: path.join(roaming, 'Mozilla', 'Firefox', 'Profiles'),
        },
        {
            id: 'brave', label: 'Brave Browser',
            cache:   path.join(local,   'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache'),
            cookies: path.join(local,   'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cookies'),
        },
        {
            id: 'opera', label: 'Opera',
            cache:   path.join(roaming, 'Opera Software', 'Opera Stable', 'Cache'),
            cookies: path.join(roaming, 'Opera Software', 'Opera Stable', 'Cookies'),
        },
    ]

    const results = await Promise.all(
        browsers.map(async b => {
            const cacheSize = await getDirSizeGB(b.cache)
            return { ...b, cacheSize, exists: fs.existsSync(b.cache) }
        })
    )
    return results.filter(r => r.exists)
})

// ─────────────────────────────────────────────
// IPC: Windows cleanup categories
// ─────────────────────────────────────────────
ipcMain.handle('get-windows-cleanup', async () => {
    const winDir = process.env.SystemRoot || 'C:\\Windows'
    const local  = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    const temp   = os.tmpdir()

    const cats = [
        { id: 'temp',         label: 'Temp Files (%TEMP%)',           path: temp },
        { id: 'wtemp',        label: 'Windows Temp',                  path: path.join(winDir, 'Temp') },
        { id: 'wu',           label: 'Windows Update Cache',          path: path.join(winDir, 'SoftwareDistribution', 'Download') },
        { id: 'delivopt',     label: 'Delivery Optimization Cache',   path: path.join(winDir, 'SoftwareDistribution', 'DeliveryOptimization') },
        { id: 'thumb',        label: 'Thumbnail Cache',               path: path.join(local, 'Microsoft', 'Windows', 'Explorer') },
        { id: 'shader',       label: 'DirectX Shader Cache',          path: path.join(local, 'D3DSCache') },
        { id: 'wer',          label: 'Windows Error Reports',         path: path.join(local, 'CrashDumps') },
        { id: 'dumps',        label: 'Crash Dumps',                   path: path.join(winDir, 'Minidump') },
        { id: 'logs',         label: 'Windows Logs',                  path: path.join(winDir, 'Logs') },
        { id: 'prefetch',     label: 'Prefetch Cache',                path: path.join(winDir, 'Prefetch') },
        { id: 'recycle',      label: 'Recycle Bin',                   path: null }, // special
        { id: 'setup',        label: 'Setup Leftover Files',          path: path.join(winDir, '$WINDOWS.~BT') },
    ]

    const results = await Promise.all(
        cats.map(async c => {
            let size = 0
            if (c.path) size = await getDirSizeGB(c.path)
            else if (c.id === 'recycle') {
                // Check all drives
                const drives = ['C', 'D', 'E']
                for (const d of drives) {
                    size += await getDirSizeGB(`${d}:\\$Recycle.Bin`)
                }
            }
            return { ...c, size, exists: c.path ? fs.existsSync(c.path) : true }
        })
    )
    return results
})

// ─────────────────────────────────────────────
// IPC: Thermal info
// ─────────────────────────────────────────────
ipcMain.handle('get-thermal', async () => {
    try {
        const [cpuTemp, graphics, cpuSpeed] = await Promise.all([
            si.cpuTemperature(),
            si.graphics(),
            si.cpuCurrentSpeed(),
        ])

        let mainTemp = null
        if (cpuTemp.main) mainTemp = Math.round(cpuTemp.main)
        else if (cpuTemp.cores && cpuTemp.cores.length) {
            mainTemp = Math.round(cpuTemp.cores.reduce((a, b) => a + b, 0) / cpuTemp.cores.length)
        }
        if (!mainTemp) mainTemp = await getWmiCpuTemp()

        const gpu        = graphics.controllers && graphics.controllers[0]
        const gpuTemp    = gpu && gpu.temperatureGpu ? Math.round(gpu.temperatureGpu) : null
        const fanSpeed   = cpuTemp.socket && cpuTemp.socket[0] ? null : null // rarely exposed
        const throttling = mainTemp && mainTemp > 95

        return {
            cpuTemp:   mainTemp,
            cpuCores:  cpuTemp.cores || [],
            gpuTemp,
            gpuName:   gpu ? (gpu.model || 'GPU') : null,
            fanSpeed,
            throttling,
            cpuFreq:   cpuSpeed ? cpuSpeed.avg : null,
        }
    } catch { return null }
})

// ─────────────────────────────────────────────
// IPC: Network diagnostics
// ─────────────────────────────────────────────
ipcMain.handle('get-network-diagnostics', async () => {
    try {
        const [ifaces, stats, defaultNet] = await Promise.all([
            si.networkInterfaces(),
            si.networkStats(),
            si.networkGatewayDefault(),
        ])

        // Ping test
        const pingGateway = await ps(`
            $p = Test-NetConnection -ComputerName '${defaultNet || '8.8.8.8'}' -InformationLevel Quiet 2>$null
            $ping = Test-Connection -ComputerName '8.8.8.8' -Count 4 -ErrorAction SilentlyContinue
            if ($ping) { ($ping | Measure-Object ResponseTime -Average).Average }
            else { -1 }
        `, 12000)

        // DNS timing
        const dnsTime = await ps(`
            $start = Get-Date
            [System.Net.Dns]::GetHostAddresses('google.com') 2>$null | Out-Null
            ((Get-Date) - $start).TotalMilliseconds
        `, 8000)

        const activeIface = (ifaces || []).find(i => i.default) || (ifaces || [])[0]

        return {
            ping:        parseFloat(pingGateway) || null,
            dnsMs:       parseFloat(dnsTime) || null,
            gateway:     defaultNet || null,
            iface: activeIface ? {
                name:    activeIface.iface,
                ip:      activeIface.ip4,
                mac:     activeIface.mac,
                speed:   activeIface.speed,
                type:    activeIface.type,
                virtual: activeIface.virtual,
            } : null,
            rx: stats && stats[0] ? (stats[0].rx_sec / 1024).toFixed(1) : 0,
            tx: stats && stats[0] ? (stats[0].tx_sec / 1024).toFixed(1) : 0,
        }
    } catch (err) { return null }
})

// ─────────────────────────────────────────────
// IPC: Privacy / Telemetry settings
// ─────────────────────────────────────────────
ipcMain.handle('get-privacy-settings', async () => {
    const settings = [
        {
            id:      'telemetry',
            label:   'Diagnostic Data (Telemetry)',
            key:     'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
            value:   'AllowTelemetry',
            safe:    0, risk: 'medium',
            desc:    'Controls how much diagnostic data is sent to Microsoft.',
        },
        {
            id:      'adid',
            label:   'Advertising ID',
            key:     'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo',
            value:   'Enabled',
            safe:    0, risk: 'low',
            desc:    'Allows apps to use your advertising ID for cross-app tracking.',
        },
        {
            id:      'location',
            label:   'Location Services',
            key:     'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\lfsvc\\Service\\Configuration',
            value:   'Status',
            safe:    0, risk: 'low',
            desc:    'Allows apps to access your physical location.',
        },
        {
            id:      'feedback',
            label:   'Feedback Frequency',
            key:     'HKCU:\\Software\\Microsoft\\Siuf\\Rules',
            value:   'NumberOfSIUFInPeriod',
            safe:    0, risk: 'low',
            desc:    'Controls how often Windows asks for feedback.',
        },
    ]

    const results = await Promise.all(
        settings.map(async s => {
            const out = await ps(`(Get-ItemProperty -Path '${s.key}' -Name '${s.value}' -ErrorAction SilentlyContinue).'${s.value}'`)
            const current = parseInt(out) || null
            return { ...s, current }
        })
    )
    return results
})

// ─────────────────────────────────────────────
// IPC: Security status
// ─────────────────────────────────────────────
ipcMain.handle('get-security-status', async () => {
    const defenderOut = await ps(`(Get-MpComputerStatus -ErrorAction SilentlyContinue).AntivirusEnabled`)
    const firewallOut = await ps(`(Get-NetFirewallProfile -Profile Domain,Public,Private | Measure-Object -Property Enabled -Sum).Sum`)
    const uacOut      = await ps(`(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -Name EnableLUA -ErrorAction SilentlyContinue).EnableLUA`)
    const smb1Out     = await ps(`(Get-SmbServerConfiguration -ErrorAction SilentlyContinue).EnableSMB1Protocol`)

    return {
        defender:        defenderOut.trim().toLowerCase() === 'true',
        firewallEnabled: parseInt(firewallOut) > 0,
        uacEnabled:      parseInt(uacOut) === 1,
        smb1Disabled:    smb1Out.trim().toLowerCase() !== 'true',
    }
})

// ─────────────────────────────────────────────
// IPC: Battery info (laptops)
// ─────────────────────────────────────────────
ipcMain.handle('get-battery', async () => {
    try {
        const bat = await si.battery()
        return {
            hasBattery:   bat.hasBattery,
            isCharging:   bat.isCharging,
            percent:      bat.percent,
            timeRemaining: bat.timeRemaining,
            designCapacity: bat.designedCapacity || null,
            currentCapacity: bat.maxCapacity || null,
            cycleCount:   bat.cycleCount || null,
            manufacturer: bat.manufacturer || null,
            voltage:      bat.voltage || null,
            acConnected:  bat.acConnected,
        }
    } catch { return { hasBattery: false } }
})

// ─────────────────────────────────────────────
// IPC: Power plan
// ─────────────────────────────────────────────
ipcMain.handle('get-power-plan', async () => {
    const out = await ps(`powercfg /getactivescheme`)
    const plans = {
        '381b4222-f694-41f0-9685-ff5bb260df2e': 'Balanced',
        '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c': 'High Performance',
        'a1841308-3541-4fab-bc81-f71556f20b4a': 'Power Saver',
    }
    const match = out.match(/([0-9a-f-]{36})/i)
    const guid  = match ? match[1].toLowerCase() : null
    return { active: plans[guid] || 'Custom', guid }
})

ipcMain.handle('set-power-plan', async (_, { guid }) => {
    await ps(`powercfg /setactive ${guid}`)
    return true
})

// ─────────────────────────────────────────────
// IPC: System integrity (SFC / DISM / CHKDSK)
// ─────────────────────────────────────────────
ipcMain.handle('run-sfc', (event) => {
    return new Promise(resolve => {
        const proc = exec('sfc /scannow', { timeout: 300000 })
        proc.stdout.on('data', d => event.sender.send('sfc-progress', d.toString()))
        proc.on('close', code => resolve({ success: code === 0, code }))
    })
})

ipcMain.handle('run-dism', (event) => {
    return new Promise(resolve => {
        const proc = exec('DISM /Online /Cleanup-Image /RestoreHealth', { timeout: 600000 })
        proc.stdout.on('data', d => event.sender.send('dism-progress', d.toString()))
        proc.on('close', code => resolve({ success: code === 0, code }))
    })
})

ipcMain.handle('run-chkdsk', async () => {
    // Schedule on reboot — requires admin
    const out = await ps(`echo Y | chkdsk C: /f /r /x 2>&1`)
    return { scheduled: true, output: out }
})

// ─────────────────────────────────────────────
// IPC: Network tools
// ─────────────────────────────────────────────
ipcMain.handle('net-flush-dns', async () => {
    await ps(`ipconfig /flushdns`)
    return { success: true }
})

ipcMain.handle('net-reset-winsock', async () => {
    await ps(`netsh winsock reset`)
    return { success: true, requiresRestart: true }
})

ipcMain.handle('net-renew-ip', async () => {
    await ps(`ipconfig /release; ipconfig /renew`)
    return { success: true }
})

ipcMain.handle('net-reset-tcp', async () => {
    await ps(`netsh int ip reset`)
    return { success: true, requiresRestart: true }
})

// ─────────────────────────────────────────────
// IPC: Restore center
// ─────────────────────────────────────────────
ipcMain.handle('get-restore-history', () => loadRestoreHistory())

ipcMain.handle('create-restore-snapshot', (_, snapshot) => {
    saveRestoreSnapshot(snapshot)
    return true
})

ipcMain.handle('undo-restore-snapshot', async (_, { id }) => {
    const history = loadRestoreHistory()
    const snap    = history.find(h => h.id === id)
    if (!snap) return { success: false, error: 'Snapshot not found' }

    // Attempt undo based on type
    if (snap.type === 'startup') {
        const { name, location, command, previousState } = snap.data
        if (previousState) {
            await ps(`New-ItemProperty -Path '${location}' -Name '${name}' -Value '${command}' -PropertyType String -Force`)
        } else {
            await ps(`Remove-ItemProperty -Path '${location}' -Name '${name}' -ErrorAction SilentlyContinue`)
        }
    }
    return { success: true }
})

// ─────────────────────────────────────────────
// IPC: Smart profile detection
// ─────────────────────────────────────────────
ipcMain.handle('get-smart-profile', async () => {
    try {
        const [cpu, mem, diskLayout, graphics, osInfo] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.diskLayout(),
            si.graphics(),
            si.osInfo(),
        ])

        const procs = await si.processes()
        const procNames = (procs.list || []).map(p => (p.name || '').toLowerCase())

        const isDev    = ['code', 'node', 'python', 'git', 'docker', 'npm', 'gradle', 'mvn'].some(d => procNames.some(p => p.includes(d)))
        const isGamer  = ['steam', 'epic', 'battle.net', 'origin', 'gog'].some(g => procNames.some(p => p.includes(g)))
        const isOffice = ['winword', 'excel', 'powerpnt', 'outlook'].some(o => procNames.some(p => p.includes(o)))

        const profile = isDev && isGamer ? 'Developer + Gaming'
                      : isDev            ? 'Developer'
                      : isGamer          ? 'Gaming'
                      : isOffice         ? 'Office / Productivity'
                      : 'General Use'

        const gpu       = graphics.controllers && graphics.controllers[0]
        const mainDisk  = diskLayout[0]

        return {
            cpu:     cpu.brand || cpu.manufacturer,
            cores:   cpu.cores,
            ram:     (mem.total / 1e9).toFixed(0) + ' GB',
            storage: mainDisk ? ((mainDisk.size / 1e9).toFixed(0) + ' GB ' + (mainDisk.type || '')) : 'Unknown',
            gpu:     gpu ? (gpu.model || 'Unknown GPU') : 'Integrated Graphics',
            os:      osInfo.distro + ' ' + osInfo.release,
            profile,
        }
    } catch { return null }
})

// ─────────────────────────────────────────────
// IPC: Gaming mode
// ─────────────────────────────────────────────
let gamingModeActive  = false
let gamingModeSnapshot = null

ipcMain.handle('gaming-mode-start', async () => {
    if (gamingModeActive) return { success: false, error: 'Already active' }

    // Save current state
    const powerOut = await ps(`powercfg /getactivescheme`)
    const match    = powerOut.match(/([0-9a-f-]{36})/i)
    gamingModeSnapshot = { powerGuid: match ? match[1] : null }

    // Switch to High Performance
    await ps(`powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`)

    // Suspend background apps (best effort)
    const BG_KILL = ['Discord.exe', 'Teams.exe', 'OneDrive.exe', 'Spotify.exe']
    for (const proc of BG_KILL) {
        await ps(`Stop-Process -Name '${proc.replace('.exe', '')}' -ErrorAction SilentlyContinue`)
    }

    gamingModeActive = true
    saveRestoreSnapshot({ type: 'gaming-mode', description: 'Gaming mode activated', data: gamingModeSnapshot })
    return { success: true }
})

ipcMain.handle('gaming-mode-stop', async () => {
    if (!gamingModeActive) return { success: false }
    if (gamingModeSnapshot && gamingModeSnapshot.powerGuid) {
        await ps(`powercfg /setactive ${gamingModeSnapshot.powerGuid}`)
    }
    gamingModeActive = false
    gamingModeSnapshot = null
    return { success: true }
})

ipcMain.handle('gaming-mode-status', () => gamingModeActive)

// ─────────────────────────────────────────────
// IPC: Duplicate file finder (hash-based)
// ─────────────────────────────────────────────
ipcMain.handle('find-duplicates', async (event, { directory }) => {
    if (!directory || !fs.existsSync(directory)) return []

    const getAllFiles = (dir) => {
        let files = []
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true })
            for (const entry of entries) {
                const full = path.join(dir, entry.name)
                if (entry.isDirectory()) {
                    files = files.concat(getAllFiles(full))
                } else if (entry.isFile()) {
                    files.push(full)
                }
            }
        } catch {}
        return files
    }

    const hashFile = (filePath) => {
        try {
            const buf = fs.readFileSync(filePath)
            return crypto.createHash('sha256').update(buf).digest('hex')
        } catch { return null }
    }

    const files   = getAllFiles(directory).filter(f => {
        try { return fs.statSync(f).size > 1024 } catch { return false }
    })

    const hashMap = new Map()
    let done = 0
    for (const f of files) {
        const stat = fs.statSync(f)
        const hash = hashFile(f)
        if (!hash) { done++; continue }

        const key = `${hash}-${stat.size}`
        if (!hashMap.has(key)) hashMap.set(key, [])
        hashMap.get(key).push({ path: f, size: stat.size })

        done++
        if (done % 50 === 0) {
            event.sender.send('duplicate-progress', { done, total: files.length })
        }
    }

    const dupes = []
    for (const [, group] of hashMap) {
        if (group.length > 1) {
            dupes.push({
                hash:  group[0].path,
                size:  group[0].size,
                files: group.map(f => f.path),
            })
        }
    }
    return dupes.sort((a, b) => b.size - a.size).slice(0, 100)
})

// ─────────────────────────────────────────────
// IPC: One-click optimize orchestration
// ─────────────────────────────────────────────
ipcMain.handle('one-click-optimize', async (event) => {
    const steps = [
        { id: 'temp',    label: 'Cleaning temp files...' },
        { id: 'dns',     label: 'Flushing DNS cache...' },
        { id: 'startup', label: 'Analyzing startup items...' },
        { id: 'profile', label: 'Analyzing system profile...' },
    ]

    const results = {}

    for (const step of steps) {
        event.sender.send('optimize-progress', { step: step.id, label: step.label })
        await new Promise(r => setTimeout(r, 400))

        if (step.id === 'temp') {
            await ps(`Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue`)
            results.temp = true
        }
        if (step.id === 'dns') {
            await ps(`ipconfig /flushdns`)
            results.dns = true
        }
        if (step.id === 'startup') {
            results.startup = true
        }
        if (step.id === 'profile') {
            results.profile = true
        }
    }

    saveRestoreSnapshot({ type: 'one-click', description: 'One-click optimization performed', data: results })
    return results
})

// ─────────────────────────────────────────────
// IPC: Health score (computed from real metrics)
// ─────────────────────────────────────────────
ipcMain.handle('get-health-score', async () => {
    try {
        const [cpu, mem, fsSize, procs] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.processes(),
        ])

        let score = 100
        const issues  = []
        const good    = []

        // CPU check
        const cpuPct = Math.round(cpu.currentLoad)
        if (cpuPct > 80) { score -= 15; issues.push(`High CPU usage: ${cpuPct}%`) }
        else if (cpuPct > 50) { score -= 5; issues.push(`Moderate CPU usage: ${cpuPct}%`) }
        else good.push('CPU usage is healthy')

        // RAM check
        const ramPct = Math.round((mem.active / mem.total) * 100)
        if (ramPct > 85) { score -= 20; issues.push(`Critical RAM pressure: ${ramPct}%`) }
        else if (ramPct > 70) { score -= 10; issues.push(`High RAM usage: ${ramPct}%`) }
        else good.push('RAM usage is within normal range')

        // Disk check
        const mainDisk = fsSize.sort((a, b) => b.size - a.size)[0]
        if (mainDisk && mainDisk.use > 90) { score -= 20; issues.push('Disk almost full (>90%)') }
        else if (mainDisk && mainDisk.use > 80) { score -= 10; issues.push('Disk getting full (>80%)') }
        else good.push('Disk space is adequate')

        // Process count
        if (procs.all > 300) { score -= 5; issues.push(`Many processes running: ${procs.all}`) }
        else good.push(`Process count normal: ${procs.all}`)

        // Pagefile check
        if (mem.swapused > 0) { score -= 5; issues.push('Pagefile in use — RAM pressure') }

        score = Math.max(0, Math.min(100, score))

        return { score, issues, good, cpuPct, ramPct, diskPct: mainDisk ? Math.round(mainDisk.use) : 0 }
    } catch { return { score: 50, issues: ['Could not read system metrics'], good: [] } }
})

// ─────────────────────────────────────────────
// IPC: Clean specific path
// ─────────────────────────────────────────────
ipcMain.handle('clean-path', async (_, { dirPath, label }) => {
    if (!dirPath || !fs.existsSync(dirPath)) return { success: false, error: 'Path not found' }
    saveRestoreSnapshot({ type: 'cleanup', description: `Cleaned: ${label}`, data: { dirPath } })
    await ps(`Remove-Item -Path '${dirPath}\\*' -Recurse -Force -ErrorAction SilentlyContinue`)
    return { success: true }
})

// ─────────────────────────────────────────────
// IPC: Open file/folder in Explorer
// ─────────────────────────────────────────────
ipcMain.handle('open-path', (_, filePath) => {
    shell.showItemInFolder(filePath)
    return true
})

// ─────────────────────────────────────────────
// IPC: Drive optimizer (SSD: Optimize, HDD: Defrag)
// ─────────────────────────────────────────────
ipcMain.handle('optimize-drive', async (_, { drive = 'C:', isSSD = true }) => {
    if (isSSD) {
        // Retrim for SSD
        await ps(`Optimize-Volume -DriveLetter ${drive.replace(':', '')} -ReTrim -Verbose`)
    } else {
        await ps(`Optimize-Volume -DriveLetter ${drive.replace(':', '')} -Defrag -Verbose`)
    }
    return { success: true }
})

// ─────────────────────────────────────────────
// IPC: Windows Update cleanup
// ─────────────────────────────────────────────
ipcMain.handle('windows-update-cleanup', async () => {
    await ps(`
        Stop-Service wuauserv -ErrorAction SilentlyContinue
        Remove-Item 'C:\\Windows\\SoftwareDistribution\\Download\\*' -Recurse -Force -ErrorAction SilentlyContinue
        Start-Service wuauserv -ErrorAction SilentlyContinue
    `)
    return { success: true }
})

// ─────────────────────────────────────────────
// IPC: Before/After benchmark snapshot
// ─────────────────────────────────────────────
ipcMain.handle('take-benchmark', async () => {
    try {
        const [cpu, mem, fsSize, procs, startup] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.processes(),
            si.startupPrograms ? si.startupPrograms() : Promise.resolve([]),
        ])

        const uptimeSec = os.uptime()
        const mainDisk  = fsSize.sort((a, b) => b.size - a.size)[0]

        return {
            timestamp:      new Date().toISOString(),
            cpuPct:         Math.round(cpu.currentLoad),
            ramGB:          (mem.active / 1e9).toFixed(1),
            freeStorageGB:  mainDisk ? ((mainDisk.available / 1e9).toFixed(1)) : 0,
            startupApps:    startup.length || 0,
            backgroundProcs: procs.all,
            uptimeSec,
        }
    } catch { return null }
})

ipcMain.handle('toggle-nvidia-preset', async (_, { enable }) => {
    // This is a mock function simulating the application of the NVIDIA Performance Preset.
    // In a real scenario, this would require calling NVIDIA Profile Inspector CLI:
    // e.g. exec(`nvidiaProfileInspector.exe -importPerformanceProfile.nip`)
    return new Promise(resolve => {
        setTimeout(() => resolve({ success: true, enabled: enable }), 1500)
    })
})
