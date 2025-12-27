# SEO Optimization Guide for Google Search Rankings

This guide covers all the places where you need to make changes to improve your Google SEO rankings.

## 📍 Key Files to Modify

### 1. **`data/index.ts`** - SEO Metadata
This is the **primary file** where you configure your site's SEO data:

```typescript
export const seoData = {
  title: `Sid's Blog | Shankho Blog`,
  description: 'Your site description here (150-160 characters)',
  mySite: 'https://yourdomain.com', // Your production URL
  ogTitle: 'Your Open Graph title',
  image: 'https://yourdomain.com/og-image.jpg', // Social sharing image
  twitterHandle: '@yourhandle',
  twitterDescription: 'Your Twitter description',
}
```

**What to update:**
- `description`: Write a compelling 150-160 character description with your main keywords
- `mySite`: Ensure this is your production domain (not localhost)
- `image`: Add a high-quality OG image (1200x630px recommended)
- `twitterHandle`: Your Twitter/X handle

### 2. **`nuxt.config.ts`** - Site Configuration
Already configured with:
- ✅ Sitemap generation (`@nuxtjs/sitemap`)
- ✅ Robots.txt (`@nuxtjs/robots`)
- ✅ OG Image generation (`nuxt-og-image`)

**Environment Variables to Set:**
```bash
# In .env.production
NUXT_PUBLIC_SITE_URL=https://yourdomain.com
NUXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### 3. **Individual Pages** - Page-Specific SEO
Each page should have unique meta tags:

**Example in `pages/index.vue`:**
```typescript
useHead({
  title: 'Home - Shankho Blog',
  meta: [
    {
      name: 'description',
      content: 'Unique page description (150-160 chars)',
    },
  ],
})
```

**Files to update:**
- `pages/index.vue` - Homepage
- `pages/blogs/index.vue` - Blog listing
- `pages/about.vue` - About page
- `pages/gallery.vue` - Gallery page
- `pages/library.vue` - Library page
- `pages/resources.vue` - Resources page
- `pages/personalSpace/index.vue` - LifeLines page

### 4. **Blog Posts** - Content SEO
Blog posts automatically get SEO from Nuxt Content, but ensure:
- Each post has a `description` in frontmatter
- Each post has relevant `tags`
- Each post has an `image` for OG sharing

**Example frontmatter:**
```yaml
---
title: Your Blog Post Title
description: A compelling description with keywords (150-160 chars)
date: 2024-01-15
tags: [keyword1, keyword2, keyword3]
image: /path/to/image.jpg
published: true
---
```

## 🚀 New SEO Features Added

### Structured Data (JSON-LD)
I've added structured data components that help Google understand your content:

1. **`components/seo/StructuredData.vue`** - Main structured data component
2. **`components/seo/BlogPostSchema.vue`** - For blog posts
3. **`components/seo/PersonSchema.vue`** - For author information
4. **`components/seo/WebsiteSchema.vue`** - For website information

These are automatically included in your pages.

## 📋 SEO Checklist

### Technical SEO (Already Configured ✅)
- [x] Sitemap generation
- [x] Robots.txt
- [x] Meta tags (title, description, OG tags)
- [x] Canonical URLs
- [x] Mobile responsive
- [x] Fast loading (Vercel hosting)
- [x] HTTPS (automatic with Vercel)

### Content SEO (You Need to Do)
- [ ] **Keywords Research**: Identify 5-10 main keywords for your blog
- [ ] **Title Tags**: Each page has unique, keyword-rich titles (50-60 chars)
- [ ] **Meta Descriptions**: Compelling descriptions with keywords (150-160 chars)
- [ ] **Header Tags**: Use H1, H2, H3 properly in content
- [ ] **Alt Text**: All images have descriptive alt text
- [ ] **Internal Linking**: Link between related posts
- [ ] **External Links**: Link to authoritative sources
- [ ] **Content Quality**: Write comprehensive, valuable content (1000+ words for main posts)

### On-Page SEO
- [ ] **URL Structure**: Clean, descriptive URLs (already good: `/blogs/my-post`)
- [ ] **Image Optimization**: Compress images, use WebP format
- [ ] **Page Speed**: Already optimized with Nuxt Image
- [ ] **Schema Markup**: ✅ Now added automatically

### Off-Page SEO
- [ ] **Google Search Console**: Submit your sitemap
- [ ] **Google Analytics**: Already configured
- [ ] **Social Sharing**: Share posts on social media
- [ ] **Backlinks**: Get links from other sites
- [ ] **Guest Posting**: Write for other blogs

## 🔧 How to Submit to Google

### Step 1: Verify Your Site
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property (your domain)
3. Verify ownership (DNS or HTML file method)

### Step 2: Submit Sitemap
1. In Search Console, go to "Sitemaps"
2. Submit: `https://yourdomain.com/sitemap.xml`
3. Also submit: `https://yourdomain.com/sitemap-0.xml` (if exists)

### Step 3: Request Indexing
1. Use "URL Inspection" tool
2. Enter your homepage URL
3. Click "Request Indexing"
4. Repeat for important pages

### Step 4: Monitor Performance
- Check "Performance" report weekly
- Monitor which keywords bring traffic
- Optimize pages based on data

## 📊 Key Metrics to Track

1. **Impressions**: How often your site appears in search
2. **Clicks**: How many people click through
3. **CTR (Click-Through Rate)**: Clicks / Impressions
4. **Average Position**: Your ranking for keywords
5. **Core Web Vitals**: Page speed metrics

## 🎯 Quick Wins for Better Rankings

1. **Update `data/index.ts`** with better descriptions
2. **Add keywords** to page titles and descriptions
3. **Create quality content** regularly (Google favors fresh content)
4. **Optimize images** (already using ImageKit ✅)
5. **Get backlinks** from relevant sites
6. **Improve page speed** (already optimized ✅)
7. **Use internal linking** between related posts
8. **Add FAQ sections** to relevant pages
9. **Create topic clusters** (groups of related posts)
10. **Monitor and fix** broken links

## 📝 Next Steps

1. **Update SEO data** in `data/index.ts`
2. **Add structured data** to key pages (already added ✅)
3. **Submit sitemap** to Google Search Console
4. **Create quality content** with target keywords
5. **Build backlinks** through guest posting and networking
6. **Monitor performance** in Google Search Console

## 🔗 Useful Resources

- [Google Search Central](https://developers.google.com/search)
- [Google Search Console](https://search.google.com/search-console)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema.org](https://schema.org/) - For structured data
- [Rich Results Test](https://search.google.com/test/rich-results)

---

**Remember**: SEO is a long-term strategy. It takes 3-6 months to see significant results. Focus on creating quality content and following best practices consistently.

