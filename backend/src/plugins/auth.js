// backend/src/plugins/auth.js
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'

async function authPlugin(fastify) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  })

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  fastify.decorate('authenticateAdmin', async function (request, reply) {
    try {
      await request.jwtVerify()
      if (request.user.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden' })
      }
    } catch {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}

export default fp(authPlugin)
