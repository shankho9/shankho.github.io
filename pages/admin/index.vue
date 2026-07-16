<script setup lang="ts">
definePageMeta({
  middleware: ['auth-tina-admin'],
})

const route = useRoute()

// Tina builds the admin SPA into public/admin/index.html
// Preserve hash (e.g. #/collections/music) when redirecting from /admin
const target = `/admin/index.html${route.hash || ''}`

// Use external navigation so the static Tina SPA loads (not the Nuxt router).
await navigateTo(target, { external: true })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
    <Icon name="svg-spinners:180-ring" class="text-4xl text-sky-600" />
    <p class="text-sm text-gray-600 dark:text-gray-300">Opening Tina editor…</p>
  </div>
</template>
