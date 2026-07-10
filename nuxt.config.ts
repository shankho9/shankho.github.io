/// <reference types="nuxt" />

import { existsSync } from 'node:fs'
import { seoData } from './data'

const tinaAdminBuilt = existsSync('public/admin/index.html')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-30',
  components: [
    '~/components',
    { path: '~/components/library', pathPrefix: false },
    { path: '~/components/music', pathPrefix: false },
    { path: '~/components/blog', pathPrefix: false },
  ],

  // Site configuration for nuxt-site-config (used by nuxt-og-image and other modules)
  // CRITICAL: Always ensure url is a string, never undefined
  // nuxt-og-image calls .replace() on this, so it must be a string
  site: {
    url: String(process.env.NUXT_PUBLIC_SITE_URL || 'https://www.nomadic-notions.co.in'),
    name: "Sid's Blog | Nomadic Notions",
  },

  modules: [
    '@nuxt/icon',
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
          // CRITICAL: Always ensure url is a string
          url: String(process.env.NUXT_PUBLIC_SITE_URL || 'https://www.nomadic-notions.co.in'),
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
          '/sitemap',
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
    [
      '@nuxtjs/tailwindcss',
      {
        quiet: true, // Suppress JIT compilation timing warnings
      },
    ],
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
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        },
        {
          rel: 'preconnect',
          href: 'https://ik.imagekit.io',
          crossorigin: 'anonymous',
        },
        {
          rel: 'manifest',
          href: '/manifest.json',
        },
        {
          rel: 'apple-touch-icon',
          href: '/Nomadic Notion-logo-2.png',
        },
      ],
      meta: [
        {
          name: 'theme-color',
          content: '#0284c7',
        },
        {
          name: 'mobile-web-app-capable',
          content: 'yes',
        },
        {
          name: 'apple-mobile-web-app-capable',
          content: 'yes',
        },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'default',
        },
        {
          name: 'apple-mobile-web-app-title',
          content: 'Nomadic Notions',
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },

  css: ['~/assets/css/tailwind.css', '~/assets/css/image-protection.css'],

  devtools: { enabled: true },

  experimental: {
    appManifest: false,
  },

  nitro: {
    // Prerender specific routes for better performance
    prerender: {
      routes: ['/sitemap.xml', '/robots.txt'],
      crawlLinks: false,
    },
    // Enable WASM support (required for some modules)
    experimental: {
      wasm: true,
    },
    // Compress public assets
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    // Optimize esbuild
    esbuild: {
      options: {
        target: 'node18',
      },
    },
  },

  runtimeConfig: {
    googleMapsServerApiKey:
      process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    public: {
      buildId:
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.VERCEL_DEPLOYMENT_ID ||
        process.env.NUXT_PUBLIC_BUILD_ID ||
        (process.env.NODE_ENV === 'production' ? `build-${Date.now()}` : 'dev'),
      // CRITICAL: Always ensure siteUrl is a string, never undefined
      siteUrl: String(process.env.NUXT_PUBLIC_SITE_URL || 'https://www.nomadic-notions.co.in'),
      googleAnalytics: {
        id: process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID,
        debug: process.env.NODE_ENV !== 'production',
      },
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID,
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      appleClientId: process.env.NUXT_PUBLIC_APPLE_CLIENT_ID,
      outlookClientId: process.env.NUXT_PUBLIC_OUTLOOK_CLIENT_ID,
      githubClientId: process.env.NUXT_PUBLIC_GITHUB_CLIENT_ID,
      apiBase: '/api',
      // ImageKit public configuration (client-side accessible)
      imageKitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/u6cq4dqll',
      // ImageKit root folders (configurable)
      imageKitPhotosRootFolder: process.env.IMAGEKIT_PHOTOS_ROOT_FOLDER || 'Library/Photos',
      imageKitVideosRootFolder: process.env.IMAGEKIT_VIDEOS_ROOT_FOLDER || 'Library/Videos',
      tinaClientId: process.env.NUXT_PUBLIC_TINA_CLIENT_ID || '',
      tinaAdminBuilt,
    },
    databaseUrl: process.env.DATABASE_URL,
    // Email configuration (server-side only)
    resendApiKey: process.env.RESEND_API_KEY,
    alertEmail: process.env.ALERT_EMAIL,
    fromEmail: process.env.FROM_EMAIL || 'blogsite@nomadic-notions.co.in',
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
    tinaToken: process.env.TINA_TOKEN || '',
    tinaBranch: process.env.TINA_BRANCH || 'main',
    // Cloudflare R2 (server-side only, for app binary downloads)
    r2AccountId: process.env.R2_ACCOUNT_ID,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2BucketName: process.env.R2_BUCKET_NAME,
    // * = any top-level folder (Android/, Desktop/, iOS/, …); or comma list to restrict
    r2AllowedKeyPrefixes: process.env.R2_ALLOWED_KEY_PREFIXES || '*',
    // Legacy single-prefix env (unused when R2_ALLOWED_KEY_PREFIXES is * or set)
    r2AppsPrefix: process.env.R2_APPS_PREFIX || 'apps/',
    // OAuth provider secrets (server-side only)
    outlookClientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    appleClientSecret: process.env.APPLE_CLIENT_SECRET,
  },

  typescript: {
    strict: true,
  },

  icon: {
    // Avoid /api/* — this app uses that prefix for Nitro API routes
    localApiEndpoint: '/_nuxt_icon',
    serverBundle: {
      collections: ['mdi', 'svg-spinners', 'icon-park', 'noto', 'simple-icons'],
    },
    clientBundle: {
      scan: true,
      sizeLimitKb: 512,
    },
  },

  // Disable dynamic OG image generation on content pages — use static og:image from useHead instead
  routeRules: {
    '/blogs/**': { ogImage: false },
    '/personalSpace/**': { ogImage: false },
    '/categories/**': { ogImage: false },
  },

  // nuxt-og-image v6: pin Satori so CI does not require optional @takumi-rs/* peers
  ogImage: {
    defaults: {
      renderer: 'satori',
    },
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
    // Use ipx provider only (built-in, no sharp required)
    // This avoids sharp binary compatibility issues during deployment
    providers: {
      ipx: {},
    },
  },
})
