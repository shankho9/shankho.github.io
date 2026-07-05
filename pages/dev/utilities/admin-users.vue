<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'
import { getFetchErrorMessage } from '~/utils/common/fetchError'

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin'],
})

interface AdminUser {
  id: string | number
  email: string
  name: string | null
  role: 'visitor' | 'admin'
  authProvider: string
  createdAt: string
  lastLoginAt: string | null
}

const users = ref<AdminUser[]>([])
const loading = ref(true)
const search = ref('')
const pendingRole = ref<Record<string, 'visitor' | 'admin'>>({})
const showOtpModal = ref(false)
const otpCode = ref('')
const otpTarget = ref<{ id: string | number; role: 'visitor' | 'admin'; email: string } | null>(
  null,
)
const otpSentTo = ref<string[]>([])
const isRequestingOtp = ref(false)
const isConfirming = ref(false)
const { showToast } = useToast()

const loadUsers = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('search', search.value.trim())
    const res = await $fetch<{ success: boolean; users: AdminUser[] }>(
      `/api/admin/users?${params.toString()}`,
    )
    users.value = res.users
    const roles: Record<string, 'visitor' | 'admin'> = {}
    for (const u of res.users) {
      roles[String(u.id)] = u.role
    }
    pendingRole.value = roles
  } catch (e) {
    console.error(e)
    showToast('Failed to load users', 'error')
  } finally {
    loading.value = false
  }
}

const requestRoleChange = async (user: AdminUser) => {
  const userKey = String(user.id)
  const newRole = pendingRole.value[userKey]
  if (!newRole || newRole === user.role) {
    showToast('Select a different role first', 'error')
    return
  }

  isRequestingOtp.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string; sentTo?: string[] }>(
      '/api/admin/users/role-change/request',
      {
        method: 'POST',
        body: { targetUserId: user.id, newRole },
      },
    )
    otpTarget.value = { id: user.id, role: newRole, email: user.email }
    otpSentTo.value = res.sentTo || []
    otpCode.value = ''
    showOtpModal.value = true
    showToast(res.message, 'success')
  } catch (e: unknown) {
    showToast(getFetchErrorMessage(e, 'Request failed'), 'error')
  } finally {
    isRequestingOtp.value = false
  }
}

const confirmRoleChange = async () => {
  if (!otpTarget.value || !otpCode.value.trim()) return

  isConfirming.value = true
  try {
    await $fetch('/api/admin/users/role-change/confirm', {
      method: 'POST',
      body: {
        targetUserId: otpTarget.value.id,
        newRole: otpTarget.value.role,
        otp: otpCode.value.trim(),
      },
    })
    showOtpModal.value = false
    otpTarget.value = null
    showToast('Role updated successfully', 'success')
    await loadUsers()
  } catch (e: unknown) {
    showToast(getFetchErrorMessage(e, 'Verification failed'), 'error')
  } finally {
    isConfirming.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Users</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage user roles. Changes require a 6-digit OTP emailed to every admin account.
        </p>
      </div>
      <NuxtLink to="/dev" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to Utilities
      </NuxtLink>
    </div>

    <div class="mb-4 flex gap-2">
      <input
        v-model="search"
        type="search"
        placeholder="Search by email or name..."
        class="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        @keyup.enter="loadUsers"
      />
      <button
        class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        @click="loadUsers"
      >
        Search
      </button>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">Loading users...</div>

    <div
      v-else
      class="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
    >
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 dark:bg-slate-900/50 text-left text-gray-600 dark:text-gray-400">
          <tr>
            <th class="px-4 py-3 font-semibold">Email</th>
            <th class="px-4 py-3 font-semibold">Name</th>
            <th class="px-4 py-3 font-semibold">Role</th>
            <th class="px-4 py-3 font-semibold">Provider</th>
            <th class="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-slate-700">
          <tr v-for="user in users" :key="String(user.id)">
            <td class="px-4 py-3 text-gray-900 dark:text-gray-100">{{ user.email }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ user.name || '—' }}</td>
            <td class="px-4 py-3">
              <select
                v-model="pendingRole[String(user.id)]"
                class="rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm"
              >
                <option value="visitor">Visitor</option>
                <option value="admin">Admin</option>
              </select>
            </td>
            <td class="px-4 py-3 capitalize text-gray-500">{{ user.authProvider }}</td>
            <td class="px-4 py-3">
              <button
                :disabled="pendingRole[String(user.id)] === user.role || isRequestingOtp"
                class="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
                @click="requestRoleChange(user)"
              >
                Change role
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- OTP Modal -->
    <div
      v-if="showOtpModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="showOtpModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Enter verification code
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
          A 6-digit code was sent to all admin inboxes to confirm changing
          <strong>{{ otpTarget?.email }}</strong> to <strong>{{ otpTarget?.role }}</strong
          >.
        </p>
        <p
          v-if="otpSentTo.length"
          class="text-xs text-gray-500 dark:text-gray-400 mb-4 break-words"
        >
          Sent to: {{ otpSentTo.join(', ') }}
        </p>
        <input
          v-model="otpCode"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          class="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-center text-xl tracking-widest mb-4"
        />
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            @click="showOtpModal = false"
          >
            Cancel
          </button>
          <button
            :disabled="otpCode.trim().length < 6 || isConfirming"
            class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            @click="confirmRoleChange"
          >
            {{ isConfirming ? 'Confirming...' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
