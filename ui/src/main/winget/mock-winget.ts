import { IWingetService, InstalledListEntry, WingetExecuteOptions, WingetExecuteResult } from './types'
import { JobType, WingetDetectionResult } from '../../shared/types'

export class MockWinget implements IWingetService {
  private activeSimulations = new Map<number, { cancelled: boolean }>()
  private nextPid = 1000
  public simulateFailureForIds = new Set<string>()
  public simulateSlowForIds = new Set<string>()

  // Pre-seed some installed apps for realistic UI demo
  private mockInstalled = new Map<string, InstalledListEntry>([
    ['notepadd++.notepad++', { installedVersion: '8.6.9' }],
    ['git.git', { installedVersion: '2.46.0', availableVersion: '2.47.0' }],
    ['7zip.7zip', { installedVersion: '24.08' }],
  ])

  public async checkAvailable(): Promise<WingetDetectionResult> {
    return {
      available: true,
      version: 'v1.29.380 (Mock/Demo Mode)',
    }
  }

  public async listInstalled(): Promise<Map<string, InstalledListEntry>> {
    return new Map(this.mockInstalled)
  }

  public async execute(
    type: JobType,
    packageId: string,
    _options: WingetExecuteOptions,
    onProgress: (progress: number, rawChunk: string) => void,
    onProcessStarted?: (pid: number) => void
  ): Promise<WingetExecuteResult> {
    const pid = ++this.nextPid
    const sim = { cancelled: false }
    this.activeSimulations.set(pid, sim)

    if (onProcessStarted) {
      onProcessStarted(pid)
    }

    onProgress(0, `[Demo] Initializing mock ${type} for ${packageId}...`)

    const isSlow = this.simulateSlowForIds.has(packageId.toLowerCase())
    const stepDelay = isSlow ? 600 : 200

    const stages = [15, 35, 60, 85, 100]

    for (const pct of stages) {
      if (sim.cancelled) {
        this.activeSimulations.delete(pid)
        return {
          exitCode: -1978335204, // Cancelled by user
          stdout: `[Demo] Operation for ${packageId} cancelled by user request.`,
          stderr: '',
        }
      }

      await new Promise(resolve => setTimeout(resolve, stepDelay))

      if (sim.cancelled) {
        this.activeSimulations.delete(pid)
        return {
          exitCode: -1978335204,
          stdout: `[Demo] Operation for ${packageId} cancelled by user request.`,
          stderr: '',
        }
      }

      if (pct < 60) {
        onProgress(pct, `[Demo] Downloading package payload... ${pct}%`)
      } else if (pct < 100) {
        onProgress(pct, `[Demo] Verifying checksum and running setup... ${pct}%`)
      } else {
        onProgress(pct, `[Demo] Finalizing installation registry entries... 100%`)
      }
    }

    this.activeSimulations.delete(pid)

    // Check if failure simulation is configured for this package
    if (this.simulateFailureForIds.has(packageId.toLowerCase())) {
      return {
        exitCode: -1978335221, // Installer failed
        stdout: `[Demo] Installer for ${packageId} returned exit code 1603 (simulated error).`,
        stderr: 'CustomAction failed during installation transaction.',
      }
    }

    // Success: register in mock installed map
    if (type === 'install' || type === 'upgrade') {
      this.mockInstalled.set(packageId.toLowerCase(), { installedVersion: '1.0.0 (Demo)' })
    } else if (type === 'uninstall') {
      this.mockInstalled.delete(packageId.toLowerCase())
    }

    return {
      exitCode: 0,
      stdout: `[Demo] Successfully installed ${packageId}`,
      stderr: '',
    }
  }

  public async cancel(pid: number): Promise<boolean> {
    const sim = this.activeSimulations.get(pid)
    if (sim) {
      sim.cancelled = true
      return true
    }
    return false
  }
}
