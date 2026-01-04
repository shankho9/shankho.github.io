<script setup lang="ts">
useHead({
  title: '404',
  meta: [
    {
      name: 'description',
      content: 'Page not found',
    },
  ],
})

// Generate OG Image with error handling
try {
  defineOgImageComponent('About', {
    headline: 'Wrong Path',
    title: '404',
    description: 'Page Not Found',
  })
} catch (error) {
  console.error('[404 Page] Failed to define OG image:', error)
  // Don't throw - allow page to render without OG image
}
</script>

<template>
  <div class="py-5">
    <div class="container max-w-xl mx-auto">
      <Logo404 />
    </div>
  </div>
</template>
