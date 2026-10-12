export type Category =
  | 'Browsers'
  | 'Media'
  | 'Utilities'
  | 'Development'
  | 'Gaming'
  | 'Communication'
  | 'Productivity'
  | 'Security'

export type AppSafety = 'safe' | 'caution'
export type InstallScope = 'user' | 'machine' | 'either'

export interface FallbackDownload {
  url: string
  sha256: string
  silentArgs: string[]
}

export interface CatalogApp {
  id: string
  name: string
  publisher: string
  description: string
  category: Category
  tags: string[]
  website: string
  icon: string
  safety: AppSafety
  installScope: InstallScope
  fallbackDownload?: FallbackDownload
}

export interface PresetBundle {
  id: string
  name: string
  description: string
  appIds: string[]
}

export interface Catalog {
  version: string
  lastUpdated: string
  bundles: PresetBundle[]
  apps: CatalogApp[]
}

export type AppStatus =
  | 'not_installed'
  | 'installed'
  | 'update_available'
  | 'installing'
  | 'failed'
  | 'cancelled'

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type JobType = 'install' | 'uninstall' | 'upgrade'

export interface JobError {
  message: string
  code?: number | string
  suggestedFix?: string
  rawDetails?: string
}

export interface InstallJob {
  id: string
  appId: string
  appName: string
  type: JobType
  status: JobStatus
  progress: number // 0-100, or -1 for indeterminate
  stdout: string[]
  error?: JobError
  queuedAt: number
  startedAt?: number
  completedAt?: number
}

export interface AppConfig {
  silentInstall: boolean
  maxConcurrentInstalls: number
  confirmBeforeInstall: boolean
  createRestorePoint: boolean
  remoteCatalogUrl: string
  autoCheckUpdates: boolean
  showCautionApps: boolean
  demoMode: boolean
}

export interface WingetDetectionResult {
  available: boolean
  version?: string
  reason?: string
}

export interface InstalledAppInfo {
  installed: boolean
  installedVersion?: string
  availableUpdate?: string
}

export interface ElectronAPI {
  detectWinget: () => Promise<WingetDetectionResult>
  getCatalog: () => Promise<Catalog>
  getInstalledStatus: (appIds: string[]) => Promise<Record<string, InstalledAppInfo>>
  getConfig: () => Promise<AppConfig>
  saveConfig: (config: Partial<AppConfig>) => Promise<AppConfig>
  enqueueJob: (appId: string, type?: JobType) => Promise<InstallJob>
  cancelJob: (jobId: string) => Promise<boolean>
  retryJob: (jobId: string) => Promise<InstallJob>
  getJobs: () => Promise<InstallJob[]>
  createRestorePoint: () => Promise<{ success: boolean; message: string }>
  openExternal: (url: string) => Promise<void>
  openAppInstallerStore: () => Promise<void>
  checkAdminStatus: () => Promise<{ isAdmin: boolean }>
  onJobUpdate: (callback: (job: InstallJob) => void) => () => void
  onQueueUpdate: (callback: (jobs: InstallJob[]) => void) => () => void
}
