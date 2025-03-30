<script lang="ts" setup>
import Fuse from 'fuse.js'
import type { BlogPost } from '~/types/blog'

const { data } = await useAsyncData('personal-space-posts', () => queryCollection('content').all())

const elementPerPage = ref(5)
const pageNumber = ref(1)
const searchTest = ref('')

const filteredData = computed(() => {
  return (
    data.value?.filter((articles) => {
      const meta = articles.meta as unknown as BlogPost
      return meta?.tags?.includes('lifelines') || meta?.category === 'lifelines'
    }) || []
  )
})

const formattedData = computed(() =>
  filteredData.value.map((articles) => {
    const meta = articles.meta as unknown as BlogPost
    return {
      path: articles.path,
      title: articles.title || 'no-title available',
      description: articles.description || 'no-description available',
      image: meta.image || '/not-found.jpg',
      alt: meta.alt || 'no alter data available',
      ogImage: meta.ogImage || '/not-found.jpg',
      date: meta.date || 'not-date-available',
      tags: meta.tags?.filter((tag) => tag === 'lifelines') || [],
      published: meta.published || false,
    }
  }),
)

const fuse = computed(
  () =>
    new Fuse(formattedData.value, {
      keys: ['title', 'description'],
      threshold: 0.4,
      includeScore: false,
    }),
)

const searchData = computed(() => {
  if (!searchTest.value.trim()) return formattedData.value
  return fuse.value.search(searchTest.value).map((result) => result.item)
})

const paginatedData = computed(() => {
  const start = (pageNumber.value - 1) * elementPerPage.value
  return searchData.value.slice(start, start + elementPerPage.value)
})

const totalPage = computed(() => Math.ceil(searchData.value.length / elementPerPage.value))

function onPreviousPageClick() {
  if (pageNumber.value > 1) pageNumber.value--
}

function onNextPageClick() {
  if (pageNumber.value < totalPage.value) pageNumber.value++
}

useHead({
  title: 'My Life, My Family, and Adventures',
  meta: [
    {
      name: 'description',
      content: 'This section of my Blog is dedicated to Papiya, my 2 daughters - Riya and Tiya :)',
    },
  ],
})

const siteData = useSiteConfig()
defineOgImage({
  title: 'My Life, My Family, and Adventures',
  description: 'This section of my Blog is dedicated to Papiya, my 2 daughters - Riya and Tiya :)',
  image: '/default-og-image.jpg',
  siteName: siteData.url,
})
</script>

<template>
  <main class="container max-w-5xl mx-auto text-zinc-600">
    <PersonalSpaceHero />

    <div class="px-6">
      <input
        v-model="searchTest"
        placeholder="Search"
        type="text"
        class="block w-full bg-[#F1F2F4] dark:bg-slate-900 dark:placeholder-zinc-500 text-zinc-300 rounded-md border-gray-300 dark:border-gray-800 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
      />
    </div>

    <div v-auto-animate class="space-y-5 my-5 px-4">
      <template v-for="post in paginatedData" :key="post.title">
        <ArchiveCard
          :path="post.path"
          :title="post.title"
          :date="post.date"
          :description="post.description"
          :image="post.image"
          :alt="post.alt"
          :og-image="post.ogImage"
          :tags="post.tags"
          :published="post.published"
        />
      </template>

      <ArchiveCard v-if="paginatedData.length <= 0" title="No Post Found" image="/not-found.jpg" />
    </div>

    <div class="flex justify-center items-center space-x-6">
      <button :disabled="pageNumber <= 1" @click="onPreviousPageClick">
        <Icon
          name="mdi:code-less-than"
          size="30"
          :class="{ 'text-sky-700 dark:text-sky-400': pageNumber > 1 }"
        />
      </button>
      <p>{{ pageNumber }} / {{ totalPage }}</p>
      <button :disabled="pageNumber >= totalPage" @click="onNextPageClick">
        <Icon
          name="mdi:code-greater-than"
          size="30"
          :class="{ 'text-sky-700 dark:text-sky-400': pageNumber < totalPage }"
        />
      </button>
    </div>
  </main>
</template>
