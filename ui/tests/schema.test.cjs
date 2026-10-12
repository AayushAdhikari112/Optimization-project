'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { validateCatalog, validateCatalogApp, validatePresetBundle } = require('../dist/test-lib.cjs')

test('valid catalog structure passes validation', () => {
  const sample = {
    version: '1.0.0',
    bundles: [
      {
        id: 'bundle-test',
        name: 'Test Pack',
        description: 'Test pack description',
        appIds: ['Mozilla.Firefox', '7zip.7zip'],
      },
    ],
    apps: [
      {
        id: 'Mozilla.Firefox',
        name: 'Mozilla Firefox',
        publisher: 'Mozilla',
        description: 'Fast, private web browser.',
        category: 'Browsers',
        tags: ['browser'],
        website: 'https://mozilla.org',
        icon: 'https://mozilla.org/icon.png',
        safety: 'safe',
        installScope: 'either',
      },
    ],
  }

  const res = validateCatalog(sample)
  assert.equal(res.valid, true)
  assert.equal(res.errors.length, 0)
  assert.equal(res.data.apps.length, 1)
})

test('rejects invalid category', () => {
  const app = {
    id: 'Test.App',
    name: 'App',
    publisher: 'Pub',
    description: 'Desc',
    category: 'NonExistentCategory',
    tags: [],
    website: 'https://example.com',
    icon: 'icon',
    safety: 'safe',
    installScope: 'user',
  }
  const res = validateCatalogApp(app)
  assert.equal(res.valid, false)
  assert.match(res.errors[0], /Invalid category/i)
})

test('rejects malformed package IDs with shell characters or spaces', () => {
  const badId1 = {
    id: 'Bad App With Spaces',
    name: 'App',
    publisher: 'Pub',
    description: 'Desc',
    category: 'Utilities',
    tags: [],
    website: 'https://example.com',
    icon: 'icon',
    safety: 'safe',
    installScope: 'user',
  }
  assert.equal(validateCatalogApp(badId1).valid, false)

  const badId2 = {
    ...badId1,
    id: 'Evil;calc.exe',
  }
  assert.equal(validateCatalogApp(badId2).valid, false)

  const badId3 = {
    ...badId1,
    id: 'NoDotInId',
  }
  assert.equal(validateCatalogApp(badId3).valid, false)
})

test('validates fallbackDownload fields strictly', () => {
  const app = {
    id: 'Test.Fallback',
    name: 'Test',
    publisher: 'Pub',
    description: 'Desc',
    category: 'Utilities',
    tags: [],
    website: 'https://example.com',
    icon: 'icon',
    safety: 'safe',
    installScope: 'user',
    fallbackDownload: {
      url: 'http://insecure-http.com/app.exe', // Non-HTTPS
      sha256: 'invalid-hash',
      silentArgs: ['/S'],
    },
  }
  const res = validateCatalogApp(app)
  assert.equal(res.valid, false)
  assert.equal(res.errors.some(e => e.includes('HTTPS')), true)
  assert.equal(res.errors.some(e => e.includes('64-character hex')), true)
})

test('detects duplicate package IDs in catalog', () => {
  const catalog = {
    version: '1.0.0',
    apps: [
      {
        id: 'Mozilla.Firefox',
        name: 'Firefox 1',
        publisher: 'Mozilla',
        description: 'Desc',
        category: 'Browsers',
        tags: [],
        website: 'https://mozilla.org',
        icon: 'icon',
        safety: 'safe',
        installScope: 'either',
      },
      {
        id: 'mozilla.firefox', // Case-insensitive duplicate
        name: 'Firefox 2',
        publisher: 'Mozilla',
        description: 'Desc',
        category: 'Browsers',
        tags: [],
        website: 'https://mozilla.org',
        icon: 'icon',
        safety: 'safe',
        installScope: 'either',
      },
    ],
  }
  const res = validateCatalog(catalog)
  assert.equal(res.valid, false)
  assert.match(res.errors[0], /Duplicate package ID/i)
})
