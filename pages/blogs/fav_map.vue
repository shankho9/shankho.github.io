<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">Places I've Visited</h1>

    <!-- Map Component with a wrapper for styling -->
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
import Map from '~/components/blog/GoogleMap.vue' // Ensure Map component is imported correctly

// Define TypeScript interfaces for the places data
interface Place {
  name: string
  lat: number
  lng: number
  year: number
  description: string
  type?: 'home' | 'trip'
}

// State to hold the places data, error message, and loading state
const places = ref<Place[]>([])
const errorMessage = ref('')
const isLoading = ref(true) // Add loading state

// Fetch places data on page mount
onMounted(async () => {
  try {
    const { data, error } = await useFetch<Place[]>('/api/places')

    if (error.value) {
      throw new Error(error.value.message || 'Failed to fetch places')
    }

    places.value = data.value ?? [] // Ensure we assign an empty array if no data is found
  } catch (err: unknown) {
    if (err instanceof Error) {
      errorMessage.value = err.message || 'Unknown error occurred'
    } else {
      errorMessage.value = 'Unknown error occurred'
    }
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
/* General layout and spacing */
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

/* Map Container */
.map-container {
  height: 600px; /* Taller height for the map */
  width: 100%;
  margin-top: 20px; /* Spacing above the map */
}

/* Error Message Styling */
.text-red-600 {
  color: #e11d48;
}
.mt-4 {
  margin-top: 1rem;
}

/* Loading and No Data Styling */
.text-gray-500 {
  color: #6b7280;
}
</style>
