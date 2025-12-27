<template>
  <div
    class="py-5 border-t-2 border-gray-300 dark:border-gray-700 mt-5 text-zinc-700 dark:text-zinc-300"
  >
    <div class="px-6 container max-w-5xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Author Info & Social Links -->
        <FooterDeveloper />

        <!-- Quick Links (2 columns) -->
        <FooterLink />

        <!-- Connect Section -->
        <FooterConnect />
      </div>

      <div class="border-t-2 border-gray-300 dark:border-gray-700 mt-5 text-center p-2">
        © 2020-2024 No Right is reserved. Who cares 🤷‍♂️ anyway.
        <a href="/rss.xml" aria-label="Website RSS Feed">
          <span class="px-3"><Icon name="bi:rss-fill" /></span
        ></a>
      </div>
    </div>
  </div>
</template>

<style>
/* we will explain what these classes do next! */
.v-enter-active,
.v-leave-active {
  transition: all 0.4s;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>
