import { appState } from '../../../state/app-state'

export function renderMissingWingetScreen(container: HTMLElement, reason?: string): void {
  container.innerHTML = `
    <div class="missing-winget-container">
      <div class="missing-winget-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h2 style="font-size: 22px; font-weight: 700;">Windows Package Manager is Needed</h2>
      <p style="color: var(--text-muted); font-size: 14px; line-height: 1.6;">
        Software installation in OptiCore relies on the official <strong>Windows Package Manager (winget)</strong>
        to securely fetch, verify, and install applications directly from verified software publishers.
      </p>

      ${
        reason
          ? `<div style="background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 16px; font-size: 12px; color: var(--text-faint); margin: 6px 0;">
              ${reason}
            </div>`
          : ''
      }

      <div style="display: flex; gap: 12px; margin-top: 10px;">
        <button id="btn-open-store-installer" class="btn-primary" style="padding: 10px 20px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Get "App Installer" from Microsoft Store
        </button>

        <button id="btn-recheck-winget" class="btn-secondary" style="padding: 10px 18px;">
          Check Again
        </button>
      </div>
    </div>
  `

  const btnStore = container.querySelector<HTMLButtonElement>('#btn-open-store-installer')
  btnStore?.addEventListener('click', async () => {
    if (window.electronAPI) {
      await window.electronAPI.openAppInstallerStore()
    }
  })

  const btnRecheck = container.querySelector<HTMLButtonElement>('#btn-recheck-winget')
  btnRecheck?.addEventListener('click', async () => {
    if (btnRecheck) btnRecheck.textContent = 'Checking...'
    if (window.electronAPI) {
      const res = await window.electronAPI.detectWinget()
      appState.wingetDetection = res
      appState.notify()
    }
  })
}
