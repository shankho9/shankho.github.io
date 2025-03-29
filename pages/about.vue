<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { aboutPage, footerData, navbarData, socialLinks } from '~/data'

useHead({
  title: 'About',
  meta: [
    {
      name: 'description',
      content: footerData.aboutAuthor,
    },
  ],
})

defineOgImageComponent('About', {
  headline: 'Greetings 👋',
  title: navbarData.homeTitle,
  description: 'Dive into the world so beautiful. Do good, be good.',
  link: '/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg',
})

// FontAwesome icons for social media
const socialIcons = {
  github: 'fa-brands:github',
  linkedin: 'fa-brands:linkedin',
  twitter: 'fa-brands:twitter',
  stackoverflow: 'fa-brands:stack-overflow',
}
</script>

<template>
  <div class="py-10 container mx-auto max-w-6xl">
    <!-- Page Heading -->
    <h1 class="text-3xl font-bold pb-5 text-center">
      {{ aboutPage.title }}
    </h1>

    <!-- First Row: Two Images with Text in Center -->
    <div class="flex flex-col sm:flex-row justify-between items-center gap-5">
      <div class="w-full sm:w-1/3">
        <NuxtImg
          src="/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg"
          class="rounded-md w-full h-auto shadow-lg"
          width="600"
          height="650"
          quality="85"
        />
      </div>

      <div class="w-full sm:w-1/3 text-center px-5">
        <h3 class="text-lg sm:text-2xl font-semibold mb-5">
          {{ aboutPage.description }}
        </h3>
        <p class="text-base sm:text-lg">
          {{ aboutPage.aboutMe }}
        </p>

        <div class="my-5 flex flex-wrap justify-center gap-3">
          <NuxtLink
            v-for="(link, key) in socialLinks"
            :key="key"
            :to="link"
            target="_blank"
            class="px-3 py-2 bg-gray-300 text-gray-800 rounded-md dark:bg-slate-700 dark:text-[#F1F2F4] flex items-center"
            :aria-label="key"
          >
            <Icon :icon="socialIcons[key]" class="mr-2" width="24" height="24" />
            <span class="capitalize">{{ key }}</span>
          </NuxtLink>
        </div>
      </div>

      <div class="w-full sm:w-1/3">
        <NuxtImg
          src="/blogs-img/personal/Sid_Specs.jpg"
          class="rounded-md w-full h-auto shadow-lg"
          width="600"
          height="650"
          quality="85"
        />
      </div>
    </div>

    <!-- Second Row: Two Images and Text in the Center -->
    <div class="flex flex-col sm:flex-row justify-between items-center gap-5 mt-10">
      <div class="w-full sm:w-1/3">
        <NuxtImg
          src="/blogs-img/personal/Sid-Papiya_DecadeBack.jpg"
          class="rounded-md w-full h-auto shadow-lg"
          width="500"
          height="550"
          quality="85"
        />
      </div>

      <div class="w-full sm:w-1/3 text-center px-5">
        <h2 class="text-xl sm:text-2xl font-semibold mb-3">A Journey of Memories</h2>
        <p class="text-base sm:text-lg">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Pellentesque
          habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Mauris
          tincidunt erat in nisl efficitur, at tempus felis aliquet.
        </p>
      </div>

      <div class="w-full sm:w-1/3">
        <NuxtImg
          src="/blogs-img/personal/Sid-Papiya.jpg"
          class="rounded-md w-full h-auto shadow-lg"
          width="500"
          height="550"
          quality="85"
        />
      </div>
    </div>

    <!-- Third Row: 4 Image Placeholders -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
      <NuxtImg
        src="/blogs-img/personal/Riya_Solo.jpg"
        class="rounded-md w-full h-auto shadow-lg"
        width="450"
        height="500"
        quality="85"
      />
      <NuxtImg
        src="/blogs-img/personal/Riya_Solo2.jpg"
        class="rounded-md w-full h-auto shadow-lg"
        width="450"
        height="500"
        quality="85"
      />
      <NuxtImg
        src="/blogs-img/personal/Sid-Tiya.jpg"
        class="rounded-md w-full h-auto shadow-lg"
        width="450"
        height="500"
        quality="85"
      />
      <NuxtImg
        src="/blogs-img/personal/Tiya_Solo.jpg"
        class="rounded-md w-full h-auto shadow-lg"
        width="450"
        height="500"
        quality="85"
      />
    </div>

    <!-- Additional Text Placeholder -->
    <div class="mt-10 text-center">
      <h2 class="text-2xl font-bold mb-4">More About My Journey</h2>
      <p class="text-lg px-5">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Pellentesque
        habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Mauris
        tincidunt erat in nisl efficitur, at tempus felis aliquet.
      </p>
    </div>

    <!-- Single Landscape Image Placeholder -->
    <div class="mt-10 flex justify-center">
      <NuxtImg
        src="/blogs-img/personal/MacquarieDays.jpg"
        class="rounded-md w-full max-w-4xl h-auto shadow-lg"
        width="1600"
        height="600"
        quality="85"
        alt="Landscape Image"
      />
    </div>

    <!-- Additional Text Placeholder -->
    <div class="mt-10 text-center">
      <h2 class="text-2xl font-bold mb-4">Happy Smiling Family</h2>
      <p class="text-lg px-5">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Pellentesque
        habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Mauris
        tincidunt erat in nisl efficitur, at tempus felis aliquet.
      </p>
    </div>

    <!-- Two Pictures Placeholder -->
    <div class="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
      <NuxtImg
        src="/blogs-img/personal/All_four.jpg"
        class="rounded-md w-full h-auto shadow-lg"
        width="600"
        height="650"
        quality="85"
        alt="Placeholder Image 1"
      />
      <NuxtImg
        src="/blogs-img/personal/TheThree.jpg"
        class="rounded-md w-full h-auto shadow-lg"
        width="600"
        height="650"
        quality="85"
        alt="Placeholder Image 2"
      />
    </div>
  </div>
</template>
