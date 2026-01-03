/// <reference types="nuxt" />

import { seoData } from './data'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-30',
  components: true,

  // Site configuration for nuxt-site-config (used by nuxt-og-image and other modules)
  // Use a simple string to avoid any undefined issues during module evaluation
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://shankho-blogsite.vercel.app',
    name: "Sid's Blog | Nomadic Notions",
  },

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
          // Use simple string to avoid any undefined issues during module evaluation
          url: process.env.NUXT_PUBLIC_SITE_URL || 'https://shankho-blogsite.vercel.app',
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
        {
          rel: 'preconnect',
          href: 'https://ik.imagekit.io',
          crossorigin: 'anonymous',
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
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://shankho-blogsite.vercel.app',
      googleAnalytics: {
        id: process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID,
        debug: process.env.NODE_ENV !== 'production',
      },
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID,
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      apiBase: '/api',
      // ImageKit public configuration (client-side accessible)
      imageKitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/u6cq4dqll',
      // ImageKit root folders (configurable)
      imageKitPhotosRootFolder: process.env.IMAGEKIT_PHOTOS_ROOT_FOLDER || 'Library/Photos',
      imageKitVideosRootFolder: process.env.IMAGEKIT_VIDEOS_ROOT_FOLDER || 'Library/Videos',
      // Notion database ID (client-side accessible for API calls)
      notionDatabaseId: process.env.NOTION_DATABASE_ID,
    },
    databaseUrl: process.env.DATABASE_URL,
    // Email configuration (server-side only)
    resendApiKey: process.env.RESEND_API_KEY,
    alertEmail: process.env.ALERT_EMAIL,
    fromEmail: process.env.FROM_EMAIL,
    // Admin configuration (server-side only)
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
    admin2FASecret: process.env.ADMIN_2FA_SECRET,
    // ImageKit configuration (server-side only)
    imageKitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    imageKitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    imageKitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/u6cq4dqll',
    // ImageKit root folders (server-side, same as public for consistency)
    imageKitPhotosRootFolder: process.env.IMAGEKIT_PHOTOS_ROOT_FOLDER || 'Library/Photos',
    imageKitVideosRootFolder: process.env.IMAGEKIT_VIDEOS_ROOT_FOLDER || 'Library/Videos',
    // Notion configuration (server-side only)
    notionApiKey: process.env.NOTION_API_KEY,
    notionDatabaseId: process.env.NOTION_DATABASE_ID,
  },

  typescript: {
    strict: true,
  },

  image: {
    // Allow @nuxt/image to optimize images from ImageKit domains
    domains: ['ik.imagekit.io', 'imagekit.io'],
    // Default quality for optimized images (can be overridden per image)
    quality: 85,
    // Responsive image breakpoints
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },

  nitro: {
    // Completely disable prerendering to avoid build errors
    prerender: false,
    experimental: {
      wasm: true,
    },
    minify: true,
    sourceMap: false,
  },
})
