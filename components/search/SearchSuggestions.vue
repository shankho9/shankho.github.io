<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { highlightSearchTerm } from '~/utils/search/searchHighlighter'

// Escape HTML helper for server-side (DOMPurify only works on client)
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

interface Suggestion {
  text: string
  type: 'title' | 'description' | 'tag'
}

interface Props {
  suggestions: Suggestion[]
  query: string
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [query: string]
  close: []
}>()

const selectedIndex = ref(-1)

// Reset selected index when suggestions change
watch(
  () => props.suggestions,
  () => {
    selectedIndex.value = -1
  },
)

const hasSuggestions = computed(() => props.show && props.suggestions.length > 0)

function selectSuggestion(suggestion: Suggestion) {
  emit('select', suggestion.text)
}

// Helper function to sanitize HTML (client-side only)
// DOMPurify only works on the client, so we handle SSR gracefully
// Note: highlightSearchTerm already escapes HTML, so this is an additional safety layer
function sanitizeHtml(
  html: string,
  options?: { ALLOWED_TAGS?: string[]; ALLOWED_ATTR?: string[] },
): string {
  // On server-side, highlightSearchTerm already escapes HTML, so return as-is
  if (import.meta.server) {
    // If the HTML contains <mark> tags (from highlighting), already properly escaped
    if (html.includes('<mark')) {
      return html // Already properly escaped by highlightSearchTerm
    }
    return escapeHtml(html) // Plain text, escape it
  }

  // On client-side, try to use DOMPurify for additional sanitization if available
  if (import.meta.client && typeof window !== 'undefined') {
    try {
      // DOMPurify is made available by plugins/dompurify.client.ts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DOMPurify = (window as any).DOMPurify
      if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
        return DOMPurify.sanitize(html, options || {})
      }
    } catch {
      // DOMPurify not available, use fallback
    }
  }

  // Fallback: return as-is (already escaped by highlightSearchTerm) or escape if needed
  // highlightSearchTerm already escapes everything, so we can trust it
  return html.includes('<mark') ? html : escapeHtml(html)
}

function highlightText(text: string): string {
  const highlighted = highlightSearchTerm(text, props.query)
  // Additional sanitization as defense in depth (highlightSearchTerm already escapes HTML)
  return sanitizeHtml(highlighted, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: ['class'] })
}

// Keyboard navigation
function handleKeyDown(event: KeyboardEvent) {
  if (!hasSuggestions.value) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, props.suggestions.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
  } else if (event.key === 'Enter' && selectedIndex.value >= 0) {
    event.preventDefault()
    selectSuggestion(props.suggestions[selectedIndex.value])
  } else if (event.key === 'Escape') {
    emit('close')
  }
}

defineExpose({
  handleKeyDown,
  selectedIndex,
})
</script>

<template>
  <div
    v-if="hasSuggestions"
    class="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
  >
    <div
      v-for="(suggestion, index) in suggestions"
      :key="`${suggestion.type}-${index}`"
      :class="[
        'px-4 py-2 cursor-pointer transition-colors',
        index === selectedIndex
          ? 'bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-100'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100',
      ]"
      @click="selectSuggestion(suggestion)"
    >
      <div class="flex items-center gap-2">
        <Icon
          :name="
            suggestion.type === 'title'
              ? 'mdi:file-document'
              : suggestion.type === 'tag'
                ? 'mdi:tag'
                : 'mdi:text'
          "
          size="16"
          class="text-gray-500 dark:text-gray-400 flex-shrink-0"
        />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span class="text-sm flex-1" v-html="highlightText(suggestion.text)"></span>
        <span
          :class="[
            'text-xs px-2 py-0.5 rounded',
            suggestion.type === 'title'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : suggestion.type === 'tag'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
        >
          {{ suggestion.type }}
        </span>
      </div>
    </div>
  </div>
</template>
