<template>
  <div
    :class="[
      'flex items-center justify-center',
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
    <div v-if="type === 'spinner'" class="flex flex-col items-center gap-3">
      <div
        :class="[
          'animate-spin rounded-full border-4 border-gray-300 border-t-blue-600',
          {
            'h-8 w-8': size === 'sm',
            'h-12 w-12': size === 'md',
            'h-16 w-16': size === 'lg',
          },
        ]"
      ></div>
      <p v-if="text" :class="['text-sm text-gray-600 dark:text-gray-400', textClass]">
        {{ text }}
      </p>
    </div>

    <div v-else-if="type === 'dots'" class="flex flex-col items-center gap-3">
      <div class="flex gap-1.5">
        <div
          v-for="i in 3"
          :key="i"
          :class="[
            'rounded-full bg-blue-600 animate-pulse',
            {
              'h-2 w-2': size === 'sm',
              'h-3 w-3': size === 'md',
              'h-4 w-4': size === 'lg',
            },
          ]"
          :style="{ animationDelay: `${(i - 1) * 0.2}s` }"
        ></div>
      </div>
      <p v-if="text" :class="['text-sm text-gray-600 dark:text-gray-400', textClass]">
        {{ text }}
      </p>
    </div>

    <div v-else-if="type === 'skeleton'" class="w-full space-y-4">
      <div
        v-for="i in skeletonLines"
        :key="i"
        :class="[
          'h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
          {
            'w-full': i !== skeletonLines,
            'w-3/4': i === skeletonLines,
          },
        ]"
      ></div>
      <p v-if="text" :class="['text-sm text-gray-600 dark:text-gray-400', textClass]">
        {{ text }}
      </p>
    </div>

    <p v-else-if="type === 'text'" :class="['text-gray-600 dark:text-gray-400', textClass]">
      {{ text || 'Loading...' }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'spinner' | 'dots' | 'skeleton' | 'text'
  size?: 'sm' | 'md' | 'lg'
  text?: string
  skeletonLines?: number
  containerClass?: string
  textClass?: string
}

withDefaults(defineProps<Props>(), {
  type: 'spinner',
  size: 'md',
  text: '',
  skeletonLines: 3,
  containerClass: '',
  textClass: '',
})
</script>
