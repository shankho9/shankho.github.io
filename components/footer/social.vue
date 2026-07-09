<script setup lang="ts">
import { socialLinks, seoData, footerData } from '~/data'
import { computed } from 'vue'

const socialIcons: Record<string, string> = {
  github: 'mdi:github',
  linkedin: 'mdi:linkedin',
  twitter: 'mdi:twitter',
  spotify: 'mdi:spotify',
  bluesky: 'simple-icons:bluesky',
  discord: 'simple-icons:discord',
}

// Map social keys to their display handles
const socialHandles: Record<string, string> = {
  github: '@shankho9',
  linkedin: 'siddharthabasu',
  twitter: '@shankho99',
  spotify: 'shankho',
  bluesky: '@shankho.bsky.social',
  discord: 'basid09',
  email: seoData.mailAddress,
}

// Get display name for tooltip
const getSocialLabel = (key: string): string => {
  const labels: Record<string, string> = {
    github: 'GitHub',
    linkedin: 'LinkedIn',
    twitter: 'X',
    spotify: 'Spotify',
    bluesky: 'Bluesky',
    discord: 'Discord',
    email: 'Email',
  }
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

// Filter out stackoverflow from social links
const filteredSocialLinks = computed(() => {
  const filtered: Record<string, string> = {}
  for (const [key, value] of Object.entries(socialLinks)) {
    if (key !== 'stackoverflow') {
      filtered[key] = value
    }
  }
  return filtered
})
</script>

<template>
  <div class="w-full py-2">
    <p class="text-black dark:text-zinc-300 text-lg sm:text-xl font-semibold mb-2 text-center">
      Connect With Me
    </p>
    <p
      class="text-xs sm:text-sm dark:text-zinc-300 mb-3 md:mb-4 text-center max-w-3xl mx-auto px-2"
    >
      {{ footerData.authorInterest }}
    </p>
    <!-- Social Icons Grid - Centered with equal spacing for better visual balance -->
    <div class="flex flex-wrap justify-center items-center gap-2 md:gap-3">
      <!-- Social Icons as Rectangular Boxes -->
      <NuxtLink
        v-for="(link, key) in filteredSocialLinks"
        :key="key"
        :to="link"
        target="_blank"
        class="relative bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-white rounded-lg shadow-md hover:shadow-lg transition transform hover:scale-105 flex flex-col items-center justify-center p-2 group flex-shrink-0"
        :aria-label="key"
        style="width: 90px; height: 55px"
        :class="{
          'md:w-28 md:h-16': true,
        }"
      >
        <!-- Icon -->
        <Icon
          :name="socialIcons[key] || `mdi:${key}`"
          width="24"
          height="24"
          class="mb-1.5 flex-shrink-0"
          :class="{
            'md:w-7 md:h-7': true,
          }"
        />
        <!-- Platform Name -->
        <span class="text-[11px] md:text-[12px] font-semibold text-center leading-tight">
          {{ getSocialLabel(key) }}
        </span>
        <!-- Hover Tooltip -->
        <div
          class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg"
        >
          <div class="font-semibold mb-1">{{ getSocialLabel(key) }}</div>
          <div class="text-gray-300 text-[10px]">{{ socialHandles[key] }}</div>
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div class="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        </div>
      </NuxtLink>
      <!-- Email Button as Rectangle -->
      <a
        :href="`mailto:${seoData.mailAddress}`"
        class="relative bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-white rounded-lg shadow-md hover:shadow-lg transition transform hover:scale-105 flex flex-col items-center justify-center p-2 group flex-shrink-0"
        style="width: 90px; height: 55px"
        :class="{
          'md:w-28 md:h-16': true,
        }"
        aria-label="email"
      >
        <!-- Icon -->
        <Icon
          name="mdi:email"
          width="24"
          height="24"
          class="mb-1.5 flex-shrink-0"
          :class="{
            'md:w-7 md:h-7': true,
          }"
        />
        <!-- Platform Name -->
        <span class="text-[11px] md:text-[12px] font-semibold text-center leading-tight">
          {{ getSocialLabel('email') }}
        </span>
        <!-- Hover Tooltip -->
        <div
          class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg"
        >
          <div class="font-semibold mb-1">{{ getSocialLabel('email') }}</div>
          <div class="text-gray-300 text-[10px]">{{ socialHandles.email }}</div>
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div class="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>
