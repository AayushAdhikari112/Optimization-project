'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { CatalogLoader } = require('../dist/test-lib.cjs')

test('CatalogLoader builds allowlist and accepts registered catalog package IDs', () => {
  const loader = new CatalogLoader()
  const catalog = loader.getCatalog()

  assert.ok(catalog.apps.length >= 24, `Expected at least 24 apps in catalog, found ${catalog.apps.length}`)

  // Known catalog IDs must be allowed
  assert.equal(loader.isAllowedId('Mozilla.Firefox'), true)
  assert.equal(loader.isAllowedId('mozilla.firefox'), true) // Case-insensitive
  assert.equal(loader.isAllowedId('7zip.7zip'), true)
  assert.equal(loader.isAllowedId('Microsoft.VisualStudioCode'), true)
  assert.equal(loader.isAllowedId('Valve.Steam'), true)
})

test('CatalogLoader strictly rejects unauthorized or malicious package IDs', () => {
  const loader = new CatalogLoader()

  // Malicious / untrusted strings
  assert.equal(loader.isAllowedId('calc.exe'), false)
  assert.equal(loader.isAllowedId('../../system32/cmd.exe'), false)
  assert.equal(loader.isAllowedId('Mozilla.Firefox & calc.exe'), false)
  assert.equal(loader.isAllowedId('Unknown.Package.Random'), false)
  assert.equal(loader.isAllowedId(''), false)
  assert.equal(loader.isAllowedId(null), false)
  assert.equal(loader.isAllowedId(undefined), false)
})
