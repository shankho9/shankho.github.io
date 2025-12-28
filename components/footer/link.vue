<template>
  <div class="flex flex-col dark:text-zinc-300 my-5 md:my-0 md:justify-self-center">
    <p class="text-black dark:text-zinc-300 text-xl font-semibold mb-2">Quick Links</p>
    <div class="grid grid-cols-2 gap-x-3 gap-y-1">
      <NuxtLink
        to="/"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group text-sm"
      >
        <Icon
          name="mdi:home"
          size="16"
          class="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span
          class="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >Home</span
        >
      </NuxtLink>
      <NuxtLink
        to="/blogs"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group text-sm"
      >
        <Icon
          name="mdi:book-open-variant"
          size="16"
          class="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span
          class="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >Blogs</span
        >
      </NuxtLink>
      <NuxtLink
        to="/personalSpace"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group text-sm"
      >
        <Icon
          name="mdi:account-circle"
          size="16"
          class="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span
          class="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >LifeLines</span
        >
      </NuxtLink>
      <NuxtLink
        to="/library"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group text-sm"
      >
        <Icon
          name="mdi:library"
          size="16"
          class="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span
          class="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >Library</span
        >
      </NuxtLink>
      <NuxtLink
        to="/categories"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group text-sm"
      >
        <Icon
          name="mdi:tag-multiple"
          size="16"
          class="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span
          class="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >Categories</span
        >
      </NuxtLink>
      <NuxtLink
        to="/about"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group text-sm"
      >
        <Icon
          name="mdi:information"
          size="16"
          class="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span
          class="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >About Me</span
        >
      </NuxtLink>
      <NuxtLink
        to="/dev"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group text-sm"
      >
        <Icon
          name="mdi:tools"
          size="16"
          class="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span
          class="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >Utilities</span
        >
      </NuxtLink>
      <NuxtLink
        to="/sitemap.xml"
        target="_blank"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group text-sm"
      >
        <Icon
          name="mdi:sitemap"
          size="16"
          class="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span
          class="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >Sitemap</span
        >
      </NuxtLink>
    </div>
  </div>
</template>
