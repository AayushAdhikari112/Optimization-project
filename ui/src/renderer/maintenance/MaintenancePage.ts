import { maintenanceRegistry } from './registry'
import { router } from '../router'

export function renderMaintenancePage(container: HTMLElement): void {
  const currentRoute = router.getCurrentRoute()

  // Match current route to module, default to software
  const activeModule = maintenanceRegistry.find(m => m.route === currentRoute) || maintenanceRegistry[0]

  container.innerHTML = `
    <div class="maintenance-container">
      <header class="maintenance-header">
        <h1 class="maintenance-header-title">System Maintenance</h1>
        <p class="maintenance-header-desc">Manage software, keep your apps up to date, and streamline Windows performance.</p>
        
        <nav class="subnav-tabs" role="tablist" aria-label="Maintenance Tools">
          ${maintenanceRegistry
            .map(m => {
              const isActive = m.id === activeModule.id
              return `
              <button
                class="subnav-tab-btn ${isActive ? 'active' : ''}"
                id="tab-${m.id}"
                role="tab"
                aria-selected="${isActive}"
                data-route="${m.route}"
              >
                ${m.icon}
                <span>${m.title}</span>
                ${!m.enabled ? `<span class="subnav-tab-badge">Soon</span>` : ''}
              </button>
            `
            })
            .join('')}
        </nav>
      </header>

      <section class="maintenance-module-viewport" id="maintenance-module-viewport" role="tabpanel" aria-labelledby="tab-${activeModule.id}">
        <!-- Rendered by active module -->
      </section>
    </div>
  `

  // Wire tab clicks
  const tabButtons = container.querySelectorAll<HTMLButtonElement>('.subnav-tab-btn')
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route
      if (route) {
        router.navigate(route)
      }
    })
  })

  // Mount module
  const viewport = container.querySelector<HTMLElement>('#maintenance-module-viewport')
  if (viewport) {
    activeModule.render(viewport)
  }
}
