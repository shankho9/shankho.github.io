/**
 * Nuxt runtimeConfig values from nuxt.config are fixed at build time. CI builds without
 * production secrets bake empty strings. On Vercel, platform env vars are still available
 * at runtime via process.env — use this helper to read config with that fallback.
 */
export function envOrConfig(
  configValue: string | undefined,
  envKey: string,
  ...extraEnvKeys: string[]
): string {
  if (typeof configValue === 'string' && configValue.length > 0) {
    return configValue
  }

  for (const key of [envKey, ...extraEnvKeys]) {
    const val = process.env[key]
    if (val) return val
  }

  return ''
}
