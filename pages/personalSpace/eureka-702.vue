<script setup lang="ts">
/**
 * Private family invitation — share via direct URL only.
 *
 * Media:
 *   SPACE_VIDEO_SRC — ImageKit loop for The Space
 *   /videos/eureka-hero.mp4 + /celebration/hero-poster.jpg — optional hero (add later)
 */

definePageMeta({
  layout: 'eureka',
})

// --- Editable constants ----------------------------------------------------
const WHATSAPP_NUMBER = '919958462087'
const WHATSAPP_QUERY_TEXT =
  'Hi Siddhartha & Papiya — I have a query about the Eureka Park celebration on 6 Sep.'

/** Route: Chittaranjan Park → Eureka Park */
const MAPS_ORIGIN = 'Chittaranjan Park, New Delhi'
const MAPS_DESTINATION_ADDRESS =
  'CF9P+HFM Eureka Park, SC 02/A1, Sector 150, Noida, Uttar Pradesh 201312'
/** Shown on page (plus code omitted for readability) */
const DESTINATION_DISPLAY =
  'Eureka Park, SC 02/A1, Sector 150, Noida, Uttar Pradesh 201312'
/** Shared pin (Open destination button) */
const MAPS_DESTINATION_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_DESTINATION_ADDRESS)}`
const MAPS_EMBED_SRC = `https://www.google.com/maps?saddr=${encodeURIComponent(MAPS_ORIGIN)}&daddr=${encodeURIComponent(MAPS_DESTINATION_ADDRESS)}&output=embed`
const MAPS_ROUTE_URL = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(MAPS_ORIGIN)}&destination=${encodeURIComponent(MAPS_DESTINATION_ADDRESS)}&travelmode=driving`

const VIDEO_SRC = '/videos/eureka-hero.mp4'
const POSTER_SRC = '/celebration/hero-poster.jpg'
const SPACE_VIDEO_SRC =
  'https://ik.imagekit.io/u6cq4dqll/Library/Videos/Family/EurekaPark-House%20warming_Final.mp4'

const HOSTS = 'Siddhartha & Papiya & family'
const EVENT_TITLE = 'Celebration at Eureka Park'
const EVENT_SUBTITLE = 'Flat 702, Tower 4 · Sector 150, Noida'
const EVENT_DATE = '6 September 2026'
const EVENT_TIME = '10:00 AM'
const EVENT_LOCATION = 'Flat 702, Tower 4, Eureka Park'
const INVITE_NOTE =
  'We would love to have our close circle with us for a warm morning of puja, followed by lunch, adda, and unhurried conversations in our new space. Come as you are — the celebration is simply sharing this milestone together.'

// ---------------------------------------------------------------------------

const whatsappHref = computed(
  () => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_QUERY_TEXT)}`,
)

const videoFailed = ref(false)
const spaceVideoFailed = ref(false)
const heroReady = ref(false)
const revealed = ref<Record<string, boolean>>({})

const PANELS = [
  'eureka-hero',
  'eureka-overview',
  'eureka-space',
  'eureka-map',
  'eureka-close',
] as const

type PanelId = (typeof PANELS)[number]

const activePanel = ref<PanelId>('eureka-hero')
const showScrollNext = computed(() => activePanel.value !== 'eureka-close')
const scrollHintTone = computed(() =>
  activePanel.value === 'eureka-hero' ? 'hero' : 'light',
)

function scrollToNextFrom(currentId: PanelId) {
  const index = PANELS.indexOf(currentId)
  if (index < 0 || index >= PANELS.length - 1) return
  document.getElementById(PANELS[index + 1])?.scrollIntoView({ behavior: 'smooth' })
}

useHead({
  title: 'Celebration at Eureka Park',
  meta: [
    {
      name: 'description',
      content:
        'A private invitation from Siddhartha & Papiya — celebration at Flat 702, Tower 4, Tata Eureka Park, Noida.',
    },
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

let revealObserver: IntersectionObserver | null = null
let panelObserver: IntersectionObserver | null = null

onMounted(() => {
  document.documentElement.classList.add('eureka-snap-html')
  document.body.classList.add('eureka-snap-active')

  requestAnimationFrame(() => {
    heroReady.value = true
  })

  const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]')
  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const key = entry.target.getAttribute('data-reveal')
        if (key) revealed.value = { ...revealed.value, [key]: true }
        revealObserver?.unobserve(entry.target)
      }
    },
    { threshold: 0.35, rootMargin: '0px' },
  )
  nodes.forEach((el) => revealObserver?.observe(el))

  panelObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      const id = visible?.target?.id as PanelId | undefined
      if (id && (PANELS as readonly string[]).includes(id)) activePanel.value = id
    },
    { threshold: [0.35, 0.5, 0.65] },
  )
  for (const id of PANELS) {
    const el = document.getElementById(id)
    if (el) panelObserver.observe(el)
  }
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('eureka-snap-html')
  document.body.classList.remove('eureka-snap-active')
  revealObserver?.disconnect()
  panelObserver?.disconnect()
  revealObserver = null
  panelObserver = null
})
</script>

<template>
  <div class="eureka-invite">
    <!-- 1. Hero -->
    <section
      id="eureka-hero"
      class="eureka-panel eureka-panel--hero relative isolate overflow-hidden"
      :class="{ 'is-ready': heroReady }"
    >
      <div class="absolute inset-0 eureka-hero-fallback" aria-hidden="true" />

      <video
        v-if="!videoFailed"
        class="absolute inset-0 h-full w-full object-cover eureka-hero-video"
        :src="VIDEO_SRC"
        :poster="POSTER_SRC"
        autoplay
        muted
        loop
        playsinline
        preload="metadata"
        @error="videoFailed = true"
      />

      <div class="absolute inset-0 eureka-hero-overlay" aria-hidden="true" />
      <div class="absolute inset-0 eureka-hero-glow" aria-hidden="true" />
      <div class="absolute inset-0 eureka-hero-shimmer" aria-hidden="true" />

      <div
        class="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center pt-16 pb-20"
      >
        <p
          class="eureka-hero-eyebrow text-[0.7rem] sm:text-sm tracking-[0.28em] uppercase text-white/80"
        >
          With warmth · From {{ HOSTS }}
        </p>
        <h1
          class="eureka-hero-title mt-4 max-w-3xl text-[2.35rem] sm:text-5xl md:text-6xl font-semibold leading-[1.08] tracking-tight text-white"
        >
          {{ EVENT_TITLE }}
        </h1>
        <p
          class="eureka-hero-sub mt-4 text-base sm:text-lg text-white font-medium tracking-wide drop-shadow-sm"
        >
          {{ EVENT_SUBTITLE }}
        </p>
        <p
          class="eureka-hero-date mt-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm text-white/95 backdrop-blur-sm"
        >
          <span class="font-medium">{{ EVENT_DATE }}</span>
          <span class="text-white/45">·</span>
          <span>{{ EVENT_TIME }}</span>
        </p>
        <div
          class="eureka-hero-rule mt-8 h-px w-20 bg-gradient-to-r from-transparent via-white/70 to-transparent"
        />
      </div>
    </section>

    <div class="eureka-body relative text-zinc-900 dark:text-zinc-300">
      <div class="eureka-body-wash pointer-events-none absolute inset-0" aria-hidden="true" />

      <!-- 2. Overview -->
      <section
        id="eureka-overview"
        data-reveal="overview"
        class="eureka-panel eureka-reveal"
        :class="{ 'is-in': revealed.overview }"
      >
        <div class="eureka-panel-inner container mx-auto max-w-6xl px-3 sm:px-6">
          <div class="eureka-card rounded-2xl px-5 py-7 sm:px-9 sm:py-9 eureka-panel-card">
            <p
              class="eureka-invite-eyebrow text-center text-[0.7rem] sm:text-sm uppercase tracking-[0.22em]"
            >
              You're invited
            </p>
            <h2
              class="eureka-invite-heading mt-2 text-center text-2xl sm:text-3xl font-semibold tracking-tight"
            >
              Celebrate with us
            </h2>

            <dl
              class="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-4 text-center sm:text-left"
            >
              <div class="eureka-stagger eureka-detail" style="--i: 0">
                <dt class="eureka-invite-label text-[0.65rem] uppercase tracking-[0.16em]">
                  Date &amp; time
                </dt>
                <dd class="eureka-invite-value mt-2 text-lg sm:text-xl font-semibold tracking-tight">
                  {{ EVENT_DATE }}
                </dd>
                <dd class="eureka-invite-accent mt-0.5 font-medium">{{ EVENT_TIME }}</dd>
              </div>
              <div
                class="eureka-stagger eureka-detail sm:border-l sm:border-[#e4ddd3] dark:sm:border-slate-700/80 sm:pl-5"
                style="--i: 1"
              >
                <dt class="eureka-invite-label text-[0.65rem] uppercase tracking-[0.16em]">
                  Location
                </dt>
                <dd class="eureka-invite-value mt-2 text-lg sm:text-xl font-semibold tracking-tight">
                  {{ EVENT_LOCATION }}
                </dd>
                <dd class="eureka-invite-muted mt-1 text-sm leading-snug">
                  {{ DESTINATION_DISPLAY }}
                </dd>
              </div>
              <div
                class="eureka-stagger eureka-detail sm:border-l sm:border-[#e4ddd3] dark:sm:border-slate-700/80 sm:pl-5"
                style="--i: 2"
              >
                <dt class="eureka-invite-label text-[0.65rem] uppercase tracking-[0.16em]">
                  Flow
                </dt>
                <dd class="eureka-invite-value mt-2 text-lg sm:text-xl font-semibold tracking-tight">
                  Puja, then lunch
                </dd>
                <dd class="eureka-invite-muted mt-0.5 text-sm">Adda &amp; conversations</dd>
              </div>
            </dl>

            <div class="eureka-note-rule mx-auto mt-7 h-px w-24" />

            <p
              class="eureka-invite-note mt-5 max-w-2xl mx-auto text-center text-sm sm:text-base leading-relaxed"
            >
              {{ INVITE_NOTE }}
            </p>
          </div>
        </div>
      </section>

      <!-- 3. The Space -->
      <section
        id="eureka-space"
        data-reveal="space"
        class="eureka-panel eureka-reveal"
        :class="{ 'is-in': revealed.space }"
      >
        <div class="eureka-panel-inner container mx-auto max-w-6xl px-3 sm:px-6">
          <div class="text-center mb-4 sm:mb-5">
            <h2 class="eureka-section-title text-2xl sm:text-3xl font-semibold tracking-tight">
              The space
            </h2>
            <p class="eureka-section-sub mt-1.5">A glimpse of Eureka Park</p>
          </div>

          <div class="eureka-space-frame mx-auto w-full max-w-xl sm:max-w-2xl">
            <div class="eureka-space-video overflow-hidden rounded-2xl bg-slate-950">
              <video
                v-if="!spaceVideoFailed"
                class="eureka-space-video-el w-full h-full object-contain"
                :src="SPACE_VIDEO_SRC"
                autoplay
                muted
                loop
                playsinline
                preload="metadata"
                controls
                @error="spaceVideoFailed = true"
              >
                Your browser does not support the video tag.
              </video>
              <div
                v-else
                class="eureka-space-video-el flex w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#e8eef5] to-[#d8dee8] dark:from-slate-800 dark:to-slate-900 px-4 text-center"
              >
                <Icon
                  name="mdi:video-outline"
                  class="text-4xl text-sky-600/70 dark:text-sky-400/70"
                />
                <span class="text-sm text-zinc-500 dark:text-zinc-400">Video unavailable</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Getting there -->
      <section
        id="eureka-map"
        data-reveal="map"
        class="eureka-panel eureka-reveal"
        :class="{ 'is-in': revealed.map }"
      >
        <div class="eureka-panel-inner container mx-auto max-w-6xl px-3 sm:px-6 h-full justify-start sm:justify-center pt-1">
          <div class="text-center mb-2 shrink-0">
            <h2 class="eureka-section-title text-xl sm:text-2xl font-semibold tracking-tight">
              Getting there
            </h2>
            <p class="eureka-section-sub mt-0.5 text-xs sm:text-sm">
              Route from Chittaranjan Park → Eureka Park, Sector 150
            </p>
          </div>

          <div
            class="eureka-card overflow-hidden rounded-2xl flex flex-col min-h-0 w-full max-h-[min(84dvh,780px)]"
          >
            <div class="eureka-map-frame shrink-0 w-full bg-[#e8eef3] dark:bg-slate-800">
              <iframe
                title="Route map — Chittaranjan Park to Tata Eureka Park, Noida"
                class="h-full w-full border-0"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                allowfullscreen
                :src="MAPS_EMBED_SRC"
              />
            </div>

            <div class="eureka-map-copy px-3 py-2.5 sm:px-4 sm:py-3 space-y-2 shrink-0">
              <div class="flex flex-col sm:flex-row gap-2">
                <a
                  :href="MAPS_ROUTE_URL"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="eureka-maps-btn inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-700 dark:bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition duration-300 hover:bg-sky-800 dark:hover:bg-sky-500"
                >
                  <Icon name="mdi:directions" size="18" />
                  Open route in Google Maps
                </a>
                <a
                  :href="MAPS_DESTINATION_URL"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-sky-700/40 dark:border-sky-400/40 px-3 py-2 text-sm font-semibold text-sky-900 dark:text-sky-200 bg-[#f7f4ef]/80 dark:bg-slate-900/60 shadow-sm transition duration-300 hover:bg-sky-50/80 dark:hover:bg-slate-800"
                >
                  <Icon name="mdi:map-marker" size="18" />
                  Open destination
                </a>
              </div>

              <ul class="eureka-invite-muted space-y-1 text-xs sm:text-[0.8125rem] leading-snug">
                <li class="flex gap-1.5">
                  <Icon
                    name="mdi:map-marker-path"
                    class="mt-0.5 shrink-0 text-sky-700 dark:text-sky-400"
                    size="16"
                  />
                  <span
                    >Start from Chittaranjan Park; follow the map toward Sector 150 / Eureka
                    Park.</span
                  >
                </li>
                <li class="flex gap-1.5">
                  <Icon
                    name="mdi:car"
                    class="mt-0.5 shrink-0 text-sky-700 dark:text-sky-400"
                    size="16"
                  />
                  <span
                    >Via Noida–Greater Noida Expressway — exit right after Sector 146 metro, go
                    straight, then underpass (U-turn) at Sector 148 metro towards Sector 150.</span
                  >
                </li>
                <li class="flex gap-1.5">
                  <Icon
                    name="mdi:gate"
                    class="mt-0.5 shrink-0 text-sky-700 dark:text-sky-400"
                    size="16"
                  />
                  <span>Visitor entry at the main gate — share Flat 702, Tower 4 if asked.</span>
                </li>
                <li class="flex gap-1.5">
                  <Icon
                    name="mdi:parking"
                    class="mt-0.5 shrink-0 text-sky-700 dark:text-sky-400"
                    size="16"
                  />
                  <span
                    >Parking: after main gate, take a right, drive to the end, then left toward
                    visitors’ parking — opposite Towers 1–4, adjacent to the boundary wall. Tower 4
                    reception for guidance.</span
                  >
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. Close -->
      <section
        id="eureka-close"
        data-reveal="close"
        class="eureka-panel eureka-reveal eureka-panel--close"
        :class="{ 'is-in': revealed.close }"
      >
        <div class="eureka-panel-inner eureka-close-inner text-center px-5 sm:px-8">
          <Icon
            name="mdi:heart"
            class="eureka-close-heart mx-auto"
            size="64"
          />
          <p class="eureka-close-kicker mt-5">With love</p>
          <p class="eureka-close-hosts mt-2">{{ HOSTS }}</p>
          <p class="eureka-close-tagline mt-4">See you at Eureka Park</p>
          <a
            :href="whatsappHref"
            target="_blank"
            rel="noopener noreferrer"
            class="eureka-wa-btn mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm sm:text-base font-semibold text-white transition duration-300 hover:brightness-105 hover:-translate-y-0.5"
          >
            <Icon name="mdi:whatsapp" size="22" />
            Message for queries
          </a>
        </div>
      </section>
    </div>

    <!-- Floating WhatsApp (corner FAB — does not block section scroll) -->
    <a
      :href="whatsappHref"
      target="_blank"
      rel="noopener noreferrer"
      class="eureka-wa-fab"
      aria-label="Message for queries on WhatsApp"
      title="Message for queries"
    >
      <Icon name="mdi:whatsapp" size="28" />
    </a>

    <!-- Scroll next — remounts on each section so the button animates back in -->
    <button
      v-if="showScrollNext"
      :key="activePanel"
      type="button"
      class="eureka-scroll-fab"
      :class="scrollHintTone === 'hero' ? 'eureka-scroll-fab--hero' : 'eureka-scroll-fab--light'"
      aria-label="Scroll to next section"
      @click="scrollToNextFrom(activePanel)"
    >
      <span class="text-[0.65rem] uppercase tracking-[0.2em]">Scroll</span>
      <Icon name="mdi:chevron-down" class="eureka-scroll-chevron text-2xl" />
    </button>
  </div>
</template>

<style>
/* Global snap — scoped to this page via useHead html/body classes */
html.eureka-snap-html {
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  scroll-padding-top: 3.75rem;
  scroll-padding-bottom: 1rem;
}

html.eureka-snap-html,
html.eureka-snap-html body.eureka-snap-active {
  overflow-x: hidden;
}

@media (prefers-reduced-motion: reduce) {
  html.eureka-snap-html {
    scroll-snap-type: none;
    scroll-behavior: auto;
  }
}
</style>

<style scoped>
.eureka-invite {
  --eureka-warm: #f7f4ef;
  --eureka-panel-pad-top: 4.25rem;
  --eureka-panel-pad-bottom: 1.5rem;
}

.eureka-panel {
  min-height: 100dvh;
  height: 100dvh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
  padding-top: var(--eureka-panel-pad-top);
  padding-bottom: var(--eureka-panel-pad-bottom);
  position: relative;
}

.eureka-panel--hero {
  padding-top: 0;
  padding-bottom: 0;
  justify-content: stretch;
}

.eureka-panel--close {
  justify-content: center;
}

.eureka-close-inner {
  align-items: center;
  max-width: 28rem;
  margin-inline: auto;
}

.eureka-close-heart {
  color: #dc2626;
  filter: drop-shadow(0 8px 18px rgba(220, 38, 38, 0.28));
  animation: eureka-heart-soft 2.8s ease-in-out infinite;
}

.eureka-close-kicker {
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #6b7280;
  font-weight: 500;
}

.eureka-close-hosts {
  font-size: clamp(1.35rem, 3.5vw, 1.85rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: #111827;
  text-wrap: balance;
}

.eureka-close-tagline {
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  color: #4b5563;
}

:global(html.dark) .eureka-close-kicker {
  color: #a1a1aa;
}

:global(html.dark) .eureka-close-hosts {
  color: #fafafa;
}

:global(html.dark) .eureka-close-tagline {
  color: #a1a1aa;
}

:global(html.dark) .eureka-close-heart {
  color: #f87171;
  filter: drop-shadow(0 8px 18px rgba(248, 113, 113, 0.28));
}

@keyframes eureka-heart-soft {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

.eureka-panel-inner {
  width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.eureka-panel-card {
  max-height: calc(100dvh - var(--eureka-panel-pad-top) - var(--eureka-panel-pad-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
}

.eureka-body-wash {
  background:
    radial-gradient(ellipse 70% 40% at 50% 0%, rgba(14, 165, 233, 0.07), transparent 55%),
    linear-gradient(180deg, var(--eureka-warm) 0%, #f1f2f4 38%, #f1f2f4 100%);
}

:global(html.dark) .eureka-body-wash {
  background:
    radial-gradient(ellipse 70% 40% at 50% 0%, rgba(56, 189, 248, 0.08), transparent 55%),
    linear-gradient(180deg, #0b1220 0%, #020617 45%, #020617 100%);
}

.eureka-card {
  background: #faf7f2;
  border: 1px solid rgba(120, 100, 80, 0.22);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.65) inset,
    0 18px 40px -24px rgba(28, 39, 55, 0.35);
  color: #111827;
  backdrop-filter: blur(10px);
}

:global(html.dark) .eureka-card {
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(71, 85, 105, 0.55);
  box-shadow: 0 18px 40px -24px rgba(0, 0, 0, 0.55);
  color: #e4e4e7;
}

.eureka-section-title {
  color: #000000;
}

.eureka-section-sub {
  color: #1f2937;
}

.eureka-section-meta {
  color: #374151;
}

.eureka-invite-eyebrow {
  color: #0c4a6e;
}

.eureka-invite-heading,
.eureka-invite-value {
  color: #000000;
}

.eureka-invite-label {
  color: #374151;
}

.eureka-invite-accent {
  color: #0c4a6e;
}

.eureka-invite-muted,
.eureka-invite-note {
  color: #1f2937;
}

:global(html.dark) .eureka-section-title {
  color: #fafafa;
}

:global(html.dark) .eureka-section-sub {
  color: #a1a1aa;
}

:global(html.dark) .eureka-section-meta {
  color: #71717a;
}

:global(html.dark) .eureka-invite-eyebrow,
:global(html.dark) .eureka-invite-accent {
  color: #7dd3fc;
}

:global(html.dark) .eureka-invite-heading,
:global(html.dark) .eureka-invite-value {
  color: #fafafa;
}

:global(html.dark) .eureka-invite-label,
:global(html.dark) .eureka-invite-muted {
  color: #a1a1aa;
}

:global(html.dark) .eureka-invite-note {
  color: #d4d4d8;
}

.eureka-note-rule {
  background: linear-gradient(90deg, transparent, rgba(14, 116, 144, 0.35), transparent);
}

.eureka-hero-fallback {
  background:
    radial-gradient(ellipse 90% 55% at 50% 15%, rgba(56, 189, 248, 0.28), transparent 58%),
    radial-gradient(ellipse 50% 40% at 80% 70%, rgba(251, 191, 36, 0.12), transparent 50%),
    linear-gradient(165deg, #0b3a55 0%, #1a2740 42%, #0f172a 100%);
  animation: eureka-kenburns 22s ease-in-out infinite alternate;
}

.eureka-hero-video {
  opacity: 0.9;
}

.eureka-hero-overlay {
  background: linear-gradient(
    to top,
    rgba(8, 15, 28, 0.9) 0%,
    rgba(8, 15, 28, 0.28) 48%,
    rgba(8, 15, 28, 0.42) 100%
  );
}

.eureka-hero-glow {
  background: radial-gradient(ellipse 55% 35% at 50% 70%, rgba(255, 255, 255, 0.1), transparent 70%);
  pointer-events: none;
}

.eureka-hero-shimmer {
  background: linear-gradient(
    115deg,
    transparent 25%,
    rgba(255, 255, 255, 0.06) 45%,
    transparent 65%
  );
  background-size: 220% 100%;
  animation: eureka-shimmer 10s ease-in-out infinite;
  pointer-events: none;
}

.eureka-hero-eyebrow,
.eureka-hero-title,
.eureka-hero-sub,
.eureka-hero-date,
.eureka-hero-rule {
  opacity: 0;
  transform: translateY(1.1rem);
}

.is-ready .eureka-hero-eyebrow {
  animation: eureka-rise 0.95s cubic-bezier(0.22, 1, 0.36, 1) 0.12s forwards;
}
.is-ready .eureka-hero-title {
  animation: eureka-rise 1.05s cubic-bezier(0.22, 1, 0.36, 1) 0.28s forwards;
}
.is-ready .eureka-hero-sub {
  animation: eureka-rise 0.95s cubic-bezier(0.22, 1, 0.36, 1) 0.44s forwards;
}
.is-ready .eureka-hero-date {
  animation: eureka-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.58s forwards;
}
.is-ready .eureka-hero-rule {
  animation: eureka-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.72s forwards;
}

.eureka-scroll-fab {
  position: fixed;
  left: 50%;
  bottom: 1.15rem;
  z-index: 40;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  backdrop-filter: blur(10px);
  animation: eureka-scroll-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.eureka-scroll-fab--hero {
  color: rgba(255, 255, 255, 0.92);
  background: rgba(15, 23, 42, 0.28);
  border-color: rgba(255, 255, 255, 0.22);
}

.eureka-scroll-fab--light {
  color: #0f172a;
  background: rgba(250, 247, 242, 0.92);
  border-color: rgba(120, 100, 80, 0.28);
  box-shadow: 0 10px 24px -14px rgba(15, 23, 42, 0.45);
}

:global(html.dark) .eureka-scroll-fab--light {
  color: #f4f4f5;
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(71, 85, 105, 0.55);
}

.eureka-scroll-chevron {
  animation: eureka-bounce 1.6s ease-in-out infinite;
}

@keyframes eureka-scroll-pop {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(0.85rem) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

.eureka-reveal {
  opacity: 0;
  transform: translateY(2.25rem) scale(0.985);
  filter: blur(4px);
  transition:
    opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.85s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.85s cubic-bezier(0.22, 1, 0.36, 1);
}

.eureka-reveal.is-in {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

.eureka-stagger {
  opacity: 0;
  transform: translateY(0.65rem);
}

.eureka-reveal.is-in .eureka-stagger {
  animation: eureka-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(0.12s + var(--i, 0) * 0.1s);
}

.eureka-space-frame {
  padding: 0.4rem;
  border-radius: 1.15rem;
  background: linear-gradient(145deg, rgba(14, 116, 144, 0.28), rgba(196, 181, 160, 0.35));
  box-shadow:
    0 22px 50px -28px rgba(15, 23, 42, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.25) inset;
  max-height: min(72dvh, 680px);
}

:global(html.dark) .eureka-space-frame {
  background: linear-gradient(145deg, rgba(56, 189, 248, 0.22), rgba(71, 85, 105, 0.45));
  box-shadow:
    0 22px 50px -28px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
}

.eureka-space-video {
  opacity: 0;
  transform: translateY(0.85rem) scale(0.98);
  aspect-ratio: 1 / 1;
  max-height: min(72dvh, 680px);
  position: relative;
}

.eureka-space-video::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.18);
}

.eureka-space-video-el {
  display: block;
  width: 100%;
  height: 100%;
}

.eureka-reveal.is-in .eureka-space-video {
  animation: eureka-photo-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
}

.eureka-map-frame {
  height: clamp(220px, 36dvh, 340px);
}

.eureka-wa-fab {
  position: fixed;
  right: 1rem;
  bottom: 1.25rem;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 9999px;
  background: #25d366;
  color: #fff;
  box-shadow: 0 10px 28px -8px rgba(37, 211, 102, 0.7);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
  animation: eureka-bar-in 0.85s cubic-bezier(0.22, 1, 0.36, 1) 1s both;
}

.eureka-wa-fab:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 14px 32px -8px rgba(37, 211, 102, 0.8);
}

.eureka-wa-btn {
  box-shadow: 0 6px 16px -6px rgba(37, 211, 102, 0.55);
}

@keyframes eureka-rise {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes eureka-photo-in {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes eureka-shimmer {
  0%,
  100% {
    background-position: 100% 0;
  }
  50% {
    background-position: 0% 0;
  }
}

@keyframes eureka-kenburns {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.05);
  }
}

@keyframes eureka-bar-in {
  from {
    opacity: 0;
    transform: translateY(1.25rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes eureka-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .eureka-hero-fallback,
  .eureka-hero-shimmer,
  .eureka-scroll-chevron,
  .eureka-close-heart {
    animation: none;
  }

  .eureka-hero-eyebrow,
  .eureka-hero-title,
  .eureka-hero-sub,
  .eureka-hero-date,
  .eureka-hero-rule,
  .eureka-scroll-fab,
  .eureka-reveal,
  .eureka-stagger,
  .eureka-space-video,
  .eureka-wa-fab {
    opacity: 1;
    transform: none;
    filter: none;
    animation: none;
    transition: none;
  }

  .eureka-scroll-fab {
    opacity: 1;
    transform: translateX(-50%);
    animation: none;
  }
}
</style>
