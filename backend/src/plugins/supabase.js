// backend/src/plugins/supabase.js
import fp from 'fastify-plugin'
import { supabase } from '../lib/supabase.js'

async function supabasePlugin(fastify) {
  fastify.decorate('supabase', supabase)
  fastify.decorateRequest('supabase', null)
  fastify.addHook('onRequest', async (request) => {
    request.supabase = supabase
  })
}

export default fp(supabasePlugin)
