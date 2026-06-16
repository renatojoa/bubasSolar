// backend/src/index.js
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'

import authPlugin from './plugins/auth.js'
import supabasePlugin from './plugins/supabase.js'

import authRoutes from './routes/auth.js'
import contractsRoutes from './routes/contracts.js'
import productionRoutes from './routes/production.js'
import savingsRoutes from './routes/savings.js'
import plantRoutes from './routes/plant.js'
import reportsRoutes from './routes/reports.js'
import adminRoutes from './routes/admin/index.js'
import { startProductionCacheJob } from './jobs/production-cache.js'

const fastify = Fastify({ logger: true })

await fastify.register(cors, { origin: true })
await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' })
await fastify.register(authPlugin)
await fastify.register(supabasePlugin)

fastify.get('/health', async () => ({ status: 'ok' }))

fastify.register(authRoutes, { prefix: '/auth' })
fastify.register(contractsRoutes, { prefix: '/contracts' })
fastify.register(productionRoutes, { prefix: '/production' })
fastify.register(savingsRoutes, { prefix: '/savings' })
fastify.register(plantRoutes, { prefix: '/plant' })
fastify.register(reportsRoutes, { prefix: '/reports' })
fastify.register(adminRoutes, { prefix: '/admin' })

const port = Number(process.env.PORT) || 3000
await fastify.listen({ port, host: '0.0.0.0' })

startProductionCacheJob()
