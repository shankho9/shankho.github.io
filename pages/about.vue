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

const socialIcons = {
  github: 'mdi:github',
  linkedin: 'mdi:linkedin',
  twitter: 'mdi:twitter',
  stackoverflow: 'mdi:stack-overflow',
  spotify: 'mdi:spotify',
}
</script>

<template>
  <div class="py-10 container mx-auto max-w-6xl">
    <h1 class="text-3xl font-bold pb-5 text-center">{{ aboutPage.title }}</h1>

    <div class="flex flex-col sm:flex-row justify-between items-center gap-5">
      <div class="w-full sm:w-1/3 h-[650px] flex">
        <NuxtImg
          src="/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg"
          class="rounded-md w-full h-full object-cover shadow-lg"
          width="600"
          height="650"
          quality="85"
        />
      </div>

      <div class="w-full sm:w-1/3 text-center px-5">
        <h3 class="text-xl sm:text-2xl font-semibold mb-5">{{ aboutPage.description }}</h3>
        <p class="text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-300">
          {{ aboutPage.aboutMe }}
        </p>

        <div class="my-6 flex flex-wrap justify-center gap-4">
          <NuxtLink
            v-for="(link, key) in socialLinks"
            :key="key"
            :to="link"
            target="_blank"
            class="flex items-center px-4 py-2 rounded-lg shadow-md bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600 transition transform hover:scale-105"
            :aria-label="`Visit my ${key} profile`"
          >
            <Icon :icon="socialIcons[key]" class="mr-2" width="24" height="24" />
            <span class="capitalize font-medium">{{ key }}</span>
          </NuxtLink>
        </div>
      </div>

      <div class="w-full sm:w-1/3 h-[650px] flex">
        <NuxtImg
          src="/blogs-img/personal/Sid_Specs.jpg"
          class="rounded-md w-full h-full object-cover shadow-lg"
          width="600"
          height="650"
          quality="85"
        />
      </div>
    </div>

    <div class="flex flex-col sm:flex-row justify-between items-center gap-5 mt-10">
      <div class="w-full sm:w-1/3 h-[550px] flex">
        <NuxtImg
          src="/blogs-img/personal/Sid_Papiya_DecadeBack.jpg"
          class="rounded-md w-full h-full object-cover shadow-lg"
          width="500"
          height="550"
          quality="85"
        />
      </div>

      <div class="w-full sm:w-1/3 text-center px-5">
        <h2 class="text-xl sm:text-2xl font-semibold mb-3">
          Better Half: The One Who Knows Everything
        </h2>
        <p class="text-base sm:text-lg">
          She has an incredible talent for predicting the future—especially when it involves me
          making a mistake. She remembers everything I say (even the things I don’t) and has a
          built-in GPS for finding things I swear weren’t there a second ago. While I bring
          “spontaneity” (read: forgetfulness), she brings organization, logic, and a gentle reminder
          that I am, in fact, wrong—again. Life with her is an adventure, and I wouldn’t change a
          thing… except maybe for fewer “we need to talk” moments — but even those just remind me
          how lucky I am. ❤️
        </p>
      </div>

      <div class="w-full sm:w-1/3 h-[550px] flex">
        <NuxtImg
          src="/blogs-img/personal/Sid_Papiya.jpg"
          class="rounded-md w-full h-full object-cover shadow-lg"
          width="500"
          height="550"
          quality="85"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
      <NuxtImg
        v-for="(img, index) in [
          '/blogs-img/personal/Riya_Solo.jpg',
          '/blogs-img/personal/Riya_Solo2.jpg',
          '/blogs-img/personal/Tiya_Solo2.jpg',
          '/blogs-img/personal/Tiya_Solo.jpg',
        ]"
        :key="index"
        class="rounded-md w-full h-[500px] object-cover shadow-lg"
        width="450"
        height="500"
        quality="85"
        :src="img"
      />
    </div>

    <!-- Second Row: 2 Images -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
      <NuxtImg
        v-for="(img, index) in [
          '/blogs-img/personal/TheTwo.jpg',
          '/blogs-img/personal/TheTwo_2.jpg',
        ]"
        :key="index"
        class="rounded-md w-full h-[500px] object-cover shadow-lg"
        width="600"
        height="500"
        quality="85"
        :src="img"
      />
    </div>

    <div class="mt-10 text-center">
      <h2 class="text-3xl font-extrabold mb-6 text-gray-800 dark:text-white">
        Memories from My Last Organization: A Journey of Fun, Hustle & Cafeteria Lunch
      </h2>
      <p class="text-lg px-6 max-w-3xl mx-auto leading-relaxed text-gray-700 dark:text-gray-300">
        Work is supposed to be about projects and deadlines, but let’s be honest—what truly made it
        memorable were the
        <span class="font-semibold">people</span>. A team of insanely talented, hardworking
        individuals who somehow managed to get things done between
        <span class="italic">laughing at Teams memes</span> and
        <span class="italic">finding the perfect walking route</span> to squeeze in those extra
        <span class="italic">Google Fit Steps</span> while pretending to discuss work.
      </p>

      <p
        class="text-lg px-6 max-w-3xl mx-auto leading-relaxed text-gray-700 dark:text-gray-300 mt-4"
      >
        The <span class="font-semibold">walks</span>, the
        <span class="font-semibold">coffee runs</span>, the
        <span class="font-semibold">"quick" stand-up meetings</span> that somehow lasted forever—all
        part of the glorious chaos. Some of the best brainstorming sessions happened outside meeting
        rooms, usually while <span class="italic">waiting in line for cafeteria lunch</span> and
        silently <span class="italic">judging the menu choices</span>. And let’s not forget the
        legendary <span class="font-semibold">post-work gossip walks</span>, where we solved
        everything—except our actual work problems.
      </p>

      <p
        class="text-lg px-6 max-w-3xl mx-auto leading-relaxed text-gray-700 dark:text-gray-300 mt-4"
      >
        As for me, I had the privilege (and occasional struggle) of being a
        <span class="font-semibold">Humble Boss™</span>. Leadership is all about vision, strategy,
        and, in my case, <span class="italic">strategically avoiding Excel sheets</span> while
        bribing my team with snacks. Sure, I had the title, but let’s be real—the real
        decision-makers were my team (especially when it came to choosing the longest walking route
        just to avoid going back to our desks too soon).
      </p>

      <p
        class="text-lg px-6 max-w-3xl mx-auto leading-relaxed text-gray-700 dark:text-gray-300 mt-4"
      >
        Looking back, I realize we weren’t just colleagues—we were
        <span class="font-semibold">partners in crime</span>. We tackled deadlines like warriors,
        survived meetings that should’ve been emails, and somehow managed to turn work into
        something we actually <span class="italic">enjoyed</span>.
      </p>

      <p
        class="text-lg px-6 max-w-3xl mx-auto leading-relaxed text-gray-700 dark:text-gray-300 mt-4"
      >
        <span class="font-semibold">To my former colleagues:</span> Thank you—for the laughs, the
        hustle, and for only mildly questioning my life choices as your boss. The journey wouldn’t
        have been the same without you.
      </p>
    </div>

    <div class="mt-12 flex justify-center">
      <NuxtImg
        src="/blogs-img/personal/MacquarieDays.jpg"
        class="rounded-lg w-full max-w-4xl h-auto shadow-xl"
        width="1600"
        height="600"
        quality="85"
        alt="Team Memories"
      />
    </div>

    <div class="mt-10 text-center max-w-4xl mx-auto">
      <h2 class="text-3xl font-extrabold mb-6">The Real Bosses of My Life</h2>

      <div class="text-lg px-5 leading-relaxed space-y-6 text-gray-800 dark:text-gray-300">
        <p>
          Leadership? Strategy? Crisis management? I thought I had it all figured out—until I became
          a father. My two daughters have perfected the art of negotiation (usually over bedtime),
          emotional intelligence (knowing exactly when to ask for ice cream), and high-level
          problem-solving (finding loopholes in every rule I set). If they ever form a startup, I
          might just be working for them.
        </p>

        <p>
          And then there’s my wife—my <span class="font-semibold">Chief Reality Officer</span>.
          While I like to believe I’m the head of the family, she lets me hold that title… just like
          a CEO in a company where the actual power lies elsewhere. She’s the
          <span class="font-semibold">Head of Logistics</span> (keeping everything running
          smoothly), and the
          <span class="font-semibold">Director of Quality Control and Household Police Chief</span>
          (keeping that watchful eyes, especially when I try to have 'life conversation' with the
          kids 😂). If marriage has taught me one thing, it’s this:
          <span class="italic">she's always right… even when she's not (but she is).</span>
        </p>

        <p>
          I dedicate this blogsite to my <b>daughters</b> (Riya & Tiya) — my greatest adventure, my
          toughest negotiators, and my future world-changers. May you always lead with kindness,
          curiosity, and just enough mischief to keep life interesting. And to my wife, my daily
          reminder that leadership isn’t about power—it’s about knowing when to just nod and say,
          <span class="italic">"Yes, dear."</span> 😂❤️
        </p>
      </div>
    </div>

    <div class="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
      <NuxtImg
        v-for="(img, index) in [
          '/blogs-img/personal/All_four.jpg',
          '/blogs-img/personal/TheThree.jpg',
        ]"
        :key="index"
        class="rounded-md w-full h-[650px] object-cover shadow-lg"
        width="600"
        height="650"
        quality="85"
        :src="img"
      />
    </div>
  </div>
</template>
