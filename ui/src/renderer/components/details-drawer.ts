import { appState } from '../state/app-state'

export function renderDetailsDrawer(): void {
  const container = document.getElementById('details-drawer-root')
  if (!container) return

  if (!appState.activeDrawerAppId || !appState.catalog) {
    container.classList.add('hidden')
    container.setAttribute('aria-hidden', 'true')
    container.innerHTML = ''
    return
  }

  const app = appState.catalog.apps.find(a => a.id === appState.activeDrawerAppId)
  if (!app) {
    container.classList.add('hidden')
    return
  }

  container.classList.remove('hidden')
  container.setAttribute('aria-hidden', 'false')

  const cardStatus = appState.getAppCardStatus(app.id)
  const silentArg = appState.config?.silentInstall ? '--silent ' : ''
  const exactCommand = `winget install --id ${app.id} --exact ${silentArg}--accept-package-agreements --accept-source-agreements --disable-interactivity`

  container.innerHTML = `
    <div class="drawer-panel" role="dialog" aria-modal="true" aria-label="${app.name} Details">
      <div class="drawer-header">
        <div class="drawer-app-meta">
          <div class="app-card-icon-container" style="width: 56px; height: 56px;">
            ${
              app.icon.startsWith('data:') || app.icon.startsWith('<svg') || app.icon.startsWith('http')
                ? `<img src="${app.icon}" class="app-card-icon-img" style="width: 40px; height: 40px;" alt="" />`
                : `<span class="app-avatar-fallback" style="font-size: 24px;">${app.name.charAt(0)}</span>`
            }
          </div>
          <div>
            <h2 style="font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">${app.name}</h2>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">${app.publisher}</div>
          </div>
        </div>
        <button id="btn-close-drawer" class="drawer-close-btn" aria-label="Close details drawer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div>
        <h4 class="filter-section-title" style="padding: 0;">Overview</h4>
        <p style="font-size: 14px; line-height: 1.5; color: var(--text-main); margin-top: 6px;">
          ${app.description}
        </p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div>
          <span style="font-size: 11px; color: var(--text-faint); text-transform: uppercase;">Winget Package ID</span>
          <div style="font-size: 13px; font-weight: 600; font-family: monospace; color: var(--accent-primary); margin-top: 2px;">
            ${app.id}
          </div>
        </div>
        <div>
          <span style="font-size: 11px; color: var(--text-faint); text-transform: uppercase;">Category</span>
          <div style="font-size: 13px; font-weight: 500; margin-top: 2px;">${app.category}</div>
        </div>
        <div>
          <span style="font-size: 11px; color: var(--text-faint); text-transform: uppercase;">Safety Level</span>
          <div style="font-size: 13px; font-weight: 600; margin-top: 2px; color: ${app.safety === 'safe' ? 'var(--status-installed)' : 'var(--status-caution)'};">
            ${app.safety === 'safe' ? 'Verified Safe' : 'Requires Caution'}
          </div>
        </div>
        <div>
          <span style="font-size: 11px; color: var(--text-faint); text-transform: uppercase;">Install Scope</span>
          <div style="font-size: 13px; font-weight: 500; margin-top: 2px; text-transform: capitalize;">${app.installScope}</div>
        </div>
      </div>

      <div>
        <h4 class="filter-section-title" style="padding: 0;">Official Website</h4>
        <div style="margin-top: 6px;">
          <a
            href="${app.website}"
            id="link-app-website"
            style="color: var(--accent-primary); font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;"
          >
            ${app.website}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>

      ${
        app.fallbackDownload
          ? `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 12px;">
          <strong>Publisher Fallback Included:</strong> If winget repositories are temporarily offline, this app can fall back to an HTTPS verified installer with SHA-256 validation.
        </div>
      `
          : ''
      }

      <div>
        <h4 class="filter-section-title" style="padding: 0;">Command Transparency</h4>
        <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 8px;">
          The exact non-interactive command executed on Windows:
        </p>
        <pre class="drawer-command-box"><code>${exactCommand}</code></pre>
      </div>

      <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-subtle); display: flex; gap: 12px;">
        <button
          id="btn-drawer-install"
          class="btn-primary"
          style="flex: 1; justify-content: center; padding: 10px;"
          ${cardStatus === 'installing' ? 'disabled' : ''}
        >
          ${cardStatus === 'installed' ? 'Reinstall' : cardStatus === 'update_available' ? 'Update Now' : 'Install App'}
        </button>
      </div>
    </div>
  `

  // Close button click
  const closeBtn = container.querySelector<HTMLButtonElement>('#btn-close-drawer')
  closeBtn?.addEventListener('click', () => {
    appState.activeDrawerAppId = null
    appState.notify()
  })

  // Close when clicking outside panel
  container.addEventListener('click', e => {
    if (e.target === container) {
      appState.activeDrawerAppId = null
      appState.notify()
    }
  })

  // External website link click
  const link = container.querySelector<HTMLAnchorElement>('#link-app-website')
  link?.addEventListener('click', e => {
    e.preventDefault()
    if (window.electronAPI) {
      window.electronAPI.openExternal(app.website)
    }
  })

  // Drawer install action
  const installBtn = container.querySelector<HTMLButtonElement>('#btn-drawer-install')
  installBtn?.addEventListener('click', async () => {
    if (window.electronAPI) {
      await window.electronAPI.enqueueJob(app.id, cardStatus === 'update_available' ? 'upgrade' : 'install')
      appState.activeDrawerAppId = null
      appState.announceAria(`Started installation of ${app.name}`)
      appState.notify()
    }
  })
}
