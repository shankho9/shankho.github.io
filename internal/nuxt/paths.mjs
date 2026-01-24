// Shim for Nuxt/Nitro internal import "#internal/nuxt/paths".
//
// Why this exists:
// In some runtimes (notably when executing `.nuxt/dist/server/server.mjs` directly),
// Node resolves "#internal/*" via the root package.json "imports" field.
// If that mapping is missing (or invalid), Node throws ERR_PACKAGE_IMPORT_NOT_DEFINED.
//
// Nuxt's canonical implementation reads from Nitro runtime config. For a safe fallback,
// we provide a minimal implementation that keeps server booting.
//
// This is intentionally tiny: the current generated server only needs `baseURL()`.

export function baseURL() {
  // Prefer explicitly provided env vars; otherwise default to '/'
  return (
    process.env.NUXT_APP_BASE_URL ||
    process.env.NITRO_APP_BASE_URL ||
    process.env.APP_BASE_URL ||
    '/'
  )
}
