/// <reference types="nuxt" />

import { seoData } from './data'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-30',
  components: true,
  modules: [
    'nuxt-icon',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@vueuse/nuxt',
    '@nuxtjs/robots',
    [
      '@nuxtjs/sitemap',
      {
        site: {
          // Reads from .env (localhost) or .env.production (production)
          // Nuxt automatically loads NUXT_PUBLIC_* vars from the appropriate .env file
          url: process.env.NUXT_PUBLIC_SITE_URL || seoData.mySite.replace(/\/$/, ''),
        },
        routes: ['/', '/rss.xml'],
      },
    ],
    'nuxt-og-image',
    [
      '@nuxt/content',
      {
        documentDriven: true,
        highlight: {
          theme: 'dracula',
        },
      },
    ],
    [
      '@nuxtjs/color-mode',
      {
        classSuffix: '',
        preference: 'dark',
        fallback: 'light',
      },
    ],
    '@nuxtjs/tailwindcss',
    '@formkit/auto-animate',
    '@stefanobartoletti/nuxt-social-share',
  ],

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width,initial-scale=1',
      title: seoData.title,
      titleTemplate: `%s - ${seoData.title}`,
      script: [
        {
          src: `https://maps.googleapis.com/maps/api/js?key=${process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`,
          async: true,
        },
        {
          src: `https://www.googletagmanager.com/gtag/js?id=${process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID}`,
          async: true,
        },
        {
          src: 'https://accounts.google.com/gsi/client',
          async: true,
          defer: true,
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },

  runtimeConfig: {
    public: {
      googleAnalytics: {
        id: process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID,
        debug: process.env.NODE_ENV !== 'production',
      },
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID,
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      apiBase: '/api',
    },
    databaseUrl: process.env.DATABASE_URL,
    // Email configuration (server-side only)
    resendApiKey: process.env.RESEND_API_KEY,
    alertEmail: process.env.ALERT_EMAIL,
    fromEmail: process.env.FROM_EMAIL,
  },

  typescript: {
    strict: true,
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/rss.xml'],
    },
    // Ensure environment variables are available to Nitro
    experimental: {
      wasm: true,
    },
  },
})
