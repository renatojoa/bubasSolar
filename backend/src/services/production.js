// backend/src/services/production.js
import { supabase } from '../lib/supabase.js'

/** Apply contract percentage to a raw energy value */
export function applyPercentage(energyKwh, percentage) {
  if (energyKwh === null || energyKwh === undefined) return 0
  return Number(((energyKwh * percentage) / 100).toFixed(3))
}

/** Format a cache row by applying contract % */
export function formatDailyProduction(cacheRow, percentage) {
  return {
    date: cacheRow.date,
    energy_kwh: applyPercentage(cacheRow.energy_kwh, percentage),
    peak_power_kw: applyPercentage(cacheRow.peak_power_kw, percentage),
    percentage,
  }
}

/**
 * Get daily production for a contract on a specific date.
 * Falls back to zeros if no cache row exists yet.
 */
export async function getDailyProduction(contractId, date) {
  const { data: contract } = await supabase
    .from('contracts')
    .select('percentage, plant_id')
    .eq('id', contractId)
    .single()

  if (!contract) throw new Error('Contract not found')

  const { data: cache } = await supabase
    .from('production_cache')
    .select('date, energy_kwh, peak_power_kw')
    .eq('plant_id', contract.plant_id)
    .eq('date', date)
    .single()

  if (!cache) {
    return { date, energy_kwh: 0, peak_power_kw: 0, percentage: contract.percentage }
  }

  return formatDailyProduction(cache, contract.percentage)
}

/**
 * Get production for a date range for a contract.
 * Uses percentage_history to apply correct % for each date.
 */
export async function getRangeProduction(contractId, from, to) {
  const { data: contract } = await supabase
    .from('contracts')
    .select('percentage, plant_id, created_at')
    .eq('id', contractId)
    .single()

  if (!contract) throw new Error('Contract not found')

  const { data: rows } = await supabase
    .from('production_cache')
    .select('date, energy_kwh, peak_power_kw')
    .eq('plant_id', contract.plant_id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  // Fetch percentage history to apply correct % per date
  const { data: history } = await supabase
    .from('percentage_history')
    .select('percentage, changed_at')
    .eq('contract_id', contractId)
    .order('changed_at', { ascending: true })

  const getPercentageForDate = (dateStr) => {
    if (!history || history.length === 0) return contract.percentage
    // Walk history in reverse to find last change before or on this date
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].changed_at.slice(0, 10) <= dateStr) {
        return history[i].percentage
      }
    }
    return contract.percentage
  }

  return (rows || []).map((row) => ({
    ...formatDailyProduction(row, getPercentageForDate(row.date)),
  }))
}
