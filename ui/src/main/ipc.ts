import { ipcMain, shell, BrowserWindow } from 'electron'
import { IWingetService } from './winget/types'
import { CatalogLoader } from './catalog/catalog-loader'
import { ConfigManager } from './config/config'
import { JobQueue } from './queue/job-queue'
import { checkIsAdmin } from './elevation/elevation'
import { createRestorePointStub } from './restore-point/restore-point'
import { InstalledAppInfo, JobType } from '../shared/types'
import { logger } from './logger/logger'

export function registerIpcHandlers(
  wingetService: IWingetService,
  catalogLoader: CatalogLoader,
  configManager: ConfigManager,
  jobQueue: JobQueue,
  getMainWindow: () => BrowserWindow | null
): void {
  // Push job and queue updates to renderer
  jobQueue.onJobUpdate(job => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('job-updated', job)
    }
  })

  jobQueue.onQueueUpdate(jobs => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('queue-updated', jobs)
    }
  })

  // 1. Detect Winget
  ipcMain.handle('winget:detect', async () => {
    return await wingetService.checkAvailable()
  })

  // 2. Get Catalog
  ipcMain.handle('catalog:get', async () => {
    return catalogLoader.getCatalog()
  })

  // 3. Get Installed Status (cached / single pass)
  let cachedList: Map<string, { installedVersion: string; availableVersion?: string }> | null = null
  let lastListTime = 0

  ipcMain.handle('winget:installed-status', async (_event, requestedIds: unknown) => {
    if (!Array.isArray(requestedIds)) {
      throw new Error('Invalid payload: requestedIds must be an array of package IDs')
    }

    // Refresh list at most once every 10 seconds unless force refreshed
    const now = Date.now()
    if (!cachedList || now - lastListTime > 10000) {
      cachedList = await wingetService.listInstalled()
      lastListTime = now
    }

    const result: Record<string, InstalledAppInfo> = {}

    for (const rawId of requestedIds) {
      if (typeof rawId !== 'string' || !catalogLoader.isAllowedId(rawId)) {
        continue // Skip unallowed or malformed IDs
      }
      const lower = rawId.toLowerCase()
      const found = cachedList.get(lower)

      if (found) {
        result[rawId] = {
          installed: true,
          installedVersion: found.installedVersion,
          availableUpdate: found.availableVersion,
        }
      } else {
        result[rawId] = {
          installed: false,
        }
      }
    }

    return result
  })

  // 4. Get Config
  ipcMain.handle('config:get', async () => {
    return configManager.getConfig()
  })

  // 5. Save Config
  ipcMain.handle('config:save', async (_event, updates: unknown) => {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid config payload')
    }
    return configManager.updateConfig(updates as Record<string, unknown>)
  })

  // 6. Enqueue Job
  ipcMain.handle('job:enqueue', async (_event, rawAppId: unknown, rawType: unknown) => {
    if (typeof rawAppId !== 'string') {
      throw new Error('Invalid package ID parameter')
    }

    // Strict security check: reject any package ID not in catalog allowlist
    if (!catalogLoader.isAllowedId(rawAppId)) {
      logger.error('Security violation: Attempted to queue unlisted package ID', { rawAppId })
      throw new Error(`Unauthorized package ID: "${rawAppId}" is not allowed.`)
    }

    const validTypes: JobType[] = ['install', 'uninstall', 'upgrade']
    const type: JobType = typeof rawType === 'string' && validTypes.includes(rawType as JobType)
      ? (rawType as JobType)
      : 'install'

    return jobQueue.enqueue(rawAppId, type)
  })

  // 7. Cancel Job
  ipcMain.handle('job:cancel', async (_event, rawJobId: unknown) => {
    if (typeof rawJobId !== 'string') {
      throw new Error('Invalid jobId parameter')
    }
    return await jobQueue.cancel(rawJobId)
  })

  // 8. Retry Job
  ipcMain.handle('job:retry', async (_event, rawJobId: unknown) => {
    if (typeof rawJobId !== 'string') {
      throw new Error('Invalid jobId parameter')
    }
    return jobQueue.retry(rawJobId)
  })

  // 9. Get Jobs
  ipcMain.handle('job:list', async () => {
    return jobQueue.getJobs()
  })

  // 10. Create Restore Point
  ipcMain.handle('system:restore-point', async () => {
    return await createRestorePointStub()
  })

  // 11. Open External URL
  ipcMain.handle('system:open-external', async (_event, rawUrl: unknown) => {
    if (typeof rawUrl !== 'string' || !/^https?:\/\//i.test(rawUrl)) {
      throw new Error('Only secure HTTP/HTTPS URLs may be opened externally.')
    }
    await shell.openExternal(rawUrl)
  })

  // 12. Open Microsoft Store (App Installer)
  ipcMain.handle('system:open-store', async () => {
    await shell.openExternal('ms-windows-store://pdp/?productid=9NBLGGH4NNS1')
  })

  // 13. Admin Status Check
  ipcMain.handle('system:is-admin', async () => {
    const isAdmin = await checkIsAdmin()
    return { isAdmin }
  })
}
