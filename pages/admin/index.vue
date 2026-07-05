<script setup lang="ts">
definePageMeta({
  middleware: ['auth-tina-admin'],
})

// Tina builds the admin SPA into public/admin/index.html
// This page exists so Nuxt route middleware runs before redirecting.
await navigateTo('/admin/index.html', { external: true })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <Icon name="svg-spinners:180-ring" class="text-4xl text-sky-600" />
  </div>
</template>
