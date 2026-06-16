// backend/src/routes/admin/overview.js
export default async function overviewAdmin(fastify) {
  // GET /admin/overview — aggregate stats across all installer's plants
  fastify.get('/overview', async (request) => {
    const today = new Date().toISOString().slice(0, 10)

    const { data: plants } = await request.supabase
      .from('plants')
      .select('id, name')
      .eq('installer_id', request.user.installerId)

    const plantIds = (plants || []).map((p) => p.id)

    if (plantIds.length === 0) {
      return { total_plants: 0, today_energy_kwh: 0, peak_power_kw: 0, total_all_time_kwh: 0 }
    }

    const { data: todayCache } = await request.supabase
      .from('production_cache')
      .select('energy_kwh, peak_power_kw')
      .in('plant_id', plantIds)
      .eq('date', today)

    const { data: allCache } = await request.supabase
      .from('production_cache')
      .select('energy_kwh')
      .in('plant_id', plantIds)

    const totalTodayKwh = (todayCache || []).reduce((sum, r) => sum + (r.energy_kwh || 0), 0)
    const peakPower = (todayCache || []).reduce((max, r) => Math.max(max, r.peak_power_kw || 0), 0)
    const totalAllTimeKwh = (allCache || []).reduce((sum, r) => sum + (r.energy_kwh || 0), 0)

    return {
      total_plants: plantIds.length,
      today_energy_kwh: Number(totalTodayKwh.toFixed(3)),
      peak_power_kw: Number(peakPower.toFixed(3)),
      total_all_time_kwh: Number(totalAllTimeKwh.toFixed(3)),
    }
  })
}
