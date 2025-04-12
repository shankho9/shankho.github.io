<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">Add a New Place</h1>

    <form class="space-y-4" @submit.prevent="submitPlace">
      <div>
        <label class="block font-medium">Name</label>
        <input v-model="form.name" required type="text" class="input" />
      </div>

      <div>
        <label class="block font-medium">Latitude</label>
        <input v-model.number="form.lat" required type="number" step="any" class="input" />
      </div>

      <div>
        <label class="block font-medium">Longitude</label>
        <input v-model.number="form.lng" required type="number" step="any" class="input" />
      </div>

      <div>
        <label class="block font-medium">Year Visited</label>
        <input
          v-model.number="form.year"
          type="number"
          min="1900"
          max="2100"
          class="input"
          placeholder="e.g. 2024"
        />
      </div>

      <div>
        <label class="block font-medium">Type</label>
        <select v-model="form.type" required class="input">
          <option disabled value="">Select a type</option>
          <option value="home">Home</option>
          <option value="trip">Trip</option>
        </select>
      </div>

      <div>
        <label class="block font-medium">Description</label>
        <textarea v-model="form.description" class="input" rows="2" />
      </div>

      <div>
        <label class="block font-medium">Blog Slug (optional)</label>
        <input v-model="form.blog_slug" type="text" class="input" />
      </div>

      <button type="submit" class="btn">Add Place</button>

      <p v-if="successMessage" class="text-green-600 mt-2">{{ successMessage }}</p>
      <p v-if="errorMessage" class="text-red-600 mt-2">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface PlaceForm {
  name: string
  lat: number | null
  lng: number | null
  year?: number | null
  description: string
  blog_slug?: string
  type: 'home' | 'trip' | ''
}

interface ApiResponse {
  success?: boolean
  place?: {
    name: string
  }
  error?: string
}

const form = ref<PlaceForm>({
  name: '',
  lat: null,
  lng: null,
  year: null,
  description: '',
  blog_slug: '',
  type: '', // Initially empty
})

const successMessage = ref('')
const errorMessage = ref('')

const submitPlace = async () => {
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const { data, error } = await useFetch<ApiResponse>('/api/places', {
      method: 'POST',
      body: form.value,
    })

    if (error.value || data.value?.error) {
      throw new Error(error.value?.message || data.value?.error || 'Unknown error')
    }

    successMessage.value = `Place "${data.value?.place?.name}" added!`

    form.value = {
      name: '',
      lat: null,
      lng: null,
      year: null,
      description: '',
      blog_slug: '',
      type: '',
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = 'Failed to add place'
    }
  }
}
</script>

<style scoped>
.input {
  @apply w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600;
}

.btn {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700;
}
</style>
