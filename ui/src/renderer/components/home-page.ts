export function renderHomePage(container: HTMLElement): void {
  container.innerHTML = `
    <div class="placeholder-view-container" style="padding-top: 100px;">
      <div class="brand-logo" style="width: 56px; height: 56px; margin-bottom: 8px;" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </div>
      <h2 style="font-size: 24px; font-weight: 700;">OptiCore Home</h2>
      <p style="color: var(--text-muted); font-size: 14px; max-width: 420px; line-height: 1.5;">
        System telemetry, hardware health overview, and real-time activity dashboard will be available here.
      </p>
      <span class="subnav-tab-badge" style="font-size: 12px; padding: 4px 10px;">Placeholder</span>
    </div>
  `
}
