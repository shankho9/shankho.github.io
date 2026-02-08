#!/usr/bin/env node
/**
 * Run all DB migrations in order. Use --recreate to DROP SCHEMA public CASCADE first
 * (destructive; recreates entire DB). Requires create_auth_tables etc. to exist.
 *
 * Usage:
 *   node scripts/migrations/run-all-migrations.cjs
 *   node scripts/migrations/run-all-migrations.cjs --recreate
 *   NODE_ENV=production node scripts/migrations/run-all-migrations.cjs
 *   NODE_ENV=production node scripts/migrations/run-all-migrations.cjs --recreate
 */

const { readFileSync, existsSync } = require('fs')
const { join } = require('path')
const { Pool } = require('pg')

const isProduction = process.env.NODE_ENV === 'production'
const envFile = isProduction ? '.env.production' : '.env'
const recreate = process.argv.includes('--recreate')

if (existsSync(envFile)) {
  require('dotenv').config({ path: envFile })
  console.log(`📄 Loaded ${envFile}`)
} else {
  console.warn(`⚠️  ${envFile} not found`)
}

const migrationsDir = join(process.cwd(), 'server/db/migrations')

const MIGRATION_ORDER = [
  'create_auth_tables.sql',
  'add_user_role.sql',
  'add-oauth-providers.sql',
  'update_auth_provider_constraint.sql',
  'create_planner_tables.sql',
  'add_theme_to_tasks.sql',
  'add_rollover_count_to_tasks.sql',
  'add_task_dependencies.sql',
  'add_task_archival.sql',
  'add_task_performance_indexes.sql',
  'create_comments_table.sql',
  'create_comment_reactions_table.sql',
  'update_comment_reactions_one_per_user.sql',
  'create_calculator_templates_table.sql',
  'add_calculator_key_to_templates.sql',
  'create_car_database_tables.sql',
  'seed_car_database.sql',
  'add_search_indexes.sql',
  'create_user_logins_table.sql',
  'create_page_visits_table.sql',
  'create_utility_access_config.sql',
  'add_utility_requires_passcode.sql',
  'add_locations_list_utility.sql',
  'create_admin_passcodes.sql',
  'create_travel_places.sql',
  'create_travel_plans_table.sql',
  'add_travel_planner_utility.sql',
]

async function run() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }

  console.log(`🌍 ${isProduction ? 'production' : 'development'}${recreate ? ' (recreate)' : ''}`)
  const pool = new Pool({
    connectionString: url.trim().replace(/^["']|["']$/g, ''),
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  })

  const client = await pool.connect()
  try {
    if (recreate) {
      console.log('🗑️  Dropping public schema…')
      await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
      await client.query(
        'GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;',
      )
    }

    console.log('📦 Running migrations…')
    const skipCodes = new Set(['42P07', '42710', '42701'])
    for (const name of MIGRATION_ORDER) {
      const p = join(migrationsDir, name)
      if (!existsSync(p)) {
        console.warn(`   ⚠️  Skip (missing): ${name}`)
        continue
      }
      const sql = readFileSync(p, 'utf-8')
      try {
        await client.query(sql)
        console.log(`   ✅ ${name}`)
      } catch (e) {
        const code = e.code || ''
        if (!recreate && skipCodes.has(code)) {
          console.warn(`   ⚠️  ${name}: ${e.message} (skipped)`)
          continue
        }
        console.error(`   ❌ ${name}: ${e.message}`)
        throw e
      }
    }
    console.log('✅ All migrations done')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
