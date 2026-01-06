#!/usr/bin/env node
/**
 * Check and compare users table structure between localhost and production
 * Usage:
 *   Check localhost: node scripts/check-table-structure.js
 *   Check production: NODE_ENV=production node scripts/check-table-structure.js
 *   Compare both: node scripts/check-table-structure.js (requires DATABASE_URL_PROD in .env.production)
 */

const { existsSync } = require('fs')
const pg = require('pg')
const { Pool } = pg

// Load environment variables
const isProduction = process.env.NODE_ENV === 'production'

// Load local .env first and save the URL
let localDatabaseUrl = null
if (existsSync('.env')) {
  require('dotenv').config({ path: '.env' })
  localDatabaseUrl = process.env.DATABASE_URL
  console.log(`📄 Loaded local environment from: .env`)
} else {
  console.warn(`⚠️  Warning: .env not found. Using environment variables from system.`)
  localDatabaseUrl = process.env.DATABASE_URL
}

// Load production .env.production (for comparison or production mode)
let prodDatabaseUrl = null
if (existsSync('.env.production')) {
  // Save local DATABASE_URL before loading production env
  const savedLocalUrl = localDatabaseUrl || process.env.DATABASE_URL

  // Load production env - this will overwrite DATABASE_URL
  require('dotenv').config({ path: '.env.production' })

  // Get production URL - check DATABASE_URL_PROD first, then DATABASE_URL from .env.production
  // After loading .env.production, DATABASE_URL will contain the production URL
  prodDatabaseUrl = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL

  // Restore local URL for comparison (if we're in dev mode and we had a local URL)
  if (!isProduction && savedLocalUrl && savedLocalUrl !== prodDatabaseUrl) {
    process.env.DATABASE_URL = savedLocalUrl
  }

  console.log(`📄 Loaded production environment from: .env.production`)
  if (prodDatabaseUrl) {
    const maskedUrl = prodDatabaseUrl.replace(/:[^:@]+@/, ':****@')
    console.log(`   ✅ Found production DATABASE_URL: ${maskedUrl.substring(0, 50)}...`)
  } else {
    console.warn(`   ⚠️  No DATABASE_URL found in .env.production`)
    console.warn(`   Checked for: DATABASE_URL_PROD and DATABASE_URL`)
  }
} else {
  console.warn(`⚠️  Warning: .env.production not found.`)
  if (isProduction) {
    prodDatabaseUrl = process.env.DATABASE_URL
    if (prodDatabaseUrl) {
      console.log(
        `   Using DATABASE_URL from environment: ${prodDatabaseUrl.replace(/:[^:@]+@/, ':****@').substring(0, 50)}...`,
      )
    }
  }
}

async function checkTableStructure(databaseUrl, envName) {
  console.log(`\n=== Checking ${envName} ===`)
  console.log(
    `Database URL: ${databaseUrl ? databaseUrl.replace(/:[^:@]+@/, ':****@') : 'NOT SET'}`,
  )

  if (!databaseUrl) {
    console.error(`❌ DATABASE_URL not set for ${envName}`)
    return null
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    // Check if users table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `)

    if (!tableExists.rows[0].exists) {
      console.error(`❌ Users table does not exist in ${envName}`)
      return null
    }

    // Get table structure
    const structure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      ORDER BY ordinal_position
    `)

    // Get sequence information for id column
    let sequenceInfo = { sequence_name: null, last_value: null, max_id: null }
    try {
      const seqResult = await pool.query(`
        SELECT 
          pg_get_serial_sequence('users', 'id') as sequence_name
      `)

      if (seqResult.rows[0]?.sequence_name) {
        const seqName = seqResult.rows[0].sequence_name
        const seqData = await pool.query(`
          SELECT 
            last_value,
            (SELECT MAX(id) FROM users) as max_id
          FROM ${seqName}
        `)
        sequenceInfo = {
          sequence_name: seqName,
          last_value: seqData.rows[0]?.last_value || null,
          max_id: seqData.rows[0]?.max_id || null,
        }
      } else {
        // Try to get max ID even if sequence not found
        const maxIdResult = await pool.query(`SELECT MAX(id) as max_id FROM users`)
        sequenceInfo.max_id = maxIdResult.rows[0]?.max_id || null
      }
    } catch (seqError) {
      console.warn(`  ⚠️  Could not get sequence info: ${seqError.message}`)
      // Try to get max ID at least
      try {
        const maxIdResult = await pool.query(`SELECT MAX(id) as max_id FROM users`)
        sequenceInfo.max_id = maxIdResult.rows[0]?.max_id || null
      } catch {
        // Ignore
      }
    }

    // Get constraints
    const constraints = await pool.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
    `)

    const result = {
      envName,
      columns: structure.rows,
      sequence: sequenceInfo,
      constraints: constraints.rows,
    }

    console.log(`\n✅ Table Structure:`)
    structure.rows.forEach((col) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`,
      )
    })

    console.log(`\n✅ Sequence Info:`)
    console.log(`  - Sequence: ${result.sequence.sequence_name || 'NOT FOUND'}`)
    console.log(`  - Last Value: ${result.sequence.last_value || 'N/A'}`)
    console.log(`  - Max ID: ${result.sequence.max_id || 'N/A'}`)

    console.log(`\n✅ Constraints:`)
    constraints.rows.forEach((constraint) => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`)
    })

    return result
  } catch (error) {
    console.error(`❌ Error checking ${envName}:`, error.message)
    return null
  } finally {
    await pool.end()
  }
}

async function compareStructures(local, prod) {
  console.log(`\n=== Comparison ===`)

  if (!local || !prod) {
    console.error('❌ Cannot compare - missing data from one or both environments')
    return
  }

  // Compare columns
  const localColumns = new Map(local.columns.map((c) => [c.column_name, c]))
  const prodColumns = new Map(prod.columns.map((c) => [c.column_name, c]))

  console.log(`\n📊 Column Differences:`)
  const allColumnNames = new Set([...localColumns.keys(), ...prodColumns.keys()])

  let hasDifferences = false
  for (const colName of allColumnNames) {
    const localCol = localColumns.get(colName)
    const prodCol = prodColumns.get(colName)

    if (!localCol) {
      console.log(`  ⚠️  Column '${colName}' exists in PROD but not in LOCAL`)
      hasDifferences = true
    } else if (!prodCol) {
      console.log(`  ⚠️  Column '${colName}' exists in LOCAL but not in PROD`)
      hasDifferences = true
    } else {
      const localStr = `${localCol.data_type}${localCol.is_nullable === 'NO' ? ' NOT NULL' : ''}${localCol.column_default ? ` DEFAULT ${localCol.column_default}` : ''}`
      const prodStr = `${prodCol.data_type}${prodCol.is_nullable === 'NO' ? ' NOT NULL' : ''}${prodCol.column_default ? ` DEFAULT ${prodCol.column_default}` : ''}`

      if (localStr !== prodStr) {
        console.log(`  ⚠️  Column '${colName}' differs:`)
        console.log(`     LOCAL:  ${localStr}`)
        console.log(`     PROD:   ${prodStr}`)
        hasDifferences = true
      }
    }
  }

  // Compare sequences
  console.log(`\n📊 Sequence Differences:`)
  if (local.sequence.sequence_name !== prod.sequence.sequence_name) {
    console.log(`  ⚠️  Sequence names differ:`)
    console.log(`     LOCAL:  ${local.sequence.sequence_name || 'NOT FOUND'}`)
    console.log(`     PROD:   ${prod.sequence.sequence_name || 'NOT FOUND'}`)
    hasDifferences = true
  }

  if (!hasDifferences) {
    console.log(`  ✅ Structures match!`)
  } else {
    console.log(`\n⚠️  Differences found! This may cause the production error.`)
    console.log(`\n💡 Recommendation: Run the migration in production:`)
    console.log(`   npm run migrate:auth:prod`)
  }
}

async function main() {
  // Use the URLs we loaded
  const localUrl = localDatabaseUrl
  const prodUrl = prodDatabaseUrl

  console.log('🔍 Checking database table structures...')
  console.log(`\nEnvironment: ${isProduction ? 'production' : 'development'}`)

  let local = null
  let prod = null

  if (isProduction) {
    // If running in production mode, check production only
    if (prodUrl) {
      prod = await checkTableStructure(prodUrl, 'PRODUCTION')
    } else {
      console.error('\n❌ Production DATABASE_URL not found')
      console.error('   Please set DATABASE_URL in .env.production')
      process.exit(1)
    }
  } else {
    // Check localhost
    if (localUrl) {
      local = await checkTableStructure(localUrl, 'LOCALHOST')
    } else {
      console.error('\n❌ Localhost DATABASE_URL not found')
      console.error('   Please set DATABASE_URL in .env')
      process.exit(1)
    }

    // Also check production if we have a URL
    if (prodUrl) {
      prod = await checkTableStructure(prodUrl, 'PRODUCTION')
      if (prodUrl === localUrl) {
        console.log('\n⚠️  Note: Production DATABASE_URL is the same as localhost')
        console.log('   Both checks are using the same database')
      }
    } else {
      console.log('\n⚠️  Production DATABASE_URL not found in .env.production')
      console.log('   Set DATABASE_URL in .env.production to check production structure')
    }
  }

  if (local && prod) {
    await compareStructures(local, prod)
  } else if (prod) {
    console.log('\n✅ Production table structure check complete')
  } else if (local) {
    console.log('\n✅ Localhost table structure check complete')
  } else {
    console.log('\n⚠️  Could not check table structure - check database connections')
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
