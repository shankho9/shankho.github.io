#!/usr/bin/env node
/**
 * Run OAuth providers migration
 * Adds columns for Apple, Outlook, and GitHub OAuth providers
 * Usage:
 *   Development: node scripts/migrations/run-oauth-providers-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-oauth-providers-migration.js
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
    const migrationPath = join(process.cwd(), 'server/db/migrations/add-oauth-providers.sql')

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
      console.log('✅ Added columns: apple_sub, outlook_id, github_id')
      console.log('✅ Created indexes for OAuth provider lookups')
    } finally {
      client.release()
    }

    // Verify the columns were added
    const verifyClient = await pool.connect()
    try {
      const columns = ['apple_sub', 'outlook_id', 'github_id', 'auth_provider']

      console.log('\n🔍 Verifying migration...')

      for (const column of columns) {
        const result = await verifyClient.query(
          `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'users'
            AND column_name = $1
          `,
          [column],
        )

        if (result.rows.length > 0) {
          const col = result.rows[0]
          console.log(`✅ Column ${column}: ${col.data_type} (nullable: ${col.is_nullable})`)
        } else {
          console.log(`⚠️  Warning: Could not verify ${column} column`)
        }
      }

      // Verify indexes
      console.log('\n🔍 Verifying indexes...')
      const indexResult = await verifyClient.query(
        `
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'users'
          AND indexname IN ('idx_users_apple_sub', 'idx_users_outlook_id', 'idx_users_github_id')
        `,
      )

      if (indexResult.rows.length > 0) {
        console.log(`✅ Found ${indexResult.rows.length} OAuth provider indexes:`)
        indexResult.rows.forEach((row) => {
          console.log(`   - ${row.indexname}`)
        })
      } else {
        console.log(
          '⚠️  Warning: Could not verify indexes (they may have been created with IF NOT EXISTS)',
        )
      }

      // Check auth_provider column type
      const authProviderResult = await verifyClient.query(
        `
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'auth_provider'
        `,
      )

      if (authProviderResult.rows.length > 0) {
        const dataType = authProviderResult.rows[0].data_type
        console.log(`\n📋 auth_provider column type: ${dataType}`)
        if (dataType === 'USER-DEFINED') {
          console.log('   ⚠️  Note: auth_provider is an enum type. Make sure it includes:')
          console.log('      email, google, apple, outlook, github')
        } else if (dataType === 'text' || dataType === 'character varying') {
          console.log('   ✅ auth_provider supports text values (good for OAuth providers)')
        }
      }
    } finally {
      verifyClient.release()
    }

    console.log('\n✅ Migration verification complete!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code === '42701') {
      console.error(
        "   Note: Columns might already exist. This is okay if you're re-running the migration.",
      )
    } else if (error.code === '42P07') {
      console.error(
        "   Note: Indexes might already exist. This is okay if you're re-running the migration.",
      )
    } else {
      console.error('   Error details:', error)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
