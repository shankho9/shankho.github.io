#!/usr/bin/env node
/**
 * Run task archival database migration
 * This script adds archival support to tasks:
 * - Adds deleted_at and is_archived columns to tasks table
 * - Creates tasks_archive table for storing archived tasks
 *
 * Usage:
 *   Development: node scripts/migrations/run-task-archival-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-task-archival-migration.js
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
    console.log('\n📋 Running task archival migration...')
    const migrationPath = join(process.cwd(), 'server/db/migrations/add_task_archival.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    try {
      await client.query(migrationSQL)
      console.log('✅ Migration completed: Task archival support added')
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️  Some columns/tables already exist (this is okay)')
      } else {
        throw error
      }
    }

    await client.query('COMMIT')
    console.log('\n✅ All migrations completed successfully!')

    // Verify the migrations
    console.log('\n🔍 Verifying migrations...')
    const verifyResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name IN ('deleted_at', 'is_archived')
      ORDER BY column_name
    `)

    if (verifyResult.rows.length === 2) {
      console.log('✅ Verification: deleted_at and is_archived columns exist in tasks table')
    } else {
      console.log('⚠️  Warning: Could not verify all columns')
      console.log(`   Found columns: ${verifyResult.rows.map((r) => r.column_name).join(', ')}`)
    }

    const archiveTableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks_archive'
    `)

    if (archiveTableResult.rows.length > 0) {
      console.log('✅ Verification: tasks_archive table exists')
    } else {
      console.log('⚠️  Warning: Could not verify tasks_archive table')
    }

    console.log('\n🎉 Task archival migration completed successfully!')
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
