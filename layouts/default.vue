<script setup>
import { useHead } from '#imports'

useHead({
  meta: [
    { name: 'google-site-verification', content: 'bvgzFTFDUaG2ThRP-Pq2_rueGyDvef5dfCmb_QjR4r0' },
  ],
})
</script>

<template>
  <div class="gd-container font-spacegrotesk">
    <header class="fixed w-full bg-[#F1F2F4] dark:bg-slate-950 z-10">
      <MainHeader />
    </header>
    <main>
      <div class="p-9" />
      <slot />
    </main>
    <footer>
      <MainFooter />
    </footer>
  </div>
</template>

<style scoped>
.gd-container {
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 100vh;
}
</style>
