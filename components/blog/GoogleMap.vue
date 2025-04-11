<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Place {
  name: string
  lat: number
  lng: number
  description?: string
}

const props = defineProps<{ places: Place[] }>()
const mapContainer = ref<HTMLDivElement | null>(null)
let map: google.maps.Map | null = null
let markers: google.maps.Marker[] = []

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

    const script = document.createElement('script')
    script.src =
      'https://maps.googleapis.com/maps/api/js?key=AIzaSyDUM6RMSGssBJBuFdjkloMQkj6OC-FWz5s'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = (e) => reject(e)
    document.head.appendChild(script)
  })
}

function addMarkers(places: Place[]) {
  if (!map) return
  console.log('[Map] Adding markers for places:', places)

  // Remove old markers
  markers.forEach((m) => m.setMap(null))
  markers = []

  if (!places || !places.length) {
    console.warn('[Map] No places to render markers for.')
    return
  }

  const bounds = new google.maps.LatLngBounds()

  places.forEach((place) => {
    if (!place.lat || !place.lng) {
      console.warn('[Map] Skipping invalid place:', place)
      return
    }

    const marker = new google.maps.Marker({
      map,
      position: { lat: place.lat, lng: place.lng },
      title: place.name,
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

// Wait for the places data to be available, then load the map
onMounted(async () => {
  await loadGoogleMaps()

  if (!mapContainer.value) return

  // Initialize the map after loading Google Maps
  map = new google.maps.Map(mapContainer.value, {
    center: { lat: 20, lng: 0 },
    zoom: 2,
  })

  console.log('[Map] Map initialized:', map)

  // Check if places are available and add markers
  if (props.places.length) {
    console.log('[Map] Initial places available on mount:', props.places)
    addMarkers(props.places)
  } else {
    console.warn('[Map] No initial places found.')
  }
})

// Watch for changes in the places prop and update the markers accordingly
watch(
  () => props.places,
  (newPlaces) => {
    console.log('[Map] Places updated:', newPlaces)
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
</style>
