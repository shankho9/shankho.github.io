<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Form Section -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Add New Location</h3>
        <form class="space-y-4" @submit.prevent="submitPlace">
          <div>
            <label class="block text-sm font-medium mb-2">Name *</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Paris, France"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Latitude *</label>
              <input
                v-model.number="form.lat"
                type="number"
                step="any"
                required
                class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 48.8566"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Longitude *</label>
              <input
                v-model.number="form.lng"
                type="number"
                step="any"
                required
                class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 2.3522"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Year Visited</label>
            <input
              v-model.number="form.year"
              type="number"
              min="1900"
              max="2100"
              class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 2024"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Type *</label>
            <select
              v-model="form.type"
              required
              class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
            >
              <option disabled value="">Select a type</option>
              <option value="home">Home</option>
              <option value="trip">Trip</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Description</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Blog Slug</label>
            <input
              v-model="form.blog_slug"
              type="text"
              class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              placeholder="Optional blog post slug"
            />
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Adding...' : 'Add Location' }}
          </button>

          <div
            v-if="successMessage"
            class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            <p class="text-green-800 dark:text-green-200">{{ successMessage }}</p>
          </div>

          <div
            v-if="errorMessage"
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <p class="text-red-800 dark:text-red-200">{{ errorMessage }}</p>
          </div>
        </form>
      </div>

      <!-- Map Preview Section -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Map Preview</h3>
        <div class="border rounded-lg overflow-hidden" style="height: 500px">
          <div ref="mapContainer" class="w-full h-full"></div>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Enter coordinates to see location on map
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface PlaceForm {
  name: string
  lat: number | null
  lng: number | null
  year?: number | null
  description: string
  blog_slug?: string
  type: 'home' | 'trip' | ''
}

const form = ref<PlaceForm>({
  name: '',
  lat: null,
  lng: null,
  year: null,
  description: '',
  blog_slug: '',
  type: '',
})

const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const mapContainer = ref<HTMLDivElement | null>(null)
let map: google.maps.Map | null = null
let marker: google.maps.Marker | null = null

const loadMap = async () => {
  if (!mapContainer.value) return

  // Wait for Google Maps to load with timeout
  if (!window.google || !window.google.maps) {
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearInterval(checkGoogle)
          reject(new Error('Google Maps API failed to load within 10 seconds'))
        }, 10000) // 10 second timeout

        const checkGoogle = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkGoogle)
            clearTimeout(timeout)
            resolve()
          }
        }, 100)
      })
    } catch (error) {
      console.error('[Locations] Failed to load Google Maps API:', error)
      errorMessage.value = 'Failed to load Google Maps. Please refresh the page.'
      return
    }
  }

  // Re-verify that Google Maps is available before using it
  if (!window.google || !window.google.maps || !window.google.maps.Map) {
    console.error('[Locations] Google Maps API is not available')
    errorMessage.value = 'Google Maps API is not available. Please check your API key configuration.'
    return
  }

  if (!map) {
    try {
      map = new window.google.maps.Map(mapContainer.value, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
      })
    } catch (error) {
      console.error('[Locations] Failed to initialize map:', error)
      errorMessage.value = 'Failed to initialize map. Please check your Google Maps API key.'
      return
    }
  }

  updateMarker()
}

const updateMarker = () => {
  if (!map || form.value.lat === null || form.value.lng === null) {
    if (marker) {
      marker.setMap(null)
      marker = null
    }
    return
  }

  // Verify Google Maps API is still available
  if (!window.google?.maps?.Marker) {
    console.error('[Locations] Google Maps Marker API is not available')
    return
  }

  const position = { lat: form.value.lat, lng: form.value.lng }

  try {
    if (marker) {
      marker.setPosition(position)
    } else {
      marker = new window.google.maps.Marker({
        position,
        map,
        title: form.value.name || 'Location',
      })
    }

    map.setCenter(position)
    map.setZoom(10)
  } catch (error) {
    console.error('[Locations] Failed to update marker:', error)
  }
}

watch(
  () => [form.value.lat, form.value.lng],
  () => {
    updateMarker()
  },
)

const submitPlace = async () => {
  isSubmitting.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{ success: boolean; place?: { name: string }; error?: string }>(
      '/api/travel/places',
      {
        method: 'POST',
        body: form.value,
      },
    )

    if (response.success) {
      successMessage.value = `Location "${response.place?.name}" added successfully!`
      form.value = {
        name: '',
        lat: null,
        lng: null,
        year: null,
        description: '',
        blog_slug: '',
        type: '',
      }
      if (marker) {
        marker.setMap(null)
        marker = null
      }
    } else {
      errorMessage.value = response.error || 'Failed to add location'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to add location'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadMap()
})

onUnmounted(() => {
  if (marker) {
    marker.setMap(null)
  }
})
</script>
