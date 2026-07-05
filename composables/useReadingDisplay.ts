import { ref, watch, computed, onMounted, onUnmounted } from 'vue'

export type ReadingFontFamily = 'default' | 'serif' | 'sans'

const STORAGE_SCALE = 'blog-reading-font-scale'
const STORAGE_FAMILY = 'blog-reading-font-family'

const MIN_SCALE = -2
const MAX_SCALE = 4

function readStoredScale(): number {
  if (!import.meta.client) return 0
  const raw = localStorage.getItem(STORAGE_SCALE)
  const value = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(value) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)) : 0
}

function readStoredFamily(): ReadingFontFamily {
  if (!import.meta.client) return 'default'
  const raw = localStorage.getItem(STORAGE_FAMILY)
  if (raw === 'serif' || raw === 'sans' || raw === 'default') return raw
  return 'default'
}

function scaleFactor(step: number): number {
  return 1 + step * 0.1
}

function getProseElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const container = document.querySelector('.blog-content-container')
  if (!container) return null
  return container.querySelector<HTMLElement>('[data-article-prose], .prose')
}

const fontFamilyCss: Record<ReadingFontFamily, string> = {
  default: '',
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: '"Space Grotesk", system-ui, -apple-system, sans-serif',
}

export function useReadingDisplay() {
  const fontScale = ref(0)
  const fontFamily = ref<ReadingFontFamily>('default')

  let proseObserver: MutationObserver | null = null
  const retryTimers: ReturnType<typeof setTimeout>[] = []

  function applyToProse() {
    const prose = getProseElement()
    if (!prose) return false

    if (fontScale.value === 0) {
      prose.style.fontSize = ''
    } else {
      prose.style.fontSize = `${scaleFactor(fontScale.value) * 100}%`
    }

    const family = fontFamilyCss[fontFamily.value]
    prose.style.fontFamily = family

    return true
  }

  function persist() {
    if (!import.meta.client) return
    localStorage.setItem(STORAGE_SCALE, String(fontScale.value))
    localStorage.setItem(STORAGE_FAMILY, fontFamily.value)
  }

  function startProseWatch() {
    const container = document.querySelector('.blog-content-container')
    if (!container) return

    const scan = () => {
      applyToProse()
    }

    scan()
    for (const ms of [100, 300, 600, 1200]) {
      retryTimers.push(setTimeout(scan, ms))
    }

    proseObserver = new MutationObserver(scan)
    proseObserver.observe(container, { childList: true, subtree: true })
  }

  function increaseFont() {
    fontScale.value = Math.min(MAX_SCALE, fontScale.value + 1)
  }

  function decreaseFont() {
    fontScale.value = Math.max(MIN_SCALE, fontScale.value - 1)
  }

  function resetDisplay() {
    fontScale.value = 0
    fontFamily.value = 'default'
  }

  const fontSizeLabel = computed(() => {
    const percent = Math.round(scaleFactor(fontScale.value) * 100)
    return `${percent}%`
  })

  const canDecrease = computed(() => fontScale.value > MIN_SCALE)
  const canIncrease = computed(() => fontScale.value < MAX_SCALE)

  watch([fontScale, fontFamily], () => {
    applyToProse()
    persist()
  })

  onMounted(() => {
    fontScale.value = readStoredScale()
    fontFamily.value = readStoredFamily()
    startProseWatch()
    applyToProse()
  })

  onUnmounted(() => {
    proseObserver?.disconnect()
    retryTimers.forEach(clearTimeout)
  })

  return {
    fontScale,
    fontFamily,
    fontSizeLabel,
    canDecrease,
    canIncrease,
    increaseFont,
    decreaseFont,
    resetDisplay,
  }
}
