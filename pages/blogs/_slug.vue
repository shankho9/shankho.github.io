<template>
  <div class="container">
    <h1 class="text-2xl font-bold mb-4">{{ post?.title }}</h1>

    <!-- Render content dynamically from sanitized markdown -->
    <div v-if="post" class="content" v-html="sanitizedContent"></div>

    <!-- Display Map if places are available -->
    <GoogleMap v-if="post?.places?.length" :places="post.places" />

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, defineAsyncComponent } from 'vue'
import DOMPurify from 'dompurify' // Import DOMPurify for sanitizing HTML content
import { useRoute } from 'vue-router'

interface Place {
  name: string
  lat: number
  lng: number
  description?: string
}

const route = useRoute()
const post = ref<{ title: string; content: string; places: Place[] } | null>(null)
const errorMessage = ref('')

// Computed property for sanitized content
const sanitizedContent = computed(() => {
  return DOMPurify.sanitize(post.value?.content || '')
})

// Fetch the post based on the slug
onMounted(async () => {
  const slug = route.params.slug as string // Extract the slug from the route

  try {
    // Fetch the post data from your API (the API we created in step 3.1)
    const response = await fetch(`/api/blog/${slug}`)
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    post.value = data
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Failed to fetch post data.'
  }
})
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.content {
  margin-top: 20px;
}

.error-message {
  color: #e11d48; /* Red for errors */
  margin-top: 20px;
}
</style>
