'use strict'

;(function initializeMemoryOptimization() {
    const section = document.getElementById('section-mon-ram')
    if (!section || !window.MemoryOptimizationHelpers) return

    const { AutoCleanPolicy, CleanIntervalLimiter, cleanWithService, calculateFreedBytes } = window.MemoryOptimizationHelpers
    const ipcRenderer = require('electron').ipcRenderer
    const elements = {
        button: document.getElementById('optimize-ram-btn'),
        buttonLabel: document.getElementById('optimize-ram-label'),
        aggressive: document.getElementById('ram-aggressive-toggle'),
        aggressiveWarning: document.getElementById('ram-aggressive-warning'),
        adminPrompt: document.getElementById('ram-admin-prompt'),
        restartAdmin: document.getElementById('ram-restart-admin'),
        autoToggle: document.getElementById('ram-auto-clean-toggle'),
        autoState: document.getElementById('ram-auto-clean-state'),
        threshold: document.getElementById('ram-auto-threshold'),
        result: document.getElementById('ram-clean-result'),
        steps: document.getElementById('ram-step-results'),
        lastCleaned: document.getElementById('ram-last-cleaned'),
        lastAutoClean: document.getElementById('ram-last-auto-clean'),
        nativeNote: document.getElementById('ram-native-note'),
    }

    const intervalLimiter = new CleanIntervalLimiter(10000)
    let autoCleanPolicy = new AutoCleanPolicy()
    let intervalId = null
    let currentStats = null
    let isElevated = false
    let nativeReady = false
    let isRunning = false
    let lastAutoCleanAt = Number(localStorage.getItem('ram-last-auto-clean-at')) || 0
    if (lastAutoCleanAt) autoCleanPolicy.lastTriggeredAt = lastAutoCleanAt
    elements.autoToggle.checked = localStorage.getItem('ram-auto-clean-enabled') === 'true'
    elements.threshold.value = localStorage.getItem('ram-auto-clean-threshold') || '15'

    function formatGB(bytes) {
        return (Math.max(0, Number(bytes) || 0) / 1e9).toFixed(1)
    }

    function formatDuration(milliseconds) {
        return (Math.max(0, milliseconds || 0) / 1000).toFixed(1)
    }

    function relativeTime(timestamp) {
        if (!timestamp) return 'Never'
        const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000))
        if (seconds < 60) return 'just now'
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`
        return new Date(timestamp).toLocaleDateString()
    }

    function updateTimeLabels() {
        const state = JSON.parse(localStorage.getItem('ram-memory-state') || '{}')
        elements.lastCleaned.textContent = `Last cleaned: ${relativeTime(state.lastCleanedAt)}`
        elements.lastAutoClean.textContent = `Last auto-clean: ${relativeTime(lastAutoCleanAt)}`
        elements.autoState.textContent = elements.autoToggle.checked ? 'On' : 'Off'
    }

    function updateAvailability() {
        elements.button.disabled = isRunning || !isElevated || !nativeReady
        elements.autoToggle.disabled = !isElevated || !nativeReady
        elements.adminPrompt.hidden = isElevated
        elements.nativeNote.hidden = nativeReady
        elements.nativeNote.textContent = nativeReady ? '' : 'Native memory service unavailable. Build the C service to enable cleaning.'
    }

    async function loadState() {
        const state = await invoke('memory-get-state')
        if (!state) return
        isElevated = Boolean(state.isElevated)
        nativeReady = Boolean(state.nativeReady)
        if (state.lastCleanedAt) localStorage.setItem('ram-memory-state', JSON.stringify({ lastCleanedAt: state.lastCleanedAt }))
        updateAvailability()
        updateTimeLabels()
    }

    function renderStats(stats) {
        if (!stats || !stats.totalBytes) return
        currentStats = stats
        const total = Number(stats.totalBytes)
        const used = Number(stats.usedBytes)
        const available = Number(stats.availableBytes)
        const pct = Math.min(100, Math.round(used / total * 100))
        const toGB = value => Number(value || 0) / 1e9
        updateRamGauge(pct, toGB(used), toGB(total), toGB(stats.commitBytes), toGB(stats.standbyBytes), toGB(stats.modifiedBytes), toGB(available))
        elements.nativeNote.hidden = stats.source === 'native'
        if (stats.source !== 'native') {
            elements.nativeNote.textContent = stats.serviceError || 'Using fallback memory counters; standby and modified values may be approximate.'
        }
    }

    async function pollMemory() {
        if (!section.classList.contains('active') || document.visibilityState === 'hidden') return
        const stats = await invoke('memory-get-stats')
        if (!stats?.error) renderStats(stats)
        else autoCleanPolicy.reset()
        maybeAutoClean()
    }

    function cleanOptions() {
        const aggressive = elements.aggressive.checked
        return {
            workingSets: true,
            modifiedList: true,
            standbyList: true,
            lowPriorityStandbyOnly: !aggressive,
            fileCache: aggressive,
        }
    }

    function renderSteps(perStep = []) {
        elements.steps.replaceChildren()
        perStep.forEach(step => {
            const row = document.createElement('div')
            row.className = step.error ? 'mem-step-error' : ''
            row.textContent = step.error ? `${step.step}: ${step.error}` : `${step.step}: ${step.status}`
            elements.steps.appendChild(row)
        })
    }

    async function performClean(isAutomatic = false) {
        if (isRunning || !isElevated || !nativeReady || !intervalLimiter.canRun()) return false
        intervalLimiter.markRun()
        isRunning = true
        elements.button.disabled = true
        elements.button.classList.add('is-running')
        elements.buttonLabel.textContent = 'Starting...'
        elements.result.textContent = isAutomatic ? 'Auto-clean starting...' : 'Preparing memory optimization...'
        elements.steps.replaceChildren()
        const progressListener = (_event, step) => {
            elements.buttonLabel.textContent = step
            elements.result.textContent = step
        }
        ipcRenderer.on('memory-clean-progress', progressListener)
        const result = await cleanWithService({ clean: options => invoke('memory-clean', options) }, cleanOptions())
        ipcRenderer.removeListener('memory-clean-progress', progressListener)
        isRunning = false
        elements.button.classList.remove('is-running')
        elements.buttonLabel.textContent = 'Optimize Memory'
        if (result.notElevated) isElevated = false
        if (result.timestamp) {
            localStorage.setItem('ram-memory-state', JSON.stringify({ lastCleanedAt: result.timestamp }))
            if (isAutomatic) {
                lastAutoCleanAt = Date.now()
                localStorage.setItem('ram-last-auto-clean-at', String(lastAutoCleanAt))
                autoCleanPolicy.lastTriggeredAt = lastAutoCleanAt
            }
        }
        if (result.before && result.after) {
            result.freedBytes = calculateFreedBytes(result.before, result.after)
            renderStats({ ...result.after, source: 'native' })
            const before = formatGB(result.before.availableBytes)
            const after = formatGB(result.after.availableBytes)
            elements.result.textContent = `Freed ${formatGB(result.freedBytes)} GB in ${formatDuration(result.durationMs)} s · Available ${before} → ${after} GB`
        } else {
            elements.result.textContent = result.userMessage || result.error || 'Memory optimization failed.'
        }
        if (result.userMessage) elements.result.textContent = result.userMessage
        renderSteps(result.perStep)
        updateAvailability()
        updateTimeLabels()
        if (typeof addLog === 'function') addLog(`Memory optimization ${result.success ? 'completed' : 'stopped'} · ${formatGB(result.freedBytes)} GB available`, result.success ? 'success' : 'warning')
        return Boolean(result.success)
    }

    function maybeAutoClean() {
        if (!elements.autoToggle.checked || !isElevated || !nativeReady || isRunning || !currentStats) return
        const threshold = Math.min(50, Math.max(5, Number(elements.threshold.value) || 15))
        if (autoCleanPolicy.shouldTrigger(currentStats.availableBytes, currentStats.totalBytes, threshold)) {
            performClean(true)
        }
    }

    function startPolling() {
        if (intervalId !== null || document.visibilityState === 'hidden') return
        pollMemory()
        intervalId = setInterval(pollMemory, 1500)
    }

    function stopPolling() {
        if (intervalId !== null) clearInterval(intervalId)
        intervalId = null
        autoCleanPolicy.reset()
    }

    elements.button.addEventListener('click', () => performClean(false))
    elements.aggressive.addEventListener('change', () => {
        elements.aggressiveWarning.hidden = !elements.aggressive.checked
    })
    elements.restartAdmin.addEventListener('click', () => invoke('request-admin'))
    elements.autoToggle.addEventListener('change', () => {
        localStorage.setItem('ram-auto-clean-enabled', String(elements.autoToggle.checked))
        updateTimeLabels()
        autoCleanPolicy.reset()
    })
    elements.threshold.addEventListener('change', () => {
        const threshold = Math.min(50, Math.max(5, Number(elements.threshold.value) || 15))
        elements.threshold.value = String(threshold)
        localStorage.setItem('ram-auto-clean-threshold', String(threshold))
        autoCleanPolicy.reset()
    })

    const observer = new MutationObserver(() => {
        if (section.classList.contains('active') && document.visibilityState !== 'hidden') startPolling()
        else stopPolling()
    })
    observer.observe(section, { attributes: true, attributeFilter: ['class'] })
    document.addEventListener('visibilitychange', () => {
        if (section.classList.contains('active') && document.visibilityState !== 'hidden') startPolling()
        else stopPolling()
    })

    loadState()
    updateTimeLabels()
    updateAvailability()
    if (section.classList.contains('active')) startPolling()
    setInterval(updateTimeLabels, 60000)
})()