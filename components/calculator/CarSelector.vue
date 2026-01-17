<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, watch, computed, onUnmounted } from 'vue'

interface Manufacturer {
  id: number
  name: string
  country: string
}

interface CarModel {
  id: number
  manufacturer_id: number
  name: string
  body_type: string | null
  segment: string | null
}

interface CarVariant {
  id: number
  model_id: number
  variant_name: string
  fuel_type: string | null
  engine_displacement_cc: number | null
  max_power_ps: number | null
  max_torque_nm: number | null
  transmission_type: string | null
  transmission_speeds: number | null
  mileage_kmpl: number | null
  price_ex_showroom_inr: number | null
  price_on_road_inr: number | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  wheelbase_mm: number | null
  ground_clearance_mm: number | null
  boot_space_liters: number | null
  fuel_tank_capacity_liters: number | null
}

interface SearchResult {
  type: string
  id: number
  manufacturer_id: number | null
  model_id: number | null
  name: string
  display_name: string
}

const props = defineProps<{
  modelValue?: string
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'variant-selected': [variant: CarVariant & { manufacturer_name: string; model_name: string }]
}>()

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const isLoading = ref(false)
const showDropdown = ref(false)
const selectedVariant = ref<
  (CarVariant & { manufacturer_name: string; model_name: string }) | null
>(null)

const displayValue = computed(() => {
  if (selectedVariant.value) {
    return `${selectedVariant.value.manufacturer_name} ${selectedVariant.value.model_name} ${selectedVariant.value.variant_name}`
  }
  return searchQuery.value || props.modelValue || ''
})

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null
let isProgrammaticUpdate = false // Flag to prevent watch from triggering on programmatic updates

watch(searchQuery, (newQuery) => {
  // Skip watch handler if this is a programmatic update
  if (isProgrammaticUpdate) {
    isProgrammaticUpdate = false
    return
  }

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  if (newQuery.length < 2) {
    searchResults.value = []
    showDropdown.value = false
    return
  }

  searchTimeout = setTimeout(async () => {
    await performSearch(newQuery)
  }, 300)
})

// Track if component is mounted to prevent state updates after unmount
const isMounted = ref(true)

const performSearch = async (query: string) => {
  if (!isMounted.value) {
    return // Component unmounted, don't update state
  }

  // Only set loading state if component is still mounted
  if (isMounted.value) {
    isLoading.value = true
  }

  try {
    const response = await $fetch<{ success: boolean; results: SearchResult[] }>(
      `/api/cars/search?q=${encodeURIComponent(query)}`,
    )

    if (!isMounted.value) {
      return // Component unmounted during API call
    }

    if (response.success) {
      searchResults.value = response.results
      showDropdown.value = response.results.length > 0
    } else {
      // Clear results if API returns success: false
      searchResults.value = []
      showDropdown.value = false
    }
  } catch (error) {
    if (!isMounted.value) {
      return // Component unmounted during error handling
    }
    console.error('Error searching cars:', error)
    searchResults.value = []
    showDropdown.value = false
  } finally {
    // Only reset loading state if component is still mounted to avoid state updates after unmount
    if (isMounted.value) {
      isLoading.value = false
    }
  }
}

const selectResult = async (result: SearchResult) => {
  if (result.type === 'variant') {
    // Variant selected - load full details
    try {
      const response = await $fetch<{
        success: boolean
        variant: CarVariant & { manufacturer_name: string; model_name: string }
      }>(`/api/cars/variant/${result.id}`)

      if (response.success) {
        selectedVariant.value = response.variant
        // Clear any pending search timeout and prevent watch from triggering
        if (searchTimeout) {
          clearTimeout(searchTimeout)
          searchTimeout = null
        }
        isProgrammaticUpdate = true
        searchQuery.value = displayValue.value
        showDropdown.value = false
        emit('variant-selected', response.variant)
        emit('update:modelValue', displayValue.value)
      }
    } catch (error) {
      console.error('Error fetching variant details:', error)
    }
  } else if (result.type === 'model' && result.manufacturer_id) {
    // Model selected - load all variants and auto-select first one
    try {
      const response = await $fetch<{ success: boolean; variants: CarVariant[] }>(
        `/api/cars/variants?model_id=${result.id}`,
      )

      if (response.success && response.variants.length > 0) {
        const modelResponse = await $fetch<{ success: boolean; models: CarModel[] }>(
          `/api/cars/models?manufacturer_id=${result.manufacturer_id}`,
        )

        if (!modelResponse.success || !modelResponse.models) {
          console.error('Failed to fetch model data')
          return
        }

        const model = modelResponse.models.find((m) => m.id === result.id)

        if (model && result.manufacturer_id) {
          const manufacturerResponse = await $fetch<{
            success: boolean
            manufacturers: Manufacturer[]
          }>('/api/cars/manufacturers')

          if (!manufacturerResponse.success || !manufacturerResponse.manufacturers) {
            console.error('Failed to fetch manufacturer data')
            return
          }

          const manufacturer = manufacturerResponse.manufacturers.find(
            (m) => m.id === result.manufacturer_id,
          )

          if (manufacturer) {
            const variant = response.variants[0]
            selectedVariant.value = {
              ...variant,
              manufacturer_name: manufacturer.name,
              model_name: model.name,
            }
            // Clear any pending search timeout and prevent watch from triggering
            if (searchTimeout) {
              clearTimeout(searchTimeout)
              searchTimeout = null
            }
            isProgrammaticUpdate = true
            searchQuery.value = displayValue.value
            showDropdown.value = false
            emit('variant-selected', selectedVariant.value)
            emit('update:modelValue', displayValue.value)
          }
        }
      }
    } catch (error) {
      console.error('Error loading variants:', error)
    }
  } else if (result.type === 'manufacturer') {
    // Manufacturer selected - search for all models by this manufacturer
    // Clear any pending search timeout to avoid duplicate calls
    if (searchTimeout) {
      clearTimeout(searchTimeout)
      searchTimeout = null
    }
    // Set flag to prevent watch from triggering, then set searchQuery and perform search immediately
    isProgrammaticUpdate = true
    searchQuery.value = result.name
    await performSearch(result.name)
  }
}

const clearSelection = () => {
  selectedVariant.value = null
  // Clear any pending search timeout and prevent watch from triggering
  if (searchTimeout) {
    clearTimeout(searchTimeout)
    searchTimeout = null
  }
  isProgrammaticUpdate = true
  searchQuery.value = ''
  showDropdown.value = false
  emit('update:modelValue', '')
}

// Expose selected variant for parent component
defineExpose({
  selectedVariant: computed(() => selectedVariant.value),
  clearSelection,
})

// Cleanup on unmount
onUnmounted(() => {
  isMounted.value = false
  if (searchTimeout) {
    clearTimeout(searchTimeout)
    searchTimeout = null
  }
})
</script>

<template>
  <div class="relative">
    <label v-if="label" class="block text-sm font-medium mb-1">{{ label }}</label>
    <div class="relative">
      <input
        :value="selectedVariant ? displayValue : searchQuery"
        type="text"
        placeholder="Search car (e.g., Tata Nexon, Maruti Swift)"
        class="w-full px-2 py-1.5 text-sm border rounded bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
        @input="
          (e) => {
            const inputValue = (e.target as HTMLInputElement).value
            if (selectedVariant.value) {
              // Clear selection but preserve the typed input
              selectedVariant.value = null
              showDropdown.value = false
              emit('update:modelValue', '')
              // Clear any pending search timeout and prevent watch from triggering
              if (searchTimeout) {
                clearTimeout(searchTimeout)
                searchTimeout = null
              }
              isProgrammaticUpdate = true
            }
            // Set search query after clearing selection to preserve user input
            searchQuery.value = inputValue
          }
        "
        @focus="showDropdown.value = searchResults.length > 0"
        @blur="setTimeout(() => (showDropdown.value = false), 200)"
      />
      <button
        v-if="selectedVariant"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        type="button"
        @click="clearSelection"
      >
        <Icon icon="mdi:close" class="text-sm" />
      </button>
      <Icon
        v-if="isLoading"
        icon="mdi:loading"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
      />
    </div>

    <!-- Selected Car Details -->
    <div
      v-if="selectedVariant"
      class="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
    >
      <div class="flex items-start justify-between mb-2">
        <div>
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ selectedVariant.manufacturer_name }} {{ selectedVariant.model_name }}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {{ selectedVariant.variant_name }}
          </div>
        </div>
        <button class="text-gray-400 hover:text-gray-600" type="button" @click="clearSelection">
          <Icon icon="mdi:close" class="text-xs" />
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div v-if="selectedVariant.fuel_type">
          <span class="text-gray-500 dark:text-gray-400">Fuel:</span>
          <span class="ml-1 font-medium">{{ selectedVariant.fuel_type }}</span>
        </div>
        <div v-if="selectedVariant.mileage_kmpl != null">
          <span class="text-gray-500 dark:text-gray-400">Mileage:</span>
          <span class="ml-1 font-medium">{{ selectedVariant.mileage_kmpl }} kmpl</span>
        </div>
        <div
          v-if="
            selectedVariant.price_ex_showroom_inr != null &&
            selectedVariant.price_ex_showroom_inr !== 0
          "
        >
          <span class="text-gray-500 dark:text-gray-400">Price:</span>
          <span class="ml-1 font-medium"
            >₹{{ Number(selectedVariant.price_ex_showroom_inr).toLocaleString('en-IN') }}</span
          >
        </div>
        <div v-if="selectedVariant.transmission_type">
          <span class="text-gray-500 dark:text-gray-400">Transmission:</span>
          <span class="ml-1 font-medium">{{ selectedVariant.transmission_type }}</span>
        </div>
      </div>
    </div>

    <!-- Dropdown Results -->
    <div
      v-if="showDropdown && searchResults.length > 0"
      class="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
    >
      <div
        v-for="result in searchResults"
        :key="`${result.type}-${result.id}`"
        class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 dark:bg-slate-900 cursor-pointer border-b border-gray-200 dark:border-slate-700 last:border-b-0 transition-colors"
        @mousedown.prevent="selectResult(result)"
      >
        <div class="flex items-center gap-2">
          <Icon
            :icon="
              result.type === 'manufacturer'
                ? 'mdi:factory'
                : result.type === 'model'
                  ? 'mdi:car'
                  : 'mdi:car-sports'
            "
            class="text-sky-600 dark:text-sky-400"
          />
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-white">
              {{ result.display_name }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-300 capitalize">
              {{ result.type }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
