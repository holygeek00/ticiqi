import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getNavigationDirectionFromKey,
  getNavigationDirectionFromSwipe,
} from './copyNavigation.js'

test('maps left and right swipes to previous and next copy', () => {
  assert.equal(getNavigationDirectionFromSwipe({ x: 200, y: 100 }, { x: 80, y: 110 }), 1)
  assert.equal(getNavigationDirectionFromSwipe({ x: 80, y: 100 }, { x: 200, y: 90 }), -1)
})

test('ignores short or mostly vertical gestures', () => {
  assert.equal(getNavigationDirectionFromSwipe({ x: 100, y: 100 }, { x: 75, y: 104 }), 0)
  assert.equal(getNavigationDirectionFromSwipe({ x: 100, y: 100 }, { x: 40, y: 220 }), 0)
})

test('supports browser-exposed volume and remote navigation keys', () => {
  assert.equal(getNavigationDirectionFromKey({ key: 'AudioVolumeUp' }), 1)
  assert.equal(getNavigationDirectionFromKey({ code: 'AudioVolumeDown' }), -1)
  assert.equal(getNavigationDirectionFromKey({ key: 'PageDown' }), 1)
  assert.equal(getNavigationDirectionFromKey({ key: 'Enter' }), 0)
})
