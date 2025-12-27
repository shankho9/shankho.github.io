#!/usr/bin/env node
/**
 * Script to hash admin password for secure storage
 * Usage: node scripts/admin/setup-admin-password.js <plain-password>
 * Output: Hashed password to use in ADMIN_PASSWORD_HASH environment variable
 */

const bcrypt = require('bcrypt')

const plainPassword = process.argv[2]

if (!plainPassword) {
  console.error('Usage: node scripts/admin/setup-admin-password.js <plain-password>')
  process.exit(1)
}

async function hashPassword() {
  try {
    const saltRounds = 12
    const hash = await bcrypt.hash(plainPassword, saltRounds)
    console.log('\n✅ Password hashed successfully!')
    console.log('\nAdd this to your .env file:')
    console.log(`ADMIN_PASSWORD_HASH=${hash}\n`)
    console.log('⚠️  Keep your plain password secure and do not commit it to version control.\n')
  } catch (error) {
    console.error('Error hashing password:', error)
    process.exit(1)
  }
}

hashPassword()
