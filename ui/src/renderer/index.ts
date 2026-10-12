/// <reference path="../shared/global.d.ts" />
import { router } from './router'
import { appState } from './state/app-state'
import { renderSidebar } from './components/sidebar'
import { renderDetailsDrawer } from './components/details-drawer'
import { renderQueuePanel } from './components/queue-panel'
import { renderMaintenancePage } from './maintenance/MaintenancePage'
import { renderHomePage } from './components/home-page'
import { renderSettingsPage } from './components/settings-page'
import { InstallJob } from '../shared/types'

function renderAppView(): void {
  const contentContainer = document.getElementById('content-container')
  if (!contentContainer) return

  const primaryNavId = router.getPrimaryNavId()

  if (primaryNavId === 'maintenance') {
    renderMaintenancePage(contentContainer)
  } else if (primaryNavId === 'home') {
    renderHomePage(contentContainer)
  } else if (primaryNavId === 'settings') {
    renderSettingsPage(contentContainer)
  }

  renderSidebar()
  renderDetailsDrawer()
  renderQueuePanel()
}

async function initializeApp(): Promise<void> {
  // Subscribe UI to state updates
  appState.subscribe(() => {
    renderAppView()
  })

  // Subscribe to route changes
  router.onRouteChange(() => {
    renderAppView()
  })

  // Listen to keyboard Escape to dismiss drawers
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (appState.activeDrawerAppId) {
        appState.activeDrawerAppId = null
        appState.notify()
      } else if (appState.isQueueOpen) {
        appState.isQueueOpen = false
        appState.notify()
      }
    }
  })

  // Connect Electron IPC
  if (window.electronAPI) {
    // 1. Register background stream listeners
    window.electronAPI.onJobUpdate((job: InstallJob) => {
      const idx = appState.jobs.findIndex(j => j.id === job.id)
      if (idx !== -1) {
        appState.jobs[idx] = job
      } else {
        appState.jobs.unshift(job)
      }

      // If job completed, mark as installed
      if (job.status === 'completed') {
        appState.installedStatus[job.appId] = {
          installed: true,
          installedVersion: 'Installed',
        }
        appState.announceAria(`Installation of ${job.appName} completed successfully.`)
      } else if (job.status === 'failed') {
        appState.announceAria(`Installation of ${job.appName} failed: ${job.error?.message || 'Error'}`)
      }

      appState.notify()
    })

    window.electronAPI.onQueueUpdate((jobs: InstallJob[]) => {
      appState.jobs = jobs
      appState.notify()
    })

    // 2. Fetch initial environment status
    try {
      const [config, adminRes, wingetRes, catalog, initialJobs] = await Promise.all([
        window.electronAPI.getConfig(),
        window.electronAPI.checkAdminStatus(),
        window.electronAPI.detectWinget(),
        window.electronAPI.getCatalog(),
        window.electronAPI.getJobs(),
      ])

      appState.config = config
      appState.isAdmin = adminRes.isAdmin
      appState.wingetDetection = wingetRes
      appState.catalog = catalog
      appState.jobs = initialJobs

      // 3. Fetch installed status for catalog apps if winget is available
      if (wingetRes.available && catalog && catalog.apps.length > 0) {
        const ids = catalog.apps.map(a => a.id)
        window.electronAPI.getInstalledStatus(ids).then(statusMap => {
          appState.installedStatus = statusMap
          appState.notify()
        }).catch(err => {
          console.warn('Failed to load installed package list:', err)
        })
      }
    } catch (err) {
      console.error('Initialization error:', err)
    }
  }

  // Initialize router
  router.init()
  renderAppView()
}

document.addEventListener('DOMContentLoaded', () => {
  initializeApp()
})
