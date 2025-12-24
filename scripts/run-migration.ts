#!/usr/bin/env tsx
/**
 * Run database migrations
 * Usage: npx tsx scripts/run-migration.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import pg from 'pg'

const { Pool } = pg

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'server/db/migrations/create_comments_table.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Running migration...')
    console.log('Migration file:', migrationPath)

    // Execute the migration
    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ Migration completed successfully!')
      console.log('✅ Comments table created with indexes')
    } finally {
      client.release()
    }

    // Verify the table was created
    const verifyClient = await pool.connect()
    try {
      const result = await verifyClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comments'
      `)
      
      if (result.rows.length > 0) {
        console.log('✅ Verification: comments table exists')
      } else {
        console.log('⚠️  Warning: Could not verify table creation')
      }
    } finally {
      verifyClient.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()

