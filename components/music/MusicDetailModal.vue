<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useMusicTypeInfo } from '~/composables/useMusicTypeInfo'
import { useTinaEditor } from '~/composables/useTinaEditor'
import TinaEditButton from '~/components/library/TinaEditButton.vue'
import MusicStreamEmbeds from '~/components/music/MusicStreamEmbeds.vue'

const props = defineProps<{
  open: boolean
  slug?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { isAdmin } = useAuth()
const { musicDocumentUrl } = useTinaEditor()

const isLoading = ref(false)
const error = ref<string | null>(null)

interface MusicArticle {
  title?: string
  musicType?: string
  artist?: string
  language?: string
  youtubeUrl?: string
  spotifyUrl?: string
  tags?: string[]
  coverImage?: string
  published?: boolean
  [key: string]: unknown
}

const article = ref<MusicArticle | null>(null)

const meta = computed(() => {
  const doc = article.value
  if (!doc) return null
  return {
    title: doc.title || 'Untitled',
    musicType: doc.musicType,
    artist: doc.artist,
    language: doc.language,
    youtubeUrl: doc.youtubeUrl,
    spotifyUrl: doc.spotifyUrl,
    tags: doc.tags || [],
    coverImage: doc.coverImage,
    published: doc.published,
  }
})

const { typeInfo, contentSectionTitle } = useMusicTypeInfo(() => meta.value?.musicType)

const hasStreams = computed(() =>
  Boolean(meta.value?.youtubeUrl?.trim() || meta.value?.spotifyUrl?.trim()),
)

const editUrl = computed(() => (props.slug ? musicDocumentUrl(props.slug) : ''))

const fullPageUrl = computed(() => (props.slug ? `/library/music/${props.slug}` : ''))

async function loadArticle(slug: string) {
  isLoading.value = true
  error.value = null
  article.value = null
  try {
    const doc = await queryCollection('music').path(`/music/${slug}`).first()
    if (!doc || doc.published === false) {
      error.value = 'This musical note could not be found.'
      return
    }
    article.value = doc as MusicArticle
  } catch (err) {
    console.error('[MusicDetailModal] Failed to load:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load musical note'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [props.open, props.slug] as const,
  ([open, slug]) => {
    if (open && slug) void loadArticle(slug)
    if (!open) {
      article.value = null
      error.value = null
    }
  },
  { immediate: true },
)

watch(
  () => props.open,
  (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

function close() {
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) close()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="meta ? 'music-detail-title' : undefined"
        @click.self="close"
      >
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          aria-hidden="true"
          @click="close"
        />

        <div
          class="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-amber-200/70 bg-[#fffef9] shadow-2xl dark:border-slate-600 dark:bg-slate-900 sm:rounded-2xl"
          @click.stop
        >
          <div
            class="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200/60 bg-white/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/95"
          >
            <p class="text-sm font-medium text-zinc-600 dark:text-zinc-300">Musical Note</p>
            <div class="flex items-center gap-2">
              <NuxtLink
                v-if="slug"
                :to="fullPageUrl"
                class="hidden items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-sky-300 hover:text-sky-700 dark:border-slate-600 dark:text-zinc-300 dark:hover:border-sky-600 dark:hover:text-sky-300 sm:inline-flex"
                @click="close"
              >
                <Icon name="mdi:open-in-new" size="14" />
                Full page
              </NuxtLink>
              <button
                type="button"
                class="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-slate-700 dark:hover:text-zinc-100"
                aria-label="Close"
                @click="close"
              >
                <Icon name="mdi:close" size="20" />
              </button>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
              <Icon
                name="svg-spinners:180-ring"
                class="mb-4 text-4xl text-sky-700 dark:text-sky-400"
              />
              <p class="text-zinc-600 dark:text-zinc-400">Loading...</p>
            </div>

            <div v-else-if="error" class="px-6 py-16 text-center">
              <Icon name="mdi:alert-circle" class="mb-4 text-4xl text-red-600 dark:text-red-400" />
              <p class="text-red-600 dark:text-red-400">{{ error }}</p>
              <button
                type="button"
                class="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-slate-600"
                @click="slug && loadArticle(slug)"
              >
                Try again
              </button>
            </div>

            <article v-else-if="article && meta" class="pb-6">
              <div
                :class="[
                  'relative overflow-hidden bg-gradient-to-r px-5 py-6 sm:px-7 sm:py-8',
                  typeInfo.accent,
                ]"
              >
                <div
                  class="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.12]"
                  aria-hidden="true"
                >
                  <p
                    class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif text-5xl tracking-[0.4em] text-white"
                  >
                    {{ typeInfo.staff }}
                  </p>
                </div>

                <div class="relative flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div
                    v-if="meta.coverImage"
                    class="mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-xl border-4 border-white/90 shadow-lg sm:mx-0"
                  >
                    <NuxtImg
                      :src="meta.coverImage"
                      :alt="meta.title"
                      class="h-full w-full object-cover"
                      format="webp"
                      quality="85"
                    />
                  </div>
                  <div
                    v-else
                    class="mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border-4 border-white/90 bg-white/20 shadow-lg sm:mx-0"
                  >
                    <Icon :name="typeInfo.icon" class="text-5xl text-white/95" />
                  </div>

                  <div class="min-w-0 flex-1 text-center sm:text-left">
                    <span
                      class="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-800 dark:bg-slate-900/90 dark:text-zinc-100"
                    >
                      <Icon :name="typeInfo.icon" size="14" />
                      {{ typeInfo.label }}
                    </span>
                    <h2
                      id="music-detail-title"
                      class="font-serif text-2xl font-bold leading-tight text-white sm:text-3xl"
                    >
                      {{ meta.title }}
                    </h2>
                    <p
                      v-if="meta.artist"
                      class="mt-1.5 flex items-center justify-center gap-2 text-base text-white/90 sm:justify-start"
                    >
                      <Icon name="mdi:account-music" size="18" />
                      {{ meta.artist }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                class="flex flex-wrap gap-3 border-b border-amber-200/50 px-5 py-4 dark:border-slate-700"
              >
                <span
                  v-if="meta.language"
                  class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm dark:bg-slate-800 dark:text-zinc-300"
                >
                  <Icon name="mdi:translate" size="14" />
                  {{ meta.language }}
                </span>
                <span
                  v-for="tag in meta.tags"
                  :key="tag"
                  class="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm dark:bg-slate-800 dark:text-zinc-300"
                >
                  <Icon name="mdi:tag-outline" size="12" />
                  {{ tag }}
                </span>
              </div>

              <div
                v-if="isAdmin"
                class="flex justify-end border-b border-amber-200/50 px-5 py-3 dark:border-slate-700"
              >
                <TinaEditButton variant="outline" :href="editUrl" />
              </div>

              <section v-if="hasStreams" class="px-5 pt-5">
                <div class="mb-3 flex items-center gap-2">
                  <Icon name="mdi:headphones" size="18" class="text-sky-700 dark:text-sky-400" />
                  <h3 class="text-base font-semibold text-zinc-800 dark:text-zinc-100">Listen</h3>
                </div>
                <MusicStreamEmbeds
                  :youtube-url="meta.youtubeUrl"
                  :spotify-url="meta.spotifyUrl"
                  labeled
                />
              </section>

              <section class="px-5 pt-5">
                <div class="mb-3 flex items-center gap-2">
                  <Icon
                    name="mdi:music-clef-treble"
                    size="18"
                    class="text-amber-800 dark:text-amber-300"
                  />
                  <h3 class="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                    {{ contentSectionTitle }}
                  </h3>
                </div>

                <div
                  class="music-sheet relative overflow-hidden rounded-xl border border-amber-200/60 bg-white px-4 py-6 shadow-inner dark:border-slate-600 dark:bg-slate-800/80 sm:px-6 sm:py-8"
                >
                  <div
                    class="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
                    aria-hidden="true"
                    style="
                      background-image: repeating-linear-gradient(
                        transparent,
                        transparent 27px,
                        #d4a574 27px,
                        #d4a574 28px
                      );
                    "
                  />
                  <div
                    class="music-body prose prose-lg relative max-w-none font-serif prose-zinc dark:prose-invert prose-headings:font-serif prose-p:leading-relaxed"
                  >
                    <ContentRenderer :value="article">
                      <template #empty>
                        <p class="text-center text-zinc-500 dark:text-zinc-400">No content yet.</p>
                      </template>
                    </ContentRenderer>
                  </div>
                </div>
              </section>
            </article>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.music-body :deep(.lyrics-verse p) {
  margin-bottom: 0.5rem;
}

.music-body :deep(.lyrics-chorus p) {
  margin-bottom: 0.25rem;
}
</style>
