import { computed, type MaybeRefOrGetter, toValue, watch, ref } from 'vue'

export const LIBRARY_PAGE_SIZE = 12

export function useLibraryPagination<T>(
  items: MaybeRefOrGetter<T[]>,
  pageSize: number = LIBRARY_PAGE_SIZE,
) {
  const currentPage = ref(1)

  const totalItems = computed(() => toValue(items).length)

  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize)))

  const pageItems = computed(() => {
    const list = toValue(items)
    const start = (currentPage.value - 1) * pageSize
    return list.slice(start, start + pageSize)
  })

  const rangeLabel = computed(() => {
    if (totalItems.value === 0) return '0 items'
    const start = (currentPage.value - 1) * pageSize + 1
    const end = Math.min(currentPage.value * pageSize, totalItems.value)
    return `${start}–${end} of ${totalItems.value}`
  })

  function goToPage(page: number) {
    currentPage.value = Math.min(Math.max(1, page), totalPages.value)
  }

  function nextPage() {
    goToPage(currentPage.value + 1)
  }

  function prevPage() {
    goToPage(currentPage.value - 1)
  }

  /** Reset to page 1 when the filtered list changes (search / chips / tabs). */
  watch(
    () => toValue(items).length,
    () => {
      if (currentPage.value > totalPages.value) {
        currentPage.value = totalPages.value
      }
    },
  )

  function resetPage() {
    currentPage.value = 1
  }

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    pageItems,
    rangeLabel,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
  }
}

export function uniqueSortedLabels(values: Array<string | undefined | null>): string[] {
  const set = new Set<string>()
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) set.add(trimmed)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
