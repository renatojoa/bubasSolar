// backend/tests/services/soliscloud.test.js
import { describe, it, expect } from 'vitest'
import { buildAuthHeaders } from '../../src/services/soliscloud.js'

describe('buildAuthHeaders', () => {
  it('returns Authorization, Content-MD5, Date, Content-Type headers', () => {
    const headers = buildAuthHeaders('test-id', 'test-secret', '/v1/api/userStationList', '{}')
    expect(headers).toHaveProperty('Authorization')
    expect(headers).toHaveProperty('Content-MD5')
    expect(headers).toHaveProperty('Date')
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Authorization']).toMatch(/^API test-id:/)
  })

  it('Authorization format is "API {id}:{base64signature}"', () => {
    const headers = buildAuthHeaders('myid', 'mysecret', '/v1/api/stationDetail', '{"id":"123"}')
    const [scheme, credentials] = headers.Authorization.split(' ')
    expect(scheme).toBe('API')
    const [apiId, signature] = credentials.split(':')
    expect(apiId).toBe('myid')
    expect(signature.length).toBeGreaterThan(10)
  })

  it('same inputs produce same signature (deterministic given same date)', () => {
    // Mock Date to ensure determinism
    const originalDate = global.Date
    const mockDate = new Date('2026-06-16T12:00:00Z')
    global.Date = class extends Date {
      constructor(...args) { return args.length ? new originalDate(...args) : mockDate }
      toUTCString() { return mockDate.toUTCString() }
    }

    const h1 = buildAuthHeaders('id', 'secret', '/v1/api/test', '{"foo":"bar"}')
    const h2 = buildAuthHeaders('id', 'secret', '/v1/api/test', '{"foo":"bar"}')
    expect(h1.Authorization).toBe(h2.Authorization)

    global.Date = originalDate
  })

  it('different bodies produce different Content-MD5', () => {
    const h1 = buildAuthHeaders('id', 'secret', '/v1/api/test', '{"a":1}')
    const h2 = buildAuthHeaders('id', 'secret', '/v1/api/test', '{"a":2}')
    expect(h1['Content-MD5']).not.toBe(h2['Content-MD5'])
  })
})
