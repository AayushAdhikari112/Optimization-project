'use strict'

function calculateFreedBytes(before, after) {
    return Math.max(0, (after?.availableBytes || 0) - (before?.availableBytes || 0))
}

class CleanIntervalLimiter {
    constructor(intervalMs = 10000) {
        this.intervalMs = intervalMs
        this.lastRunAt = 0
    }

    canRun(now = Date.now()) {
        return now - this.lastRunAt >= this.intervalMs
    }

    markRun(now = Date.now()) {
        this.lastRunAt = now
    }
}

class AutoCleanPolicy {
    constructor({ sustainMs = 30000, cooldownMs = 300000 } = {}) {
        this.sustainMs = sustainMs
        this.cooldownMs = cooldownMs
        this.lowSince = null
        this.lastTriggeredAt = null
    }

    shouldTrigger(availableBytes, totalBytes, thresholdPercent = 15, now = Date.now()) {
        const availablePercent = totalBytes > 0 ? availableBytes / totalBytes * 100 : 100
        if (availablePercent >= thresholdPercent || totalBytes <= 0) {
            this.lowSince = null
            return false
        }
        if (this.lowSince === null) this.lowSince = now
        if (now - this.lowSince < this.sustainMs ||
            (this.lastTriggeredAt !== null && now - this.lastTriggeredAt < this.cooldownMs)) return false
        this.lastTriggeredAt = now
        this.lowSince = null
        return true
    }

    reset() {
        this.lowSince = null
    }
}

function privilegeFailureMessage(result) {
    const errors = (result?.perStep || []).map(step => step.error || '').join(' ')
    if (/STATUS_PRIVILEGE_NOT_HELD|not granted|ERROR_NOT_ALL_ASSIGNED/i.test(errors))
        return 'Required memory privileges were not granted. Restart as administrator and try again.'
    if (/STATUS_ACCESS_DENIED|access denied/i.test(errors))
        return 'Windows denied this memory operation. Check administrator access and try again.'
    return ''
}

function normalizeCleanResult(result) {
    if (!result || typeof result !== 'object') {
        return { success: false, perStep: [], error: 'The memory service did not return a result.' }
    }
    return { ...result, userMessage: privilegeFailureMessage(result) }
}

async function cleanWithService(service, options) {
    try {
        return normalizeCleanResult(await service.clean(options))
    } catch (error) {
        return { success: false, perStep: [], error: error?.message || 'Memory optimization failed.' }
    }
}

const helpers = { calculateFreedBytes, CleanIntervalLimiter, AutoCleanPolicy, privilegeFailureMessage, normalizeCleanResult, cleanWithService }
if (typeof module !== 'undefined' && module.exports) module.exports = helpers
if (typeof window !== 'undefined') window.MemoryOptimizationHelpers = helpers