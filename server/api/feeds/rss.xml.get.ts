import { Feed } from 'feed'
import { siteBrand } from '~/data'

const basePath = 'https://www.nomadic-notions.co.in/'

export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'text/xml')
  const docs = await queryCollection(event, 'content').all()
  const feed = new Feed({
    title: siteBrand.publisherName,
    description: `${siteBrand.publisherName} — blog by ${siteBrand.authorName}`,
    id: basePath,
    link: basePath,
    language: 'en',
    favicon: `${basePath}/favicon.ico`,
    copyright: 'MIT',
    author: {
      name: siteBrand.authorName,
      email: siteBrand.contactEmail,
      link: basePath,
    },
  })

  // Add the feed items
  docs.forEach((doc) => {
    feed.addItem({
      title: doc.title || '',
      id: basePath + doc.path,
      link: basePath + doc.path,
      description: doc.description,
      content: doc.description,
      date: new Date(doc.meta?.date as string),
    })
  })

  return feed.rss2()
})
