<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    postId: string
    embedded?: boolean
  }>(),
  {
    embedded: false,
  },
)

// postId reserved for per-post TTS preferences
void props.postId

const isSupported = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)
const speechSynthesis = ref<SpeechSynthesis | null>(null)
const voices = ref<SpeechSynthesisVoice[]>([])
const selectedVoiceName = ref<string>('')
const rate = ref(1.0)
const pitch = ref(1.0)
const volume = ref(1.0)

// Get available voices for the dropdown (English preferred, but show all if no English available)
const availableVoices = computed(() => {
  const englishVoices = voices.value.filter((v) => v.lang.startsWith('en'))
  // If English voices exist, show only English. Otherwise, show all voices.
  return englishVoices.length > 0 ? englishVoices : voices.value
})

// Get the voice object from the selected voice name
const selectedVoice = computed(() => {
  if (!selectedVoiceName.value) return null
  return voices.value.find((v) => v.name === selectedVoiceName.value) || null
})

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

      // Only set default if not already set
      if (!selectedVoiceName.value && voices.value.length > 0) {
        // Prefer English voices, but only select from available voices (those that will appear in dropdown)
        const englishVoices = voices.value.filter((v) => v.lang.startsWith('en'))
        const voicesToChooseFrom = englishVoices.length > 0 ? englishVoices : voices.value
        const defaultVoice = voicesToChooseFrom[0] || null

        if (defaultVoice) {
          selectedVoiceName.value = defaultVoice.name
        }
      } else if (selectedVoiceName.value) {
        // If a voice is already selected, verify it still exists in available voices
        // If not, reset to a valid default
        const englishVoices = voices.value.filter((v) => v.lang.startsWith('en'))
        const voicesToChooseFrom = englishVoices.length > 0 ? englishVoices : voices.value
        const currentVoiceExists = voicesToChooseFrom.some(
          (v) => v.name === selectedVoiceName.value,
        )

        if (!currentVoiceExists && voicesToChooseFrom.length > 0) {
          // Selected voice is no longer available, reset to first available
          selectedVoiceName.value = voicesToChooseFrom[0].name
        }
      }
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
  <div v-if="isSupported && articleText" :class="embedded ? '' : 'text-to-speech-controls'">
    <div
      :class="[
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3',
        embedded
          ? ''
          : 'rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800',
      ]"
    >
      <div class="flex shrink-0 items-center gap-2">
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-white transition-colors hover:bg-sky-700"
          :title="isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'"
          @click="togglePlayPause"
        >
          <Icon
            :name="isPlaying ? 'mdi:pause' : isPaused ? 'mdi:play' : 'mdi:play'"
            class="h-5 w-5"
          />
        </button>

        <button
          v-if="isPlaying || isPaused"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-500 text-white transition-colors hover:bg-zinc-600"
          title="Stop"
          @click="stop"
        >
          <Icon name="mdi:stop" class="h-5 w-5" />
        </button>

        <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400 sm:hidden">
          Listen to article
        </span>
      </div>

      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div class="flex items-center gap-2">
          <label class="text-xs text-zinc-500 dark:text-zinc-400">Speed</label>
          <input
            v-model.number="rate"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            class="w-16 sm:w-20"
            :disabled="isPlaying || isPaused"
          />
          <span class="w-8 text-xs text-zinc-700 dark:text-zinc-300">{{ rate.toFixed(1) }}x</span>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-xs text-zinc-500 dark:text-zinc-400">Pitch</label>
          <input
            v-model.number="pitch"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            class="w-16 sm:w-20"
            :disabled="isPlaying || isPaused"
          />
          <span class="w-8 text-xs text-zinc-700 dark:text-zinc-300">{{ pitch.toFixed(1) }}</span>
        </div>

        <div class="flex min-w-0 flex-1 items-center gap-2">
          <label class="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">Voice</label>
          <select
            v-model="selectedVoiceName"
            class="min-w-0 max-w-full flex-1 truncate rounded border border-gray-200 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-100"
            :disabled="isPlaying || isPaused"
          >
            <option v-for="voice in availableVoices" :key="voice.name" :value="voice.name">
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
