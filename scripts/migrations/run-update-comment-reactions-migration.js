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
    console.log('🔄 Running comment_reactions update migration...')

    const migrationPath = join(
      process.cwd(),
      'server/db/migrations/update_comment_reactions_one_per_user.sql',
    )
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Running migration...')
    console.log('   Migration file:', migrationPath)

    // Execute the migration
    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ Migration completed successfully!')
      console.log('✅ Updated comment_reactions table:')
      console.log('   - Changed to one reaction per user per comment')
      console.log('   - Added user_name and user_picture columns')
    } finally {
      client.release()
    }

    // Verify the changes
    const verifyClient = await pool.connect()
    try {
      // Check unique constraint
      const constraintResult = await verifyClient.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'comment_reactions'
        AND constraint_type = 'UNIQUE'
      `)

      console.log(
        `✅ Found ${constraintResult.rows.length} unique constraint(s) on comment_reactions table`,
      )

      // Check columns
      const columnResult = await verifyClient.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'comment_reactions'
        AND column_name IN ('user_name', 'user_picture')
      `)

      if (columnResult.rows.length > 0) {
        console.log('✅ Verified new columns exist:')
        columnResult.rows.forEach((row) => {
          console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
        })
      }
    } finally {
      verifyClient.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code === '42P07') {
      console.error(
        "   Note: Constraint might already exist. This is okay if you're re-running the migration.",
      )
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
