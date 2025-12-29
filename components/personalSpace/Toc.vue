<script setup lang="ts">
const { path } = useRoute()

// Convert route path to content path for personalSpace routes
// Route path: /personalSpace/8. Fav_map
// Content path: /blogs/8. Fav_map
const getContentPath = (routePath: string): string => {
  let contentPath = routePath

  // Remove /personalSpace/ prefix if present
  if (contentPath.startsWith('/personalSpace/')) {
    contentPath = contentPath.replace(/^\/personalSpace\//, '')
  } else if (contentPath === '/personalSpace') {
    // Handle exact match for /personalSpace (without trailing slash)
    contentPath = ''
  }

  // Ensure it starts with /
  if (!contentPath.startsWith('/')) {
    contentPath = `/${contentPath}`
  }

  // Add /blogs/ prefix if not already present
  if (!contentPath.startsWith('/blogs/')) {
    const slug = contentPath.replace(/^\/+/, '')
    contentPath = `/blogs/${slug}`
  }

  // Final cleanup
  return contentPath.replace(/\/+/g, '/')
}

// Convert path to content path for querying
const contentPath = getContentPath(path)

// Try multiple path variations to find the content
let articles = await queryCollection('content').path(contentPath).first()

if (!articles) {
  articles = await queryCollection('content').path(path).first()
}

if (!articles && path.startsWith('/personalSpace/')) {
  const slug = path.replace(/^\/personalSpace\//, '')
  articles = await queryCollection('content').path(`/blogs/${slug}`).first()
}

const links = articles?.body?.toc?.links || []
</script>

<template>
  <div class="lg:col-span-3 sticky top-28 h-96 hidden lg:block justify-self-end">
    <div class="border dark:border-gray-800 p-3 rounded-md min-w-[200px] dark:bg-slate-900">
      <h1 class="text-sm font-bold mb-3 border-b dark:border-gray-800 pb-2">Table Of Content</h1>
      <NuxtLink
        v-for="link in links"
        :key="link.id"
        :to="`#${link.id}`"
        class="block text-xs mb-3 hover:underline"
      >
        {{ link.text }}
      </NuxtLink>
    </div>
  </div>
</template>
