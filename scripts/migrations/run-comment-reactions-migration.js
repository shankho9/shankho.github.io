const { Pool } = require('pg')
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

// Load environment variables
const isProduction = process.env.NODE_ENV === 'production'
const envFile = isProduction ? '.env.production' : '.env'

if (existsSync(envFile)) {
  require('dotenv').config({ path: envFile })
  console.log(`📄 Loaded environment from: ${envFile}`)
} else {
  console.warn(`⚠️  Warning: ${envFile} not found. Using environment variables from system.`)
  require('dotenv').config()
}

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
    console.log('🔄 Running comment_reactions table migration...')

    const migrationPath = join(
      process.cwd(),
      'server/db/migrations/create_comment_reactions_table.sql',
    )
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Running migration...')
    console.log('   Migration file:', migrationPath)

    // Execute the migration
    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ Migration completed successfully!')
      console.log('✅ Comment reactions table created with indexes')
    } finally {
      client.release()
    }

    // Verify table exists
    const verifyClient = await pool.connect()
    try {
      const verifyResult = await verifyClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comment_reactions'
      `)

      if (verifyResult.rows.length > 0) {
        console.log('✅ Verification: comment_reactions table exists')

        // Check indexes
        const indexResult = await verifyClient.query(`
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'comment_reactions'
        `)

        console.log(`✅ Found ${indexResult.rows.length} indexes on comment_reactions table`)
      } else {
        console.error('❌ Verification failed: comment_reactions table not found')
        process.exit(1)
      }
    } finally {
      verifyClient.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code === '42P07') {
      console.error(
        "   Note: Table might already exist. This is okay if you're re-running the migration.",
      )
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
