<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import { useTinaEditor } from '~/composables/useTinaEditor'

const props = withDefaults(
  defineProps<{
    /** Full admin URL including hash, e.g. collection or document editor. */
    href?: string
    variant?: 'filled' | 'outline'
  }>(),
  {
    href: undefined,
    variant: 'filled',
  },
)

const { isAdmin } = useAuth()
const {
  tinaConfigured,
  adminReachable,
  adminCheckDone,
  musicCollectionUrl,
  editorUnavailableHint,
} = useTinaEditor()

const editorUrl = computed(() => props.href || musicCollectionUrl)

const showButton = computed(() => isAdmin.value && tinaConfigured.value && adminReachable.value)

const showUnavailable = computed(
  () => isAdmin.value && tinaConfigured.value && adminCheckDone.value && !adminReachable.value,
)

const buttonClass = computed(() =>
  props.variant === 'outline'
    ? 'border border-sky-600 px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50'
    : 'bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700',
)
</script>

<template>
  <a
    v-if="showButton"
    :href="editorUrl"
    target="_blank"
    rel="noopener noreferrer"
    :class="[
      'inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors',
      buttonClass,
    ]"
  >
    <Icon name="mdi:pencil" size="16" />
    Edit in Tina
  </a>
  <p
    v-else-if="showUnavailable"
    class="max-w-md text-xs leading-relaxed text-amber-800 dark:text-amber-200"
    :title="editorUnavailableHint"
  >
    Tina editor unavailable on this deploy.
    <a
      href="https://app.tina.io"
      target="_blank"
      rel="noopener noreferrer"
      class="font-medium underline hover:text-amber-900 dark:hover:text-amber-100"
    >
      Open TinaCloud
    </a>
    or redeploy after adding <code class="font-mono">main</code> on TinaCloud.
  </p>
</template>
