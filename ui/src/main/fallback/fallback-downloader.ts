import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import https from 'node:https'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { FallbackDownload } from '../../shared/types'
import { logger } from '../logger/logger'

export class FallbackDownloader {
  public static async executeFallback(
    appId: string,
    fallback: FallbackDownload,
    onProgress: (pct: number, msg: string) => void
  ): Promise<{ success: boolean; error?: string }> {
    if (!fallback.url.startsWith('https://')) {
      return { success: false, error: 'Fallback download rejected: only secure HTTPS URLs are permitted.' }
    }

    const tempDir = path.join(os.tmpdir(), 'OptiCore-Installers')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const ext = path.extname(new URL(fallback.url).pathname) || '.exe'
    const targetFile = path.join(tempDir, `${appId.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}${ext}`)

    try {
      logger.info('Starting fallback download', { appId, url: fallback.url, targetFile })
      onProgress(5, `Connecting to publisher server via HTTPS...`)

      await FallbackDownloader.downloadFile(fallback.url, targetFile, onProgress)

      onProgress(80, `Verifying SHA-256 integrity checksum...`)
      const computedHash = await FallbackDownloader.calculateSha256(targetFile)

      if (computedHash.toLowerCase() !== fallback.sha256.toLowerCase()) {
        logger.error('Fallback SHA-256 mismatch', {
          appId,
          expected: fallback.sha256,
          actual: computedHash,
        })
        return {
          success: false,
          error: `Integrity check failed: expected ${fallback.sha256}, got ${computedHash}`,
        }
      }

      onProgress(90, `Launching installer with silent arguments...`)
      logger.info('Running fallback installer', { appId, args: fallback.silentArgs })

      const exitCode = await FallbackDownloader.runInstaller(targetFile, fallback.silentArgs)

      if (exitCode !== 0) {
        return { success: false, error: `Installer exited with non-zero code: ${exitCode}` }
      }

      onProgress(100, `Fallback installation completed successfully.`)
      return { success: true }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error('Fallback installation failed', { appId, error: errMsg })
      return { success: false, error: errMsg }
    } finally {
      // Ensure temp installer file is always cleaned up
      try {
        if (fs.existsSync(targetFile)) {
          fs.unlinkSync(targetFile)
          logger.info('Cleaned up fallback temp installer', { targetFile })
        }
      } catch (cleanErr) {
        logger.warn('Failed to delete temp installer file', { targetFile, err: String(cleanErr) })
      }
    }
  }

  private static downloadFile(
    urlStr: string,
    destPath: string,
    onProgress: (pct: number, msg: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(destPath)

      const req = https.get(urlStr, res => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          fileStream.close()
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`))
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
        let receivedBytes = 0

        res.on('data', chunk => {
          receivedBytes += chunk.length
          fileStream.write(chunk)
          if (totalBytes > 0) {
            const pct = Math.round((receivedBytes / totalBytes) * 75) // 0-75% for download
            onProgress(pct, `Downloading installer... ${pct}%`)
          }
        })

        res.on('end', () => {
          fileStream.end()
          resolve()
        })
      })

      req.on('error', err => {
        fileStream.close()
        reject(err)
      })
    })
  }

  private static calculateSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      const stream = fs.createReadStream(filePath)
      stream.on('data', data => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  private static runInstaller(exePath: string, args: string[]): Promise<number> {
    return new Promise(resolve => {
      const child = spawn(exePath, args, {
        windowsHide: true,
        stdio: 'ignore',
      })
      child.on('close', code => resolve(code ?? 0))
      child.on('error', () => resolve(-1))
    })
  }
}
