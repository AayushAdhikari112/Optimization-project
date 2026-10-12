import { JobType, WingetDetectionResult } from '../../shared/types'

export interface InstalledListEntry {
  installedVersion: string
  availableVersion?: string
}

export interface WingetExecuteOptions {
  silent: boolean
}

export interface WingetExecuteResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface IWingetService {
  checkAvailable(): Promise<WingetDetectionResult>
  listInstalled(): Promise<Map<string, InstalledListEntry>>
  execute(
    type: JobType,
    packageId: string,
    options: WingetExecuteOptions,
    onProgress: (progress: number, rawChunk: string) => void,
    onProcessStarted?: (pid: number) => void
  ): Promise<WingetExecuteResult>
  cancel(pid: number): Promise<boolean>
}
