'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { JobQueue, MockWinget, CatalogLoader, ConfigManager } = require('../dist/test-lib.cjs')

test('JobQueue enforces security allowlist on enqueue', () => {
  const mockWinget = new MockWinget()
  const loader = new CatalogLoader()
  const config = new ConfigManager()
  const queue = new JobQueue(mockWinget, loader, config)

  // Disallowed ID must throw
  assert.throws(() => {
    queue.enqueue('Unauthorized.Malicious.App')
  }, /Security Exception/)

  // Valid ID succeeds
  const job = queue.enqueue('Mozilla.Firefox')
  assert.equal(job.appId, 'Mozilla.Firefox')
  assert.equal(job.status, 'queued')
})

test('JobQueue executes jobs and respects concurrency limits', async () => {
  const mockWinget = new MockWinget()
  const loader = new CatalogLoader()
  const config = new ConfigManager()
  config.updateConfig({ maxConcurrentInstalls: 1 })

  const queue = new JobQueue(mockWinget, loader, config)

  const job1 = queue.enqueue('Mozilla.Firefox')
  const job2 = queue.enqueue('7zip.7zip')

  assert.equal(queue.getJobs().length, 2)

  // At 1200ms, job1 has completed and job2 is running (proving strictly 1 concurrent job)
  await new Promise(resolve => setTimeout(resolve, 1200))

  const midJob1 = queue.getJob(job1.id)
  const midJob2 = queue.getJob(job2.id)

  assert.equal(midJob1.status, 'completed')
  assert.equal(midJob2.status, 'running')

  // Wait for job2 to finish
  await new Promise(resolve => setTimeout(resolve, 1200))
  const finalJob2 = queue.getJob(job2.id)
  assert.equal(finalJob2.status, 'completed')
})

test('JobQueue supports cancelling queued and running jobs', async () => {
  const mockWinget = new MockWinget()
  mockWinget.simulateSlowForIds.add('valve.steam')

  const loader = new CatalogLoader()
  const config = new ConfigManager()
  const queue = new JobQueue(mockWinget, loader, config)

  const job = queue.enqueue('Valve.Steam')

  // Cancel immediately while running
  await new Promise(resolve => setTimeout(resolve, 250))
  const cancelled = await queue.cancel(job.id)

  assert.equal(cancelled, true)
  const updated = queue.getJob(job.id)
  assert.equal(updated.status, 'cancelled')
})

test('JobQueue supports retrying failed jobs', async () => {
  const mockWinget = new MockWinget()
  mockWinget.simulateFailureForIds.add('obsidian.obsidian')

  const loader = new CatalogLoader()
  const config = new ConfigManager()
  const queue = new JobQueue(mockWinget, loader, config)

  const job = queue.enqueue('Obsidian.Obsidian')

  // Wait for failure
  await new Promise(resolve => setTimeout(resolve, 1200))
  const failedJob = queue.getJob(job.id)
  assert.equal(failedJob.status, 'failed')

  // Remove failure simulation and retry
  mockWinget.simulateFailureForIds.delete('obsidian.obsidian')
  const retriedJob = queue.retry(job.id)
  assert.equal(retriedJob.status, 'queued')

  // Wait for retry completion
  await new Promise(resolve => setTimeout(resolve, 1200))
  const finalJob = queue.getJob(job.id)
  assert.equal(finalJob.status, 'completed')
})
