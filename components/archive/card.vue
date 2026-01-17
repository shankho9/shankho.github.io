<script lang="ts" setup>
import { getTagColorClasses } from '~/utils/blog/tagColors'
import { computed } from 'vue'
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

interface Props {
  path?: string
  title?: string
  date?: string
  description?: string
  image?: string
  alt?: string
  ogImage?: string
  tags?: Array<string>
  published?: boolean
  type?: 'blog' | 'lifeline'
  searchQuery?: string
}

const props = withDefaults(defineProps<Props>(), {
  path: '/',
  title: 'no-title',
  date: 'no-date',
  description: 'no-description',
  image: '/blogs-img/blog.jpg',
  alt: 'no-alt',
  ogImage: '/blogs-img/blog.jpg',
  tags: () => [],
  published: false,
  type: 'blog',
  searchQuery: '',
})

// Normalize path for lifelines blogs
const normalizedPath = computed(() => {
  // For lifelines blogs, ensure path uses /personalSpace/ prefix
  const isLifeline =
    props.type === 'lifeline' || props.tags.some((tag) => tag.toLowerCase() === 'lifelines')

  if (!isLifeline) {
    return props.path
  }

  let path = props.path || '/'

  // Remove .md extension if present
  if (path.endsWith('.md')) {
    path = path.replace(/\.md$/, '')
  }

  // Remove leading /content/ if present
  if (path.startsWith('/content/')) {
    path = path.replace(/^\/content/, '')
  }

  // Remove leading /blogs/ if present
  if (path.startsWith('/blogs/')) {
    path = path.replace(/^\/blogs/, '')
  }

  // Ensure no double slashes
  path = path.replace(/\/+/g, '/')

  // Ensure path starts with /personalSpace/
  if (!path.startsWith('/personalSpace/')) {
    const cleanPath = path.replace(/^\/+/, '')
    path = `/personalSpace/${cleanPath}`
  }

  // Final cleanup
  return path.replace(/\/+/g, '/')
})

// Helper function to sanitize HTML (client-side only)
// DOMPurify only works on the client, so we handle SSR gracefully
// Note: highlightSearchTerm already escapes HTML, so this is an additional safety layer
function sanitizeHtml(
  html: string,
  options?: { ALLOWED_TAGS?: string[]; ALLOWED_ATTR?: string[] },
): string {
  // On server-side, highlightSearchTerm already escapes HTML, so return as-is
  // For plain text (no search query), escape HTML special characters
  if (import.meta.server) {
    // If the HTML contains <mark> tags (from highlighting), already properly escaped
    // For plain text, escape HTML special characters
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

// Highlight search terms in title and description
// The highlightSearchTerm function already escapes HTML, but we still sanitize with DOMPurify
// for defense in depth against XSS attacks (client-side only)
const highlightedTitle = computed(() => {
  if (!props.searchQuery?.trim()) {
    // Even without search, escape HTML for safety (server-side) or sanitize (client-side)
    return sanitizeHtml(props.title)
  }
  const highlighted = highlightSearchTerm(props.title, props.searchQuery)
  // Additional sanitization as defense in depth (highlightSearchTerm already escapes HTML)
  return sanitizeHtml(highlighted, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: ['class'] })
})

const highlightedDescription = computed(() => {
  if (!props.searchQuery?.trim()) {
    // Even without search, escape HTML for safety (server-side) or sanitize (client-side)
    return sanitizeHtml(props.description)
  }
  const highlighted = highlightSearchTerm(props.description, props.searchQuery)
  // Additional sanitization as defense in depth (highlightSearchTerm already escapes HTML)
  return sanitizeHtml(highlighted, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: ['class'] })
})
</script>

<template>
  <article
    class="group border dark:border-gray-800 m-2 rounded-2xl overflow-hidden shadow-sm text-zinc-700 dark:text-zinc-300"
  >
    <NuxtLink
      :to="normalizedPath"
      class="grid grid-cols-1 sm:grid-cols-10 gap-1 touch-manipulation"
      style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
    >
      <div class="sm:col-span-3">
        <NuxtImg
          class="h-full w-full object-cover object-center rounded-t-2xl sm:rounded-l-2xl sm:rounded-t-none shadow-lg group-hover:scale-[1.02] transition-all duration-500"
          width="300"
          :src="image"
          :alt="alt"
          loading="lazy"
          placeholder
          format="webp"
        />
      </div>
      <div class="sm:col-span-7 p-5">
        <!-- eslint-disable vue/no-v-html -->
        <h2
          class="text-xl font-semibold text-black dark:text-zinc-300 pb-1 group-hover:text-sky-700 dark:group-hover:text-sky-400"
          v-html="highlightedTitle"
        ></h2>
        <p class="text-ellipsis line-clamp-2" v-html="highlightedDescription"></p>
        <!-- eslint-enable vue/no-v-html -->
        <div class="text-black dark:text-zinc-300 text-sm mt-2 mb-1 md:flex md:space-x-6">
          <div class="flex items-center">
            <LogoDate />
            <p>{{ date }}</p>
          </div>
          <div class="flex items-center gap-1 flex-wrap">
            <LogoTag />
            <p
              v-for="tag in tags"
              :key="tag"
              :class="['rounded px-1.5 py-0.5 text-xs font-medium', getTagColorClasses(tag)]"
            >
              {{ tag }}
            </p>
          </div>
        </div>
        <div class="flex group-hover:underline text-sky-700 dark:text-sky-400 items-center pt-2">
          <p>Read More</p>
          <LogoArrow />
        </div>
      </div>
    </NuxtLink>
  </article>
</template>
