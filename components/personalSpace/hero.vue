<script setup lang="ts">
import { pesonalSpace } from '~/data'
</script>

<template>
  <div class="container mx-auto min-w-0 overflow-hidden">
    <div class="grid grid-cols-1 sm:grid-cols-2 items-center min-w-0">
      <div class="px-3 sm:px-6 min-w-0">
        <h1
          class="text-black dark:text-zinc-300 font-semibold leading-tight text-4xl md:text-5xl my-5"
        >
          {{ pesonalSpace.title }}
        </h1>
        <p class="dark:text-zinc-300">
          {{ pesonalSpace.description }}
        </p>
      </div>
      <div class="px-3 sm:px-6 justify-self-center min-w-0">
        <LogoDog />
      </div>
    </div>
  </div>
</template>
