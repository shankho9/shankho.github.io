import { execSync } from 'node:child_process'

const hasTina = Boolean(process.env.TINA_TOKEN) && Boolean(process.env.NUXT_PUBLIC_TINA_CLIENT_ID)

if (hasTina) {
  execSync('npx tinacms build', { stdio: 'inherit' })
} else {
  console.warn(
    '[build] Skipping tinacms build — set TINA_TOKEN and NUXT_PUBLIC_TINA_CLIENT_ID to enable /admin',
  )
}
