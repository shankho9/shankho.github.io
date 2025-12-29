# ImageKit Integration Setup Guide

This guide explains how to set up ImageKit integration for automatic photo gallery rendering on the Library - Photos page.

## Overview

The ImageKit integration allows you to automatically display photos from your ImageKit folders on your website. When you add photos to ImageKit, they will automatically appear on your site without any code changes.

## Prerequisites

1. An ImageKit account at [imagekit.io](https://imagekit.io)
2. Access to your ImageKit dashboard to get API credentials

## Setup Steps

### 1. Get ImageKit Credentials

1. Log in to your [ImageKit Dashboard](https://imagekit.io/dashboard)
2. Go to **Settings** → **Developer Options**
3. Copy the following values:
   - **Private API Key** (starts with `private_`) - **IMPORTANT: Use the Private API Key, not the Public Key**
   - **URL Endpoint** (e.g., `https://ik.imagekit.io/u6cq4dqll`)

**Note**: For the REST API, you only need the **Private API Key**. The Public Key is not used for server-side API calls.

### 2. Set Environment Variables

Add the following environment variables to your `.env` file (or your hosting platform's environment variables):

```env
# ImageKit Configuration
# Note: IMAGEKIT_PUBLIC_KEY is optional and not used for REST API calls
# Only IMAGEKIT_PRIVATE_KEY is required for server-side API access
IMAGEKIT_PUBLIC_KEY=your_public_key_here  # Optional, not used for file listing
IMAGEKIT_PRIVATE_KEY=your_private_key_here  # REQUIRED: Use Private API Key (starts with "private_")
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/u6cq4dqll
```

**Important**:

- Never commit your `.env` file to version control. The private key should remain secret.
- Make sure you're using the **Private API Key** (starts with `private_`), NOT the Public Key.
- The Private API Key is found in **Settings → Developer Options → Private API Key**

### 3. Configure Folders (Optional)

By default, the integration will load images from the root folder (`/`). To load images from specific folders:

1. Edit `pages/library.vue`
2. Update the `imageKitFolders` array:

```typescript
const imageKitFolders = ref<string[]>([
  '/', // Root folder
  '/Personal/about', // Personal photos
  '/Personal/travel', // Travel photos
  '/Personal/family', // Family photos
])
```

### 4. How It Works

1. **Automatic Loading**: When a user visits the Library - Photos page and is authenticated, images are automatically loaded from the selected ImageKit folder.

2. **Thumbnail Generation**: ImageKit automatically generates optimized thumbnails (400x400px) for fast loading.

3. **Real-time Updates**: When you add new photos to ImageKit, they will automatically appear on your website (users may need to refresh the page).

4. **Folder Selection**: Users can switch between different folders using the folder selector on the Photos tab.

## Features

- ✅ **Plug-and-Play**: Add photos to ImageKit, they appear on your site
- ✅ **Automatic Thumbnails**: ImageKit generates optimized thumbnails
- ✅ **Folder Support**: Organize photos in folders and browse by folder
- ✅ **Category Detection**: Automatically extracts categories from folder paths
- ✅ **Like & Comment**: Full support for likes and comments on ImageKit photos
- ✅ **Lightbox View**: Click any photo to view in full-screen lightbox

## Troubleshooting

### Images Not Loading

1. **Check Environment Variables**: Ensure all three ImageKit environment variables are set correctly.

2. **Verify API Credentials**: Double-check that your Public Key and Private Key are correct in the ImageKit dashboard.

3. **Check Folder Path**: Ensure the folder path exists in your ImageKit account. Use `/` for the root folder.

4. **Check Browser Console**: Open browser developer tools and check for any error messages.

5. **Check Server Logs**: Look for ImageKit API errors in your server logs.

### Common Errors

- **"ImageKit configuration is missing"**: Environment variables are not set or not accessible.
- **"ImageKit API error: 401"**: Invalid credentials. Check your Public Key and Private Key.
- **"ImageKit API error: 404"**: Folder path doesn't exist. Check the folder path in ImageKit.

## API Endpoint

The integration uses the following API endpoint:

```
GET /api/imagekit/list?folderPath=/&limit=100&skip=0
```

**Query Parameters**:

- `folderPath` (optional): Folder path to load images from (default: `/`)
- `limit` (optional): Maximum number of images to load (default: `100`)
- `skip` (optional): Number of images to skip (default: `0`)

## Security Notes

- The ImageKit Private Key is only used server-side and never exposed to the client.
- The API endpoint requires authentication to access (users must be signed in).
- ImageKit URLs are public, but the API credentials remain secure.

## Next Steps

1. Upload photos to your ImageKit account
2. Organize them in folders if desired
3. Visit the Library - Photos page on your website
4. Select a folder to view photos
5. Click any photo to view in full-screen lightbox

Enjoy your automatic photo gallery! 📸
