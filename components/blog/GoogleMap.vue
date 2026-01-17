<template>
  <div>
    <div ref="mapContainer" class="map-container">
      <div
        v-if="mapError"
        class="map-error flex items-center justify-center h-full bg-gray-100 dark:bg-slate-800 rounded-lg"
      >
        <div class="text-center px-4">
          <p class="text-red-600 dark:text-red-400 font-semibold mb-2">Map Unavailable</p>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">{{ mapError }}</p>
        </div>
      </div>
    </div>
    <div v-if="!mapError" class="legend">
      <div class="legend-item">
        <img src="http://maps.google.com/mapfiles/ms/icons/red-dot.png" class="icon" />
        <span>Home</span>
      </div>
      <div class="legend-item">
        <img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" class="icon" />
        <span>Trip</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useGoogleMaps, type Place } from '~/composables/useGoogleMaps'

const props = defineProps<{ places: Place[] }>()
const mapContainer = ref<HTMLDivElement | null>(null)
const {
  loadGoogleMapsScript,
  createMap,
  addMarkers,
  clearMarkers,
  getIconUrls,
  mapError,
  setMapError,
} = useGoogleMaps()

let map: google.maps.Map | null = null
let markers: google.maps.Marker[] = []

const iconUrls = getIconUrls()

onMounted(async () => {
  try {
    await loadGoogleMapsScript({ requirePlaces: true })

    if (!mapContainer.value) return

    map = createMap(mapContainer.value, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
    })

    if (props.places.length) {
      markers = addMarkers(map, props.places, iconUrls)
    }
  } catch (error) {
    console.error('[GoogleMap] Failed to load Google Maps:', error)
    setMapError(
      error instanceof Error
        ? error.message
        : 'Failed to load Google Maps. Please check your configuration.',
    )
  }
})

watch(
  () => props.places,
  (newPlaces) => {
    if (map) {
      clearMarkers(markers)
      if (newPlaces.length) {
        markers = addMarkers(map, newPlaces, iconUrls)
      }
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.map-container {
  height: 600px;
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.legend {
  margin-top: 1rem;
  display: flex;
  gap: 1.5rem;
  font-size: 14px;
  align-items: center;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon {
  width: 18px;
  height: 18px;
}

.map-error {
  min-height: 200px;
}
</style>
