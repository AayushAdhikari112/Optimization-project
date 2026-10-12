import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { AppConfig } from '../../shared/types'

const DEFAULT_CONFIG: AppConfig = {
  silentInstall: true,
  maxConcurrentInstalls: 1,
  confirmBeforeInstall: true,
  createRestorePoint: false,
  remoteCatalogUrl: '',
  autoCheckUpdates: true,
  showCautionApps: true,
  demoMode: false,
}

export class ConfigManager {
  private configPath: string
  private currentConfig: AppConfig

  constructor() {
    let baseDir = ''
    try {
      baseDir = app ? app.getPath('userData') : process.cwd()
    } catch {
      baseDir = process.cwd()
    }
    this.configPath = path.join(baseDir, 'config.json')
    this.currentConfig = { ...DEFAULT_CONFIG }

    // Check CLI flag --demo or env DEMO_MODE
    if (process.argv.includes('--demo') || process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true') {
      this.currentConfig.demoMode = true
    }

    this.load()
  }

  private load(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8')
        const parsed = JSON.parse(raw)
        this.currentConfig = {
          ...DEFAULT_CONFIG,
          ...parsed,
          // Guarantee max concurrency constraint between 1 and 2
          maxConcurrentInstalls: Math.min(Math.max(Number(parsed.maxConcurrentInstalls) || 1, 1), 2),
        }
      }
    } catch {
      // Fallback to default if config file is corrupted or unreadable
      this.currentConfig = { ...DEFAULT_CONFIG }
    }

    if (process.argv.includes('--demo') || process.env.DEMO_MODE === '1') {
      this.currentConfig.demoMode = true
    }
  }

  public getConfig(): AppConfig {
    return { ...this.currentConfig }
  }

  public updateConfig(updates: Partial<AppConfig>): AppConfig {
    const updated: AppConfig = {
      ...this.currentConfig,
      ...updates,
    }

    if (typeof updated.maxConcurrentInstalls === 'number') {
      updated.maxConcurrentInstalls = Math.min(Math.max(updated.maxConcurrentInstalls, 1), 2)
    }

    this.currentConfig = updated
    try {
      const dir = path.dirname(this.configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.currentConfig, null, 2), 'utf8')
    } catch (err) {
      console.error('Failed to persist config to disk:', err)
    }

    return this.getConfig()
  }
}

export const configManager = new ConfigManager()
