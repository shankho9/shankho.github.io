<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { resourcesPage, seoData } from '~/data'

useHead({
  title: 'Resources',
  meta: [
    {
      name: 'description',
      content: resourcesPage.description,
    },
    { property: 'og:site_name', content: seoData.mySite },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/resources` },
    { property: 'og:title', content: resourcesPage.title },
    { property: 'og:description', content: resourcesPage.description },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/resources` }],
})

defineOgImageComponent('About', {
  headline: 'Resources 📚',
  title: resourcesPage.title,
  description: resourcesPage.description,
  link: '/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg',
})

onMounted(async () => {
  await fetch('/api/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 'resources' }),
  })
})
</script>

<template>
  <div class="py-10 container mx-auto max-w-6xl px-6">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
        {{ resourcesPage.title }}
      </h1>
      <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
        {{ resourcesPage.description }}
      </p>
    </div>

    <!-- Recommended Books Section -->
    <section class="mb-16">
      <div class="flex items-center mb-6">
        <Icon icon="mdi:book-open-variant" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Recommended Books</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <a
          v-for="book in resourcesPage.books"
          :key="book.title"
          :href="book.link"
          target="_blank"
          rel="noopener noreferrer"
          class="group bg-[#F1F2F4] dark:bg-slate-900 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-800"
        >
          <div class="flex items-start justify-between mb-3">
            <h3
              class="text-xl font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
            >
              {{ book.title }}
            </h3>
            <Icon icon="mdi:open-in-new" class="text-zinc-400 group-hover:text-sky-600" />
          </div>
          <p class="text-sm text-sky-600 dark:text-sky-400 font-medium mb-2">{{ book.author }}</p>
          <p class="text-zinc-600 dark:text-zinc-400 mb-3">{{ book.description }}</p>
          <span
            class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
          >
            {{ book.category }}
          </span>
        </a>
      </div>
    </section>

    <!-- Tools Section -->
    <section class="mb-16">
      <div class="flex items-center mb-6">
        <Icon icon="mdi:tools" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Tools I Use</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          v-for="tool in resourcesPage.tools"
          :key="tool.name"
          :href="tool.link"
          target="_blank"
          rel="noopener noreferrer"
          class="group bg-[#F1F2F4] dark:bg-slate-900 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-800"
        >
          <div class="flex items-center justify-between mb-4">
            <Icon
              :icon="tool.icon"
              class="text-4xl text-sky-700 dark:text-sky-400 group-hover:scale-110 transition-transform"
            />
            <Icon icon="mdi:open-in-new" class="text-zinc-400 group-hover:text-sky-600" />
          </div>
          <h3
            class="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
          >
            {{ tool.name }}
          </h3>
          <p class="text-zinc-600 dark:text-zinc-400 mb-3 text-sm">{{ tool.description }}</p>
          <span
            class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
          >
            {{ tool.category }}
          </span>
        </a>
      </div>
    </section>

    <!-- Learning Resources Section -->
    <section class="mb-16">
      <div class="flex items-center mb-6">
        <Icon icon="mdi:school" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Learning Resources</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          v-for="resource in resourcesPage.learningResources"
          :key="resource.title"
          :href="resource.link"
          target="_blank"
          rel="noopener noreferrer"
          class="group bg-[#F1F2F4] dark:bg-slate-900 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-800"
        >
          <div class="flex items-center justify-between mb-4">
            <Icon
              :icon="resource.icon"
              class="text-4xl text-sky-700 dark:text-sky-400 group-hover:scale-110 transition-transform"
            />
            <Icon icon="mdi:open-in-new" class="text-zinc-400 group-hover:text-sky-600" />
          </div>
          <h3
            class="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
          >
            {{ resource.title }}
          </h3>
          <p class="text-zinc-600 dark:text-zinc-400 mb-3 text-sm">{{ resource.description }}</p>
          <span
            class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
          >
            {{ resource.category }}
          </span>
        </a>
      </div>
    </section>

    <!-- Templates & Downloads Section -->
    <section class="mb-16">
      <div class="flex items-center mb-6">
        <Icon icon="mdi:file-download" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Templates & Downloads</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="template in resourcesPage.templates"
          :key="template.title"
          class="group bg-[#F1F2F4] dark:bg-slate-900 rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-slate-800"
        >
          <div class="flex items-center justify-between mb-4">
            <Icon
              :icon="template.icon"
              class="text-4xl text-sky-700 dark:text-sky-400 group-hover:scale-110 transition-transform"
            />
            <Icon
              v-if="template.download"
              icon="mdi:download"
              class="text-zinc-400 group-hover:text-sky-600"
            />
            <Icon v-else icon="mdi:clock-outline" class="text-zinc-400" title="Coming soon" />
          </div>
          <h3 class="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
            {{ template.title }}
          </h3>
          <p class="text-zinc-600 dark:text-zinc-400 mb-3 text-sm">{{ template.description }}</p>
          <span
            class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
          >
            {{ template.category }}
          </span>
        </div>
      </div>
      <div class="mt-6 text-center">
        <p class="text-sm text-zinc-500 dark:text-zinc-500 italic">
          More templates and downloads coming soon!
        </p>
      </div>
    </section>

    <!-- Footer Note -->
    <div class="mt-12 text-center">
      <div class="inline-block bg-sky-50 dark:bg-sky-900/20 rounded-lg p-6 max-w-2xl">
        <p class="text-zinc-700 dark:text-zinc-300">
          This is a curated list of resources that have helped me in my journey. I'll keep updating
          this page as I discover new tools and resources worth sharing.
        </p>
        <p class="text-sm text-zinc-500 dark:text-zinc-500 mt-3">
          Have a suggestion? Feel free to reach out via
          <NuxtLink
            to="/about"
            class="text-sky-700 dark:text-sky-400 hover:underline font-semibold"
          >
            my contact links
          </NuxtLink>
          !
        </p>
      </div>
    </div>
  </div>
</template>
