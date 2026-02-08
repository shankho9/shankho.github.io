<script setup lang="ts">
/**
 * Custom ProseImg to fix IPX 500 errors for external ImageKit URLs.
 * External URLs (ImageKit, etc.) use native img to bypass IPX - avoids double-encoding
 * and fetch failures. Local paths still use NuxtImg for optimization.
 */
interface Props {
  src: string
  alt?: string
  width?: string | number
  height?: string | number
  [key: string]: unknown
}

const props = defineProps<Props>()

// Use native img for external URLs to avoid IPX 500 errors (double-encoding, fetch failures)
const isExternal = computed(
  () =>
    typeof props.src === 'string' &&
    (props.src.startsWith('http://') || props.src.startsWith('https://')),
)
</script>

<template>
  <NuxtImg
    v-if="!isExternal"
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    loading="lazy"
    class="rounded-lg"
    v-bind="$attrs"
  />
  <img
    v-else
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    loading="lazy"
    class="rounded-lg max-w-full h-auto"
    v-bind="$attrs"
  />
</template>
