/**
 * Migration script to remove estimated_time_minutes field from tasks table
 *
 * Usage:
 *   npm run migrate:remove-estimated-time
 *   npm run migrate:remove-estimated-time:prod
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function runMigration() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../../server/db/migrations/remove_estimated_time_from_tasks.sql',
    )
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('🔄 Running migration: remove_estimated_time_from_tasks.sql')
    console.log('📝 SQL:')
    console.log(migrationSQL)

    // Execute the migration
    await client.query(migrationSQL)

    await client.query('COMMIT')
    console.log('✅ estimated_time_minutes field removed from tasks table')

    // Verify the column was removed
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'estimated_time_minutes'
    `
    const result = await client.query(checkColumnQuery)

    if (result.rows.length === 0) {
      console.log('✅ Verification: estimated_time_minutes column does not exist in tasks table')
    } else {
      console.warn('⚠️  Warning: estimated_time_minutes column still exists in tasks table')
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
