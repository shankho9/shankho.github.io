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
    '@nuxtjs/google-analytics',
    '@nuxtjs/robots',
    [
      '@nuxtjs/sitemap',
      {
        hostname: seoData.mySite,
        routes: ['/', '/rss.xml'],
        siteUrl: 'https://shankho-blogsite.vercel.app',
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
      ],
      // Google Analytics script loaded here conditionally for client-side only
      ...(process.client && {
        script: [
          {
            src: `https://www.googletagmanager.com/gtag/js?id=${process.env.VUE_APP_GOOGLE_ANALYTICS_ID}`,
            async: true,
          },
          {
            innerHTML: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.VUE_APP_GOOGLE_ANALYTICS_ID}');
            `,
            type: 'text/javascript',
            charset: 'utf-8',
          },
        ],
      }),
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
      apiBase: '/api',
    },
    databaseUrl: process.env.DATABASE_URL,
  },

  typescript: {
    strict: true,
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/rss.xml'],
    },
  },
})
