import { CatalogApp } from '../../../../shared/types'
import { appState } from '../../../state/app-state'

export function renderAppCard(app: CatalogApp): HTMLElement {
  const isSelected = appState.selectedAppIds.has(app.id)
  const cardStatus = appState.getAppCardStatus(app.id)
  const latestJob = appState.jobs.find(j => j.appId.toLowerCase() === app.id.toLowerCase())
  const installedInfo = appState.installedStatus[app.id]

  const card = document.createElement('article')
  card.className = `app-card ${isSelected ? 'selected' : ''}`
  card.id = `card-${app.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
  card.tabIndex = 0
  card.setAttribute('role', 'article')
  card.setAttribute('aria-label', `${app.name} by ${app.publisher}`)

  // Monogram fallback
  const firstLetter = app.name.charAt(0).toUpperCase()
  const iconHtml = app.icon.startsWith('data:') || app.icon.startsWith('<svg') || app.icon.startsWith('http')
    ? `<img src="${app.icon}" class="app-card-icon-img" alt="" aria-hidden="true" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span class="app-avatar-fallback" style="display:none;" aria-hidden="true">${firstLetter}</span>`
    : `<span class="app-avatar-fallback" aria-hidden="true">${firstLetter}</span>`

  // Status text and button text
  let statusHtml = ''
  let actionBtnText = 'Install'
  let actionBtnClass = 'btn-install'
  let actionDisabled = false

  if (cardStatus === 'installing') {
    const pct = latestJob && latestJob.progress >= 0 ? `${latestJob.progress}%` : '...'
    statusHtml = `<span class="status-text-installing"><svg class="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/></svg> Installing ${pct}</span>`
    actionBtnText = 'Installing...'
    actionBtnClass = 'btn-installing'
    actionDisabled = true
  } else if (cardStatus === 'installed') {
    const ver = installedInfo?.installedVersion ? ` (v${installedInfo.installedVersion})` : ''
    statusHtml = `<span class="status-text-installed">✓ Installed${ver}</span>`
    actionBtnText = 'Installed'
    actionBtnClass = 'btn-installed'
    actionDisabled = false
  } else if (cardStatus === 'update_available') {
    const updateVer = installedInfo?.availableUpdate ? ` (${installedInfo.availableUpdate})` : ''
    statusHtml = `<span class="status-text-update">↑ Update ready${updateVer}</span>`
    actionBtnText = 'Update'
    actionBtnClass = 'btn-update'
    actionDisabled = false
  } else if (cardStatus === 'failed') {
    const reason = latestJob?.error?.message || 'Failed'
    statusHtml = `<span class="status-text-failed" title="${reason}">✕ ${reason}</span>`
    actionBtnText = 'Retry'
    actionBtnClass = 'btn-retry'
    actionDisabled = false
  } else if (cardStatus === 'cancelled') {
    statusHtml = `<span style="color: var(--text-faint); font-size: 12px;">Cancelled</span>`
    actionBtnText = 'Install'
    actionBtnClass = 'btn-install'
    actionDisabled = false
  } else {
    statusHtml = `<span style="color: var(--text-muted); font-size: 12px;">Not installed</span>`
    actionBtnText = 'Install'
    actionBtnClass = 'btn-install'
    actionDisabled = false
  }

  card.innerHTML = `
    <div>
      <div class="card-top-row">
        <div class="app-card-icon-container">
          ${iconHtml}
        </div>
        <div class="card-title-group">
          <div class="card-app-name" title="${app.name}">${app.name}</div>
          <div class="card-app-publisher" title="${app.publisher}">${app.publisher}</div>
        </div>
        <div class="card-select-checkbox-wrapper">
          <input
            type="checkbox"
            class="card-checkbox"
            id="chk-${card.id}"
            aria-label="Select ${app.name}"
            ${isSelected ? 'checked' : ''}
          />
        </div>
      </div>

      <p class="card-description-text" style="margin-top: 10px;" title="${app.description}">
        ${app.description}
      </p>
    </div>

    <div>
      <div class="card-badges-row">
        <span class="badge badge-category">${app.category}</span>
        <span class="badge ${app.safety === 'safe' ? 'badge-safe' : 'badge-caution'}">
          ${app.safety === 'safe' ? 'Safe' : 'Caution'}
        </span>
        <span class="badge" style="background: rgba(255,255,255,0.04); color: var(--text-faint);">
          ${app.installScope}
        </span>
      </div>

      <div class="card-bottom-row" style="margin-top: 12px;">
        <div class="card-status-indicator">
          ${statusHtml}
        </div>
        <button
          class="card-action-btn ${actionBtnClass}"
          id="btn-action-${card.id}"
          ${actionDisabled ? 'disabled' : ''}
        >
          ${actionBtnText}
        </button>
      </div>
    </div>
  `

  // Event: Checkbox click
  const checkbox = card.querySelector<HTMLInputElement>('.card-checkbox')
  checkbox?.addEventListener('click', e => {
    e.stopPropagation()
    appState.toggleSelectApp(app.id)
  })

  // Event: Action Button click
  const actionBtn = card.querySelector<HTMLButtonElement>('.card-action-btn')
  actionBtn?.addEventListener('click', async e => {
    e.stopPropagation()
    if (cardStatus === 'installing') return

    if (cardStatus === 'failed') {
      if (latestJob) {
        await window.electronAPI.retryJob(latestJob.id)
        appState.announceAria(`Retrying install for ${app.name}`)
      } else {
        await window.electronAPI.enqueueJob(app.id, 'install')
        appState.announceAria(`Started installation of ${app.name}`)
      }
    } else if (cardStatus === 'update_available') {
      await window.electronAPI.enqueueJob(app.id, 'upgrade')
      appState.announceAria(`Started update for ${app.name}`)
    } else {
      await window.electronAPI.enqueueJob(app.id, 'install')
      appState.announceAria(`Started installation of ${app.name}`)
    }
  })

  // Event: Card Click opens Details Drawer
  card.addEventListener('click', () => {
    appState.activeDrawerAppId = app.id
    appState.notify()
  })

  // Keyboard accessibility: Enter or Space opens drawer
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      appState.activeDrawerAppId = app.id
      appState.notify()
    }
  })

  return card
}
