import { query } from './db'

let ensurePromise: Promise<void> | null = null

/** Create admin_passcodes (and deps) if missing — safe to call on every admin-passcode request. */
export async function ensureAdminPasscodesTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((err) => {
      ensurePromise = null
      throw err
    })
  }
  await ensurePromise
}

async function runEnsure(): Promise<void> {
  const existing = await query<{ t: string | null }>(
    "SELECT to_regclass('public.admin_passcodes')::text AS t",
  )
  if (existing[0]?.t) {
    await fixUserIdTypeMismatchIfNeeded()
    return
  }

  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  const userCol = await query<{ data_type: string }>(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'`,
  )
  const idType = userCol[0]?.data_type ?? 'integer'
  const userIdSql = idType === 'integer' ? 'INTEGER' : 'TEXT'

  await query(`
    CREATE TABLE IF NOT EXISTS admin_passcodes (
      id SERIAL PRIMARY KEY,
      user_id ${userIdSql} NOT NULL UNIQUE,
      passcode_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    )
  `)

  try {
    await query(`
      ALTER TABLE admin_passcodes
      ADD CONSTRAINT admin_passcodes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('already exists')) throw error
  }

  await query(
    'CREATE INDEX IF NOT EXISTS idx_admin_passcodes_user_id ON admin_passcodes(user_id)',
  )
  await query(
    'CREATE INDEX IF NOT EXISTS idx_admin_passcodes_expires_at ON admin_passcodes(expires_at)',
  )
  await query('DROP TRIGGER IF EXISTS update_admin_passcodes_updated_at ON admin_passcodes')
  await query(`
    CREATE TRIGGER update_admin_passcodes_updated_at
    BEFORE UPDATE ON admin_passcodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `)
}

/** Drop admin_passcodes when user_id column type disagrees with users.id (legacy migrations). */
async function fixUserIdTypeMismatchIfNeeded(): Promise<void> {
  const rows = await query<{ users_type: string; passcodes_type: string }>(
    `SELECT
       u.data_type AS users_type,
       a.data_type AS passcodes_type
     FROM information_schema.columns u
     JOIN information_schema.columns a
       ON a.table_schema = 'public'
      AND a.table_name = 'admin_passcodes'
      AND a.column_name = 'user_id'
     WHERE u.table_schema = 'public'
       AND u.table_name = 'users'
       AND u.column_name = 'id'`,
  )
  if (rows.length === 0) return

  const { users_type, passcodes_type } = rows[0]
  const usersIsInt = users_type === 'integer'
  const passcodesIsInt = passcodes_type === 'integer'
  if (usersIsInt === passcodesIsInt) return

  await query('DROP TABLE admin_passcodes')
  ensurePromise = null
  await ensureAdminPasscodesTable()
}
