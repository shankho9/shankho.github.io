export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
  action?: ToastAction
}

const toasts = ref<Toast[]>([])

export const useToast = () => {
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const showToast = (
    message: string,
    type: ToastType = 'info',
    duration: number = 3000,
    options?: { id?: string; action?: ToastAction },
  ) => {
    const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const existingIndex = toasts.value.findIndex((t) => t.id === id)
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      action: options?.action,
    }

    if (existingIndex > -1) {
      toasts.value.splice(existingIndex, 1, toast)
    } else {
      toasts.value.push(toast)
    }

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  const clearAll = () => {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    showToast,
    removeToast,
    clearAll,
  }
}
