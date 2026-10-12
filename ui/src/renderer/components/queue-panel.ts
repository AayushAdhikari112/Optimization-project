import { appState } from '../state/app-state'

export function renderQueuePanel(): void {
  const container = document.getElementById('queue-panel-root')
  if (!container) return

  if (!appState.isQueueOpen) {
    container.classList.add('hidden')
    container.setAttribute('aria-hidden', 'true')
    return
  }

  container.classList.remove('hidden')
  container.setAttribute('aria-hidden', 'false')

  const jobs = appState.jobs

  container.innerHTML = `
    <div class="queue-panel-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 600; font-size: 14px;">Installation Queue</span>
        <span class="nav-badge">${jobs.length}</span>
      </div>
      <button id="btn-close-queue-panel" class="drawer-close-btn" aria-label="Close Queue Panel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="queue-panel-body" role="region" aria-label="Active Jobs List">
      ${
        jobs.length === 0
          ? `
        <div style="text-align: center; padding: 32px 16px; color: var(--text-faint); font-size: 13px;">
          No active or recent installation jobs in the queue.
        </div>
      `
          : jobs
              .map(job => {
                const isRunning = job.status === 'running'
                const isQueued = job.status === 'queued'
                const isFailed = job.status === 'failed'
                const isCompleted = job.status === 'completed'
                const isCancelled = job.status === 'cancelled'

                let statusBadge = ''
                if (isRunning) statusBadge = `<span class="badge" style="background: rgba(14,165,233,0.15); color: var(--accent-primary);">Running</span>`
                else if (isQueued) statusBadge = `<span class="badge badge-category">Queued</span>`
                else if (isCompleted) statusBadge = `<span class="badge badge-safe">Completed</span>`
                else if (isFailed) statusBadge = `<span class="badge" style="background: rgba(239,68,68,0.15); color: var(--status-error);">Failed</span>`
                else if (isCancelled) statusBadge = `<span class="badge badge-category">Cancelled</span>`

                const hasRealPct = job.progress >= 0
                const pctWidth = hasRealPct ? `${job.progress}%` : '40%'
                const isIndeterminate = isRunning && !hasRealPct

                return `
              <div class="queue-job-item" id="job-item-${job.id}">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <div style="font-size: 13px; font-weight: 600;">${job.appName}</div>
                    <div style="font-size: 11px; color: var(--text-faint);">${job.appId}</div>
                  </div>
                  <div>${statusBadge}</div>
                </div>

                ${
                  isRunning || isQueued
                    ? `
                  <div class="job-progress-bar-bg" role="progressbar" aria-valuenow="${job.progress}" aria-valuemin="0" aria-valuemax="100">
                    <div
                      class="job-progress-bar-fill ${isIndeterminate ? 'indeterminate' : ''}"
                      style="width: ${pctWidth};"
                    ></div>
                  </div>
                `
                    : ''
                }

                ${
                  isFailed && job.error
                    ? `
                  <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid var(--status-error-border); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 12px;">
                    <div style="font-weight: 600; color: var(--status-error);">${job.error.message}</div>
                    ${job.error.suggestedFix ? `<div style="color: var(--text-muted); margin-top: 2px;">${job.error.suggestedFix}</div>` : ''}
                    <div style="display: flex; gap: 8px; margin-top: 6px;">
                      <button
                        class="btn-secondary btn-copy-details"
                        data-details="${escapeHtml(job.error.rawDetails || job.stdout.join('\n'))}"
                        style="padding: 3px 8px; font-size: 11px;"
                      >
                        Copy Details
                      </button>
                    </div>
                  </div>
                `
                    : ''
                }

                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 2px;">
                  <button
                    class="btn-secondary btn-toggle-logs"
                    data-job-id="${job.id}"
                    style="padding: 3px 8px; font-size: 11px; border: none; background: transparent; color: var(--text-muted);"
                  >
                    ▶ Show Log (${job.stdout.length} lines)
                  </button>

                  <div style="display: flex; gap: 6px;">
                    ${
                      isRunning || isQueued
                        ? `
                      <button
                        class="btn-secondary btn-cancel-job"
                        data-job-id="${job.id}"
                        style="padding: 3px 8px; font-size: 11px; color: var(--status-error);"
                      >
                        Cancel
                      </button>
                    `
                        : ''
                    }

                    ${
                      isFailed || isCancelled
                        ? `
                      <button
                        class="btn-secondary btn-retry-job"
                        data-job-id="${job.id}"
                        style="padding: 3px 8px; font-size: 11px;"
                      >
                        Retry
                      </button>
                    `
                        : ''
                    }
                  </div>
                </div>

                <div class="job-stdout-console hidden" id="logs-${job.id}">
                  ${escapeHtml(job.stdout.slice(-50).join('\n'))}
                </div>
              </div>
            `
              })
              .join('')
      }
    </div>
  `

  // Close queue button
  container.querySelector<HTMLButtonElement>('#btn-close-queue-panel')?.addEventListener('click', () => {
    appState.isQueueOpen = false
    appState.notify()
  })

  // Cancel job buttons
  container.querySelectorAll<HTMLButtonElement>('.btn-cancel-job').forEach(btn => {
    btn.addEventListener('click', async () => {
      const jobId = btn.dataset.jobId
      if (jobId && window.electronAPI) {
        btn.textContent = 'Stopping...'
        btn.disabled = true
        await window.electronAPI.cancelJob(jobId)
        appState.announceAria('Cancelled installation job')
      }
    })
  })

  // Retry job buttons
  container.querySelectorAll<HTMLButtonElement>('.btn-retry-job').forEach(btn => {
    btn.addEventListener('click', async () => {
      const jobId = btn.dataset.jobId
      if (jobId && window.electronAPI) {
        btn.textContent = 'Retrying...'
        btn.disabled = true
        await window.electronAPI.retryJob(jobId)
        appState.announceAria('Retried installation job')
      }
    })
  })

  // Toggle log viewer
  container.querySelectorAll<HTMLButtonElement>('.btn-toggle-logs').forEach(btn => {
    btn.addEventListener('click', () => {
      const jobId = btn.dataset.jobId
      const consoleEl = container.querySelector<HTMLElement>(`#logs-${jobId}`)
      if (consoleEl) {
        const isHidden = consoleEl.classList.contains('hidden')
        if (isHidden) {
          consoleEl.classList.remove('hidden')
          btn.textContent = `▼ Hide Log`
          consoleEl.scrollTop = consoleEl.scrollHeight
        } else {
          consoleEl.classList.add('hidden')
          btn.textContent = `▶ Show Log`
        }
      }
    })
  })

  // Copy details buttons
  container.querySelectorAll<HTMLButtonElement>('.btn-copy-details').forEach(btn => {
    btn.addEventListener('click', async () => {
      const details = btn.dataset.details || ''
      try {
        await navigator.clipboard.writeText(details)
        btn.textContent = 'Copied!'
        setTimeout(() => {
          btn.textContent = 'Copy Details'
        }, 2000)
      } catch (err) {
        console.error('Failed to copy to clipboard', err)
      }
    })
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
