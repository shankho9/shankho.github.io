// types/nuxt.d.ts
export {}

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    googleAnalytics: {
      id: string
      debug: boolean
    }
    googleClientId: string
    apiBase: string
  }

  interface RuntimeConfig {
    databaseUrl: string
  }
}
