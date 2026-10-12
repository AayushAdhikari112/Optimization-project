import { router } from '../router'
import { appState } from '../state/app-state'

interface SidebarItem {
  id: 'home' | 'maintenance' | 'settings'
  label: string
  route: string
  icon: string
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'home',
    label: 'Home',
    route: '#/home',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    route: '#/maintenance/software',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  },
  {
    id: 'settings',
    label: 'Settings',
    route: '#/settings',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  },
]

export function renderSidebar(): void {
  const container = document.getElementById('sidebar-nav-items')
  if (!container) return

  const activeNavId = router.getPrimaryNavId()
  const activeJobs = appState.jobs.filter(j => j.status === 'running' || j.status === 'queued')
  const failedJobs = appState.jobs.filter(j => j.status === 'failed')
  const badgeCount = activeJobs.length + failedJobs.length
  const hasFailed = failedJobs.length > 0

  container.innerHTML = SIDEBAR_ITEMS.map(item => {
    const isActive = item.id === activeNavId
    const showBadge = item.id === 'maintenance' && badgeCount > 0

    return `
      <li>
        <button
          class="nav-item-btn ${isActive ? 'active' : ''}"
          id="nav-${item.id}"
          data-route="${item.route}"
          aria-current="${isActive ? 'page' : 'false'}"
        >
          <div class="nav-item-content">
            <span class="nav-icon" aria-hidden="true">${item.icon}</span>
            <span>${item.label}</span>
          </div>
          ${
            showBadge
              ? `<span class="nav-badge ${hasFailed ? 'has-failed' : ''}" title="${activeJobs.length} active, ${failedJobs.length} failed">${badgeCount}</span>`
              : ''
          }
        </button>
      </li>
    `
  }).join('')

  // Wire item navigation
  container.querySelectorAll<HTMLButtonElement>('.nav-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route
      if (route) {
        router.navigate(route)
      }
    })
  })

  // Update admin status pill
  const adminIndicator = document.getElementById('system-status-indicator')
  if (adminIndicator) {
    if (appState.isAdmin) {
      adminIndicator.innerHTML = `
        <span class="status-dot admin"></span>
        <span class="status-label" style="color: var(--accent-primary); font-weight: 600;">Administrator</span>
      `
      adminIndicator.title = 'Running with elevated administrator privileges'
    } else {
      adminIndicator.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-label">Standard User</span>
      `
      adminIndicator.title = 'Running in standard user mode'
    }
  }
}
