// backend/src/routes/contracts.js
export default async function contractsRoutes(fastify) {
  // GET /contracts — list active contracts for the authenticated user
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { data } = await request.supabase
      .from('contracts')
      .select(`
        id, name, percentage, investment_brl, tariff_kwh, active, created_at,
        plant:plant_id (id, name, capacity_kwp, city, state, soliscloud_plant_id)
      `)
      .eq('user_id', request.user.userId)
      .eq('active', true)

    return data || []
  })
}
