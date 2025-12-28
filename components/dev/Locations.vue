<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Form Section -->
      <div>
        <h3 class="text-lg font-semibold mb-4">Add New Location</h3>

        <!-- Place Search -->
        <div
          class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
        >
          <label class="block text-sm font-medium mb-2">Search for a Place</label>
          <div class="relative">
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              placeholder="Type a place name (e.g., Paris, France)"
              @input="onSearchInput"
              @focus="onSearchFocus"
            />
            <div
              v-if="searchSuggestions.length > 0"
              class="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              <div
                v-for="(suggestion, index) in searchSuggestions"
                :key="index"
                class="px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-200 dark:border-slate-700 last:border-b-0"
                @click="selectSuggestion(suggestion)"
              >
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {{ suggestion.name }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ suggestion.address }}
                </div>
                <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Lat: {{ suggestion.lat.toFixed(6) }}, Lng: {{ suggestion.lng.toFixed(6) }}
                </div>
              </div>
            </div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Search for a place and select from suggestions to auto-fill coordinates
          </p>
        </div>

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

    <!-- Locations List Section -->
    <div class="mt-8">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">All Locations ({{ locations.length }})</h3>
        <button
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          @click="loadLocations"
        >
          Refresh
        </button>
      </div>

      <div v-if="isLoadingLocations" class="text-center py-8 text-gray-500">
        Loading locations...
      </div>

      <div
        v-else-if="locations.length === 0"
        class="text-center py-8 text-gray-500 dark:text-gray-400"
      >
        No locations added yet. Add your first location above!
      </div>

      <div v-else class="overflow-x-auto border rounded-lg dark:border-slate-700">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Coordinates
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Type
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Year
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Description
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
            <tr
              v-for="location in locations"
              :key="location.id"
              class="hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <td class="px-4 py-3 whitespace-nowrap">
                <div
                  v-if="editingId !== location.id"
                  class="font-medium text-gray-900 dark:text-gray-100"
                >
                  {{ location.name }}
                </div>
                <input
                  v-else
                  :value="location.name"
                  type="text"
                  disabled
                  class="w-full px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <div v-if="editingId !== location.id">
                  {{ location.lat.toFixed(6) }}, {{ location.lng.toFixed(6) }}
                </div>
                <div v-else class="flex gap-2">
                  <input
                    :value="location.lat.toFixed(6)"
                    type="text"
                    disabled
                    class="w-24 px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  <input
                    :value="location.lng.toFixed(6)"
                    type="text"
                    disabled
                    class="w-24 px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div v-if="editingId !== location.id">
                  <span
                    class="px-2 py-1 text-xs rounded-full"
                    :class="
                      location.type === 'home'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    "
                  >
                    {{ location.type || 'N/A' }}
                  </span>
                </div>
                <select
                  v-else
                  v-model="editForms[location.id].type"
                  class="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600"
                >
                  <option value="">Select type</option>
                  <option value="home">Home</option>
                  <option value="trip">Trip</option>
                </select>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <div v-if="editingId !== location.id">
                  {{ location.year || 'N/A' }}
                </div>
                <input
                  v-else
                  v-model.number="editForms[location.id].year"
                  type="number"
                  min="1900"
                  max="2100"
                  class="w-20 px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600"
                  placeholder="Year"
                />
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                <div v-if="editingId !== location.id" class="max-w-xs truncate">
                  {{ location.description || 'N/A' }}
                </div>
                <textarea
                  v-else
                  v-model="editForms[location.id].description"
                  rows="2"
                  class="w-full px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600"
                  placeholder="Description"
                />
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm">
                <div v-if="editingId !== location.id" class="flex gap-2">
                  <button
                    class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    @click="startEdit(location)"
                  >
                    Edit
                  </button>
                  <button
                    class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                    @click="confirmDelete(location)"
                  >
                    Delete
                  </button>
                </div>
                <div v-else class="flex gap-2">
                  <button
                    :disabled="isSaving"
                    class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs"
                    @click="saveEdit(location.id)"
                  >
                    {{ isSaving ? 'Saving...' : 'Save' }}
                  </button>
                  <button
                    class="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                    @click="cancelEdit"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="deleteConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="deleteConfirm = null"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Confirm Delete</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete <strong>{{ deleteConfirm.name }}</strong
          >? This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            @click="deleteConfirm = null"
          >
            Cancel
          </button>
          <button
            :disabled="isDeleting"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            @click="deleteLocation(deleteConfirm.id)"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
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

interface PlaceSuggestion {
  name: string
  address: string
  lat: number
  lng: number
  placeId: string
}

interface Location {
  id: number
  name: string
  lat: number
  lng: number
  year?: number | null
  description?: string | null
  blog_slug?: string | null
  type?: 'home' | 'trip' | null
  created_at?: string
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
const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const searchSuggestions = ref<PlaceSuggestion[]>([])
const locations = ref<Location[]>([])
const isLoadingLocations = ref(false)
const editingId = ref<number | null>(null)
// Store edit state per location ID to prevent overwriting unsaved edits
// Use Record instead of Map for Vue 3 reactivity (Vue doesn't track Map mutations)
const editForms = ref<Record<number, PlaceForm>>({})
const isSaving = ref(false)
const deleteConfirm = ref<Location | null>(null)
const isDeleting = ref(false)
let map: google.maps.Map | null = null
let marker: google.maps.Marker | null = null
let autocompleteService: google.maps.places.AutocompleteService | null = null
let placesService: google.maps.places.PlacesService | null = null
let searchTimeout: NodeJS.Timeout | null = null
let currentSearchQuery: string | null = null // Track the query for the current search to prevent race conditions

const loadMap = async () => {
  if (!mapContainer.value) return

  // Wait for Google Maps to load with timeout
  if (!window.google || !window.google.maps) {
    try {
      await new Promise<void>((resolve, reject) => {
        // Declare checkGoogle before it's used in the timeout callback
        let checkGoogle: NodeJS.Timeout | null = null
        const timeout = setTimeout(() => {
          if (checkGoogle) {
            clearInterval(checkGoogle)
          }
          reject(new Error('Google Maps API failed to load within 10 seconds'))
        }, 10000) // 10 second timeout

        checkGoogle = setInterval(() => {
          if (window.google && window.google.maps) {
            if (checkGoogle) {
              clearInterval(checkGoogle)
            }
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
    errorMessage.value =
      'Google Maps API is not available. Please check your API key configuration.'
    return
  }

  if (!map) {
    try {
      map = new window.google.maps.Map(mapContainer.value, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
      })

      // Initialize Places services
      if (window.google.maps.places) {
        autocompleteService = new window.google.maps.places.AutocompleteService()
        placesService = new window.google.maps.places.PlacesService(map)
      }
    } catch (error) {
      console.error('[Locations] Failed to initialize map:', error)
      errorMessage.value = 'Failed to initialize map. Please check your Google Maps API key.'
      return
    }
  }

  updateMarker()
}

const updateMarker = () => {
  // Check for null or undefined explicitly (not truthiness) to allow valid 0 coordinates
  // This ensures locations on equator (lat=0) or prime meridian (lng=0) are handled correctly
  if (!map || form.value.lat == null || form.value.lng == null) {
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

const onSearchInput = () => {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  // Clear suggestions if search is empty
  if (!searchQuery.value.trim()) {
    searchSuggestions.value = []
    currentSearchQuery = null
    return
  }

  // Debounce search requests
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

const onSearchFocus = () => {
  // If there's a query, show suggestions again
  if (searchQuery.value.trim() && searchSuggestions.value.length === 0) {
    performSearch()
  }
}

const performSearch = () => {
  if (!autocompleteService || !searchQuery.value.trim()) {
    return
  }

  // Capture the current query to track which search this response belongs to
  const queryForThisSearch = searchQuery.value.trim()
  currentSearchQuery = queryForThisSearch

  autocompleteService.getPlacePredictions(
    {
      input: queryForThisSearch,
      types: ['geocode', 'establishment'],
    },
    (predictions, status) => {
      // Check if this response is still relevant (user hasn't changed the query)
      if (currentSearchQuery !== queryForThisSearch) {
        // This response is stale, ignore it
        return
      }

      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        // Get details for each prediction to get lat/lng
        const promises = predictions.slice(0, 5).map((prediction) => {
          return new Promise<PlaceSuggestion>((resolve) => {
            if (!placesService) {
              resolve({
                name: prediction.description,
                address: prediction.description,
                lat: 0,
                lng: 0,
                placeId: prediction.place_id,
              })
              return
            }

            placesService.getDetails(
              {
                placeId: prediction.place_id,
                fields: ['name', 'formatted_address', 'geometry'],
              },
              (place, placeStatus) => {
                if (placeStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                  const location = place.geometry?.location
                  resolve({
                    name: place.name || prediction.description,
                    address: place.formatted_address || prediction.description,
                    lat: location?.lat() || 0,
                    lng: location?.lng() || 0,
                    placeId: prediction.place_id,
                  })
                } else {
                  resolve({
                    name: prediction.description,
                    address: prediction.description,
                    lat: 0,
                    lng: 0,
                    placeId: prediction.place_id,
                  })
                }
              },
            )
          })
        })

        Promise.all(promises).then((suggestions) => {
          // Double-check the query hasn't changed before updating suggestions
          // This prevents stale responses from overwriting newer results
          if (currentSearchQuery === queryForThisSearch) {
            // Filter out only the (0, 0) error fallback cases
            // Use OR (||) not AND (&&) to allow valid places on equator (lat=0) or prime meridian (lng=0)
            searchSuggestions.value = suggestions.filter((s) => s.lat !== 0 || s.lng !== 0)
          }
        })
      } else {
        // Only clear suggestions if this is still the current search
        if (currentSearchQuery === queryForThisSearch) {
          searchSuggestions.value = []
        }
      }
    },
  )
}

const selectSuggestion = (suggestion: PlaceSuggestion) => {
  // Fill form with selected suggestion
  form.value.name = suggestion.name
  form.value.lat = suggestion.lat
  form.value.lng = suggestion.lng

  // Clear search
  searchQuery.value = ''
  searchSuggestions.value = []

  // Update map marker
  updateMarker()
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
      // Reload locations list
      await loadLocations()
    } else {
      errorMessage.value = response.error || 'Failed to add location'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to add location'
  } finally {
    isSubmitting.value = false
  }
}

const loadLocations = async () => {
  isLoadingLocations.value = true
  try {
    const data = await $fetch<Location[]>('/api/travel/places')
    locations.value = data || []
  } catch (err) {
    console.error('[Locations] Failed to load locations:', err)
    errorMessage.value = 'Failed to load locations'
  } finally {
    isLoadingLocations.value = false
  }
}

const startEdit = (location: Location) => {
  // If another location is being edited, cancel it first to prevent data loss
  if (editingId.value !== null && editingId.value !== location.id) {
    cancelEdit()
  }

  editingId.value = location.id
  // Store edit state per location ID to prevent overwriting unsaved edits
  // Use object property assignment for Vue 3 reactivity
  // Only set editable fields (type, year, description)
  editForms.value[location.id] = {
    name: location.name, // Keep for display, but won't be sent to API
    lat: location.lat, // Keep for display, but won't be sent to API
    lng: location.lng, // Keep for display, but won't be sent to API
    year: location.year || null,
    description: location.description || '',
    blog_slug: location.blog_slug || '', // Keep for API, but not editable in UI
    type: (location.type as 'home' | 'trip' | '') || '',
  }
}

const cancelEdit = () => {
  if (editingId.value !== null) {
    // Remove edit state for the location being cancelled
    // Use object destructuring to create new object without the property (Vue 3 reactivity)
    const { [editingId.value]: _, ...rest } = editForms.value
    editForms.value = rest
  }
  editingId.value = null
}

const saveEdit = async (id: number) => {
  isSaving.value = true
  try {
    // Get edit state for this specific location ID
    const editForm = editForms.value[id]
    if (!editForm) {
      errorMessage.value = 'Edit state not found. Please try editing again.'
      editingId.value = null
      return
    }

    // Use values from editForm which were captured when editing started
    // This ensures we have valid values even if the location was deleted/refreshed
    // editForm.name, editForm.lat, editForm.lng are guaranteed to be valid from startEdit()
    const updateData = {
      name: editForm.name, // Use captured name (guaranteed valid from startEdit)
      lat: editForm.lat!, // Use captured lat (guaranteed valid from startEdit)
      lng: editForm.lng!, // Use captured lng (guaranteed valid from startEdit)
      type: editForm.type,
      year: editForm.year,
      description: editForm.description,
      blog_slug: editForm.blog_slug || null,
    }

    const response = await $fetch<{ success: boolean; place?: Location; error?: string }>(
      `/api/travel/places/${id}`,
      {
        method: 'PUT',
        body: updateData,
      },
    )

    if (response.success) {
      successMessage.value = `Location "${response.place?.name}" updated successfully!`
      // Remove edit state for this location after successful save
      // Use object destructuring to create new object without the property (Vue 3 reactivity)
      const { [id]: _, ...rest } = editForms.value
      editForms.value = rest
      editingId.value = null
      await loadLocations()
    } else {
      errorMessage.value = response.error || 'Failed to update location'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to update location'
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (location: Location) => {
  deleteConfirm.value = location
}

const deleteLocation = async (id: number) => {
  isDeleting.value = true
  try {
    const response = await $fetch<{ success: boolean; error?: string }>(
      `/api/travel/places/${id}`,
      {
        method: 'DELETE',
      },
    )

    if (response.success) {
      successMessage.value = 'Location deleted successfully!'
      deleteConfirm.value = null
      await loadLocations()
    } else {
      errorMessage.value = response.error || 'Failed to delete location'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to delete location'
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  loadMap()
  loadLocations()
})

onUnmounted(() => {
  if (marker) {
    marker.setMap(null)
  }
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>
