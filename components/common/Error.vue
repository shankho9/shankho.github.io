<template>
  <div
    :class="[
      'flex flex-col items-center justify-center text-center',
      {
        'py-8': size === 'md',
        'py-4': size === 'sm',
        'py-12': size === 'lg',
        'min-h-[200px]': size === 'md',
        'min-h-[100px]': size === 'sm',
        'min-h-[400px]': size === 'lg',
      },
      containerClass,
    ]"
  >
    <div v-if="showIcon" class="mb-4">
      <Icon
        :name="iconName"
        :size="size === 'sm' ? 32 : size === 'md' ? 48 : 64"
        :class="['text-red-500 dark:text-red-400', iconClass]"
      />
    </div>

    <h3
      v-if="title"
      :class="[
        'font-semibold mb-2 text-red-700 dark:text-red-400',
        {
          'text-base': size === 'sm',
          'text-lg': size === 'md',
          'text-xl': size === 'lg',
        },
        titleClass,
      ]"
    >
      {{ title }}
    </h3>

    <p
      :class="[
        'text-gray-600 dark:text-gray-400 mb-4',
        {
          'text-sm': size === 'sm',
          'text-base': size === 'md',
          'text-lg': size === 'lg',
        },
        messageClass,
      ]"
    >
      {{ message }}
    </p>

    <div v-if="showRetry && retryText" class="mt-4">
      <button
        :class="[
          'px-4 py-2 rounded-md font-medium transition-colors',
          {
            'text-sm': size === 'sm',
            'text-base': size === 'md',
            'text-lg': size === 'lg',
          },
          retryButtonClass,
        ]"
        @click="$emit('retry')"
      >
        {{ retryText }}
      </button>
    </div>

    <slot name="actions"></slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string
  title?: string
  showIcon?: boolean
  iconName?: string
  iconClass?: string
  size?: 'sm' | 'md' | 'lg'
  showRetry?: boolean
  retryText?: string
  containerClass?: string
  titleClass?: string
  messageClass?: string
  retryButtonClass?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Error',
  showIcon: true,
  iconName: 'mdi:alert-circle',
  iconClass: '',
  size: 'md',
  showRetry: false,
  retryText: 'Try Again',
  containerClass: '',
  titleClass: '',
  messageClass: '',
  retryButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
})

defineEmits<{
  retry: []
}>()
</script>
