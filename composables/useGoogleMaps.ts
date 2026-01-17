/**
 * Composable for Google Maps functionality
 * Handles script loading, initialization, and provides utilities
 */

export interface Place {
  name: string
  lat: number
  lng: number
  description?: string
  type?: 'home' | 'trip'
  year?: number
}

export const useGoogleMaps = () => {
  const mapError = ref<string | null>(null)
  const isLoaded = ref(false)
  const isLoading = ref(false)

  /**
   * Load Google Maps API script
   * Handles script loading with proper error handling and race condition management
   */
  const loadGoogleMapsScript = (options: { requirePlaces?: boolean } = {}): Promise<void> => {
    const { requirePlaces = false } = options

    return new Promise((resolve, reject) => {
      if (import.meta.server) {
        reject(new Error('Google Maps can only be loaded on the client'))
        return
      }

      isLoading.value = true

      // Check if Google Maps is already loaded
      const hasMaps = window.google && window.google.maps
      const hasPlaces = hasMaps && window.google.maps.places

      if (hasMaps && (!requirePlaces || hasPlaces)) {
        isLoading.value = false
        isLoaded.value = true
        resolve()
        return
      }

      // Check if script is already being loaded
      const existing = document.querySelector(
        'script[src*="maps.googleapis.com/maps/api/js"]',
      ) as HTMLScriptElement | null

      if (existing) {
        // Check if it includes places library (if required)
        const hasPlacesLibrary = existing.src.includes('libraries=places')

        if (requirePlaces && !hasPlacesLibrary) {
          // Script exists but doesn't have places library - need to load new one
          existing.remove()
        } else {
          // Script is loading, wait for it
          const checkReady = () => {
            if (
              window.google &&
              window.google.maps &&
              (!requirePlaces || window.google.maps.places)
            ) {
              isLoading.value = false
              isLoaded.value = true
              resolve()
              return true
            }
            return false
          }

          // Check if already loaded
          if (existing.readyState === 'complete' || existing.readyState === 'loaded') {
            if (checkReady()) return

            // Poll for API availability
            const checkInterval = setInterval(() => {
              if (checkReady()) {
                clearInterval(checkInterval)
              }
            }, 100)

            setTimeout(() => {
              clearInterval(checkInterval)
              if (!checkReady()) {
                isLoading.value = false
                reject(new Error('Google Maps API failed to load'))
              }
            }, 10000)
            return
          }

          // Script is loading, wait for load event
          let resolved = false
          const resolveOnce = () => {
            if (!resolved) {
              resolved = true
              const pollInterval = setInterval(() => {
                if (checkReady()) {
                  clearInterval(pollInterval)
                }
              }, 100)

              setTimeout(() => {
                clearInterval(pollInterval)
                if (!checkReady()) {
                  isLoading.value = false
                  if (!resolved) {
                    resolved = true
                    reject(new Error('Google Maps API failed to initialize'))
                  }
                }
              }, 10000)
            }
          }

          existing.addEventListener('load', resolveOnce)
          existing.addEventListener('error', () => {
            if (!resolved) {
              resolved = true
              isLoading.value = false
              reject(new Error('Failed to load Google Maps script'))
            }
          })
          return
        }
      }

      // Load Google Maps script
      const config = useRuntimeConfig()
      const apiKey = config.public.googleMapsApiKey

      if (!apiKey) {
        isLoading.value = false
        reject(
          new Error(
            'Google Maps API key is not configured. Please set NUXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.',
          ),
        )
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}${
        requirePlaces ? '&libraries=places' : ''
      }`
      script.async = true
      script.defer = true

      script.onload = () => {
        // Poll for API availability
        const checkInterval = setInterval(() => {
          if (
            window.google &&
            window.google.maps &&
            (!requirePlaces || window.google.maps.places)
          ) {
            clearInterval(checkInterval)
            isLoading.value = false
            isLoaded.value = true
            resolve()
          }
        }, 100)

        setTimeout(() => {
          clearInterval(checkInterval)
          if (
            window.google &&
            window.google.maps &&
            (!requirePlaces || window.google.maps.places)
          ) {
            isLoading.value = false
            isLoaded.value = true
            resolve()
          } else {
            isLoading.value = false
            reject(
              new Error(
                `Google Maps API${requirePlaces ? ' with Places library' : ''} not available after script load`,
              ),
            )
          }
        }, 5000)
      }

      script.onerror = () => {
        isLoading.value = false
        reject(new Error('Failed to load Google Maps script'))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * Initialize a Google Map instance
   */
  const createMap = (
    container: HTMLElement,
    options: {
      center?: { lat: number; lng: number }
      zoom?: number
    } = {},
  ): google.maps.Map => {
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps API is not loaded. Call loadGoogleMapsScript() first.')
    }

    return new google.maps.Map(container, {
      center: options.center || { lat: 20, lng: 0 },
      zoom: options.zoom || 2,
    })
  }

  /**
   * Add markers to a map
   */
  const addMarkers = (
    map: google.maps.Map,
    places: Place[],
    iconUrls: Record<string, string> = {
      home: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      trip: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    },
  ): google.maps.Marker[] => {
    if (!map || !places || !places.length) return []

    const markers: google.maps.Marker[] = []
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
        infoWindow.open(map, marker)
      })

      markers.push(marker)
      bounds.extend(marker.getPosition()!)
    })

    if (markers.length) {
      map.fitBounds(bounds)
    }

    return markers
  }

  /**
   * Clear markers from the map
   */
  const clearMarkers = (markers: google.maps.Marker[]): void => {
    markers.forEach((marker) => marker.setMap(null))
  }

  /**
   * Get icon URLs for map markers
   */
  const getIconUrls = (): Record<string, string> => {
    return {
      home: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      trip: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    }
  }

  return {
    mapError: readonly(mapError),
    isLoaded: readonly(isLoaded),
    isLoading: readonly(isLoading),
    loadGoogleMapsScript,
    createMap,
    addMarkers,
    clearMarkers,
    getIconUrls,
    setMapError: (error: string | null) => {
      mapError.value = error
    },
  }
}
