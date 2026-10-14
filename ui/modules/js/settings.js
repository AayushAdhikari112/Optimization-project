'use strict'

const preferenceDefaults = {
    theme: 'system',
    density: 'comfortable',
    motion: 'full',
    confirmChanges: 'false',
    language: 'en',
    appMode: 'simple',
    startPage: 'dashboard',
    startWithWindows: 'false',
    minimizeToTray: 'false',
    autoUpdateCheck: 'true',
    restoreBeforeChanges: 'true',
    confirmDelete: 'true',
    backupLocation: 'Documents\\OptiCore\\Backups',
    backupRetention: '30',
    riskyActionsWarn: 'true',
    exclusionList: 'Windows Defender, Microsoft Store, Steam',
    cleanupLevel: 'safe',
    silentUninstall: 'true',
    recycleBinLeftovers: 'true',
    uninstallQueueMode: 'ask',
    scheduledScan: 'weekly',
    scheduledAutoCleanup: 'weekly',
    scanWhenIdle: 'true',
    scanOnACPower: 'true',
    scanApps: 'true',
    scanStartup: 'true',
    scanTemp: 'true',
    scanStoreApps: 'true',
    notificationsEnabled: 'true',
    alertLowDisk: 'true',
    alertNewStartup: 'true',
    alertBloatware: 'true',
    alertUpdates: 'true',
    quietHours: '22:00-07:00',
    notificationStyle: 'popup',
    appUpdateBehavior: 'notify',
    updateSource: 'winget',
    includePrerelease: 'false',
    anonymousUsage: 'false',
    crashReports: 'true',
    listView: 'comfortable',
    fontSize: 'normal',
    highContrast: 'false',
    showSystemApps: 'false',
    sortOrder: 'name',
    runAsAdmin: 'false',
    logging: 'basic',
    developerMode: 'false',
    proxySettings: 'Use system proxy',
    aboutVersion: '2.0.0',
}

function applyAppearancePreferences() {
    const theme = localStorage.getItem('opticore.theme') || preferenceDefaults.theme
    const density = localStorage.getItem('opticore.density') || preferenceDefaults.density
    const motion = localStorage.getItem('opticore.motion') || preferenceDefaults.motion

    if (theme === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme

    if (density === 'compact') document.documentElement.dataset.density = density
    else delete document.documentElement.dataset.density

    if (motion === 'reduce') document.documentElement.dataset.motion = motion
    else delete document.documentElement.dataset.motion
}

function readStoredBool(key, fallback) {
    const value = localStorage.getItem(key)
    if (value === null) return fallback
    return value === 'true'
}

function bindSettings() {
    const existing = document.getElementById('settingsTheme')
    if (!existing || existing.dataset.bound) return
    existing.dataset.bound = 'true'

    const controls = {
        theme: document.getElementById('settingsTheme'),
        density: document.getElementById('settingsDensity'),
        motion: document.getElementById('settingsMotion'),
        confirmChanges: document.getElementById('settingsConfirm'),
        language: document.getElementById('settingsLanguage'),
        appMode: document.getElementById('settingsMode'),
        startPage: document.getElementById('settingsStartPage'),
        startWithWindows: document.getElementById('settingsStartWithWindows'),
        minimizeToTray: document.getElementById('settingsMinimizeToTray'),
        autoUpdateCheck: document.getElementById('settingsAutoUpdateCheck'),
        restoreBeforeChanges: document.getElementById('settingsRestoreBeforeChanges'),
        confirmDelete: document.getElementById('settingsConfirmDelete'),
        backupLocation: document.getElementById('settingsBackupLocation'),
        backupRetention: document.getElementById('settingsBackupRetention'),
        riskyActionsWarn: document.getElementById('settingsRiskyActionsWarn'),
        exclusionList: document.getElementById('settingsExclusionList'),
        cleanupLevel: document.getElementById('settingsCleanupLevel'),
        silentUninstall: document.getElementById('settingsSilentUninstall'),
        recycleBinLeftovers: document.getElementById('settingsRecycleBinLeftovers'),
        uninstallQueueMode: document.getElementById('settingsUninstallQueueMode'),
        scheduledScan: document.getElementById('settingsScheduledScan'),
        scheduledAutoCleanup: document.getElementById('settingsScheduledAutoCleanup'),
        scanWhenIdle: document.getElementById('settingsScanWhenIdle'),
        scanOnACPower: document.getElementById('settingsScanOnACPower'),
        scanApps: document.getElementById('settingsScanApps'),
        scanStartup: document.getElementById('settingsScanStartup'),
        scanTemp: document.getElementById('settingsScanTemp'),
        scanStoreApps: document.getElementById('settingsScanStoreApps'),
        notificationsEnabled: document.getElementById('settingsNotificationsEnabled'),
        alertLowDisk: document.getElementById('settingsAlertLowDisk'),
        alertNewStartup: document.getElementById('settingsAlertNewStartup'),
        alertBloatware: document.getElementById('settingsAlertBloatware'),
        alertUpdates: document.getElementById('settingsAlertUpdates'),
        quietHours: document.getElementById('settingsQuietHours'),
        notificationStyle: document.getElementById('settingsNotificationStyle'),
        appUpdateBehavior: document.getElementById('settingsAppUpdateBehavior'),
        updateSource: document.getElementById('settingsUpdateSource'),
        includePrerelease: document.getElementById('settingsIncludePrerelease'),
        anonymousUsage: document.getElementById('settingsAnonymousUsage'),
        crashReports: document.getElementById('settingsCrashReports'),
        clearHistoryBtn: document.getElementById('settingsClearHistoryBtn'),
        listView: document.getElementById('settingsListView'),
        fontSize: document.getElementById('settingsFontSize'),
        highContrast: document.getElementById('settingsHighContrast'),
        showSystemApps: document.getElementById('settingsShowSystemApps'),
        sortOrder: document.getElementById('settingsSortOrder'),
        runAsAdmin: document.getElementById('settingsRunAsAdmin'),
        logging: document.getElementById('settingsLogging'),
        developerMode: document.getElementById('settingsDeveloperMode'),
        proxySettings: document.getElementById('settingsProxySettings'),
        openLogFolderBtn: document.getElementById('settingsOpenLogFolderBtn'),
        exportSettingsBtn: document.getElementById('settingsExportBtn'),
        importSettingsBtn: document.getElementById('settingsImportBtn'),
        resetSettingsBtn: document.getElementById('resetSettingsBtn'),
        clearCacheBtn: document.getElementById('settingsClearCacheBtn'),
        versionLabel: document.getElementById('settingsVersionLabel'),
    }

    const setFromStorage = (key, fallback, control) => {
        const val = localStorage.getItem(`opticore.${key}`)
        if (!control) return
        if (control.type === 'checkbox') {
            control.checked = val === null ? fallback : val === 'true'
            return
        }
        control.value = val === null ? fallback : val
    }

    Object.entries(preferenceDefaults).forEach(([key, fallback]) => {
        const control = controls[key]
        if (!control) return
        setFromStorage(key, fallback, control)
    })

    if (controls.versionLabel) {
        controls.versionLabel.textContent = localStorage.getItem('opticore.aboutVersion') || preferenceDefaults.aboutVersion
    }

    const assignChange = (key, control) => {
        if (!control) return
        const handler = () => {
            const value = control.type === 'checkbox' ? String(control.checked) : control.value
            localStorage.setItem(`opticore.${key}`, value)
            if (key === 'theme' || key === 'density' || key === 'motion') {
                applyAppearancePreferences()
            }
            if (key === 'appMode') {
                localStorage.setItem('opticore.mode', control.value)
            }
        }
        control.addEventListener('change', handler)
        control.addEventListener('input', handler)
    }

    Object.entries(preferenceDefaults).forEach(([key, fallback]) => {
        const control = controls[key]
        if (!control) return
        assignChange(key, control)
    })

    controls.resetSettingsBtn?.addEventListener('click', () => {
        if (!window.confirm('Restore the default OptiCore preferences?')) return
        Object.entries(preferenceDefaults).forEach(([key, value]) => {
            localStorage.setItem(`opticore.${key}`, value)
        })
        applyAppearancePreferences()
        Object.entries(preferenceDefaults).forEach(([key, fallback]) => {
            const control = controls[key]
            if (!control) return
            if (control.type === 'checkbox') control.checked = fallback === 'true'
            else control.value = fallback
        })
        if (controls.versionLabel) controls.versionLabel.textContent = preferenceDefaults.aboutVersion
    })

    controls.clearHistoryBtn?.addEventListener('click', () => {
        const history = localStorage.getItem('opticore.history') || '[]'
        localStorage.setItem('opticore.history', '[]')
        window.alert('History and logs were cleared.')
        console.info('OptiCore history cleared', history)
    })

    controls.clearCacheBtn?.addEventListener('click', () => {
        localStorage.removeItem('opticore.cache')
        localStorage.removeItem('opticore.history')
        window.alert('Local OptiCore cache was cleared.')
    })

    controls.exportSettingsBtn?.addEventListener('click', () => {
        const payload = {}
        Object.keys(preferenceDefaults).forEach(key => {
            payload[key] = localStorage.getItem(`opticore.${key}`) || preferenceDefaults[key]
        })
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'opticore-settings.json'
        a.click()
        URL.revokeObjectURL(url)
    })

    controls.importSettingsBtn?.addEventListener('click', () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/json'
        input.onchange = () => {
            const file = input.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => {
                try {
                    const payload = JSON.parse(String(reader.result || '{}'))
                    Object.entries(payload).forEach(([key, value]) => {
                        if (Object.prototype.hasOwnProperty.call(preferenceDefaults, key)) {
                            localStorage.setItem(`opticore.${key}`, String(value))
                        }
                    })
                    window.alert('Settings imported. Please refresh the app.')
                } catch {
                    window.alert('Unable to import settings. Please check the file format.')
                }
            }
            reader.readAsText(file)
        }
        input.click()
    })

    controls.openLogFolderBtn?.addEventListener('click', () => {
        window.alert('Log folder is not yet connected to a real file system path in this demo build.')
    })

    initSettingsNav()
}

function initSettingsNav() {
    const navBar = document.getElementById('settingsNavBar')
    const grid = document.querySelector('#section-settings .settings-grid')
    if (!navBar || !grid) return

    const tabs = navBar.querySelectorAll('.settings-nav-tab')
    const panels = grid.querySelectorAll('.settings-panel')
    const searchInput = document.getElementById('settingsQuickSearch')

    let activeCategory = 'all'

    function filterSettings() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : ''

        panels.forEach(panel => {
            const matchesCategory = (activeCategory === 'all' || panel.dataset.category === activeCategory)

            if (!matchesCategory) {
                panel.style.display = 'none'
                return
            }

            const rows = panel.querySelectorAll('.setting-row')
            let panelHasMatch = false

            rows.forEach(row => {
                const text = row.textContent.toLowerCase()
                if (!query || text.includes(query)) {
                    row.style.display = ''
                    panelHasMatch = true
                } else {
                    row.style.display = 'none'
                }
            })

            if (query && !panelHasMatch) {
                panel.style.display = 'none'
            } else {
                panel.style.display = ''
                panel.classList.remove('fade-in')
                void panel.offsetWidth
                panel.classList.add('fade-in')
            }
        })

        if (activeCategory === 'all' && !query) {
            grid.classList.remove('single-view')
        } else {
            grid.classList.add('single-view')
        }
    }

    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => {
                t.classList.remove('active')
                t.setAttribute('aria-selected', 'false')
            })
            tab.classList.add('active')
            tab.setAttribute('aria-selected', 'true')
            activeCategory = tab.dataset.tab || 'all'
            filterSettings()
            tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
    })

    if (searchInput) {
        searchInput.oninput = () => {
            filterSettings()
        }
    }
}

applyAppearancePreferences()
document.addEventListener('DOMContentLoaded', () => {
    bindSettings()
    initSettingsNav()
}, { once: true })
document.addEventListener('sectionsLoaded', () => {
    bindSettings()
    initSettingsNav()
})
