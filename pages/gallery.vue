<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useGoogleAuth } from '~/composables/useGoogleAuth'
import { seoData } from '~/data'

// Authentication
const { user, isAuthenticated, signOut, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()

// Gallery state
const viewMode = ref<'grid' | 'masonry'>('grid')
const selectedCategory = ref<string>('all')

// Lightbox state
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const openLightbox = (index: number) => {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

// Gallery items with like counts
const galleryItems = ref<
  Array<{
    id: number
    title: string
    description: string
    image: string
    category: string
    date: string
    type: string
    likeCount?: number
  }>
>([
  {
    id: 1,
    title: 'Family Moments',
    description: 'Cherished memories with loved ones',
    image: 'https://ik.imagekit.io/u6cq4dqll/Personal/about/All_four.jpg?updatedAt=1745977729755',
    category: 'family',
    date: '2024-01-15',
    type: 'image',
    likeCount: 0,
  },
  {
    id: 2,
    title: 'Travel Adventures',
    description: 'Exploring new places and cultures',
    image:
      'https://ik.imagekit.io/u6cq4dqll/Personal/about/Sid_BetDwarka_Solo_w_Terrano.jpg?updatedAt=1745979649461',
    category: 'travel',
    date: '2024-02-20',
    type: 'image',
    likeCount: 0,
  },
  {
    id: 3,
    title: 'Work Memories',
    description: 'Team moments and achievements',
    image:
      'https://ik.imagekit.io/u6cq4dqll/Personal/about/MacquarieDays.jpg?updatedAt=1745977729581',
    category: 'work',
    date: '2024-03-10',
    type: 'image',
    likeCount: 0,
  },
  {
    id: 4,
    title: 'Nature Photography',
    description: 'Capturing the beauty of nature',
    image: 'https://ik.imagekit.io/u6cq4dqll/Personal/about/Sid_Papiya.jpg?updatedAt=1745977729908',
    category: 'nature',
    date: '2024-04-05',
    type: 'image',
    likeCount: 0,
  },
  {
    id: 5,
    title: 'Special Occasions',
    description: "Celebrating life's milestones",
    image:
      'https://ik.imagekit.io/u6cq4dqll/Personal/about/Sid_Papiya_DecadeBack.jpg?updatedAt=1745977729685',
    category: 'events',
    date: '2024-05-12',
    type: 'image',
    likeCount: 0,
  },
  {
    id: 6,
    title: 'Daily Life',
    description: 'Everyday moments worth remembering',
    image: 'https://ik.imagekit.io/u6cq4dqll/Personal/about/Sid_Ford.jpg?updatedAt=1745979649461',
    category: 'daily',
    date: '2024-06-18',
    type: 'image',
    likeCount: 0,
  },
])

// Load like counts for all items
const loadLikeCounts = async () => {
  for (const item of galleryItems.value) {
    try {
      const response = await $fetch<{ success: boolean; count: number }>(
        `/api/gallery/likes?itemId=${item.id}`,
      )
      if (response.success) {
        item.likeCount = response.count
      }
    } catch (error) {
      console.error(`[Gallery] Failed to load likes for item ${item.id}:`, error)
    }
  }
}

const categories = computed(() => {
  const cats = new Set(galleryItems.value.map((item) => item.category))
  return ['all', ...Array.from(cats)].sort()
})

const filteredItems = computed(() => {
  if (selectedCategory.value === 'all') {
    return galleryItems.value
  }
  return galleryItems.value.filter((item) => item.category === selectedCategory.value)
})

const sortedItems = computed(() => {
  return [...filteredItems.value].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})

// Initialize auth on mount
onMounted(() => {
  initializeGoogleSignIn()
  loadStoredUser()

  // Track page visit
  fetch('/api/analytics/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 'gallery' }),
  }).catch(() => {
    // Silent fail
  })

  // Load like counts
  if (isAuthenticated.value) {
    loadLikeCounts()
  }
})

// Watch for authentication to load likes
watch(isAuthenticated, (newValue) => {
  if (newValue) {
    loadLikeCounts()
  }
})

// Render Google Sign-In button
const renderGoogleSignInButton = () => {
  nextTick(() => {
    const buttonElement = document.getElementById('google-signin-button')
    if (!buttonElement || !window.google) return

    const clientId = useRuntimeConfig().public.googleClientId
    if (!clientId) {
      console.error('[Gallery] Google Client ID not configured')
      return
    }

    // Clear any existing button first
    buttonElement.innerHTML = ''

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const result = await $fetch<{ user: typeof user.value }>('/api/auth/google', {
            method: 'POST',
            body: { token: response.credential },
          })
          if (result.user) {
            user.value = result.user
            localStorage.setItem('google_user', JSON.stringify(result.user))

            // Track login event for analytics
            if (typeof window !== 'undefined') {
              const { trackLogin } = await import('~/utils/analytics/trackLogin')
              await trackLogin(result.user.email, result.user.name, window.location.pathname)
            }

            // Dispatch custom event to notify all components
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
            }
          }
        } catch (error) {
          console.error('[Gallery] Authentication failed:', error)
        }
      },
    })

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 250,
    })
  })
}

// Watch for authentication changes - render button when not authenticated
watch(isAuthenticated, (newValue) => {
  if (!newValue) {
    nextTick(() => {
      renderGoogleSignInButton()
    })
  }
})

useHead({
  title: 'Gallery',
  meta: [
    {
      name: 'description',
      content: 'Private gallery - Authenticated users only',
    },
    { property: 'og:site_name', content: seoData.mySite },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/gallery` },
    { property: 'og:title', content: 'Gallery' },
    { property: 'og:description', content: 'Private gallery - Authenticated users only' },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/gallery` }],
})

defineOgImageComponent('About', {
  headline: 'Gallery 📸',
  title: 'Private Gallery',
  description: 'Authenticated users only',
  link: '/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg',
})
</script>

<template>
  <div class="py-10 container mx-auto max-w-7xl px-6">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">Gallery</h1>
      <p class="text-lg text-zinc-600 dark:text-zinc-400">
        A private collection of memories and moments
      </p>
    </div>

    <!-- Authentication Required Message -->
    <div v-if="!isAuthenticated" class="max-w-2xl mx-auto mt-12">
      <div
        class="bg-[#F1F2F4] dark:bg-slate-900 rounded-lg p-8 text-center border border-gray-200 dark:border-slate-800"
      >
        <Icon icon="mdi:lock" class="text-6xl text-sky-700 dark:text-sky-400 mb-4 mx-auto" />
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
          Authentication Required
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400 mb-6">
          Please sign in with Google to access the gallery.
        </p>
        <div id="google-signin-button" class="flex justify-center"></div>
      </div>
    </div>

    <!-- Gallery Content (Authenticated Users Only) -->
    <div v-else>
      <!-- User Info & Controls -->
      <div class="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-3">
          <img
            v-if="user?.picture"
            :src="user.picture"
            :alt="user.name"
            class="w-10 h-10 rounded-full border-2 border-sky-700 dark:border-sky-400"
          />
          <div>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">Signed in as</p>
            <p class="font-semibold text-zinc-800 dark:text-zinc-200">{{ user?.name }}</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- View Mode Toggle -->
          <div class="flex gap-2 bg-[#F1F2F4] dark:bg-slate-900 rounded-lg p-1">
            <button
              :class="[
                'px-3 py-1 rounded-md transition-colors text-sm',
                viewMode === 'grid'
                  ? 'bg-sky-700 dark:bg-sky-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-slate-800',
              ]"
              @click="viewMode = 'grid'"
            >
              <Icon name="mdi:view-grid" size="20" />
            </button>
            <button
              :class="[
                'px-3 py-1 rounded-md transition-colors text-sm',
                viewMode === 'masonry'
                  ? 'bg-sky-700 dark:bg-sky-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-slate-800',
              ]"
              @click="viewMode = 'masonry'"
            >
              <Icon name="mdi:view-module" size="20" />
            </button>
          </div>

          <!-- Sign Out Button -->
          <button
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm font-semibold flex items-center gap-2"
            @click="signOut"
          >
            <Icon name="mdi:logout" size="18" />
            Sign Out
          </button>
        </div>
      </div>

      <!-- Category Filter -->
      <div class="mb-6 flex flex-wrap gap-2">
        <button
          v-for="category in categories"
          :key="category"
          :class="[
            'px-4 py-2 rounded-md text-sm font-semibold transition-colors capitalize',
            selectedCategory === category
              ? 'bg-sky-700 dark:bg-sky-600 text-white'
              : 'bg-[#F1F2F4] dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-slate-700',
          ]"
          @click="selectedCategory = category"
        >
          {{ category }}
        </button>
      </div>

      <!-- Gallery Grid -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="item in sortedItems"
          :key="item.id"
          class="group bg-[#F1F2F4] dark:bg-slate-900 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-800"
        >
          <div
            class="relative aspect-square overflow-hidden cursor-pointer"
            @click="openLightbox(sortedItems.findIndex((i) => i.id === item.id))"
          >
            <NuxtImg
              :src="item.image"
              :alt="item.title"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
            <div
              class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center"
            >
              <div
                class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center px-4"
              >
                <h3 class="text-xl font-bold mb-2">{{ item.title }}</h3>
                <p class="text-sm">{{ item.description }}</p>
                <p class="text-xs mt-2 flex items-center justify-center gap-1">
                  <Icon name="mdi:fullscreen" size="16" />
                  Click to view full-size
                </p>
              </div>
            </div>
          </div>
          <div class="p-4">
            <div class="flex justify-between items-center mb-2">
              <span
                class="px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 capitalize"
              >
                {{ item.category }}
              </span>
              <div class="flex items-center gap-3">
                <span
                  v-if="item.likeCount !== undefined && item.likeCount > 0"
                  class="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
                >
                  <Icon name="mdi:heart" size="14" class="text-red-500" />
                  {{ item.likeCount }}
                </span>
                <span class="text-xs text-zinc-500 dark:text-zinc-500">
                  {{ new Date(item.date).toLocaleDateString() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Masonry Layout -->
      <div v-else class="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        <div
          v-for="item in sortedItems"
          :key="item.id"
          class="break-inside-avoid group bg-[#F1F2F4] dark:bg-slate-900 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-slate-800 mb-6"
        >
          <div
            class="relative overflow-hidden cursor-pointer"
            @click="openLightbox(sortedItems.findIndex((i) => i.id === item.id))"
          >
            <NuxtImg
              :src="item.image"
              :alt="item.title"
              class="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
            <div
              class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center"
            >
              <div
                class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center px-4"
              >
                <h3 class="text-xl font-bold mb-2">{{ item.title }}</h3>
                <p class="text-sm">{{ item.description }}</p>
                <p class="text-xs mt-2 flex items-center justify-center gap-1">
                  <Icon name="mdi:fullscreen" size="16" />
                  Click to view full-size
                </p>
              </div>
            </div>
          </div>
          <div class="p-4">
            <div class="flex justify-between items-center mb-2">
              <span
                class="px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 capitalize"
              >
                {{ item.category }}
              </span>
              <div class="flex items-center gap-3">
                <span
                  v-if="item.likeCount !== undefined && item.likeCount > 0"
                  class="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
                >
                  <Icon name="mdi:heart" size="14" class="text-red-500" />
                  {{ item.likeCount }}
                </span>
                <span class="text-xs text-zinc-500 dark:text-zinc-500">
                  {{ new Date(item.date).toLocaleDateString() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="sortedItems.length === 0" class="text-center py-12">
        <Icon icon="mdi:image-off" class="text-6xl text-zinc-400 mb-4" />
        <p class="text-lg text-zinc-600 dark:text-zinc-400">No items found in this category</p>
      </div>
    </div>

    <!-- Lightbox Component -->
    <GalleryLightbox
      :items="sortedItems"
      :current-index="lightboxIndex"
      :is-open="lightboxOpen"
      @close="lightboxOpen = false"
      @update:current-index="lightboxIndex = $event"
    />
  </div>
</template>
