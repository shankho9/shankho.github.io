<script setup lang="ts">
import { footerData, seoData } from '~/data'
</script>

<template>
  <div>
    <p class="text-black dark:text-zinc-300 text-lg font-semibold mb-2">Connect With Me</p>
    <p class="text-sm dark:text-zinc-300 mb-4">
      {{ footerData.authorInterest }}
    </p>

    <a
      :href="`mailto: ${seoData.mailAddress}`"
      class="block text-center w-full bg-sky-700 p-2 rounded-lg text-[#F1F2F4] text-sm hover:bg-sky-800 transition-colors"
    >
      Sent Mail
    </a>
  </div>
</template>
