<script setup lang="ts">
/**
 * Renders external image URLs with a native <img> to avoid IPX failures on
 * third-party hosts (Notion S3, ImageKit, etc.). Local paths still use NuxtImg.
 */
interface Props {
  src: string
  alt?: string
  imgClass?: string
  referrerPolicy?: '' | 'no-referrer' | 'origin' | 'no-referrer-when-downgrade'
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  imgClass: '',
  referrerPolicy: 'no-referrer',
})

const emit = defineEmits<{
  error: []
}>()

const isExternal = computed(
  () =>
    typeof props.src === 'string' &&
    (props.src.startsWith('http://') || props.src.startsWith('https://')),
)

const isProxied = computed(() => props.src.startsWith('/api/notion/image'))

const handleError = () => {
  emit('error')
}
</script>

<template>
  <NuxtImg
    v-if="!isExternal && !isProxied"
    :src="src"
    :alt="alt"
    :class="imgClass"
    loading="lazy"
    format="webp"
    quality="80"
    @error="handleError"
  />
  <img
    v-else
    :src="src"
    :alt="alt"
    :class="imgClass"
    :referrerpolicy="referrerPolicy"
    loading="lazy"
    decoding="async"
    @error="handleError"
  />
</template>
