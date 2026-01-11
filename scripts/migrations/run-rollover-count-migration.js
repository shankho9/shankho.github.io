#!/usr/bin/env node
/**
 * Run rollover_count database migration
 * This script adds rollover_count column to tasks table:
 * - Adds rollover_count INTEGER DEFAULT 0 column to tasks table
 * - Creates index on rollover_count for better query performance
 *
 * Usage:
 *   Development: node scripts/migrations/run-rollover-count-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-rollover-count-migration.js
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

  const client = await pool.connect()

  try {
    console.log('📦 Connecting to database...')

    await client.query('BEGIN')
    console.log('🔄 Starting transaction...')

    // Read the migration file
    console.log('\n📋 Running rollover_count migration...')
    const migrationPath = join(
      process.cwd(),
      'server/db/migrations/add_rollover_count_to_tasks.sql',
    )
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    try {
      await client.query(migrationSQL)
      console.log('✅ Migration completed: rollover_count column added to tasks table')
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️  Column already exists (this is okay)')
      } else {
        throw error
      }
    }

    await client.query('COMMIT')
    console.log('\n✅ All migrations completed successfully!')

    // Verify the migration
    console.log('\n🔍 Verifying migration...')
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name = 'rollover_count'
    `)

    if (verifyResult.rows.length === 1) {
      console.log('✅ Verification: rollover_count column exists in tasks table')
      console.log(`   Data type: ${verifyResult.rows[0].data_type}`)
      console.log(`   Default: ${verifyResult.rows[0].column_default || 'NULL'}`)
    } else {
      console.log('⚠️  Warning: Could not verify rollover_count column')
    }

    const indexResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'tasks' 
      AND indexname = 'idx_tasks_rollover_count'
    `)

    if (indexResult.rows.length > 0) {
      console.log('✅ Verification: idx_tasks_rollover_count index exists')
    } else {
      console.log('⚠️  Warning: Could not verify index')
    }

    console.log('\n🎉 Rollover count migration completed successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ Migration failed:', error.message)
    if (error.code) {
      console.error(`   Error code: ${error.code}`)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
