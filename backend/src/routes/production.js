// backend/src/routes/production.js
import { getDailyProduction, getRangeProduction } from '../services/production.js'

export default async function productionRoutes(fastify) {
  // GET /production/daily?date=2026-06-16&contract_id=uuid
  fastify.get('/daily', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { date, contract_id } = request.query
    if (!contract_id) return reply.code(400).send({ error: 'contract_id required' })

    const targetDate = date || new Date().toISOString().slice(0, 10)

    // Verify contract belongs to authenticated user
    const { data: contract } = await request.supabase
      .from('contracts')
      .select('id')
      .eq('id', contract_id)
      .eq('user_id', request.user.userId)
      .single()

    if (!contract) return reply.code(403).send({ error: 'Forbidden' })

    return getDailyProduction(contract_id, targetDate)
  })

  // GET /production/range?from=2026-06-01&to=2026-06-16&contract_id=uuid
  fastify.get('/range', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { from, to, contract_id } = request.query
    if (!contract_id || !from || !to) {
      return reply.code(400).send({ error: 'from, to, and contract_id required' })
    }

    const { data: contract } = await request.supabase
      .from('contracts')
      .select('id')
      .eq('id', contract_id)
      .eq('user_id', request.user.userId)
      .single()

    if (!contract) return reply.code(403).send({ error: 'Forbidden' })

    return getRangeProduction(contract_id, from, to)
  })
}
