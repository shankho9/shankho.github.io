#!/usr/bin/env node
/**
 * Add search optimization indexes to car database tables
 * Usage:
 *   Development: node scripts/migrations/add-car-search-indexes.js
 *   Production: NODE_ENV=production node scripts/migrations/add-car-search-indexes.js
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

async function addIndexes() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set')
    console.error(`   Please set it in your ${envFile} file or environment`)
    console.error(`   Current environment: ${isProduction ? 'production' : 'development'}`)
    process.exit(1)
  }

  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`)

  // Remove quotes if present
  const cleanDatabaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')

  const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')

    console.log('\n📋 Adding search optimization indexes...')
    const migrationPath = join(process.cwd(), 'server/db/migrations/add_search_indexes.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ Indexes created successfully!')
      console.log('   - idx_car_manufacturers_name_lower')
      console.log('   - idx_car_models_name_lower')
      console.log('   - idx_car_variants_name_lower')
    } catch (error) {
      if (error.code === '42710') {
        console.log('ℹ️  Indexes already exist (this is okay)')
      } else {
        throw error
      }
    } finally {
      client.release()
    }

    // Verify indexes
    console.log('\n🔍 Verifying indexes...')
    const verifyClient = await pool.connect()
    try {
      const indexQuery = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename IN ('car_manufacturers', 'car_models', 'car_variants')
        AND indexname LIKE '%_lower'
        ORDER BY tablename, indexname
      `
      const indexes = await verifyClient.query(indexQuery)

      if (indexes.rows.length > 0) {
        console.log('✅ Found search indexes:')
        indexes.rows.forEach((idx) => console.log(`   - ${idx.indexname}`))
      } else {
        console.log('⚠️  No search indexes found')
      }
    } finally {
      verifyClient.release()
    }

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('   Error details:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

addIndexes()
