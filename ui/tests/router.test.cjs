'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { Router } = require('../dist/test-lib.cjs')

test('Router highlights Maintenance for all #/maintenance/* sub-routes', () => {
  const router = new Router()

  assert.equal(router.getPrimaryNavId('#/maintenance'), 'maintenance')
  assert.equal(router.getPrimaryNavId('#/maintenance/software'), 'maintenance')
  assert.equal(router.getPrimaryNavId('#/maintenance/cleanup'), 'maintenance')
  assert.equal(router.getPrimaryNavId('#/maintenance/startup'), 'maintenance')
  assert.equal(router.getPrimaryNavId('#/maintenance/updates'), 'maintenance')
})

test('Router maps home and settings routes to their respective primary nav IDs', () => {
  const router = new Router()

  assert.equal(router.getPrimaryNavId('#/home'), 'home')
  assert.equal(router.getPrimaryNavId('#/settings'), 'settings')
})

test('Router redirects #/maintenance to #/maintenance/software by default', () => {
  const router = new Router()
  let notifiedRoute = ''
  router.onRouteChange(r => {
    notifiedRoute = r
  })

  router.navigate('#/maintenance')
  assert.equal(notifiedRoute, '#/maintenance/software')
  assert.equal(router.getCurrentRoute(), '#/maintenance/software')
})
