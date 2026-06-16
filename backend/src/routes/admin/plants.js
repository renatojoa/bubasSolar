// backend/src/routes/admin/plants.js
export default async function plantsAdmin(fastify) {
  // GET /admin/plants — list all plants for this installer
  fastify.get('/plants', async (request) => {
    const { data } = await request.supabase
      .from('plants')
      .select('*')
      .eq('installer_id', request.user.installerId)

    return data || []
  })

  // POST /admin/plants — register a new plant
  fastify.post('/plants', async (request, reply) => {
    const { soliscloud_plant_id, name, capacity_kwp, city, state } = request.body
    if (!soliscloud_plant_id || !name) {
      return reply.code(400).send({ error: 'soliscloud_plant_id and name required' })
    }

    const { data, error } = await request.supabase
      .from('plants')
      .insert({
        installer_id: request.user.installerId,
        soliscloud_plant_id,
        name,
        capacity_kwp,
        city,
        state,
      })
      .select()
      .single()

    if (error) return reply.code(400).send({ error: error.message })
    return reply.code(201).send(data)
  })
}
