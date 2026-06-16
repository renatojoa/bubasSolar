// backend/tests/services/savings.test.js
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/lib/supabase.js', () => ({ supabase: {} }))
vi.mock('../../src/services/production.js', () => ({
  applyPercentage: (energy, pct) => energy === null || energy === undefined ? 0 : Number(((energy * pct) / 100).toFixed(3)),
}))

import { calcSavings, calcCO2, calcPaybackMonths } from '../../src/services/savings.js'

describe('calcSavings', () => {
  it('calculates value generated from energy and tariff', () => {
    // 500 kWh at R$0.80/kWh = R$400
    expect(calcSavings(500, 0.80)).toBeCloseTo(400)
  })

  it('returns 0 for 0 energy', () => {
    expect(calcSavings(0, 0.80)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    const result = calcSavings(100, 0.8765)
    expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
  })
})

describe('calcCO2', () => {
  it('uses ANEEL factor of 0.617 kg/kWh', () => {
    // 1000 kWh → 617 kg CO2
    expect(calcCO2(1000)).toBeCloseTo(617)
  })

  it('returns 0 for 0 energy', () => {
    expect(calcCO2(0)).toBe(0)
  })
})

describe('calcPaybackMonths', () => {
  it('returns null if no monthly savings', () => {
    expect(calcPaybackMonths(10000, 0)).toBeNull()
  })

  it('returns null for negative savings', () => {
    expect(calcPaybackMonths(10000, -100)).toBeNull()
  })

  it('calculates months until investment recovered', () => {
    // R$10000 investment, R$500/month savings → 20 months
    expect(calcPaybackMonths(10000, 500)).toBe(20)
  })

  it('rounds up partial months', () => {
    // R$1000 / R$300 = 3.33 → ceil = 4
    expect(calcPaybackMonths(1000, 300)).toBe(4)
  })
})
