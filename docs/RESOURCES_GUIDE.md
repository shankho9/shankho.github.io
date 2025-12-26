# Resources Section Guide

This guide explains how to add pictures, videos, and content to the Resources section of your website.

## 📍 Location

All resources data is stored in: `data/index.ts` in the `resourcesPage` object.

## 🖼️ Adding Images

### Step 1: Upload to ImageKit

1. Go to [ImageKit Dashboard](https://imagekit.io/dashboard)
2. Upload your image to the desired folder
3. Copy the ImageKit URL (format: `https://ik.imagekit.io/u6cq4dqll/YourFolder/YourImage.jpg?updatedAt=timestamp`)

### Step 2: Add to Data File

Open `data/index.ts` and add your image to the `resourcesPage.images` array:

```typescript
images: [
  {
    title: 'Your Image Title',
    description: 'A brief description of the image',
    imageUrl: 'https://ik.imagekit.io/u6cq4dqll/YourFolder/YourImage.jpg?updatedAt=timestamp',
    category: 'Category Name', // e.g., 'Family', 'Travel', 'Work', 'Nature'
    date: '2024-01-15', // Format: YYYY-MM-DD
    link: 'https://ik.imagekit.io/u6cq4dqll/YourFolder/YourImage.jpg?updatedAt=timestamp', // Full-size image URL
  },
  // Add more images...
]
```

### Image Categories

You can use any category name. Common ones:

- Family
- Travel
- Work
- Nature
- Events
- Daily

## 🎥 Adding Videos

### Step 1: Choose Your Video Platform

#### Option A: YouTube

1. Upload your video to YouTube
2. Copy the video URL: `https://www.youtube.com/watch?v=VIDEO_ID`

#### Option B: Vimeo

1. Upload your video to Vimeo
2. Copy the video URL: `https://vimeo.com/VIDEO_ID`

#### Option C: ImageKit (Direct Video)

1. Upload your video to ImageKit
2. Copy the video URL: `https://ik.imagekit.io/u6cq4dqll/YourFolder/YourVideo.mp4`

#### Option D: Direct Video URL

Use any direct video URL (e.g., from your own server)

### Step 2: Get Thumbnail

- For YouTube: Use `https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg`
- For Vimeo: Use the thumbnail URL from Vimeo
- For ImageKit: Upload a thumbnail image and use its ImageKit URL

### Step 3: Add to Data File

Open `data/index.ts` and add your video to the `resourcesPage.videos` array:

```typescript
videos: [
  {
    title: 'Your Video Title',
    description: 'A brief description of the video',
    thumbnail: 'https://ik.imagekit.io/u6cq4dqll/YourFolder/Thumbnail.jpg?updatedAt=timestamp',
    videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    category: 'Travel', // e.g., 'Travel', 'Family', 'Tutorial'
    date: '2024-01-20', // Format: YYYY-MM-DD
    duration: '5:32', // Format: MM:SS or HH:MM:SS
    platform: 'youtube', // 'youtube', 'vimeo', 'direct', or 'imagekit'
  },
  // Add more videos...
]
```

### Video Platform Options

- `'youtube'` - For YouTube videos
- `'vimeo'` - For Vimeo videos
- `'imagekit'` - For videos hosted on ImageKit
- `'direct'` - For direct video URLs

## 📝 Adding Content/Articles

Add links to your blog posts or external articles:

```typescript
content: [
  {
    title: 'Article Title',
    description: 'A brief description of the content',
    link: '/blogs', // Internal link (e.g., '/blogs') or external URL
    category: 'Tutorial', // e.g., 'Tutorial', 'Development', 'Leadership'
    icon: 'mdi:book-open-page-variant', // Iconify icon name
    date: '2024-01-10', // Format: YYYY-MM-DD
  },
  // Add more content...
]
```

### Available Icons

You can use any [Iconify icon](https://icon-sets.iconify.design/). Common ones:

- `mdi:book-open-page-variant` - Books/Articles
- `mdi:code-braces` - Development
- `mdi:account-group` - Leadership
- `mdi:school` - Learning
- `mdi:lightbulb` - Ideas
- `mdi:chart-line` - Analytics

## 🎨 Display Order

Sections are displayed in this order on the Resources page:

1. Recommended Books
2. Tools I Use
3. Learning Resources
4. Templates & Downloads
5. **Image Gallery** (new)
6. **Video Resources** (new)
7. **Featured Content** (new)

## 💡 Tips

1. **ImageKit URLs**: Always include the `?updatedAt=timestamp` parameter for cache busting
2. **Image Sizes**: Images are automatically optimized by NuxtImg, but aim for:
   - Thumbnails: 400x400px
   - Full images: 1200x1200px or larger
3. **Video Thumbnails**: Use high-quality thumbnails (at least 600x338px for 16:9 aspect ratio)
4. **Categories**: Keep category names consistent for better organization
5. **Dates**: Use ISO format (YYYY-MM-DD) for consistent sorting

## 🔄 Updating Resources

1. Edit `data/index.ts`
2. Add your new images, videos, or content to the respective arrays
3. Save the file
4. The changes will appear on the Resources page automatically

## 📸 Example: Complete Image Entry

```typescript
{
  title: 'Sunset at Beach',
  description: 'Beautiful sunset captured during our beach vacation',
  imageUrl: 'https://ik.imagekit.io/u6cq4dqll/Personal/travel/beach_sunset.jpg?updatedAt=1745977729755',
  category: 'Travel',
  date: '2024-07-15',
  link: 'https://ik.imagekit.io/u6cq4dqll/Personal/travel/beach_sunset.jpg?updatedAt=1745977729755',
}
```

## 🎬 Example: Complete Video Entry

```typescript
{
  title: 'Travel Vlog: Exploring Mountains',
  description: 'A day in the mountains with stunning views',
  thumbnail: 'https://ik.imagekit.io/u6cq4dqll/Personal/videos/mountain_thumb.jpg?updatedAt=1745977729755',
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  category: 'Travel',
  date: '2024-08-20',
  duration: '12:45',
  platform: 'youtube',
}
```

## 🚀 Quick Start

1. **For Images**: Upload to ImageKit → Copy URL → Add to `images` array
2. **For Videos**: Upload to YouTube/Vimeo/ImageKit → Get thumbnail → Add to `videos` array
3. **For Content**: Create blog post → Add link to `content` array

That's it! Your resources will appear on the `/resources` page automatically.
