'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { mapWingetExitCode } = require('../dist/test-lib.cjs')

test('maps already installed exit code and text', () => {
  const byCode = mapWingetExitCode(-1978335189, '', '')
  assert.equal(byCode.message, 'Already installed')
  assert.match(byCode.suggestedFix, /already present/i)

  const byText = mapWingetExitCode(1, 'Found existing package; already installed on system.', '')
  assert.equal(byText.message, 'Already installed')
})

test('maps no applicable upgrade exit code', () => {
  const res = mapWingetExitCode(-1978335188, '', '')
  assert.equal(res.message, 'Already up to date')
  assert.match(res.suggestedFix, /newest version/i)
})

test('maps package not found exit code and text', () => {
  const byCode = mapWingetExitCode(-1978335227, '', '')
  assert.equal(byCode.message, 'Package not found')

  const byText = mapWingetExitCode(-1, 'No package found matching input criteria.', '')
  assert.equal(byText.message, 'Package not found')
})

test('maps integrity hash mismatch exit code and text', () => {
  const byCode = mapWingetExitCode(-1978335226, '', '')
  assert.equal(byCode.message, 'Integrity hash mismatch')

  const byText = mapWingetExitCode(1, 'Installer hash does not match manifest checksum', '')
  assert.equal(byText.message, 'Integrity hash mismatch')
})

test('maps administrator rights required codes (0x8A150023, 740, 0x800702e4)', () => {
  const byCode = mapWingetExitCode(-1978335197, '', '')
  assert.equal(byCode.message, 'Administrator rights required')
  assert.match(byCode.suggestedFix, /administrator/i)

  const byElevationCode = mapWingetExitCode(740, '', '')
  assert.equal(byElevationCode.message, 'Administrator rights required')

  const byText = mapWingetExitCode(1, 'This operation requires administrator privileges to execute.', '')
  assert.equal(byText.message, 'Administrator rights required')
})

test('maps no internet connection error', () => {
  const byCode = mapWingetExitCode(-1978335207, '', '')
  assert.equal(byCode.message, 'No internet connection')
})

test('maps winget source unavailable error', () => {
  const byCode = mapWingetExitCode(-1978335217, '', '')
  assert.equal(byCode.message, 'Package source unavailable')
})

test('maps cancelled by user error (-1978335204)', () => {
  const byCode = mapWingetExitCode(-1978335204, '', '')
  assert.equal(byCode.message, 'Cancelled by user')
})

test('maps reboot required exit code (3010 / 0x80070bc2)', () => {
  const res = mapWingetExitCode(3010, '', '')
  assert.equal(res.message, 'Restart required')
})

test('maps installer failed (1603 / -1978335221)', () => {
  const byMsi = mapWingetExitCode(1603, '', '')
  assert.equal(byMsi.message, 'Installer failed')

  const byWinget = mapWingetExitCode(-1978335221, '', '')
  assert.equal(byWinget.message, 'Installer failed')
})

test('formats unknown error codes with readable hex string and copyable details', () => {
  const unknown = mapWingetExitCode(54321, 'Some weird internal error log', '')
  assert.match(unknown.message, /Installation failed \(0xD431\)/)
  assert.equal(unknown.code, 54321)
  assert.match(unknown.rawDetails, /0xD431/)
  assert.match(unknown.rawDetails, /Some weird internal error log/)
})
