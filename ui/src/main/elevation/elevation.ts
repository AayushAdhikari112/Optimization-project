import { exec, spawn } from 'node:child_process'
import { app } from 'electron'

export function checkIsAdmin(): Promise<boolean> {
  return new Promise(resolve => {
    if (process.platform !== 'win32') {
      resolve(true)
      return
    }
    // 'net session' exits with 0 if admin, 2 if access denied
    exec('net session', { windowsHide: true }, error => {
      resolve(!error)
    })
  })
}

export function relaunchAsAdmin(): void {
  if (process.platform !== 'win32') return
  const exe = process.execPath
  const args = process.argv.slice(1).map(arg => `"${arg.replace(/"/g, '`"')}"`).join(' ')
  const cmd = `Start-Process -FilePath "${exe}" -ArgumentList ${args ? `'${args}'` : "''"} -Verb RunAs`

  try {
    spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', cmd], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref()
    app.quit()
  } catch (err) {
    console.error('Failed to trigger elevated relaunch:', err)
  }
}
