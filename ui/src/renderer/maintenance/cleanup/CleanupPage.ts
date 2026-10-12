export function renderCleanupPage(container: HTMLElement): void {
  container.innerHTML = `
    <div class="placeholder-view-container">
      <div class="missing-winget-icon" style="background: rgba(14, 165, 233, 0.1); color: var(--accent-primary);">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </div>
      <h2>System Cleanup</h2>
      <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5;">
        Intelligent temporary cache scrubbing, thumbnail purge, and Windows update cleaner are currently in development.
      </p>
      <span class="subnav-tab-badge" style="font-size: 12px; padding: 4px 10px;">Coming Soon</span>
    </div>
  `
}
