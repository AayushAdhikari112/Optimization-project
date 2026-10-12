'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  stripAnsiAndNoise,
  parseProgressPercentage,
  parseWingetList,
} = require('../dist/test-lib.cjs')

test('stripAnsiAndNoise removes color codes, spinners, and carriage returns', () => {
  const dirty = '\x1B[32m✔ Installing\x1B[0m ⠋ Downloading \r\n\b\bComplete!'
  const cleaned = stripAnsiAndNoise(dirty)
  assert.equal(cleaned.includes('\x1B'), false)
  assert.equal(cleaned.includes('⠋'), false)
  assert.match(cleaned, /Installing/)
  assert.match(cleaned, /Complete!/)
})

test('parseProgressPercentage extracts integer percentage from various formats', () => {
  assert.equal(parseProgressPercentage('Downloading... 45%'), 45)
  assert.equal(parseProgressPercentage('[██████░░░░░░] 52.8% completed'), 53)
  assert.equal(parseProgressPercentage('100%'), 100)
  assert.equal(parseProgressPercentage('0%'), 0)
  assert.equal(parseProgressPercentage('15.0 MB / 30.0 MB (50%)'), 50)
  assert.equal(parseProgressPercentage('Random log line without numbers'), null)
})

test('parseProgressPercentage computes percentage from byte amounts when percent is missing', () => {
  assert.equal(parseProgressPercentage('Downloaded 25.0 MB / 100.0 MB'), 25)
  assert.equal(parseProgressPercentage('Transferred 500 KB / 1000 KB'), 50)
})

test('parseWingetList parses tabular winget list output correctly', () => {
  const sampleOutput = `
Name                  Id                      Version     Available   Source
----------------------------------------------------------------------------
Visual Studio Code    Microsoft.VisualStudioCode 1.95.0   1.95.1      winget
Mozilla Firefox       Mozilla.Firefox         132.0.1                 winget
Git for Windows       Git.Git                 2.47.0      <root>      winget
7-Zip                 7zip.7zip               24.08                   winget
`
  const result = parseWingetList(sampleOutput)

  assert.equal(result.has('microsoft.visualstudiocode'), true)
  assert.equal(result.get('microsoft.visualstudiocode').installedVersion, '1.95.0')
  assert.equal(result.get('microsoft.visualstudiocode').availableVersion, '1.95.1')

  assert.equal(result.has('mozilla.firefox'), true)
  assert.equal(result.get('mozilla.firefox').installedVersion, '132.0.1')
  assert.equal(result.get('mozilla.firefox').availableVersion, undefined)

  assert.equal(result.has('7zip.7zip'), true)
  assert.equal(result.get('7zip.7zip').installedVersion, '24.08')
})

test('parseWingetList handles empty or invalid output safely without crashing', () => {
  const empty = parseWingetList('')
  assert.equal(empty.size, 0)

  const nonTabular = parseWingetList('No packages found matching criteria.')
  assert.equal(nonTabular.size, 0)
})
