import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug

  // If no slug is provided, return a 400 error
  if (!slug) {
    return { statusCode: 400, message: 'Slug parameter is missing' }
  }

  // SQL query to fetch the blog post based on slug
  const sql = 'SELECT title, content, places, year FROM blog_posts WHERE slug = $1'

  try {
    const result = await query(sql, [slug])

    // If no post is found for the given slug, return a 404 error
    if (result.length === 0) {
      return { statusCode: 404, message: 'Post not found' }
    }

    const post = result[0]

    // Assuming places are stored as a JSON field in the database
    const places = post.places ? JSON.parse(post.places) : []

    // Return the post data, including the associated places and year
    return {
      title: post.title,
      content: post.content,
      places: places,
      year: post.year, // Include the year in the response
    }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, message: 'Failed to fetch post data' }
  }
})
