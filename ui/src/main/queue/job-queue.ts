import crypto from 'node:crypto'
import { InstallJob, JobStatus, JobType } from '../../shared/types'
import { IWingetService } from '../winget/types'
import { mapWingetExitCode } from '../winget/exit-codes'
import { logger } from '../logger/logger'
import { CatalogLoader } from '../catalog/catalog-loader'
import { ConfigManager } from '../config/config'
import { FallbackDownloader } from '../fallback/fallback-downloader'

export type JobUpdateCallback = (job: InstallJob) => void
export type QueueUpdateCallback = (jobs: InstallJob[]) => void

export class JobQueue {
  private jobs: InstallJob[] = []
  private runningJobPids = new Map<string, number>()
  private runningJobsCount = 0
  private jobUpdateListeners = new Set<JobUpdateCallback>()
  private queueUpdateListeners = new Set<QueueUpdateCallback>()

  constructor(
    private wingetService: IWingetService,
    private catalogLoader: CatalogLoader,
    private configManager: ConfigManager
  ) {}

  public onJobUpdate(callback: JobUpdateCallback): () => void {
    this.jobUpdateListeners.add(callback)
    return () => this.jobUpdateListeners.delete(callback)
  }

  public onQueueUpdate(callback: QueueUpdateCallback): () => void {
    this.queueUpdateListeners.add(callback)
    return () => this.queueUpdateListeners.delete(callback)
  }

  private notifyJobUpdate(job: InstallJob): void {
    for (const listener of this.jobUpdateListeners) {
      try {
        listener({ ...job })
      } catch (err) {
        console.error('Error notifying job listener:', err)
      }
    }
  }

  private notifyQueueUpdate(): void {
    const copy = this.getJobs()
    for (const listener of this.queueUpdateListeners) {
      try {
        listener(copy)
      } catch (err) {
        console.error('Error notifying queue listener:', err)
      }
    }
  }

  public getJobs(): InstallJob[] {
    return this.jobs.map(j => ({ ...j, stdout: [...j.stdout] }))
  }

  public getJob(id: string): InstallJob | undefined {
    const job = this.jobs.find(j => j.id === id)
    return job ? { ...job, stdout: [...job.stdout] } : undefined
  }

  public getActiveJobsCount(): number {
    return this.jobs.filter(j => j.status === 'running' || j.status === 'queued').length
  }

  public getFailedJobsCount(): number {
    return this.jobs.filter(j => j.status === 'failed').length
  }

  public enqueue(appId: string, type: JobType = 'install'): InstallJob {
    // 1. Strict allowlist validation
    if (!this.catalogLoader.isAllowedId(appId)) {
      throw new Error(`Security Exception: Package ID "${appId}" is not in the validated catalog allowlist.`)
    }

    const appEntry = this.catalogLoader.getApp(appId)
    const appName = appEntry ? appEntry.name : appId

    // Check if there is already a running or queued job for this package
    const existing = this.jobs.find(j => j.appId.toLowerCase() === appId.toLowerCase() && (j.status === 'queued' || j.status === 'running'))
    if (existing) {
      return { ...existing }
    }

    const job: InstallJob = {
      id: crypto.randomUUID(),
      appId,
      appName,
      type,
      status: 'queued',
      progress: 0,
      stdout: [`Queued ${type} for ${appName} (${appId})...`],
      queuedAt: Date.now(),
    }

    this.jobs.unshift(job) // Newer on top of history
    logger.logInstall(appId, job.id, type)

    this.notifyJobUpdate(job)
    this.notifyQueueUpdate()

    // Trigger queue pump
    process.nextTick(() => this.pumpQueue())

    return { ...job }
  }

  public async cancel(jobId: string): Promise<boolean> {
    const job = this.jobs.find(j => j.id === jobId)
    if (!job) return false

    if (job.status === 'queued') {
      job.status = 'cancelled'
      job.completedAt = Date.now()
      job.stdout.push('Cancelled while in queue.')
      logger.logCancel(job.appId, job.id)
      this.notifyJobUpdate(job)
      this.notifyQueueUpdate()
      return true
    }

    if (job.status === 'running') {
      const pid = this.runningJobPids.get(jobId)
      if (pid) {
        job.stdout.push('Stopping installer process...')
        await this.wingetService.cancel(pid)
        this.runningJobPids.delete(jobId)
      }
      job.status = 'cancelled'
      job.completedAt = Date.now()
      job.stdout.push('Job cancelled by user.')
      logger.logCancel(job.appId, job.id)
      this.runningJobsCount = Math.max(0, this.runningJobsCount - 1)
      this.notifyJobUpdate(job)
      this.notifyQueueUpdate()
      process.nextTick(() => this.pumpQueue())
      return true
    }

    return false
  }

  public retry(jobId: string): InstallJob {
    const job = this.jobs.find(j => j.id === jobId)
    if (!job) {
      throw new Error(`Job "${jobId}" not found for retry.`)
    }

    if (job.status === 'running' || job.status === 'queued') {
      return { ...job }
    }

    // Reset job state and re-queue
    job.status = 'queued'
    job.progress = 0
    job.error = undefined
    job.startedAt = undefined
    job.completedAt = undefined
    job.stdout.push('--- Retrying job ---')
    job.queuedAt = Date.now()

    logger.info('Retrying job', { jobId: job.id, appId: job.appId })

    this.notifyJobUpdate(job)
    this.notifyQueueUpdate()

    process.nextTick(() => this.pumpQueue())

    return { ...job }
  }

  private async pumpQueue(): Promise<void> {
    const config = this.configManager.getConfig()
    const maxConcurrency = Math.min(Math.max(config.maxConcurrentInstalls || 1, 1), 2)

    while (this.runningJobsCount < maxConcurrency) {
      // Find oldest queued job
      const nextJob = [...this.jobs].reverse().find(j => j.status === 'queued')
      if (!nextJob) {
        break
      }

      this.runningJobsCount++
      this.runJob(nextJob, config.silentInstall)
    }
  }

  private async runJob(job: InstallJob, silent: boolean): Promise<void> {
    job.status = 'running'
    job.startedAt = Date.now()
    job.progress = 0
    job.stdout.push(`Beginning execution...`)
    this.notifyJobUpdate(job)
    this.notifyQueueUpdate()

    const startTime = Date.now()
    const appEntry = this.catalogLoader.getApp(job.appId)

    try {
      const result = await this.wingetService.execute(
        job.type,
        job.appId,
        { silent },
        (pct, rawChunk) => {
          if (pct >= 0) {
            job.progress = pct
          }
          if (rawChunk) {
            job.stdout.push(rawChunk)
          }
          this.notifyJobUpdate(job)
        },
        pid => {
          this.runningJobPids.set(job.id, pid)
        }
      )

      this.runningJobPids.delete(job.id)

      if ((job.status as JobStatus) === 'cancelled') {
        // Was already marked cancelled
        return
      }

      if (result.exitCode === 0) {
        job.status = 'completed'
        job.progress = 100
        job.completedAt = Date.now()
        job.stdout.push('Operation completed successfully.')
        logger.logSuccess(job.appId, job.id, Date.now() - startTime)
      } else {
        // Check if fallback download is available for this app
        if (appEntry?.fallbackDownload && job.type === 'install') {
          job.stdout.push('Winget install encountered an issue; attempting verified publisher fallback download...')
          const fallbackRes = await FallbackDownloader.executeFallback(
            job.appId,
            appEntry.fallbackDownload,
            (pct, msg) => {
              job.progress = pct
              job.stdout.push(msg)
              this.notifyJobUpdate(job)
            }
          )

          if (fallbackRes.success) {
            job.status = 'completed'
            job.progress = 100
            job.completedAt = Date.now()
            logger.logSuccess(job.appId, job.id, Date.now() - startTime)
            return
          } else {
            job.stdout.push(`Fallback download also failed: ${fallbackRes.error}`)
          }
        }

        const mappedError = mapWingetExitCode(result.exitCode, result.stdout, result.stderr)
        job.status = 'failed'
        job.error = mappedError
        job.completedAt = Date.now()
        job.stdout.push(`Failed with exit code ${result.exitCode}: ${mappedError.message}`)
        logger.logFailure(job.appId, job.id, result.exitCode, mappedError.message)
      }
    } catch (err: unknown) {
      this.runningJobPids.delete(job.id)
      if ((job.status as JobStatus) !== 'cancelled') {
        const errorMsg = err instanceof Error ? err.message : String(err)
        job.status = 'failed'
        job.error = {
          message: 'Process execution error',
          suggestedFix: 'Check your system permissions and antivirus software.',
          rawDetails: errorMsg,
        }
        job.completedAt = Date.now()
        job.stdout.push(`Execution error: ${errorMsg}`)
        logger.logFailure(job.appId, job.id, 'EXCEPTION', errorMsg)
      }
    } finally {
      this.runningJobsCount = Math.max(0, this.runningJobsCount - 1)
      this.notifyJobUpdate(job)
      this.notifyQueueUpdate()
      process.nextTick(() => this.pumpQueue())
    }
  }
}
