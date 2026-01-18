<template>
  <div class="space-y-3">
    <OAuthButton
      v-for="provider in enabledProviders"
      :key="provider"
      :provider="provider"
      :button-id="`oauth-${provider}-button`"
      :size="size"
      :theme="theme"
      :full-width="fullWidth"
      @success="handleSuccess"
      @error="handleError"
    />
    <div
      v-if="enabledProviders.length === 0"
      class="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
    >
      <p class="text-sm text-yellow-800 dark:text-yellow-200">
        <Icon name="mdi:information" class="inline mr-1" size="16" />
        No OAuth providers configured. Configure at least one provider in your .env file to enable
        SSO login.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getEnabledProviders } from '~/utils/oauth/providers'
import OAuthButton from '~/components/auth/OAuthButton.vue'

interface Props {
  size?: 'small' | 'medium' | 'large'
  theme?: 'outline' | 'filled'
  fullWidth?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 'medium',
  theme: 'filled',
  fullWidth: true,
})

const emit = defineEmits<{
  success: [user: unknown]
  error: [error: string]
}>()

const enabledProviders = computed(() => {
  try {
    return getEnabledProviders()
  } catch (error) {
    // Return empty array if there's an error - better than crashing
    return []
  }
})

const handleSuccess = (user: unknown) => {
  emit('success', user)
}

const handleError = (error: string) => {
  emit('error', error)
}
</script>
