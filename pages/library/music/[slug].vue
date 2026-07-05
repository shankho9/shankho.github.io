<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useTinaEditor } from '~/composables/useTinaEditor'
import MusicStreamEmbeds from '~/components/music/MusicStreamEmbeds.vue'

definePageMeta({ middleware: ['auth-login'] })

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const contentPath = computed(() => `/music/${slug.value}`)

const { isAdmin } = useAuth()
const { musicDocumentUrl } = useTinaEditor()
const editUrl = computed(() => musicDocumentUrl(slug.value))

const { data: article, error } = await useAsyncData(`music-${slug.value}`, () =>
  queryCollection('music').path(contentPath.value).first(),
)

const meta = computed(() => {
  const doc = article.value
  if (!doc) return null
  return {
    title: doc.title || 'Untitled',
    musicType: doc.musicType as string | undefined,
    artist: doc.artist as string | undefined,
    language: doc.language as string | undefined,
    youtubeUrl: doc.youtubeUrl as string | undefined,
    spotifyUrl: doc.spotifyUrl as string | undefined,
    tags: (doc.tags as string[] | undefined) || [],
    coverImage: doc.coverImage as string | undefined,
    published: doc.published as boolean | undefined,
  }
})

if (error.value || !article.value) {
  navigateTo('/404')
}

if (meta.value && meta.value.published === false) {
  navigateTo('/404')
}

const typeConfig: Record<
  string,
  { label: string; icon: string; accent: string; badge: string; staff: string }
> = {
  lyrics: {
    label: 'Lyrics',
    icon: 'mdi:music-note',
    accent: 'from-violet-600 to-purple-700',
    badge: 'bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-200',
    staff: '♪ ♫ ♪',
  },
  instrumental: {
    label: 'Instrumental',
    icon: 'mdi:music-box-outline',
    accent: 'from-amber-500 to-orange-600',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
    staff: '♩ ♪ ♩',
  },
  notation: {
    label: 'Notation',
    icon: 'mdi:music-clef-treble',
    accent: 'from-emerald-600 to-teal-700',
    badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200',
    staff: '𝄞 ♬ 𝄢',
  },
}

const typeInfo = computed(() => {
  const key = meta.value?.musicType || ''
  return (
    typeConfig[key] || {
      label: key || 'Music',
      icon: 'mdi:music',
      accent: 'from-sky-600 to-indigo-700',
      badge: 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-200',
      staff: '♪ ♫ ♪',
    }
  )
})

const hasStreams = computed(() =>
  Boolean(meta.value?.youtubeUrl?.trim() || meta.value?.spotifyUrl?.trim()),
)

useHead({
  title: meta.value?.title || 'Musical Notes',
  meta: [
    { name: 'description', content: `${meta.value?.title || 'Musical note'} — Media Library` },
  ],
})
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-b from-amber-50/80 via-stone-50 to-sky-50/60 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30"
  >
    <div class="container mx-auto max-w-3xl px-3 py-8 sm:px-6 sm:py-12">
      <NuxtLink
        to="/library?tab=musical-notes"
        class="mb-8 inline-flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/70 px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur transition-colors hover:border-sky-300 hover:text-sky-800 dark:border-slate-600 dark:bg-slate-800/70 dark:text-zinc-300 dark:hover:border-sky-600 dark:hover:text-sky-300"
      >
        <Icon name="mdi:arrow-left" size="18" />
        Musical Notes
      </NuxtLink>

      <article v-if="article && meta" class="relative">
        <!-- Hero card -->
        <div
          class="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
        >
          <div
            class="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07] dark:opacity-[0.12]"
            aria-hidden="true"
          >
            <Icon
              name="mdi:music-clef-treble"
              class="absolute -left-4 top-6 text-[8rem] text-amber-900 dark:text-amber-200"
            />
            <Icon
              name="mdi:music-clef-bass"
              class="absolute -right-6 bottom-4 text-[7rem] text-sky-900 dark:text-sky-200"
            />
            <p
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif text-6xl tracking-[0.5em] text-zinc-900 dark:text-zinc-100"
            >
              {{ typeInfo.staff }}
            </p>
          </div>

          <div :class="['relative bg-gradient-to-r px-6 py-8 sm:px-8 sm:py-10', typeInfo.accent]">
            <div class="flex flex-col gap-6 sm:flex-row sm:items-end">
              <div class="relative mx-auto shrink-0 sm:mx-0">
                <div class="absolute -inset-1 rounded-2xl bg-white/30 blur-sm" aria-hidden="true" />
                <div
                  v-if="meta.coverImage"
                  class="relative h-36 w-36 overflow-hidden rounded-2xl border-4 border-white/90 shadow-2xl sm:h-40 sm:w-40"
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
                  class="relative flex h-36 w-36 items-center justify-center rounded-2xl border-4 border-white/90 bg-white/20 shadow-2xl backdrop-blur sm:h-40 sm:w-40"
                >
                  <Icon :name="typeInfo.icon" class="text-6xl text-white/95" />
                </div>
              </div>

              <div class="min-w-0 flex-1 text-center sm:text-left">
                <div class="mb-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-800 shadow-sm dark:bg-slate-900/90 dark:text-zinc-100"
                  >
                    <Icon :name="typeInfo.icon" size="14" />
                    {{ typeInfo.label }}
                  </span>
                  <span
                    v-if="!meta.published"
                    class="rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Draft
                  </span>
                </div>
                <h1
                  class="font-serif text-3xl font-bold leading-tight text-white drop-shadow-sm sm:text-4xl md:text-[2.75rem]"
                >
                  {{ meta.title }}
                </h1>
                <p
                  v-if="meta.artist"
                  class="mt-2 flex items-center justify-center gap-2 text-lg text-white/90 sm:justify-start"
                >
                  <Icon name="mdi:account-music" size="20" class="shrink-0 opacity-90" />
                  <span class="font-medium">{{ meta.artist }}</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Metadata strip -->
          <div
            class="grid grid-cols-2 gap-px border-b border-zinc-100 bg-zinc-100 dark:border-slate-700 dark:bg-slate-700 sm:grid-cols-4"
          >
            <div
              v-if="meta.language"
              class="flex items-center gap-2.5 bg-white px-4 py-3.5 dark:bg-slate-800"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/40"
              >
                <Icon name="mdi:translate" size="18" class="text-sky-700 dark:text-sky-400" />
              </span>
              <div class="min-w-0">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Language
                </p>
                <p class="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {{ meta.language }}
                </p>
              </div>
            </div>
            <div
              v-if="meta.youtubeUrl"
              class="flex items-center gap-2.5 bg-white px-4 py-3.5 dark:bg-slate-800"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40"
              >
                <Icon name="mdi:youtube" size="18" class="text-red-600 dark:text-red-400" />
              </span>
              <div class="min-w-0">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  YouTube
                </p>
                <p class="text-sm font-medium text-red-700 dark:text-red-300">Available</p>
              </div>
            </div>
            <div
              v-if="meta.spotifyUrl"
              class="flex items-center gap-2.5 bg-white px-4 py-3.5 dark:bg-slate-800"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40"
              >
                <Icon name="mdi:spotify" size="18" class="text-green-600 dark:text-green-400" />
              </span>
              <div class="min-w-0">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Spotify
                </p>
                <p class="text-sm font-medium text-green-700 dark:text-green-300">Available</p>
              </div>
            </div>
            <div
              class="flex items-center gap-2.5 bg-white px-4 py-3.5 dark:bg-slate-800"
              :class="{
                'col-span-2 sm:col-span-1': !meta.language && !meta.youtubeUrl && !meta.spotifyUrl,
              }"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40"
              >
                <Icon
                  :name="typeInfo.icon"
                  size="18"
                  class="text-violet-700 dark:text-violet-400"
                />
              </span>
              <div class="min-w-0">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Format
                </p>
                <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {{ typeInfo.label }}
                </p>
              </div>
            </div>
          </div>

          <div
            v-if="meta.tags?.length"
            class="flex flex-wrap gap-2 border-b border-zinc-100 px-6 py-4 dark:border-slate-700"
          >
            <span
              v-for="tag in meta.tags"
              :key="tag"
              class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-slate-700 dark:text-zinc-300"
            >
              <Icon name="mdi:tag-outline" size="12" />
              {{ tag }}
            </span>
          </div>

          <div
            v-if="isAdmin"
            class="flex justify-end border-b border-zinc-100 px-6 py-3 dark:border-slate-700"
          >
            <TinaEditButton variant="outline" :href="editUrl" />
          </div>
        </div>

        <!-- Listen -->
        <section v-if="hasStreams" class="mt-8">
          <div class="mb-4 flex items-center gap-2">
            <span
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/40"
            >
              <Icon name="mdi:headphones" size="18" class="text-sky-700 dark:text-sky-400" />
            </span>
            <h2 class="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Listen</h2>
          </div>
          <MusicStreamEmbeds
            :youtube-url="meta.youtubeUrl"
            :spotify-url="meta.spotifyUrl"
            labeled
          />
        </section>

        <!-- Sheet content -->
        <section class="mt-8">
          <div class="mb-4 flex items-center gap-2">
            <span
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40"
            >
              <Icon
                name="mdi:music-clef-treble"
                size="18"
                class="text-amber-800 dark:text-amber-300"
              />
            </span>
            <h2 class="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              {{
                typeInfo.label === 'Notation'
                  ? 'Notation'
                  : typeInfo.label === 'Lyrics'
                    ? 'Lyrics'
                    : 'Score'
              }}
            </h2>
          </div>

          <div
            class="music-sheet relative overflow-hidden rounded-2xl border border-amber-200/60 bg-[#fffef9] px-5 py-8 shadow-inner dark:border-slate-600 dark:bg-slate-800/80 sm:px-8 sm:py-10"
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
              class="music-body prose prose-lg relative max-w-none font-serif prose-zinc dark:prose-invert prose-headings:font-serif prose-p:leading-relaxed prose-strong:font-semibold"
            >
              <ContentRenderer v-if="article" :value="article">
                <template #empty>
                  <p class="text-center text-zinc-500 dark:text-zinc-400">
                    <Icon name="mdi:music-note-off" class="mb-2 inline" size="28" />
                    <br />
                    No content yet.
                  </p>
                </template>
              </ContentRenderer>
            </div>
          </div>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
.music-body :deep(.lyrics-verse p) {
  margin-bottom: 0.5rem;
}

.music-body :deep(.lyrics-chorus p) {
  margin-bottom: 0.25rem;
}
</style>
