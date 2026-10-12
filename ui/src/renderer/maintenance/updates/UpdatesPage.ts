export function renderUpdatesPage(container: HTMLElement): void {
  container.innerHTML = `
    <div class="placeholder-view-container">
      <div class="missing-winget-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--status-update);">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
      </div>
      <h2>Automated App Updates</h2>
      <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5;">
        Scan all installed software packages against official repository manifests and upgrade them with one click.
      </p>
      <span class="subnav-tab-badge" style="font-size: 12px; padding: 4px 10px;">Coming Soon</span>
    </div>
  `
}
