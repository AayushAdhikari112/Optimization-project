import { appState } from '../../state/app-state'
import { renderAppCard } from './components/card'
import { renderMissingWingetScreen } from './components/missing-winget'

export function renderSoftwarePage(container: HTMLElement): void {
  // 1. Check if winget is available
  if (appState.wingetDetection && !appState.wingetDetection.available) {
    renderMissingWingetScreen(container, appState.wingetDetection.reason)
    return
  }

  const catalog = appState.catalog
  const filteredApps = appState.getFilteredApps()
  const isDemoMode = appState.config?.demoMode
  const activeJobsCount = appState.jobs.filter(j => j.status === 'running' || j.status === 'queued').length

  container.innerHTML = `
    <div class="software-page-container">
      ${
        isDemoMode
          ? `
        <div class="banner-notice">
          <span>
            <strong>Demo Mode Active:</strong> Simulating Windows Package Manager operations with mock telemetry. No software will be modified on your system.
          </span>
          <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Simulation</span>
        </div>
      `
          : ''
      }

      <!-- Top Controls Bar -->
      <div class="software-controls-bar">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            id="software-search-input"
            class="search-input"
            placeholder="Search software by name, publisher, or tags..."
            value="${escapeHtml(appState.searchQuery)}"
            aria-label="Search software catalog"
          />
        </div>

        <div class="controls-right-actions">
          <label class="toggle-switch-wrapper" title="Install applications silently in the background without installer dialogs">
            <input
              type="checkbox"
              id="chk-silent-install"
              ${appState.config?.silentInstall ? 'checked' : ''}
              style="accent-color: var(--accent-primary); cursor: pointer;"
            />
            <span>Silent Install</span>
          </label>

          <select id="select-sort-by" class="sort-select" aria-label="Sort applications">
            <option value="name" ${appState.sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
            <option value="publisher" ${appState.sortBy === 'publisher' ? 'selected' : ''}>Sort by Publisher</option>
            <option value="category" ${appState.sortBy === 'category' ? 'selected' : ''}>Sort by Category</option>
            <option value="status" ${appState.sortBy === 'status' ? 'selected' : ''}>Sort by Status</option>
          </select>

          <button id="btn-refresh-status" class="btn-secondary" title="Refresh installed application statuses from winget">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>

          <button id="btn-open-queue" class="btn-secondary" aria-label="Open installation queue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Queue
            ${activeJobsCount > 0 ? `<span class="nav-badge" style="margin-left: 4px;">${activeJobsCount}</span>` : ''}
          </button>
        </div>
      </div>

      <!-- Split Layout: Filters Column + Cards Viewport -->
      <div class="software-content-split">
        <aside class="software-filter-sidebar" role="region" aria-label="Catalog Filters">
          <!-- Categories Filter -->
          <div>
            <h4 class="filter-section-title">Categories</h4>
            <ul class="filter-list">
              ${renderCategoryFilterItem('All', catalog ? catalog.apps.length : 0)}
              ${renderCategoryFilterItem('Browsers', countCategory('Browsers'))}
              ${renderCategoryFilterItem('Media', countCategory('Media'))}
              ${renderCategoryFilterItem('Utilities', countCategory('Utilities'))}
              ${renderCategoryFilterItem('Development', countCategory('Development'))}
              ${renderCategoryFilterItem('Gaming', countCategory('Gaming'))}
              ${renderCategoryFilterItem('Communication', countCategory('Communication'))}
              ${renderCategoryFilterItem('Productivity', countCategory('Productivity'))}
              ${renderCategoryFilterItem('Security', countCategory('Security'))}
            </ul>
          </div>

          <!-- Preset Bundles -->
          <div>
            <h4 class="filter-section-title">Preset Bundles</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${
                catalog?.bundles
                  .map(bundle => {
                    const isActive = appState.activeBundleId === bundle.id
                    return `
                    <div
                      class="bundle-card-item ${isActive ? 'active' : ''}"
                      data-bundle-id="${bundle.id}"
                      role="button"
                      tabindex="0"
                      aria-label="Select bundle: ${bundle.name}"
                      style="${isActive ? 'border-color: var(--accent-primary); background: rgba(14,165,233,0.1);' : ''}"
                    >
                      <div class="bundle-card-title">${bundle.name}</div>
                      <div class="bundle-card-desc">${bundle.description}</div>
                      <div style="font-size: 11px; color: var(--accent-primary); margin-top: 4px; font-weight: 500;">
                        ${bundle.appIds.length} curated apps
                      </div>
                    </div>
                  `
                  })
                  .join('') || ''
              }
            </div>
          </div>
        </aside>

        <!-- Right Side: Cards Grid -->
        <main class="software-cards-viewport" role="region" aria-label="Available Applications">
          ${
            filteredApps.length === 0
              ? `
            <div class="placeholder-view-container" style="padding-top: 60px;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-faint);">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <h3 style="font-size: 18px; font-weight: 600;">No matching software found</h3>
              <p style="color: var(--text-muted); font-size: 13px;">
                Try adjusting your search keywords or choosing a different category.
              </p>
              <button id="btn-reset-filters" class="btn-secondary" style="margin-top: 8px;">
                Reset Filters
              </button>
            </div>
          `
              : `
            <div class="catalog-cards-grid" id="catalog-cards-grid">
              <!-- App cards appended via DOM for event safety -->
            </div>
          `
          }
        </main>
      </div>
    </div>
  `

  // Mount App Cards
  const cardsGrid = container.querySelector<HTMLElement>('#catalog-cards-grid')
  if (cardsGrid) {
    for (const app of filteredApps) {
      cardsGrid.appendChild(renderAppCard(app))
    }
  }

  // Wire Search Input
  const searchInput = container.querySelector<HTMLInputElement>('#software-search-input')
  searchInput?.addEventListener('input', () => {
    appState.searchQuery = searchInput.value
    appState.notify()
  })

  // Wire Sort Select
  const sortSelect = container.querySelector<HTMLSelectElement>('#select-sort-by')
  sortSelect?.addEventListener('change', () => {
    appState.sortBy = sortSelect.value as 'name' | 'publisher' | 'category' | 'status'
    appState.notify()
  })

  // Wire Silent Install Toggle
  const silentToggle = container.querySelector<HTMLInputElement>('#chk-silent-install')
  silentToggle?.addEventListener('change', async () => {
    if (window.electronAPI) {
      const updated = await window.electronAPI.saveConfig({ silentInstall: silentToggle.checked })
      appState.config = updated
    }
  })

  // Wire Refresh Status Button
  const refreshBtn = container.querySelector<HTMLButtonElement>('#btn-refresh-status')
  refreshBtn?.addEventListener('click', async () => {
    if (refreshBtn) refreshBtn.textContent = 'Checking...'
    if (window.electronAPI && catalog) {
      const ids = catalog.apps.map(a => a.id)
      const res = await window.electronAPI.getInstalledStatus(ids)
      appState.installedStatus = res
      appState.announceAria('Refreshed application installation status')
      appState.notify()
    }
  })

  // Wire Queue Button
  container.querySelector<HTMLButtonElement>('#btn-open-queue')?.addEventListener('click', () => {
    appState.isQueueOpen = !appState.isQueueOpen
    appState.notify()
  })

  // Wire Reset Filters Button
  container.querySelector<HTMLButtonElement>('#btn-reset-filters')?.addEventListener('click', () => {
    appState.searchQuery = ''
    appState.selectedCategory = 'All'
    appState.activeBundleId = null
    appState.notify()
  })

  // Wire Category Buttons
  container.querySelectorAll<HTMLButtonElement>('.filter-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category || 'All'
      appState.selectedCategory = cat
      appState.activeBundleId = null
      appState.notify()
    })
  })

  // Wire Preset Bundle Cards
  container.querySelectorAll<HTMLElement>('.bundle-card-item').forEach(card => {
    card.addEventListener('click', () => {
      const bundleId = card.dataset.bundleId
      if (bundleId) {
        appState.selectBundle(bundleId)
      }
    })
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const bundleId = card.dataset.bundleId
        if (bundleId) {
          appState.selectBundle(bundleId)
        }
      }
    })
  })

  // Render bottom floating action bar
  renderActionBar()
}

function renderCategoryFilterItem(category: string, count: number): string {
  const isActive = appState.selectedCategory.toLowerCase() === category.toLowerCase()
  return `
    <li>
      <button
        class="filter-item-btn ${isActive ? 'active' : ''}"
        data-category="${category}"
        aria-selected="${isActive}"
      >
        <span>${category}</span>
        <span class="filter-count-badge">${count}</span>
      </button>
    </li>
  `
}

function countCategory(category: string): number {
  if (!appState.catalog) return 0
  return appState.catalog.apps.filter(a => a.category === category).length
}

function renderActionBar(): void {
  const container = document.getElementById('action-bar-root')
  if (!container) return

  const selectedCount = appState.selectedAppIds.size

  if (selectedCount === 0) {
    container.classList.add('hidden')
    container.innerHTML = ''
    return
  }

  container.classList.remove('hidden')
  const showRestorePrompt = selectedCount >= 3

  container.innerHTML = `
    <span class="action-bar-count-text">
      ${selectedCount} application${selectedCount === 1 ? '' : 's'} selected
    </span>

    ${
      showRestorePrompt
        ? `
      <label class="action-bar-batch-restore" title="Create a system restore point checkpoint before installing multiple applications">
        <input
          type="checkbox"
          id="chk-batch-restore"
          ${appState.createRestorePointBeforeBatch ? 'checked' : ''}
          style="accent-color: var(--accent-primary); cursor: pointer;"
        />
        <span>Create Restore Point</span>
      </label>
    `
        : ''
    }

    <div style="display: flex; gap: 8px;">
      <button id="btn-install-selected" class="btn-primary" style="padding: 6px 16px;">
        Install Selected (${selectedCount})
      </button>
      <button id="btn-clear-selection" class="btn-secondary" style="padding: 6px 12px;">
        Clear
      </button>
    </div>
  `

  // Wire batch restore checkpoint toggle
  const chkRestore = container.querySelector<HTMLInputElement>('#chk-batch-restore')
  chkRestore?.addEventListener('change', () => {
    appState.createRestorePointBeforeBatch = chkRestore.checked
  })

  // Wire Install Selected
  container.querySelector<HTMLButtonElement>('#btn-install-selected')?.addEventListener('click', async () => {
    if (!window.electronAPI) return

    // If restore point requested for batch
    if (showRestorePrompt && appState.createRestorePointBeforeBatch) {
      await window.electronAPI.createRestorePoint()
      appState.announceAria('System restore point requested.')
    }

    const idsToInstall = Array.from(appState.selectedAppIds)
    appState.announceAria(`Queuing ${idsToInstall.length} applications for installation`)

    for (const id of idsToInstall) {
      await window.electronAPI.enqueueJob(id, 'install')
    }

    appState.clearSelection()
    appState.isQueueOpen = true
    appState.notify()
  })

  // Wire Clear Selection
  container.querySelector<HTMLButtonElement>('#btn-clear-selection')?.addEventListener('click', () => {
    appState.clearSelection()
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
