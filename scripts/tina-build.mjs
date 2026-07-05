import { execSync } from 'node:child_process'

function summarizeError(error) {
  const output = `${error?.stdout || ''}\n${error?.stderr || ''}\n${error?.message || ''}`
  const firstLine =
    output
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) || 'unknown Tina build error'
  return firstLine.slice(0, 200)
}

const skipExplicit = process.env.SKIP_TINA_BUILD === '1' || process.env.SKIP_TINA_BUILD === 'true'
const strictBuild = process.env.TINA_BUILD_STRICT === '1'
const hasTina = Boolean(process.env.TINA_TOKEN) && Boolean(process.env.NUXT_PUBLIC_TINA_CLIENT_ID)
const branch = (process.env.TINA_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main').trim()

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
