import {
  Catalog,
  CatalogApp,
  InstallJob,
  InstalledAppInfo,
  AppConfig,
  WingetDetectionResult,
} from '../../shared/types'

export type StateListener = () => void

export class AppState {
  public catalog: Catalog | null = null
  public installedStatus: Record<string, InstalledAppInfo> = {}
  public jobs: InstallJob[] = []
  public selectedAppIds = new Set<string>()
  public searchQuery = ''
  public selectedCategory = 'All'
  public activeBundleId: string | null = null
  public sortBy: 'name' | 'publisher' | 'category' | 'status' = 'name'
  public wingetDetection: WingetDetectionResult | null = null
  public config: AppConfig | null = null
  public isAdmin = false
  public activeDrawerAppId: string | null = null
  public isQueueOpen = false
  public createRestorePointBeforeBatch = false

  private listeners: StateListener[] = []

  public subscribe(listener: StateListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  public notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  public announceAria(message: string): void {
    const el = document.getElementById('aria-live-status')
    if (el) {
      el.textContent = message
    }
  }

  public toggleSelectApp(id: string): void {
    if (this.selectedAppIds.has(id)) {
      this.selectedAppIds.delete(id)
    } else {
      this.selectedAppIds.add(id)
    }
    this.notify()
  }

  public selectBundle(bundleId: string): void {
    if (!this.catalog) return
    const bundle = this.catalog.bundles.find(b => b.id === bundleId)
    if (!bundle) return

    this.activeBundleId = bundleId
    this.selectedAppIds.clear()
    for (const appId of bundle.appIds) {
      this.selectedAppIds.add(appId)
    }
    this.announceAria(`Selected ${bundle.name} containing ${bundle.appIds.length} apps`)
    this.notify()
  }

  public clearSelection(): void {
    this.selectedAppIds.clear()
    this.activeBundleId = null
    this.announceAria('Cleared selection')
    this.notify()
  }

  public getFilteredApps(): CatalogApp[] {
    if (!this.catalog) return []

    let list = [...this.catalog.apps]

    // 1. Caution apps filter
    if (this.config && !this.config.showCautionApps) {
      list = list.filter(a => a.safety !== 'caution')
    }

    // 2. Category filter
    if (this.selectedCategory !== 'All') {
      list = list.filter(a => a.category.toLowerCase() === this.selectedCategory.toLowerCase())
    }

    // 3. Search query filter
    const query = this.searchQuery.trim().toLowerCase()
    if (query) {
      list = list.filter(
        a =>
          a.name.toLowerCase().includes(query) ||
          a.publisher.toLowerCase().includes(query) ||
          a.id.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.tags.some(t => t.toLowerCase().includes(query))
      )
    }

    // 4. Sort
    list.sort((a, b) => {
      if (this.sortBy === 'publisher') {
        return a.publisher.localeCompare(b.publisher) || a.name.localeCompare(b.name)
      }
      if (this.sortBy === 'category') {
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      }
      if (this.sortBy === 'status') {
        const statusA = this.getAppCardStatus(a.id)
        const statusB = this.getAppCardStatus(b.id)
        return statusA.localeCompare(statusB) || a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })

    return list
  }

  public getAppCardStatus(
    appId: string
  ): 'installing' | 'failed' | 'cancelled' | 'update_available' | 'installed' | 'not_installed' {
    // Check if active or latest job is for this package
    const latestJob = this.jobs.find(j => j.appId.toLowerCase() === appId.toLowerCase())
    if (latestJob) {
      if (latestJob.status === 'running' || latestJob.status === 'queued') {
        return 'installing'
      }
      if (latestJob.status === 'failed') {
        return 'failed'
      }
      if (latestJob.status === 'cancelled') {
        return 'cancelled'
      }
    }

    const info = this.installedStatus[appId]
    if (info?.installed) {
      if (info.availableUpdate) {
        return 'update_available'
      }
      return 'installed'
    }

    return 'not_installed'
  }
}

export const appState = new AppState()
