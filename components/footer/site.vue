<script setup lang="ts">
import { footerData } from '~/data'
</script>

<template>
  <div>
    <p class="text-black dark:text-zinc-300 text-lg font-semibold mb-2">About This Site</p>
    <p class="text-sm dark:text-zinc-300">
      {{ footerData.aboutTheSite }}
    </p>
  </div>
</template>
