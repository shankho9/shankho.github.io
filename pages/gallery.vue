<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import Fuse from 'fuse.js'
import { useAuth } from '~/composables/useAuth'
import { seoData } from '~/data'

// Authentication
const { user, isAuthenticated, signOut, loadStoredUser, initializeGoogleSignIn } = useAuth()

// Gallery state
const viewMode = ref<'grid' | 'masonry'>('grid')
const selectedCategory = ref<string>('all')

// Search state
const searchQuery = ref('')
const showAdvancedFilters = ref(false)
const dateRangeStart = ref<string>('')
const dateRangeEnd = ref<string>('')
const selectedLocation = ref<string>('')
const selectedPeople = ref<string>('')
const selectedEvent = ref<string>('')

// Lightbox state
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const openLightbox = (index: number) => {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

// Gallery items with like counts
interface GalleryItem {
  id: number
  title: string
  description: string
  image: string
  category: string
  date: string
  type: string
  likeCount?: number
  tags?: string[]
  location?: string
  people?: string[]
  event?: string
}

const galleryItems = ref<GalleryItem[]>([
  {
    id: 1,
    title: 'Family Moments',
    description: 'Cherished memories with loved ones',
    image: 'https://ik.imagekit.io/u6cq4dqll/Personal/about/All_four.jpg?updatedAt=1745977729755',
    category: 'family',
    date: '2024-01-15',
    type: 'image',
    likeCount: 0,
    tags: ['family', 'love', 'memories'],
    location: 'Home',
    people: ['Family'],
    event: 'Family Gathering',
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
    tags: ['travel', 'adventure', 'exploration'],
    location: 'Bet Dwarka',
    people: ['Sid'],
    event: 'Solo Trip',
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
    tags: ['work', 'team', 'office'],
    location: 'Macquarie Office',
    people: ['Team'],
    event: 'Team Meeting',
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
    tags: ['nature', 'photography', 'outdoor'],
    location: 'Outdoor',
    people: [],
    event: 'Nature Walk',
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
    tags: ['celebration', 'milestone', 'special'],
    location: 'Home',
    people: ['Family', 'Friends'],
    event: 'Anniversary',
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
    tags: ['daily', 'life', 'casual'],
    location: 'City',
    people: [],
    event: 'Daily Commute',
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

// Get unique values for filters
const locations = computed(() => {
  const locs = new Set(
    galleryItems.value.map((item) => item.location).filter((loc): loc is string => !!loc),
  )
  return Array.from(locs).sort()
})

const people = computed(() => {
  const allPeople = new Set<string>()
  galleryItems.value.forEach((item) => {
    item.people?.forEach((person) => allPeople.add(person))
  })
  return Array.from(allPeople).sort()
})

const events = computed(() => {
  const evts = new Set(
    galleryItems.value.map((item) => item.event).filter((evt): evt is string => !!evt),
  )
  return Array.from(evts).sort()
})

// Category filter
const categoryFilteredItems = computed(() => {
  if (selectedCategory.value === 'all') {
    return galleryItems.value
  }
  return galleryItems.value.filter((item) => item.category === selectedCategory.value)
})

// Text search using Fuse.js
const fuse = computed(() => {
  return new Fuse(categoryFilteredItems.value, {
    keys: ['title', 'description', 'tags'],
    threshold: 0.3,
    includeScore: true,
  })
})

const searchFilteredItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return categoryFilteredItems.value
  }
  return fuse.value.search(searchQuery.value).map((result) => result.item)
})

// Date range filter
const dateFilteredItems = computed(() => {
  let items = searchFilteredItems.value

  if (dateRangeStart.value) {
    const startDate = new Date(dateRangeStart.value).getTime()
    items = items.filter((item) => new Date(item.date).getTime() >= startDate)
  }

  if (dateRangeEnd.value) {
    const endDate = new Date(dateRangeEnd.value).getTime()
    items = items.filter((item) => new Date(item.date).getTime() <= endDate)
  }

  return items
})

// Advanced filters (location, people, event)
const filteredItems = computed(() => {
  let items = dateFilteredItems.value

  if (selectedLocation.value) {
    items = items.filter((item) => item.location === selectedLocation.value)
  }

  if (selectedPeople.value) {
    items = items.filter((item) => item.people && item.people.includes(selectedPeople.value))
  }

  if (selectedEvent.value) {
    items = items.filter((item) => item.event === selectedEvent.value)
  }

  return items
})

const sortedItems = computed(() => {
  return [...filteredItems.value].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})

// Clear all filters
const clearFilters = () => {
  searchQuery.value = ''
  dateRangeStart.value = ''
  dateRangeEnd.value = ''
  selectedLocation.value = ''
  selectedPeople.value = ''
  selectedEvent.value = ''
  showAdvancedFilters.value = false
}

// Track if we've loaded likes for the current user to prevent duplicate calls
const lastLoadedUserEmail = ref<string | null>(null)

// Initialize auth on mount
onMounted(async () => {
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

  // loadStoredUser() is synchronous - it directly sets user.value from localStorage
  // Check user.value immediately after calling it (no need to wait for nextTick)
  // The watch on isAuthenticated provides fallback handling for async auth changes
  if (user.value) {
    loadLikeCounts()
    lastLoadedUserEmail.value = user.value.email
  }
})

// Watch for authentication to load likes
// Only load if this is a new user (different email) to prevent duplicate calls
watch(isAuthenticated, (newValue) => {
  if (newValue && user.value && user.value.email !== lastLoadedUserEmail.value) {
    loadLikeCounts()
    lastLoadedUserEmail.value = user.value.email
  } else if (!newValue) {
    // Reset when user signs out
    lastLoadedUserEmail.value = null
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
          const result = await $fetch<{
            success: boolean
            user: {
              id: number
              email: string
              name: string
              picture: string
              auth_provider: string
              mfa_enabled: boolean
            }
          }>('/api/auth/google', {
            method: 'POST',
            body: { token: response.credential },
          })
          if (result.success && result.user) {
            user.value = result.user
            localStorage.setItem('auth_user', JSON.stringify(result.user))

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

// Generate OG Image with error handling
try {
  defineOgImageComponent('About', {
    headline: 'Gallery 📸',
    title: 'Private Gallery',
    description: 'Authenticated users only',
    link: '/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg',
  })
} catch (error) {
  console.error('[Gallery Page] Failed to define OG image:', error)
  // Don't throw - allow page to render without OG image
}
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

      <!-- Search Bar -->
      <div class="mb-6">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search Input -->
          <div class="flex-1 relative">
            <Icon
              name="mdi:magnify"
              class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"
              size="20"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by title, description, or tags..."
              class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400"
            />
          </div>

          <!-- Advanced Filters Toggle -->
          <button
            :class="[
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2',
              showAdvancedFilters
                ? 'bg-sky-700 dark:bg-sky-600 text-white'
                : 'bg-[#F1F2F4] dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-slate-700',
            ]"
            @click="showAdvancedFilters = !showAdvancedFilters"
          >
            <Icon name="mdi:filter" size="18" />
            Filters
          </button>

          <!-- Clear Filters -->
          <button
            v-if="
              searchQuery ||
              dateRangeStart ||
              dateRangeEnd ||
              selectedLocation ||
              selectedPeople ||
              selectedEvent
            "
            class="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
            @click="clearFilters"
          >
            <Icon name="mdi:close" size="18" />
            Clear
          </button>
        </div>

        <!-- Advanced Filters Panel -->
        <div
          v-if="showAdvancedFilters"
          class="mt-4 p-4 bg-[#F1F2F4] dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Date Range Start -->
            <div>
              <label class="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                From Date
              </label>
              <input
                v-model="dateRangeStart"
                type="date"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400"
              />
            </div>

            <!-- Date Range End -->
            <div>
              <label class="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                To Date
              </label>
              <input
                v-model="dateRangeEnd"
                type="date"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400"
              />
            </div>

            <!-- Location Filter -->
            <div>
              <label class="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Location
              </label>
              <select
                v-model="selectedLocation"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400"
              >
                <option value="">All Locations</option>
                <option v-for="location in locations" :key="location" :value="location">
                  {{ location }}
                </option>
              </select>
            </div>

            <!-- People Filter -->
            <div>
              <label class="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                People
              </label>
              <select
                v-model="selectedPeople"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400"
              >
                <option value="">All People</option>
                <option v-for="person in people" :key="person" :value="person">
                  {{ person }}
                </option>
              </select>
            </div>

            <!-- Event Filter -->
            <div>
              <label class="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Event
              </label>
              <select
                v-model="selectedEvent"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400"
              >
                <option value="">All Events</option>
                <option v-for="event in events" :key="event" :value="event">
                  {{ event }}
                </option>
              </select>
            </div>
          </div>
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

      <!-- Results Count -->
      <div
        v-if="
          searchQuery ||
          dateRangeStart ||
          dateRangeEnd ||
          selectedLocation ||
          selectedPeople ||
          selectedEvent
        "
        class="mb-4 text-sm text-zinc-600 dark:text-zinc-400"
      >
        Found {{ sortedItems.length }} {{ sortedItems.length === 1 ? 'item' : 'items' }}
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
            <!-- Tags -->
            <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
              <span
                v-for="tag in item.tags"
                :key="tag"
                class="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-slate-700 text-zinc-600 dark:text-zinc-400"
              >
                #{{ tag }}
              </span>
            </div>
            <!-- Location, People, Event metadata -->
            <div class="mt-2 space-y-1">
              <div
                v-if="item.location"
                class="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <Icon name="mdi:map-marker" size="14" />
                {{ item.location }}
              </div>
              <div
                v-if="item.people && item.people.length > 0"
                class="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <Icon name="mdi:account-group" size="14" />
                {{ item.people.join(', ') }}
              </div>
              <div
                v-if="item.event"
                class="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <Icon name="mdi:calendar-star" size="14" />
                {{ item.event }}
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
            <!-- Tags -->
            <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
              <span
                v-for="tag in item.tags"
                :key="tag"
                class="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-slate-700 text-zinc-600 dark:text-zinc-400"
              >
                #{{ tag }}
              </span>
            </div>
            <!-- Location, People, Event metadata -->
            <div class="mt-2 space-y-1">
              <div
                v-if="item.location"
                class="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <Icon name="mdi:map-marker" size="14" />
                {{ item.location }}
              </div>
              <div
                v-if="item.people && item.people.length > 0"
                class="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <Icon name="mdi:account-group" size="14" />
                {{ item.people.join(', ') }}
              </div>
              <div
                v-if="item.event"
                class="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <Icon name="mdi:calendar-star" size="14" />
                {{ item.event }}
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
