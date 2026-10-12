import { spawn, execFile } from 'node:child_process'
import { IWingetService, InstalledListEntry, WingetExecuteOptions, WingetExecuteResult } from './types'
import { JobType, WingetDetectionResult } from '../../shared/types'
import { parseProgressPercentage, parseWingetList, stripAnsiAndNoise } from './parser'
import { logger } from '../logger/logger'

export class WingetService implements IWingetService {
  private activeProcesses = new Map<number, { killed: boolean }>()

  public checkAvailable(): Promise<WingetDetectionResult> {
    return new Promise(resolve => {
      execFile('winget', ['--version'], { windowsHide: true, timeout: 5000 }, (error, stdout) => {
        if (error) {
          logger.warn('Winget detection check failed', { error: error.message })
          resolve({
            available: false,
            reason: 'Windows Package Manager (winget) is not installed or not in PATH.',
          })
          return
        }

        const version = stdout.trim()
        if (!version) {
          resolve({
            available: false,
            reason: 'Winget command returned empty version information.',
          })
          return
        }

        logger.info('Winget detected successfully', { version })
        resolve({
          available: true,
          version,
        })
      })
    })
  }

  public listInstalled(): Promise<Map<string, InstalledListEntry>> {
    return new Promise(resolve => {
      // Execute winget list once
      execFile(
        'winget',
        ['list', '--accept-source-agreements', '--disable-interactivity'],
        { windowsHide: true, maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
        (error, stdout) => {
          if (error && !stdout) {
            logger.warn('Failed to retrieve installed winget packages list', { error: error.message })
            resolve(new Map())
            return
          }

          const parsed = parseWingetList(stdout)
          logger.info('Winget list parsed', { installedCount: parsed.size })
          resolve(parsed)
        }
      )
    })
  }

  public execute(
    type: JobType,
    packageId: string,
    options: WingetExecuteOptions,
    onProgress: (progress: number, rawChunk: string) => void,
    onProcessStarted?: (pid: number) => void
  ): Promise<WingetExecuteResult> {
    return new Promise((resolve, reject) => {
      // Build argument array strictly without shell string concatenation
      const args: string[] = []

      if (type === 'install') {
        args.push('install', '--id', packageId, '--exact')
      } else if (type === 'upgrade') {
        args.push('upgrade', '--id', packageId, '--exact')
      } else if (type === 'uninstall') {
        args.push('uninstall', '--id', packageId, '--exact')
      } else {
        return reject(new Error(`Unsupported job operation type: "${type}"`))
      }

      if (options.silent) {
        args.push('--silent')
      }

      args.push(
        '--accept-package-agreements',
        '--accept-source-agreements',
        '--disable-interactivity'
      )

      logger.info('Spawning winget command', { type, packageId, args })

      let stdoutAccum = ''
      let stderrAccum = ''

      try {
        const child = spawn('winget', args, {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        if (!child.pid) {
          return reject(new Error('Failed to spawn winget child process'))
        }

        const pid = child.pid
        this.activeProcesses.set(pid, { killed: false })

        if (onProcessStarted) {
          onProcessStarted(pid)
        }

        child.stdout.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8')
          stdoutAccum += text
          const cleaned = stripAnsiAndNoise(text)

          const pct = parseProgressPercentage(text)
          if (pct !== null) {
            onProgress(pct, cleaned)
          } else {
            // Send -1 for indeterminate progress when text is received but percentage is unavailable
            onProgress(-1, cleaned)
          }
        })

        child.stderr.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8')
          stderrAccum += text
          const cleaned = stripAnsiAndNoise(text)
          onProgress(-1, `[stderr] ${cleaned}`)
        })

        child.on('error', err => {
          this.activeProcesses.delete(pid)
          logger.error('Winget process error', { packageId, error: err.message })
          reject(err)
        })

        child.on('close', (code, signal) => {
          const procInfo = this.activeProcesses.get(pid)
          this.activeProcesses.delete(pid)

          const wasKilled = procInfo?.killed || signal === 'SIGTERM' || signal === 'SIGKILL'
          const finalCode = wasKilled ? -1978335204 : (code ?? 0)

          logger.info('Winget process exited', { packageId, exitCode: finalCode, wasKilled })

          resolve({
            exitCode: finalCode,
            stdout: stdoutAccum,
            stderr: stderrAccum,
          })
        })
      } catch (spawnError) {
        reject(spawnError)
      }
    })
  }

  public cancel(pid: number): Promise<boolean> {
    return new Promise(resolve => {
      const procInfo = this.activeProcesses.get(pid)
      if (procInfo) {
        procInfo.killed = true
      }

      if (process.platform === 'win32') {
        // Kill whole process tree including child installers
        execFile('taskkill', ['/F', '/T', '/PID', pid.toString()], { windowsHide: true }, err => {
          if (err) {
            logger.warn('taskkill failed to terminate process tree', { pid, error: err.message })
          } else {
            logger.info('taskkill terminated process tree successfully', { pid })
          }
          resolve(!err)
        })
      } else {
        try {
          process.kill(pid, 'SIGKILL')
          resolve(true)
        } catch {
          resolve(false)
        }
      }
    })
  }
}
