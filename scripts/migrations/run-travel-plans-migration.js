#!/usr/bin/env node
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')
const { Pool } = require('pg')

const isProduction = process.env.NODE_ENV === 'production'
const envFile = isProduction ? '.env.production' : '.env'

if (existsSync(envFile)) {
  require('dotenv').config({ path: envFile })
}

async function run() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: url.trim().replace(/^["']|["']$/g, ''),
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  })

  const client = await pool.connect()
  try {
    const sql = readFileSync(
      join(process.cwd(), 'server/db/migrations/create_travel_plans_table.sql'),
      'utf-8',
    )
    await client.query(sql)
    console.log('✅ Travel plans table created')
  } catch (e) {
    console.error('❌ Migration failed:', e.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
