import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { app } from 'electron'

export class Logger {
  private logFilePath: string

  constructor() {
    let baseDir = ''
    try {
      baseDir = app ? app.getPath('userData') : process.cwd()
    } catch {
      baseDir = process.cwd()
    }
    this.logFilePath = path.join(baseDir, 'install-actions.log')
  }

  private sanitize(message: string): string {
    const username = os.userInfo?.()?.username || process.env.USERNAME || ''
    let cleaned = message
    if (username && username.length > 1) {
      cleaned = cleaned.split(username).join('<user>')
    }
    // Also sanitize home directory paths
    const homedir = os.homedir()
    if (homedir && homedir.length > 3) {
      cleaned = cleaned.split(homedir).join('<home>')
    }
    return cleaned
  }

  private writeLine(level: 'INFO' | 'WARN' | 'ERROR', event: string, details?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString()
    let line = `[${timestamp}] [${level}] ${this.sanitize(event)}`
    if (details) {
      const sanitizedDetails = this.sanitize(JSON.stringify(details))
      line += ` | ${sanitizedDetails}`
    }
    line += '\n'

    try {
      const dir = path.dirname(this.logFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.appendFileSync(this.logFilePath, line, 'utf8')
    } catch (err) {
      console.error('Failed to append to log file:', err)
    }
  }

  public info(event: string, details?: Record<string, unknown>): void {
    this.writeLine('INFO', event, details)
  }

  public warn(event: string, details?: Record<string, unknown>): void {
    this.writeLine('WARN', event, details)
  }

  public error(event: string, details?: Record<string, unknown>): void {
    this.writeLine('ERROR', event, details)
  }

  public logInstall(appId: string, jobId: string, type: string = 'install'): void {
    this.info(`Job started: ${type}`, { appId, jobId })
  }

  public logCancel(appId: string, jobId: string): void {
    this.warn(`Job cancelled by user`, { appId, jobId })
  }

  public logSuccess(appId: string, jobId: string, durationMs: number): void {
    this.info(`Job completed successfully`, { appId, jobId, durationMs })
  }

  public logFailure(appId: string, jobId: string, exitCode?: number | string, reason?: string): void {
    this.error(`Job failed`, { appId, jobId, exitCode, reason })
  }

  public getLogPath(): string {
    return this.logFilePath
  }
}

export const logger = new Logger()
