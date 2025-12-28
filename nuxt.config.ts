/// <reference types="nuxt" />

import { seoData } from './data'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-30',
  components: true,
  modules: [
    'nuxt-icon',
    '@nuxt/image',
    // @nuxt/fonts disabled - fonts loaded via Google Fonts link tag
    // '@nuxt/fonts',
    '@nuxt/eslint',
    '@vueuse/nuxt',
    '@nuxtjs/robots',
    [
      '@nuxtjs/sitemap',
      {
        site: {
          // Set production URL to override buildEnv auto-detection
          // Prevents localhost warnings during build
          url: (() => {
            const envUrl = process.env.NUXT_PUBLIC_SITE_URL
            const fallbackUrl = seoData.mySite.replace(/\/$/, '')
            const url = envUrl || fallbackUrl
            return url.includes('localhost') ? fallbackUrl : url
          })(),
        },
        routes: [
          '/',
          '/blogs',
          '/about',
          '/gallery',
          '/library',
          '/resources',
          '/personalSpace',
          '/categories',
          '/rss.xml',
        ],
        defaults: {
          changefreq: 'weekly',
          priority: 0.7,
          // lastmod is omitted - let each route specify its own lastmod based on actual content modification
          // Nuxt Content will automatically set lastmod for content-based routes
        },
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
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
        },
      ],
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
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || seoData.mySite.replace(/\/$/, ''),
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
    // Admin configuration (server-side only)
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
    admin2FASecret: process.env.ADMIN_2FA_SECRET,
  },

  typescript: {
    strict: true,
  },

  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/', '/rss.xml'],
      concurrency: 1,
    },
    experimental: {
      wasm: true,
    },
    minify: true,
    sourceMap: false,
  },
})
