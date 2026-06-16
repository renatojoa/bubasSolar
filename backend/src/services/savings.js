// backend/src/services/savings.js
import { supabase } from '../lib/supabase.js'
import { applyPercentage } from './production.js'

const CO2_FACTOR_KG_PER_KWH = 0.617 // ANEEL Brazilian grid factor

export function calcSavings(energyKwh, tariffKwh) {
  return Number((energyKwh * tariffKwh).toFixed(2))
}

export function calcCO2(energyKwh) {
  return Number((energyKwh * CO2_FACTOR_KG_PER_KWH).toFixed(2))
}

export function calcPaybackMonths(investmentBrl, avgMonthlySavingsBrl) {
  if (!avgMonthlySavingsBrl || avgMonthlySavingsBrl <= 0) return null
  return Math.ceil(investmentBrl / avgMonthlySavingsBrl)
}

export async function getContractSavings(contractId) {
  const { data: contract } = await supabase
    .from('contracts')
    .select('percentage, plant_id, investment_brl, tariff_kwh, created_at')
    .eq('id', contractId)
    .single()

  if (!contract) throw new Error('Contract not found')

  // Get all production data since contract creation
  const { data: rows } = await supabase
    .from('production_cache')
    .select('date, energy_kwh')
    .eq('plant_id', contract.plant_id)
    .gte('date', contract.created_at.slice(0, 10))
    .order('date', { ascending: true })

  const totalEnergyKwh = (rows || []).reduce((sum, row) => {
    return sum + applyPercentage(row.energy_kwh, contract.percentage)
  }, 0)

  const totalSavedBrl = calcSavings(totalEnergyKwh, contract.tariff_kwh)
  const co2Kg = calcCO2(totalEnergyKwh)
  const treesEquivalent = Number((co2Kg / 21).toFixed(1))

  // Build monthly map for payback calculation
  const monthlyMap = {}
  for (const row of rows || []) {
    const month = row.date.slice(0, 7)
    const kwh = applyPercentage(row.energy_kwh, contract.percentage)
    monthlyMap[month] = (monthlyMap[month] || 0) + kwh
  }

  const monthlyValues = Object.values(monthlyMap)
  const avgMonthlySavingsBrl = monthlyValues.length
    ? calcSavings(
        monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length,
        contract.tariff_kwh
      )
    : 0

  const paybackMonths = calcPaybackMonths(contract.investment_brl, avgMonthlySavingsBrl)
  const paybackDate = paybackMonths
    ? new Date(Date.now() + paybackMonths * 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 7)
    : null

  return {
    investment_brl: contract.investment_brl,
    total_saved_brl: totalSavedBrl,
    total_energy_kwh: Number(totalEnergyKwh.toFixed(3)),
    payback_months_remaining: paybackMonths,
    estimated_payback_date: paybackDate,
    co2_kg: co2Kg,
    trees_equivalent: treesEquivalent,
    monthly_history: Object.entries(monthlyMap).map(([month, kwh]) => ({
      month,
      energy_kwh: Number(kwh.toFixed(3)),
      saved_brl: calcSavings(kwh, contract.tariff_kwh),
    })),
  }
}
