/**
 * Stub endpoint for future external related-content integrations.
 * Returns an empty list until Medium/Dev.to/WordPress/Reddit sources are implemented.
 */
import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { source = 'internal' } = query

  if (source !== 'internal') {
    console.info(`[related-content] Stub source requested: ${source}`)
  }

  return []
})

/**
 * Example: Fetch from Medium API
 *
 * async function fetchMediumArticles(tags: string[], limit: number) {
 *   const tag = tags[0] || 'programming'
 *   const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/tag/${tag}`)
 *   const data = await response.json()
 *   return data.items.slice(0, limit).map((item: any) => ({
 *     title: item.title,
 *     description: item.description,
 *     url: item.link,
 *     image: item.thumbnail,
 *     source: 'Medium',
 *     date: item.pubDate
 *   }))
 * }
 */

/**
 * Example: Fetch from Dev.to API
 *
 * async function fetchDevToArticles(tags: string[], limit: number) {
 *   const tag = tags[0] || 'webdev'
 *   const response = await fetch(`https://dev.to/api/articles?tag=${tag}&per_page=${limit}`)
 *   const articles = await response.json()
 *   return articles.map((article: any) => ({
 *     title: article.title,
 *     description: article.description,
 *     url: article.url,
 *     image: article.cover_image || article.social_image,
 *     source: 'Dev.to',
 *     date: article.published_at
 *   }))
 * }
 */

/**
 * Example: Fetch from WordPress REST API
 *
 * async function fetchWordPressPosts(tags: string[], limit: number) {
 *   const tag = tags[0] || 'technology'
 *   const response = await fetch(`https://public-api.wordpress.com/rest/v1.1/sites/example.wordpress.com/posts?tag=${tag}&number=${limit}`)
 *   const data = await response.json()
 *   return data.posts.map((post: any) => ({
 *     title: post.title,
 *     description: post.excerpt,
 *     url: post.URL,
 *     image: post.featured_image,
 *     source: 'WordPress',
 *     date: post.date
 *   }))
 * }
 */
