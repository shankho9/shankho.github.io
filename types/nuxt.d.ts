// types/nuxt.d.ts
export {}

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    googleAnalytics: {
      id: string
      debug: boolean
    }
    apiBase: string
  }

  interface RuntimeConfig {
    databaseUrl: string
  }
}
