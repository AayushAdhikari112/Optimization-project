import { contextBridge, ipcRenderer } from 'electron'
import { ElectronAPI, InstallJob, JobType, AppConfig } from '../shared/types'

const api: ElectronAPI = {
  detectWinget: () => ipcRenderer.invoke('winget:detect'),
  getCatalog: () => ipcRenderer.invoke('catalog:get'),
  getInstalledStatus: (appIds: string[]) => ipcRenderer.invoke('winget:installed-status', appIds),
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config: Partial<AppConfig>) => ipcRenderer.invoke('config:save', config),
  enqueueJob: (appId: string, type: JobType = 'install') => ipcRenderer.invoke('job:enqueue', appId, type),
  cancelJob: (jobId: string) => ipcRenderer.invoke('job:cancel', jobId),
  retryJob: (jobId: string) => ipcRenderer.invoke('job:retry', jobId),
  getJobs: () => ipcRenderer.invoke('job:list'),
  createRestorePoint: () => ipcRenderer.invoke('system:restore-point'),
  openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
  openAppInstallerStore: () => ipcRenderer.invoke('system:open-store'),
  checkAdminStatus: () => ipcRenderer.invoke('system:is-admin'),

  onJobUpdate: (callback: (job: InstallJob) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, job: InstallJob) => callback(job)
    ipcRenderer.on('job-updated', handler)
    return () => {
      ipcRenderer.removeListener('job-updated', handler)
    }
  },

  onQueueUpdate: (callback: (jobs: InstallJob[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, jobs: InstallJob[]) => callback(jobs)
    ipcRenderer.on('queue-updated', handler)
    return () => {
      ipcRenderer.removeListener('queue-updated', handler)
    }
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
