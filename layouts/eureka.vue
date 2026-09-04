<script setup>
import { useHead } from '#imports'

useHead({
  meta: [
    { name: 'google-site-verification', content: 'bvgzFTFDUaG2ThRP-Pq2_rueGyDvef5dfCmb_QjR4r0' },
  ],
})
</script>

<template>
  <div class="eureka-layout font-spacegrotesk min-h-dvh">
    <header
      class="fixed inset-x-0 top-0 z-50 bg-[#F1F2F4]/90 dark:bg-slate-950/90 backdrop-blur-md"
    >
      <MainHeader />
    </header>
    <main class="overflow-x-hidden min-w-0 w-full">
      <slot />
    </main>
    <CommonToast />
  </div>
</template>
