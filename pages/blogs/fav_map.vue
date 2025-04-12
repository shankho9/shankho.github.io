<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">Places I've Visited</h1>

    <!-- Centered Legend Above Map -->
    <div class="legend-container">
      <div class="legend-item" title="Stayed more than 3 months">
        <img src="http://maps.google.com/mapfiles/ms/icons/red-dot.png" alt="Home Pin" class="pin-icon" />
        <span>Home</span>
      </div>
      <div class="legend-item" title="Stayed more than 2 nights">
        <img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" alt="Trip Pin" class="pin-icon" />
        <span>Trip</span>
      </div>
    </div>

    <!-- Map Component -->
    <div class="map-container">
      <Map :places="places" />
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-gray-500 mt-4">Loading places...</div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="text-red-600 mt-4">Error: {{ errorMessage }}</div>

    <!-- No Data Found State -->
    <div v-if="!isLoading && !errorMessage && places.length === 0" class="text-gray-500 mt-4">
      No places to show. Please check back later.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFetch } from '#app'
import Map from '~/components/blog/GoogleMap.vue'

interface Place {
  name: string
  lat: number
  lng: number
  year: number
  description: string
  type?: 'home' | 'trip'
}

const places = ref<Place[]>([])
const errorMessage = ref('')
const isLoading = ref(true)

onMounted(async () => {
  try {
    const { data, error } = await useFetch<Place[]>('/api/places')
    if (error.value) throw new Error(error.value.message || 'Failed to fetch places')
    places.value = data.value ?? []
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Unknown error occurred'
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.max-w-4xl {
  max-width: 80rem;
}
.mx-auto {
  margin-left: auto;
  margin-right: auto;
}
.p-6 {
  padding: 1.5rem;
}
.text-2xl {
  font-size: 1.5rem;
}
.font-bold {
  font-weight: bold;
}
.mb-4 {
  margin-bottom: 1rem;
}

.map-container {
  height: 600px;
  width: 100%;
  margin-top: 20px;
}

/* Centered Legend */
.legend-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 1rem;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #374151;
  cursor: help;
}

.pin-icon {
  width: 24px;
  height: 24px;
}

@media (max-width: 640px) {
  .text-2xl {
    font-size: 1.25rem;
  }
  .map-container {
    height: 400px;
  }
}

.text-red-600 {
  color: #e11d48;
}
.mt-4 {
  margin-top: 1rem;
}
.text-gray-500 {
  color: #6b7280;
}
</style>
