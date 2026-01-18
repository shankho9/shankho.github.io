#!/usr/bin/env node
/**
 * Update auth_provider check constraint to include all OAuth providers
 * This allows 'email', 'google', 'apple', 'outlook', and 'github' as valid values
 * Usage:
 *   Development: node scripts/migrations/update-auth-provider-constraint.js
 *   Production: NODE_ENV=production node scripts/migrations/update-auth-provider-constraint.js
 */

const { readFileSync, existsSync } = require('fs')
const { join } = require('path')
const pg = require('pg')

// Load environment variables
const isProduction = process.env.NODE_ENV === 'production'
const envFile = isProduction ? '.env.production' : '.env'

if (existsSync(envFile)) {
  require('dotenv').config({ path: envFile })
  console.log(`📄 Loaded environment from: ${envFile}`)
} else {
  console.warn(`⚠️  Warning: ${envFile} not found. Using environment variables from system.`)
}

const { Pool } = pg

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set')
    console.error(`   Please set it in your ${envFile} file or environment`)
    console.error(`   Current environment: ${isProduction ? 'production' : 'development'}`)
    process.exit(1)
  }

  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`)

  // Remove quotes if present (sometimes .env files have quotes)
  const cleanDatabaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')

  const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')

    // Read the migration file
    const migrationPath = join(
      process.cwd(),
      'server/db/migrations/update_auth_provider_constraint.sql',
    )

    if (!existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`)
      process.exit(1)
    }

    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Running migration...')
    console.log('   Migration file:', migrationPath)

    // Execute the migration
    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ Migration completed successfully!')
      console.log('✅ Updated constraint to allow: email, google, apple, outlook, github')
    } finally {
      client.release()
    }

    // Verify the constraint was updated
    const verifyClient = await pool.connect()
    try {
      console.log('\n🔍 Verifying constraint...')

      const constraintResult = await verifyClient.query(
        `
        SELECT 
          conname,
          pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint
        WHERE conname = 'users_auth_provider_check'
          AND conrelid = 'users'::regclass
        `,
      )

      if (constraintResult.rows.length > 0) {
        const constraint = constraintResult.rows[0]
        console.log(`✅ Constraint found: ${constraint.conname}`)
        console.log(`   Definition: ${constraint.constraint_definition}`)

        // Check if all providers are included
        const definition = constraint.constraint_definition.toLowerCase()
        const providers = ['email', 'google', 'apple', 'outlook', 'github']
        const missing = providers.filter((p) => !definition.includes(`'${p}'`))

        if (missing.length === 0) {
          console.log('✅ All OAuth providers are included in the constraint')
        } else {
          console.warn(`⚠️  Missing providers in constraint: ${missing.join(', ')}`)
        }
      } else {
        console.warn('⚠️  Warning: Could not find constraint users_auth_provider_check')
      }
    } finally {
      verifyClient.release()
    }

    console.log('\n✅ Migration verification complete!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('   Error details:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
