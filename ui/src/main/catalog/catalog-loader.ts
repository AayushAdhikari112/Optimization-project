import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { app } from 'electron'
import { Catalog, CatalogApp } from '../../shared/types'
import { validateCatalog } from '../../shared/schema'
import { logger } from '../logger/logger'

export class CatalogLoader {
  private currentCatalog: Catalog
  private allowedIds = new Set<string>()
  private cacheFilePath: string
  private bundledCatalogPath: string

  constructor(remoteUrl?: string) {
    let userDataDir = ''
    try {
      userDataDir = app ? app.getPath('userData') : process.cwd()
    } catch {
      userDataDir = process.cwd()
    }

    this.cacheFilePath = path.join(userDataDir, 'cached-catalog.json')

    // Find bundled catalog.json: check app.getAppPath() or relative paths
    const candidates = [
      path.join(__dirname, '../../catalog/catalog.json'),
      path.join(__dirname, '../catalog/catalog.json'),
      path.join(process.cwd(), 'catalog/catalog.json'),
      path.join(process.cwd(), 'dist/catalog/catalog.json'),
    ]

    let foundBundled = ''
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        foundBundled = c
        break
      }
    }
    this.bundledCatalogPath = foundBundled || candidates[0]

    // Initialize with bundled catalog synchronously
    this.currentCatalog = this.loadBundledCatalog()
    this.rebuildAllowlist()

    // If remote URL is provided, attempt background refresh
    if (remoteUrl) {
      this.refreshFromRemote(remoteUrl).catch(err => {
        logger.warn('Remote catalog initial sync failed, using offline fallback', { error: String(err) })
      })
    }
  }

  private rebuildAllowlist(): void {
    this.allowedIds.clear()
    for (const item of this.currentCatalog.apps) {
      this.allowedIds.add(item.id.toLowerCase())
    }
  }

  public isAllowedId(packageId: string): boolean {
    if (!packageId || typeof packageId !== 'string') return false
    return this.allowedIds.has(packageId.trim().toLowerCase())
  }

  public getApp(packageId: string): CatalogApp | undefined {
    if (!packageId || typeof packageId !== 'string') return undefined
    const search = packageId.trim().toLowerCase()
    return this.currentCatalog.apps.find(a => a.id.toLowerCase() === search)
  }

  public getCatalog(): Catalog {
    return this.currentCatalog
  }

  public loadBundledCatalog(): Catalog {
    try {
      if (fs.existsSync(this.bundledCatalogPath)) {
        const raw = fs.readFileSync(this.bundledCatalogPath, 'utf8')
        const parsed = JSON.parse(raw)
        const validation = validateCatalog(parsed)
        if (validation.valid && validation.data) {
          logger.info('Bundled catalog loaded successfully', {
            appCount: validation.data.apps.length,
            version: validation.data.version,
          })
          return validation.data
        }
        logger.error('Bundled catalog schema validation failed', { errors: validation.errors })
      }
    } catch (err) {
      logger.error('Failed to read bundled catalog from disk', { path: this.bundledCatalogPath, err: String(err) })
    }

    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      bundles: [],
      apps: [],
    }
  }

  public async refreshFromRemote(remoteUrl: string): Promise<boolean> {
    if (!remoteUrl || !remoteUrl.startsWith('https://')) {
      logger.warn('Remote catalog URL must use secure HTTPS protocol', { remoteUrl })
      return false
    }

    try {
      logger.info('Fetching remote catalog', { remoteUrl })
      const rawJson = await this.fetchHttps(remoteUrl, 5000, 1024 * 1024) // 5s timeout, 1MB limit
      const parsed = JSON.parse(rawJson)
      const validation = validateCatalog(parsed)

      if (validation.valid && validation.data) {
        this.currentCatalog = validation.data
        this.rebuildAllowlist()

        // Cache to disk
        try {
          fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.currentCatalog, null, 2), 'utf8')
          logger.info('Remote catalog cached to disk successfully', { path: this.cacheFilePath })
        } catch (cacheErr) {
          logger.warn('Failed to write cached catalog to disk', { error: String(cacheErr) })
        }
        return true
      } else {
        logger.warn('Remote catalog failed schema validation, keeping existing catalog', {
          errors: validation.errors,
        })
        return false
      }
    } catch (err) {
      logger.warn('Failed to fetch remote catalog, falling back to disk cache or bundled', {
        error: String(err),
      })
      this.loadCachedCatalogFallback()
      return false
    }
  }

  private loadCachedCatalogFallback(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf8')
        const parsed = JSON.parse(raw)
        const validation = validateCatalog(parsed)
        if (validation.valid && validation.data) {
          this.currentCatalog = validation.data
          this.rebuildAllowlist()
          logger.info('Loaded fallback catalog from disk cache', { appCount: this.currentCatalog.apps.length })
          return
        }
      }
    } catch (err) {
      logger.warn('Disk cache unreadable, retaining bundled catalog', { error: String(err) })
    }
  }

  private fetchHttps(urlStr: string, timeoutMs: number, maxBytes: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(urlStr, res => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume()
          return reject(new Error(`HTTP status ${res.statusCode}`))
        }

        let receivedBytes = 0
        let data = ''

        res.setEncoding('utf8')
        res.on('data', chunk => {
          receivedBytes += Buffer.byteLength(chunk, 'utf8')
          if (receivedBytes > maxBytes) {
            req.destroy(new Error(`Payload exceeded maximum size limit of ${maxBytes} bytes`))
            return
          }
          data += chunk
        })

        res.on('end', () => resolve(data))
      })

      req.on('timeout', () => {
        req.destroy(new Error(`HTTP request timed out after ${timeoutMs}ms`))
      })

      req.on('error', reject)
      req.setTimeout(timeoutMs)
    })
  }
}
