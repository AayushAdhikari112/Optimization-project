import { Catalog, CatalogApp, PresetBundle, Category, AppSafety, InstallScope } from './types'

const VALID_CATEGORIES: ReadonlySet<string> = new Set<Category>([
  'Browsers',
  'Media',
  'Utilities',
  'Development',
  'Gaming',
  'Communication',
  'Productivity',
  'Security',
])

const VALID_SAFETY: ReadonlySet<string> = new Set<AppSafety>(['safe', 'caution'])
const VALID_SCOPE: ReadonlySet<string> = new Set<InstallScope>(['user', 'machine', 'either'])

// Stricter winget ID pattern: alphanumeric, dots, hyphens, underscores, plus (no spaces, shell metachars)
export const WINGET_ID_REGEX = /^[A-Za-z0-9_+-]+(\.[A-Za-z0-9_+-]+)+$/

export interface ValidationResult<T> {
  valid: boolean
  data?: T
  errors: string[]
}

export function validateCatalogApp(input: unknown): ValidationResult<CatalogApp> {
  const errors: string[] = []
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['App entry must be an object'] }
  }

  const raw = input as Record<string, unknown>

  if (typeof raw.id !== 'string' || !WINGET_ID_REGEX.test(raw.id)) {
    errors.push(`Invalid or malformed package ID: "${raw.id}"`)
  }

  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    errors.push('App "name" must be a non-empty string')
  }

  if (typeof raw.publisher !== 'string' || raw.publisher.trim().length === 0) {
    errors.push('App "publisher" must be a non-empty string')
  }

  if (typeof raw.description !== 'string' || raw.description.trim().length === 0) {
    errors.push('App "description" must be a non-empty string')
  }

  if (typeof raw.category !== 'string' || !VALID_CATEGORIES.has(raw.category)) {
    errors.push(`Invalid category: "${raw.category}"`)
  }

  if (!Array.isArray(raw.tags) || !raw.tags.every(t => typeof t === 'string')) {
    errors.push('App "tags" must be an array of strings')
  }

  if (typeof raw.website !== 'string' || !/^https?:\/\//i.test(raw.website)) {
    errors.push('App "website" must be a valid HTTP/HTTPS URL')
  }

  if (typeof raw.icon !== 'string' || raw.icon.trim().length === 0) {
    errors.push('App "icon" must be a non-empty string or data URI')
  }

  if (typeof raw.safety !== 'string' || !VALID_SAFETY.has(raw.safety)) {
    errors.push(`App "safety" must be "safe" or "caution", got "${raw.safety}"`)
  }

  if (typeof raw.installScope !== 'string' || !VALID_SCOPE.has(raw.installScope)) {
    errors.push(`App "installScope" must be "user", "machine", or "either", got "${raw.installScope}"`)
  }

  let cleanFallback: CatalogApp['fallbackDownload'] = undefined
  if (raw.fallbackDownload !== undefined && raw.fallbackDownload !== null) {
    if (typeof raw.fallbackDownload !== 'object') {
      errors.push('fallbackDownload must be an object if present')
    } else {
      const fb = raw.fallbackDownload as Record<string, unknown>
      if (typeof fb.url !== 'string' || !/^https:\/\//i.test(fb.url)) {
        errors.push('fallbackDownload.url must be an HTTPS URL')
      }
      if (typeof fb.sha256 !== 'string' || !/^[a-fA-F0-9]{64}$/.test(fb.sha256)) {
        errors.push('fallbackDownload.sha256 must be a 64-character hex string')
      }
      if (!Array.isArray(fb.silentArgs) || !fb.silentArgs.every(a => typeof a === 'string')) {
        errors.push('fallbackDownload.silentArgs must be an array of strings')
      }
      if (errors.length === 0) {
        cleanFallback = {
          url: fb.url as string,
          sha256: (fb.sha256 as string).toLowerCase(),
          silentArgs: [...(fb.silentArgs as string[])],
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const cleanApp: CatalogApp = {
    id: (raw.id as string).trim(),
    name: (raw.name as string).trim(),
    publisher: (raw.publisher as string).trim(),
    description: (raw.description as string).trim(),
    category: raw.category as Category,
    tags: (raw.tags as string[]).map(t => t.trim().toLowerCase()),
    website: (raw.website as string).trim(),
    icon: (raw.icon as string).trim(),
    safety: raw.safety as AppSafety,
    installScope: raw.installScope as InstallScope,
    ...(cleanFallback ? { fallbackDownload: cleanFallback } : {}),
  }

  return { valid: true, data: cleanApp, errors: [] }
}

export function validatePresetBundle(input: unknown): ValidationResult<PresetBundle> {
  const errors: string[] = []
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Preset bundle must be an object'] }
  }
  const raw = input as Record<string, unknown>

  if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
    errors.push('Bundle "id" must be a non-empty string')
  }
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    errors.push('Bundle "name" must be a non-empty string')
  }
  if (typeof raw.description !== 'string') {
    errors.push('Bundle "description" must be a string')
  }
  if (!Array.isArray(raw.appIds) || !raw.appIds.every(id => typeof id === 'string')) {
    errors.push('Bundle "appIds" must be an array of package ID strings')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      id: (raw.id as string).trim(),
      name: (raw.name as string).trim(),
      description: (raw.description as string).trim(),
      appIds: (raw.appIds as string[]).map(id => id.trim()),
    },
    errors: [],
  }
}

export function validateCatalog(input: unknown): ValidationResult<Catalog> {
  const errors: string[] = []
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Catalog root must be an object'] }
  }

  const raw = input as Record<string, unknown>
  if (typeof raw.version !== 'string') {
    errors.push('Catalog "version" must be a string')
  }

  if (!Array.isArray(raw.apps)) {
    return { valid: false, errors: ['Catalog "apps" must be an array'] }
  }

  const cleanApps: CatalogApp[] = []
  const seenIds = new Set<string>()

  raw.apps.forEach((appItem, index) => {
    const res = validateCatalogApp(appItem)
    if (!res.valid || !res.data) {
      errors.push(`App at index ${index} is invalid: ${res.errors.join('; ')}`)
    } else {
      if (seenIds.has(res.data.id.toLowerCase())) {
        errors.push(`Duplicate package ID detected: "${res.data.id}"`)
      } else {
        seenIds.add(res.data.id.toLowerCase())
        cleanApps.push(res.data)
      }
    }
  })

  const cleanBundles: PresetBundle[] = []
  if (Array.isArray(raw.bundles)) {
    raw.bundles.forEach((bundleItem, index) => {
      const res = validatePresetBundle(bundleItem)
      if (!res.valid || !res.data) {
        errors.push(`Bundle at index ${index} is invalid: ${res.errors.join('; ')}`)
      } else {
        cleanBundles.push(res.data)
      }
    })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      version: String(raw.version || '1.0.0'),
      lastUpdated: typeof raw.lastUpdated === 'string' ? raw.lastUpdated : new Date().toISOString(),
      bundles: cleanBundles,
      apps: cleanApps,
    },
    errors: [],
  }
}
