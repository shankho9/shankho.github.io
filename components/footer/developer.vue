<script setup lang="ts">
import { footerData } from '~/data'
</script>

<template>
  <div>
    <p class="text-black dark:text-zinc-300 text-2xl font-semibold mb-2">
      {{ footerData.author }}
    </p>
    <p class="text-sm dark:text-zinc-300">
      {{ footerData.aboutAuthor }}
    </p>
  </div>
</template>
