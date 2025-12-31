<script setup>
import { siteMetaData } from './data'
import { Analytics } from '@vercel/analytics/nuxt'
import { SpeedInsights } from '@vercel/speed-insights/vue'
import { useHead, useRuntimeConfig } from '#imports'

const config = useRuntimeConfig()

useHead({
  script: [
    {
      src: `https://www.googletagmanager.com/gtag/js?id=${config.public.googleAnalyticsId}`,
      async: true,
    },
    {
      children: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.public.googleAnalyticsId}');
      `,
    },
  ],
  htmlAttrs: {
    lang: 'en',
  },
  meta: () => siteMetaData,
})
</script>

<template>
  <Analytics />
  <SpeedInsights />
  <div class="bg-[#F1F2F4] dark:text-zinc-300 dark:bg-slate-950">
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
  body {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  /* Ensure proper spacing on mobile */
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Global Image Protection Styles */
img,
picture,
[style*='background-image'] {
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-user-drag: none !important;
  -khtml-user-drag: none !important;
  -moz-user-drag: none !important;
  -o-user-drag: none !important;
  user-drag: none !important;
  -webkit-touch-callout: none !important;
  pointer-events: auto !important;
}

/* Prevent image dragging */
img {
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  user-drag: none;
  draggable: false;
}

/* Disable text selection on images */
img::selection,
img::-moz-selection {
  background: transparent;
}

/* Apply to all image sources including ImageKit */
img[src*='imagekit.io'],
img[src*='ik.imagekit.io'],
img[src*='/api/imagekit'],
picture img {
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-user-drag: none !important;
  -moz-user-drag: none !important;
  user-drag: none !important;
  -webkit-touch-callout: none !important;
}
</style>
