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

const { isAdmin, checkAuth } = useAuth()
const {
  tinaConfigured,
  adminReachable,
  adminCheckDone,
  musicCollectionUrl,
  editorUnavailableHint,
  checkAdminReachable,
} = useTinaEditor()

const editorUrl = computed(() => props.href || musicCollectionUrl)

/** Only show once server session confirms admin — avoids stale localStorage false positives. */
const sessionAdminConfirmed = ref(false)

onMounted(async () => {
  try {
    await checkAuth(true)
  } catch {
    // ignore
  }
  sessionAdminConfirmed.value = isAdmin.value
  if (isAdmin.value) {
    void checkAdminReachable()
  }
})

const showButton = computed(
  () => sessionAdminConfirmed.value && isAdmin.value && tinaConfigured.value,
)

const showUnreachableHint = computed(
  () => showButton.value && adminCheckDone.value && !adminReachable.value,
)

const buttonClass = computed(() =>
  props.variant === 'outline'
    ? 'border border-sky-600 px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50'
    : 'bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700',
)
</script>

<template>
  <div v-if="showButton" class="inline-flex flex-col items-end gap-1">
    <a
      :href="editorUrl"
      :class="[
        'inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors',
        buttonClass,
      ]"
    >
      <Icon name="mdi:pencil" size="16" />
      Edit in Tina
    </a>
    <p
      v-if="showUnreachableHint"
      class="max-w-xs text-right text-[10px] leading-snug text-amber-700 dark:text-amber-300"
      :title="editorUnavailableHint"
    >
      Editor may be unavailable on this deploy.
    </p>
  </div>
</template>
