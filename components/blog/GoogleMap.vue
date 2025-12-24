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

interface Place {
  name: string
  lat: number
  lng: number
  description?: string
  type?: 'home' | 'trip'
}

const props = defineProps<{ places: Place[] }>()
const mapContainer = ref<HTMLDivElement | null>(null)
const mapError = ref<string | null>(null)
let map: google.maps.Map | null = null
let markers: google.maps.Marker[] = []

const config = useRuntimeConfig()

const iconUrls: Record<string, string> = {
  home: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  trip: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
}

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      return
    }

    const apiKey = config.public.googleMapsApiKey
    if (!apiKey) {
      reject(
        new Error(
          'Google Maps API key is not configured. Please set NUXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.',
        ),
      )
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = (e) => reject(e)
    document.head.appendChild(script)
  })
}

function addMarkers(places: Place[]) {
  if (!map) return

  markers.forEach((m) => m.setMap(null))
  markers = []

  if (!places || !places.length) return

  const bounds = new google.maps.LatLngBounds()

  places.forEach((place) => {
    if (!place.lat || !place.lng) return

    const marker = new google.maps.Marker({
      map,
      position: { lat: place.lat, lng: place.lng },
      title: place.name,
      icon: iconUrls[place.type ?? 'home'],
    })

    const infoWindow = new google.maps.InfoWindow({
      content: `<strong>${place.name}</strong><br>${place.description || ''}`,
    })

    marker.addListener('click', () => {
      infoWindow.open(map!, marker)
    })

    markers.push(marker)
    bounds.extend(marker.getPosition()!)
  })

  if (markers.length) {
    map.fitBounds(bounds)
  }
}

onMounted(async () => {
  try {
    await loadGoogleMaps()

    if (!mapContainer.value) return

    map = new google.maps.Map(mapContainer.value, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
    })

    if (props.places.length) {
      addMarkers(props.places)
    }
  } catch (error) {
    console.error('[GoogleMap] Failed to load Google Maps:', error)
    mapError.value =
      error instanceof Error
        ? error.message
        : 'Failed to load Google Maps. Please check your configuration.'
  }
})

watch(
  () => props.places,
  (newPlaces) => {
    if (map && newPlaces.length) {
      addMarkers(newPlaces)
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
