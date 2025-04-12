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
      charset: 'utf-16',
      viewport: 'width=device-width,initial-scale=1',
      title: seoData.title,
      titleTemplate: `%s - ${seoData.title}`,
      script: [
        {
          src: `https://maps.googleapis.com/maps/api/js?key=AIzaSyDUM6RMSGssBJBuFdjkloMQkj6OC-FWz5s&libraries=places`,
          async: true,
        },
        ...(import.meta.client
          ? [
              {
                src: `https://www.googletagmanager.com/gtag/js?id=${process.env.VUE_APP_GOOGLE_ANALYTICS_ID}`,
                async: true,
              },
              {
                // Inject inline Google Analytics script
                innerHTML: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.VUE_APP_GOOGLE_ANALYTICS_ID}');
                `,
                type: 'text/javascript',
                // Ensure it's injected as an inline script
                // The charset and innerHTML may not be used directly in the configuration, so use it like this.
                // Nuxt will handle it correctly.
              },
            ]
          : []),
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },

  runtimeConfig: {
    public: {
      googleAnalytics: {
        id: process.env.VUE_APP_GOOGLE_ANALYTICS_ID, // Dynamically load the ID based on environment
        debug: process.env.NODE_ENV !== 'production', // Enable debug mode in non-production environments
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
