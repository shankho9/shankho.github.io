<script setup lang="ts">
definePageMeta({
  middleware: ['auth-tina-admin'],
})

const route = useRoute()

// Tina builds the admin SPA into public/admin/index.html
// Preserve hash (e.g. #/collections/music) when redirecting from /admin
const target = `/admin/index.html${route.hash || ''}`
await navigateTo(target, { external: true })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <Icon name="svg-spinners:180-ring" class="text-4xl text-sky-600" />
  </div>
</template>
