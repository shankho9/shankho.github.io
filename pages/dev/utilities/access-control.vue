<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { UtilityItem } from '~/composables/useUtilityAccess'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'default',
  middleware: 'auth-admin',
})

const { fetchConfig, saveConfig } = useUtilityAccess()
const { showToast } = useToast()

const utilities = ref<UtilityItem[]>([])
const loading = ref(true)
const saving = ref(false)
const dirty = ref(false)

const local = ref<Record<string, { visitor: boolean; admin: boolean; passcode: boolean }>>({})

const bySection = computed(() => {
  const map = new Map<string, UtilityItem[]>()
  for (const u of utilities.value) {
    const list = map.get(u.section) ?? []
    list.push(u)
    map.set(u.section, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})

function toggle(u: UtilityItem, role: 'visitor' | 'admin') {
  const key = u.id
  const curr = local.value[key] ?? {
    visitor: u.rolesAllowed.includes('visitor'),
    admin: u.rolesAllowed.includes('admin'),
    passcode: !!u.requiresPasscode,
  }
  if (role === 'visitor') curr.visitor = !curr.visitor
  else curr.admin = !curr.admin
  local.value[key] = { ...curr }
  dirty.value = true
}

function togglePasscode(u: UtilityItem) {
  const key = u.id
  const curr = local.value[key] ?? {
    visitor: u.rolesAllowed.includes('visitor'),
    admin: u.rolesAllowed.includes('admin'),
    passcode: !!u.requiresPasscode,
  }
  curr.passcode = !curr.passcode
  local.value[key] = { ...curr }
  dirty.value = true
}

function get(u: UtilityItem, role: 'visitor' | 'admin') {
  const curr = local.value[u.id]
  if (curr) return role === 'visitor' ? curr.visitor : curr.admin
  return u.rolesAllowed.includes(role)
}

function getPasscode(u: UtilityItem) {
  const curr = local.value[u.id]
  if (curr) return curr.passcode
  return !!u.requiresPasscode
}

async function save() {
  saving.value = true
  try {
    const updates = utilities.value.map((u) => {
      const c = local.value[u.id]
      const visitor = c ? c.visitor : u.rolesAllowed.includes('visitor')
      const admin = c ? c.admin : u.rolesAllowed.includes('admin')
      const passcode = c ? c.passcode : !!u.requiresPasscode
      const roles: string[] = []
      if (visitor) roles.push('visitor')
      if (admin) roles.push('admin')
      return {
        utilityId: u.id,
        rolesAllowed: roles.length ? roles : ['admin'],
        requiresPasscode: passcode,
      }
    })
    await saveConfig(updates)
    dirty.value = false
    await load()
    showToast('Access settings saved', 'success')
  } catch (e) {
    console.error(e)
    showToast('Failed to save access settings', 'error')
  } finally {
    saving.value = false
  }
}

async function load() {
  loading.value = true
  try {
    utilities.value = await fetchConfig()
    local.value = {}
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
    <div class="mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Utility Access Control
          </h1>
          <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Choose which roles can view or access each utility. Admins also require passcode
            verification.
          </p>
        </div>
        <NuxtLink
          to="/dev"
          class="inline-flex items-center px-2.5 py-1.5 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors touch-manipulation"
        >
          <Icon name="mdi:arrow-left" class="mr-1.5 text-base" />
          Back to Utilities
        </NuxtLink>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div
        class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100"
      />
      <span class="ml-2 text-gray-600 dark:text-gray-400">Loading…</span>
    </div>

    <div v-else class="space-y-6">
      <div
        class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden"
      >
        <div
          class="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex flex-wrap items-center gap-3"
        >
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Visitor</span>
          <span class="text-gray-400">|</span>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Admin</span>
          <span class="text-gray-400">|</span>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Passcode required
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
            Check to allow role; check Passcode for additional visitor auth.
          </span>
          <div class="ml-auto flex items-center gap-2">
            <button
              :disabled="!dirty || saving"
              class="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="save"
            >
              {{ saving ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </div>
        <div class="divide-y divide-gray-200 dark:divide-slate-700">
          <template v-for="[section, list] in bySection" :key="section">
            <div
              class="bg-gray-50 dark:bg-slate-800/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              {{ section }}
            </div>
            <div
              v-for="u in list"
              :key="u.id"
              class="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30"
            >
              <div class="min-w-0 flex-1 break-words">
                <span class="font-medium text-gray-900 dark:text-gray-100 break-words">{{
                  u.name
                }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-2 break-all">{{
                  u.route
                }}</span>
              </div>
              <div class="flex flex-wrap items-center gap-4 sm:gap-6">
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="get(u, 'visitor')"
                    class="rounded border-gray-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
                    @change="toggle(u, 'visitor')"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">Visitor</span>
                </label>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="get(u, 'admin')"
                    class="rounded border-gray-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
                    @change="toggle(u, 'admin')"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">Admin</span>
                </label>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="getPasscode(u)"
                    class="rounded border-gray-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500"
                    @change="togglePasscode(u)"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">Passcode</span>
                </label>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <CommonToast />
  </div>
</template>
