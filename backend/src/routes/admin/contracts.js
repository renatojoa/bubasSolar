// backend/src/routes/admin/contracts.js
import bcrypt from 'bcrypt'

export default async function contractsAdmin(fastify) {
  // POST /admin/users — create a new client user
  fastify.post('/users', async (request, reply) => {
    const { name, email, password, phone } = request.body
    if (!name || !email || !password) {
      return reply.code(400).send({ error: 'name, email, password required' })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const { data, error } = await request.supabase
      .from('users')
      .insert({
        installer_id: request.user.installerId,
        name,
        email: email.toLowerCase(),
        password_hash,
        phone,
      })
      .select('id, name, email, phone, created_at')
      .single()

    if (error) return reply.code(400).send({ error: error.message })
    return reply.code(201).send(data)
  })

  // GET /admin/users — list all users for this installer
  fastify.get('/users', async (request) => {
    const { data } = await request.supabase
      .from('users')
      .select('id, name, email, phone, created_at')
      .eq('installer_id', request.user.installerId)
      .order('created_at', { ascending: false })

    return data || []
  })

  // POST /admin/contracts — create a contract linking user to plant
  fastify.post('/contracts', async (request, reply) => {
    const { user_id, plant_id, name, percentage, investment_brl, tariff_kwh } = request.body
    if (!user_id || !plant_id || !name || !percentage || !investment_brl || !tariff_kwh) {
      return reply.code(400).send({ error: 'All fields required: user_id, plant_id, name, percentage, investment_brl, tariff_kwh' })
    }

    const { data, error } = await request.supabase
      .from('contracts')
      .insert({ user_id, plant_id, name, percentage, investment_brl, tariff_kwh })
      .select()
      .single()

    if (error) return reply.code(400).send({ error: error.message })
    return reply.code(201).send(data)
  })

  // GET /admin/contracts — list all contracts for this installer's plants
  fastify.get('/contracts', async (request) => {
    const { data } = await request.supabase
      .from('contracts')
      .select(`
        *,
        user:user_id (name, email),
        plant:plant_id (name, soliscloud_plant_id, installer_id)
      `)
      .eq('plant.installer_id', request.user.installerId)

    return data || []
  })

  // PUT /admin/contracts/:id/percentage — reajuste with audit history
  fastify.put('/contracts/:id/percentage', async (request, reply) => {
    const { id } = request.params
    const { percentage, tariff_kwh, reason } = request.body

    if (percentage === undefined && tariff_kwh === undefined) {
      return reply.code(400).send({ error: 'percentage or tariff_kwh required' })
    }

    const { data: current, error: fetchError } = await request.supabase
      .from('contracts')
      .select('percentage, tariff_kwh')
      .eq('id', id)
      .single()

    if (fetchError || !current) return reply.code(404).send({ error: 'Contract not found' })

    const newPercentage = percentage ?? current.percentage
    const newTariff = tariff_kwh ?? current.tariff_kwh

    // Save history entry before updating
    await request.supabase.from('percentage_history').insert({
      contract_id: id,
      percentage: newPercentage,
      tariff_kwh: newTariff,
      reason: reason || null,
    })

    const { data, error } = await request.supabase
      .from('contracts')
      .update({ percentage: newPercentage, tariff_kwh: newTariff })
      .eq('id', id)
      .select()
      .single()

    if (error) return reply.code(400).send({ error: error.message })
    return data
  })
}
