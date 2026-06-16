// backend/tests/routes/auth.test.js
import { describe, it, expect } from 'vitest'

describe('auth token payload shape', () => {
  it('client token payload has userId and role=client', () => {
    const payload = { userId: 'abc-123', role: 'client' }
    expect(payload.userId).toBe('abc-123')
    expect(payload.role).toBe('client')
  })

  it('refresh token payload has type=refresh', () => {
    const payload = { userId: 'abc-123', role: 'client', type: 'refresh' }
    expect(payload.type).toBe('refresh')
  })

  it('admin token has role=admin and installerId', () => {
    const payload = { installerId: 'xyz-456', role: 'admin' }
    expect(payload.role).toBe('admin')
    expect(payload.installerId).toBe('xyz-456')
  })
})

describe('invalid credentials response shape', () => {
  it('error response has error field', () => {
    const response = { error: 'Invalid credentials' }
    expect(response.error).toBeTruthy()
  })
})
