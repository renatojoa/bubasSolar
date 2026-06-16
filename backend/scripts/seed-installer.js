// backend/scripts/seed-installer.js
// Usage: node --env-file=.env scripts/seed-installer.js
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { supabase } from '../src/lib/supabase.js'

const INSTALLER = {
  name: process.env.INSTALLER_NAME || 'Minha Empresa Solar',
  email: process.env.INSTALLER_EMAIL || 'admin@minhaempresa.com',
  password: process.env.INSTALLER_PASSWORD || 'trocar-essa-senha-123',
  soliscloud_api_id: process.env.SOLIS_API_ID || '',
  soliscloud_api_secret: process.env.SOLIS_API_SECRET || '',
  soliscloud_api_url: process.env.SOLIS_API_URL || 'https://www.soliscloud.com:13333',
}

console.log(`Creating installer: ${INSTALLER.email}`)

const password_hash = await bcrypt.hash(INSTALLER.password, 12)

const { data, error } = await supabase
  .from('installers')
  .insert({
    name: INSTALLER.name,
    email: INSTALLER.email.toLowerCase(),
    password_hash,
    soliscloud_api_id: INSTALLER.soliscloud_api_id,
    soliscloud_api_secret: INSTALLER.soliscloud_api_secret,
    soliscloud_api_url: INSTALLER.soliscloud_api_url,
  })
  .select('id, email, name')
  .single()

if (error) {
  console.error('Error creating installer:', error.message)
  process.exit(1)
}

console.log('✓ Installer created:', data)
console.log(`  Login: ${INSTALLER.email}`)
console.log(`  Password: ${INSTALLER.password}`)
console.log('  (Change the password after first login)')
