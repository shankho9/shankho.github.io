<script setup lang="ts">
import { footerData } from '~/data'
</script>

<template>
  <div>
    <p class="text-black dark:text-zinc-300 text-xl font-semibold mb-2">Connect With Me</p>
    <p class="text-sm dark:text-zinc-300">
      {{ footerData.authorInterest }}
    </p>
  </div>
</template>
