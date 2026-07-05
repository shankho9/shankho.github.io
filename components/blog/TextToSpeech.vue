<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    postId: string
    embedded?: boolean
  }>(),
  {
    embedded: false,
  },
)

void props.postId

const PROSE_SELECTOR =
  '.blog-content-container [data-article-prose], .blog-content-container .prose'

const isSupported = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)
const speechSynthesis = ref<SpeechSynthesis | null>(null)
const voices = ref<SpeechSynthesisVoice[]>([])
const selectedVoiceName = ref<string>('')
const rate = ref(1.0)
const pitch = ref(1.0)
const hasArticleText = ref(false)
const isScanning = ref(true)

function getProseElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(PROSE_SELECTOR)
}

function extractProseText(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement
  clone
    .querySelectorAll('script, style, .comments-section, .social-share-wrapper, .blog-post-toolbar')
    .forEach((el) => el.remove())
  return (clone.textContent || '').trim()
}

function refreshArticleText(): boolean {
  const proseElement = getProseElement()
  if (!proseElement) return false
  const text = extractProseText(proseElement)
  hasArticleText.value = text.length > 0
  return hasArticleText.value
}

const availableVoices = computed(() => {
  const englishVoices = voices.value.filter((v) => v.lang.startsWith('en'))
  return englishVoices.length > 0 ? englishVoices : voices.value
})

const selectedVoice = computed(() => {
  if (!selectedVoiceName.value) return null
  return voices.value.find((v) => v.name === selectedVoiceName.value) || null
})

const articleText = computed(() => {
  const proseElement = getProseElement()
  if (!proseElement || !hasArticleText.value) return ''
  return extractProseText(proseElement)
})

let proseObserver: MutationObserver | null = null
const retryTimers: ReturnType<typeof setTimeout>[] = []

function startProseWatch() {
  const container = document.querySelector('.blog-content-container')
  if (!container) return

  const scan = () => {
    if (refreshArticleText()) {
      isScanning.value = false
    }
  }

  scan()
  for (const ms of [150, 400, 800, 1500, 3000]) {
    retryTimers.push(setTimeout(scan, ms))
  }

  proseObserver = new MutationObserver(scan)
  proseObserver.observe(container, { childList: true, subtree: true, characterData: true })
}

onMounted(() => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    isSupported.value = true
    speechSynthesis.value = window.speechSynthesis

    const loadVoices = () => {
      voices.value = speechSynthesis.value?.getVoices() || []

      if (!selectedVoiceName.value && voices.value.length > 0) {
        const englishVoices = voices.value.filter((v) => v.lang.startsWith('en'))
        const voicesToChooseFrom = englishVoices.length > 0 ? englishVoices : voices.value
        const defaultVoice = voicesToChooseFrom[0] || null
        if (defaultVoice) {
          selectedVoiceName.value = defaultVoice.name
        }
      } else if (selectedVoiceName.value) {
        const englishVoices = voices.value.filter((v) => v.lang.startsWith('en'))
        const voicesToChooseFrom = englishVoices.length > 0 ? englishVoices : voices.value
        const currentVoiceExists = voicesToChooseFrom.some(
          (v) => v.name === selectedVoiceName.value,
        )
        if (!currentVoiceExists && voicesToChooseFrom.length > 0) {
          selectedVoiceName.value = voicesToChooseFrom[0].name
        }
      }
    }

    loadVoices()
    if (speechSynthesis.value) {
      speechSynthesis.value.onvoiceschanged = loadVoices
    }
  } else {
    isScanning.value = false
  }

  nextTick(() => {
    startProseWatch()
    setTimeout(() => {
      isScanning.value = false
    }, 3200)
  })
})

onUnmounted(() => {
  stop()
  proseObserver?.disconnect()
  retryTimers.forEach(clearTimeout)
})

const play = () => {
  if (!isSupported.value || !speechSynthesis.value || !articleText.value) return
  stop()

  const utterance = new SpeechSynthesisUtterance(articleText.value)
  utterance.rate = rate.value
  utterance.pitch = pitch.value
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
  <div :class="embedded ? '' : 'text-to-speech-controls mb-6'">
    <p v-if="!isSupported" class="text-sm text-zinc-600 dark:text-zinc-400">
      Text-to-speech is not available in this browser.
    </p>

    <p v-else-if="isScanning && !hasArticleText" class="text-sm text-zinc-600 dark:text-zinc-400">
      Preparing listen controls…
    </p>

    <p v-else-if="!hasArticleText" class="text-sm text-zinc-600 dark:text-zinc-400">
      No article text found to read aloud.
    </p>

    <div
      v-else
      :class="[
        embedded
          ? 'rounded-lg border border-sky-100 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/40'
          : 'rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800',
      ]"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div class="flex shrink-0 items-center gap-3">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
            :disabled="!articleText"
            :title="isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'"
            @click="togglePlayPause"
          >
            <Icon :name="isPlaying ? 'mdi:pause' : 'mdi:play'" class="h-5 w-5" />
          </button>

          <button
            v-if="isPlaying || isPaused"
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-500 text-white transition-colors hover:bg-zinc-600"
            title="Stop"
            @click="stop"
          >
            <Icon name="mdi:stop" class="h-5 w-5" />
          </button>

          <div class="min-w-0">
            <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">Listen to article</p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Play, pause, or adjust voice</p>
          </div>
        </div>

        <div class="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label class="flex min-w-0 items-center gap-2 text-sm">
            <Icon name="mdi:speedometer" size="16" class="shrink-0 text-zinc-400" />
            <span class="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">Speed</span>
            <input
              v-model.number="rate"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              class="min-w-0 flex-1"
              :disabled="isPlaying || isPaused"
            />
            <span class="w-8 shrink-0 text-xs text-zinc-700 dark:text-zinc-300"
              >{{ rate.toFixed(1) }}x</span
            >
          </label>

          <label class="flex min-w-0 items-center gap-2 text-sm">
            <Icon name="mdi:tune-vertical" size="16" class="shrink-0 text-zinc-400" />
            <span class="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">Pitch</span>
            <input
              v-model.number="pitch"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              class="min-w-0 flex-1"
              :disabled="isPlaying || isPaused"
            />
            <span class="w-8 shrink-0 text-xs text-zinc-700 dark:text-zinc-300">{{
              pitch.toFixed(1)
            }}</span>
          </label>

          <label class="flex min-w-0 items-center gap-2 text-sm sm:col-span-2 lg:col-span-1">
            <Icon name="mdi:account-voice" size="16" class="shrink-0 text-zinc-400" />
            <span class="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">Voice</span>
            <select
              v-model="selectedVoiceName"
              class="min-w-0 flex-1 truncate rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-100"
              :disabled="isPlaying || isPaused"
            >
              <option v-for="voice in availableVoices" :key="voice.name" :value="voice.name">
                {{ voice.name }} ({{ voice.lang }})
              </option>
            </select>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
