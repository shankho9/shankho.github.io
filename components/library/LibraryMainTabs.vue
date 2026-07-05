<script setup lang="ts">
import type { LibraryTabId } from '~/components/library/LibraryIntegrationNote.vue'

export interface LibraryMainTab {
  id: LibraryTabId
  label: string
  icon: string
  count: number
}

defineProps<{
  tabs: LibraryMainTab[]
  activeTab: LibraryTabId
  isLoadingResourcesCount?: boolean
  isLoadingAppsCount?: boolean
}>()

const emit = defineEmits<{
  'update:activeTab': [tab: LibraryTabId]
}>()

const tablistId = 'library-main-tablist'

function selectTab(tabId: LibraryTabId) {
  emit('update:activeTab', tabId)
}

function tabId(tab: LibraryMainTab) {
  return `library-tab-${tab.id}`
}

function panelId(tab: LibraryMainTab) {
  return `library-panel-${tab.id}`
}
</script>

<template>
  <div class="sticky top-0 z-20 mb-4 -mx-1">
    <div
      :id="tablistId"
      role="tablist"
      aria-label="Media Library sections"
      class="flex gap-1.5 overflow-x-auto rounded-xl border border-gray-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95"
    >
      <button
        v-for="tab in tabs"
        :id="tabId(tab)"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="panelId(tab)"
        :tabindex="activeTab === tab.id ? 0 : -1"
        :class="[
          'relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4 sm:py-2.5',
          activeTab === tab.id
            ? 'bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-sm dark:from-sky-600 dark:to-blue-500'
            : 'text-zinc-600 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-slate-700',
        ]"
        @click="selectTab(tab.id)"
      >
        <Icon :name="tab.icon" size="18" aria-hidden="true" />
        <span class="whitespace-nowrap">{{ tab.label }}</span>
        <span
          v-if="
            tab.count > 0 ||
            (tab.id === 'resources' && isLoadingResourcesCount) ||
            (tab.id === 'apps' && isLoadingAppsCount)
          "
          :class="[
            'ml-1 rounded-full px-2 py-0.5 text-xs font-bold',
            activeTab === tab.id
              ? 'bg-white/20 text-white'
              : 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
          ]"
        >
          <template v-if="tab.id === 'resources' && isLoadingResourcesCount">
            <Icon name="svg-spinners:180-ring" class="animate-spin" size="12" />
          </template>
          <template v-else-if="tab.id === 'apps' && isLoadingAppsCount">
            <Icon name="svg-spinners:180-ring" class="animate-spin" size="12" />
          </template>
          <template v-else>
            {{ tab.count }}
          </template>
        </span>
      </button>
    </div>
  </div>
</template>
