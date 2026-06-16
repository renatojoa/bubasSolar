// backend/src/routes/plant.js
import { getStationDetail } from '../services/soliscloud.js'

export default async function plantRoutes(fastify) {
  // GET /plant/status?contract_id=uuid
  fastify.get('/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { contract_id } = request.query
    if (!contract_id) return reply.code(400).send({ error: 'contract_id required' })

    const { data: contract } = await request.supabase
      .from('contracts')
      .select(`
        percentage,
        plant:plant_id (
          id, soliscloud_plant_id, name, capacity_kwp, city, state,
          installer:installer_id (soliscloud_api_id, soliscloud_api_secret, soliscloud_api_url)
        )
      `)
      .eq('id', contract_id)
      .eq('user_id', request.user.userId)
      .single()

    if (!contract) return reply.code(403).send({ error: 'Forbidden' })

    const plant = contract.plant
    const installer = plant.installer

    try {
      const detail = await getStationDetail(installer, plant.soliscloud_plant_id)
      const data = detail?.data || {}

      return {
        plant_name: plant.name,
        capacity_kwp: plant.capacity_kwp,
        city: plant.city,
        state: plant.state,
        status: data.state ?? 0,       // 0=normal, 1=offline, 2=alarm
        current_power_kw: Number(((data.power || 0) * contract.percentage / 100).toFixed(3)),
        today_energy_kwh: Number(((data.eToday || 0) * contract.percentage / 100).toFixed(3)),
        total_energy_kwh: Number(((data.eTotal || 0) * contract.percentage / 100).toFixed(3)),
      }
    } catch {
      return reply.code(502).send({ error: 'SolisCloud unreachable' })
    }
  })
}
