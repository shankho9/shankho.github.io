#!/usr/bin/env node
/**
 * Run calculator templates table migration
 * Usage:
 *   Development: node scripts/migrations/run-calculator-templates-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-calculator-templates-migration.js
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

  // Remove quotes if present (sometimes .env files have quotes)
  const cleanDatabaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')

  const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')

    const client = await pool.connect()
    try {
      // Determine current state to make this script idempotent.
      const tableExistsRes = await client.query(`
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'calculator_templates'
        LIMIT 1
      `)
      const tableExists = tableExistsRes.rows.length > 0

      const columnExistsRes = await client.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'calculator_templates'
          AND column_name = 'calculator_key'
        LIMIT 1
      `)
      const calculatorKeyExists = columnExistsRes.rows.length > 0

      // If everything is already in place, we can exit early.
      if (tableExists && calculatorKeyExists) {
        console.log('✅ calculator_templates already up to date (calculator_key exists)')
        return
      }

      // Only run the "create" migration if the table doesn't exist.
      if (!tableExists) {
        // Ensure user_id type matches users.id in the current database.
        // Some environments use integer IDs, others use text/uuid.
        const usersIdTypeRes = await client.query(`
          SELECT data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'id'
          LIMIT 1
        `)
        const usersIdType = (usersIdTypeRes.rows[0]?.data_type || '').toLowerCase()

        console.log(`ℹ️  Detected users.id type: ${usersIdType || 'unknown'}`)

        if (usersIdType === 'integer' || usersIdType === 'bigint' || usersIdType === 'smallint') {
          const createPath = join(
            process.cwd(),
            'server/db/migrations/create_calculator_templates_table.sql',
          )
          const createSQL = readFileSync(createPath, 'utf-8')
          console.log('🚀 Running migration...')
          console.log('   Migration file:', createPath)
          await client.query(createSQL)
        } else if (
          usersIdType === 'text' ||
          usersIdType === 'uuid' ||
          usersIdType === 'character varying'
        ) {
          // Create a compatible version of the table for text/uuid user IDs.
          const createSQL = `
            CREATE TABLE IF NOT EXISTS calculator_templates (
              id SERIAL PRIMARY KEY,
              user_id ${usersIdType === 'uuid' ? 'UUID' : 'TEXT'} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              calculator_key TEXT NOT NULL DEFAULT 'car-lease',
              name VARCHAR(255) NOT NULL,
              description TEXT,
              template_data JSONB NOT NULL,
              is_default BOOLEAN DEFAULT false,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_calculator_templates_user_id ON calculator_templates(user_id);
            CREATE INDEX IF NOT EXISTS idx_calculator_templates_user_calc_key
              ON calculator_templates(user_id, calculator_key);
            CREATE INDEX IF NOT EXISTS idx_calculator_templates_user_default
              ON calculator_templates(user_id, calculator_key, is_default)
              WHERE is_default = true;

            CREATE OR REPLACE FUNCTION update_calculator_templates_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_trigger WHERE tgname = 'update_calculator_templates_updated_at'
              ) THEN
                CREATE TRIGGER update_calculator_templates_updated_at
                  BEFORE UPDATE ON calculator_templates
                  FOR EACH ROW
                  EXECUTE FUNCTION update_calculator_templates_updated_at();
              END IF;
            END;
            $$;

            CREATE OR REPLACE FUNCTION ensure_single_default_template()
            RETURNS TRIGGER AS $$
            BEGIN
              IF NEW.is_default = true THEN
                UPDATE calculator_templates
                SET is_default = false
                WHERE user_id = NEW.user_id
                  AND calculator_key = NEW.calculator_key
                  AND id != NEW.id
                  AND is_default = true;
              END IF;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_single_default_template_trigger'
              ) THEN
                CREATE TRIGGER ensure_single_default_template_trigger
                  BEFORE INSERT OR UPDATE ON calculator_templates
                  FOR EACH ROW
                  EXECUTE FUNCTION ensure_single_default_template();
              END IF;
            END;
            $$;
          `
          console.log('🚀 Running migration...')
          console.log('   Migration: create calculator_templates (text/uuid user_id)')
          await client.query(createSQL)
        } else {
          throw new Error(
            `Unsupported users.id data_type "${usersIdType}". Please update migration script.`,
          )
        }
      } else {
        console.log('ℹ️  calculator_templates exists - skipping create migration')
      }

      // Always try to apply calculator_key migration if missing.
      if (!calculatorKeyExists) {
        const keyPath = join(
          process.cwd(),
          'server/db/migrations/add_calculator_key_to_templates.sql',
        )
        const keySQL = readFileSync(keyPath, 'utf-8')
        console.log('🚀 Running migration...')
        console.log('   Migration file:', keyPath)
        await client.query(keySQL)
      }

      console.log('✅ Migrations completed successfully!')
      console.log('✅ Calculator templates table is up to date (calculator_key enabled)')
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
        AND table_name = 'calculator_templates'
      `)

      if (result.rows.length > 0) {
        console.log('✅ Verification: calculator_templates table exists')

        // Check indexes
        const indexResult = await verifyClient.query(`
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'calculator_templates'
        `)
        console.log(`✅ Found ${indexResult.rows.length} indexes on calculator_templates table`)

        // Check triggers
        const triggerResult = await verifyClient.query(`
          SELECT trigger_name 
          FROM information_schema.triggers 
          WHERE event_object_table = 'calculator_templates'
        `)
        console.log(`✅ Found ${triggerResult.rows.length} triggers on calculator_templates table`)
      } else {
        console.log('⚠️  Warning: Could not verify table creation')
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
    console.error('   Error details:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
