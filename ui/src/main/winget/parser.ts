import { InstalledListEntry } from './types'

/**
 * Strips ANSI escape sequences, progress spinner characters, backspaces, and carriage returns
 */
export function stripAnsiAndNoise(input: string): string {
  if (!input) return ''
  return input
    // ANSI sequences
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    // Backspaces and carriage returns
    .replace(/[\b\r]/g, '')
    // Braille / spinner indicators like ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏
    .replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, '')
    // Clean up empty line noise
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/**
 * Parses progress percentage from stdout output
 * E.g. "34%", "  54.2% ", "[████████░░] 80%", "Downloading: 100%"
 * Returns number 0-100, or null if percentage could not be determined.
 */
export function parseProgressPercentage(chunk: string): number | null {
  if (!chunk) return null

  // Check for explicit percentage like " 45% " or "45.0%"
  const match = chunk.match(/(?:^|\s|\[|:)(100|\d{1,2}(?:\.\d+)?)%/i)
  if (match && match[1]) {
    const val = parseFloat(match[1])
    if (!isNaN(val) && val >= 0 && val <= 100) {
      return Math.round(val)
    }
  }

  // Check for download byte progress like "15.2 MB / 30.4 MB"
  const bytesMatch = chunk.match(/([\d.]+)\s*(?:MB|GB|KB)\s*\/\s*([\d.]+)\s*(MB|GB|KB)/i)
  if (bytesMatch && bytesMatch[1] && bytesMatch[2] && bytesMatch[3]) {
    const cur = parseFloat(bytesMatch[1])
    const total = parseFloat(bytesMatch[2])
    if (!isNaN(cur) && !isNaN(total) && total > 0) {
      const pct = Math.round((cur / total) * 100)
      return Math.min(Math.max(pct, 0), 100)
    }
  }

  return null
}

const PACKAGE_ID_PATTERN = /^[A-Za-z0-9_+-]+(\.[A-Za-z0-9_+-]+)+$/

/**
 * Parses the tabular output of `winget list`
 */
export function parseWingetList(output: string): Map<string, InstalledListEntry> {
  const result = new Map<string, InstalledListEntry>()
  if (!output) return result

  const lines = output.split(/\r?\n/)
  let startIndex = 0

  // Find separator line '---...' if present
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('Id') && line.includes('Version')) {
      startIndex = i + 1
      if (i + 1 < lines.length && /^-+/.test(lines[i + 1])) {
        startIndex = i + 2
      }
      break
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.trim().length === 0 || /^-+$/.test(line.trim())) continue

    const parts = line.trim().split(/\s{2,}/)
    let foundId = ''
    let foundVersion = 'Installed'
    let foundAvailable: string | undefined = undefined

    for (let pIdx = 0; pIdx < parts.length; pIdx++) {
      const part = parts[pIdx]
      if (PACKAGE_ID_PATTERN.test(part)) {
        foundId = part
        if (pIdx + 1 < parts.length) {
          foundVersion = parts[pIdx + 1]
        }
        if (pIdx + 2 < parts.length) {
          const avail = parts[pIdx + 2]
          if (avail && avail !== 'winget' && avail !== 'msstore' && avail !== '<root>') {
            foundAvailable = avail
          }
        }
        break
      } else {
        const sub = part.split(/\s+/)
        if (sub.length >= 2 && PACKAGE_ID_PATTERN.test(sub[0])) {
          foundId = sub[0]
          foundVersion = sub[1]
          if (pIdx + 1 < parts.length) {
            const avail = parts[pIdx + 1]
            if (avail && avail !== 'winget' && avail !== 'msstore' && avail !== '<root>') {
              foundAvailable = avail
            }
          }
          break
        }
      }
    }

    if (!foundId) {
      // Fallback word search
      const words = line.trim().split(/\s+/)
      const match = words.find(w => PACKAGE_ID_PATTERN.test(w))
      if (match) {
        foundId = match
        const idx = words.indexOf(match)
        if (idx + 1 < words.length) {
          foundVersion = words[idx + 1]
        }
      }
    }

    if (foundId && PACKAGE_ID_PATTERN.test(foundId)) {
      result.set(foundId.toLowerCase(), {
        installedVersion: foundVersion,
        availableVersion: foundAvailable,
      })
    }
  }

  return result
}
