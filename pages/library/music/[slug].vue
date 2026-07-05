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

const typeLabels: Record<string, string> = {
  lyrics: 'Lyrics',
  instrumental: 'Instrumental',
  notation: 'Notation',
}

useHead({
  title: meta.value?.title || 'Musical Notes',
  meta: [
    { name: 'description', content: `${meta.value?.title || 'Musical note'} — Media Library` },
  ],
})
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40"
  >
    <div class="container mx-auto max-w-4xl px-3 py-10 sm:px-6">
      <NuxtLink
        to="/library?tab=musical-notes"
        class="mb-6 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
      >
        <Icon name="mdi:arrow-left" size="18" />
        Back to Musical Notes
      </NuxtLink>

      <article
        v-if="article && meta"
        class="overflow-hidden rounded-2xl border border-amber-200/60 bg-white/90 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-800/90"
      >
        <div
          class="relative border-b border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50/50 to-sky-50 px-6 py-8 dark:border-slate-700 dark:from-slate-800 dark:via-indigo-950/30 dark:to-slate-800"
        >
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div
              v-if="meta.coverImage"
              class="h-32 w-32 shrink-0 overflow-hidden rounded-xl shadow-md"
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
              class="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-900/50 dark:to-orange-900/50"
            >
              <Icon name="mdi:music" class="text-5xl text-amber-800 dark:text-amber-200" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="mb-2 flex flex-wrap gap-2">
                <span
                  v-if="meta.musicType"
                  class="rounded-full bg-amber-200/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
                >
                  {{ typeLabels[meta.musicType] || meta.musicType }}
                </span>
                <span
                  v-if="!meta.published"
                  class="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300"
                >
                  Draft
                </span>
              </div>
              <h1 class="font-serif text-3xl font-bold text-zinc-900 dark:text-zinc-50 md:text-4xl">
                {{ meta.title }}
              </h1>
              <p v-if="meta.artist" class="mt-2 text-lg text-zinc-600 dark:text-zinc-300">
                {{ meta.artist }}
              </p>
              <p v-if="meta.language" class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                <Icon name="mdi:translate" class="mr-1 inline" size="16" />
                {{ meta.language }}
              </p>
              <div v-if="meta.tags?.length" class="mt-3 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in meta.tags"
                  :key="tag"
                  class="rounded bg-white/80 px-2 py-0.5 text-xs text-zinc-600 dark:bg-slate-700 dark:text-zinc-300"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="isAdmin" class="mt-4 flex justify-end">
            <TinaEditButton variant="outline" :href="editUrl" />
          </div>
        </div>

        <div class="px-6 py-6">
          <MusicStreamEmbeds
            class="mb-8"
            :youtube-url="meta.youtubeUrl"
            :spotify-url="meta.spotifyUrl"
          />

          <div
            class="music-body prose prose-lg max-w-none prose-zinc dark:prose-invert prose-headings:font-serif prose-p:leading-relaxed"
          >
            <ContentRenderer v-if="article" :value="article">
              <template #empty>
                <p class="text-zinc-500">No content yet.</p>
              </template>
            </ContentRenderer>
          </div>
        </div>
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
