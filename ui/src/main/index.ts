import path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { configManager } from './config/config'
import { logger } from './logger/logger'
import { CatalogLoader } from './catalog/catalog-loader'
import { WingetService } from './winget/winget-service'
import { MockWinget } from './winget/mock-winget'
import { JobQueue } from './queue/job-queue'
import { registerIpcHandlers } from './ipc'
import { IWingetService } from './winget/types'

let mainWindow: BrowserWindow | null = null

function createWindow(
  wingetService: IWingetService,
  catalogLoader: CatalogLoader,
  jobQueue: JobQueue
): void {
  const preloadPath = path.join(__dirname, 'preload.js')
  const htmlPath = path.join(__dirname, '../renderer/index.html')

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'OptiCore Suite',
    backgroundColor: '#0F172A',
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  registerIpcHandlers(
    wingetService,
    catalogLoader,
    configManager,
    jobQueue,
    () => mainWindow
  )

  mainWindow.loadFile(htmlPath).catch(err => {
    logger.error('Failed to load renderer HTML file', { htmlPath, error: String(err) })
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  const config = configManager.getConfig()
  logger.info('OptiCore main process starting', {
    demoMode: config.demoMode,
    concurrency: config.maxConcurrentInstalls,
  })

  const catalogLoader = new CatalogLoader(config.remoteCatalogUrl)
  const wingetService: IWingetService = config.demoMode ? new MockWinget() : new WingetService()
  const jobQueue = new JobQueue(wingetService, catalogLoader, configManager)

  createWindow(wingetService, catalogLoader, jobQueue)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(wingetService, catalogLoader, jobQueue)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
