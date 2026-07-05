<template>
  <div
    class="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden"
  >
    <div class="max-w-3xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your account, password, and admin passcode
        </p>
      </div>

      <div v-if="!isAuthenticated" class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-400 mb-4">Please sign in to access settings</p>
        <NuxtLink
          to="/auth/login"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Sign In
        </NuxtLink>
      </div>

      <div v-else class="space-y-6">
        <!-- User Info -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Account Information
          </h2>
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ user?.email }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                {{ user?.name || 'Not set' }}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Auth Provider</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                {{ user?.auth_provider }}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">MFA Status</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    user?.mfa_enabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                  ]"
                >
                  {{ user?.mfa_enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Change Password -->
        <div
          v-if="user?.auth_provider === 'email'"
          class="bg-white dark:bg-gray-800 shadow rounded-lg p-6"
        >
          <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h2>
          <form class="space-y-4" @submit.prevent="handleChangePassword">
            <div>
              <label
                for="currentPassword"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Current Password
              </label>
              <input
                id="currentPassword"
                v-model="passwordForm.currentPassword"
                type="password"
                required
                class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label
                for="newPassword"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New Password
              </label>
              <input
                id="newPassword"
                v-model="passwordForm.newPassword"
                type="password"
                required
                minlength="8"
                class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters long
              </p>
            </div>
            <div>
              <label
                for="confirmNewPassword"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm New Password
              </label>
              <input
                id="confirmNewPassword"
                v-model="passwordForm.confirmNewPassword"
                type="password"
                required
                class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div v-if="passwordError" class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p class="text-sm text-red-800 dark:text-red-200">{{ passwordError }}</p>
            </div>
            <div v-if="passwordSuccess" class="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <p class="text-sm text-green-800 dark:text-green-200">{{ passwordSuccess }}</p>
            </div>
            <div>
              <button
                type="submit"
                :disabled="isChangingPassword"
                class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <span v-if="!isChangingPassword">Update Password</span>
                <span v-else class="flex items-center">
                  <Icon name="mdi:loading" class="animate-spin h-4 w-4 mr-2" />
                  Updating...
                </span>
              </button>
            </div>
          </form>
        </div>

        <!-- MFA Setup -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Multi-Factor Authentication (MFA)
          </h2>
          <div v-if="!user?.mfa_enabled" class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Enable MFA to add an extra layer of security to your account. You'll need an
              authenticator app like Google Authenticator.
            </p>
            <button
              :disabled="isSettingUpMFA"
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              @click="setupMFA"
            >
              <span v-if="!isSettingUpMFA">Enable MFA</span>
              <span v-else class="flex items-center">
                <Icon name="mdi:loading" class="animate-spin h-4 w-4 mr-2" />
                Setting up...
              </span>
            </button>
          </div>
          <div v-else class="space-y-4">
            <p class="text-sm text-green-600 dark:text-green-400">
              MFA is enabled for your account
            </p>
            <button
              :disabled="isDisablingMFA"
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              @click="disableMFA"
            >
              <span v-if="!isDisablingMFA">Disable MFA</span>
              <span v-else class="flex items-center">
                <Icon name="mdi:loading" class="animate-spin h-4 w-4 mr-2" />
                Disabling...
              </span>
            </button>
          </div>
          <!-- MFA QR Code Modal -->
          <div
            v-if="showMFAQR"
            class="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div
              class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
            >
              <div
                class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                @click="showMFAQR = false"
              ></div>
              <div
                class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              >
                <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                    Scan QR Code
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Scan this QR code with your authenticator app, then enter the verification code
                    below.
                  </p>
                  <div class="flex justify-center mb-4">
                    <img v-if="mfaQRCode" :src="mfaQRCode" alt="MFA QR Code" class="w-48 h-48" />
                  </div>
                  <div>
                    <label
                      for="mfaVerificationCode"
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Verification Code
                    </label>
                    <input
                      id="mfaVerificationCode"
                      v-model="mfaVerificationCode"
                      type="text"
                      maxlength="6"
                      class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="000000"
                    />
                  </div>
                </div>
                <div
                  class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
                >
                  <button
                    :disabled="!mfaVerificationCode || mfaVerificationCode.length !== 6"
                    class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    @click="verifyMFA"
                  >
                    Verify & Enable
                  </button>
                  <button
                    class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    @click="showMFAQR = false"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Shown when middleware sent a non-admin here to set up utilities passcode -->
        <div
          v-if="isAuthenticated && !serverIsAdmin && route.query.passcode === 'admin-setup'"
          class="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 mb-6"
        >
          <p class="text-sm text-amber-900 dark:text-amber-100">
            Utilities require an <strong>admin</strong> account. You are signed in as
            <strong>{{ user?.email }}</strong> with the <strong>visitor</strong> role. An existing
            admin must promote your account, or run
            <code class="text-xs font-mono"
              >UPDATE users SET role = 'admin' WHERE email = '…';</code
            >
            on the production database.
          </p>
        </div>

        <!-- Admin Passcode (admin only): for admin-only utilities -->
        <div
          v-if="serverIsAdmin"
          id="admin-passcode"
          class="bg-white dark:bg-gray-800 shadow rounded-lg p-6"
        >
          <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Admin Passcode</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            For access to: {{ passcodeUtilities.admin.join(', ') }}. Rotate every 3 months.
          </p>
          <div
            v-if="route.query.passcode === 'admin-setup' && !adminPasscodeStatus.isSet"
            class="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4 mb-4"
          >
            <div class="flex">
              <Icon name="mdi:information" class="h-5 w-5 text-blue-400 shrink-0" />
              <div class="ml-3">
                <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Set up an admin passcode to access admin-only utilities.
                </p>
              </div>
            </div>
          </div>
          <div
            v-if="adminPasscodeStatus.needsRotation && adminPasscodeStatus.isSet"
            class="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4 mb-4"
          >
            <div class="flex">
              <Icon name="mdi:alert" class="h-5 w-5 text-yellow-400 shrink-0" />
              <div class="ml-3 flex-1">
                <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Admin passcode needs rotation
                  <span v-if="adminPasscodeStatus.expiresAt">
                    (expires {{ formatDate(adminPasscodeStatus.expiresAt) }})
                  </span>
                </p>
                <NuxtLink
                  to="/auth/admin-passcode-rotate"
                  class="mt-2 inline-block text-sm font-medium text-yellow-800 hover:text-yellow-900 dark:text-yellow-200 dark:hover:text-yellow-100 underline"
                >
                  Rotate admin passcode →
                </NuxtLink>
              </div>
            </div>
          </div>
          <div
            v-if="
              adminPasscodeStatus.isSet &&
              !adminPasscodeStatus.needsRotation &&
              route.query.redirect
            "
            class="rounded-md bg-green-50 dark:bg-green-900/20 p-4 mb-4"
          >
            <p class="text-sm text-green-800 dark:text-green-200 mb-3">
              Admin passcode is active. Enter it once to open Utilities.
            </p>
            <NuxtLink
              :to="{
                path: '/auth/admin-passcode',
                query: { redirect: route.query.redirect as string },
              }"
              class="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Icon name="mdi:tools" size="18" />
              Continue to Utilities
            </NuxtLink>
          </div>
          <div v-if="adminPasscodeStatus.isSet && !adminPasscodeStatus.needsRotation" class="mb-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Admin passcode is set and active.
              <span v-if="adminPasscodeStatus.expiresAt">
                Expires {{ formatDate(adminPasscodeStatus.expiresAt) }}.
              </span>
            </p>
            <div class="mt-3 flex flex-wrap gap-3">
              <NuxtLink
                :to="{
                  path: '/auth/admin-passcode',
                  query: { redirect: (route.query.redirect as string) || '/dev' },
                }"
                class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Icon name="mdi:tools" size="18" />
                Open Utilities
              </NuxtLink>
              <NuxtLink
                to="/auth/admin-passcode-rotate"
                class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Rotate admin passcode →
              </NuxtLink>
            </div>
          </div>
          <form
            v-if="!adminPasscodeStatus.isSet || adminPasscodeStatus.needsRotation"
            class="space-y-4"
            @submit.prevent="handleSetAdminPasscode"
          >
            <div>
              <label
                for="adminPasscode"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {{ adminPasscodeStatus.isSet ? 'New admin passcode' : 'Set admin passcode' }}
              </label>
              <input
                id="adminPasscode"
                v-model="adminPasscodeForm.passcode"
                type="password"
                required
                minlength="6"
                class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter admin passcode (min. 6 characters)"
              />
            </div>
            <div>
              <label
                for="confirmAdminPasscode"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm admin passcode
              </label>
              <input
                id="confirmAdminPasscode"
                v-model="adminPasscodeForm.confirmPasscode"
                type="password"
                required
                class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Confirm admin passcode"
              />
            </div>
            <div v-if="adminPasscodeError" class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p class="text-sm text-red-800 dark:text-red-200">{{ adminPasscodeError }}</p>
            </div>
            <div
              v-if="adminPasscodeSuccess"
              class="rounded-md bg-green-50 dark:bg-green-900/20 p-4"
            >
              <p class="text-sm text-green-800 dark:text-green-200">
                {{ adminPasscodeSuccess }}
              </p>
            </div>
            <div>
              <button
                type="submit"
                :disabled="isSettingAdminPasscode"
                class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <span v-if="!isSettingAdminPasscode">Set admin passcode</span>
                <span v-else class="flex items-center">
                  <Icon name="mdi:loading" class="animate-spin h-4 w-4 mr-2" />
                  Setting...
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import {
  isApiSuccessResponse,
  readApiErrorMessage,
  readFetchErrorMessage,
} from '~/utils/fetchError'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { user, isAuthenticated, isAdmin, checkAuth, checkAdminPasscodeStatus } = useAuth()

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
})
const passwordError = ref('')
const passwordSuccess = ref('')
const isChangingPassword = ref(false)

const adminPasscodeForm = ref({ passcode: '', confirmPasscode: '' })
const adminPasscodeError = ref('')
const adminPasscodeSuccess = ref('')
const isSettingAdminPasscode = ref(false)
const adminPasscodeStatus = ref<{
  isSet: boolean
  needsRotation: boolean
  expiresAt: string | null
}>({ isSet: false, needsRotation: false, expiresAt: null })

const passcodeUtilities = ref<{ visitor: string[]; admin: string[] }>({
  visitor: [],
  admin: [],
})
const serverIsAdmin = ref(false)

const showMFAQR = ref(false)
const mfaQRCode = ref('')
const mfaSecret = ref('')
const mfaVerificationCode = ref('')
const isSettingUpMFA = ref(false)
const isDisablingMFA = ref(false)

const handleChangePassword = async () => {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (passwordForm.value.newPassword !== passwordForm.value.confirmNewPassword) {
    passwordError.value = 'Passwords do not match'
    return
  }

  if (passwordForm.value.newPassword.length < 8) {
    passwordError.value = 'Password must be at least 8 characters long'
    return
  }

  isChangingPassword.value = true

  try {
    // Update password via API (endpoint verifies current password internally)
    const response = await $fetch<{ success: boolean; error?: string; message?: string }>(
      '/api/auth/password/change',
      {
        method: 'POST',
        body: {
          currentPassword: passwordForm.value.currentPassword,
          newPassword: passwordForm.value.newPassword,
        },
      },
    )

    if (response.success) {
      passwordSuccess.value = 'Password updated successfully'
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }
    } else {
      passwordError.value = response.error || 'Failed to update password'
    }
  } catch (error: unknown) {
    const errorData =
      error && typeof error === 'object' && 'data' in error
        ? (error.data as { error?: string })
        : null
    passwordError.value =
      errorData?.error || (error instanceof Error ? error.message : 'An error occurred')
  } finally {
    isChangingPassword.value = false
  }
}

const setupMFA = async () => {
  isSettingUpMFA.value = true
  try {
    const response = await $fetch<{
      success: boolean
      secret?: string
      qrCode?: string
      message?: string
      error?: string
    }>('/api/auth/mfa/setup', {
      method: 'POST',
      body: { action: 'generate' },
    })

    if (response.success) {
      mfaSecret.value = response.secret || ''
      mfaQRCode.value = response.qrCode || ''
      showMFAQR.value = true
    }
  } catch (error) {
    console.error('Failed to setup MFA:', error)
  } finally {
    isSettingUpMFA.value = false
  }
}

const verifyMFA = async () => {
  try {
    const response = await $fetch<{ success: boolean; error?: string; message?: string }>(
      '/api/auth/mfa/setup',
      {
        method: 'POST',
        body: {
          action: 'verify',
          secret: mfaSecret.value,
          code: mfaVerificationCode.value,
        },
      },
    )

    if (response.success) {
      showMFAQR.value = false
      mfaVerificationCode.value = ''
      mfaSecret.value = ''
      mfaQRCode.value = ''
      // Refresh user data
      await checkAuth(true)
    }
  } catch (error: unknown) {
    const errorData =
      error && typeof error === 'object' && 'data' in error
        ? (error.data as { error?: string })
        : null
    alert(errorData?.error || 'Verification failed')
  }
}

const disableMFA = async () => {
  if (!confirm('Are you sure you want to disable MFA? This will reduce your account security.')) {
    return
  }

  isDisablingMFA.value = true
  try {
    const response = await $fetch<{ success: boolean; error?: string; message?: string }>(
      '/api/auth/mfa/setup',
      {
        method: 'POST',
        body: { action: 'disable' },
      },
    )

    if (response.success) {
      await checkAuth(true)
    }
  } catch (error) {
    console.error('Failed to disable MFA:', error)
  } finally {
    isDisablingMFA.value = false
  }
}

const loadAdminPasscodeStatus = async () => {
  const status = await checkAdminPasscodeStatus()
  adminPasscodeStatus.value = {
    isSet: status.isSet,
    needsRotation: status.needsRotation,
    expiresAt: status.expiresAt,
  }
}

const handleSetAdminPasscode = async () => {
  adminPasscodeError.value = ''
  adminPasscodeSuccess.value = ''
  if (adminPasscodeForm.value.passcode !== adminPasscodeForm.value.confirmPasscode) {
    adminPasscodeError.value = 'Passcodes do not match'
    return
  }
  if (adminPasscodeForm.value.passcode.length < 6) {
    adminPasscodeError.value = 'Admin passcode must be at least 6 characters long'
    return
  }

  const passcodeJustSet = adminPasscodeForm.value.passcode
  const redirectTarget = (route.query.redirect as string | undefined) || '/dev'
  isSettingAdminPasscode.value = true
  try {
    const response = await $fetch<{ success: boolean; error?: string; message?: string }>(
      '/api/auth/admin-passcode/set',
      {
        method: 'POST',
        body: { passcode: passcodeJustSet },
      },
    )
    if (isApiSuccessResponse(response)) {
      adminPasscodeSuccess.value = readApiErrorMessage(
        response.message,
        'Admin passcode set successfully',
      )
      adminPasscodeForm.value = { passcode: '', confirmPasscode: '' }

      try {
        const verify = await $fetch<{ success: boolean }>('/api/auth/admin-passcode/verify', {
          method: 'POST',
          body: { passcode: passcodeJustSet },
        })
        if (verify.success && typeof window !== 'undefined') {
          sessionStorage.setItem('admin_passcode_verified', 'true')
        }
      } catch {
        if (typeof window !== 'undefined') sessionStorage.removeItem('admin_passcode_verified')
      }

      await loadAdminPasscodeStatus()

      if (!adminPasscodeStatus.value.isSet) {
        adminPasscodeError.value =
          'Passcode may have saved but could not be confirmed. Run the create_admin_passcodes.sql migration on your database, then try again.'
        return
      }

      await navigateTo(redirectTarget)
      return
    }

    adminPasscodeError.value = readApiErrorMessage(
      typeof response === 'object' && response !== null
        ? (response as { error?: unknown }).error
        : undefined,
      'Failed to set admin passcode',
    )
  } catch (error: unknown) {
    adminPasscodeError.value = readFetchErrorMessage(error, 'Failed to set admin passcode')
  } finally {
    isSettingAdminPasscode.value = false
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}

const syncServerRole = async () => {
  await checkAuth(true)
  if (!isAuthenticated.value) {
    serverIsAdmin.value = false
    return
  }

  try {
    const me = await $fetch<{ authenticated: boolean; user?: { role: string } }>('/api/auth/me')
    serverIsAdmin.value = me.authenticated && me.user?.role === 'admin'
  } catch {
    serverIsAdmin.value = isAdmin.value
  }

  try {
    const res = await $fetch<{ visitor: string[]; admin: string[] }>('/api/auth/passcode-utilities')
    passcodeUtilities.value = {
      visitor: res?.visitor ?? [],
      admin: res?.admin ?? [],
    }
  } catch {
    passcodeUtilities.value = { visitor: [], admin: [] }
  }
}

onMounted(async () => {
  await syncServerRole()
  if (serverIsAdmin.value) {
    await loadAdminPasscodeStatus()

    if (route.query.passcode === 'admin-setup' || route.query.passcode === 'admin-rotate') {
      nextTick(() => {
        document.getElementById('admin-passcode')?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }
})
</script>
