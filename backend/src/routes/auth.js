// backend/src/routes/auth.js
import bcrypt from 'bcrypt'

export default async function authRoutes(fastify) {
  // POST /auth/login — client login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body

    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password required' })
    }

    const { data: user, error } = await request.supabase
      .from('users')
      .select('id, name, email, password_hash')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !user) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const { data: contracts } = await request.supabase
      .from('contracts')
      .select('id, name, percentage, investment_brl, tariff_kwh, plant_id')
      .eq('user_id', user.id)
      .eq('active', true)

    const token = fastify.jwt.sign({ userId: user.id, role: 'client' })
    const refreshToken = fastify.jwt.sign(
      { userId: user.id, role: 'client', type: 'refresh' },
      { sign: { expiresIn: '7d' } }
    )

    return {
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
      contracts,
    }
  })

  // POST /auth/refresh — get new access token
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body
    if (!refreshToken) return reply.code(400).send({ error: 'refreshToken required' })

    try {
      const payload = fastify.jwt.verify(refreshToken)
      if (payload.type !== 'refresh') throw new Error('not a refresh token')
      const token = fastify.jwt.sign({ userId: payload.userId, role: payload.role })
      return { token }
    } catch {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' })
    }
  })

  // POST /auth/admin/login — installer login
  fastify.post('/admin/login', async (request, reply) => {
    const { email, password } = request.body
    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password required' })
    }

    const { data: installer, error } = await request.supabase
      .from('installers')
      .select('id, name, email, password_hash')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !installer) return reply.code(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, installer.password_hash)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const token = fastify.jwt.sign({ installerId: installer.id, role: 'admin' })
    return { token, installer: { id: installer.id, name: installer.name, email: installer.email } }
  })
}
