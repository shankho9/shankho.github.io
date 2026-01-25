<script lang="ts" setup>
import { navbarData } from '~/data'

useHead({
  title: 'Home',
  meta: [
    {
      name: 'description',
      content:
        'I enjoy company of those who are willing to walk the extra mile. Test Automation Engineer by profession and a philanthropic by heart - `All things bright and beautiful, all creatures great and small`',
    },
  ],
})

// Generate OG Image with error handling
try {
  defineOgImageComponent('About', {
    headline: 'Greetings 👋',
    title: navbarData.homeTitle,
    description:
      'I enjoy company of those who are willing to walk the extra mile. Test Automation Engineer by profession and a philanthropic by heart - `All things bright and beautiful, all creatures great and small`',
    link: '/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg',
  })
} catch (error) {
  console.error('[Homepage] Failed to define OG image:', error)
  // Don't throw - allow page to render without OG image
}
</script>

<template>
  <main class="container max-w-5xl mx-auto text-zinc-600 overflow-x-hidden px-3 sm:px-6">
    <MainHero />
    <MainRecent />
    <MainTrending />
  </main>
</template>
