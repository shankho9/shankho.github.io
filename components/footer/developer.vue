<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { footerData, socialLinks } from '~/data'
</script>

<template>
  <div class="text-center">
    <p class="text-black dark:text-zinc-300 text-2xl py-1 font-semibold">
      {{ footerData.author }}
    </p>
    <p class="py-2 dark:text-zinc-300">
      {{ footerData.aboutAuthor }}
    </p>
    <div class="my-5 flex justify-center items-center gap-5">
      <NuxtLink
        v-for="(link, key) in socialLinks"
        :key="key"
        :to="link"
        target="_blank"
        class="p-3 bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-white rounded-full shadow-md hover:shadow-lg transition transform hover:scale-110"
        :aria-label="key"
      >
        <Icon :icon="`mdi:${key}`" width="28" height="28" />
      </NuxtLink>
    </div>
  </div>
</template>
