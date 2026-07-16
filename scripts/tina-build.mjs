import { execSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

function summarizeError(error) {
  const output = `${error?.stdout || ''}\n${error?.stderr || ''}\n${error?.message || ''}`
  const firstLine =
    output
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) || 'unknown Tina build error'
  return firstLine.slice(0, 200)
}

function isDevAdminHtml(htmlPath) {
  try {
    const html = readFileSync(htmlPath, 'utf8')
    return html.includes('localhost:4001') || html.includes('@vite/client')
  } catch {
    return false
  }
}

/** Drop leftover `tinacms dev` output so it never ships to production. */
function scrubDevAdmin() {
  const indexPath = join('public', 'admin', 'index.html')
  if (existsSync(indexPath) && isDevAdminHtml(indexPath)) {
    console.warn('[build] Removing Tina DEV admin (localhost:4001) before production build')
    rmSync(join('public', 'admin'), { recursive: true, force: true })
  }
}

/** Tina writes a nested .gitignore that can exclude admin assets on some hosts. */
function removeNestedGitignore() {
  const nestedIgnore = join('public', 'admin', '.gitignore')
  if (existsSync(nestedIgnore)) {
    unlinkSync(nestedIgnore)
    console.log('[build] Removed public/admin/.gitignore so admin assets deploy')
  }
}

function assertProductionAdmin() {
  const indexPath = join('public', 'admin', 'index.html')
  if (!existsSync(indexPath)) {
    throw new Error('tinacms build finished but public/admin/index.html is missing')
  }
  if (isDevAdminHtml(indexPath)) {
    throw new Error(
      'public/admin/index.html still looks like a tinacms DEV build (localhost:4001). Run tinacms build, not tinacms dev.',
    )
  }
}

const skipExplicit = process.env.SKIP_TINA_BUILD === '1' || process.env.SKIP_TINA_BUILD === 'true'
const hasTina = Boolean(process.env.TINA_TOKEN) && Boolean(process.env.NUXT_PUBLIC_TINA_CLIENT_ID)
// Fail the deploy when Tina is configured but the admin UI fails to build (Vercel + CI).
const strictBuild =
  process.env.TINA_BUILD_STRICT === '1' ||
  process.env.TINA_BUILD_STRICT === 'true' ||
  (hasTina && (process.env.VERCEL === '1' || process.env.CI === 'true'))
const branch = (process.env.TINA_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main').trim()

scrubDevAdmin()

if (skipExplicit) {
  console.warn('[build] Skipping tinacms build — SKIP_TINA_BUILD is set')
} else if (!hasTina) {
  console.warn(
    '[build] Skipping tinacms build — set TINA_TOKEN and NUXT_PUBLIC_TINA_CLIENT_ID to enable /admin',
  )
} else {
  try {
    console.log(`[build] Running tinacms build for branch "${branch}"...`)
    execSync('npx tinacms build', { stdio: 'pipe', encoding: 'utf8' })
    removeNestedGitignore()
    assertProductionAdmin()
    console.log('[build] Tina admin UI built at public/admin/index.html')
  } catch (error) {
    const output = `${error?.stdout || ''}\n${error?.stderr || ''}\n${error?.message || ''}`
    const branchNotOnCloud =
      output.includes('not on TinaCloud') || output.includes('Branch is not on TinaCloud')

    if (strictBuild) {
      if (error?.stdout) process.stdout.write(error.stdout)
      if (error?.stderr) process.stderr.write(error.stderr)
      throw error
    }

    console.warn(
      '[build] Tina build failed — continuing site deploy without /admin editor.',
      summarizeError(error),
      branchNotOnCloud ? '(branch not on TinaCloud)' : '',
    )
  }
}
