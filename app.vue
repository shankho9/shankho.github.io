<script setup>
import { siteMetaData } from './data'
import { Analytics } from '@vercel/analytics/nuxt'
import { SpeedInsights } from '@vercel/speed-insights/vue'
import { useHead, useRuntimeConfig } from '#imports'

const config = useRuntimeConfig()

useHead({
  script: [
    ...(config.public.googleAnalytics?.id
      ? [
          {
            src: `https://www.googletagmanager.com/gtag/js?id=${config.public.googleAnalytics.id}`,
            async: true,
          },
          {
            children: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.public.googleAnalytics.id}');
      `,
          },
        ]
      : []),
  ],
  htmlAttrs: {
    lang: 'en',
  },
  meta: () => {
    // Ensure siteMetaData is safely accessed with fallbacks
    try {
      return siteMetaData
    } catch (error) {
      console.warn('Error accessing siteMetaData:', error)
      // Return minimal safe meta data as fallback
      return [
        { name: 'description', content: 'Nomadic Notions' },
        { property: 'og:type', content: 'website' },
      ]
    }
  },
})
</script>

<template>
  <Analytics />
  <SpeedInsights />
  <div class="bg-[#F1F2F4] dark:text-zinc-300 dark:bg-slate-950 overflow-x-hidden min-w-0">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}

.layout-enter-active,
.layout-leave-active {
  transition: all 0.4s;
}
.layout-enter-from,
.layout-leave-to {
  opacity: 0;
  filter: blur(1rem);
}

html.dark {
  color-scheme: dark;
}

/* Mobile-friendly touch targets and interactions */
button,
[role='button'],
.cursor-pointer {
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

/* Ensure cards are clickable on mobile */
article a,
.card a,
[class*='card'] a,
article > a {
  display: block;
  width: 100%;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Improve link tap targets on mobile */
@media (max-width: 640px) {
  a:not(button a):not([class*='icon'] a) {
    touch-action: manipulation;
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
  }
}

/* Improve mobile text readability */
@media (max-width: 640px) {
  html,
  body {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    overflow-x: hidden;
    max-width: 100vw;
  }

  /* Ensure proper spacing on mobile - prevent horizontal scroll */
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
    max-width: 100%;
  }
}

/* Prose content - prevent code blocks and tables from causing horizontal scroll */
.prose pre,
.prose pre code {
  max-width: 100%;
  overflow-x: auto;
}

.prose table {
  display: block;
  overflow-x: auto;
  max-width: 100%;
}

/* Image Protection Styles - imported from assets/css/image-protection.css */

.blog-content-container [data-article-prose],
.blog-content-container .prose {
  transition:
    font-size 0.2s ease,
    font-family 0.2s ease;
}

/* Focus Mode Styles */
body.focus-mode {
  overflow-x: hidden;
}

body.focus-mode .blog-content-container {
  max-width: 800px !important;
  margin: 0 auto !important;
  padding: 2rem !important;
}

body.focus-mode .blog-content-container.focus-mode-active {
  width: 100% !important;
}

body.focus-mode .prose {
  font-size: 1.25rem !important;
  line-height: 1.8 !important;
  max-width: 100% !important;
}

body.focus-mode .prose p {
  margin-bottom: 1.5rem !important;
}

body.focus-mode .prose h1 {
  font-size: 2.5rem !important;
  margin-top: 2rem !important;
  margin-bottom: 1.5rem !important;
}

body.focus-mode .prose h2 {
  font-size: 2rem !important;
  margin-top: 2rem !important;
  margin-bottom: 1rem !important;
}

body.focus-mode .prose h3 {
  font-size: 1.5rem !important;
  margin-top: 1.5rem !important;
  margin-bottom: 0.75rem !important;
}

@media (max-width: 768px) {
  body.focus-mode .blog-content-container {
    padding: 1rem !important;
  }

  body.focus-mode .prose {
    font-size: 1.125rem !important;
  }
}
</style>
