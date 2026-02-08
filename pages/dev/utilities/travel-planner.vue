<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed, onMounted, watch, shallowRef } from 'vue'
import { seoData } from '~/data'
import { useToast } from '~/composables/useToast'
import { useDevUtilityAuth } from '~/composables/useDevUtilityAuth'
import { useGoogleMaps } from '~/composables/useGoogleMaps'

definePageMeta({
  middleware: ['auth-utilities', 'utility-access'],
})

const { ensureAuth } = useDevUtilityAuth()
const { showToast } = useToast()
const { loadGoogleMapsScript, createMap } = useGoogleMaps()

useHead({
  title: 'Travel Planner',
  meta: [
    {
      name: 'description',
      content:
        'Plan trips, compare road vs flight costs, and find the most cost-effective travel option',
    },
    { property: 'og:site_name', content: seoData.mySite },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/dev/utilities/travel-planner` },
    { property: 'og:title', content: 'Travel Planner' },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/dev/utilities/travel-planner` }],
  script: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      defer: true,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.min.js',
      defer: true,
    },
  ],
})

const currencies = {
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', locale: 'en-IN' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', locale: 'en-GB' },
}

type TripDuration = 'short' | 'medium' | 'long' | 'extended'
type HotelTier = 'budget' | 'mid' | 'luxury'
type ItineraryBlockMode = 2 | 3 | 4
type TransportType = 'flight' | 'cruise' | 'train' | 'taxi'
type TransportMode = 'road' | 'flight' | 'train' | 'taxi' | 'cruise'
type StayCategory = 'hotel' | 'apartment' | 'resort' | 'hostel' | 'homestay'

interface Destination {
  id: string
  name: string
  lat?: number
  lng?: number
  days: number
  notes?: string
}

interface PlaceSuggestion {
  description: string
  placeId: string
}

const defaultPlan = {
  currency: 'INR' as keyof typeof currencies,
  tripName: '',
  origin: '',
  destinations: [] as Destination[],
  startDate: '',
  adults: 2,
  kids: 0,
  duration: 'medium' as TripDuration,
  budget: 0,
  transportModes: [] as TransportMode[],
  stayCategories: [] as StayCategory[],
  stay: {
    includeStay: false,
    category: 'hotel' as StayCategory,
    tier: 'mid' as HotelTier,
    costPerNight: 0,
    nights: 0,
    rooms: 1,
  },
  roadTrip: {
    enabled: true,
    petrolPrice: 0,
    mileage: 0, // km per liter
    fuelOverride: 0, // 0 = use calculated, > 0 = override
    tolls: 0, // 0 = use estimated, > 0 = override
    parking: 0, // 0 = use estimated, > 0 = override
    misc: 0,
    sightseeing: 0,
    legs: [
      { id: 'leg-1', from: '', to: '' },
    ] as Array<{
      id: string
      from: string
      to: string
      distanceText?: string
      durationText?: string
      distanceValue?: number
      durationValue?: number
    }>,
  },
  publicTransport: {
    enabled: true,
    options: [] as Array<{
      id: string
      type: TransportType
      enabled: boolean
      cost: number
      transfer: number
      baggage: number
      travelHours: number
      costPerKm: number
      from: string
      to: string
    }>,
  },
  food: {
    enabled: true,
    dailyCosts: {} as Record<string, number>, // day number -> cost
    mealTypes: ['breakfast', 'lunch', 'dinner', 'snacks'] as string[],
    customMeals: {} as Record<string, Record<string, number>>, // day -> mealType -> cost
  },
  sites: {
    enabled: true,
    sites: [] as Array<{
      id: string
      name: string
      location: string
      description: string
      cost: number
      day: number
      source: string
      url?: string
    }>,
  },
  itinerary: {
    blocksPerDay: 3 as ItineraryBlockMode,
    blockLabels: ['Morning', 'Afternoon', 'Evening'],
    notes: {} as Record<string, Record<string, string>>,
  },
  expenses: {
    enabled: true,
    items: [] as Array<{
      id: string
      category: 'transport' | 'accommodation' | 'food' | 'sightseeing' | 'shopping' | 'misc'
      description: string
      amount: number
      date: string
      destination?: string
      notes?: string
    }>,
  },
  packing: {
    enabled: true,
    lists: {
      essentials: [] as Array<{ id: string; item: string; packed: boolean }>,
      clothing: [] as Array<{ id: string; item: string; packed: boolean }>,
      electronics: [] as Array<{ id: string; item: string; packed: boolean }>,
      toiletries: [] as Array<{ id: string; item: string; packed: boolean }>,
      documents: [] as Array<{ id: string; item: string; packed: boolean }>,
      other: [] as Array<{ id: string; item: string; packed: boolean }>,
    },
  },
  documents: {
    enabled: true,
    checklist: [
      { id: 'passport', name: 'Passport', required: true, checked: false },
      { id: 'visa', name: 'Visa', required: false, checked: false },
      { id: 'id', name: 'ID Card', required: true, checked: false },
      { id: 'tickets', name: 'Travel Tickets', required: true, checked: false },
      { id: 'hotel', name: 'Hotel Reservations', required: false, checked: false },
      { id: 'insurance', name: 'Travel Insurance', required: false, checked: false },
      { id: 'currency', name: 'Foreign Currency', required: false, checked: false },
      { id: 'cards', name: 'Credit/Debit Cards', required: true, checked: false },
      { id: 'vaccination', name: 'Vaccination Certificate', required: false, checked: false },
      { id: 'emergency', name: 'Emergency Contacts', required: true, checked: false },
    ] as Array<{ id: string; name: string; required: boolean; checked: boolean }>,
  },
}

const plan = ref({ ...defaultPlan } as typeof defaultPlan)
const activeTab = ref<
  | 'plan'
  | 'transport-costs'
  | 'accommodation-activities'
  | 'comparison'
  | 'itinerary'
  | 'expenses'
  | 'packing'
  | 'documents'
>('plan')
const isLoadingDistance = ref(false)
const distanceError = ref('')
const distanceData = ref<{
  total: { distance: { text: string; value: number }; duration: { text: string; value: number } }
  legs: Array<{ origin: string; destination: string; distanceText: string; durationText: string }>
} | null>(null)
const isLoadingMap = ref(false)
const mapError = ref('')
const mapRef = ref<HTMLDivElement | null>(null)
const mapInstance = ref<google.maps.Map | null>(null)
const directionsService = ref<google.maps.DirectionsService | null>(null)
const directionsRenderer = ref<google.maps.DirectionsRenderer | null>(null)
const routeStops = ref<Array<{ name: string; lat: number; lng: number }>>([])
const isAnimatingRoute = ref(false)
const carMarker = ref<google.maps.Marker | null>(null)
const _routePath = ref<google.maps.Polyline | null>(null)
const routeCoordinates = ref<Array<{ lat: number; lng: number }>>([])
const isRecordingGif = ref(false)
const animationFrames = ref<ImageData[]>([])
const originSuggestions = ref<PlaceSuggestion[]>([])
const destinationSuggestions = ref<Record<string, PlaceSuggestion[]>>({})
const legSuggestions = ref<Record<string, { from: PlaceSuggestion[]; to: PlaceSuggestion[] }>>({})
const autocompleteService = shallowRef<google.maps.places.AutocompleteService | null>(null)

type TravelPlan = typeof defaultPlan

interface TravelPlanTemplate {
  id: number
  name: string
  description: string | null
  plan_data: TravelPlan
  is_template: boolean
  is_default: boolean
  updated_at: string
}

const templates = ref<TravelPlanTemplate[]>([])
const showSaveModal = ref(false)
const showTemplatesModal = ref(false)
const templateName = ref('')
const templateDescription = ref('')
const isDefaultTemplate = ref(false)
const isSavingTemplate = ref(false)
const isLoadingTemplates = ref(false)
const currentTemplateId = ref<number | null>(null)
const saveAsNew = ref(true)
const showCurrencyMenu = ref(false)
const showDurationMenu = ref(false)
const previousCurrency = ref<keyof typeof currencies>('INR')
const draggedDestinationId = ref<string | null>(null)
const showExportMenu = ref(false)
const isExporting = ref(false)
const _showPrintView = ref(false)

const formatCurrency = (value: number) => {
  const curr = currencies[plan.value.currency] || currencies.INR
  return new Intl.NumberFormat(curr.locale, {
    style: 'currency',
    currency: curr.code,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

const formatBudgetInput = (value: number) => {
  if (!value || value === 0) return ''
  return formatNumber(value)
}

const parseBudgetInput = (value: string) => {
  const cleaned = value.replace(/[^\d]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

const durationLabels: Record<TripDuration, string> = {
  short: '1–2 days',
  medium: '3–5 days',
  long: '5–8 days',
  extended: '8+ days',
}

const budgetPresets: Record<keyof typeof currencies, Record<TripDuration, number>> = {
  INR: {
    short: 15000,
    medium: 35000,
    long: 70000,
    extended: 120000,
  },
  USD: {
    short: 300,
    medium: 700,
    long: 1400,
    extended: 2400,
  },
  EUR: {
    short: 280,
    medium: 650,
    long: 1300,
    extended: 2200,
  },
  GBP: {
    short: 250,
    medium: 580,
    long: 1150,
    extended: 1950,
  },
}

const getBaseBudgetPreset = () => {
  const curr = plan.value.currency
  const presets = budgetPresets[curr] || budgetPresets.INR
  return presets[plan.value.duration]
}

const applyBudgetPreset = () => {
  const basePreset = getBaseBudgetPreset()
  const travelers = Math.max(1, totalTravelers.value || 1)
  // Base preset is per person, multiply by number of travelers
  plan.value.budget = basePreset * travelers
  showToast(
    `Budget set to ${formatCurrency(plan.value.budget)} for ${travelers} ${travelers === 1 ? 'traveler' : 'travelers'}`,
    'success',
  )
}

const toggleCurrencyMenu = () => {
  showCurrencyMenu.value = !showCurrencyMenu.value
}

const selectCurrency = (code: keyof typeof currencies) => {
  plan.value.currency = code
  showCurrencyMenu.value = false
}

const closeCurrencyMenu = () => {
  setTimeout(() => {
    showCurrencyMenu.value = false
  }, 150)
}

// Close export menu when clicking outside
const closeExportMenu = () => {
  setTimeout(() => {
    showExportMenu.value = false
  }, 150)
}

const toggleDurationMenu = () => {
  showDurationMenu.value = !showDurationMenu.value
}

const selectDuration = (duration: TripDuration) => {
  plan.value.duration = duration
  showDurationMenu.value = false
}

const closeDurationMenu = () => {
  setTimeout(() => {
    showDurationMenu.value = false
  }, 150)
}

const normalizePlan = (data: Partial<TravelPlan> & { tripMembers?: number }) => {
  const fallbackMembers = Number.isFinite(data.tripMembers)
    ? Math.max(1, data.tripMembers || 1)
    : null
  return {
    ...defaultPlan,
    ...data,
    adults:
      Number.isFinite(data.adults) && data.adults !== undefined
        ? Math.max(0, data.adults as number)
        : (fallbackMembers ?? defaultPlan.adults),
    kids:
      Number.isFinite(data.kids) && data.kids !== undefined
        ? Math.max(0, data.kids as number)
        : defaultPlan.kids,
    roadTrip: (() => {
      const merged = { ...defaultPlan.roadTrip, ...(data.roadTrip || {}) }
      const legs = Array.isArray(merged.legs) ? merged.legs : defaultPlan.roadTrip.legs
      merged.legs = legs.length > 0 ? legs : [{ id: `leg-${Date.now()}`, from: '', to: '' }]
      delete (merged as Record<string, unknown>).originOverride
      delete (merged as Record<string, unknown>).useOriginOverride
      delete (merged as Record<string, unknown>).legDetails
      delete (merged as Record<string, unknown>).autoCalculateFuel
      delete (merged as Record<string, unknown>).autoCalculateTolls
      delete (merged as Record<string, unknown>).autoCalculateParking
      if (typeof (merged as Record<string, unknown>).fuelOverride !== 'number') {
        ;(merged as Record<string, unknown>).fuelOverride = 0
      }
      return merged
    })(),
    publicTransport: { ...defaultPlan.publicTransport, ...(data.publicTransport || {}) },
    food: { ...defaultPlan.food, ...(data.food || {}) },
    sites: { ...defaultPlan.sites, ...(data.sites || {}) },
    stay: { ...defaultPlan.stay, ...(data.stay || {}) },
    expenses: { ...defaultPlan.expenses, ...(data.expenses || {}) },
    packing: { ...defaultPlan.packing, ...(data.packing || {}) },
    documents: { ...defaultPlan.documents, ...(data.documents || {}) },
    budget: Number.isFinite(data.budget) ? Math.max(0, data.budget as number) : defaultPlan.budget,
    transportModes: Array.isArray(data.transportModes)
      ? (data.transportModes as TransportMode[])
      : defaultPlan.transportModes,
    stayCategories: Array.isArray(data.stayCategories)
      ? (data.stayCategories as StayCategory[])
      : defaultPlan.stayCategories,
    destinations: Array.isArray(data.destinations)
      ? data.destinations.map((d) => ({
          id: d.id || Date.now().toString(),
          name: d.name || '',
          lat: d.lat,
          lng: d.lng,
          days: Number.isFinite(d.days) ? d.days : 1,
          notes: d.notes || '',
        }))
      : [],
  }
}

const addDestination = () => {
  plan.value.destinations.push({
    id: Date.now().toString(),
    name: '',
    days: 1,
  })
}

const removeDestination = (id: string) => {
  plan.value.destinations = plan.value.destinations.filter((d) => d.id !== id)
  if (destinationSuggestions.value[id]) {
    const { [id]: _, ...next } = destinationSuggestions.value
    destinationSuggestions.value = next
  }
}

const ensurePlacesService = async () => {
  await loadGoogleMapsScript({ requirePlaces: true })
  if (!autocompleteService.value && window.google?.maps?.places) {
    autocompleteService.value = new google.maps.places.AutocompleteService()
  }
}

const fetchPlaceSuggestions = async (query: string) => {
  const q = query.trim()
  if (q.length < 2) return []
  await ensurePlacesService()
  if (!autocompleteService.value) return []
  return new Promise<PlaceSuggestion[]>((resolve) => {
    autocompleteService.value!.getPlacePredictions(
      {
        input: q,
      },
      (predictions, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([])
          return
        }
        resolve(
          predictions.map((p) => ({
            description: p.description,
            placeId: p.place_id,
          })),
        )
      },
    )
  })
}

const handleOriginInput = async () => {
  originSuggestions.value = await fetchPlaceSuggestions(plan.value.origin)
}

const handleDestinationInput = async (destinationId: string, value: string) => {
  const list = await fetchPlaceSuggestions(value)
  destinationSuggestions.value = {
    ...destinationSuggestions.value,
    [destinationId]: list,
  }
}

const selectOriginSuggestion = (suggestion: PlaceSuggestion) => {
  plan.value.origin = suggestion.description
  originSuggestions.value = []
}

const selectDestinationSuggestion = (destinationId: string, suggestion: PlaceSuggestion) => {
  plan.value.destinations = plan.value.destinations.map((d) =>
    d.id === destinationId ? { ...d, name: suggestion.description } : d,
  )
  destinationSuggestions.value = { ...destinationSuggestions.value, [destinationId]: [] }
}

const clearOriginSuggestions = () => {
  setTimeout(() => {
    originSuggestions.value = []
  }, 150)
}

const clearDestinationSuggestions = (destinationId: string) => {
  setTimeout(() => {
    destinationSuggestions.value = { ...destinationSuggestions.value, [destinationId]: [] }
  }, 150)
}

const calculateDistance = async () => {
  if (!plan.value.origin || plan.value.destinations.length === 0) {
    showToast('Please enter origin and at least one destination', 'error')
    return
  }

  if (plan.value.destinations.some((d) => !d.name.trim())) {
    showToast('Please enter destination name', 'error')
    return
  }

  isLoadingDistance.value = true
  distanceError.value = ''
  try {
    const stops = [plan.value.origin, ...plan.value.destinations.map((d) => d.name)]
    let totalDistance = 0
    let totalDuration = 0
    const legs: Array<{
      origin: string
      destination: string
      distanceText: string
      durationText: string
    }> = []

    for (let i = 0; i < stops.length - 1; i += 1) {
      const res = await $fetch<{
        success: boolean
        distance?: { text: string; value: number }
        duration?: { text: string; value: number }
        error?: string
      }>('/api/travel/distance', {
        params: {
          origin: stops[i],
          destination: stops[i + 1],
          mode: 'driving',
        },
      })

      if (!res.success || !res.distance || !res.duration) {
        throw new Error(
          res.error || `Failed to calculate distance from "${stops[i]}" to "${stops[i + 1]}"`,
        )
      }

      totalDistance += res.distance.value
      totalDuration += res.duration.value
      legs.push({
        origin: stops[i],
        destination: stops[i + 1],
        distanceText: res.distance.text,
        durationText: res.duration.text,
      })
    }

    distanceData.value = {
      total: {
        distance: {
          text: `${(totalDistance / 1000).toFixed(1)} km`,
          value: totalDistance,
        },
        duration: {
          text: `${(totalDuration / 3600).toFixed(1)} hours`,
          value: totalDuration,
        },
      },
      legs,
    }

    await renderMapPreview(stops)
  } catch (e) {
    const errorMessage =
      (e as { data?: { error?: string } })?.data?.error ||
      (e as Error)?.message ||
      'Failed to calculate distance'
    distanceError.value = errorMessage
    showToast(distanceError.value, 'error')
  } finally {
    isLoadingDistance.value = false
  }
}

const syncRoadTripLegsFromRoute = () => {
  const origin = plan.value.origin?.trim()
  const destinations = (plan.value.destinations || []).filter((d) => d.name?.trim())
  if (!origin || destinations.length === 0) return

  const stops = [origin, ...destinations.map((d) => d.name.trim())]
  const legs: Array<{ id: string; from: string; to: string }> = []
  for (let i = 0; i < stops.length - 1; i += 1) {
    legs.push({
      id: `leg-${Date.now()}-${i}`,
      from: stops[i],
      to: stops[i + 1],
    })
  }
  plan.value.roadTrip.legs = legs
}

const addRoadTripLeg = () => {
  const id = `leg-${Date.now()}`
  plan.value.roadTrip.legs.push({ id, from: '', to: '' })
}

const removeRoadTripLeg = (id: string) => {
  if (plan.value.roadTrip.legs.length <= 1) {
    showToast('At least one leg is required', 'error')
    return
  }
  plan.value.roadTrip.legs = plan.value.roadTrip.legs.filter((l) => l.id !== id)
  const { [id]: _, ...rest } = legSuggestions.value
  legSuggestions.value = rest
}

const handleLegFromInput = async (legId: string, value: string) => {
  const list = await fetchPlaceSuggestions(value)
  legSuggestions.value = {
    ...legSuggestions.value,
    [legId]: { ...legSuggestions.value[legId], from: list, to: legSuggestions.value[legId]?.to ?? [] },
  }
}

const handleLegToInput = async (legId: string, value: string) => {
  const list = await fetchPlaceSuggestions(value)
  legSuggestions.value = {
    ...legSuggestions.value,
    [legId]: { from: legSuggestions.value[legId]?.from ?? [], ...legSuggestions.value[legId], to: list },
  }
}

const selectLegFromSuggestion = (legId: string, suggestion: PlaceSuggestion) => {
  const leg = plan.value.roadTrip.legs.find((l) => l.id === legId)
  if (leg) leg.from = suggestion.description
  legSuggestions.value = { ...legSuggestions.value, [legId]: { ...legSuggestions.value[legId], from: [] } }
}

const selectLegToSuggestion = (legId: string, suggestion: PlaceSuggestion) => {
  const leg = plan.value.roadTrip.legs.find((l) => l.id === legId)
  if (leg) leg.to = suggestion.description
  legSuggestions.value = { ...legSuggestions.value, [legId]: { ...legSuggestions.value[legId], to: [] } }
}

const clearLegFromSuggestions = (legId: string) => {
  setTimeout(() => {
    legSuggestions.value = {
      ...legSuggestions.value,
      [legId]: { ...legSuggestions.value[legId], from: [] },
    }
  }, 150)
}

const clearLegToSuggestions = (legId: string) => {
  setTimeout(() => {
    legSuggestions.value = {
      ...legSuggestions.value,
      [legId]: { ...legSuggestions.value[legId], to: [] },
    }
  }, 150)
}

const calculateRoadTripLegs = async () => {
  const legs = plan.value.roadTrip.legs.filter((l) => l.from?.trim() && l.to?.trim())
  if (!legs.length) {
    showToast('Enter From and To for at least one leg', 'error')
    return
  }
  isLoadingDistance.value = true
  distanceError.value = ''
  try {
    for (const leg of legs) {
      const res = await $fetch<{
        success: boolean
        distance?: { text: string; value: number }
        duration?: { text: string; value: number }
        error?: string
      }>('/api/travel/distance', {
        params: { origin: leg.from.trim(), destination: leg.to.trim(), mode: 'driving' },
      })
      if (!res.success || !res.distance || !res.duration) {
        throw new Error(res.error || `Failed: ${leg.from} → ${leg.to}`)
      }
      leg.distanceText = res.distance.text
      leg.durationText = res.duration.text
      leg.distanceValue = res.distance.value
      leg.durationValue = res.duration.value
    }
    showToast('Road trip legs calculated', 'success')
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string }
    const msg = err?.data?.error || err?.message || 'Failed to calculate road trip legs'
    distanceError.value = msg
    showToast(msg, 'error')
  } finally {
    isLoadingDistance.value = false
  }
}

const totalDistance = computed(() => {
  if (!distanceData.value) return 0
  return distanceData.value.total.distance.value / 1000
})

// Road trip distance from legs (sum of leg distances)
const roadTripDistance = computed(() => {
  const legs = plan.value.roadTrip.legs || []
  return legs.reduce((sum, l) => sum + (l.distanceValue || 0), 0) / 1000
})

const roadTripLegs = computed(() => plan.value.roadTrip.legs || [])

const totalTravelers = computed(() => {
  const adults = Math.max(0, Number(plan.value.adults) || 0)
  const kids = Math.max(0, Number(plan.value.kids) || 0)
  return adults + kids
})

const estimateRooms = computed(() => {
  const adults = Math.max(0, Number(plan.value.adults) || 0)
  const kids = Math.max(0, Number(plan.value.kids) || 0)
  if (adults + kids === 0) return 0
  const adultRooms = Math.ceil(adults / 2)
  const extraKids = Math.max(0, kids - adults * 2)
  const kidRooms = Math.ceil(extraKids / 2)
  return Math.max(1, adultRooms + kidRooms)
})

const estimatedFuelCost = computed(() => {
  const r = plan.value.roadTrip
  if (roadTripDistance.value <= 0 || r.mileage <= 0 || r.petrolPrice <= 0) return 0
  const liters = roadTripDistance.value / r.mileage
  return liters * r.petrolPrice
})

const estimatedTollsCost = computed(() => {
  if (roadTripDistance.value <= 0) return 0
  const tollsPerKm: Record<keyof typeof currencies, number> = {
    INR: 1.5,
    USD: 0.08,
    EUR: 0.07,
    GBP: 0.06,
  }
  const curr = plan.value.currency
  const rate = tollsPerKm[curr] || tollsPerKm.INR
  return roadTripDistance.value * rate
})

const estimatedParkingCost = computed(() => {
  if (roadTripDistance.value <= 0) return 0
  const parkingPerKm: Record<keyof typeof currencies, number> = {
    INR: 0.5,
    USD: 0.03,
    EUR: 0.025,
    GBP: 0.02,
  }
  const curr = plan.value.currency
  const rate = parkingPerKm[curr] || parkingPerKm.INR
  return roadTripDistance.value * rate
})

const estimatedSightseeingCost = computed(() => {
  // Estimate sightseeing cost based on number of destinations and days
  // Rough estimate: 5-10% of base trip cost per destination
  if (plan.value.destinations.length === 0 || totalDays.value === 0) return 0
  const costPerDestination: Record<keyof typeof currencies, number> = {
    INR: 500, // ₹500 per destination for sightseeing
    USD: 25, // $25 per destination
    EUR: 22, // €22 per destination
    GBP: 20, // £20 per destination
  }
  const curr = plan.value.currency
  const perDest = costPerDestination[curr] || costPerDestination.INR
  return plan.value.destinations.length * perDest * totalTravelers.value
})

const roadTripCost = computed(() => {
  const r = plan.value.roadTrip
  if (!r.enabled) return 0

  let cost = 0

  // Fuel: override if set, else auto-calculate from petrol/mileage
  if (r.fuelOverride > 0) {
    cost += r.fuelOverride
  } else if (roadTripDistance.value > 0 && r.mileage > 0 && r.petrolPrice > 0) {
    cost += estimatedFuelCost.value
  }

  // Tolls: override if set, else use estimated
  cost += r.tolls > 0 ? r.tolls : estimatedTollsCost.value
  // Parking: override if set, else use estimated
  cost += r.parking > 0 ? r.parking : estimatedParkingCost.value
  cost += r.misc + r.sightseeing

  return cost
})

const publicTransportCost = computed(() => {
  if (!plan.value.publicTransport.enabled) return 0
  const travelers = Math.max(1, totalTravelers.value || 1)
  let totalCost = 0

  plan.value.publicTransport.options.forEach((option) => {
    if (option.enabled) {
      const perPerson = option.cost + option.baggage
      totalCost += perPerson * travelers + option.transfer
    }
  })

  return totalCost
})

const publicTransportTime = computed(() => {
  if (!plan.value.publicTransport.enabled) return 0
  return plan.value.publicTransport.options
    .filter((opt) => opt.enabled)
    .reduce((sum, opt) => sum + opt.travelHours, 0)
})

const roadTripTime = computed(() => {
  const legs = plan.value.roadTrip.legs || []
  const totalSec = legs.reduce((sum, l) => sum + (l.durationValue || 0), 0)
  return totalSec / 3600
})

const estimatedTransportCost = computed(() => {
  if (!totalDistance.value || !plan.value.publicTransport.enabled) return 0
  let total = 0
  plan.value.publicTransport.options.forEach((option) => {
    if (option.enabled && option.costPerKm > 0) {
      total += totalDistance.value * option.costPerKm
    }
  })
  return total
})

const recommendation = computed(() => {
  const road = roadTripCost.value
  const transport = publicTransportCost.value
  const roadTime = roadTripTime.value
  const transportTime = publicTransportTime.value

  if (road === 0 && transport === 0) return null

  const savings = Math.abs(road - transport)

  if (road < transport) {
    return {
      recommended: 'Road Trip',
      savings: savings,
      reason: `Save ${formatCurrency(savings)} by driving. Takes ${roadTime.toFixed(1)} hours vs ${transportTime.toFixed(1)} hours by public transport.`,
    }
  } else if (transport < road) {
    return {
      recommended: 'Public Transport',
      savings: savings,
      reason: `Save ${formatCurrency(savings)} by using public transport. Takes ${transportTime.toFixed(1)} hours vs ${roadTime.toFixed(1)} hours by road.`,
    }
  } else {
    return {
      recommended: 'Either',
      savings: 0,
      reason: 'Both options cost the same. Choose based on time preference.',
    }
  }
})

const hotelTierPresets: Record<keyof typeof currencies, Record<HotelTier, number>> = {
  INR: { budget: 1500, mid: 3000, luxury: 8000 },
  USD: { budget: 70, mid: 140, luxury: 320 },
  EUR: { budget: 80, mid: 150, luxury: 320 },
  GBP: { budget: 70, mid: 130, luxury: 280 },
}

const stayCategoryLabels: Record<StayCategory, string> = {
  hotel: 'Hotel',
  apartment: 'Apartment',
  resort: 'Resort',
  hostel: 'Hostel',
  homestay: 'Homestay',
}

const stayCategoryIcons: Record<StayCategory, string> = {
  hotel: 'mdi:hotel',
  apartment: 'mdi:office-building',
  resort: 'mdi:beach',
  hostel: 'mdi:bed',
  homestay: 'mdi:home',
}

const getStayCategoryColor = (category: StayCategory, selected: boolean) => {
  const colors: Record<StayCategory, { border: string; bg: string; text: string; hover: string }> =
    {
      hotel: {
        border: 'border-rose-500',
        bg: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30',
        text: 'text-rose-700 dark:text-rose-300',
        hover: 'hover:border-rose-300 hover:bg-rose-50/50 dark:hover:bg-rose-900/10',
      },
      apartment: {
        border: 'border-indigo-500',
        bg: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30',
        text: 'text-indigo-700 dark:text-indigo-300',
        hover: 'hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10',
      },
      resort: {
        border: 'border-emerald-500',
        bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30',
        text: 'text-emerald-700 dark:text-emerald-300',
        hover: 'hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10',
      },
      hostel: {
        border: 'border-violet-500',
        bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30',
        text: 'text-violet-700 dark:text-violet-300',
        hover: 'hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-900/10',
      },
      homestay: {
        border: 'border-lime-500',
        bg: 'bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-900/30 dark:to-green-900/30',
        text: 'text-lime-700 dark:text-lime-300',
        hover: 'hover:border-lime-300 hover:bg-lime-50/50 dark:hover:bg-lime-900/10',
      },
    }
  const color = colors[category]
  if (selected) {
    return `${color.border} ${color.bg} ${color.text}`
  }
  return `border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${color.hover}`
}

const getStayCategoryIconClass = (category: StayCategory) => {
  const colors: Record<StayCategory, string> = {
    hotel: 'text-sm text-rose-600 dark:text-rose-400',
    apartment: 'text-sm text-indigo-600 dark:text-indigo-400',
    resort: 'text-sm text-emerald-600 dark:text-emerald-400',
    hostel: 'text-sm text-violet-600 dark:text-violet-400',
    homestay: 'text-sm text-lime-600 dark:text-lime-400',
  }
  return colors[category]
}

const getStayCategoryCheckClass = (category: StayCategory) => {
  const colors: Record<StayCategory, string> = {
    hotel: 'absolute top-0 right-0 text-rose-600 dark:text-rose-400 text-[10px]',
    apartment: 'absolute top-0 right-0 text-indigo-600 dark:text-indigo-400 text-[10px]',
    resort: 'absolute top-0 right-0 text-emerald-600 dark:text-emerald-400 text-[10px]',
    hostel: 'absolute top-0 right-0 text-violet-600 dark:text-violet-400 text-[10px]',
    homestay: 'absolute top-0 right-0 text-lime-600 dark:text-lime-400 text-[10px]',
  }
  return colors[category]
}

const getHotelTierLabel = (tier: HotelTier) => {
  const curr = plan.value.currency
  const presets = hotelTierPresets[curr] || hotelTierPresets.INR
  return formatCurrency(presets[tier])
}

const updateStayTier = (tier: HotelTier) => {
  plan.value.stay.tier = tier
  const curr = plan.value.currency
  const presets = hotelTierPresets[curr] || hotelTierPresets.INR
  plan.value.stay.costPerNight = presets[tier]
}

const totalDays = computed(() => {
  return plan.value.destinations.reduce((sum, d) => sum + d.days, 0)
})

const foodCost = computed(() => {
  if (!plan.value.food.enabled) return 0
  const travelers = Math.max(1, totalTravelers.value || 1)
  let total = 0

  // Sum daily costs
  Object.values(plan.value.food.dailyCosts).forEach((cost) => {
    total += cost * travelers
  })

  // Sum custom meal costs
  Object.values(plan.value.food.customMeals).forEach((dayMeals) => {
    Object.values(dayMeals).forEach((cost) => {
      total += cost * travelers
    })
  })

  return total
})

const sitesCost = computed(() => {
  if (!plan.value.sites.enabled) return 0
  return plan.value.sites.sites.reduce((sum, site) => sum + (site.cost || 0), 0)
})

const stayCost = computed(() => {
  if (!plan.value.stay.includeStay) return 0
  return (
    plan.value.stay.costPerNight *
    plan.value.stay.nights *
    (plan.value.stay.rooms || estimateRooms.value)
  )
})

const totalTripCost = computed(() => {
  return (
    roadTripCost.value +
    publicTransportCost.value +
    foodCost.value +
    sitesCost.value +
    stayCost.value
  )
})

const remainingBudget = computed(() => {
  if (plan.value.budget <= 0) return 0
  return plan.value.budget - totalTripCost.value
})

const budgetStatus = computed(() => {
  if (plan.value.budget <= 0) return null
  const remaining = remainingBudget.value
  if (remaining >= 0) {
    return {
      type: 'success',
      message: `Within budget! ${formatCurrency(remaining)} remaining`,
    }
  } else {
    return {
      type: 'warning',
      message: `Over budget by ${formatCurrency(Math.abs(remaining))}`,
    }
  }
})

const addTransportOption = () => {
  const stops = [plan.value.origin, ...plan.value.destinations.map((d) => d.name)].filter(Boolean)
  // Allow adding transport options even without origin/destination - user can fill in later

  // If there are multiple stops, let user choose which segment
  // For now, default to first to last, but allow multiple options
  const newOption = {
    id: Date.now().toString(),
    type: 'flight' as TransportType,
    enabled: true,
    cost: 0,
    transfer: 0,
    baggage: 0,
    travelHours: 2,
    costPerKm: 6,
    from: stops[0] || '',
    to: stops[stops.length - 1] || '',
  }
  plan.value.publicTransport.options.push(newOption)
}

const removeTransportOption = (id: string) => {
  plan.value.publicTransport.options = plan.value.publicTransport.options.filter(
    (opt) => opt.id !== id,
  )
}

const getTransportTypeLabel = (type: TransportType) => {
  const labels = {
    flight: 'Flight',
    cruise: 'Cruise',
    train: 'Train',
    taxi: 'Taxi',
  }
  return labels[type]
}

const getTransportTypeIcon = (type: TransportType) => {
  const icons = {
    flight: 'mdi:airplane',
    cruise: 'mdi:ferry',
    train: 'mdi:train',
    taxi: 'mdi:taxi',
  }
  return icons[type]
}

const updateFoodDailyCost = (day: number, cost: number) => {
  plan.value.food.dailyCosts[String(day)] = cost
}

const getFoodDailyCost = (day: number) => {
  return plan.value.food.dailyCosts[String(day)] || 0
}

const updateFoodMealCost = (day: number, mealType: string, cost: number) => {
  if (!plan.value.food.customMeals[String(day)]) {
    plan.value.food.customMeals[String(day)] = {}
  }
  plan.value.food.customMeals[String(day)][mealType] = cost
}

const getFoodMealCost = (day: number, mealType: string) => {
  return plan.value.food.customMeals[String(day)]?.[mealType] || 0
}

const addSite = () => {
  const newSite = {
    id: Date.now().toString(),
    name: '',
    location: '',
    description: '',
    cost: 0,
    day: 1,
    source: 'manual',
    url: '',
  }
  plan.value.sites.sites.push(newSite)
}

const removeSite = (id: string) => {
  plan.value.sites.sites = plan.value.sites.sites.filter((s) => s.id !== id)
}

const _searchPlaces = async (_query: string) => {
  // Placeholder for third-party integration (Google Places, TripAdvisor, etc.)
  // This would integrate with an API to fetch site details
  return []
}

const autoCalculateFuel = () => {
  if (roadTripDistance.value <= 0) {
    showToast('Please calculate legs first', 'error')
    return
  }
  plan.value.roadTrip.fuelOverride = 0
  if (plan.value.roadTrip.mileage <= 0) {
    // Set default mileage if not set (typical car: 12-15 km/L)
    plan.value.roadTrip.mileage = 13
  }
  if (plan.value.roadTrip.petrolPrice <= 0) {
    // Set default petrol price based on currency
    const defaults: Record<keyof typeof currencies, number> = {
      INR: 100,
      USD: 3.5,
      EUR: 1.6,
      GBP: 1.4,
    }
    plan.value.roadTrip.petrolPrice = defaults[plan.value.currency] || defaults.INR
  }
  showToast('Fuel cost calculated automatically', 'success')
}

const autoCalculateTolls = () => {
  if (roadTripDistance.value <= 0) {
    showToast('Please calculate legs first', 'error')
    return
  }
  plan.value.roadTrip.tolls = 0
  showToast('Tolls calculated automatically', 'success')
}

const autoCalculateSightseeing = () => {
  if (plan.value.destinations.length === 0) {
    showToast('Please add destinations first', 'error')
    return
  }
  plan.value.roadTrip.sightseeing = estimatedSightseeingCost.value
  showToast('Sightseeing cost estimated', 'success')
}

const durationPresetDays = computed(() => {
  if (plan.value.duration === 'short') return 2
  if (plan.value.duration === 'medium') return 4
  if (plan.value.duration === 'long') return 7
  return 9
})

const _applyDurationPreset = () => {
  const destCount = plan.value.destinations.length
  if (!destCount) {
    showToast('Add destinations before applying a duration preset', 'error')
    return
  }

  const total = durationPresetDays.value
  const base = Math.floor(total / destCount)
  let remainder = total % destCount

  plan.value.destinations = plan.value.destinations.map((d) => {
    const extra = remainder > 0 ? 1 : 0
    remainder -= extra
    return { ...d, days: Math.max(1, base + extra) }
  })
}

const itineraryDays = computed(() => {
  const days: Array<{ day: number; location: string }> = []
  let dayNum = 1
  for (const dest of plan.value.destinations) {
    const count = Math.max(1, dest.days || 1)
    for (let i = 0; i < count; i += 1) {
      days.push({ day: dayNum, location: dest.name || 'TBD' })
      dayNum += 1
    }
  }
  return days
})

const blockLabelsForMode = (mode: ItineraryBlockMode) => {
  if (mode === 2) return ['Morning', 'Evening']
  if (mode === 4) return ['Morning', 'Afternoon', 'Evening', 'Night']
  return ['Morning', 'Afternoon', 'Evening']
}

const activeBlockLabels = computed(() => blockLabelsForMode(plan.value.itinerary.blocksPerDay))

const syncItineraryNotes = () => {
  const notes = { ...plan.value.itinerary.notes }
  for (const day of itineraryDays.value) {
    const key = String(day.day)
    if (!notes[key]) notes[key] = {}
    for (const label of activeBlockLabels.value) {
      if (notes[key][label] === undefined) notes[key][label] = ''
    }
  }
  plan.value.itinerary.notes = notes
  plan.value.itinerary.blockLabels = activeBlockLabels.value
}

const setBlockMode = (mode: ItineraryBlockMode) => {
  plan.value.itinerary.blocksPerDay = mode
  plan.value.itinerary.blockLabels = blockLabelsForMode(mode)
  syncItineraryNotes()
}

const lastDestination = computed(() => {
  if (!plan.value.destinations.length) return ''
  return plan.value.destinations[plan.value.destinations.length - 1]?.name || ''
})

const addDays = (dateStr: string, days: number) => {
  if (!dateStr) return ''
  const dt = new Date(dateStr)
  dt.setDate(dt.getDate() + days)
  return dt.toISOString().split('T')[0]
}

const hotelSearchUrl = computed(() => {
  if (!plan.value.startDate || !lastDestination.value) return ''
  const checkin = plan.value.startDate
  const checkout = addDays(checkin, Math.max(1, totalDays.value))
  const dest = encodeURIComponent(lastDestination.value)
  return `https://www.booking.com/searchresults.html?ss=${dest}&checkin=${checkin}&checkout=${checkout}`
})

const _flightSearchUrl = computed(() => {
  if (!plan.value.startDate || !plan.value.origin || !lastDestination.value) return ''
  const dest = encodeURIComponent(lastDestination.value)
  const orig = encodeURIComponent(plan.value.origin)
  const depart = plan.value.startDate
  const ret = addDays(depart, Math.max(1, totalDays.value))
  return `https://www.google.com/travel/flights?q=Flights%20from%20${orig}%20to%20${dest}%20on%20${depart}%20return%20${ret}`
})

const _kayakSearchUrl = computed(() => {
  if (!plan.value.startDate || !plan.value.origin || !lastDestination.value) return ''
  const dest = encodeURIComponent(lastDestination.value)
  const orig = encodeURIComponent(plan.value.origin)
  const depart = plan.value.startDate
  const ret = addDays(depart, Math.max(1, totalDays.value))
  return `https://www.kayak.com/flights/${orig}-${dest}/${depart}/${ret}`
})

const _skyscannerSearchUrl = computed(() => {
  if (!plan.value.startDate || !plan.value.origin || !lastDestination.value) return ''
  const dest = encodeURIComponent(lastDestination.value)
  const orig = encodeURIComponent(plan.value.origin)
  const depart = plan.value.startDate
  const ret = addDays(depart, Math.max(1, totalDays.value))
  return `https://www.skyscanner.com/transport/flights/${orig}/${dest}/${depart}/${ret}/`
})

const destinationMultiplier = (name: string) => {
  const n = name.toLowerCase()
  const premium = [
    'new york',
    'london',
    'paris',
    'singapore',
    'tokyo',
    'sydney',
    'dubai',
    'san francisco',
    'los angeles',
  ]
  if (premium.some((c) => n.includes(c))) return 1.35
  return 1
}

const autoEstimateStayCost = () => {
  if (!lastDestination.value) {
    showToast('Please add at least one destination first', 'error')
    return
  }
  const curr = plan.value.currency
  const base = hotelTierPresets[curr] || hotelTierPresets.INR
  const tier = plan.value.stay.tier
  const multiplier = destinationMultiplier(lastDestination.value)
  plan.value.stay.costPerNight = Math.round(base[tier] * multiplier)
}

const renderMapPreview = async (stops: string[]) => {
  if (!mapRef.value || stops.length === 0) return
  isLoadingMap.value = true
  mapError.value = ''

  // Clear existing car marker
  if (carMarker.value) {
    carMarker.value.setMap(null)
    carMarker.value = null
  }

  try {
    await loadGoogleMapsScript({ requirePlaces: true })
    if (!mapInstance.value) {
      mapInstance.value = createMap(mapRef.value, { zoom: 5 })
    }
    if (!directionsService.value) {
      directionsService.value = new google.maps.DirectionsService()
    }
    if (!directionsRenderer.value) {
      directionsRenderer.value = new google.maps.DirectionsRenderer({ suppressMarkers: false })
      directionsRenderer.value.setMap(mapInstance.value)
    }

    const origin = stops[0]
    const destination = stops[stops.length - 1]
    const waypoints = stops.slice(1, -1).map((loc) => ({ location: loc, stopover: true }))

    const result = await directionsService.value.route({
      origin,
      destination,
      waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
    })
    directionsRenderer.value.setDirections(result)

    const legs = result.routes[0]?.legs || []
    const route = result.routes[0]
    const points: Array<{ name: string; lat: number; lng: number }> = []
    const coordinates: Array<{ lat: number; lng: number }> = []

    if (legs.length) {
      points.push({
        name: stops[0],
        lat: legs[0].start_location.lat(),
        lng: legs[0].start_location.lng(),
      })

      // Extract all coordinates from the route overview path
      if (route?.overview_path) {
        route.overview_path.forEach((point: google.maps.LatLng) => {
          coordinates.push({ lat: point.lat(), lng: point.lng() })
        })
      } else {
        // Fallback: extract from legs
        legs.forEach((leg, idx) => {
          points.push({
            name: stops[idx + 1] || `Stop ${idx + 1}`,
            lat: leg.end_location.lat(),
            lng: leg.end_location.lng(),
          })

          // Extract path points from the leg steps
          if (leg.steps) {
            leg.steps.forEach((step) => {
              if (step.path) {
                step.path.forEach((point: google.maps.LatLng) => {
                  coordinates.push({ lat: point.lat(), lng: point.lng() })
                })
              }
            })
          }
        })
      }
    }
    routeStops.value = points
    routeCoordinates.value =
      coordinates.length > 0 ? coordinates : points.map((p) => ({ lat: p.lat, lng: p.lng }))
  } catch (e) {
    mapError.value = e instanceof Error ? e.message : 'Failed to load map preview'
    showToast(mapError.value, 'error')
  } finally {
    isLoadingMap.value = false
  }
}

const getTransportMode = () => {
  // Use the first selected transport mode, or determine based on costs
  if (plan.value.transportModes.includes('road')) {
    return 'road'
  }
  if (plan.value.transportModes.length > 0) {
    return 'transport'
  }
  // Fallback: determine based on costs and enabled status
  if (
    plan.value.roadTrip.enabled &&
    (!plan.value.publicTransport.enabled || roadTripCost.value < publicTransportCost.value)
  ) {
    return 'road'
  }
  if (plan.value.publicTransport.enabled) {
    return 'transport'
  }
  return 'road' // default
}

const getAnimationIcon = (mode: 'road' | 'transport') => {
  if (mode === 'transport') {
    // Flight/airplane icon - simple airplane shape
    // Using a path that creates a triangle-like airplane pointing forward
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 5,
      strokeColor: '#0284c7',
      fillColor: '#0ea5e9',
      fillOpacity: 0.9,
      rotation: 0,
      strokeWeight: 2.5,
    }
  } else {
    // Car icon - using forward arrow (car-like, blue)
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 6,
      strokeColor: '#1e40af',
      fillColor: '#3b82f6',
      fillOpacity: 1,
      rotation: 0,
      strokeWeight: 2,
    }
  }
}

const captureFrame = async (): Promise<ImageData | null> => {
  if (!mapRef.value) return null
  try {
    // Use html2canvas if available, otherwise return null
    const html2canvas = (window as Window & { html2canvas?: unknown }).html2canvas
    if (!html2canvas) return null

    const canvas = await html2canvas(mapRef.value, {
      useCORS: true,
      logging: false,
      backgroundColor: null,
    })
    const ctx = canvas.getContext('2d')
    return ctx?.getImageData(0, 0, canvas.width, canvas.height) || null
  } catch (e) {
    console.error('Frame capture error:', e)
    return null
  }
}

const addWatermark = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const text = 'Nomadic Notions'
  ctx.save()
  ctx.font = 'bold 16px Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'

  // Add semi-transparent background for better visibility
  const textMetrics = ctx.measureText(text)
  const padding = 8
  const x = canvas.width - 10
  const y = canvas.height - 10

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillRect(
    x - textMetrics.width - padding,
    y - parseInt(ctx.font) - padding,
    textMetrics.width + padding * 2,
    parseInt(ctx.font) + padding * 2,
  )

  // Draw text with shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 2
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.fillStyle = '#1e40af'
  ctx.fillText(text, x, y)

  ctx.restore()
}

const downloadGif = async () => {
  if (animationFrames.value.length === 0) {
    showToast('No animation frames captured', 'error')
    return
  }

  try {
    // Wait a bit for libraries to load if needed
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Check if gif.js is available
    const GIF = (window as Window & { GIF?: unknown }).GIF
    if (!GIF) {
      showToast('GIF library not loaded. Please refresh the page and try again.', 'error')
      return
    }

    const firstFrame = animationFrames.value[0]
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: firstFrame.width,
      height: firstFrame.height,
      repeat: 0,
    })

    // Process frames with watermark
    for (const frame of animationFrames.value) {
      const canvas = document.createElement('canvas')
      canvas.width = frame.width
      canvas.height = frame.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.putImageData(frame, 0, 0)
        addWatermark(canvas)
        gif.addFrame(canvas, { delay: 150 })
      }
    }

    gif.on('finished', (blob: Blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nomadic-notions-trip-route-${Date.now()}.gif`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('GIF downloaded successfully with watermark', 'success')
      animationFrames.value = []
    })

    gif.on('progress', (p: number) => {
      console.log('GIF progress:', Math.round(p * 100) + '%')
    })

    gif.render()
  } catch (error) {
    console.error('GIF creation error:', error)
    showToast('Failed to create GIF. Please try again.', 'error')
    animationFrames.value = []
  }
}

const animateRoute = async (recordGif = false) => {
  if (!mapInstance.value || routeCoordinates.value.length === 0 || isAnimatingRoute.value) return
  isAnimatingRoute.value = true
  isRecordingGif.value = recordGif
  animationFrames.value = []

  try {
    // Remove existing marker if any
    if (carMarker.value) {
      carMarker.value.setMap(null)
      carMarker.value = null
    }

    // Determine transport mode and create appropriate marker
    const transportMode = getTransportMode()
    const iconConfig = getAnimationIcon(transportMode)

    if (mapInstance.value) {
      const startPoint = routeCoordinates.value[0]
      carMarker.value = new google.maps.Marker({
        map: mapInstance.value,
        position: new google.maps.LatLng(startPoint.lat, startPoint.lng),
        icon: iconConfig,
        zIndex: 1000,
      })
    }

    if (!carMarker.value) return

    // Animate along the route path
    const totalPoints = routeCoordinates.value.length
    const animationDuration = Math.min(15000, Math.max(5000, totalPoints * 20)) // 5-15 seconds
    const stepInterval = Math.max(10, animationDuration / totalPoints)
    const panInterval = Math.max(50, totalPoints / 20) // Pan every N points
    const captureInterval = Math.max(5, Math.floor(totalPoints / 30)) // Capture ~30 frames

    for (let i = 0; i < totalPoints; i++) {
      const point = routeCoordinates.value[i]
      const nextPoint = routeCoordinates.value[i + 1]

      // Update marker position
      carMarker.value.setPosition(new google.maps.LatLng(point.lat, point.lng))

      // Calculate rotation angle if we have a next point
      if (nextPoint && google.maps.geometry) {
        try {
          const heading = google.maps.geometry.spherical.computeHeading(
            new google.maps.LatLng(point.lat, point.lng),
            new google.maps.LatLng(nextPoint.lat, nextPoint.lng),
          )
          const icon = carMarker.value.getIcon()
          if (typeof icon === 'object' && icon !== null) {
            carMarker.value.setIcon({
              ...icon,
              rotation: heading,
            })
          }
        } catch {
          // Geometry library might not be loaded, skip rotation
        }
      }

      // Pan map to follow the marker periodically
      if (i % panInterval === 0 || i === totalPoints - 1) {
        mapInstance.value.panTo(new google.maps.LatLng(point.lat, point.lng))
      }

      // Capture frame for GIF if recording
      if (recordGif && i % captureInterval === 0) {
        const frame = await captureFrame()
        if (frame) {
          animationFrames.value.push(frame)
        }
      }

      await new Promise((resolve) => setTimeout(resolve, stepInterval))
    }

    // Capture final frame
    if (recordGif) {
      const frame = await captureFrame()
      if (frame) {
        animationFrames.value.push(frame)
      }
    }

    // Keep the marker visible at the end
    if (routeCoordinates.value.length > 0) {
      const lastPoint = routeCoordinates.value[routeCoordinates.value.length - 1]
      carMarker.value.setPosition(new google.maps.LatLng(lastPoint.lat, lastPoint.lng))
      mapInstance.value.panTo(new google.maps.LatLng(lastPoint.lat, lastPoint.lng))
    }

    // If recording, create and download GIF
    if (recordGif && animationFrames.value.length > 0) {
      await downloadGif()
    }
  } catch (error) {
    console.error('Animation error:', error)
    showToast('Animation failed. Please try again.', 'error')
  } finally {
    isAnimatingRoute.value = false
    isRecordingGif.value = false
  }
}

const loadTemplates = async () => {
  isLoadingTemplates.value = true
  try {
    const res = await $fetch<{ success: boolean; plans: TravelPlanTemplate[]; error?: string }>(
      '/api/travel/plans',
      {
        params: { templates: 'true' },
      },
    )
    if (res.success && res.plans) {
      templates.value = res.plans || []
      // Auto-load default template if available and no plan is loaded
      if (templates.value.length > 0 && !plan.value.tripName && currentTemplateId.value === null) {
        const defaultTemplate = templates.value.find((t) => t.is_default)
        if (defaultTemplate) {
          applyTemplate(defaultTemplate)
        }
      }
    } else {
      throw new Error(res.error || 'Failed to load templates')
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to load templates'
    showToast(errorMessage, 'error')
    templates.value = []
  } finally {
    isLoadingTemplates.value = false
  }
}

const openSaveModal = () => {
  templateName.value = plan.value.tripName || 'My Trip'
  templateDescription.value = ''
  isDefaultTemplate.value = false
  saveAsNew.value = currentTemplateId.value === null
  showSaveModal.value = true
}

const saveTemplate = async () => {
  if (!templateName.value.trim()) {
    showToast('Template name is required', 'error')
    return
  }
  isSavingTemplate.value = true
  try {
    const payload = {
      name: templateName.value.trim(),
      description: templateDescription.value.trim() || null,
      planData: plan.value,
      isTemplate: true,
      isDefault: isDefaultTemplate.value,
    }

    if (currentTemplateId.value && !saveAsNew.value) {
      const res = await $fetch<{ success: boolean; plan?: TravelPlanTemplate; error?: string }>(
        `/api/travel/plans/${currentTemplateId.value}`,
        {
          method: 'PUT',
          body: payload,
        },
      )
      if (res.success && res.plan) {
        currentTemplateId.value = res.plan.id
      }
    } else {
      const res = await $fetch<{ success: boolean; plan?: TravelPlanTemplate; error?: string }>(
        '/api/travel/plans',
        {
          method: 'POST',
          body: payload,
        },
      )
      if (res.success && res.plan) {
        // Clear currentTemplateId when saving as new
        if (saveAsNew.value) {
          currentTemplateId.value = null
        } else {
          currentTemplateId.value = res.plan.id
        }
      }
    }

    showToast('Template saved', 'success')
    showSaveModal.value = false
    await loadTemplates()
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to save template'
    showToast(errorMessage, 'error')
  } finally {
    isSavingTemplate.value = false
  }
}

const applyTemplate = (tpl: TravelPlanTemplate) => {
  try {
    // Validate plan data structure
    if (!tpl.plan_data || typeof tpl.plan_data !== 'object') {
      throw new Error('Invalid template data structure')
    }
    const normalized = normalizePlan(tpl.plan_data)
    plan.value = normalized
    currentTemplateId.value = tpl.id
    // Update previous currency to match loaded template
    previousCurrency.value = normalized.currency
    showTemplatesModal.value = false
    showToast(`Loaded template: ${tpl.name}`, 'success')
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to load template'
    showToast(errorMessage, 'error')
  }
}

const deleteTemplate = async (tpl: TravelPlanTemplate) => {
  if (!confirm(`Delete template "${tpl.name}"?`)) return
  try {
    await $fetch(`/api/travel/plans/${tpl.id}`, { method: 'DELETE' })
    if (currentTemplateId.value === tpl.id) currentTemplateId.value = null
    showToast('Template deleted', 'success')
    await loadTemplates()
  } catch (e) {
    showToast(e instanceof Error ? e.message : 'Failed to delete template', 'error')
  }
}

// Export functions
const exportToCSV = () => {
  isExporting.value = true
  try {
    const rows: string[] = []
    rows.push('Travel Plan Export')
    rows.push(`Trip Name,${plan.value.tripName || 'Untitled'}`)
    rows.push(`Origin,${plan.value.origin}`)
    rows.push(`Start Date,${plan.value.startDate || 'Not set'}`)
    rows.push(`Duration,${durationLabels[plan.value.duration]}`)
    rows.push(
      `Travelers,${totalTravelers.value} (${plan.value.adults} adults, ${plan.value.kids} kids)`,
    )
    rows.push(`Budget,${formatCurrency(plan.value.budget)}`)
    rows.push(`Total Cost,${formatCurrency(totalTripCost.value)}`)
    rows.push(`Remaining,${formatCurrency(remainingBudget.value)}`)
    rows.push('')
    rows.push('Destinations')
    rows.push('Name,Days,Notes')
    plan.value.destinations.forEach((dest) => {
      rows.push(`${dest.name},${dest.days},${dest.notes || ''}`)
    })
    rows.push('')
    rows.push('Cost Breakdown')
    rows.push('Category,Amount')
    if (roadTripCost.value > 0) rows.push(`Road Trip,${formatCurrency(roadTripCost.value)}`)
    if (publicTransportCost.value > 0)
      rows.push(`Public Transport,${formatCurrency(publicTransportCost.value)}`)
    if (stayCost.value > 0) rows.push(`Accommodation,${formatCurrency(stayCost.value)}`)
    if (foodCost.value > 0) rows.push(`Food,${formatCurrency(foodCost.value)}`)
    if (sitesCost.value > 0) rows.push(`Sites,${formatCurrency(sitesCost.value)}`)
    rows.push(`Total,${formatCurrency(totalTripCost.value)}`)

    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `${plan.value.tripName || 'travel-plan'}-${new Date().toISOString().split('T')[0]}.csv`,
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('CSV exported successfully', 'success')
  } catch (e) {
    showToast(e instanceof Error ? e.message : 'Failed to export CSV', 'error')
  } finally {
    isExporting.value = false
    showExportMenu.value = false
  }
}

const exportToPDF = async () => {
  isExporting.value = true
  try {
    // Use window.print() for now - can be enhanced with jsPDF later
    window.print()
    showToast('Use browser print to save as PDF', 'info')
  } catch (e) {
    showToast(e instanceof Error ? e.message : 'Failed to export PDF', 'error')
  } finally {
    isExporting.value = false
    showExportMenu.value = false
  }
}

// Drag and drop for destinations
const handleDragStart = (event: DragEvent, destinationId: string) => {
  draggedDestinationId.value = destinationId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', destinationId)
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (event: DragEvent, targetDestinationId: string) => {
  event.preventDefault()
  if (!draggedDestinationId.value || draggedDestinationId.value === targetDestinationId) {
    draggedDestinationId.value = null
    return
  }

  const draggedIndex = plan.value.destinations.findIndex((d) => d.id === draggedDestinationId.value)
  const targetIndex = plan.value.destinations.findIndex((d) => d.id === targetDestinationId)

  if (draggedIndex === -1 || targetIndex === -1) {
    draggedDestinationId.value = null
    return
  }

  const [removed] = plan.value.destinations.splice(draggedIndex, 1)
  plan.value.destinations.splice(targetIndex, 0, removed)
  draggedDestinationId.value = null
  showToast('Destination order updated', 'success')
}

// Expense management
const addExpense = () => {
  plan.value.expenses.items.push({
    id: Date.now().toString(),
    category: 'misc',
    description: '',
    amount: 0,
    date: plan.value.startDate || new Date().toISOString().split('T')[0],
    notes: '',
  })
}

const removeExpense = (id: string) => {
  plan.value.expenses.items = plan.value.expenses.items.filter((e) => e.id !== id)
}

const totalExpenses = computed(() => {
  return plan.value.expenses.items.reduce((sum, item) => sum + (item.amount || 0), 0)
})

// Packing list management
const addPackingItem = (category: keyof typeof plan.value.packing.lists) => {
  plan.value.packing.lists[category].push({
    id: Date.now().toString(),
    item: '',
    packed: false,
  })
}

const removePackingItem = (category: keyof typeof plan.value.packing.lists, id: string) => {
  plan.value.packing.lists[category] = plan.value.packing.lists[category].filter(
    (item) => item.id !== id,
  )
}

const packingProgress = computed(() => {
  const allItems = Object.values(plan.value.packing.lists).flat()
  if (allItems.length === 0) return 0
  const packed = allItems.filter((item) => item.packed).length
  return Math.round((packed / allItems.length) * 100)
})

// Cost breakdown data for visualization
const costBreakdown = computed(() => {
  const breakdown = []
  if (roadTripCost.value > 0)
    breakdown.push({ label: 'Road Trip', value: roadTripCost.value, color: '#f97316' })
  if (publicTransportCost.value > 0)
    breakdown.push({
      label: 'Public Transport',
      value: publicTransportCost.value,
      color: '#0ea5e9',
    })
  if (stayCost.value > 0)
    breakdown.push({ label: 'Accommodation', value: stayCost.value, color: '#10b981' })
  if (foodCost.value > 0) breakdown.push({ label: 'Food', value: foodCost.value, color: '#f59e0b' })
  if (sitesCost.value > 0)
    breakdown.push({ label: 'Sites', value: sitesCost.value, color: '#8b5cf6' })
  if (totalExpenses.value > 0)
    breakdown.push({ label: 'Other Expenses', value: totalExpenses.value, color: '#6366f1' })
  return breakdown
})

// Budget alerts
const budgetAlerts = computed(() => {
  const alerts: Array<{ type: 'warning' | 'error' | 'info'; message: string }> = []
  if (plan.value.budget > 0) {
    const percentage = (totalTripCost.value / plan.value.budget) * 100
    if (percentage > 100) {
      alerts.push({
        type: 'error',
        message: `Over budget by ${formatCurrency(Math.abs(remainingBudget.value))}`,
      })
    } else if (percentage > 90) {
      alerts.push({
        type: 'warning',
        message: `Budget is ${percentage.toFixed(0)}% used. Consider reducing costs.`,
      })
    } else if (percentage < 50 && totalTripCost.value > 0) {
      alerts.push({
        type: 'info',
        message: `Only ${percentage.toFixed(0)}% of budget used. You have room for more activities.`,
      })
    }
  }
  if (plan.value.destinations.length === 0) {
    alerts.push({ type: 'info', message: 'Add destinations to start planning your trip' })
  }
  if (!plan.value.startDate) {
    alerts.push({ type: 'info', message: 'Set a start date for better planning' })
  }
  return alerts
})

watch(
  [() => itineraryDays.value.length, () => plan.value.itinerary.blocksPerDay],
  syncItineraryNotes,
  {
    immediate: true,
  },
)
watch(
  () => plan.value.currency,
  () => {
    // Update hotel cost when currency changes if using tier preset
    const curr = plan.value.currency
    const presets = hotelTierPresets[curr] || hotelTierPresets.INR
    const currentTier = plan.value.stay.tier
    // Only update if the current cost matches the old preset (user hasn't customized)
    const oldPresets = hotelTierPresets[previousCurrency.value] || hotelTierPresets.INR
    if (plan.value.stay.costPerNight === oldPresets[currentTier]) {
      plan.value.stay.costPerNight = presets[currentTier]
    }
    // Update budget preset if it matches the old preset
    const oldBudgetPresets = budgetPresets[previousCurrency.value] || budgetPresets.INR
    const newBudgetPresets = budgetPresets[curr] || budgetPresets.INR
    if (plan.value.budget === oldBudgetPresets[plan.value.duration]) {
      plan.value.budget = newBudgetPresets[plan.value.duration]
    }
    // Update previous currency for next change
    previousCurrency.value = curr
  },
  { immediate: false },
)
const _setActiveTab = (tab: typeof activeTab.value) => {
  activeTab.value = tab
}

const toggleTransportMode = (mode: TransportMode) => {
  const index = plan.value.transportModes.indexOf(mode)
  if (index > -1) {
    // Deselect
    plan.value.transportModes.splice(index, 1)
    // Disable corresponding transport option
    if (mode === 'road') {
      plan.value.roadTrip.enabled = false
    } else {
      plan.value.publicTransport.enabled = false
    }
  } else {
    // Select
    plan.value.transportModes.push(mode)
    // Enable corresponding transport option
    if (mode === 'road') {
      plan.value.roadTrip.enabled = true
    } else {
      plan.value.publicTransport.enabled = true
      // Auto-add transport option if none exists
      if (plan.value.publicTransport.options.length === 0) {
        addTransportOption()
        // Set the type based on mode
        if (plan.value.publicTransport.options.length > 0) {
          const option = plan.value.publicTransport.options[0]
          if (mode === 'flight') option.type = 'flight'
          else if (mode === 'train') option.type = 'train'
          else if (mode === 'taxi') option.type = 'taxi'
          else if (mode === 'cruise') option.type = 'cruise'
        }
      }
    }
  }
}

const toggleStayCategory = (category: StayCategory) => {
  const index = plan.value.stayCategories.indexOf(category)
  if (index > -1) {
    plan.value.stayCategories.splice(index, 1)
  } else {
    plan.value.stayCategories.push(category)
  }
  // If any category selected, enable stay
  plan.value.stay.includeStay = plan.value.stayCategories.length > 0
  // Set default category if none selected yet
  if (plan.value.stayCategories.length === 1) {
    plan.value.stay.category = category
  }
}

watch(
  () => plan.value.stayCategories.length,
  (length) => {
    plan.value.stay.includeStay = length > 0
    // Auto-update budget when stay categories are added/removed
    autoUpdateBudget()
  },
)

// Auto-update budget based on selected options with approximations
const autoUpdateBudget = () => {
  let estimatedCost = 0
  const travelers = Math.max(1, totalTravelers.value || 1)
  const days = Math.max(
    1,
    totalDays.value || plan.value.duration === 'short'
      ? 3
      : plan.value.duration === 'medium'
        ? 7
        : plan.value.duration === 'long'
          ? 14
          : 21,
  )
  const curr = plan.value.currency

  // Estimate transport costs with approximations
  // Always provide approximations when transport modes are selected, even if not enabled or distance is 0
  if (plan.value.transportModes.includes('road')) {
    if (plan.value.roadTrip.enabled && roadTripCost.value > 0) {
      // Use actual calculated cost if available
      estimatedCost += roadTripCost.value
    } else if (totalDistance.value > 0) {
      // Approximate road trip cost: fuel + tolls + misc based on distance
      const fuelEstimate =
        totalDistance.value *
        0.08 *
        (curr === 'INR' ? 100 : curr === 'USD' ? 3 : curr === 'EUR' ? 2.5 : 2.5) // ~8L/100km * fuel price
      const tollsEstimate =
        totalDistance.value *
        (curr === 'INR' ? 2 : curr === 'USD' ? 0.05 : curr === 'EUR' ? 0.04 : 0.04) // ~2 INR per km
      estimatedCost += fuelEstimate + tollsEstimate + totalDistance.value * 0.1 // 10% for parking/misc
    } else {
      // Base approximation for road trip without distance: ~500-2000 per person
      const baseRoadTripCost =
        curr === 'INR' ? 3000 : curr === 'USD' ? 150 : curr === 'EUR' ? 120 : 120
      estimatedCost += baseRoadTripCost * travelers
    }
  }

  // Public transport approximations
  const publicTransportModes = plan.value.transportModes.filter((m) => m !== 'road')
  if (publicTransportModes.length > 0) {
    if (plan.value.publicTransport.enabled && publicTransportCost.value > 0) {
      // Use actual calculated cost if available
      estimatedCost += publicTransportCost.value
    } else {
      // Approximate public transport cost based on selected modes
      const hasFlight = plan.value.transportModes.includes('flight')
      const hasTrain = plan.value.transportModes.includes('train')
      const hasTaxi = plan.value.transportModes.includes('taxi')
      const hasCruise = plan.value.transportModes.includes('cruise')

      if (hasFlight) {
        // Approximate flight cost: ~500-2000 per person depending on distance
        const baseFlightCost =
          curr === 'INR' ? 8000 : curr === 'USD' ? 300 : curr === 'EUR' ? 250 : 250
        estimatedCost += baseFlightCost * travelers
      }
      if (hasTrain) {
        // Approximate train cost: ~200-800 per person
        const baseTrainCost = curr === 'INR' ? 1500 : curr === 'USD' ? 50 : curr === 'EUR' ? 40 : 40
        estimatedCost += baseTrainCost * travelers
      }
      if (hasTaxi) {
        // Approximate taxi cost: ~50-200 per person
        const baseTaxiCost = curr === 'INR' ? 500 : curr === 'USD' ? 20 : curr === 'EUR' ? 15 : 15
        estimatedCost += baseTaxiCost * travelers
      }
      if (hasCruise) {
        // Approximate cruise cost: ~1000-5000 per person
        const baseCruiseCost =
          curr === 'INR' ? 15000 : curr === 'USD' ? 500 : curr === 'EUR' ? 400 : 400
        estimatedCost += baseCruiseCost * travelers
      }
    }
  }

  // Estimate stay costs with approximations
  if (plan.value.stayCategories.length > 0) {
    if (plan.value.stay.includeStay && stayCost.value > 0) {
      estimatedCost += stayCost.value
    } else if (plan.value.stay.includeStay) {
      // Approximate stay cost based on category
      const baseStayCost = curr === 'INR' ? 2000 : curr === 'USD' ? 80 : curr === 'EUR' ? 70 : 70
      const nights = plan.value.stay.nights || days
      const rooms = plan.value.stay.rooms || Math.ceil(travelers / 2)
      estimatedCost += baseStayCost * nights * rooms
    }
  }

  // Estimate food costs with approximations
  if (plan.value.food.enabled) {
    if (foodCost.value > 0) {
      estimatedCost += foodCost.value
    } else {
      // Approximate food cost: ~500-2000 per person per day
      const dailyFoodCost = curr === 'INR' ? 1000 : curr === 'USD' ? 50 : curr === 'EUR' ? 40 : 40
      estimatedCost += dailyFoodCost * days * travelers
    }
  }

  // Estimate sites costs with approximations
  if (plan.value.sites.enabled) {
    if (sitesCost.value > 0) {
      estimatedCost += sitesCost.value
    } else {
      // Approximate sites cost: ~200-1000 per person per day
      const dailySitesCost = curr === 'INR' ? 500 : curr === 'USD' ? 30 : curr === 'EUR' ? 25 : 25
      estimatedCost += dailySitesCost * days * travelers
    }
  }

  // Update budget to be at least 20% more than estimated cost (buffer)
  if (estimatedCost > 0) {
    const suggestedBudget = Math.round(estimatedCost * 1.2)
    // Auto-update if budget is 0 or if the suggested budget is significantly different
    if (plan.value.budget === 0) {
      plan.value.budget = suggestedBudget
    } else if (plan.value.budget > 0) {
      // Only update if the difference is significant (more than 15% change)
      const currentBudget = plan.value.budget
      const diffPercent = Math.abs(currentBudget - suggestedBudget) / currentBudget
      if (diffPercent > 0.15 && suggestedBudget > currentBudget) {
        // Only increase, not decrease, to respect user's manual input
        plan.value.budget = suggestedBudget
      }
    }
  } else if (plan.value.budget === 0) {
    // If no costs yet, use base preset
    applyBudgetPreset()
  }
}

// Watch for transport mode and stay category changes to auto-update budget
watch(
  () => plan.value.transportModes,
  () => {
    autoUpdateBudget()
  },
  { deep: true },
)

watch(
  () => [plan.value.origin, plan.value.destinations],
  () => {
    if (plan.value.transportModes.includes('road')) {
      syncRoadTripLegsFromRoute()
    }
  },
  { deep: true },
)

watch(
  () => plan.value.stayCategories,
  () => {
    autoUpdateBudget()
  },
  { deep: true },
)

// Watch for cost changes and auto-update budget (with debounce to avoid too frequent updates)
let budgetUpdateTimeout: ReturnType<typeof setTimeout> | null = null
watch(
  [
    () => roadTripCost.value,
    () => publicTransportCost.value,
    () => stayCost.value,
    () => foodCost.value,
    () => sitesCost.value,
  ],
  () => {
    if (budgetUpdateTimeout) clearTimeout(budgetUpdateTimeout)
    budgetUpdateTimeout = setTimeout(() => {
      autoUpdateBudget()
    }, 500) // Debounce by 500ms
  },
)

watch(
  () => plan.value.duration,
  () => {
    // Auto-update budget if it matches the current preset (factored by travelers)
    const curr = plan.value.currency
    const presets = budgetPresets[curr] || budgetPresets.INR
    const oldPresets = budgetPresets.INR
    const travelers = Math.max(1, totalTravelers.value || 1)
    const expectedBudget = presets[plan.value.duration] * travelers
    const oldExpectedBudget = oldPresets[plan.value.duration] * travelers
    if (plan.value.budget === oldExpectedBudget || plan.value.budget === 0) {
      plan.value.budget = expectedBudget
    }
  },
  { immediate: true },
)
watch(
  () => totalTravelers.value,
  () => {
    // Auto-update budget if it matches the preset pattern (base preset × old traveler count)
    const basePreset = getBaseBudgetPreset()
    const oldTravelers = Math.max(1, totalTravelers.value || 1)
    // Only auto-update if budget matches the pattern of base preset × some traveler count
    const budgetPerPerson = plan.value.budget / oldTravelers
    if (Math.abs(budgetPerPerson - basePreset) < basePreset * 0.1) {
      // Budget is close to base preset per person, update it
      plan.value.budget = basePreset * Math.max(1, totalTravelers.value || 1)
    }
  },
)
onMounted(async () => {
  const ok = await ensureAuth()
  if (!ok) return
  await loadTemplates()
  syncItineraryNotes()
  // Initialize budget if not set
  if (plan.value.budget === 0) {
    applyBudgetPreset()
  }
})
</script>

<template>
  <div class="py-6 sm:py-10 container mx-auto max-w-7xl px-3 sm:px-6 w-full overflow-x-hidden">
    <div class="text-center mb-8 sm:mb-12">
      <div class="flex flex-row flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-3">
        <NuxtLink
          to="/dev"
          class="inline-flex items-center text-sm text-sky-600 dark:text-sky-400 hover:underline"
        >
          <Icon icon="mdi:arrow-left" class="mr-1.5 text-base" />
          Back to Utilities
        </NuxtLink>
        <span class="hidden sm:inline text-gray-300 dark:text-slate-600">|</span>
        <button
          type="button"
          class="inline-flex items-center px-2.5 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          @click="showTemplatesModal = true"
        >
          <Icon icon="mdi:file-multiple" class="mr-1.5 text-base" />
          Templates
        </button>
        <button
          type="button"
          class="inline-flex items-center px-2.5 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
          @click="openSaveModal"
        >
          <Icon icon="mdi:content-save" class="mr-1.5 text-base" />
          Save
        </button>
        <div class="relative">
          <button
            type="button"
            class="inline-flex items-center px-2.5 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            @click="showExportMenu = !showExportMenu"
            @blur="closeExportMenu"
          >
            <Icon icon="mdi:download" class="mr-1.5 text-base" />
            Export
            <Icon icon="mdi:chevron-down" class="ml-1.5 text-xs" />
          </button>
          <div
            v-if="showExportMenu"
            class="absolute right-0 mt-1 w-40 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-50"
            @click.stop
            @blur="closeExportMenu"
          >
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
              :disabled="isExporting"
              @click="exportToCSV"
            >
              <Icon icon="mdi:file-excel" class="text-green-600" />
              Export CSV
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
              :disabled="isExporting"
              @click="exportToPDF"
            >
              <Icon icon="mdi:file-pdf" class="text-red-600" />
              Export PDF
            </button>
          </div>
        </div>
      </div>
      <h1 class="text-3xl sm:text-4xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
        Travel Planner
      </h1>
      <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
        Plan your trip, compare road vs flight costs, and find the most cost-effective option
      </p>
    </div>

    <div
      class="mb-6 border-b border-gray-300 dark:border-slate-700 overflow-x-auto whitespace-nowrap w-full max-w-full min-w-0"
    >
      <div class="flex gap-2 px-1">
        <button
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'plan'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400',
          ]"
          @click="activeTab = 'plan'"
        >
          <Icon icon="mdi:map-outline" class="inline mr-1.5" />
          Trip Plan
        </button>
        <button
          v-if="plan.transportModes.length > 0"
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'transport-costs'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400',
          ]"
          @click="activeTab = 'transport-costs'"
        >
          <Icon icon="mdi:car-multiple" class="inline mr-1.5" />
          Transport
        </button>
        <button
          v-if="plan.stayCategories.length > 0 || plan.food.enabled || plan.sites.enabled"
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'accommodation-activities'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400',
          ]"
          @click="activeTab = 'accommodation-activities'"
        >
          <Icon icon="mdi:home-group" class="inline mr-1.5" />
          Accommodation & Activities
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'comparison'
              ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 border-b-2 border-violet-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400',
          ]"
          @click="activeTab = 'comparison'"
        >
          <Icon icon="mdi:chart-line" class="inline mr-1.5" />
          Comparison
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'itinerary'
              ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border-b-2 border-rose-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400',
          ]"
          @click="activeTab = 'itinerary'"
        >
          <Icon icon="mdi:calendar-text" class="inline mr-1.5" />
          Itinerary
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'expenses'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400',
          ]"
          @click="activeTab = 'expenses'"
        >
          <Icon icon="mdi:wallet" class="inline mr-1.5" />
          Expenses
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'packing'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border-b-2 border-amber-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400',
          ]"
          @click="activeTab = 'packing'"
        >
          <Icon icon="mdi:luggage" class="inline mr-1.5" />
          Packing
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'documents'
              ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 border-b-2 border-teal-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400',
          ]"
          @click="activeTab = 'documents'"
        >
          <Icon icon="mdi:file-document" class="inline mr-1.5" />
          Documents
        </button>
      </div>
    </div>

    <!-- Budget Alerts -->
    <div v-if="budgetAlerts.length > 0" class="mb-4 space-y-2">
      <div
        v-for="(alert, idx) in budgetAlerts"
        :key="idx"
        class="rounded-lg p-3 border"
        :class="
          alert.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : alert.type === 'warning'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
        "
      >
        <div class="flex items-center gap-2">
          <Icon
            :icon="
              alert.type === 'error'
                ? 'mdi:alert-circle'
                : alert.type === 'warning'
                  ? 'mdi:alert'
                  : 'mdi:information'
            "
            class="text-lg"
          />
          <span class="text-sm font-medium">{{ alert.message }}</span>
        </div>
      </div>
    </div>

    <div
      class="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-slate-800 min-w-0 overflow-x-hidden"
    >
      <!-- Trip Plan Tab - ALL INPUTS HERE -->
      <div v-if="activeTab === 'plan'" class="space-y-6">
        <!-- Trip Summary Card -->
        <div
          v-if="
            plan.tripName ||
            plan.origin ||
            (plan.destinations && plan.destinations.length > 0) ||
            (plan.transportModes && plan.transportModes.length > 0) ||
            (plan.stayCategories && plan.stayCategories.length > 0)
          "
          class="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-4 sm:p-5"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between flex-wrap gap-3">
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {{ plan.tripName || 'Untitled Trip' }}
                </h3>
                <div
                  class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300"
                >
                  <div
                    v-if="plan.origin"
                    class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-100/50 dark:bg-blue-900/30"
                  >
                    <Icon icon="mdi:map-marker" class="text-blue-600 dark:text-blue-400 text-lg" />
                    <span class="font-medium">{{ plan.origin }}</span>
                  </div>
                  <div
                    v-if="plan.destinations && plan.destinations.length > 0"
                    class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-100/50 dark:bg-indigo-900/30"
                  >
                    <Icon
                      icon="mdi:map-marker-multiple"
                      class="text-indigo-600 dark:text-indigo-400 text-lg"
                    />
                    <span
                      >{{ plan.destinations.length }}
                      {{ plan.destinations.length === 1 ? 'destination' : 'destinations' }}</span
                    >
                  </div>
                  <div
                    v-if="plan.startDate"
                    class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-100/50 dark:bg-green-900/30"
                  >
                    <Icon icon="mdi:calendar" class="text-green-600 dark:text-green-400 text-lg" />
                    <span>{{ new Date(plan.startDate).toLocaleDateString() }}</span>
                  </div>
                  <div
                    v-if="totalDays > 0"
                    class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-100/50 dark:bg-purple-900/30"
                  >
                    <Icon
                      icon="mdi:clock-outline"
                      class="text-purple-600 dark:text-purple-400 text-lg"
                    />
                    <span>{{ totalDays }} {{ totalDays === 1 ? 'day' : 'days' }}</span>
                  </div>
                  <div
                    class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-100/50 dark:bg-orange-900/30"
                  >
                    <Icon
                      icon="mdi:account-group"
                      class="text-orange-600 dark:text-orange-400 text-lg"
                    />
                    <span
                      >{{ totalTravelers }}
                      {{ totalTravelers === 1 ? 'traveler' : 'travelers' }}</span
                    >
                  </div>
                </div>
              </div>
              <div v-if="recommendation" class="flex-shrink-0">
                <div
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  :class="
                    recommendation.recommended === 'Road Trip'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : recommendation.recommended === 'Flight'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  "
                >
                  <Icon
                    :icon="
                      recommendation.recommended === 'Road Trip'
                        ? 'mdi:car'
                        : recommendation.recommended === 'Flight'
                          ? 'mdi:airplane'
                          : 'mdi:check-circle'
                    "
                    class="text-sm"
                  />
                  {{ recommendation.recommended }}
                </div>
              </div>
            </div>

            <!-- Selected Options -->
            <div
              v-if="plan.transportModes.length > 0 || plan.stayCategories.length > 0"
              class="pt-3 border-t border-blue-200 dark:border-blue-700"
            >
              <div class="flex flex-wrap gap-3 text-sm">
                <div v-if="plan.transportModes.length > 0" class="flex items-center gap-2">
                  <span class="text-gray-700 dark:text-gray-300 font-medium">Transport:</span>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="mode in plan.transportModes"
                      :key="mode"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200"
                    >
                      <Icon
                        :icon="
                          mode === 'road'
                            ? 'mdi:car'
                            : mode === 'flight'
                              ? 'mdi:airplane'
                              : mode === 'train'
                                ? 'mdi:train'
                                : mode === 'taxi'
                                  ? 'mdi:taxi'
                                  : 'mdi:ferry'
                        "
                        class="text-xs"
                      />
                      <span>{{
                        mode === 'road'
                          ? 'Road Trip'
                          : mode === 'flight'
                            ? 'Flight'
                            : mode === 'train'
                              ? 'Train'
                              : mode === 'taxi'
                                ? 'Taxi'
                                : 'Cruise'
                      }}</span>
                    </span>
                  </div>
                </div>
                <div v-if="plan.stayCategories.length > 0" class="flex items-center gap-2">
                  <span class="text-gray-700 dark:text-gray-300 font-medium">Accommodation:</span>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="category in plan.stayCategories"
                      :key="category"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200"
                    >
                      <Icon :icon="stayCategoryIcons[category]" class="text-xs" />
                      <span>{{ stayCategoryLabels[category] }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/40 p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <h3
              class="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide"
            >
              Trip Basics
            </h3>
          </div>

          <div class="space-y-2.5">
            <!-- Compact Row: Trip Name and Budget -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trip Name <span class="text-gray-400 font-normal">(text)</span>
                </label>
                <input
                  id="tripName"
                  v-model="plan.tripName"
                  type="text"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Mumbai to Goa"
                  aria-label="Trip name"
                  aria-describedby="tripNameHelp"
                />
                <p id="tripNameHelp" class="sr-only">Enter a descriptive name for your trip</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trip Budget
                </label>
                <div class="relative flex gap-1">
                  <span
                    class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none"
                  >
                    {{ currencies[plan.currency].symbol }}
                  </span>
                  <input
                    :value="formatBudgetInput(plan.budget)"
                    type="text"
                    class="flex-1 rounded-md border border-gray-300 dark:border-gray-600 pl-6 pr-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0"
                    @input="
                      plan.budget = parseBudgetInput(($event.target as HTMLInputElement).value)
                    "
                    @blur="
                      plan.budget = parseBudgetInput(($event.target as HTMLInputElement).value)
                    "
                  />
                  <button
                    type="button"
                    class="px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    title="Auto-calculate based on duration and travelers"
                    @click="applyBudgetPreset"
                  >
                    <Icon icon="mdi:auto-fix" class="text-xs" />
                  </button>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span v-if="plan.budget > 0">
                    Estimated total: {{ formatCurrency(totalTripCost) }} | Buffer:
                    {{ formatCurrency(plan.budget - totalTripCost) }}
                  </span>
                  <span v-else>
                    Base: {{ formatCurrency(getBaseBudgetPreset()) }}/person ×
                    {{ totalTravelers }} =
                    {{ formatCurrency(getBaseBudgetPreset() * totalTravelers) }}
                  </span>
                </p>
              </div>
            </div>

            <!-- Transport & Accommodation Selection -->
            <div class="space-y-3">
              <!-- Transport Modes -->
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transport Options
                  <span class="text-gray-400 font-normal"
                    >(Click to select/deselect all applicable)</span
                  >
                </label>
                <div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    class="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded border-2 transition-all text-xs relative"
                    :class="
                      plan.transportModes.includes('road')
                        ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                    "
                    @click="toggleTransportMode('road')"
                  >
                    <Icon icon="mdi:car" class="text-sm text-orange-600 dark:text-orange-400" />
                    <span class="font-medium leading-tight">Road Trip</span>
                    <Icon
                      v-if="plan.transportModes.includes('road')"
                      icon="mdi:check-circle"
                      class="absolute top-0 right-0 text-orange-600 dark:text-orange-400 text-[10px]"
                    />
                  </button>
                  <button
                    type="button"
                    class="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded border-2 transition-all text-xs relative"
                    :class="
                      plan.transportModes.includes('flight')
                        ? 'border-sky-500 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/30 text-sky-700 dark:text-sky-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-sky-300 hover:bg-sky-50/50 dark:hover:bg-sky-900/10'
                    "
                    @click="toggleTransportMode('flight')"
                  >
                    <Icon icon="mdi:airplane" class="text-sm text-sky-600 dark:text-sky-400" />
                    <span class="font-medium leading-tight">Flight</span>
                    <Icon
                      v-if="plan.transportModes.includes('flight')"
                      icon="mdi:check-circle"
                      class="absolute top-0 right-0 text-sky-600 dark:text-sky-400 text-[10px]"
                    />
                  </button>
                  <button
                    type="button"
                    class="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded border-2 transition-all text-xs relative"
                    :class="
                      plan.transportModes.includes('train')
                        ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 text-teal-700 dark:text-teal-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-900/10'
                    "
                    @click="toggleTransportMode('train')"
                  >
                    <Icon icon="mdi:train" class="text-sm text-teal-600 dark:text-teal-400" />
                    <span class="font-medium leading-tight">Train</span>
                    <Icon
                      v-if="plan.transportModes.includes('train')"
                      icon="mdi:check-circle"
                      class="absolute top-0 right-0 text-teal-600 dark:text-teal-400 text-[10px]"
                    />
                  </button>
                  <button
                    type="button"
                    class="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded border-2 transition-all text-xs relative"
                    :class="
                      plan.transportModes.includes('taxi')
                        ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-700 dark:text-yellow-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-yellow-300 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/10'
                    "
                    @click="toggleTransportMode('taxi')"
                  >
                    <Icon icon="mdi:taxi" class="text-sm text-yellow-600 dark:text-yellow-400" />
                    <span class="font-medium leading-tight">Taxi</span>
                    <Icon
                      v-if="plan.transportModes.includes('taxi')"
                      icon="mdi:check-circle"
                      class="absolute top-0 right-0 text-yellow-600 dark:text-yellow-400 text-[10px]"
                    />
                  </button>
                  <button
                    type="button"
                    class="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded border-2 transition-all text-xs relative"
                    :class="
                      plan.transportModes.includes('cruise')
                        ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 text-cyan-700 dark:text-cyan-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-cyan-300 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10'
                    "
                    @click="toggleTransportMode('cruise')"
                  >
                    <Icon icon="mdi:ferry" class="text-sm text-cyan-600 dark:text-cyan-400" />
                    <span class="font-medium leading-tight">Cruise</span>
                    <Icon
                      v-if="plan.transportModes.includes('cruise')"
                      icon="mdi:check-circle"
                      class="absolute top-0 right-0 text-cyan-600 dark:text-cyan-400 text-[10px]"
                    />
                  </button>
                </div>
              </div>

              <!-- Accommodation Categories -->
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Accommodation Options
                  <span class="text-gray-400 font-normal"
                    >(Click to select/deselect all applicable)</span
                  >
                </label>
                <div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  <button
                    v-for="(label, category) in stayCategoryLabels"
                    :key="category"
                    type="button"
                    class="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded border-2 transition-all text-xs relative"
                    :class="
                      plan.stayCategories.includes(category)
                        ? getStayCategoryColor(category, true)
                        : getStayCategoryColor(category, false)
                    "
                    @click="toggleStayCategory(category)"
                  >
                    <Icon
                      :icon="stayCategoryIcons[category]"
                      :class="getStayCategoryIconClass(category)"
                    />
                    <span class="font-medium leading-tight">{{ label }}</span>
                    <Icon
                      v-if="plan.stayCategories.includes(category)"
                      icon="mdi:check-circle"
                      :class="getStayCategoryCheckClass(category)"
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- Compact Row: Date, Duration, Currency, Travelers -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date <span class="text-gray-400 font-normal">(YYYY-MM-DD)</span>
                </label>
                <input
                  id="startDate"
                  v-model="plan.startDate"
                  type="date"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  aria-label="Trip start date"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration
                </label>
                <div class="relative">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-xs w-full justify-between px-1.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    @click="toggleDurationMenu"
                    @blur="closeDurationMenu"
                  >
                    <span class="flex items-center gap-1">
                      <Icon icon="mdi:calendar-range" class="text-xs" />
                      <span class="truncate">{{ durationLabels[plan.duration] }}</span>
                    </span>
                    <Icon icon="mdi:chevron-down" class="text-xs shrink-0" />
                  </button>
                  <div
                    v-if="showDurationMenu"
                    class="absolute z-20 mt-1 w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg"
                  >
                    <button
                      v-for="(label, key) in durationLabels"
                      :key="key"
                      type="button"
                      class="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-700"
                      @mousedown.prevent="selectDuration(key as TripDuration)"
                    >
                      {{ label }}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency
                </label>
                <div class="relative">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-xs w-full justify-between px-1.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    @click="toggleCurrencyMenu"
                    @blur="closeCurrencyMenu"
                  >
                    <span class="flex items-center gap-1">
                      <span class="text-xs font-medium">{{
                        currencies[plan.currency].symbol
                      }}</span>
                      <span class="text-xs">{{ currencies[plan.currency].code }}</span>
                    </span>
                    <Icon icon="mdi:chevron-down" class="text-xs shrink-0" />
                  </button>
                  <div
                    v-if="showCurrencyMenu"
                    class="absolute z-20 mt-1 w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-48 overflow-y-auto min-w-[120px]"
                  >
                    <button
                      v-for="(curr, code) in currencies"
                      :key="code"
                      type="button"
                      class="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-700"
                      @mousedown.prevent="selectCurrency(code)"
                    >
                      <span class="inline-flex items-center gap-1.5">
                        <span class="text-xs">{{ curr.symbol }}</span>
                        <span class="text-xs font-medium">{{ code }}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Travelers <span class="text-gray-400 font-normal">(A/K)</span>
                </label>
                <div class="grid grid-cols-2 gap-1.5">
                  <div class="relative">
                    <input
                      id="adults"
                      v-model.number="plan.adults"
                      type="number"
                      min="0"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 pr-6 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                      aria-label="Number of adult travelers"
                    />
                    <span
                      class="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"
                    >
                      <Icon icon="mdi:account" class="text-xs" />
                    </span>
                  </div>
                  <div class="relative">
                    <input
                      id="kids"
                      v-model.number="plan.kids"
                      type="number"
                      min="0"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 pr-6 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                      aria-label="Number of child travelers (12+)"
                    />
                    <span
                      class="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"
                    >
                      <Icon icon="mdi:account-child" class="text-xs" />
                    </span>
                  </div>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Total: <span class="font-medium">{{ formatNumber(totalTravelers) }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
        >
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3
              class="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide"
            >
              Route & Stops
            </h3>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              @click="addDestination"
            >
              <Icon icon="mdi:map-marker-plus" class="text-base" />
              Add Stops
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Origin
              </label>
              <div class="relative">
                <input
                  id="origin"
                  v-model="plan.origin"
                  type="text"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Mumbai, Maharashtra"
                  aria-label="Trip origin location"
                  aria-autocomplete="list"
                  aria-expanded="false"
                  @input="handleOriginInput"
                  @focus="handleOriginInput"
                  @blur="clearOriginSuggestions"
                />
                <div
                  v-if="originSuggestions.length"
                  class="absolute z-20 mt-1 w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-48 overflow-y-auto"
                >
                  <button
                    v-for="suggestion in originSuggestions"
                    :key="suggestion.placeId"
                    type="button"
                    class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700"
                    @mousedown.prevent="selectOriginSuggestion(suggestion)"
                  >
                    {{ suggestion.description }}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Destinations
              </label>
              <div
                v-if="!plan.destinations || plan.destinations.length === 0"
                class="text-sm text-gray-500 dark:text-gray-400"
              >
                No stops added yet.
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="dest in plan.destinations"
                  :key="dest.id"
                  class="flex gap-2 items-start p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  draggable="true"
                  @dragstart="handleDragStart($event, dest.id)"
                  @dragover.prevent="handleDragOver($event)"
                  @drop="handleDrop($event, dest.id)"
                >
                  <div class="flex items-center text-gray-400 dark:text-gray-500 cursor-move mt-2">
                    <Icon icon="mdi:drag" class="text-lg" />
                  </div>
                  <div class="flex-1 space-y-2">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div class="relative">
                        <input
                          v-model="dest.name"
                          type="text"
                          class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Stop name"
                          @input="
                            handleDestinationInput(
                              dest.id,
                              ($event.target as HTMLInputElement).value,
                            )
                          "
                          @focus="handleDestinationInput(dest.id, dest.name)"
                          @blur="clearDestinationSuggestions(dest.id)"
                        />
                        <div
                          v-if="destinationSuggestions[dest.id]?.length"
                          class="absolute z-20 mt-1 w-full rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-48 overflow-y-auto"
                        >
                          <button
                            v-for="suggestion in destinationSuggestions[dest.id]"
                            :key="suggestion.placeId"
                            type="button"
                            class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700"
                            @mousedown.prevent="selectDestinationSuggestion(dest.id, suggestion)"
                          >
                            {{ suggestion.description }}
                          </button>
                        </div>
                      </div>
                      <div class="flex gap-2">
                        <input
                          v-model.number="dest.days"
                          type="number"
                          min="1"
                          class="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Days"
                        />
                        <button
                          type="button"
                          class="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                          @click="removeDestination(dest.id)"
                        >
                          <Icon icon="mdi:delete" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <textarea
                        v-model="dest.notes"
                        class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Notes about this destination (optional)"
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="plan.origin && plan.destinations && plan.destinations.length > 0" class="pt-4">
          <button
            type="button"
            :disabled="isLoadingDistance"
            class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            aria-label="Calculate distance and travel time between origin and destinations"
            @click="calculateDistance"
          >
            <span v-if="!isLoadingDistance">Calculate Distance & Time</span>
            <span v-else class="flex items-center justify-center">
              <Icon icon="mdi:loading" class="animate-spin mr-2" />
              Calculating...
            </span>
          </button>
          <p v-if="distanceError" class="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {{ distanceError }}
          </p>
          <div v-if="distanceData" class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p class="text-sm">
              <span class="font-medium">Total Distance:</span>
              {{ distanceData.total.distance.text }}
            </p>
            <p class="text-sm">
              <span class="font-medium">Total Duration:</span>
              {{ distanceData.total.duration.text }}
            </p>
            <div
              v-if="distanceData.legs.length"
              class="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300"
            >
              <div class="font-medium">Legs:</div>
              <div v-for="(leg, idx) in distanceData.legs" :key="idx">
                {{ leg.origin }} → {{ leg.destination }} ({{ leg.distanceText }},
                {{ leg.durationText }})
              </div>
            </div>
          </div>
        </div>

        <!-- Stay/Accommodation Inputs (if stay categories selected) -->
        <div
          v-if="plan.stayCategories.length > 0"
          class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon icon="mdi:bed" class="text-emerald-600 dark:text-emerald-400" />
              Accommodation Details
            </h3>
            <div class="flex items-center gap-2">
              <input
                id="includeStayPlan"
                v-model="plan.stay.includeStay"
                type="checkbox"
                class="rounded border-gray-300"
                aria-label="Include accommodation costs"
              />
              <label
                for="includeStayPlan"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Include Stay
              </label>
            </div>
          </div>

          <div v-if="plan.stay.includeStay" class="space-y-4">
            <div>
              <label
                for="stayCategory"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Primary Stay Category
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  v-for="(label, category) in stayCategoryLabels"
                  :key="category"
                  type="button"
                  class="flex flex-col items-center gap-1 px-2 py-1.5 rounded-md border-2 transition-all text-xs relative"
                  :class="
                    plan.stay.category === category
                      ? getStayCategoryColor(category, true)
                      : getStayCategoryColor(category, false)
                  "
                  :aria-label="`Select ${label} as primary stay category`"
                  @click="plan.stay.category = category"
                >
                  <Icon
                    :icon="stayCategoryIcons[category]"
                    :class="getStayCategoryIconClass(category)"
                  />
                  <span class="font-medium">{{ label }}</span>
                </button>
              </div>
            </div>

            <div
              v-if="plan.stay.category === 'hotel' || plan.stay.category === 'resort'"
              class="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div>
                <label
                  for="stayTier"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Tier
                </label>
                <select
                  id="stayTier"
                  v-model="plan.stay.tier"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  @change="updateStayTier(plan.stay.tier)"
                >
                  <option value="budget">Budget</option>
                  <option value="mid">Mid-range</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>
              <div>
                <label
                  for="stayCostPerNight"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Cost per Night
                </label>
                <input
                  id="stayCostPerNight"
                  v-model.number="plan.stay.costPerNight"
                  type="number"
                  min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  for="stayNights"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Number of Nights
                </label>
                <input
                  id="stayNights"
                  v-model.number="plan.stay.nights"
                  type="number"
                  min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Total trip days: {{ totalDays }}
                </p>
              </div>
              <div>
                <label
                  for="stayRooms"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Number of Rooms
                </label>
                <input
                  id="stayRooms"
                  v-model.number="plan.stay.rooms"
                  type="number"
                  min="1"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Estimated: {{ estimateRooms }} rooms
                </p>
              </div>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  for="stayCostPerNightOther"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Cost per Night
                </label>
                <input
                  id="stayCostPerNightOther"
                  v-model.number="plan.stay.costPerNight"
                  type="number"
                  min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  for="stayNightsOther"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Number of Nights
                </label>
                <input
                  id="stayNightsOther"
                  v-model.number="plan.stay.nights"
                  type="number"
                  min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  for="stayRoomsOther"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Number of Rooms
                </label>
                <input
                  id="stayRoomsOther"
                  v-model.number="plan.stay.rooms"
                  type="number"
                  min="1"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Recommendation Card -->
        <div
          v-if="recommendation && plan.origin && plan.destinations && plan.destinations.length > 0"
          class="rounded-lg border-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-500 dark:border-green-600 p-4"
        >
          <div class="flex items-start gap-3">
            <Icon
              icon="mdi:lightbulb-on"
              class="text-2xl text-green-600 dark:text-green-400 shrink-0 mt-0.5"
            />
            <div class="flex-1">
              <h4 class="font-bold text-green-700 dark:text-green-300 mb-1">
                Recommendation: {{ recommendation.recommended }}
              </h4>
              <p class="text-sm text-green-800 dark:text-green-200">
                {{ recommendation.reason }}
              </p>
            </div>
          </div>
        </div>

        <!-- Food Inputs -->
        <div
          class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon icon="mdi:food" class="text-amber-600 dark:text-amber-400" />
              Food & Dining
            </h3>
            <div class="flex items-center gap-2">
              <input
                id="foodEnabledPlan"
                v-model="plan.food.enabled"
                type="checkbox"
                class="rounded border-gray-300"
                aria-label="Include food costs"
              />
              <label
                for="foodEnabledPlan"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Include Food
              </label>
            </div>
          </div>

          <div v-if="plan.food.enabled" class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Set daily food costs. You can customize costs per day or use a default daily amount.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div
                v-for="day in itineraryDays"
                :key="day.day"
                class="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
              >
                <label
                  :for="`foodDay_${day.day}`"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Day {{ day.day }} ({{ day.location }})
                </label>
                <input
                  :id="`foodDay_${day.day}`"
                  v-model.number="plan.food.dailyCosts[String(day.day)]"
                  type="number"
                  min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>
            <div
              v-if="itineraryDays.length === 0"
              class="text-sm text-gray-500 dark:text-gray-400 text-center py-4"
            >
              Add destinations to set daily food costs
            </div>
          </div>
        </div>

        <!-- Sites & Attractions Inputs -->
        <div
          class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon icon="mdi:camera" class="text-purple-600 dark:text-purple-400" />
              Sites & Attractions
            </h3>
            <div class="flex items-center gap-2">
              <input
                id="sitesEnabledPlan"
                v-model="plan.sites.enabled"
                type="checkbox"
                class="rounded border-gray-300"
                aria-label="Include sites and attractions costs"
              />
              <label
                for="sitesEnabledPlan"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Include Sites
              </label>
            </div>
          </div>

          <div v-if="plan.sites.enabled" class="space-y-4">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Add sites and attractions you plan to visit
              </p>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                aria-label="Add new site or attraction"
                @click="addSite"
              >
                <Icon icon="mdi:plus" class="text-base" />
                Add Site
              </button>
            </div>

            <div
              v-if="plan.sites.sites.length === 0"
              class="text-sm text-gray-500 dark:text-gray-400 text-center py-4"
            >
              No sites added yet. Click "Add Site" to start.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="site in plan.sites.sites"
                :key="site.id"
                class="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
              >
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label
                      :for="`siteName_${site.id}`"
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Site Name
                    </label>
                    <input
                      :id="`siteName_${site.id}`"
                      v-model="site.name"
                      type="text"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Site name"
                    />
                  </div>
                  <div>
                    <label
                      :for="`siteLocation_${site.id}`"
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Location
                    </label>
                    <input
                      :id="`siteLocation_${site.id}`"
                      v-model="site.location"
                      type="text"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="City/Destination"
                    />
                  </div>
                  <div>
                    <label
                      :for="`siteCost_${site.id}`"
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Cost
                    </label>
                    <input
                      :id="`siteCost_${site.id}`"
                      v-model.number="site.cost"
                      type="number"
                      min="0"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label
                      :for="`siteDay_${site.id}`"
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Day
                    </label>
                    <input
                      :id="`siteDay_${site.id}`"
                      v-model.number="site.day"
                      type="number"
                      min="1"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label
                      :for="`siteDescription_${site.id}`"
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Description
                    </label>
                    <input
                      :id="`siteDescription_${site.id}`"
                      v-model="site.description"
                      type="text"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Brief description"
                    />
                  </div>
                  <div>
                    <label
                      :for="`siteSource_${site.id}`"
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Source/URL
                    </label>
                    <input
                      :id="`siteSource_${site.id}`"
                      v-model="site.source"
                      type="text"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Booking site or URL"
                    />
                  </div>
                </div>
                <div class="flex justify-end">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    :aria-label="`Remove ${site.name || 'site'}`"
                    @click="removeSite(site.id)"
                  >
                    <Icon icon="mdi:delete" class="inline mr-1" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4">
          <div class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Route Map</div>
          <div
            ref="mapRef"
            class="h-64 sm:h-80 md:h-96 lg:h-[500px] w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
          ></div>
          <p v-if="isLoadingMap" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Loading map preview…
          </p>
          <p v-if="mapError" class="text-xs text-red-600 dark:text-red-400 mt-1">
            {{ mapError }}
          </p>
          <div class="mt-2 flex gap-2">
            <button
              type="button"
              :disabled="isAnimatingRoute || !routeStops.length"
              class="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              @click="animateRoute(false)"
            >
              <Icon icon="mdi:play" class="mr-1.5 text-base" />
              {{ isAnimatingRoute ? 'Animating…' : 'Animate route' }}
            </button>
            <button
              type="button"
              :disabled="isAnimatingRoute || !routeStops.length"
              class="inline-flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              @click="animateRoute(true)"
            >
              <Icon icon="mdi:download" class="mr-1.5 text-base" />
              {{ isRecordingGif ? 'Recording…' : 'Record & Download GIF' }}
            </button>
          </div>
          <p v-if="isRecordingGif" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recording animation frames for GIF...
          </p>
        </div>
      </div>

      <!-- Transport Tab - Road Trip + Public Transport -->
      <div
        v-if="activeTab === 'transport-costs' && plan.transportModes.length > 0"
        class="space-y-6"
      >
        <!-- Road Trip Section -->
        <div v-if="plan.transportModes.includes('road')" class="space-y-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="mdi:car" class="text-orange-600 dark:text-orange-400" />
            Road Trip
          </h2>
          <div class="flex items-center gap-2">
            <input
              id="roadEnabled"
              v-model="plan.roadTrip.enabled"
              type="checkbox"
              class="rounded border-gray-300"
              aria-label="Enable road trip option for calculations"
            />
            <label for="roadEnabled" class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Road Trip Option
            </label>
          </div>

          <template v-if="plan.roadTrip.enabled">
            <!-- Legs (same as Plan tab - uses shared plan.roadTrip.legs) -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Legs</h4>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="px-2 py-1 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    @click="calculateRoadTripLegs"
                  >
                    {{ isLoadingDistance ? 'Calculating...' : 'Calculate' }}
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 text-sm border border-orange-600 text-orange-600 rounded-md"
                    @click="addRoadTripLeg"
                  >
                    <Icon icon="mdi:plus" class="text-sm" /> Add Leg
                  </button>
                </div>
              </div>
              <div
                v-for="(leg, idx) in plan.roadTrip.legs"
                :key="leg.id"
                class="rounded-lg border border-gray-200 dark:border-slate-700 p-3 bg-gray-50/50 dark:bg-slate-800/50"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">Leg {{ idx + 1 }}</span>
                  <button
                    v-if="plan.roadTrip.legs.length > 1"
                    type="button"
                    class="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    @click="removeRoadTripLeg(leg.id)"
                  >
                    <Icon icon="mdi:delete" class="text-base" />
                  </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div class="relative">
                    <label class="block text-xs font-medium mb-1">From</label>
                    <input
                      :value="leg.from"
                      type="text"
                      class="w-full rounded px-2 py-2 text-sm border"
                      placeholder="Start location"
                      @input="(e) => { leg.from = (e.target as HTMLInputElement).value; handleLegFromInput(leg.id, (e.target as HTMLInputElement).value) }"
                      @focus="handleLegFromInput(leg.id, leg.from)"
                      @blur="clearLegFromSuggestions(leg.id)"
                    />
                    <div
                      v-if="legSuggestions[leg.id]?.from?.length"
                      class="absolute z-20 mt-1 w-full rounded border bg-white dark:bg-slate-800 shadow-lg max-h-40 overflow-y-auto"
                    >
                      <button
                        v-for="s in legSuggestions[leg.id].from"
                        :key="s.placeId"
                        type="button"
                        class="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100"
                        @mousedown.prevent="selectLegFromSuggestion(leg.id, s)"
                      >
                        {{ s.description }}
                      </button>
                    </div>
                  </div>
                  <div class="relative">
                    <label class="block text-xs font-medium mb-1">To</label>
                    <input
                      :value="leg.to"
                      type="text"
                      class="w-full rounded px-2 py-2 text-sm border"
                      placeholder="End location"
                      @input="(e) => { leg.to = (e.target as HTMLInputElement).value; handleLegToInput(leg.id, (e.target as HTMLInputElement).value) }"
                      @focus="handleLegToInput(leg.id, leg.to)"
                      @blur="clearLegToSuggestions(leg.id)"
                    />
                    <div
                      v-if="legSuggestions[leg.id]?.to?.length"
                      class="absolute z-20 mt-1 w-full rounded border bg-white dark:bg-slate-800 shadow-lg max-h-40 overflow-y-auto"
                    >
                      <button
                        v-for="s in legSuggestions[leg.id].to"
                        :key="s.placeId"
                        type="button"
                        class="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100"
                        @mousedown.prevent="selectLegToSuggestion(leg.id, s)"
                      >
                        {{ s.description }}
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="leg.distanceText || leg.durationText" class="text-xs text-gray-500 mt-1">
                  {{ leg.distanceText || '-' }}, {{ leg.durationText || '-' }}
                </div>
              </div>
            </div>

            <!-- Cost inputs: single row, auto by default, override to edit -->
            <div class="flex flex-wrap items-end gap-x-3 gap-y-2">
              <div class="min-w-[65px]">
                <label class="block text-xs mb-0.5">Petrol/L</label>
                <input v-model.number="plan.roadTrip.petrolPrice" type="number" min="0" step="0.01" class="w-full rounded px-2 py-1 text-sm border" placeholder="0" />
              </div>
              <div class="min-w-[55px]">
                <label class="block text-xs mb-0.5">Mileage</label>
                <input v-model.number="plan.roadTrip.mileage" type="number" min="0" step="0.1" class="w-full rounded px-2 py-1 text-sm border" placeholder="0" />
              </div>
              <div class="min-w-[75px]">
                <label class="block text-xs mb-0.5">Fuel</label>
                <input v-model.number="plan.roadTrip.fuelOverride" type="number" min="0" class="w-full rounded px-2 py-1 text-sm border" :placeholder="roadTripDistance > 0 && plan.roadTrip.mileage > 0 && plan.roadTrip.petrolPrice > 0 ? formatCurrency(estimatedFuelCost) : 'Auto'" />
              </div>
              <div class="min-w-[75px]">
                <label class="block text-xs mb-0.5">Tolls</label>
                <input v-model.number="plan.roadTrip.tolls" type="number" min="0" class="w-full rounded px-2 py-1 text-sm border" :placeholder="roadTripDistance > 0 ? formatCurrency(estimatedTollsCost) : 'Auto'" />
              </div>
              <div class="min-w-[75px]">
                <label class="block text-xs mb-0.5">Parking</label>
                <input v-model.number="plan.roadTrip.parking" type="number" min="0" class="w-full rounded px-2 py-1 text-sm border" :placeholder="roadTripDistance > 0 ? formatCurrency(estimatedParkingCost) : 'Auto'" />
              </div>
              <div class="min-w-[60px]">
                <label class="block text-xs mb-0.5">Misc</label>
                <input v-model.number="plan.roadTrip.misc" type="number" min="0" class="w-full rounded px-2 py-1 text-sm border" placeholder="0" />
              </div>
            </div>

            <div class="pt-4 border-t border-gray-200 dark:border-slate-700">
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Road Trip Cost:</span>
                  <span class="text-lg font-bold text-gray-900 dark:text-white">{{ formatCurrency(roadTripCost) }}</span>
                </div>
                <div v-if="roadTripDistance > 0" class="text-xs text-gray-500 dark:text-gray-400 space-y-1 pl-4 border-l-2 border-gray-200 dark:border-slate-700">
                  <div class="flex justify-between">
                    <span>Fuel:</span>
                    <span>{{
                      formatCurrency(
                        plan.roadTrip.fuelOverride > 0
                          ? plan.roadTrip.fuelOverride
                          : plan.roadTrip.mileage > 0 && plan.roadTrip.petrolPrice > 0
                            ? estimatedFuelCost
                            : 0,
                      )
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Tolls:</span>
                    <span>{{ formatCurrency(plan.roadTrip.tolls > 0 ? plan.roadTrip.tolls : estimatedTollsCost) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Parking:</span>
                    <span>{{ formatCurrency(plan.roadTrip.parking > 0 ? plan.roadTrip.parking : estimatedParkingCost) }}</span>
                  </div>
                  <div v-if="plan.roadTrip.sightseeing > 0" class="flex justify-between">
                    <span>Sightseeing:</span>
                    <span>{{ formatCurrency(plan.roadTrip.sightseeing) }}</span>
                  </div>
                  <div v-if="plan.roadTrip.misc > 0" class="flex justify-between">
                    <span>Misc:</span>
                    <span>{{ formatCurrency(plan.roadTrip.misc) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Public Transport Section -->
        <div
          v-if="plan.transportModes.some((m) => m !== 'road')"
          class="space-y-6 pt-6 border-t border-gray-200 dark:border-slate-700"
        >
          <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="mdi:airplane" class="text-sky-600 dark:text-sky-400" />
            Public Transport
          </h2>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <input
                id="transportEnabled"
                v-model="plan.publicTransport.enabled"
                type="checkbox"
                class="rounded border-gray-300"
                aria-label="Enable public transport options for calculations"
              />
              <label
                for="transportEnabled"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Enable Public Transport Options
              </label>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              @click="addTransportOption"
            >
              <Icon icon="mdi:plus" class="text-base" />
              Add Transport Option
            </button>
          </div>

          <template v-if="plan.publicTransport.enabled">
            <div
              v-if="plan.publicTransport.options.length === 0"
              class="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <Icon icon="mdi:train" class="text-4xl mb-2 mx-auto opacity-50" />
              <p class="text-sm">
                No transport options added yet. Click "Add Transport Option" to get started.
              </p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="(option, idx) in plan.publicTransport.options"
                :key="option.id"
                class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <input
                      :id="`transportEnabled_${option.id}`"
                      v-model="option.enabled"
                      type="checkbox"
                      class="rounded border-gray-300 mt-1"
                    />
                    <div>
                      <label
                        :for="`transportEnabled_${option.id}`"
                        class="text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        Transport Option {{ idx + 1 }}
                      </label>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {{ option.from }} → {{ option.to }}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md p-1.5"
                    @click="removeTransportOption(option.id)"
                  >
                    <Icon icon="mdi:delete" />
                  </button>
                </div>

                <template v-if="option.enabled">
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Transport Type
                      </label>
                      <div class="grid grid-cols-4 gap-2">
                        <button
                          v-for="transportType in [
                            'flight',
                            'cruise',
                            'train',
                            'taxi',
                          ] as TransportType[]"
                          :key="transportType"
                          type="button"
                          class="flex flex-col items-center gap-1 px-3 py-2 rounded-md border transition-colors"
                          :class="
                            option.type === transportType
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                          "
                          @click="option.type = transportType"
                        >
                          <Icon :icon="getTransportTypeIcon(transportType)" class="text-lg" />
                          <span class="text-xs font-medium">{{
                            getTransportTypeLabel(transportType)
                          }}</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Base Cost (per person)
                      </label>
                      <input
                        v-model.number="option.cost"
                        type="number"
                        min="0"
                        class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Transfer/Station Fees
                      </label>
                      <input
                        v-model.number="option.transfer"
                        type="number"
                        min="0"
                        class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Baggage/Extra Fees
                      </label>
                      <input
                        v-model.number="option.baggage"
                        type="number"
                        min="0"
                        class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Travel Time (hours)
                      </label>
                      <input
                        v-model.number="option.travelHours"
                        type="number"
                        min="0"
                        step="0.5"
                        class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Est. Cost per km
                      </label>
                      <input
                        v-model.number="option.costPerKm"
                        type="number"
                        min="0"
                        step="0.1"
                        class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div class="pt-3 border-t border-gray-200 dark:border-slate-700">
                    <div class="flex justify-between items-center text-sm">
                      <span class="text-gray-600 dark:text-gray-400">Option Cost:</span>
                      <span class="font-bold text-gray-900 dark:text-white">
                        {{
                          formatCurrency(
                            (option.cost + option.baggage) * totalTravelers + option.transfer,
                          )
                        }}
                      </span>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-200 dark:border-slate-700">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Public Transport Cost:
                </span>
                <span class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ formatCurrency(publicTransportCost) }}
                </span>
              </div>
              <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Total Travel Time: {{ publicTransportTime.toFixed(1) }} hours
              </div>
              <div
                v-if="estimatedTransportCost > 0"
                class="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                Estimated cost (based on distance): {{ formatCurrency(estimatedTransportCost) }}
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Accommodation & Activities Tab - Consolidated Stay + Food + Sites -->
      <div v-if="activeTab === 'accommodation-activities'" class="space-y-6">
        <!-- Stay Section -->
        <div v-if="plan.stayCategories.length > 0" class="space-y-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="mdi:bed" class="text-emerald-600 dark:text-emerald-400" />
            Accommodation Costs
          </h2>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <Icon icon="mdi:bed" class="text-2xl text-emerald-600 dark:text-emerald-400" />
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Stay & Accommodation</h2>
            </div>
            <div class="flex items-center gap-2">
              <input
                id="includeStayTab"
                v-model="plan.stay.includeStay"
                type="checkbox"
                class="rounded border-gray-300"
                aria-label="Include accommodation costs in calculations"
              />
              <label
                for="includeStayTab"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Include Stay
              </label>
            </div>
          </div>

          <div v-if="plan.stay.includeStay" class="space-y-6">
            <!-- Selected Stay Categories -->
            <div
              class="rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4"
            >
              <h3 class="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-3">
                Selected Accommodation Types
              </h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="category in plan.stayCategories"
                  :key="category"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200"
                >
                  <Icon :icon="stayCategoryIcons[category]" class="text-sm" />
                  <span class="font-medium">{{ stayCategoryLabels[category] }}</span>
                </span>
              </div>
              <p class="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
                Configure costs for each selected accommodation type below. You can manage multiple
                stay options.
              </p>
            </div>

            <!-- Stay Category Selection for Primary Category -->
            <div
              class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
            >
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Primary Stay Category (for cost calculation)
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                <button
                  v-for="(label, category) in stayCategoryLabels"
                  :key="category"
                  type="button"
                  class="flex flex-col items-center gap-1 px-2 py-1.5 rounded-md border-2 transition-all text-xs relative shadow-sm hover:shadow-md"
                  :class="
                    plan.stay.category === category
                      ? getStayCategoryColor(category, true)
                      : getStayCategoryColor(category, false)
                  "
                  @click="plan.stay.category = category"
                >
                  <Icon
                    :icon="stayCategoryIcons[category]"
                    :class="getStayCategoryIconClass(category)"
                  />
                  <span class="font-medium">{{ label }}</span>
                  <Icon
                    v-if="plan.stay.category === category"
                    icon="mdi:check-circle"
                    :class="getStayCategoryCheckClass(category)"
                  />
                </button>
              </div>
            </div>

            <!-- Stay Details (only show tier for Hotel, Resort) -->
            <div
              v-if="plan.stay.category === 'hotel' || plan.stay.category === 'resort'"
              class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
            >
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {{ plan.stay.category === 'hotel' ? 'Hotel' : 'Resort' }} Cost Details
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ plan.stay.category === 'hotel' ? 'Hotel' : 'Resort' }} Tier
                  </label>
                  <select
                    v-model="plan.stay.tier"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    @change="updateStayTier(plan.stay.tier)"
                  >
                    <option value="budget">Budget</option>
                    <option value="mid">Mid-range</option>
                    <option value="luxury">Luxury</option>
                  </select>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ getHotelTierLabel(plan.stay.tier) }}/night
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cost per Night
                  </label>
                  <input
                    v-model.number="plan.stay.costPerNight"
                    type="number"
                    min="0"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Nights
                  </label>
                  <input
                    v-model.number="plan.stay.nights"
                    type="number"
                    min="0"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Total trip days: {{ totalDays }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Rooms/Units
                  </label>
                  <input
                    v-model.number="plan.stay.rooms"
                    type="number"
                    min="1"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Estimated: {{ estimateRooms }} (based on {{ totalTravelers }} travelers)
                  </p>
                </div>
              </div>
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                  @click="autoEstimateStayCost"
                >
                  <Icon icon="mdi:hotel" class="mr-1.5 text-base" />
                  Auto price by destination
                </button>
                <a
                  v-if="
                    hotelSearchUrl &&
                    (plan.stay.category === 'hotel' || plan.stay.category === 'resort')
                  "
                  :href="hotelSearchUrl"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Icon icon="mdi:bed" class="mr-1.5 text-base" />
                  Search {{ plan.stay.category === 'hotel' ? 'Hotels' : 'Resorts' }}
                </a>
              </div>
            </div>

            <!-- Stay Details for other categories (Apartment, Hostel, Homestay, Friends & Family) -->
            <div
              v-else
              class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
            >
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {{ stayCategoryLabels[plan.stay.category] }} Cost Details
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cost per Night
                  </label>
                  <input
                    v-model.number="plan.stay.costPerNight"
                    type="number"
                    min="0"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p
                    v-if="plan.stay.category === 'friends_family'"
                    class="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    Enter 0 if staying for free
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Nights
                  </label>
                  <input
                    v-model.number="plan.stay.nights"
                    type="number"
                    min="0"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Total trip days: {{ totalDays }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Rooms/Units
                  </label>
                  <input
                    v-model.number="plan.stay.rooms"
                    type="number"
                    min="1"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Estimated: {{ estimateRooms }} (based on {{ totalTravelers }} travelers)
                  </p>
                </div>
              </div>
            </div>

            <!-- Cost Summary -->
            <div
              class="rounded-lg border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
                    Estimated Stay Cost
                  </h3>
                  <p class="text-xs text-emerald-700 dark:text-emerald-300">
                    {{ plan.stay.nights }} nights ×
                    {{ formatCurrency(plan.stay.costPerNight) }}/night ×
                    {{ plan.stay.rooms || estimateRooms }}
                    {{ (plan.stay.rooms || estimateRooms) === 1 ? 'room' : 'rooms' }}
                  </p>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {{ formatCurrency(stayCost) }}
                  </div>
                  <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Total accommodation cost
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-8 text-center"
          >
            <Icon
              icon="mdi:bed-outline"
              class="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-3"
            />
            <p class="text-gray-600 dark:text-gray-400">
              Enable "Include Stay" above to configure accommodation costs
            </p>
          </div>
        </div>

        <!-- Food Section -->
        <div
          v-if="plan.food.enabled"
          class="space-y-6 pt-6 border-t border-gray-200 dark:border-slate-700"
        >
          <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="mdi:food" class="text-amber-600 dark:text-amber-400" />
            Food & Dining Costs
          </h2>
          <div class="flex items-center gap-2">
            <input
              id="foodEnabled"
              v-model="plan.food.enabled"
              type="checkbox"
              class="rounded border-gray-300"
            />
            <label for="foodEnabled" class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Food Cost Tracking
            </label>
          </div>

          <template v-if="plan.food.enabled">
            <div
              v-if="itineraryDays.length === 0"
              class="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <Icon icon="mdi:food" class="text-4xl mb-2 mx-auto opacity-50" />
              <p class="text-sm">Add destinations to your trip to start tracking food costs.</p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="day in itineraryDays"
                :key="day.day"
                class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
              >
                <div class="mb-4 flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-gray-900 dark:text-white">Day {{ day.day }}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ day.location }}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-xs text-gray-500 dark:text-gray-400">Total for day</div>
                    <div class="font-bold text-gray-900 dark:text-white">
                      {{
                        formatCurrency(
                          (getFoodDailyCost(day.day) +
                            Object.values(plan.food.customMeals[String(day.day)] || {}).reduce(
                              (sum, cost) => sum + cost,
                              0,
                            )) *
                            totalTravelers,
                        )
                      }}
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Daily Food Budget (per person)
                    </label>
                    <input
                      :value="getFoodDailyCost(day.day)"
                      type="number"
                      min="0"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                      @input="
                        updateFoodDailyCost(
                          day.day,
                          Number(($event.target as HTMLInputElement).value),
                        )
                      "
                    />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Total: {{ formatCurrency(getFoodDailyCost(day.day) * totalTravelers) }}
                    </p>
                  </div>
                </div>

                <div class="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Custom Meal Costs (per person)
                  </label>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div
                      v-for="mealType in plan.food.mealTypes"
                      :key="mealType"
                      class="flex flex-col"
                    >
                      <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize">
                        {{ mealType }}
                      </label>
                      <input
                        :value="getFoodMealCost(day.day, mealType)"
                        type="number"
                        min="0"
                        class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        placeholder="0"
                        @input="
                          updateFoodMealCost(
                            day.day,
                            mealType,
                            Number(($event.target as HTMLInputElement).value),
                          )
                        "
                      />
                    </div>
                  </div>
                  <div class="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    Custom meals total:
                    {{
                      formatCurrency(
                        Object.values(plan.food.customMeals[String(day.day)] || {}).reduce(
                          (sum, cost) => sum + cost,
                          0,
                        ) * totalTravelers,
                      )
                    }}
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-200 dark:border-slate-700">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Food Cost:
                </span>
                <span class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ formatCurrency(foodCost) }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                For {{ totalTravelers }} {{ totalTravelers === 1 ? 'traveler' : 'travelers' }} over
                {{ itineraryDays.length }} {{ itineraryDays.length === 1 ? 'day' : 'days' }}
              </p>
            </div>
          </template>
        </div>

        <!-- Sites Section -->
        <div
          v-if="plan.sites.enabled"
          class="space-y-6 pt-6 border-t border-gray-200 dark:border-slate-700"
        >
          <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="mdi:camera" class="text-purple-600 dark:text-purple-400" />
            Sites & Attractions Costs
          </h2>
          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-2">
              <input
                id="sitesEnabled"
                v-model="plan.sites.enabled"
                type="checkbox"
                class="rounded border-gray-300"
              />
              <label
                for="sitesEnabled"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Enable Sites & Attractions
              </label>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              @click="addSite"
            >
              <Icon icon="mdi:plus" class="text-base" />
              Add Site
            </button>
          </div>

          <template v-if="plan.sites.enabled">
            <div
              v-if="plan.sites.sites.length === 0"
              class="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <Icon icon="mdi:map-marker-star" class="text-4xl mb-2 mx-auto opacity-50" />
              <p class="text-sm">No sites added yet. Click "Add Site" to get started.</p>
              <p class="text-xs mt-2 text-gray-400 dark:text-gray-500">
                You can add sites manually or import from third-party apps (coming soon)
              </p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="site in plan.sites.sites"
                :key="site.id"
                class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <Icon
                        icon="mdi:map-marker-star"
                        class="text-lg text-blue-600 dark:text-blue-400"
                      />
                      <input
                        v-model="site.name"
                        type="text"
                        class="flex-1 text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-gray-900 dark:text-white"
                        placeholder="Site name"
                      />
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                          >Location</label
                        >
                        <input
                          v-model="site.location"
                          type="text"
                          class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          placeholder="City, Country"
                        />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                          >Day</label
                        >
                        <input
                          v-model.number="site.day"
                          type="number"
                          min="1"
                          :max="itineraryDays.length || 1"
                          class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md p-1.5 ml-2"
                    @click="removeSite(site.id)"
                  >
                    <Icon icon="mdi:delete" />
                  </button>
                </div>

                <div class="mb-3">
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                    >Description</label
                  >
                  <textarea
                    v-model="site.description"
                    rows="2"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="Add description or notes about this site"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                      >Cost (per person)</label
                    >
                    <input
                      v-model.number="site.cost"
                      type="number"
                      min="0"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                      >Source</label
                    >
                    <select
                      v-model="site.source"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="manual">Manual Entry</option>
                      <option value="google">Google Places</option>
                      <option value="tripadvisor">TripAdvisor</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                      >URL (optional)</label
                    >
                    <input
                      v-model="site.url"
                      type="url"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-600 dark:text-gray-400">Total Cost:</span>
                    <span class="font-bold text-gray-900 dark:text-white">
                      {{ formatCurrency(site.cost * totalTravelers) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-200 dark:border-slate-700">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Sites Cost:
                </span>
                <span class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ formatCurrency(sitesCost) }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ plan.sites.sites.length }}
                {{ plan.sites.sites.length === 1 ? 'site' : 'sites' }} for {{ totalTravelers }}
                {{ totalTravelers === 1 ? 'traveler' : 'travelers' }}
              </p>
            </div>
          </template>
        </div>
      </div>

      <!-- Comparison Tab -->
      <div v-if="activeTab === 'comparison'" class="space-y-6">
        <div
          v-if="recommendation"
          class="p-6 rounded-lg border-2 bg-green-50 dark:bg-green-900/20 border-green-500"
        >
          <div class="flex items-start gap-4">
            <Icon
              icon="mdi:check-circle"
              class="text-3xl text-green-600 dark:text-green-400 shrink-0"
            />
            <div>
              <h3 class="text-xl font-bold text-green-700 dark:text-green-300 mb-2">
                Recommended: {{ recommendation.recommended }}
              </h3>
              <p class="text-base text-green-800 dark:text-green-200">
                {{ recommendation.reason }}
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-4">Road Trip</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Cost:</span>
                <span class="font-medium">{{ formatCurrency(roadTripCost) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Time:</span>
                <span class="font-medium">{{ roadTripTime.toFixed(1) }} hours</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Distance:</span>
                <span class="font-medium">{{ totalDistance.toFixed(1) }} km</span>
              </div>
            </div>
          </div>

          <div class="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-4">Public Transport</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Cost:</span>
                <span class="font-medium">{{ formatCurrency(publicTransportCost) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Time:</span>
                <span class="font-medium">{{ publicTransportTime.toFixed(1) }} hours</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Distance:</span>
                <span class="font-medium">{{ totalDistance.toFixed(1) }} km</span>
              </div>
              <div v-if="plan.publicTransport.options.length > 0" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Options:</span>
                <span class="font-medium"
                  >{{ plan.publicTransport.options.filter((o) => o.enabled).length }} active</span
                >
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <div class="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-4">Food</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Cost:</span>
                <span class="font-medium">{{ formatCurrency(foodCost) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Days:</span>
                <span class="font-medium">{{ itineraryDays.length }}</span>
              </div>
            </div>
          </div>

          <div class="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-4">Sites & Attractions</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Cost:</span>
                <span class="font-medium">{{ formatCurrency(sitesCost) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Sites:</span>
                <span class="font-medium">{{ plan.sites.sites.length }}</span>
              </div>
            </div>
          </div>

          <div class="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-4">Stay & Accommodation</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Cost:</span>
                <span class="font-medium">{{ formatCurrency(stayCost) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Category:</span>
                <span class="font-medium">{{ stayCategoryLabels[plan.stay.category] }}</span>
              </div>
              <div v-if="plan.stay.includeStay" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Nights:</span>
                <span class="font-medium">{{ plan.stay.nights }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cost Breakdown Visualization -->
        <div
          v-if="costBreakdown.length > 0"
          class="pt-4 border-t border-gray-200 dark:border-slate-700"
        >
          <h4 class="font-semibold text-gray-900 dark:text-white mb-4">Cost Breakdown</h4>
          <div class="space-y-3">
            <div v-for="item in costBreakdown" :key="item.label" class="flex items-center gap-3">
              <div class="w-24 text-sm text-gray-600 dark:text-gray-400 font-medium">
                {{ item.label }}
              </div>
              <div class="flex-1 relative">
                <div class="h-6 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
                  <div
                    class="h-full transition-all duration-300 flex items-center justify-end pr-2"
                    :style="{
                      width: `${(item.value / totalTripCost) * 100}%`,
                      backgroundColor: item.color,
                    }"
                  >
                    <span
                      v-if="(item.value / totalTripCost) * 100 > 10"
                      class="text-xs font-medium text-white"
                    >
                      {{ ((item.value / totalTripCost) * 100).toFixed(0) }}%
                    </span>
                  </div>
                </div>
              </div>
              <div class="w-32 text-right text-sm font-medium text-gray-900 dark:text-white">
                {{ formatCurrency(item.value) }}
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-200 dark:border-slate-700">
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Total Trip Cost:
              </span>
              <span class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ formatCurrency(totalTripCost) }}
              </span>
            </div>

            <div
              v-if="plan.budget > 0"
              class="rounded-lg p-4"
              :class="
                budgetStatus?.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              "
            >
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium"
                    :class="
                      budgetStatus?.type === 'success'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-yellow-700 dark:text-yellow-300'
                    "
                  >
                    Budget: {{ formatCurrency(plan.budget) }}
                  </div>
                  <div
                    class="text-xs mt-1"
                    :class="
                      budgetStatus?.type === 'success'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    "
                  >
                    {{ budgetStatus?.message }}
                  </div>
                </div>
                <div class="text-right">
                  <div
                    class="text-2xl font-bold"
                    :class="
                      budgetStatus?.type === 'success'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    "
                  >
                    {{ formatCurrency(remainingBudget) }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ remainingBudget >= 0 ? 'Remaining' : 'Over Budget' }}
                  </div>
                </div>
              </div>
              <div class="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full transition-all"
                  :class="budgetStatus?.type === 'success' ? 'bg-green-500' : 'bg-yellow-500'"
                  :style="{
                    width: `${Math.min(100, Math.max(0, (totalTripCost / plan.budget) * 100))}%`,
                  }"
                ></div>
              </div>
            </div>

            <div
              v-if="roadTripCost > 0 && publicTransportCost > 0"
              class="pt-2 border-t border-gray-200 dark:border-slate-700"
            >
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Transport Cost Difference:
                </span>
                <span
                  class="text-lg font-bold"
                  :class="
                    roadTripCost < publicTransportCost
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400'
                  "
                >
                  {{ formatCurrency(Math.abs(roadTripCost - publicTransportCost)) }}
                  {{
                    roadTripCost < publicTransportCost
                      ? 'saved by road'
                      : 'saved by public transport'
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Itinerary Tab -->
      <div v-if="activeTab === 'itinerary'" class="space-y-6">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Time blocks:</span>
          <button
            type="button"
            class="px-2.5 py-1.5 text-xs rounded-md border"
            :class="
              plan.itinerary.blocksPerDay === 2
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300'
            "
            @click="setBlockMode(2)"
          >
            2 blocks
          </button>
          <button
            type="button"
            class="px-2.5 py-1.5 text-xs rounded-md border"
            :class="
              plan.itinerary.blocksPerDay === 3
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300'
            "
            @click="setBlockMode(3)"
          >
            3 blocks
          </button>
          <button
            type="button"
            class="px-2.5 py-1.5 text-xs rounded-md border"
            :class="
              plan.itinerary.blocksPerDay === 4
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300'
            "
            @click="setBlockMode(4)"
          >
            4 blocks
          </button>
        </div>

        <div v-if="itineraryDays.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
          Add destinations to build a day-wise itinerary.
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="day in itineraryDays"
            :key="day.day"
            class="rounded-lg border border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm text-gray-500 dark:text-gray-400">Day {{ day.day }}</div>
              <div class="font-medium text-gray-900 dark:text-gray-100">{{ day.location }}</div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="label in activeBlockLabels" :key="label">
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  {{ label }}
                </label>
                <textarea
                  v-model="plan.itinerary.notes[String(day.day)][label]"
                  rows="2"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  placeholder="Add notes"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Total days: {{ itineraryDays.length }} (based on destination day allocation)
        </div>
      </div>

      <!-- Expenses Tab -->
      <div v-if="activeTab === 'expenses'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Expense Tracking</h3>
          <button
            type="button"
            class="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm"
            @click="addExpense"
          >
            <Icon icon="mdi:plus" class="inline mr-1" />
            Add Expense
          </button>
        </div>
        <div
          v-if="plan.expenses.items.length === 0"
          class="text-sm text-gray-500 dark:text-gray-400 text-center py-8"
        >
          No expenses added yet. Click "Add Expense" to start tracking.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="expense in plan.expenses.items"
            :key="expense.id"
            class="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                  >Category</label
                >
                <select
                  v-model="expense.category"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="transport">Transport</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="food">Food</option>
                  <option value="sightseeing">Sightseeing</option>
                  <option value="shopping">Shopping</option>
                  <option value="misc">Misc</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                  >Description</label
                >
                <input
                  v-model="expense.description"
                  type="text"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Expense description"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                  >Amount</label
                >
                <input
                  v-model.number="expense.amount"
                  type="number"
                  min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >Date</label
                  >
                  <input
                    v-model="expense.date"
                    type="date"
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  class="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md mt-6"
                  @click="removeExpense(expense.id)"
                >
                  <Icon icon="mdi:delete" />
                </button>
              </div>
            </div>
            <div class="mt-2">
              <textarea
                v-model="expense.notes"
                class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Additional notes (optional)"
                rows="1"
              />
            </div>
          </div>
        </div>
        <div
          v-if="plan.expenses.items.length > 0"
          class="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
        >
          <div class="flex justify-between items-center">
            <span class="font-medium text-emerald-900 dark:text-emerald-200">Total Expenses:</span>
            <span class="text-lg font-bold text-emerald-700 dark:text-emerald-300">{{
              formatCurrency(totalExpenses)
            }}</span>
          </div>
        </div>
      </div>

      <!-- Packing Tab -->
      <div v-if="activeTab === 'packing'" class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Packing List</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Progress: {{ packingProgress }}% ({{
                Object.values(plan.packing.lists)
                  .flat()
                  .filter((i) => i.packed).length
              }}/{{ Object.values(plan.packing.lists).flat().length }})
            </p>
          </div>
        </div>
        <div class="space-y-4">
          <div
            v-for="(items, category) in plan.packing.lists"
            :key="category"
            class="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-semibold text-gray-900 dark:text-white capitalize">{{ category }}</h4>
              <button
                type="button"
                class="px-2 py-1 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                @click="addPackingItem(category as keyof typeof plan.packing.lists)"
              >
                <Icon icon="mdi:plus" class="inline mr-1" />
                Add
              </button>
            </div>
            <div v-if="items.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-2">
              No items yet
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="item in items"
                :key="item.id"
                class="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <input
                  v-model="item.packed"
                  type="checkbox"
                  class="rounded border-gray-300 dark:border-gray-600"
                />
                <input
                  v-model="item.item"
                  type="text"
                  class="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Item name"
                  :class="item.packed ? 'line-through text-gray-400' : ''"
                />
                <button
                  type="button"
                  class="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  @click="removePackingItem(category as keyof typeof plan.packing.lists, item.id)"
                >
                  <Icon icon="mdi:delete" class="text-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Documents Tab -->
      <div v-if="activeTab === 'documents'" class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Travel Documents Checklist
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Check off items as you prepare them for your trip
          </p>
        </div>
        <div class="space-y-2">
          <div
            v-for="doc in plan.documents.checklist"
            :key="doc.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <input
              v-model="doc.checked"
              type="checkbox"
              class="rounded border-gray-300 dark:border-gray-600 w-5 h-5"
            />
            <div class="flex-1">
              <span
                class="font-medium text-gray-900 dark:text-white"
                :class="doc.checked ? 'line-through text-gray-400' : ''"
              >
                {{ doc.name }}
              </span>
              <span
                v-if="doc.required"
                class="ml-2 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded"
              >
                Required
              </span>
            </div>
          </div>
        </div>
        <div
          class="p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800"
        >
          <div class="flex items-center gap-2">
            <Icon icon="mdi:information" class="text-teal-600 dark:text-teal-400" />
            <span class="text-sm text-teal-800 dark:text-teal-200">
              {{ plan.documents.checklist.filter((d) => d.checked).length }}/{{
                plan.documents.checklist.length
              }}
              documents prepared
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Templates Modal -->
    <div v-if="showTemplatesModal" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/40" @click="showTemplatesModal = false"></div>
      <div class="relative w-full max-w-lg rounded-lg bg-white dark:bg-slate-800 p-6 shadow-xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Saved Templates</h3>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400"
            @click="showTemplatesModal = false"
          >
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div v-if="isLoadingTemplates" class="text-sm text-gray-600 dark:text-gray-400">
          Loading templates…
        </div>
        <div v-else-if="templates.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
          No templates saved yet.
        </div>
        <div v-else class="space-y-3 max-h-80 overflow-y-auto">
          <div
            v-for="tpl in templates"
            :key="tpl.id"
            class="border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex items-start justify-between gap-3"
          >
            <div class="min-w-0">
              <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ tpl.name }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ tpl.description || 'No description' }}
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                class="px-2.5 py-1.5 text-xs bg-sky-600 text-white rounded-md hover:bg-sky-700"
                @click="applyTemplate(tpl)"
              >
                Load
              </button>
              <button
                type="button"
                class="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
                @click="deleteTemplate(tpl)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Template Modal -->
    <div v-if="showSaveModal" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/40" @click="showSaveModal = false"></div>
      <div class="relative w-full max-w-lg rounded-lg bg-white dark:bg-slate-800 p-6 shadow-xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Save Template</h3>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400"
            @click="showSaveModal = false"
          >
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Name
            </label>
            <input
              v-model="templateName"
              type="text"
              class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Goa Road Trip"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              v-model="templateDescription"
              rows="3"
              class="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Add a short description"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              id="defaultTemplate"
              v-model="isDefaultTemplate"
              type="checkbox"
              class="rounded border-gray-300"
            />
            <label for="defaultTemplate" class="text-sm text-gray-700 dark:text-gray-300">
              Set as default template
            </label>
          </div>
          <div v-if="currentTemplateId" class="flex items-center gap-2">
            <input
              id="saveAsNew"
              v-model="saveAsNew"
              type="checkbox"
              class="rounded border-gray-300"
            />
            <label for="saveAsNew" class="text-sm text-gray-700 dark:text-gray-300">
              Save as new template
            </label>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600"
              @click="showSaveModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isSavingTemplate"
              class="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              @click="saveTemplate"
            >
              <span v-if="!isSavingTemplate">Save</span>
              <span v-else class="flex items-center">
                <Icon icon="mdi:loading" class="animate-spin mr-2" />
                Saving…
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <CommonToast />
  </div>
</template>
