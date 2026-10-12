'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
    calculateFreedBytes,
    CleanIntervalLimiter,
    AutoCleanPolicy,
    cleanWithService,
} = require('../modules/js/memory-helpers.js')

test('freed bytes uses only a positive available-memory delta', () => {
    assert.equal(calculateFreedBytes({ availableBytes: 100 }, { availableBytes: 145 }), 45)
    assert.equal(calculateFreedBytes({ availableBytes: 145 }, { availableBytes: 100 }), 0)
})

test('clean interval limiter enforces the minimum delay', () => {
    const limiter = new CleanIntervalLimiter(10000)
    limiter.markRun(1000)
    assert.equal(limiter.canRun(10999), false)
    assert.equal(limiter.canRun(11000), true)
})

test('auto-clean requires sustained low memory and respects its cooldown', () => {
    const policy = new AutoCleanPolicy({ sustainMs: 30000, cooldownMs: 300000 })
    assert.equal(policy.shouldTrigger(10, 100, 15, 1000), false)
    assert.equal(policy.shouldTrigger(10, 100, 15, 30999), false)
    assert.equal(policy.shouldTrigger(10, 100, 15, 31000), true)
    assert.equal(policy.shouldTrigger(10, 100, 15, 60000), false)
    assert.equal(policy.shouldTrigger(10, 100, 15, 331000), true)
})

test('auto-clean low-memory timer resets after memory recovers', () => {
    const policy = new AutoCleanPolicy({ sustainMs: 30000, cooldownMs: 300000 })
    assert.equal(policy.shouldTrigger(10, 100, 15, 0), false)
    assert.equal(policy.shouldTrigger(20, 100, 15, 10000), false)
    assert.equal(policy.shouldTrigger(10, 100, 15, 20000), false)
    assert.equal(policy.shouldTrigger(10, 100, 15, 49999), false)
    assert.equal(policy.shouldTrigger(10, 100, 15, 50000), true)
})

test('privilege failures from the mocked native layer become clear UI errors', async () => {
    const result = await cleanWithService({
        clean: async () => ({
            success: false,
            perStep: [{ step: 'Enable privileges', status: 'failed', error: 'STATUS_PRIVILEGE_NOT_HELD' }],
        }),
    }, { modifiedList: true })
    assert.equal(result.success, false)
    assert.match(result.userMessage, /administrator/i)
})