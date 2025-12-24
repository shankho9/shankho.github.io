<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useGoogleAuth } from '~/composables/useGoogleAuth'
import { resourcesPage, seoData } from '~/data'
import GalleryLightbox from '~/components/gallery/Lightbox.vue'
import GoogleMap from '~/components/blog/GoogleMap.vue'

// Tab types
type TabType = 'photos' | 'videos' | 'musical-notes' | 'travel-map' | 'resources'

// Authentication
const { user, isAuthenticated, signIn, signOut, loadStoredUser, initializeGoogleSignIn } =
  useGoogleAuth()

// Active tab state - default to resources (public) to ensure page is always accessible
const activeTab = ref<TabType>('resources')

// Gallery state (for Photos tab)
const viewMode = ref<'grid' | 'masonry'>('grid')
const selectedCategory = ref<string>('all')

// Travel Map state
const travelPlaces = ref<
  Array<{
    name: string
    lat: number
    lng: number
    description?: string
    type?: 'home' | 'trip'
    year?: number
  }>
>([])
const mapLoading = ref(false)
const mapError = ref<string | null>(null)

// Lightbox state
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const openLightbox = (index: number) => {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

// Sample gallery items - replace with your actual media
const galleryItems = ref([
  {
    id: 1,
    title: 'Family Moments',
    description: 'Cherished memories with loved ones',
    image: 'https://ik.imagekit.io/u6cq4dqll/Personal/about/All_four.jpg?updatedAt=1745977729755',
    category: 'family',
    date: '2024-01-15',
    type: 'image',
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
  },
  {
    id: 4,
    title: 'Nature Photography',
    description: 'Capturing the beauty of nature',
    image: 'https://ik.imagekit.io/u6cq4dqll/Personal/about/Sid_Papiya.jpg?updatedAt=1745977729908',
    category: 'nature',
    date: '2024-04-05',
    type: 'image',
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
  },
  {
    id: 6,
    title: 'Daily Life',
    description: 'Everyday moments worth remembering',
    image: 'https://ik.imagekit.io/u6cq4dqll/Personal/about/Sid_Ford.jpg?updatedAt=1745979649461',
    category: 'daily',
    date: '2024-06-18',
    type: 'image',
  },
])

// Sample video items - replace with your actual videos
const videoItems = ref([
  {
    id: 1,
    title: 'Travel Documentary',
    description: 'A journey through beautiful landscapes',
    thumbnail:
      'https://ik.imagekit.io/u6cq4dqll/Personal/about/Sid_BetDwarka_Solo_w_Terrano.jpg?updatedAt=1745979649461',
    videoUrl: '#',
    category: 'travel',
    date: '2024-01-20',
    duration: '5:32',
  },
  {
    id: 2,
    title: 'Family Moments',
    description: 'Captured memories with loved ones',
    thumbnail:
      'https://ik.imagekit.io/u6cq4dqll/Personal/about/All_four.jpg?updatedAt=1745977729755',
    videoUrl: '#',
    category: 'family',
    date: '2024-02-15',
    duration: '3:45',
  },
])

// Tab configuration
const tabs = [
  {
    id: 'photos' as TabType,
    label: 'Photos',
    icon: 'mdi:image-multiple',
    count: galleryItems.value.length,
    requiresAuth: true,
  },
  {
    id: 'videos' as TabType,
    label: 'Videos',
    icon: 'mdi:video',
    count: videoItems.value.length,
    requiresAuth: true,
  },
  {
    id: 'musical-notes' as TabType,
    label: 'Musical Notes',
    icon: 'mdi:music-note',
    count: 0,
    requiresAuth: true,
  },
  {
    id: 'travel-map' as TabType,
    label: 'Travel Map',
    icon: 'mdi:map',
    count: 0,
    requiresAuth: true,
  },
  {
    id: 'resources' as TabType,
    label: 'Resources',
    icon: 'mdi:book-open-variant',
    count:
      resourcesPage.books.length +
      resourcesPage.tools.length +
      resourcesPage.learningResources.length,
    requiresAuth: false,
  },
]

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

// Load travel places
const loadTravelPlaces = async () => {
  mapLoading.value = true
  mapError.value = null
  try {
    const response = await $fetch<
      Array<{
        name: string
        lat: number
        lng: number
        description?: string
        type?: 'home' | 'trip'
        year?: number
      }>
    >('/api/places')
    travelPlaces.value = response || []
  } catch (err: unknown) {
    console.error('[Library] Failed to load travel places:', err)
    mapError.value = 'Failed to load travel places. Please try again later.'
  } finally {
    mapLoading.value = false
  }
}

// Watch for travel-map tab activation to load places
watch(activeTab, (newTab) => {
  if (newTab === 'travel-map' && travelPlaces.value.length === 0 && !mapLoading.value) {
    loadTravelPlaces()
  }
})

// Initialize auth on mount - load user first to ensure authentication state is available
onMounted(() => {
  // Load stored user first to ensure authentication state is available
  loadStoredUser()
  initializeGoogleSignIn()

  // Track page visit
  fetch('/api/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 'library' }),
  }).catch(() => {
    // Silent fail
  })
})

// Render Google Sign-In button
const renderGoogleSignInButton = () => {
  nextTick(() => {
    const buttonElement = document.getElementById('google-signin-button')
    if (!buttonElement || !window.google) return

    const clientId = useRuntimeConfig().public.googleClientId
    if (!clientId) {
      console.error('[Library] Google Client ID not configured')
      return
    }

    buttonElement.innerHTML = ''

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const result = await $fetch<{ user: typeof user.value }>('/api/auth/google', {
            method: 'POST',
            body: { token: response.credential },
          })
          user.value = result.user
          localStorage.setItem('google_user', JSON.stringify(result.user))

          if (typeof window !== 'undefined') {
            const { trackLogin } = await import('~/utils/trackLogin')
            await trackLogin(result.user.email, result.user.name, window.location.pathname)
            window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
          }
        } catch (error) {
          console.error('[Library] Authentication failed:', error)
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

watch(isAuthenticated, (newValue) => {
  if (!newValue) {
    nextTick(() => {
      renderGoogleSignInButton()
    })
  }
})

// Check if current tab requires auth
const currentTabRequiresAuth = computed(() => {
  return tabs.find((tab) => tab.id === activeTab.value)?.requiresAuth ?? false
})

useHead({
  title: 'Library',
  meta: [
    {
      name: 'description',
      content: 'A curated collection of photos, videos, and resources',
    },
    { property: 'og:site_name', content: seoData.mySite },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/library` },
    { property: 'og:title', content: 'Library' },
    {
      property: 'og:description',
      content: 'A curated collection of photos, videos, and resources',
    },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/library` }],
})

defineOgImageComponent('About', {
  headline: 'Library 📚',
  title: 'Media Library',
  description: 'Photos, Videos & Resources',
  link: '/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg',
})
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800"
  >
    <div class="container mx-auto max-w-7xl px-6 py-10">
      <!-- Header -->
      <div class="text-center mb-10">
        <h1
          class="text-5xl font-extrabold mb-4 bg-gradient-to-r from-sky-700 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent"
        >
          Media Library
        </h1>
        <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Explore photos, videos, and curated resources
        </p>
      </div>

      <!-- Tab Navigation -->
      <div class="mb-8">
        <div
          class="flex flex-wrap justify-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-2 shadow-lg border border-gray-200 dark:border-slate-700"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'relative flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ease-out',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-sky-700 to-blue-600 dark:from-sky-600 dark:to-blue-500 text-white shadow-md scale-105'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:scale-102',
            ]"
          >
            <Icon :name="tab.icon" size="20" />
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.count > 0"
              :class="[
                'ml-1 px-2 py-0.5 rounded-full text-xs font-bold',
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300',
              ]"
            >
              {{ tab.count }}
            </span>
            <!-- Active indicator -->
            <div
              v-if="activeTab === tab.id"
              class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-white rounded-full"
            />
          </button>
        </div>
      </div>

      <!-- Authentication Required Message (for Photos/Videos) -->
      <div v-if="!isAuthenticated && currentTabRequiresAuth" class="max-w-2xl mx-auto mt-12">
        <div
          class="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700 shadow-lg"
        >
          <Icon name="mdi:lock" class="text-6xl text-sky-700 dark:text-sky-400 mb-4 mx-auto" />
          <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
            Authentication Required
          </h2>
          <p class="text-zinc-600 dark:text-zinc-400 mb-6">
            Please sign in with Google to access {{ activeTab === 'photos' ? 'photos' : 'videos' }}.
          </p>
          <div id="google-signin-button" class="flex justify-center"></div>
        </div>
      </div>

      <!-- Tab Content -->
      <Transition
        mode="out-in"
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
      >
        <!-- Photos Tab -->
        <div
          v-if="activeTab === 'photos' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'photos'"
        >
          <!-- User Info & Controls -->
          <div
            v-if="isAuthenticated"
            class="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4"
          >
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
              <div class="flex gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-md">
                <button
                  :class="[
                    'px-3 py-1 rounded-md transition-colors text-sm',
                    viewMode === 'grid'
                      ? 'bg-sky-700 dark:bg-sky-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-slate-700',
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
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                  ]"
                  @click="viewMode = 'masonry'"
                >
                  <Icon name="mdi:view-module" size="20" />
                </button>
              </div>
            </div>
          </div>

          <!-- Category Filter -->
          <div class="mb-6 flex flex-wrap gap-2">
            <button
              v-for="category in categories"
              :key="category"
              @click="selectedCategory = category"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize',
                selectedCategory === category
                  ? 'bg-gradient-to-r from-sky-700 to-blue-600 dark:from-sky-600 dark:to-blue-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm',
              ]"
            >
              {{ category }}
            </button>
          </div>

          <!-- Gallery Grid -->
          <div
            v-if="viewMode === 'grid'"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div
              v-for="item in sortedItems"
              :key="item.id"
              class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700"
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
                  <span class="text-xs text-zinc-500 dark:text-zinc-500">
                    {{ new Date(item.date).toLocaleDateString() }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Masonry Layout -->
          <div v-else class="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            <div
              v-for="item in sortedItems"
              :key="item.id"
              class="break-inside-avoid group bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-slate-700 mb-6"
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
                  <span class="text-xs text-zinc-500 dark:text-zinc-500">
                    {{ new Date(item.date).toLocaleDateString() }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="sortedItems.length === 0" class="text-center py-12">
            <Icon name="mdi:image-off" class="text-6xl text-zinc-400 mb-4" />
            <p class="text-lg text-zinc-600 dark:text-zinc-400">No items found in this category</p>
          </div>
        </div>

        <!-- Videos Tab -->
        <div
          v-else-if="activeTab === 'videos' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'videos'"
        >
          <div v-if="isAuthenticated" class="mb-6 flex items-center gap-3">
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

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="video in videoItems"
              :key="video.id"
              class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700"
            >
              <div class="relative aspect-video overflow-hidden cursor-pointer">
                <NuxtImg
                  :src="video.thumbnail"
                  :alt="video.title"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div
                  class="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center"
                >
                  <Icon
                    name="mdi:play-circle"
                    class="text-6xl text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                  />
                  <span
                    class="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs font-semibold rounded"
                  >
                    {{ video.duration }}
                  </span>
                </div>
              </div>
              <div class="p-4">
                <h3 class="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  {{ video.title }}
                </h3>
                <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{{ video.description }}</p>
                <div class="flex justify-between items-center">
                  <span
                    class="px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 capitalize"
                  >
                    {{ video.category }}
                  </span>
                  <span class="text-xs text-zinc-500 dark:text-zinc-500">
                    {{ new Date(video.date).toLocaleDateString() }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="videoItems.length === 0" class="text-center py-12">
            <Icon name="mdi:video-off" class="text-6xl text-zinc-400 mb-4" />
            <p class="text-lg text-zinc-600 dark:text-zinc-400">No videos available yet</p>
          </div>
        </div>

        <!-- Resources Tab -->
        <div v-else-if="activeTab === 'resources'" :key="'resources'">
          <!-- Recommended Books Section -->
          <section class="mb-16">
            <div class="flex items-center mb-6">
              <Icon
                name="mdi:book-open-variant"
                class="text-3xl mr-3 text-sky-700 dark:text-sky-400"
              />
              <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">Recommended Books</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a
                v-for="book in resourcesPage.books"
                :key="book.title"
                :href="book.link"
                target="_blank"
                rel="noopener noreferrer"
                class="group bg-white dark:bg-slate-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700"
              >
                <div class="flex items-start justify-between mb-3">
                  <h3
                    class="text-xl font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
                  >
                    {{ book.title }}
                  </h3>
                  <Icon name="mdi:open-in-new" class="text-zinc-400 group-hover:text-sky-600" />
                </div>
                <p class="text-sm text-sky-600 dark:text-sky-400 font-medium mb-2">
                  {{ book.author }}
                </p>
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
                class="group bg-white dark:bg-slate-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700"
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
              <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200">
                Learning Resources
              </h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <a
                v-for="resource in resourcesPage.learningResources"
                :key="resource.title"
                :href="resource.link"
                target="_blank"
                rel="noopener noreferrer"
                class="group bg-white dark:bg-slate-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700"
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
                <p class="text-zinc-600 dark:text-zinc-400 mb-3 text-sm">
                  {{ resource.description }}
                </p>
                <span
                  class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
                >
                  {{ resource.category }}
                </span>
              </a>
            </div>
          </section>
        </div>

        <!-- Musical Notes Tab -->
        <div
          v-else-if="activeTab === 'musical-notes' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'musical-notes'"
        >
          <div v-if="isAuthenticated" class="mb-6 flex items-center gap-3">
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

          <div
            class="bg-white dark:bg-slate-800 rounded-xl p-12 border border-gray-200 dark:border-slate-700 text-center"
          >
            <Icon
              name="mdi:music-note-outline"
              class="text-6xl text-sky-700 dark:text-sky-400 mb-4"
            />
            <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200 mb-4">
              Musical Notes & Pages
            </h2>
            <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Musical instrument notes and sheet music coming soon! This section will feature
              curated musical resources, sheet music, and learning materials.
            </p>
          </div>
        </div>

        <!-- Travel Map Tab -->
        <div
          v-else-if="activeTab === 'travel-map' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'travel-map'"
        >
          <div v-if="isAuthenticated" class="mb-6 flex items-center gap-3">
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

          <div
            class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700"
          >
            <h2 class="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-4 text-center">
              Places I've Visited
            </h2>

            <!-- Legend -->
            <div class="flex justify-center gap-6 mb-4 flex-wrap">
              <div class="flex items-center gap-2">
                <img
                  src="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                  alt="Home"
                  class="w-6 h-6"
                />
                <span class="text-sm text-zinc-600 dark:text-zinc-400">Home</span>
              </div>
              <div class="flex items-center gap-2">
                <img
                  src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                  alt="Trip"
                  class="w-6 h-6"
                />
                <span class="text-sm text-zinc-600 dark:text-zinc-400">Trip</span>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="mapLoading" class="text-center py-12">
              <Icon
                name="svg-spinners:180-ring"
                class="text-4xl text-sky-700 dark:text-sky-400 mb-4"
              />
              <p class="text-zinc-600 dark:text-zinc-400">Loading travel places...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="mapError" class="text-center py-12">
              <Icon name="mdi:alert-circle" class="text-4xl text-red-600 dark:text-red-400 mb-4" />
              <p class="text-red-600 dark:text-red-400">{{ mapError }}</p>
            </div>

            <!-- Map Component -->
            <div
              v-else-if="travelPlaces.length > 0"
              class="map-container rounded-lg overflow-hidden"
            >
              <GoogleMap :places="travelPlaces" />
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-12">
              <Icon name="mdi:map-off" class="text-6xl text-zinc-400 mb-4" />
              <p class="text-lg text-zinc-600 dark:text-zinc-400">No travel places available yet</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Lightbox Component -->
      <GalleryLightbox
        v-if="activeTab === 'photos'"
        :items="sortedItems"
        :current-index="lightboxIndex"
        :is-open="lightboxOpen"
        @close="lightboxOpen = false"
        @update:current-index="lightboxIndex = $event"
      />
    </div>
  </div>
</template>

<style scoped>
.hover\:scale-102:hover {
  transform: scale(1.02);
}

.map-container {
  height: 600px;
  width: 100%;
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .map-container {
    height: 400px;
  }
}
</style>
