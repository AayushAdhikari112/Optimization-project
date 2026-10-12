export function renderStartupPage(container: HTMLElement): void {
  container.innerHTML = `
    <div class="placeholder-view-container">
      <div class="missing-winget-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--status-installed);">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
        </svg>
      </div>
      <h2>Startup Applications Manager</h2>
      <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5;">
        Optimize Windows boot time by reviewing and toggling autorun apps and registry run keys safely.
      </p>
      <span class="subnav-tab-badge" style="font-size: 12px; padding: 4px 10px;">Coming Soon</span>
    </div>
  `
}
