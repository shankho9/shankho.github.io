<script setup lang="ts">
definePageMeta({ middleware: ['auth-login'] })

await navigateTo('/library?tab=travel-map', { redirectCode: 301 })
</script>

<template>
  <div class="flex min-h-[40vh] items-center justify-center">
    <Icon name="svg-spinners:180-ring" class="text-4xl text-sky-600" />
  </div>
</template>
