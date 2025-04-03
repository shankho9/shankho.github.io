<script setup lang="ts">
import type { BlogPost } from '@/types/blog'
import { navbarData, seoData } from '~/data'
import { ref, computed, onMounted } from 'vue'
import { useRoute, navigateTo } from 'nuxt/app'

const { path } = useRoute()

const { data: articles, error } = await useAsyncData(`blog-post-${path}`, () =>
  queryCollection('content').path(path).first(),
)

if (error.value) navigateTo('/404')

const data = computed<BlogPost>(() => {
  const meta = articles?.value?.meta as unknown as BlogPost
  return {
    title: articles.value?.title || 'no-title available',
    description: articles.value?.description || 'no-description available',
    image: meta?.image || '/not-found.jpg',
    alt: meta?.alt || 'no alter data available',
    ogImage: (articles?.value?.ogImage as unknown as string) || '/not-found.jpg',
    date: meta?.date || 'not-date-available',
    tags: meta?.tags || [],
    published: meta?.published || false,
  }
})

// Like button functionality
const liked = ref(false)
const likeCount = ref(0)

onMounted(() => {
  const storedLikes = localStorage.getItem(`likes-${path}`)
  if (storedLikes) {
    likeCount.value = parseInt(storedLikes)
    liked.value = likeCount.value > 0
  }
})

const toggleLike = () => {
  liked.value = !liked.value
  likeCount.value += liked.value ? 1 : -1
  localStorage.setItem(`likes-${path}`, likeCount.value.toString())
}

useHead({
  title: data.value.title || '',
  meta: [
    { name: 'description', content: data.value.description },
    { property: 'og:site_name', content: navbarData.homeTitle },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/${path}` },
    { property: 'og:title', content: data.value.title },
    { property: 'og:description', content: data.value.description },
    { property: 'og:image', content: data.value.ogImage || data.value.image },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/${path}` }],
})
</script>

<template>
  <div class="px-6 container max-w-5xl mx-auto sm:grid grid-cols-12 gap-x-12">
    <div class="col-span-12 lg:col-span-9">
      <BlogHeader
        :title="data.title"
        :image="data.image"
        :alt="data.alt"
        :date="data.date"
        :description="data.description"
        :tags="data.tags"
      />
      <!-- Like Button (Top) -->
      <div class="mt-4 flex items-center gap-2">
        <button @click="toggleLike" class="like-btn" :class="{ liked: liked }">
          <span class="heart-icon">❤</span> <span class="like-count">{{ likeCount }}</span>
        </button>
      </div>
      <div
        class="prose prose-pre:max-w-xs sm:prose-pre:max-w-full prose-sm sm:prose-base md:prose-lg prose-h1:no-underline max-w-5xl mx-auto prose-zinc dark:prose-invert prose-img:rounded-lg"
      >
        <ContentRenderer v-if="articles" :value="articles">
          <template #empty>
            <p>No content found.</p>
          </template>
        </ContentRenderer>
      </div>

      <!-- Like Button (Bottom) -->
      <div class="mt-4 flex items-center gap-2">
        <button @click="toggleLike" class="like-btn" :class="{ liked: liked }">
          <span class="heart-icon">❤</span> <span class="like-count">{{ likeCount }}</span>
        </button>
      </div>
    </div>
    <BlogToc />

    <div class="flex flex-row flex-wrap md:flex-nowrap mt-10 gap-2">
      <SocialShare
        v-for="network in ['facebook', 'twitter', 'linkedin', 'email']"
        :key="network"
        :network="network"
        :styled="true"
        :label="true"
        class="p-1"
        aria-label="Share with {network}"
      />
    </div>
  </div>
</template>

<style>
.like-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: transform 0.2s ease-in-out;
}
.like-btn:hover {
  transform: scale(1.1);
}
.heart-icon {
  font-size: 22px;
  transition: color 0.3s ease-in-out;
}
.liked .heart-icon {
  color: #e63946;
  animation: pulse 0.4s ease-in-out;
}
.like-count {
  color: #b22222; /* Less bright red */
  font-weight: bold;
}
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
