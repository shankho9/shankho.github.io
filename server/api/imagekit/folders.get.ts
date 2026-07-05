import { createError, defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getCurrentUser } from '~/server/utils/auth'

interface ImageKitFile {
  fileId: string
  name: string
  url: string
  filePath: string
  fileType: string
}

interface ImageKitResponse {
  files: ImageKitFile[]
}

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const config = useRuntimeConfig()
  const query = getQuery(event)

  // Get ImageKit credentials from runtime config
  const imageKitPrivateKey = config.imageKitPrivateKey

  const _imageKitUrlEndpoint = config.imageKitUrlEndpoint

  // Validate configuration
  if (!imageKitPrivateKey) {
    return {
      success: false,
      error:
        'ImageKit configuration is missing. Please set IMAGEKIT_PRIVATE_KEY environment variable.',
      folders: [],
    }
  }

  // Validate Private Key format
  if (!imageKitPrivateKey.startsWith('private_')) {
    return {
      success: false,
      error:
        'Invalid ImageKit Private Key format. The Private API Key should start with "private_".',
      folders: [],
    }
  }

  // Get root folder path from query (default to root)
  const rootFolder = (query.rootFolder as string) || '/'
  const fileType = (query.fileType as string) || 'all' // 'image', 'video', or 'all'

  try {
    // ImageKit API endpoint for listing files
    const apiUrl = 'https://api.imagekit.io/v1/files'

    // Build query parameters - fetch all files to extract folder structure
    const params = new URLSearchParams()
    params.append('limit', '1000') // Get a large number to find all folders

    // Build Basic Auth header (ImageKit uses privateKey: as username, empty password)
    const authHeader = `Basic ${Buffer.from(`${imageKitPrivateKey}:`).toString('base64')}`

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
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

      if (response.status === 403) {
        errorMessage = 'Authentication failed. Please check your IMAGEKIT_PRIVATE_KEY.'
      } else if (response.status === 401) {
        errorMessage = 'Unauthorized. Please verify your ImageKit credentials are correct.'
      }

      throw new Error(errorMessage)
    }

    const data = (await response.json()) as ImageKitResponse | ImageKitFile[]

    // Handle different response structures
    let files: ImageKitFile[] = []

    if (Array.isArray(data)) {
      files = data
    } else if (data && typeof data === 'object' && 'files' in data) {
      files = (data as ImageKitResponse).files || []
    } else {
      console.error('[ImageKit API] Unexpected response structure:', JSON.stringify(data, null, 2))
      throw new Error('Unexpected response format from ImageKit API')
    }

    // Filter files by type if specified
    if (fileType !== 'all') {
      files = files.filter((file) => {
        const fileTypeLower = file.fileType.toLowerCase()
        const fileNameLower = file.name.toLowerCase()

        if (fileType === 'video') {
          const videoExtensions = ['mp4', 'mpeg', 'mov', 'avi', 'webm', 'ogg', 'mkv', 'flv', 'wmv']
          return videoExtensions.some(
            (ext) =>
              fileTypeLower === ext ||
              fileTypeLower.includes(ext) ||
              fileNameLower.endsWith(`.${ext}`),
          )
        } else if (fileType === 'image') {
          const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
          return imageExtensions.some(
            (ext) =>
              fileTypeLower === ext ||
              fileTypeLower.includes(ext) ||
              fileNameLower.endsWith(`.${ext}`),
          )
        }
        return true
      })
    }

    // Extract unique folder paths from file paths
    const folderSet = new Set<string>()

    files.forEach((file) => {
      const path = file.filePath
      if (!path) return

      // Remove leading slash if present
      const cleanPath = path.startsWith('/') ? path.slice(1) : path

      // Split path into parts
      const parts = cleanPath.split('/').filter(Boolean)

      // Build folder paths incrementally
      // e.g., "Library/Family/photo.jpg" -> ["Library", "Library/Family"]
      for (let i = 1; i < parts.length; i++) {
        const folderPath = parts.slice(0, i).join('/')
        folderSet.add(folderPath)
      }
    })

    // Convert to array and sort
    const folders = Array.from(folderSet).sort()

    // Filter by root folder if specified
    let filteredFolders = folders
    if (rootFolder && rootFolder !== '/') {
      const rootPath = rootFolder.startsWith('/') ? rootFolder.slice(1) : rootFolder
      filteredFolders = folders.filter((folder) => folder.startsWith(rootPath))
    }

    return {
      success: true,
      folders: filteredFolders,
      rootFolder,
      fileType,
    }
  } catch (error) {
    console.error('[ImageKit API] Failed to fetch folders:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch folders from ImageKit',
      folders: [],
    }
  }
})
