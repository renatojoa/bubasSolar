// backend/tests/services/production.test.js
import { describe, it, expect, vi } from 'vitest'

// Mock supabase so the module can be imported without real env vars
vi.mock('../../src/lib/supabase.js', () => ({
  supabase: {},
}))

import { applyPercentage, formatDailyProduction } from '../../src/services/production.js'

describe('applyPercentage', () => {
  it('applies 30% to 100 kWh', () => {
    expect(applyPercentage(100, 30)).toBeCloseTo(30)
  })

  it('applies 40% to 150 kWh', () => {
    expect(applyPercentage(150, 40)).toBeCloseTo(60)
  })

  it('applies 100% returns full value', () => {
    expect(applyPercentage(50.5, 100)).toBeCloseTo(50.5)
  })

  it('handles null energy (no data yet)', () => {
    expect(applyPercentage(null, 30)).toBe(0)
  })

  it('handles undefined energy', () => {
    expect(applyPercentage(undefined, 30)).toBe(0)
  })

  it('rounds to 3 decimal places', () => {
    // 100/3 * 33.333 should give ~33.333
    const result = applyPercentage(100, 33.333)
    expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(3)
  })
})

describe('formatDailyProduction', () => {
  it('formats cache row for a contract at 30%', () => {
    const cacheRow = { date: '2026-06-16', energy_kwh: 120.5, peak_power_kw: 15.2 }
    const result = formatDailyProduction(cacheRow, 30)
    expect(result.date).toBe('2026-06-16')
    expect(result.energy_kwh).toBeCloseTo(36.15)
    expect(result.peak_power_kw).toBeCloseTo(4.56)
    expect(result.percentage).toBe(30)
  })

  it('preserves date field', () => {
    const cacheRow = { date: '2026-01-01', energy_kwh: 0, peak_power_kw: 0 }
    const result = formatDailyProduction(cacheRow, 50)
    expect(result.date).toBe('2026-01-01')
  })

  it('includes percentage in output', () => {
    const cacheRow = { date: '2026-06-16', energy_kwh: 100, peak_power_kw: 10 }
    const result = formatDailyProduction(cacheRow, 25)
    expect(result.percentage).toBe(25)
  })
})
