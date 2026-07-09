<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts, removeToast } = useToast()

const getToastStyles = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-500 dark:bg-green-600 text-white'
    case 'error':
      return 'bg-red-500 dark:bg-red-600 text-white'
    case 'warning':
      return 'bg-yellow-500 dark:bg-yellow-600 text-white'
    case 'info':
    default:
      return 'bg-blue-500 dark:bg-blue-600 text-white'
  }
}

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return 'mdi:check-circle'
    case 'error':
      return 'mdi:alert-circle'
    case 'warning':
      return 'mdi:alert'
    case 'info':
    default:
      return 'mdi:information'
  }
}
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-full sm:max-w-sm pointer-events-none"
      >
        <TransitionGroup name="toast" tag="div" class="flex flex-col gap-3">
          <div
            v-for="toast in toasts"
            :key="toast.id"
            :class="[
              'pointer-events-auto shadow-lg rounded-lg p-4 flex items-start gap-3 transform transition-all duration-300',
              getToastStyles(toast.type),
            ]"
          >
            <Icon :name="getIcon(toast.type)" size="20" class="flex-shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium leading-5">{{ toast.message }}</p>
              <button
                v-if="toast.action"
                class="mt-2 text-sm font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
                @click="toast.action.onClick()"
              >
                {{ toast.action.label }}
              </button>
            </div>
            <button
              class="flex-shrink-0 hover:opacity-80 transition-opacity"
              @click="removeToast(toast.id)"
            >
              <Icon name="mdi:close" size="18" />
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
    <template #fallback>
      <div></div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
