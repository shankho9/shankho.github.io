<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { socialLinks, seoData, footerData } from '~/data'

const socialIcons: Record<string, string> = {
  github: 'mdi:github',
  linkedin: 'mdi:linkedin',
  twitter: 'mdi:twitter',
  stackoverflow: 'mdi:stack-overflow',
  spotify: 'mdi:spotify',
  bluesky: 'simple-icons:bluesky',
  discord: 'simple-icons:discord',
}

// Map social keys to their display handles
const socialHandles: Record<string, string> = {
  github: '@shankho9',
  linkedin: 'siddharthabasu',
  twitter: '@shankho99',
  stackoverflow: 'siddhartha-basu',
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
    twitter: 'Twitter',
    stackoverflow: 'Stack Overflow',
    spotify: 'Spotify',
    bluesky: 'Bluesky',
    discord: 'Discord',
    email: 'Email',
  }
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1)
}
</script>

<template>
  <div class="w-full py-2">
    <p class="text-black dark:text-zinc-300 text-xl font-semibold mb-2 text-center">
      Connect With Me
    </p>
    <p class="text-sm dark:text-zinc-300 mb-4 text-center max-w-3xl mx-auto">
      {{ footerData.authorInterest }}
    </p>
    <div class="flex justify-between items-center flex-wrap">
      <!-- Social Icons - Justified -->
      <div class="flex justify-between items-center gap-3 flex-1 flex-wrap">
        <NuxtLink
          v-for="(link, key) in socialLinks"
          :key="key"
          :to="link"
          target="_blank"
          class="relative p-2.5 bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-white rounded-full shadow-md hover:shadow-lg transition transform hover:scale-110 flex items-center justify-center group flex-shrink-0"
          :aria-label="key"
          style="min-width: 44px; height: 44px"
        >
          <Icon :icon="socialIcons[key] || `mdi:${key}`" width="20" height="20" />
          <!-- Tooltip -->
          <span
            class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg"
          >
            <span class="font-semibold">{{ getSocialLabel(key) }}</span>
            <br />
            <span class="text-gray-300">{{ socialHandles[key] }}</span>
          </span>
        </NuxtLink>
      </div>
      <!-- Spacer between social icons and email -->
      <div class="flex-shrink-0" style="min-width: 48px"></div>
      <!-- Sent Mail Button - 3x longer -->
      <a
        :href="`mailto:${seoData.mailAddress}`"
        class="relative px-6 py-2.5 bg-sky-700 text-white rounded-lg shadow-md hover:shadow-lg transition transform hover:scale-110 flex items-center justify-center gap-2 group flex-shrink-0"
        style="min-width: 180px; height: 44px"
        aria-label="email"
      >
        <Icon icon="mdi:email" width="20" height="20" />
        <span class="text-sm font-medium">Mail Me</span>
        <!-- Tooltip -->
        <span
          class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg"
        >
          <span class="font-semibold">{{ getSocialLabel('email') }}</span>
          <br />
          <span class="text-gray-300">{{ socialHandles.email }}</span>
        </span>
      </a>
    </div>
  </div>
</template>
