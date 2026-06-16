// backend/src/routes/admin/index.js
import plantsAdmin from './plants.js'
import contractsAdmin from './contracts.js'
import overviewAdmin from './overview.js'

export default async function adminRoutes(fastify) {
  // All admin routes require admin JWT
  fastify.addHook('preHandler', fastify.authenticateAdmin)

  fastify.register(plantsAdmin)
  fastify.register(contractsAdmin)
  fastify.register(overviewAdmin)
}
