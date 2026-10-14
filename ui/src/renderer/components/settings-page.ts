export function renderSettingsPage(container: HTMLElement): void {
  const categories = [
    { id: 'all', label: 'All', count: '10' },
    { id: 'general', label: 'General' },
    { id: 'safety', label: 'Safety & Backup' },
    { id: 'cleanup', label: 'Cleanup' },
    { id: 'scanning', label: 'Scanning' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'updates', label: 'Updates' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'data-reset', label: 'Data & Reset' },
  ]

  container.innerHTML = `
    <div class="settings-view-wrapper" style="padding: 24px; max-width: 1200px; margin: 0 auto;">
      <div class="section-hero" style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
        <div class="section-hero-icon" style="width: 48px; height: 48px; border-radius: 12px; background: color-mix(in srgb, var(--primary, #326b56) 15%, transparent); display: flex; align-items: center; justify-content: center; color: var(--primary, #326b56);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div>
          <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 4px 0;">Settings</h2>
          <p style="color: var(--text-muted, #718096); font-size: 13.5px; margin: 0;">Set how OptiCore looks and how system changes are handled on this device.</p>
        </div>
      </div>

      <!-- Settings Navigation Bar -->
      <div class="settings-nav-wrapper" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
        <nav class="settings-navbar" id="settingsNavBarTS" role="tablist" aria-label="Settings Categories" style="display: flex; align-items: center; gap: 6px; overflow-x: auto; padding: 6px; border-radius: 8px; background: var(--surface, #1e293b); border: 1px solid var(--border, #334155); max-width: 100%;">
          ${categories.map(c => `
            <button type="button" class="settings-nav-tab ${c.id === 'all' ? 'active' : ''}" data-tab="${c.id}" role="tab" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; border: 1px solid transparent; background: transparent; color: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap;">
              <span>${c.label}</span>
              ${c.count ? `<span class="tab-badge" style="font-size: 11px; padding: 1px 6px; border-radius: 10px; background: rgba(255,255,255,0.08);">${c.count}</span>` : ''}
            </button>
          `).join('')}
        </nav>
      </div>

      <div class="settings-content-placeholder" style="padding: 32px; background: var(--surface, #1e293b); border: 1px solid var(--border, #334155); border-radius: 8px;">
        <h3 id="activeCategoryTitle" style="font-size: 16px; margin: 0 0 8px 0;">All Settings</h3>
        <p style="color: var(--text-muted, #718096); font-size: 13.5px; margin: 0;">All 10 preference types are active and managed via OptiCore.</p>
      </div>
    </div>
  `

  const tabs = container.querySelectorAll('.settings-nav-tab')
  const title = container.querySelector('#activeCategoryTitle')
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      const cat = (tab as HTMLElement).dataset.tab || 'all'
      if (title) {
        title.textContent = `${tab.querySelector('span')?.textContent || 'Settings'}`
      }
    })
  })
}

