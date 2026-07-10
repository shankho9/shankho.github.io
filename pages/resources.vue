<script setup lang="ts">
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

// Generate OG Image with error handling
try {
  defineOgImageComponent('About', {
    headline: 'Resources 📚',
    title: resourcesPage.title,
    description: resourcesPage.description,
    link: '/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg',
  })
} catch (error) {
  console.error('[Resources Page] Failed to define OG image:', error)
  // Don't throw - allow page to render without OG image
}

onMounted(async () => {
  await fetch('/api/analytics/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 'resources' }),
  })
})
</script>

<template>
  <div class="py-10 container mx-auto max-w-6xl px-6">
    <!-- Header -->
    <div class="text-center mb-8">
      <div
        class="mx-auto mb-6 max-w-2xl rounded-xl border border-sky-200/80 bg-sky-50/70 px-4 py-3 text-left text-sm text-sky-900 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-100"
      >
        <p>
          This page is a curated starter list of books and tools. For the full catalog (books,
          tools, learning resources, and apps), sign in to the
          <NuxtLink
            to="/library?tab=resources"
            class="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
          >
            Media Library → Resources
          </NuxtLink>
          tab.
        </p>
      </div>
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
        <Icon name="mdi:book-open-variant" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
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
            <Icon name="mdi:open-in-new" class="text-zinc-400 group-hover:text-sky-600" />
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
        <Icon name="mdi:tools" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
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
              :name="tool.icon"
              class="text-4xl text-sky-700 dark:text-sky-400 group-hover:scale-110 transition-transform"
            />
            <Icon name="mdi:open-in-new" class="text-zinc-400 group-hover:text-sky-600" />
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
        <Icon name="mdi:school" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
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
              :name="resource.icon"
              class="text-4xl text-sky-700 dark:text-sky-400 group-hover:scale-110 transition-transform"
            />
            <Icon name="mdi:open-in-new" class="text-zinc-400 group-hover:text-sky-600" />
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
        <Icon name="mdi:file-download" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
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
              :name="template.icon"
              class="text-4xl text-sky-700 dark:text-sky-400 group-hover:scale-110 transition-transform"
            />
            <Icon
              v-if="template.download"
              name="mdi:download"
              class="text-zinc-400 group-hover:text-sky-600"
            />
            <Icon v-else name="mdi:clock-outline" class="text-zinc-400" title="Coming soon" />
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

    <!-- Images Gallery Section -->
    <section v-if="resourcesPage.images && resourcesPage.images.length > 0" class="mb-16">
      <div class="flex items-center mb-6">
        <Icon name="mdi:image-multiple" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Image Gallery</h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          v-for="image in resourcesPage.images"
          :key="image.title"
          :href="image.link"
          target="_blank"
          rel="noopener noreferrer"
          class="group bg-[#F1F2F4] dark:bg-slate-900 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-800"
        >
          <div class="relative aspect-square overflow-hidden">
            <NuxtImg
              :src="image.imageUrl"
              :alt="image.title"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
              width="400"
              height="400"
              quality="85"
            />
            <div
              class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center"
            >
              <div
                class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center px-4"
              >
                <Icon name="mdi:fullscreen" class="text-3xl mb-2" />
                <p class="text-sm">Click to view full-size</p>
              </div>
            </div>
          </div>
          <div class="p-4">
            <h3
              class="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
            >
              {{ image.title }}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{{ image.description }}</p>
            <div class="flex justify-between items-center">
              <span
                class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
              >
                {{ image.category }}
              </span>
              <span class="text-xs text-zinc-500 dark:text-zinc-500">
                {{ new Date(image.date).toLocaleDateString() }}
              </span>
            </div>
          </div>
        </a>
      </div>
    </section>

    <!-- Videos Section -->
    <section v-if="resourcesPage.videos && resourcesPage.videos.length > 0" class="mb-16">
      <div class="flex items-center mb-6">
        <Icon name="mdi:video" class="text-3xl mr-3 text-sky-700 dark:text-sky-400" />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Video Resources</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          v-for="video in resourcesPage.videos"
          :key="video.title"
          :href="video.videoUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="group bg-[#F1F2F4] dark:bg-slate-900 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-800"
        >
          <div class="relative aspect-video overflow-hidden">
            <NuxtImg
              :src="video.thumbnail"
              :alt="video.title"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
              width="600"
              height="338"
              quality="85"
            />
            <div
              class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center"
            >
              <div
                class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white"
              >
                <Icon name="mdi:play-circle" class="text-6xl" />
              </div>
            </div>
            <div
              class="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-semibold"
            >
              {{ video.duration }}
            </div>
          </div>
          <div class="p-4">
            <h3
              class="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
            >
              {{ video.title }}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{{ video.description }}</p>
            <div class="flex justify-between items-center">
              <span
                class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
              >
                {{ video.category }}
              </span>
              <span class="text-xs text-zinc-500 dark:text-zinc-500">
                {{ new Date(video.date).toLocaleDateString() }}
              </span>
            </div>
          </div>
        </a>
      </div>
    </section>

    <!-- Content/Articles Section -->
    <section v-if="resourcesPage.content && resourcesPage.content.length > 0" class="mb-16">
      <div class="flex items-center mb-6">
        <Icon
          name="mdi:file-document-multiple"
          class="text-3xl mr-3 text-sky-700 dark:text-sky-400"
        />
        <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Featured Content</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="item in resourcesPage.content"
          :key="item.title"
          :to="item.link"
          class="group bg-[#F1F2F4] dark:bg-slate-900 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-800"
        >
          <div class="flex items-center justify-between mb-4">
            <Icon
              :name="item.icon"
              class="text-4xl text-sky-700 dark:text-sky-400 group-hover:scale-110 transition-transform"
            />
            <Icon name="mdi:arrow-right" class="text-zinc-400 group-hover:text-sky-600" />
          </div>
          <h3
            class="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
          >
            {{ item.title }}
          </h3>
          <p class="text-zinc-600 dark:text-zinc-400 mb-3 text-sm">{{ item.description }}</p>
          <div class="flex justify-between items-center">
            <span
              class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
            >
              {{ item.category }}
            </span>
            <span class="text-xs text-zinc-500 dark:text-zinc-500">
              {{ new Date(item.date).toLocaleDateString() }}
            </span>
          </div>
        </NuxtLink>
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
