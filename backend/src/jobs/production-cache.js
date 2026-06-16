// backend/src/jobs/production-cache.js
import cron from 'node-cron'
import { supabase } from '../lib/supabase.js'
import { getStationDailyEnergy, getStationDetail } from '../services/soliscloud.js'

async function refreshProductionCache() {
  const today = new Date().toISOString().slice(0, 10)
  const dateForSolis = today.replaceAll('-', '') // YYYYMMDD

  // Get all plants with their installer credentials
  const { data: plants, error } = await supabase
    .from('plants')
    .select(`
      id,
      soliscloud_plant_id,
      installer:installer_id (
        soliscloud_api_id,
        soliscloud_api_secret,
        soliscloud_api_url
      )
    `)

  if (error) {
    console.error('[cache-job] Failed to fetch plants:', error.message)
    return
  }

  for (const plant of plants || []) {
    try {
      const installer = plant.installer
      if (!installer?.soliscloud_api_id) {
        console.warn(`[cache-job] Plant ${plant.soliscloud_plant_id} has no API credentials, skipping`)
        continue
      }

      const dailyData = await getStationDailyEnergy(installer, plant.soliscloud_plant_id, dateForSolis)

      // SolisCloud response fields vary by firmware version
      const data = dailyData?.data || {}
      const energyKwh = data.energy ?? data.eToday ?? 0
      const peakPowerKw = data.peakPower ?? data.pac ?? 0

      await supabase
        .from('production_cache')
        .upsert(
          {
            plant_id: plant.id,
            date: today,
            energy_kwh: energyKwh,
            peak_power_kw: peakPowerKw,
            cached_at: new Date().toISOString(),
          },
          { onConflict: 'plant_id,date' }
        )

      console.log(`[cache-job] Updated plant ${plant.soliscloud_plant_id}: ${energyKwh} kWh`)
    } catch (err) {
      // Log but don't crash — other plants should still be processed
      console.error(`[cache-job] Failed for plant ${plant.soliscloud_plant_id}:`, err.message)
    }
  }
}

export function startProductionCacheJob() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', refreshProductionCache)
  // Also run immediately on startup to populate today's data
  refreshProductionCache()
  console.log('[cache-job] Production cache job started (every 5 min)')
}
