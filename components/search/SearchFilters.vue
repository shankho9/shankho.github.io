<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  allTags: string[]
  allCategories: string[]
  selectedTags: string[]
  selectedCategories: string[]
  minDate?: string
  maxDate?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:selectedTags': [tags: string[]]
  'update:selectedCategories': [categories: string[]]
  'update:minDate': [date: string | undefined]
  'update:maxDate': [date: string | undefined]
  clear: []
}>()

const showDateFilter = ref(false)
const localMinDate = ref(props.minDate || '')
const localMaxDate = ref(props.maxDate || '')

const hasActiveFilters = computed(
  () =>
    props.selectedTags.length > 0 ||
    props.selectedCategories.length > 0 ||
    localMinDate.value ||
    localMaxDate.value,
)

function clearDateFilter() {
  localMinDate.value = ''
  localMaxDate.value = ''
  emit('update:minDate', undefined)
  emit('update:maxDate', undefined)
}

function applyDateFilter() {
  emit('update:minDate', localMinDate.value || undefined)
  emit('update:maxDate', localMaxDate.value || undefined)
}

function clearAllFilters() {
  emit('update:selectedTags', [])
  emit('update:selectedCategories', [])
  clearDateFilter()
  emit('clear')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Date Range Filter -->
    <div class="flex flex-col gap-2">
      <button
        class="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-sky-700 dark:hover:text-sky-400 transition-colors"
        @click="showDateFilter = !showDateFilter"
      >
        <Icon name="mdi:calendar-range" size="18" />
        <span>Date Range Filter</span>
        <Icon
          :name="showDateFilter ? 'mdi:chevron-up' : 'mdi:chevron-down'"
          size="18"
          class="ml-auto"
        />
      </button>

      <div
        v-if="showDateFilter"
        class="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-md"
      >
        <div class="flex-1">
          <label class="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">From Date</label>
          <input
            v-model="localMinDate"
            type="date"
            class="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>
        <div class="flex-1">
          <label class="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">To Date</label>
          <input
            v-model="localMaxDate"
            type="date"
            class="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>
        <div class="flex items-end gap-2">
          <button
            class="px-3 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
            @click="applyDateFilter"
          >
            Apply
          </button>
          <button
            v-if="minDate || maxDate"
            class="px-3 py-1.5 text-sm bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            @click="clearDateFilter"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Active Date Filter Display -->
      <div
        v-if="(minDate || maxDate) && !showDateFilter"
        class="text-xs text-zinc-600 dark:text-zinc-400"
      >
        <span v-if="minDate">From: {{ minDate }}</span>
        <span v-if="minDate && maxDate"> | </span>
        <span v-if="maxDate">To: {{ maxDate }}</span>
      </div>
    </div>

    <!-- Active Filters Summary -->
    <div v-if="hasActiveFilters" class="flex items-center gap-2 flex-wrap">
      <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Active Filters:</span>
      <span
        v-if="selectedTags.length > 0"
        class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
      >
        {{ selectedTags.length }} tag(s)
      </span>
      <span
        v-if="selectedCategories.length > 0"
        class="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded"
      >
        {{ selectedCategories.length }} category(s)
      </span>
      <span
        v-if="minDate || maxDate"
        class="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded"
      >
        Date range
      </span>
      <button
        class="text-xs text-red-600 dark:text-red-400 hover:underline"
        @click="clearAllFilters"
      >
        Clear All
      </button>
    </div>
  </div>
</template>
