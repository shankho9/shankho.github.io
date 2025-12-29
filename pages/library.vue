<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useGoogleAuth } from '~/composables/useGoogleAuth'
import { resourcesPage, seoData } from '~/data'
import GalleryLightbox from '~/components/gallery/Lightbox.vue'
import GoogleMap from '~/components/blog/GoogleMap.vue'
import ResourcesTabs from '~/components/notion/ResourcesTabs.vue'

// Get configurable root folders from runtime config
const config = useRuntimeConfig()
const photosRootFolder = config.public.imageKitPhotosRootFolder || 'Library/Photos'
const videosRootFolder = config.public.imageKitVideosRootFolder || 'Library/Videos'

// Tab types
type TabType = 'photos' | 'videos' | 'musical-notes' | 'travel-map' | 'resources'

// Authentication
const { user, isAuthenticated, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()

// Active tab state - default to resources (requires auth)
const activeTab = ref<TabType>('resources')

// Gallery state (for Photos tab)
const viewMode = ref<'grid' | 'masonry'>('grid')
const searchQuery = ref<string>('') // Search query for filtering by tags and metadata
const selectedFolder = ref<string>(photosRootFolder) // ImageKit root folder path (configurable)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectedItem = ref<{ id: string | number; metadata?: any } | null>(null) // Selected item for metadata panel
const isMetadataPanelOpen = ref<boolean>(false) // Metadata panel state
const imageKitFolders = ref<string[]>([]) // Available subfolders (dynamically loaded, excludes root)
const isLoadingFolders = ref(false)
const isLoadingImages = ref(false)
const imageKitError = ref<string | null>(null)

// Pagination for gallery
const itemsPerPage = ref<number>(24) // Show 24 items per page (responsive: 2x2 on mobile, 3x4 on tablet, 4x6 on desktop)
const currentPage = ref<number>(1)

// Video folder selection and loading
const selectedVideoFolder = ref<string>(videosRootFolder) // ImageKit root folder path for videos (configurable)
const videoSearchQuery = ref<string>('') // Search query for videos
const videoKitFolders = ref<string[]>([]) // Available video subfolders (dynamically loaded, excludes root)
const isLoadingVideoFolders = ref(false)
const isLoadingVideos = ref(false)
const videoKitError = ref<string | null>(null)

// Pagination for videos
const videosPerPage = ref<number>(12) // Show 12 videos per page
const currentVideoPage = ref<number>(1)

// Travel Map state
const travelPlaces = ref<
  Array<{
    name: string
    lat: number
    lng: number
    description?: string
    type?: 'home' | 'trip'
    year?: number
  }>
>([])
const mapLoading = ref(false)
const mapError = ref<string | null>(null)

// Lightbox state
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const openLightbox = (index: number) => {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

// Gallery items with like and comment counts (loaded from ImageKit)
const galleryItems = ref<
  Array<{
    id: string | number
    title: string
    description: string
    image: string
    thumbnail?: string
    category: string
    date: string
    type: string
    likeCount?: number
    commentCount?: number
    filePath?: string
    width?: number
    height?: number
    size?: number
    tags?: string[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any
  }>
>([])

// Load folders from ImageKit
const loadImageKitFolders = async (
  rootFolder: string = photosRootFolder,
  fileType: string = 'image',
) => {
  isLoadingFolders.value = true

  try {
    const response = await $fetch<{
      success: boolean
      folders: string[]
      error?: string
    }>(`/api/imagekit/folders?rootFolder=${encodeURIComponent(rootFolder)}&fileType=${fileType}`)

    if (response.success && response.folders) {
      // Filter out the root folder itself, keep only subfolders
      // Normalize root folder (remove leading slash if present)
      const normalizedRoot = rootFolder.startsWith('/') ? rootFolder.slice(1) : rootFolder
      const subfolders = response.folders.filter((folder) => {
        const normalizedFolder = folder.startsWith('/') ? folder.slice(1) : folder
        // Exclude root folder itself, include all subfolders
        return (
          normalizedFolder !== normalizedRoot && normalizedFolder.startsWith(normalizedRoot + '/')
        )
      })
      imageKitFolders.value = subfolders
    } else {
      console.error('[Library] Failed to load folders:', response.error)
      // No subfolders found
      imageKitFolders.value = []
    }
  } catch (error) {
    console.error('[Library] Failed to load folders from ImageKit:', error)
    // No subfolders on error
    imageKitFolders.value = []
  } finally {
    isLoadingFolders.value = false
  }
}

// Load video folders from ImageKit
const loadVideoKitFolders = async (
  rootFolder: string = videosRootFolder,
  fileType: string = 'video',
) => {
  isLoadingVideoFolders.value = true

  try {
    const response = await $fetch<{
      success: boolean
      folders: string[]
      error?: string
    }>(`/api/imagekit/folders?rootFolder=${encodeURIComponent(rootFolder)}&fileType=${fileType}`)

    if (response.success && response.folders) {
      // Filter out the root folder itself, keep only subfolders
      // Normalize root folder (remove leading slash if present)
      const normalizedRoot = rootFolder.startsWith('/') ? rootFolder.slice(1) : rootFolder
      const subfolders = response.folders.filter((folder) => {
        const normalizedFolder = folder.startsWith('/') ? folder.slice(1) : folder
        // Exclude root folder itself, include all subfolders
        return (
          normalizedFolder !== normalizedRoot && normalizedFolder.startsWith(normalizedRoot + '/')
        )
      })
      videoKitFolders.value = subfolders
    } else {
      console.error('[Library] Failed to load video folders:', response.error)
      // No subfolders found
      videoKitFolders.value = []
    }
  } catch (error) {
    console.error('[Library] Failed to load video folders from ImageKit:', error)
    // No subfolders on error
    videoKitFolders.value = []
  } finally {
    isLoadingVideoFolders.value = false
  }
}

// Load images from ImageKit
const loadImagesFromImageKit = async (folderPath: string = '/') => {
  isLoadingImages.value = true
  imageKitError.value = null

  try {
    // Check if "All" is selected (folderPath matches root folder)
    const isAllSelected = folderPath === photosRootFolder
    const apiUrl = isAllSelected
      ? `/api/imagekit/list?includeAllSubfolders=true&rootFolderForAll=${encodeURIComponent(photosRootFolder)}&fileType=image&_t=${Date.now()}`
      : `/api/imagekit/list?folderPath=${encodeURIComponent(folderPath)}&fileType=image&_t=${Date.now()}`

    const response = await $fetch<{
      success: boolean
      images: Array<{
        id: string
        title: string
        description: string
        image: string
        thumbnail?: string
        category: string
        date: string
        type: string
        filePath?: string
        width?: number
        height?: number
        size?: number
        tags?: string[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata?: any
      }>
      error?: string
    }>(apiUrl)

    if (response.success && response.images) {
      // Map ImageKit images to gallery items format
      // Use stable ID from API (fileId, filePath, or URL-based hash)
      // Never use array index as it's unstable across pagination/reloads
      galleryItems.value = response.images.map((img) => ({
        id:
          img.id ||
          img.filePath ||
          img.image ||
          `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: img.title,
        description: img.description,
        image: img.image,
        thumbnail: img.thumbnail || img.image,
        category: img.category,
        date: img.date,
        type: img.type,
        likeCount: 0, // Will be loaded separately
        commentCount: 0, // Will be loaded separately
        filePath: img.filePath,
        width: img.width,
        height: img.height,
        size: img.size,
        tags: img.tags,
        metadata: img.metadata,
      }))

      // Load stats for all items
      if (isAuthenticated.value) {
        await loadGalleryStats()
      }
    } else {
      imageKitError.value = response.error || 'Failed to load images from ImageKit'
      console.error('[Library] ImageKit error:', response.error)
      console.error('[Library] Full response:', response)
    }
  } catch (error) {
    console.error('[Library] Failed to load images from ImageKit:', error)
    imageKitError.value = error instanceof Error ? error.message : 'Failed to load images'
  } finally {
    isLoadingImages.value = false
  }
}

// Load like and comment counts for gallery items
const loadGalleryStats = async () => {
  for (const item of galleryItems.value) {
    try {
      // Load likes
      const likesResponse = await $fetch<{ success: boolean; count: number }>(
        `/api/gallery/likes?itemId=${item.id}`,
      )
      if (likesResponse.success) {
        item.likeCount = likesResponse.count
      }

      // Load comment count
      const commentsResponse = await $fetch<{
        comments: unknown[]
        pagination: { total: number }
      }>(`/api/gallery/comments?itemId=${item.id}&page=1&limit=1`)
      if (commentsResponse.pagination) {
        item.commentCount = commentsResponse.pagination.total
      }
    } catch (error) {
      console.error(`[Library] Failed to load stats for gallery item ${item.id}:`, error)
    }
  }
}

// Refresh stats for a specific gallery item
const refreshGalleryItemStats = async (itemId: string | number) => {
  // Convert both sides to string for consistent comparison (handles number vs string mismatch)
  const item = galleryItems.value.find((i) => String(i.id) === String(itemId))
  if (!item) return

  try {
    // Load likes
    const likesResponse = await $fetch<{ success: boolean; count: number }>(
      `/api/gallery/likes?itemId=${itemId}`,
    )
    if (likesResponse.success) {
      item.likeCount = likesResponse.count
    }

    // Load comment count
    const commentsResponse = await $fetch<{
      comments: unknown[]
      pagination: { total: number }
    }>(`/api/gallery/comments?itemId=${itemId}&page=1&limit=1`)
    if (commentsResponse.pagination) {
      item.commentCount = commentsResponse.pagination.total
    }
  } catch (error) {
    console.error(`[Library] Failed to refresh stats for gallery item ${itemId}:`, error)
  }
}

// Handle like changed event from lightbox
const handleLikeChanged = async (itemId: string | number) => {
  // Refresh stats from API to ensure accuracy
  await refreshGalleryItemStats(itemId)
}

// Handle comment added event from lightbox
const handleCommentAdded = async (itemId: string | number) => {
  // Refresh stats from API to ensure accuracy
  await refreshGalleryItemStats(itemId)
}

// Watch for folder changes to reload images
// Store the pending folder change so we can load it when switching to photos tab
const pendingFolderChange = ref<string | null>(null)

watch(selectedFolder, (newFolder) => {
  if (activeTab.value === 'photos' && isAuthenticated.value) {
    // If on photos tab, load immediately
    loadImagesFromImageKit(newFolder)
    pendingFolderChange.value = null
  } else {
    // If on another tab, store the folder change to load when switching back
    pendingFolderChange.value = newFolder
  }
})

// Watch for photos tab activation to load folders and images
watch(activeTab, (newTab) => {
  if (newTab === 'photos' && isAuthenticated.value) {
    if (imageKitFolders.value.length === 0) {
      loadImageKitFolders(photosRootFolder, 'image')
    }
    // Always reload if there's a pending folder change, or if no items are loaded
    if (pendingFolderChange.value !== null) {
      loadImagesFromImageKit(pendingFolderChange.value)
      pendingFolderChange.value = null
    } else if (galleryItems.value.length === 0) {
      loadImagesFromImageKit(selectedFolder.value)
    }
  } else if (newTab === 'videos' && isAuthenticated.value) {
    if (videoKitFolders.value.length === 0) {
      loadVideoKitFolders(videosRootFolder, 'video')
    }
    if (videoItems.value.length === 0) {
      loadVideosFromImageKit(selectedVideoFolder.value)
    }
  }
})

// Watch for video folder changes to reload videos
watch(selectedVideoFolder, (newFolder) => {
  if (activeTab.value === 'videos' && isAuthenticated.value) {
    loadVideosFromImageKit(newFolder)
  }
})

// Video items with like and comment counts (loaded from ImageKit)
const videoItems = ref<
  Array<{
    id: string | number
    title: string
    description: string
    thumbnail: string
    videoUrl: string
    category: string
    date: string
    duration: string
    likeCount?: number
    commentCount?: number
    filePath?: string
    width?: number
    height?: number
    size?: number
    tags?: string[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any
  }>
>([])

// Load videos from ImageKit
const loadVideosFromImageKit = async (folderPath: string = '/') => {
  isLoadingVideos.value = true
  videoKitError.value = null

  try {
    // Check if "All" is selected (folderPath matches root folder)
    const isAllSelected = folderPath === videosRootFolder
    const apiUrl = isAllSelected
      ? `/api/imagekit/list?includeAllSubfolders=true&rootFolderForAll=${encodeURIComponent(videosRootFolder)}&fileType=video&_t=${Date.now()}`
      : `/api/imagekit/list?folderPath=${encodeURIComponent(folderPath)}&fileType=video&_t=${Date.now()}`

    const response = await $fetch<{
      success: boolean
      items: Array<{
        id: string
        title: string
        description: string
        thumbnail: string
        videoUrl: string
        category: string
        date: string
        duration: string
        filePath?: string
        width?: number
        height?: number
        size?: number
        tags?: string[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata?: any
      }>
      error?: string
    }>(apiUrl)

    if (response.success && response.items) {
      // Map ImageKit videos to video items format
      // Use stable ID from API (fileId, filePath, or URL-based hash)
      // Never use array index as it's unstable across pagination/reloads
      videoItems.value = response.items.map((vid) => ({
        id:
          vid.id ||
          vid.filePath ||
          vid.videoUrl ||
          `vid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: vid.title,
        description: vid.description,
        thumbnail: vid.thumbnail || '',
        videoUrl: vid.videoUrl,
        category: vid.category,
        date: vid.date,
        duration: vid.duration || '0:00',
        likeCount: 0, // Will be loaded separately
        commentCount: 0, // Will be loaded separately
        filePath: vid.filePath,
        width: vid.width,
        height: vid.height,
        size: vid.size,
        tags: vid.tags,
        metadata: vid.metadata,
      }))

      // Load stats for all videos
      if (isAuthenticated.value) {
        await loadVideoStats()
      }
    } else {
      videoKitError.value = response.error || 'Failed to load videos from ImageKit'
      console.error('[Library] ImageKit video error:', response.error)
      console.error('[Library] Full response:', response)
    }
  } catch (error) {
    console.error('[Library] Failed to load videos from ImageKit:', error)
    videoKitError.value = error instanceof Error ? error.message : 'Failed to load videos'
  } finally {
    isLoadingVideos.value = false
  }
}

// Load like and comment counts for video items
const loadVideoStats = async () => {
  for (const video of videoItems.value) {
    try {
      // Load likes
      const likesResponse = await $fetch<{ success: boolean; count: number }>(
        `/api/gallery/likes?itemId=${String(video.id)}`,
      )
      if (likesResponse.success) {
        video.likeCount = likesResponse.count
      }

      // Load comment count
      const commentsResponse = await $fetch<{
        comments: unknown[]
        pagination: { total: number }
      }>(`/api/gallery/comments?itemId=${String(video.id)}&page=1&limit=1`)
      if (commentsResponse.pagination) {
        video.commentCount = commentsResponse.pagination.total
      }
    } catch (error) {
      console.error(`[Library] Failed to load stats for video ${video.id}:`, error)
    }
  }
}

// Tab configuration
const tabs = [
  {
    id: 'photos' as TabType,
    label: 'Photos',
    icon: 'mdi:image-multiple',
    count: galleryItems.value.length,
    requiresAuth: true,
  },
  {
    id: 'videos' as TabType,
    label: 'Videos',
    icon: 'mdi:video',
    count: videoItems.value.length,
    requiresAuth: true,
  },
  {
    id: 'musical-notes' as TabType,
    label: 'Musical Notes',
    icon: 'mdi:music-note',
    count: 0,
    requiresAuth: true,
  },
  {
    id: 'travel-map' as TabType,
    label: 'Travel Map',
    icon: 'mdi:map',
    count: 0,
    requiresAuth: true,
  },
  {
    id: 'resources' as TabType,
    label: 'Resources',
    icon: 'mdi:book-open-variant',
    count:
      resourcesPage.books.length +
      resourcesPage.tools.length +
      resourcesPage.learningResources.length,
    requiresAuth: true,
  },
]

// Search-based filtering for photos
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return galleryItems.value
  }

  const query = searchQuery.value.toLowerCase().trim()

  return galleryItems.value.filter((item) => {
    // Search in title
    if (item.title.toLowerCase().includes(query)) return true

    // Search in description
    if (item.description.toLowerCase().includes(query)) return true

    // Search in tags
    if (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(query))) return true

    // Search in metadata (customMetadata)
    if (item.metadata?.customMetadata) {
      const customMeta = item.metadata.customMetadata
      // Search in all metadata values
      const metaValues = Object.values(customMeta).map((v) => String(v).toLowerCase())
      if (metaValues.some((v) => v.includes(query))) return true

      // Search in metadata keys
      const metaKeys = Object.keys(customMeta).map((k) => k.toLowerCase())
      if (metaKeys.some((k) => k.includes(query))) return true
    }

    // Search in file path
    if (item.filePath && item.filePath.toLowerCase().includes(query)) return true

    return false
  })
})

const sortedItems = computed(() => {
  return [...filteredItems.value].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})

// Paginated items for better performance with large galleries
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return sortedItems.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(sortedItems.value.length / itemsPerPage.value)
})

// Function to open metadata panel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const openMetadataPanel = (item: any) => {
  selectedItem.value = item
  isMetadataPanelOpen.value = true
}

// Function to close metadata panel
const closeMetadataPanel = () => {
  isMetadataPanelOpen.value = false
  selectedItem.value = null
}

// Computed properties for folder display (with "All" option)
const displayImageFolders = computed(() => {
  const folders: Array<{ label: string; value: string }> = [
    { label: 'All', value: photosRootFolder },
  ]

  // Add subfolders with just their name (remove root folder prefix)
  imageKitFolders.value.forEach((folder) => {
    // Normalize both root and folder for comparison
    const normalizedRoot = photosRootFolder.startsWith('/')
      ? photosRootFolder.slice(1)
      : photosRootFolder
    const normalizedFolder = folder.startsWith('/') ? folder.slice(1) : folder

    let subfolderName: string
    if (normalizedFolder.startsWith(normalizedRoot + '/')) {
      // Extract subfolder name after root
      subfolderName = normalizedFolder.slice(normalizedRoot.length + 1)
    } else {
      // Fallback: use folder as-is
      subfolderName = normalizedFolder
    }

    folders.push({ label: subfolderName, value: folder })
  })

  return folders
})

const displayVideoFolders = computed(() => {
  const folders: Array<{ label: string; value: string }> = [
    { label: 'All', value: videosRootFolder },
  ]

  // Add subfolders with just their name (remove root folder prefix)
  videoKitFolders.value.forEach((folder) => {
    // Normalize both root and folder for comparison
    const normalizedRoot = videosRootFolder.startsWith('/')
      ? videosRootFolder.slice(1)
      : videosRootFolder
    const normalizedFolder = folder.startsWith('/') ? folder.slice(1) : folder

    let subfolderName: string
    if (normalizedFolder.startsWith(normalizedRoot + '/')) {
      // Extract subfolder name after root
      subfolderName = normalizedFolder.slice(normalizedRoot.length + 1)
    } else {
      // Fallback: use folder as-is
      subfolderName = normalizedFolder
    }

    folders.push({ label: subfolderName, value: folder })
  })

  return folders
})

// Reset to page 1 when search query or folder changes
watch([searchQuery, selectedFolder], () => {
  currentPage.value = 1
})

// Filtered videos based on search
const filteredVideos = computed(() => {
  if (!videoSearchQuery.value.trim()) {
    return videoItems.value
  }

  const query = videoSearchQuery.value.toLowerCase().trim()

  return videoItems.value.filter((video) => {
    // Search in title
    if (video.title.toLowerCase().includes(query)) return true

    // Search in description
    if (video.description.toLowerCase().includes(query)) return true

    // Search in tags
    if (video.tags && video.tags.some((tag) => tag.toLowerCase().includes(query))) return true

    // Search in metadata (customMetadata)
    if (video.metadata?.customMetadata) {
      const customMeta = video.metadata.customMetadata
      // Search in all metadata values
      const metaValues = Object.values(customMeta).map((v) => String(v).toLowerCase())
      if (metaValues.some((v) => v.includes(query))) return true

      // Search in metadata keys
      const metaKeys = Object.keys(customMeta).map((k) => k.toLowerCase())
      if (metaKeys.some((k) => k.includes(query))) return true
    }

    // Search in file path
    if (video.filePath && video.filePath.toLowerCase().includes(query)) return true

    return false
  })
})

// Paginated videos based on filtered results
const paginatedVideos = computed(() => {
  const start = (currentVideoPage.value - 1) * videosPerPage.value
  const end = start + videosPerPage.value
  return filteredVideos.value.slice(start, end)
})

const totalVideoPages = computed(() => {
  return Math.ceil(filteredVideos.value.length / videosPerPage.value)
})

// Reset to page 1 when video search query or folder changes
watch([videoSearchQuery, selectedVideoFolder], () => {
  currentVideoPage.value = 1
})

// Load travel places
const loadTravelPlaces = async () => {
  mapLoading.value = true
  mapError.value = null
  try {
    const response = await $fetch<
      Array<{
        name: string
        lat: number
        lng: number
        description?: string
        type?: 'home' | 'trip'
        year?: number
      }>
    >('/api/travel/places')
    travelPlaces.value = response || []
  } catch (err: unknown) {
    console.error('[Library] Failed to load travel places:', err)
    mapError.value = 'Failed to load travel places. Please try again later.'
  } finally {
    mapLoading.value = false
  }
}

// Watch for travel-map tab activation to load places
watch(activeTab, (newTab) => {
  if (newTab === 'travel-map' && travelPlaces.value.length === 0 && !mapLoading.value) {
    loadTravelPlaces()
  }
})

// Track if we've loaded stats for the current user to prevent duplicate calls
const lastLoadedUserEmail = ref<string | null>(null)

// Initialize auth on mount - load user first to ensure authentication state is available
onMounted(async () => {
  // Load stored user first to ensure authentication state is available
  loadStoredUser()
  initializeGoogleSignIn()

  // Track page visit
  fetch('/api/analytics/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 'library' }),
  }).catch(() => {
    // Silent fail
  })

  // loadStoredUser() is synchronous - it directly sets user.value from localStorage
  // Check user.value immediately after calling it (no need to wait for nextTick)
  // The watch on isAuthenticated provides fallback handling for async auth changes
  if (user.value) {
    // Load folders first
    if (activeTab.value === 'photos') {
      loadImageKitFolders(photosRootFolder, 'image')
      loadImagesFromImageKit(selectedFolder.value)
    }
    // Load video folders and videos
    if (activeTab.value === 'videos') {
      loadVideoKitFolders(videosRootFolder, 'video')
      loadVideosFromImageKit(selectedVideoFolder.value)
    }
    lastLoadedUserEmail.value = user.value.email
  }
})

// Watch for authentication to load stats
// Only load if this is a new user (different email) to prevent duplicate calls
watch(isAuthenticated, (newValue) => {
  if (newValue && user.value && user.value.email !== lastLoadedUserEmail.value) {
    // Load folders and content when authenticated
    if (activeTab.value === 'photos') {
      loadImageKitFolders(photosRootFolder, 'image')
      loadImagesFromImageKit(selectedFolder.value)
    }
    if (activeTab.value === 'videos') {
      loadVideoKitFolders(videosRootFolder, 'video')
      loadVideosFromImageKit(selectedVideoFolder.value)
    }
    lastLoadedUserEmail.value = user.value.email
  } else if (!newValue) {
    // Reset when user signs out
    lastLoadedUserEmail.value = null
    galleryItems.value = [] // Clear images when signed out
    videoItems.value = [] // Clear videos when signed out
    imageKitFolders.value = [] // Clear folders
    videoKitFolders.value = [] // Clear video folders
  }
})

// Render Google Sign-In button
const renderGoogleSignInButton = () => {
  nextTick(() => {
    const buttonElement = document.getElementById('google-signin-button')
    if (!buttonElement || !window.google) return

    const clientId = useRuntimeConfig().public.googleClientId
    if (!clientId) {
      console.error('[Library] Google Client ID not configured')
      return
    }

    buttonElement.innerHTML = ''

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const result = await $fetch<{
            user: { email: string; name: string; picture: string; sub: string }
          }>('/api/auth/google', {
            method: 'POST',
            body: { token: response.credential },
          })
          if (result && result.user) {
            user.value = result.user
            localStorage.setItem('google_user', JSON.stringify(result.user))

            if (typeof window !== 'undefined') {
              const { trackLogin } = await import('~/utils/analytics/trackLogin')
              await trackLogin(result.user.email, result.user.name, window.location.pathname)
              window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
            }
          }
        } catch (error) {
          console.error('[Library] Authentication failed:', error)
        }
      },
    })

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 250,
    })
  })
}

watch(isAuthenticated, (newValue) => {
  if (!newValue) {
    nextTick(() => {
      renderGoogleSignInButton()
    })
  }
})

// Check if current tab requires auth
const currentTabRequiresAuth = computed(() => {
  return tabs.find((tab) => tab.id === activeTab.value)?.requiresAuth ?? false
})

useHead({
  title: 'Library',
  meta: [
    {
      name: 'description',
      content: 'A curated collection of photos, videos, and resources',
    },
    { property: 'og:site_name', content: seoData.mySite },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/library` },
    { property: 'og:title', content: 'Library' },
    {
      property: 'og:description',
      content: 'A curated collection of photos, videos, and resources',
    },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/library` }],
})

defineOgImageComponent('About', {
  headline: 'Library 📚',
  title: 'Media Library',
  description: 'Photos, Videos & Resources',
  link: '/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg',
})
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800"
  >
    <div class="container mx-auto max-w-7xl px-6 py-10">
      <!-- Header -->
      <div class="text-center mb-10">
        <h1
          class="text-5xl font-extrabold mb-4 bg-gradient-to-r from-sky-700 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent"
        >
          Media Library
        </h1>
        <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Explore photos, videos, and curated resources
        </p>
      </div>

      <!-- Tab Navigation -->
      <div class="mb-8">
        <div
          class="flex flex-wrap justify-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-2 shadow-lg border border-gray-200 dark:border-slate-700"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              'relative flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ease-out',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-sky-700 to-blue-600 dark:from-sky-600 dark:to-blue-500 text-white shadow-md scale-105'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:scale-102',
            ]"
            @click="activeTab = tab.id"
          >
            <Icon :name="tab.icon" size="20" />
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.count > 0"
              :class="[
                'ml-1 px-2 py-0.5 rounded-full text-xs font-bold',
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300',
              ]"
            >
              {{ tab.count }}
            </span>
            <!-- Active indicator -->
            <div
              v-if="activeTab === tab.id"
              class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-white rounded-full"
            />
          </button>
        </div>
      </div>

      <!-- Authentication Required Message (for Photos/Videos) -->
      <div v-if="!isAuthenticated && currentTabRequiresAuth" class="max-w-2xl mx-auto mt-12">
        <div
          class="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700 shadow-lg"
        >
          <Icon name="mdi:lock" class="text-6xl text-sky-700 dark:text-sky-400 mb-4 mx-auto" />
          <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
            Authentication Required
          </h2>
          <p class="text-zinc-600 dark:text-zinc-400 mb-6">
            Please sign in with Google to access
            {{
              activeTab === 'photos'
                ? 'photos'
                : activeTab === 'videos'
                  ? 'videos'
                  : activeTab === 'resources'
                    ? 'resources'
                    : 'this content'
            }}.
          </p>
          <div id="google-signin-button" class="flex justify-center"></div>
        </div>
      </div>

      <!-- Tab Content -->
      <Transition
        mode="out-in"
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
      >
        <!-- Photos Tab -->
        <div
          v-if="activeTab === 'photos' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'photos'"
        >
          <!-- User Info & Controls -->
          <div
            v-if="isAuthenticated"
            class="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="user?.picture"
                :src="user.picture"
                :alt="user.name"
                class="w-10 h-10 rounded-full border-2 border-sky-700 dark:border-sky-400"
              />
              <div>
                <p class="text-sm text-zinc-600 dark:text-zinc-400">Signed in as</p>
                <p class="font-semibold text-zinc-800 dark:text-zinc-200">{{ user?.name }}</p>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <!-- View Mode Toggle -->
              <div class="flex gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-md">
                <button
                  :class="[
                    'px-3 py-1 rounded-md transition-colors text-sm',
                    viewMode === 'grid'
                      ? 'bg-sky-700 dark:bg-sky-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                  ]"
                  @click="viewMode = 'grid'"
                >
                  <Icon name="mdi:view-grid" size="20" />
                </button>
                <button
                  :class="[
                    'px-3 py-1 rounded-md transition-colors text-sm',
                    viewMode === 'masonry'
                      ? 'bg-sky-700 dark:bg-sky-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-slate-700',
                  ]"
                  @click="viewMode = 'masonry'"
                >
                  <Icon name="mdi:view-module" size="20" />
                </button>
              </div>
            </div>
          </div>

          <!-- Folder Selection (ImageKit) -->
          <div v-if="isAuthenticated" class="mb-6">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Select Folder
              </label>
              <div class="flex items-center gap-2">
                <!-- Refresh Folders Button -->
                <button
                  :disabled="isLoadingFolders"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh folder list"
                  @click="loadImageKitFolders(photosRootFolder, 'image')"
                >
                  <Icon
                    :name="isLoadingFolders ? 'svg-spinners:180-ring' : 'mdi:folder-refresh'"
                    :class="isLoadingFolders ? 'animate-spin' : ''"
                    size="16"
                  />
                </button>
                <!-- Refresh Images Button -->
                <button
                  :disabled="isLoadingImages"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="loadImagesFromImageKit(selectedFolder)"
                >
                  <Icon
                    :name="isLoadingImages ? 'svg-spinners:180-ring' : 'mdi:refresh'"
                    :class="isLoadingImages ? 'animate-spin' : ''"
                    size="18"
                  />
                  <span>{{ isLoadingImages ? 'Refreshing...' : 'Refresh' }}</span>
                </button>
              </div>
            </div>
            <div
              v-if="isLoadingFolders"
              class="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
            >
              <Icon name="svg-spinners:180-ring" class="animate-spin" size="16" />
              <span>Loading folders...</span>
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <button
                v-for="folder in displayImageFolders"
                :key="folder.value"
                :class="[
                  'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                  selectedFolder === folder.value
                    ? 'bg-gradient-to-r from-sky-700 to-blue-600 dark:from-sky-600 dark:to-blue-500 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm',
                ]"
                @click="selectedFolder = folder.value"
              >
                {{ folder.label }}
              </button>
              <p
                v-if="displayImageFolders.length === 1"
                class="text-sm text-zinc-500 dark:text-zinc-400"
              >
                No subfolders found. Upload files to subfolders in ImageKit to see them here.
              </p>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoadingImages" class="text-center py-12">
            <Icon
              name="svg-spinners:180-ring"
              class="text-4xl text-sky-700 dark:text-sky-400 mb-4"
            />
            <p class="text-zinc-600 dark:text-zinc-400">Loading images from ImageKit...</p>
          </div>

          <!-- Error State -->
          <div
            v-else-if="imageKitError"
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center"
          >
            <Icon name="mdi:alert-circle" class="text-4xl text-red-600 dark:text-red-400 mb-4" />
            <p class="text-red-600 dark:text-red-400 mb-2">{{ imageKitError }}</p>
            <p class="text-sm text-red-500 dark:text-red-400 mb-4">
              Please check your ImageKit configuration in environment variables.
            </p>
            <button
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold"
              @click="loadImagesFromImageKit(selectedFolder)"
            >
              <Icon name="mdi:refresh" class="inline mr-2" size="18" />
              Try Again
            </button>
          </div>

          <!-- Search Filter -->
          <div v-else-if="!isLoadingImages && !imageKitError" class="mb-6">
            <div class="relative">
              <Icon
                name="mdi:magnify"
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                size="20"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search by tags, description, title, or metadata..."
                class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <button
                v-if="searchQuery"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                @click="searchQuery = ''"
              >
                <Icon name="mdi:close-circle" size="20" />
              </button>
            </div>
            <p v-if="searchQuery" class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Found {{ filteredItems.length }}
              {{ filteredItems.length === 1 ? 'result' : 'results' }}
            </p>
          </div>

          <!-- Gallery Info and Pagination Controls (Top) -->
          <div
            v-if="!isLoadingImages && !imageKitError && sortedItems.length > 0"
            class="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div class="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }}-{{
                Math.min(currentPage * itemsPerPage, sortedItems.length)
              }}
              of {{ sortedItems.length }} {{ sortedItems.length === 1 ? 'image' : 'images' }}
            </div>
            <div v-if="totalPages > 1" class="flex items-center gap-2">
              <button
                :disabled="currentPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentPage = 1"
              >
                <Icon name="mdi:chevron-double-left" size="18" />
              </button>
              <button
                :disabled="currentPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentPage--"
              >
                <Icon name="mdi:chevron-left" size="18" />
              </button>
              <span class="px-4 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <button
                :disabled="currentPage === totalPages"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentPage++"
              >
                <Icon name="mdi:chevron-right" size="18" />
              </button>
              <button
                :disabled="currentPage === totalPages"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentPage = totalPages"
              >
                <Icon name="mdi:chevron-double-right" size="18" />
              </button>
            </div>
          </div>

          <!-- Gallery Grid -->
          <div
            v-if="viewMode === 'grid'"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div
              v-for="item in paginatedItems"
              :key="item.id"
              class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700"
            >
              <div
                class="relative aspect-square overflow-hidden cursor-pointer"
                @click="
                  () => {
                    const index = sortedItems.findIndex((i) => String(i.id) === String(item.id))
                    if (index >= 0) openLightbox(index)
                  }
                "
              >
                <NuxtImg
                  :src="item.thumbnail || item.image"
                  :alt="item.title"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  :quality="75"
                />
                <div
                  class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center"
                >
                  <div
                    class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center px-4"
                  >
                    <h3 class="text-xl font-bold mb-2">{{ item.title }}</h3>
                    <p class="text-sm">{{ item.description }}</p>
                    <p class="text-xs mt-2 flex items-center justify-center gap-1">
                      <Icon name="mdi:fullscreen" size="16" />
                      Click to view full-size
                    </p>
                  </div>
                </div>
              </div>
              <div class="p-4">
                <h3 class="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                  {{ item.description }}
                </p>
                <div class="flex justify-between items-center mb-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 capitalize"
                    >
                      {{ item.category }}
                    </span>
                    <button
                      v-if="item.metadata"
                      class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                      title="View metadata"
                      @click.stop="openMetadataPanel(item)"
                    >
                      <Icon name="mdi:information" size="14" />
                      Metadata
                    </button>
                  </div>
                  <span class="text-xs text-zinc-500 dark:text-zinc-500">
                    {{ new Date(item.date).toLocaleDateString() }}
                  </span>
                </div>
                <!-- Like and Comment Counts -->
                <div
                  class="flex items-center gap-4 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <span
                    v-if="item.likeCount !== undefined && item.likeCount > 0"
                    class="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <Icon name="mdi:heart" size="14" class="text-red-500" />
                    {{ item.likeCount }}
                  </span>
                  <span
                    v-if="item.commentCount !== undefined && item.commentCount > 0"
                    class="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <Icon name="mdi:comment-outline" size="14" class="text-sky-500" />
                    {{ item.commentCount }}
                  </span>
                  <span
                    v-if="
                      (item.likeCount === undefined || item.likeCount === 0) &&
                      (item.commentCount === undefined || item.commentCount === 0)
                    "
                    class="text-xs text-zinc-400 dark:text-zinc-500 italic"
                  >
                    No interactions yet
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Masonry Layout -->
          <div v-else class="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            <div
              v-for="item in paginatedItems"
              :key="item.id"
              class="break-inside-avoid group bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-slate-700 mb-6"
            >
              <div
                class="relative overflow-hidden cursor-pointer"
                @click="
                  () => {
                    const index = sortedItems.findIndex((i) => String(i.id) === String(item.id))
                    if (index >= 0) openLightbox(index)
                  }
                "
              >
                <NuxtImg
                  :src="item.thumbnail || item.image"
                  :alt="item.title"
                  class="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  :quality="75"
                />
                <div
                  class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center"
                >
                  <div
                    class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center px-4"
                  >
                    <h3 class="text-xl font-bold mb-2">{{ item.title }}</h3>
                    <p class="text-sm">{{ item.description }}</p>
                    <p class="text-xs mt-2 flex items-center justify-center gap-1">
                      <Icon name="mdi:fullscreen" size="16" />
                      Click to view full-size
                    </p>
                  </div>
                </div>
              </div>
              <div class="p-4">
                <h3 class="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                  {{ item.description }}
                </p>
                <div class="flex justify-between items-center mb-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 capitalize"
                    >
                      {{ item.category }}
                    </span>
                    <button
                      v-if="item.metadata"
                      class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                      title="View metadata"
                      @click.stop="openMetadataPanel(item)"
                    >
                      <Icon name="mdi:information" size="14" />
                      Metadata
                    </button>
                  </div>
                  <span class="text-xs text-zinc-500 dark:text-zinc-500">
                    {{ new Date(item.date).toLocaleDateString() }}
                  </span>
                </div>
                <!-- Like and Comment Counts -->
                <div
                  class="flex items-center gap-4 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <span
                    v-if="item.likeCount !== undefined && item.likeCount > 0"
                    class="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <Icon name="mdi:heart" size="14" class="text-red-500" />
                    {{ item.likeCount }}
                  </span>
                  <span
                    v-if="item.commentCount !== undefined && item.commentCount > 0"
                    class="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <Icon name="mdi:comment-outline" size="14" class="text-sky-500" />
                    {{ item.commentCount }}
                  </span>
                  <span
                    v-if="
                      (item.likeCount === undefined || item.likeCount === 0) &&
                      (item.commentCount === undefined || item.commentCount === 0)
                    "
                    class="text-xs text-zinc-400 dark:text-zinc-500 italic"
                  >
                    No interactions yet
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination Controls (Bottom) -->
          <div
            v-if="!isLoadingImages && !imageKitError && sortedItems.length > 0 && totalPages > 1"
            class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div class="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }}-{{
                Math.min(currentPage * itemsPerPage, sortedItems.length)
              }}
              of {{ sortedItems.length }} {{ sortedItems.length === 1 ? 'image' : 'images' }}
            </div>
            <div class="flex items-center gap-2">
              <button
                :disabled="currentPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentPage = 1"
              >
                <Icon name="mdi:chevron-double-left" size="18" />
              </button>
              <button
                :disabled="currentPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentPage--"
              >
                <Icon name="mdi:chevron-left" size="18" />
              </button>
              <span class="px-4 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <button
                :disabled="currentPage === totalPages"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentPage++"
              >
                <Icon name="mdi:chevron-right" size="18" />
              </button>
              <button
                :disabled="currentPage === totalPages"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentPage = totalPages"
              >
                <Icon name="mdi:chevron-double-right" size="18" />
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="sortedItems.length === 0 && !isLoadingImages && !imageKitError"
            class="text-center py-12"
          >
            <Icon name="mdi:image-off" class="text-6xl text-zinc-400 mb-4" />
            <p class="text-lg text-zinc-600 dark:text-zinc-400 mb-2">
              {{
                galleryItems.length === 0
                  ? `No images found in folder "${selectedFolder === '/' ? 'Root' : selectedFolder}"`
                  : searchQuery
                    ? `No images found matching "${searchQuery}"`
                    : 'No images available'
              }}
            </p>
            <p v-if="galleryItems.length === 0" class="text-sm text-zinc-500 dark:text-zinc-400">
              Upload images to this folder in ImageKit or select a different folder.
            </p>
            <p v-else-if="searchQuery" class="text-sm text-zinc-500 dark:text-zinc-400">
              Try adjusting your search terms or clearing the search.
            </p>
            <button
              v-if="galleryItems.length === 0"
              class="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors text-sm font-semibold"
              @click="loadImagesFromImageKit(selectedFolder)"
            >
              <Icon name="mdi:refresh" class="inline mr-2" size="18" />
              Refresh Images
            </button>
          </div>
        </div>

        <!-- Videos Tab -->
        <div
          v-else-if="activeTab === 'videos' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'videos'"
        >
          <div v-if="isAuthenticated" class="mb-6 flex items-center gap-3">
            <img
              v-if="user?.picture"
              :src="user.picture"
              :alt="user.name"
              class="w-10 h-10 rounded-full border-2 border-sky-700 dark:border-sky-400"
            />
            <div>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">Signed in as</p>
              <p class="font-semibold text-zinc-800 dark:text-zinc-200">{{ user?.name }}</p>
            </div>
          </div>

          <!-- Video Folder Selection (ImageKit) -->
          <div v-if="isAuthenticated" class="mb-6">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Select Video Folder
              </label>
              <div class="flex items-center gap-2">
                <!-- Refresh Folders Button -->
                <button
                  :disabled="isLoadingVideoFolders"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh folder list"
                  @click="loadVideoKitFolders(videosRootFolder, 'video')"
                >
                  <Icon
                    :name="isLoadingVideoFolders ? 'svg-spinners:180-ring' : 'mdi:folder-refresh'"
                    :class="isLoadingVideoFolders ? 'animate-spin' : ''"
                    size="16"
                  />
                </button>
                <!-- Refresh Videos Button -->
                <button
                  :disabled="isLoadingVideos"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="loadVideosFromImageKit(selectedVideoFolder)"
                >
                  <Icon
                    :name="isLoadingVideos ? 'svg-spinners:180-ring' : 'mdi:refresh'"
                    :class="isLoadingVideos ? 'animate-spin' : ''"
                    size="18"
                  />
                  <span>{{ isLoadingVideos ? 'Refreshing...' : 'Refresh' }}</span>
                </button>
              </div>
            </div>
            <div
              v-if="isLoadingVideoFolders"
              class="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
            >
              <Icon name="svg-spinners:180-ring" class="animate-spin" size="16" />
              <span>Loading folders...</span>
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <button
                v-for="folder in displayVideoFolders"
                :key="folder.value"
                :class="[
                  'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                  selectedVideoFolder === folder.value
                    ? 'bg-gradient-to-r from-sky-700 to-blue-600 dark:from-sky-600 dark:to-blue-500 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm',
                ]"
                @click="selectedVideoFolder = folder.value"
              >
                {{ folder.label }}
              </button>
              <p
                v-if="displayVideoFolders.length === 1"
                class="text-sm text-zinc-500 dark:text-zinc-400"
              >
                No subfolders found. Upload videos to subfolders in ImageKit to see them here.
              </p>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoadingVideos" class="text-center py-12">
            <Icon
              name="svg-spinners:180-ring"
              class="text-4xl text-sky-700 dark:text-sky-400 mb-4"
            />
            <p class="text-zinc-600 dark:text-zinc-400">Loading videos from ImageKit...</p>
          </div>

          <!-- Error State -->
          <div
            v-else-if="videoKitError"
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center"
          >
            <Icon name="mdi:alert-circle" class="text-4xl text-red-600 dark:text-red-400 mb-4" />
            <p class="text-red-600 dark:text-red-400 mb-2">{{ videoKitError }}</p>
            <p class="text-sm text-red-500 dark:text-red-400 mb-4">
              Please check your ImageKit configuration in environment variables.
            </p>
            <button
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold"
              @click="loadVideosFromImageKit(selectedVideoFolder)"
            >
              <Icon name="mdi:refresh" class="inline mr-2" size="18" />
              Try Again
            </button>
          </div>

          <!-- Video Search Filter -->
          <div v-else-if="!isLoadingVideos && !videoKitError" class="mb-6">
            <div class="relative">
              <Icon
                name="mdi:magnify"
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                size="20"
              />
              <input
                v-model="videoSearchQuery"
                type="text"
                placeholder="Search videos by tags, description, title, or metadata..."
                class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <button
                v-if="videoSearchQuery"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                @click="videoSearchQuery = ''"
              >
                <Icon name="mdi:close-circle" size="20" />
              </button>
            </div>
            <p v-if="videoSearchQuery" class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Found {{ filteredVideos.length }}
              {{ filteredVideos.length === 1 ? 'result' : 'results' }}
            </p>
          </div>

          <!-- Video Info and Pagination Controls (Top) -->
          <div
            v-if="!isLoadingVideos && !videoKitError && filteredVideos.length > 0"
            class="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div class="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {{ (currentVideoPage - 1) * videosPerPage + 1 }}-{{
                Math.min(currentVideoPage * videosPerPage, filteredVideos.length)
              }}
              of {{ filteredVideos.length }} {{ filteredVideos.length === 1 ? 'video' : 'videos' }}
            </div>
            <div v-if="totalVideoPages > 1" class="flex items-center gap-2">
              <button
                :disabled="currentVideoPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentVideoPage = 1"
              >
                <Icon name="mdi:chevron-double-left" size="18" />
              </button>
              <button
                :disabled="currentVideoPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentVideoPage--"
              >
                <Icon name="mdi:chevron-left" size="18" />
              </button>
              <span class="px-4 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Page {{ currentVideoPage }} of {{ totalVideoPages }}
              </span>
              <button
                :disabled="currentVideoPage === totalVideoPages"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentVideoPage++"
              >
                <Icon name="mdi:chevron-right" size="18" />
              </button>
              <button
                :disabled="currentVideoPage === totalVideoPages"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentVideoPage = totalVideoPages"
              >
                <Icon name="mdi:chevron-double-right" size="18" />
              </button>
            </div>
          </div>

          <div
            v-else-if="!isLoadingVideos && !videoKitError"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div
              v-for="video in paginatedVideos"
              :key="video.id"
              class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700"
            >
              <a
                :href="video.videoUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="relative aspect-video overflow-hidden cursor-pointer block"
              >
                <NuxtImg
                  :src="video.thumbnail"
                  :alt="video.title"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  :quality="75"
                />
                <div
                  class="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center"
                >
                  <Icon
                    name="mdi:play-circle"
                    class="text-6xl text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                  />
                  <span
                    class="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs font-semibold rounded"
                  >
                    {{ video.duration }}
                  </span>
                </div>
              </a>
              <div class="p-4">
                <h3 class="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  {{ video.title }}
                </h3>
                <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                  {{ video.description }}
                </p>
                <div class="flex justify-between items-center mb-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 capitalize"
                    >
                      {{ video.category }}
                    </span>
                    <button
                      v-if="video.metadata"
                      class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                      title="View metadata"
                      @click.stop="openMetadataPanel(video)"
                    >
                      <Icon name="mdi:information" size="14" />
                      Metadata
                    </button>
                  </div>
                  <span class="text-xs text-zinc-500 dark:text-zinc-500">
                    {{ new Date(video.date).toLocaleDateString() }}
                  </span>
                </div>
                <!-- Like and Comment Counts -->
                <div
                  class="flex items-center gap-4 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <span
                    v-if="video.likeCount !== undefined && video.likeCount > 0"
                    class="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <Icon name="mdi:heart" size="14" class="text-red-500" />
                    {{ video.likeCount }}
                  </span>
                  <span
                    v-if="video.commentCount !== undefined && video.commentCount > 0"
                    class="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <Icon name="mdi:comment-outline" size="14" class="text-sky-500" />
                    {{ video.commentCount }}
                  </span>
                  <span
                    v-if="
                      (video.likeCount === undefined || video.likeCount === 0) &&
                      (video.commentCount === undefined || video.commentCount === 0)
                    "
                    class="text-xs text-zinc-400 dark:text-zinc-500 italic"
                  >
                    No interactions yet
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination Controls (Bottom) -->
          <div
            v-if="
              !isLoadingVideos && !videoKitError && filteredVideos.length > 0 && totalVideoPages > 1
            "
            class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div class="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {{ (currentVideoPage - 1) * videosPerPage + 1 }}-{{
                Math.min(currentVideoPage * videosPerPage, filteredVideos.length)
              }}
              of {{ filteredVideos.length }} {{ filteredVideos.length === 1 ? 'video' : 'videos' }}
            </div>
            <div class="flex items-center gap-2">
              <button
                :disabled="currentVideoPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentVideoPage = 1"
              >
                <Icon name="mdi:chevron-double-left" size="18" />
              </button>
              <button
                :disabled="currentVideoPage === 1"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentVideoPage--"
              >
                <Icon name="mdi:chevron-left" size="18" />
              </button>
              <span class="px-4 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Page {{ currentVideoPage }} of {{ totalVideoPages }}
              </span>
              <button
                :disabled="currentVideoPage === totalVideoPages"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentVideoPage++"
              >
                <Icon name="mdi:chevron-right" size="18" />
              </button>
              <button
                :disabled="currentVideoPage === totalVideoPages"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                @click="currentVideoPage = totalVideoPages"
              >
                <Icon name="mdi:chevron-double-right" size="18" />
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="filteredVideos.length === 0 && !isLoadingVideos && !videoKitError"
            class="text-center py-12"
          >
            <Icon name="mdi:video-off" class="text-6xl text-zinc-400 mb-4" />
            <p class="text-lg text-zinc-600 dark:text-zinc-400 mb-2">
              {{
                videoItems.length === 0
                  ? `No videos found in folder "${selectedVideoFolder === '/' ? 'Root' : selectedVideoFolder}"`
                  : videoSearchQuery
                    ? `No videos found matching "${videoSearchQuery}"`
                    : 'No videos available'
              }}
            </p>
            <p v-if="videoItems.length === 0" class="text-sm text-zinc-500 dark:text-zinc-400">
              Upload videos to this folder in ImageKit or select a different folder.
            </p>
            <p v-else-if="videoSearchQuery" class="text-sm text-zinc-500 dark:text-zinc-400">
              Try adjusting your search terms or clearing the search.
            </p>
            <button
              v-if="videoItems.length === 0"
              class="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors text-sm font-semibold"
              @click="loadVideosFromImageKit(selectedVideoFolder)"
            >
              <Icon name="mdi:refresh" class="inline mr-2" size="18" />
              Refresh Videos
            </button>
          </div>
        </div>

        <!-- Resources Tab -->
        <div
          v-else-if="activeTab === 'resources' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'resources'"
        >
          <div v-if="isAuthenticated" class="mb-6 flex items-center gap-3">
            <img
              v-if="user?.picture"
              :src="user.picture"
              :alt="user.name"
              class="w-10 h-10 rounded-full border-2 border-sky-700 dark:border-sky-400"
            />
            <div>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">Signed in as</p>
              <p class="font-semibold text-zinc-800 dark:text-zinc-200">{{ user?.name }}</p>
            </div>
          </div>

          <!-- Notion Resources with Tabs and Search -->
          <ResourcesTabs />
        </div>

        <!-- Musical Notes Tab -->
        <div
          v-else-if="activeTab === 'musical-notes' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'musical-notes'"
        >
          <div v-if="isAuthenticated" class="mb-6 flex items-center gap-3">
            <img
              v-if="user?.picture"
              :src="user.picture"
              :alt="user.name"
              class="w-10 h-10 rounded-full border-2 border-sky-700 dark:border-sky-400"
            />
            <div>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">Signed in as</p>
              <p class="font-semibold text-zinc-800 dark:text-zinc-200">{{ user?.name }}</p>
            </div>
          </div>

          <div
            class="bg-white dark:bg-slate-800 rounded-xl p-12 border border-gray-200 dark:border-slate-700 text-center"
          >
            <Icon
              name="mdi:music-note-outline"
              class="text-6xl text-sky-700 dark:text-sky-400 mb-4"
            />
            <h2 class="text-3xl font-bold text-zinc-800 dark:text-zinc-200 mb-4">
              Musical Notes & Pages
            </h2>
            <p class="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Musical instrument notes and sheet music coming soon! This section will feature
              curated musical resources, sheet music, and learning materials.
            </p>
          </div>
        </div>

        <!-- Travel Map Tab -->
        <div
          v-else-if="activeTab === 'travel-map' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'travel-map'"
        >
          <div v-if="isAuthenticated" class="mb-6 flex items-center gap-3">
            <img
              v-if="user?.picture"
              :src="user.picture"
              :alt="user.name"
              class="w-10 h-10 rounded-full border-2 border-sky-700 dark:border-sky-400"
            />
            <div>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">Signed in as</p>
              <p class="font-semibold text-zinc-800 dark:text-zinc-200">{{ user?.name }}</p>
            </div>
          </div>

          <div
            class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700"
          >
            <h2 class="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-4 text-center">
              Places I've Visited
            </h2>

            <!-- Legend -->
            <div class="flex justify-center gap-6 mb-4 flex-wrap">
              <div class="flex items-center gap-2">
                <img
                  src="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                  alt="Home"
                  class="w-6 h-6"
                />
                <span class="text-sm text-zinc-600 dark:text-zinc-400">Home</span>
              </div>
              <div class="flex items-center gap-2">
                <img
                  src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                  alt="Trip"
                  class="w-6 h-6"
                />
                <span class="text-sm text-zinc-600 dark:text-zinc-400">Trip</span>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="mapLoading" class="text-center py-12">
              <Icon
                name="svg-spinners:180-ring"
                class="text-4xl text-sky-700 dark:text-sky-400 mb-4"
              />
              <p class="text-zinc-600 dark:text-zinc-400">Loading travel places...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="mapError" class="text-center py-12">
              <Icon name="mdi:alert-circle" class="text-4xl text-red-600 dark:text-red-400 mb-4" />
              <p class="text-red-600 dark:text-red-400">{{ mapError }}</p>
            </div>

            <!-- Map Component -->
            <div
              v-else-if="travelPlaces.length > 0"
              class="map-container rounded-lg overflow-hidden"
            >
              <GoogleMap :places="travelPlaces" />
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-12">
              <Icon name="mdi:map-off" class="text-6xl text-zinc-400 mb-4" />
              <p class="text-lg text-zinc-600 dark:text-zinc-400">No travel places available yet</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Lightbox Component -->
      <GalleryLightbox
        v-if="activeTab === 'photos'"
        :items="sortedItems"
        :current-index="lightboxIndex"
        :is-open="lightboxOpen"
        @close="lightboxOpen = false"
        @update:current-index="lightboxIndex = $event"
        @like-changed="handleLikeChanged"
        @comment-added="handleCommentAdded"
      />

      <!-- Metadata Panel (Right Side, Collapsible) -->
      <Transition name="slide">
        <div
          v-if="isMetadataPanelOpen && selectedItem"
          class="fixed right-0 top-0 h-full w-96 bg-white dark:bg-slate-800 shadow-2xl z-50 overflow-y-auto border-l border-gray-200 dark:border-slate-700"
        >
          <div
            class="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between"
          >
            <h2 class="text-xl font-bold text-zinc-800 dark:text-zinc-200">Metadata</h2>
            <button
              class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              @click="closeMetadataPanel"
            >
              <Icon name="mdi:close" size="24" />
            </button>
          </div>
          <div class="p-6">
            <div v-if="selectedItem.metadata" class="space-y-6">
              <!-- Basic Information -->
              <div>
                <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                  Basic Information
                </h3>
                <div class="space-y-2">
                  <div v-if="selectedItem.metadata?.fileId" class="flex justify-between">
                    <span class="text-sm text-zinc-600 dark:text-zinc-400">File ID:</span>
                    <span class="text-sm font-mono text-zinc-800 dark:text-zinc-200">{{
                      selectedItem.metadata.fileId
                    }}</span>
                  </div>
                  <div v-if="selectedItem.metadata?.name" class="flex justify-between">
                    <span class="text-sm text-zinc-600 dark:text-zinc-400">Name:</span>
                    <span class="text-sm text-zinc-800 dark:text-zinc-200">{{
                      selectedItem.metadata.name
                    }}</span>
                  </div>
                  <div v-if="selectedItem.metadata?.fileType" class="flex justify-between">
                    <span class="text-sm text-zinc-600 dark:text-zinc-400">Type:</span>
                    <span class="text-sm text-zinc-800 dark:text-zinc-200">{{
                      selectedItem.metadata.fileType
                    }}</span>
                  </div>
                  <div v-if="selectedItem.metadata?.filePath" class="flex justify-between">
                    <span class="text-sm text-zinc-600 dark:text-zinc-400">Path:</span>
                    <span class="text-sm font-mono text-zinc-800 dark:text-zinc-200 break-all">{{
                      selectedItem.metadata.filePath
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Dimensions & Size -->
              <div
                v-if="
                  selectedItem.metadata?.width ||
                  selectedItem.metadata?.height ||
                  selectedItem.metadata?.size
                "
              >
                <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                  Dimensions & Size
                </h3>
                <div class="space-y-2">
                  <div v-if="selectedItem.metadata?.width" class="flex justify-between">
                    <span class="text-sm text-zinc-600 dark:text-zinc-400">Width:</span>
                    <span class="text-sm text-zinc-800 dark:text-zinc-200"
                      >{{ selectedItem.metadata.width }}px</span
                    >
                  </div>
                  <div v-if="selectedItem.metadata?.height" class="flex justify-between">
                    <span class="text-sm text-zinc-600 dark:text-zinc-400">Height:</span>
                    <span class="text-sm text-zinc-800 dark:text-zinc-200"
                      >{{ selectedItem.metadata.height }}px</span
                    >
                  </div>
                  <div v-if="selectedItem.metadata?.size" class="flex justify-between">
                    <span class="text-sm text-zinc-600 dark:text-zinc-400">Size:</span>
                    <span class="text-sm text-zinc-800 dark:text-zinc-200"
                      >{{ (selectedItem.metadata.size / 1024 / 1024).toFixed(2) }} MB</span
                    >
                  </div>
                </div>
              </div>

              <!-- Dates -->
              <div v-if="selectedItem.metadata?.createdAt || selectedItem.metadata?.updatedAt">
                <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                  Dates
                </h3>
                <div class="space-y-2">
                  <div v-if="selectedItem.metadata?.createdAt" class="flex justify-between">
                    <span class="text-sm text-zinc-600 dark:text-zinc-400">Created:</span>
                    <span class="text-sm text-zinc-800 dark:text-zinc-200">{{
                      new Date(selectedItem.metadata.createdAt).toLocaleString()
                    }}</span>
                  </div>
                  <div v-if="selectedItem.metadata?.updatedAt" class="flex justify-between">
                    <span class="text-sm text-zinc-600 dark:text-zinc-400">Updated:</span>
                    <span class="text-sm text-zinc-800 dark:text-zinc-200">{{
                      new Date(selectedItem.metadata.updatedAt).toLocaleString()
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div v-if="selectedItem.metadata?.tags && selectedItem.metadata.tags.length > 0">
                <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                  Tags
                </h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in selectedItem.metadata.tags"
                    :key="tag"
                    class="px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <!-- Custom Metadata -->
              <div
                v-if="
                  selectedItem.metadata?.customMetadata &&
                  Object.keys(selectedItem.metadata.customMetadata).length > 0
                "
              >
                <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                  Custom Metadata
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="(value, key) in selectedItem.metadata.customMetadata"
                    :key="key"
                    class="flex justify-between"
                  >
                    <span class="text-sm text-zinc-600 dark:text-zinc-400 capitalize"
                      >{{ key }}:</span
                    >
                    <span class="text-sm text-zinc-800 dark:text-zinc-200 text-right break-all">{{
                      String(value)
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- URL -->
              <div v-if="selectedItem.metadata?.url">
                <h3 class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                  URL
                </h3>
                <a
                  :href="selectedItem.metadata.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-sky-600 dark:text-sky-400 hover:underline break-all"
                >
                  {{ selectedItem.metadata.url }}
                </a>
              </div>
            </div>
            <div v-else class="text-center py-8 text-zinc-500 dark:text-zinc-400">
              No metadata available
            </div>
          </div>
        </div>
      </Transition>

      <!-- Overlay for metadata panel -->
      <Transition name="fade">
        <div
          v-if="isMetadataPanelOpen"
          class="fixed inset-0 bg-black bg-opacity-50 z-40"
          @click="closeMetadataPanel"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.hover\:scale-102:hover {
  transform: scale(1.02);
}

.map-container {
  height: 600px;
  width: 100%;
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .map-container {
    height: 400px;
  }
}

/* Metadata Panel Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
