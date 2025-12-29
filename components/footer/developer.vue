<script setup lang="ts">
import { footerData } from '~/data'
</script>

<template>
  <div class="text-center md:text-left">
    <p class="text-black dark:text-zinc-300 text-xl sm:text-2xl font-semibold mb-2">
      {{ footerData.author }}
    </p>
    <p class="text-xs sm:text-sm dark:text-zinc-300">
      {{ footerData.aboutAuthor }}
    </p>
  </div>
</template>
