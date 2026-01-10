import { defineEventHandler, getQuery, setHeader } from 'h3'
import { useRuntimeConfig } from '#imports'

interface ImageKitFile {
  fileId: string
  name: string
  url: string
  thumbnailUrl: string
  filePath: string
  fileType: string
  height: number
  width: number
  size: number
  createdAt: string
  updatedAt: string
  tags?: string[]
  customCoordinates?: string
  isPrivateFile: boolean
  customMetadata?: Record<string, unknown>
}

interface ImageKitResponse {
  files: ImageKitFile[]
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  // Get ImageKit credentials from runtime config
  const imageKitPrivateKey = config.imageKitPrivateKey

  const _imageKitUrlEndpoint = config.imageKitUrlEndpoint

  // Validate configuration - only Private Key is required for REST API
  if (!imageKitPrivateKey) {
    return {
      success: false,
      error:
        'ImageKit configuration is missing. Please set IMAGEKIT_PRIVATE_KEY environment variable. Make sure you are using the Private API Key (starts with "private_"), not the Public Key.',
      images: [],
    }
  }

  // Validate Private Key format
  if (!imageKitPrivateKey.startsWith('private_')) {
    return {
      success: false,
      error:
        'Invalid ImageKit Private Key format. The Private API Key should start with "private_". Please check your IMAGEKIT_PRIVATE_KEY environment variable.',
      images: [],
    }
  }

  // Get folder path from query (default to root or specified folder)
  const folderPath = (query.folderPath as string) || '/'
  const fileType = (query.fileType as string) || 'image' // 'image' or 'video'
  const limit = parseInt((query.limit as string) || '100', 10)
  const skip = parseInt((query.skip as string) || '0', 10)
  const noCache = query.noCache === 'true' // Allow bypassing cache when explicitly requested

  try {
    // ImageKit API endpoint for listing files
    const apiUrl = 'https://api.imagekit.io/v1/files'

    // ImageKit REST API authentication
    // Use Basic Auth with privateKey: (empty string) format
    // According to ImageKit docs, for REST API use privateKey as username and empty password
    const authString = Buffer.from(`${imageKitPrivateKey}:`).toString('base64')

    // Build query parameters
    // Note: ImageKit API uses 'path' parameter for folder filtering
    // The path should not start with '/' for the API call
    const params = new URLSearchParams()

    // Check if we need to fetch "All" (root + all subfolders)
    // When "All" is selected, we fetch all files and filter by path prefix
    const includeAllSubfolders = query.includeAllSubfolders === 'true'
    const rootFolderForAll = query.rootFolderForAll as string | undefined

    if (folderPath && folderPath !== '/' && !includeAllSubfolders) {
      // Remove leading slash if present for API call
      const cleanPath = folderPath.startsWith('/') ? folderPath.slice(1) : folderPath
      params.append('path', cleanPath)
    }
    // If includeAllSubfolders is true, don't add path filter - we'll filter client-side by path prefix
    params.append('limit', includeAllSubfolders ? '1000' : limit.toString()) // Increase limit for "All"
    params.append('skip', skip.toString())

    // Fetch files from ImageKit
    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `ImageKit API error: ${response.status}`

      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }

      console.error('[ImageKit API] Error:', response.status, errorMessage)
      console.error('[ImageKit API] Response:', errorText)

      // Provide helpful error messages
      if (response.status === 403) {
        errorMessage =
          'Authentication failed. Please check your IMAGEKIT_PRIVATE_KEY. Make sure you are using the Private API Key (starts with "private_"), not the Public Key.'
      } else if (response.status === 401) {
        errorMessage = 'Unauthorized. Please verify your ImageKit credentials are correct.'
      }

      throw new Error(errorMessage)
    }

    const data = (await response.json()) as ImageKitResponse | ImageKitFile[]

    // Handle different response structures
    // ImageKit API might return an array directly or an object with 'files' property
    let files: ImageKitFile[] = []

    if (Array.isArray(data)) {
      // Response is an array of files
      files = data
    } else if (data && typeof data === 'object' && 'files' in data) {
      // Response has a 'files' property
      files = (data as ImageKitResponse).files || []
    } else {
      // Unexpected response structure
      console.error('[ImageKit API] Unexpected response structure:', JSON.stringify(data, null, 2))
      throw new Error('Unexpected response format from ImageKit API')
    }

    // Validate files array
    if (!Array.isArray(files)) {
      console.error('[ImageKit API] Files is not an array:', files)
      throw new Error('ImageKit API returned invalid data format')
    }

    // If "All" is selected, filter files to include root folder and all subfolders
    let filesToProcess = files
    if (includeAllSubfolders && rootFolderForAll) {
      const normalizedRoot = rootFolderForAll.startsWith('/')
        ? rootFolderForAll.slice(1)
        : rootFolderForAll
      filesToProcess = files.filter((file) => {
        const filePath = file.filePath.startsWith('/') ? file.filePath.slice(1) : file.filePath
        // Include files in root folder or any subfolder
        return filePath === normalizedRoot || filePath.startsWith(normalizedRoot + '/')
      })
    }

    // Transform ImageKit files to our format
    const filteredFiles = filesToProcess.filter((file) => {
      const fileTypeLower = file.fileType.toLowerCase()
      const fileNameLower = file.name.toLowerCase()

      if (fileType === 'video') {
        // Filter for video files
        const videoMimeTypes = [
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/x-msvideo',
          'video/webm',
          'video/ogg',
        ]
        const videoExtensions = ['mp4', 'mpeg', 'mov', 'avi', 'webm', 'ogg', 'mkv', 'flv', 'wmv']

        // Check MIME type format
        if (videoMimeTypes.some((type) => fileTypeLower === type || fileTypeLower.includes(type))) {
          return true
        }

        // Check extension format
        if (videoExtensions.some((ext) => fileTypeLower === ext || fileTypeLower.includes(ext))) {
          return true
        }

        // Check file name extension as fallback
        if (videoExtensions.some((ext) => fileNameLower.endsWith(`.${ext}`))) {
          return true
        }
      } else {
        // Filter for image files (default)
        const imageMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
          'image/svg+xml',
        ]
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']

        // Check MIME type format
        if (imageMimeTypes.some((type) => fileTypeLower === type || fileTypeLower.includes(type))) {
          return true
        }

        // Check extension format
        if (imageExtensions.some((ext) => fileTypeLower === ext || fileTypeLower.includes(ext))) {
          return true
        }

        // Check file name extension as fallback
        if (imageExtensions.some((ext) => fileNameLower.endsWith(`.${ext}`))) {
          return true
        }
      }

      return false
    })

    const images = filteredFiles.map((file, index) => {
      // Extract category from folder path (e.g., /Personal/about -> about)
      const pathParts = file.filePath.split('/').filter(Boolean)
      const category = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'uncategorized'

      // Use filename as title (remove extension and format)
      const title = file.name
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
        .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize first letter of each word

      // Extract description from customMetadata if available, otherwise use default
      const customMetadata = file.customMetadata || {}

      const description =
        (customMetadata.description as string) ||
        (customMetadata.Description as string) ||
        (customMetadata.desc as string) ||
        (customMetadata.DESCRIPTION as string) ||
        (fileType === 'video' ? `Video from ${category}` : `Photo from ${category}`)

      if (fileType === 'video') {
        // For videos, generate thumbnail from video (ImageKit can extract video frames)
        // Use video thumbnail transformation or fallback to a placeholder
        const thumbnailUrl = `${file.url}?tr=w-400,h-225,c-at_max,q-auto,f-auto,so-0` // 16:9 aspect ratio for videos

        // Use fileId if available, otherwise generate stable ID from filePath or URL
        // filePath/URL are unique and stable across API calls, unlike array index
        // This ensures consistent IDs for likes, comments, and navigation
        const stableId =
          file.fileId ||
          (file.filePath
            ? `vid-${file.filePath.replace(/[^a-zA-Z0-9]/g, '-')}`
            : file.url
              ? `vid-${Buffer.from(file.url)
                  .toString('base64')
                  .slice(0, 16)
                  .replace(/[^a-zA-Z0-9]/g, '')}`
              : `vid-fallback-${index}`)

        return {
          id: stableId,
          title,
          description,
          videoUrl: file.url,
          thumbnail: thumbnailUrl,
          category: category.toLowerCase(),
          date: file.updatedAt || file.createdAt,
          duration:
            (customMetadata.duration as string) || (customMetadata.Duration as string) || '0:00',
          type: 'video',
          filePath: file.filePath,
          width: file.width,
          height: file.height,
          size: file.size,
          tags: file.tags || [],
          // Full metadata
          metadata: {
            fileId: file.fileId,
            name: file.name,
            url: file.url,
            filePath: file.filePath,
            fileType: file.fileType,
            width: file.width,
            height: file.height,
            size: file.size,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            tags: file.tags || [],
            customMetadata: customMetadata,
            customCoordinates: file.customCoordinates,
            isPrivateFile: file.isPrivateFile,
          },
        }
      } else {
        // For images, generate optimized thumbnail URL
        // Base thumbnail will be used and transformed on the client side for responsive loading
        // This allows Nuxt Image to handle responsive transformations more efficiently
        const thumbnailUrl = `${file.url}?tr=w-500,h-500,c-at_max,q-80,f-webp` // Base thumbnail, client will request appropriate size

        // Use fileId if available, otherwise generate stable ID from filePath or URL
        // filePath/URL are unique and stable across API calls, unlike array index
        // This ensures consistent IDs for likes, comments, and navigation
        const stableId =
          file.fileId ||
          (file.filePath
            ? `img-${file.filePath.replace(/[^a-zA-Z0-9]/g, '-')}`
            : file.url
              ? `img-${Buffer.from(file.url)
                  .toString('base64')
                  .slice(0, 16)
                  .replace(/[^a-zA-Z0-9]/g, '')}`
              : `img-fallback-${index}`)

        return {
          id: stableId,
          title,
          description,
          image: file.url,
          thumbnail: thumbnailUrl,
          category: category.toLowerCase(),
          date: file.updatedAt || file.createdAt,
          type: 'image',
          filePath: file.filePath,
          width: file.width,
          height: file.height,
          size: file.size,
          tags: file.tags || [],
          // Full metadata
          metadata: {
            fileId: file.fileId,
            name: file.name,
            url: file.url,
            filePath: file.filePath,
            fileType: file.fileType,
            width: file.width,
            height: file.height,
            size: file.size,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            tags: file.tags || [],
            customMetadata: customMetadata,
            customCoordinates: file.customCoordinates,
            isPrivateFile: file.isPrivateFile,
          },
        }
      }
    })

    // Set cache headers for better performance while ensuring content freshness
    // Reduced from 1 hour to 5 minutes to ensure new gallery content appears within reasonable time
    // 5 minutes (300 seconds) still provides significant performance benefits while maintaining acceptable freshness
    if (noCache) {
      // Bypass cache when explicitly requested (for manual refresh scenarios)
      setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
      setHeader(event, 'CDN-Cache-Control', 'no-cache')
    } else {
      setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=300') // Cache for 5 minutes
      setHeader(event, 'CDN-Cache-Control', 'public, max-age=300')
    }

    return {
      success: true,
      images, // For backward compatibility, but can contain videos too
      videos: fileType === 'video' ? images : [],
      items: images, // Generic name that works for both
      total: images.length,
      folderPath,
      fileType,
    }
  } catch (error) {
    console.error('[ImageKit API] Failed to fetch images:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch images from ImageKit',
      images: [],
    }
  }
})
