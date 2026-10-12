export interface MaintenanceModule {
  id: string
  title: string
  icon: string
  route: string
  enabled: boolean
  render: (container: HTMLElement) => void
  cleanup?: () => void
}

import { renderSoftwarePage } from './software/SoftwarePage'
import { renderCleanupPage } from './cleanup/CleanupPage'
import { renderStartupPage } from './startup/StartupPage'
import { renderUpdatesPage } from './updates/UpdatesPage'

export const maintenanceRegistry: MaintenanceModule[] = [
  {
    id: 'software',
    title: 'Software install',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    route: '#/maintenance/software',
    enabled: true,
    render: renderSoftwarePage,
  },
  {
    id: 'cleanup',
    title: 'Cleanup',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    route: '#/maintenance/cleanup',
    enabled: false,
    render: renderCleanupPage,
  },
  {
    id: 'startup',
    title: 'Startup apps',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
    route: '#/maintenance/startup',
    enabled: false,
    render: renderStartupPage,
  },
  {
    id: 'updates',
    title: 'App updates',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
    route: '#/maintenance/updates',
    enabled: false,
    render: renderUpdatesPage,
  },
]
