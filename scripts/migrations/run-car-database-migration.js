#!/usr/bin/env node
/**
 * Run car database tables migration and seed data
 * Usage:
 *   Development: node scripts/migrations/run-car-database-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-car-database-migration.js
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

  // Remove quotes if present
  const cleanDatabaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')

  const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')

    // Step 1: Create tables
    console.log('\n📋 Step 1: Creating car database tables...')
    const migrationPath = join(process.cwd(), 'server/db/migrations/create_car_database_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ Tables created successfully!')
      console.log('   - car_manufacturers')
      console.log('   - car_models')
      console.log('   - car_variants')
    } finally {
      client.release()
    }

    // Step 2: Seed data
    console.log('\n📋 Step 2: Seeding car data...')
    const seedPath = join(process.cwd(), 'server/db/migrations/seed_car_database.sql')
    const seedSQL = readFileSync(seedPath, 'utf-8')

    const seedClient = await pool.connect()
    try {
      await seedClient.query(seedSQL)
      console.log('✅ Seed data inserted successfully!')
      console.log('   - 5 manufacturers')
      console.log('   - 10 car models')
      console.log('   - 20 car variants')
    } finally {
      seedClient.release()
    }

    // Step 3: Verify
    console.log('\n🔍 Verifying data...')
    const verifyClient = await pool.connect()
    try {
      const manufacturerCount = await verifyClient.query(
        'SELECT COUNT(*) as count FROM car_manufacturers',
      )
      const modelCount = await verifyClient.query('SELECT COUNT(*) as count FROM car_models')
      const variantCount = await verifyClient.query('SELECT COUNT(*) as count FROM car_variants')

      console.log(`✅ Manufacturers: ${manufacturerCount.rows[0].count}`)
      console.log(`✅ Car Models: ${modelCount.rows[0].count}`)
      console.log(`✅ Car Variants: ${variantCount.rows[0].count}`)

      // Show sample data
      const sampleManufacturers = await verifyClient.query(
        'SELECT name FROM car_manufacturers ORDER BY name LIMIT 5',
      )
      console.log('\n📊 Sample Manufacturers:')
      sampleManufacturers.rows.forEach((m) => console.log(`   - ${m.name}`))
    } finally {
      verifyClient.release()
    }

    console.log('\n✅ Migration and seeding completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code === '42P07') {
      console.error(
        "   Note: Tables might already exist. This is okay if you're re-running the migration.",
      )
    }
    console.error('   Error details:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
