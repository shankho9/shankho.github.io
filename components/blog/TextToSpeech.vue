<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  postId: string
}>()

const isSupported = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)
const speechSynthesis = ref<SpeechSynthesis | null>(null)
const voices = ref<SpeechSynthesisVoice[]>([])
const selectedVoice = ref<SpeechSynthesisVoice | null>(null)
const rate = ref(1.0)
const pitch = ref(1.0)
const volume = ref(1.0)

// Get article text content
const articleText = computed(() => {
  if (typeof document === 'undefined') return ''
  const proseElement = document.querySelector('.prose')
  if (!proseElement) return ''

  // Remove script and style elements
  const clone = proseElement.cloneNode(true) as HTMLElement
  const scripts = clone.querySelectorAll('script, style, .comments-section, .social-share-wrapper')
  scripts.forEach((el) => el.remove())

  // Get text content
  return clone.textContent || ''
})

onMounted(() => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    isSupported.value = true
    speechSynthesis.value = window.speechSynthesis

    // Load voices
    const loadVoices = () => {
      voices.value = speechSynthesis.value?.getVoices() || []
      // Prefer English voices, default to first available
      selectedVoice.value =
        voices.value.find((v) => v.lang.startsWith('en')) || voices.value[0] || null
    }

    loadVoices()
    // Some browsers load voices asynchronously
    if (speechSynthesis.value) {
      speechSynthesis.value.onvoiceschanged = loadVoices
    }
  }
})

onUnmounted(() => {
  stop()
})

const play = () => {
  if (!isSupported.value || !speechSynthesis.value || !articleText.value) return

  // Stop any current speech
  stop()

  const utterance = new SpeechSynthesisUtterance(articleText.value)
  utterance.rate = rate.value
  utterance.pitch = pitch.value
  utterance.volume = volume.value

  if (selectedVoice.value) {
    utterance.voice = selectedVoice.value
  }

  utterance.onstart = () => {
    isPlaying.value = true
    isPaused.value = false
  }

  utterance.onend = () => {
    isPlaying.value = false
    isPaused.value = false
    currentUtterance.value = null
  }

  utterance.onerror = () => {
    isPlaying.value = false
    isPaused.value = false
    currentUtterance.value = null
  }

  currentUtterance.value = utterance
  speechSynthesis.value.speak(utterance)
}

const pause = () => {
  if (speechSynthesis.value && isPlaying.value) {
    speechSynthesis.value.pause()
    isPaused.value = true
  }
}

const resume = () => {
  if (speechSynthesis.value && isPaused.value) {
    speechSynthesis.value.resume()
    isPaused.value = false
  }
}

const stop = () => {
  if (speechSynthesis.value) {
    speechSynthesis.value.cancel()
    isPlaying.value = false
    isPaused.value = false
    currentUtterance.value = null
  }
}

const togglePlayPause = () => {
  if (!isPlaying.value && !isPaused.value) {
    play()
  } else if (isPaused.value) {
    resume()
  } else {
    pause()
  }
}
</script>

<template>
  <div v-if="isSupported && articleText" class="text-to-speech-controls">
    <div class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <!-- Play/Pause Button -->
      <button
        class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        :title="isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'"
        @click="togglePlayPause"
      >
        <Icon
          :name="isPlaying ? 'mdi:pause' : isPaused ? 'mdi:play' : 'mdi:play'"
          class="w-5 h-5"
        />
      </button>

      <!-- Stop Button -->
      <button
        v-if="isPlaying || isPaused"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-colors"
        title="Stop"
        @click="stop"
      >
        <Icon name="mdi:stop" class="w-5 h-5" />
      </button>

      <!-- Settings Dropdown -->
      <div class="flex-1 flex items-center gap-4 text-sm">
        <!-- Rate -->
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-600 dark:text-gray-400">Speed:</label>
          <input
            v-model.number="rate"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            class="w-20"
            :disabled="isPlaying || isPaused"
          />
          <span class="text-xs text-gray-700 dark:text-gray-300 w-8">{{ rate.toFixed(1) }}x</span>
        </div>

        <!-- Pitch -->
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-600 dark:text-gray-400">Pitch:</label>
          <input
            v-model.number="pitch"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            class="w-20"
            :disabled="isPlaying || isPaused"
          />
          <span class="text-xs text-gray-700 dark:text-gray-300 w-8">{{ pitch.toFixed(1) }}</span>
        </div>

        <!-- Voice Selection -->
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-600 dark:text-gray-400">Voice:</label>
          <select
            v-model="selectedVoice"
            class="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            :disabled="isPlaying || isPaused"
          >
            <option
              v-for="voice in voices.filter((v) => v.lang.startsWith('en'))"
              :key="voice.name"
              :value="voice"
            >
              {{ voice.name }} ({{ voice.lang }})
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-to-speech-controls {
  @apply mb-6;
}
</style>
