// backend/src/routes/savings.js
import { getContractSavings } from '../services/savings.js'

export default async function savingsRoutes(fastify) {
  // GET /savings?contract_id=uuid
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { contract_id } = request.query
    if (!contract_id) return reply.code(400).send({ error: 'contract_id required' })

    const { data: contract } = await request.supabase
      .from('contracts')
      .select('id')
      .eq('id', contract_id)
      .eq('user_id', request.user.userId)
      .single()

    if (!contract) return reply.code(403).send({ error: 'Forbidden' })

    return getContractSavings(contract_id)
  })
}
