#!/usr/bin/env node
/**
 * Run all planner database migrations for production setup
 * This script runs:
 * 1. create_planner_tables.sql - Creates tasks and weekly_reviews tables
 * 2. add_theme_to_tasks.sql - Adds theme field to tasks table
 *
 * Usage:
 *   npm run migrate:planner:prod
 */

const { readFileSync, existsSync } = require('fs')
const { join } = require('path')
const pg = require('pg')

// Load environment variables from .env.production
const envFile = '.env.production'

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
    process.exit(1)
  }

  console.log('🌍 Running planner migrations for production')
  console.log(`📄 Using DATABASE_URL from ${envFile}`)

  // Remove quotes if present (sometimes .env files have quotes)
  const cleanDatabaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')

  const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  const client = await pool.connect()

  try {
    console.log('📦 Connecting to database...')

    await client.query('BEGIN')
    console.log('🔄 Starting transaction...')

    // Migration 1: Create planner tables
    console.log('\n📋 Migration 1: Creating planner tables (tasks, weekly_reviews)...')
    const migration1Path = join(process.cwd(), 'server/db/migrations/create_planner_tables.sql')
    const migration1SQL = readFileSync(migration1Path, 'utf-8')

    try {
      await client.query(migration1SQL)
      console.log('✅ Migration 1 completed: tasks and weekly_reviews tables created')
    } catch (error) {
      if (error.code === '42P07') {
        console.log('⚠️  Migration 1: Tables already exist (this is okay)')
      } else {
        throw error
      }
    }

    // Migration 2: Add theme field to tasks
    console.log('\n📋 Migration 2: Adding theme field to tasks table...')
    const migration2Path = join(process.cwd(), 'server/db/migrations/add_theme_to_tasks.sql')
    const migration2SQL = readFileSync(migration2Path, 'utf-8')

    try {
      await client.query(migration2SQL)
      console.log('✅ Migration 2 completed: theme field added to tasks table')
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️  Migration 2: Theme column already exists (this is okay)')
      } else {
        throw error
      }
    }

    await client.query('COMMIT')
    console.log('\n✅ All migrations completed successfully!')

    // Verify the migrations
    console.log('\n🔍 Verifying migrations...')
    const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tasks', 'weekly_reviews')
      ORDER BY table_name
    `)

    if (verifyResult.rows.length === 2) {
      console.log('✅ Verification: tasks and weekly_reviews tables exist')
    } else {
      console.log('⚠️  Warning: Could not verify all tables')
    }

    const themeResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'theme'
    `)

    if (themeResult.rows.length > 0) {
      console.log('✅ Verification: theme column exists in tasks table')
    } else {
      console.log('⚠️  Warning: Could not verify theme column')
    }

    console.log('\n🎉 Planner setup completed successfully!')
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
