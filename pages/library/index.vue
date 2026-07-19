<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useLibraryEngagementStats } from '~/composables/useLibraryEngagementStats'
import { useImageKitFoldersLoader } from '~/composables/useImageKitFolders'
import { seoData } from '~/data'
import GalleryLightbox from '~/components/gallery/Lightbox.vue'
import GoogleMap from '~/components/blog/GoogleMap.vue'
import ResourcesTab from '~/components/library/ResourcesTab.vue'
import AppsTab from '~/components/library/AppsTab.vue'
import MusicalNotesTab from '~/components/library/MusicalNotesTab.vue'
import LibraryShareBar from '~/components/library/LibraryShareBar.vue'
import LibraryIntegrationNote from '~/components/library/LibraryIntegrationNote.vue'
import LibraryMainTabs from '~/components/library/LibraryMainTabs.vue'
import MediaMetadataPanel from '~/components/library/MediaMetadataPanel.vue'

definePageMeta({ middleware: ['auth-login'] })

// Tab types
type TabType = 'photos' | 'videos' | 'musical-notes' | 'travel-map' | 'resources' | 'apps'

const route = useRoute()
const router = useRouter()

const VALID_TABS: TabType[] = [
  'photos',
  'videos',
  'musical-notes',
  'travel-map',
  'resources',
  'apps',
]

const isValidTab = (tab: unknown): tab is TabType =>
  typeof tab === 'string' && VALID_TABS.includes(tab as TabType)

// Get configurable root folders from runtime config
const config = useRuntimeConfig()
const photosRootFolder = config.public.imageKitPhotosRootFolder || 'Library/Photos'
const videosRootFolder = config.public.imageKitVideosRootFolder || 'Library/Videos'

// Authentication
const { user, isAuthenticated, loadStoredUser } = useAuth()
const showLoginModal = ref(false)

const openLoginModal = () => {
  showLoginModal.value = true
}

const closeLoginModal = () => {
  showLoginModal.value = false
}

const { loadStatsForItems, refreshItemStats } = useLibraryEngagementStats(
  () => isAuthenticated.value,
)

// Active tab state - default to photos (requires auth)
const activeTab = ref<TabType>('photos')

const setActiveTab = (tab: TabType) => {
  activeTab.value = tab
  if (route.query.tab !== tab) {
    router.replace({ path: '/library', query: { tab } })
  }
}

// Gallery state (for Photos tab)
const viewMode = ref<'grid' | 'masonry'>('grid')
const searchQuery = ref<string>('') // Search query for filtering by tags and metadata
const selectedFolder = ref<string>(photosRootFolder) // ImageKit root folder path (configurable)
const selectedItem = ref<GalleryItem | null>(null) // Selected item for metadata panel
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

const videoLightboxOpen = ref(false)
const videoLightboxIndex = ref(0)

const openVideoLightbox = (index: number) => {
  videoLightboxIndex.value = index
  videoLightboxOpen.value = true
}

/** Map video items into GalleryLightbox shape (image = playable URL). */
const videoLightboxItems = computed(() =>
  filteredVideos.value.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description || '',
    image: video.videoUrl || video.thumbnail || '',
    thumbnail: video.thumbnail,
    category: video.category || 'video',
    date: video.date,
    type: 'video',
    likeCount: video.likeCount,
    metadata: video.metadata,
  })),
)

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
const loadImageKitFolders = useImageKitFoldersLoader(imageKitFolders, isLoadingFolders, 'photo')

// Load video folders from ImageKit
const loadVideoKitFolders = useImageKitFoldersLoader(
  videoKitFolders,
  isLoadingVideoFolders,
  'video',
)

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

      // Stats load when the visible page changes (see watch on paginatedItems).
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

// Load like and comment counts for a batch of gallery items (current page).
const loadGalleryStatsForItems = (items: typeof galleryItems.value) => loadStatsForItems(items)

// Refresh stats for a specific gallery item
const refreshGalleryItemStats = async (itemId: string | number) => {
  await refreshItemStats(itemId, galleryItems.value)
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

      // Stats load when the visible page changes (see watch on paginatedVideos).
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

// Load like and comment counts for a batch of video items (current page).
const loadVideoStatsForItems = (videos: typeof videoItems.value) => loadStatsForItems(videos)

const refreshVideoItemStats = async (itemId: string | number) => {
  await refreshItemStats(itemId, videoItems.value)
}

const handleVideoLikeChanged = async (itemId: string | number) => {
  await refreshVideoItemStats(itemId)
}

const handleVideoCommentAdded = async (itemId: string | number) => {
  await refreshVideoItemStats(itemId)
}

// Resources count (Nuxt Content)
const resourcesCount = ref(0)
const isLoadingResourcesCount = ref(false)

// Apps count (Nuxt Content)
const appsCount = ref(0)
const isLoadingAppsCount = ref(false)

// Musical notes count (Nuxt Content)
const musicCount = ref(0)
const isLoadingMusicCount = ref(false)

const loadResourcesCount = async () => {
  if (resourcesCount.value > 0 || isLoadingResourcesCount.value) return

  isLoadingResourcesCount.value = true
  try {
    const docs = await queryCollection('resources').all()
    resourcesCount.value = docs.filter((doc) => doc.published === true).length
  } catch (error) {
    console.error('[Library] Failed to load resources count:', error)
  } finally {
    isLoadingResourcesCount.value = false
  }
}

const loadAppsCount = async () => {
  if (appsCount.value > 0 || isLoadingAppsCount.value) return

  isLoadingAppsCount.value = true
  try {
    const docs = await queryCollection('apps').all()
    appsCount.value = docs.filter((doc) => doc.published === true).length
  } catch (error) {
    console.error('[Library] Failed to load apps count:', error)
  } finally {
    isLoadingAppsCount.value = false
  }
}

const loadMusicCount = async () => {
  if (musicCount.value > 0 || isLoadingMusicCount.value) return

  isLoadingMusicCount.value = true
  try {
    const docs = await queryCollection('music').all()
    musicCount.value = docs.filter((doc) => doc.published === true).length
  } catch (error) {
    console.error('[Library] Failed to load music count:', error)
  } finally {
    isLoadingMusicCount.value = false
  }
}

// Tab configuration - computed to reactively update counts
const tabs = computed(() => [
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
    count: musicCount.value,
    requiresAuth: true,
  },
  {
    id: 'travel-map' as TabType,
    label: 'Travel Map',
    icon: 'mdi:map',
    count: travelPlaces.value.length,
    requiresAuth: true,
  },
  {
    id: 'resources' as TabType,
    label: 'Resources',
    icon: 'mdi:book-open-variant',
    count: resourcesCount.value,
    requiresAuth: true,
  },
  {
    id: 'apps' as TabType,
    label: 'Apps',
    icon: 'mdi:cellphone',
    count: appsCount.value,
    requiresAuth: true,
  },
])

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

// GalleryItem type matching Lightbox component
interface GalleryItem {
  id: string | number
  title: string
  image?: string
  video?: string
  videoUrl?: string
  description?: string
  tags?: string[]
  type: string
  likeCount?: number
  thumbnail?: string
  metadata?: {
    fileId?: string
    name?: string
    fileType?: string
    filePath?: string
    width?: number
    height?: number
    size?: number | string
    customMetadata?: Record<string, unknown>
  }
}

// Function to open metadata panel
const openMetadataPanel = (item: GalleryItem) => {
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

watch(paginatedItems, (items) => {
  if (activeTab.value === 'photos' && isAuthenticated.value) {
    void loadGalleryStatsForItems(items)
  }
})

watch(paginatedVideos, (videos) => {
  if (activeTab.value === 'videos' && isAuthenticated.value) {
    void loadVideoStatsForItems(videos)
  }
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

watch(
  () => route.query.tab,
  (tabFromQuery) => {
    if (isValidTab(tabFromQuery) && activeTab.value !== tabFromQuery) {
      activeTab.value = tabFromQuery
    }
  },
)

// Watch for travel-map tab activation to load places
watch(activeTab, (newTab) => {
  if (newTab === 'travel-map' && travelPlaces.value.length === 0 && !mapLoading.value) {
    loadTravelPlaces()
  }
  // Load resources count when resources tab is activated
  if (newTab === 'resources' && resourcesCount.value === 0 && !isLoadingResourcesCount.value) {
    loadResourcesCount()
  }
  // Load apps count when apps tab is activated
  if (newTab === 'apps' && appsCount.value === 0 && !isLoadingAppsCount.value) {
    loadAppsCount()
  }
  if (newTab === 'musical-notes' && musicCount.value === 0 && !isLoadingMusicCount.value) {
    loadMusicCount()
  }
})

// Track if we've loaded stats for the current user to prevent duplicate calls
const lastLoadedUserEmail = ref<string | null>(null)

// Initialize auth on mount - load user first to ensure authentication state is available
onMounted(async () => {
  // Load stored user first to ensure authentication state is available
  loadStoredUser()

  if (isValidTab(route.query.tab)) {
    activeTab.value = route.query.tab
  }

  // Track page visit
  fetch('/api/analytics/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 'library' }),
  }).catch(() => {
    // Silent fail
  })

  // Load resources count on mount (doesn't require auth)
  loadResourcesCount()
  loadMusicCount()

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
    if (activeTab.value === 'apps' && appsCount.value === 0 && !isLoadingAppsCount.value) {
      loadAppsCount()
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

// Check if current tab requires auth
const currentTabRequiresAuth = computed(() => {
  return tabs.value.find((tab) => tab.id === activeTab.value)?.requiresAuth ?? false
})

const librarySharePath = computed(() => {
  const tab = isValidTab(route.query.tab) ? route.query.tab : activeTab.value
  return `/library?tab=${tab}`
})

const librarySharePageTitle = computed(() => {
  const tab = isValidTab(route.query.tab) ? route.query.tab : activeTab.value
  const labels: Record<TabType, string> = {
    photos: 'Photos',
    videos: 'Videos',
    'musical-notes': 'Musical Notes',
    'travel-map': 'Travel Map',
    resources: 'Resources',
    apps: 'Apps',
  }
  return `Media Library — ${labels[tab] || 'Library'}`
})

useHead({
  title: librarySharePageTitle,
  meta: [
    {
      name: 'description',
      content: 'A curated collection of photos, videos, and resources',
    },
    { property: 'og:site_name', content: seoData.mySite },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: () => `${seoData.mySite}${librarySharePath.value}` },
    { property: 'og:title', content: librarySharePageTitle },
    {
      property: 'og:description',
      content: 'A curated collection of photos, videos, and resources',
    },
  ],
  link: [{ rel: 'canonical', href: () => `${seoData.mySite}${librarySharePath.value}` }],
})

// Generate OG Image with error handling
try {
  defineOgImageComponent('About', {
    headline: 'Library 📚',
    title: 'Media Library',
    description: 'Photos, Videos & Resources',
    link: '/blogs-img/personal/Sid_BetDwarka_Solo_w_Terrano.jpg',
  })
} catch (error) {
  console.error('[Library Page] Failed to define OG image:', error)
  // Don't throw - allow page to render without OG image
}
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800"
  >
    <div class="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
      <!-- Header -->
      <div class="mb-5 text-center sm:mb-6">
        <h1
          class="mb-1 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-sky-700 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent sm:text-4xl"
        >
          Media Library
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Explore photos, videos, and curated resources
        </p>
      </div>

      <!-- Tab Navigation -->
      <LibraryMainTabs
        :tabs="tabs"
        :active-tab="activeTab"
        :is-loading-resources-count="isLoadingResourcesCount"
        :is-loading-apps-count="isLoadingAppsCount"
        @update:active-tab="setActiveTab"
      />

      <div class="mb-5 space-y-4">
        <LibraryIntegrationNote
          v-if="isAuthenticated || !currentTabRequiresAuth"
          :tab="activeTab"
        />

        <LibraryShareBar v-if="isAuthenticated || !currentTabRequiresAuth" :tab="activeTab" />
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
            Please sign in to access
            {{
              activeTab === 'photos'
                ? 'photos'
                : activeTab === 'videos'
                  ? 'videos'
                  : activeTab === 'resources'
                    ? 'resources'
                    : activeTab === 'apps'
                      ? 'apps'
                      : activeTab === 'musical-notes'
                        ? 'musical notes'
                        : 'this content'
            }}.
          </p>
          <button
            class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            @click="openLoginModal"
          >
            <Icon name="mdi:login" size="20" />
            Login
          </button>
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
          id="library-panel-photos"
          :key="'photos'"
          role="tabpanel"
          aria-labelledby="library-tab-photos"
        >
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

          <!-- Search -->
          <div v-else-if="!isLoadingImages && !imageKitError" class="mb-4">
            <div class="relative">
              <Icon
                name="mdi:magnify"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                size="18"
              />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Search tags, title, metadata..."
                class="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-300"
              />
              <button
                v-if="searchQuery"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                @click="searchQuery = ''"
              >
                <Icon name="mdi:close-circle" size="18" />
              </button>
            </div>
            <p v-if="searchQuery" class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'result' : 'results' }}
            </p>
          </div>

          <!-- Gallery toolbar: showing count, folders, view icons, refresh, pagination -->
          <div
            v-if="!isLoadingImages && !imageKitError && (sortedItems.length > 0 || isAuthenticated)"
            class="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
              <span
                v-if="sortedItems.length > 0"
                class="shrink-0 text-sm text-zinc-600 dark:text-zinc-400"
              >
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }}-{{
                  Math.min(currentPage * itemsPerPage, sortedItems.length)
                }}
                of {{ sortedItems.length }} {{ sortedItems.length === 1 ? 'image' : 'images' }}
              </span>

              <template v-if="isAuthenticated">
                <div
                  class="flex flex-wrap items-center gap-2 border-zinc-200 pl-0 dark:border-slate-600 sm:border-l sm:pl-4"
                >
                  <Icon
                    v-if="isLoadingFolders"
                    name="svg-spinners:180-ring"
                    class="animate-spin text-zinc-400"
                    size="14"
                  />
                  <template v-else>
                    <button
                      v-for="folder in displayImageFolders"
                      :key="folder.value"
                      :title="folder.label"
                      :class="[
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                        selectedFolder === folder.value
                          ? 'bg-sky-700 text-white dark:bg-sky-600'
                          : 'bg-gray-100 text-zinc-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-zinc-300 dark:hover:bg-slate-600',
                      ]"
                      @click="selectedFolder = folder.value"
                    >
                      <Icon name="mdi:folder-outline" size="14" />
                      <span class="max-w-[6rem] truncate">{{ folder.label }}</span>
                    </button>
                  </template>
                </div>

                <div
                  class="flex items-center gap-2 border-zinc-200 pl-0 dark:border-slate-600 sm:border-l sm:pl-4"
                >
                  <div
                    v-if="sortedItems.length > 0"
                    class="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-800"
                  >
                    <button
                      :class="[
                        'rounded p-1.5 transition-colors',
                        viewMode === 'grid'
                          ? 'bg-sky-700 text-white dark:bg-sky-600'
                          : 'text-zinc-500 hover:bg-gray-100 dark:hover:bg-slate-700',
                      ]"
                      title="Grid view"
                      @click="viewMode = 'grid'"
                    >
                      <Icon name="mdi:view-grid" size="16" />
                    </button>
                    <button
                      :class="[
                        'rounded p-1.5 transition-colors',
                        viewMode === 'masonry'
                          ? 'bg-sky-700 text-white dark:bg-sky-600'
                          : 'text-zinc-500 hover:bg-gray-100 dark:hover:bg-slate-700',
                      ]"
                      title="Masonry view"
                      @click="viewMode = 'masonry'"
                    >
                      <Icon name="mdi:view-module" size="16" />
                    </button>
                  </div>

                  <button
                    :disabled="isLoadingFolders"
                    class="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-slate-700"
                    title="Refresh folders"
                    @click="loadImageKitFolders(photosRootFolder, 'image')"
                  >
                    <Icon
                      :name="isLoadingFolders ? 'svg-spinners:180-ring' : 'mdi:folder-refresh'"
                      :class="isLoadingFolders ? 'animate-spin' : ''"
                      size="16"
                    />
                  </button>
                  <button
                    :disabled="isLoadingImages"
                    class="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-slate-700"
                    title="Refresh images"
                    @click="loadImagesFromImageKit(selectedFolder)"
                  >
                    <Icon
                      :name="isLoadingImages ? 'svg-spinners:180-ring' : 'mdi:refresh'"
                      :class="isLoadingImages ? 'animate-spin' : ''"
                      size="16"
                    />
                  </button>
                </div>
              </template>
            </div>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
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
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            <div
              v-for="item in paginatedItems"
              :key="item.id"
              class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700"
            >
              <div
                class="relative aspect-square overflow-hidden cursor-pointer touch-manipulation active:opacity-90"
                style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
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
                class="relative overflow-hidden cursor-pointer touch-manipulation active:opacity-90"
                style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
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
          <LibraryContentSection v-if="isAuthenticated" title="Folder">
            <template #header>
              <div class="flex items-center gap-2">
                <button
                  :disabled="isLoadingVideoFolders"
                  class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-300"
                  title="Refresh folder list"
                  @click="loadVideoKitFolders(videosRootFolder, 'video')"
                >
                  <Icon
                    :name="isLoadingVideoFolders ? 'svg-spinners:180-ring' : 'mdi:folder-refresh'"
                    :class="isLoadingVideoFolders ? 'animate-spin' : ''"
                    size="14"
                  />
                </button>
                <button
                  :disabled="isLoadingVideos"
                  class="flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                  @click="loadVideosFromImageKit(selectedVideoFolder)"
                >
                  <Icon
                    :name="isLoadingVideos ? 'svg-spinners:180-ring' : 'mdi:refresh'"
                    :class="isLoadingVideos ? 'animate-spin' : ''"
                    size="14"
                  />
                  <span>{{ isLoadingVideos ? 'Refreshing…' : 'Refresh' }}</span>
                </button>
              </div>
            </template>
            <div
              v-if="isLoadingVideoFolders"
              class="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
            >
              <Icon name="svg-spinners:180-ring" class="animate-spin" size="16" />
              <span>Loading folders...</span>
            </div>
            <div v-else class="flex flex-wrap gap-1.5">
              <button
                v-for="folder in displayVideoFolders"
                :key="folder.value"
                :class="[
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  selectedVideoFolder === folder.value
                    ? 'bg-sky-700 text-white dark:bg-sky-600'
                    : 'bg-gray-100 text-zinc-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-zinc-300 dark:hover:bg-slate-600',
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
          </LibraryContentSection>

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

          <div v-else-if="!isLoadingVideos && !videoKitError" class="mb-4">
            <div class="relative">
              <Icon
                name="mdi:magnify"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                size="18"
              />
              <input
                v-model="videoSearchQuery"
                type="search"
                placeholder="Search videos by tags, title, metadata..."
                class="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-300"
              />
              <button
                v-if="videoSearchQuery"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                @click="videoSearchQuery = ''"
              >
                <Icon name="mdi:close-circle" size="18" />
              </button>
            </div>
            <p v-if="videoSearchQuery" class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {{ filteredVideos.length }} {{ filteredVideos.length === 1 ? 'result' : 'results' }}
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
            v-if="!isLoadingVideos && !videoKitError && filteredVideos.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div
              v-for="video in paginatedVideos"
              :key="video.id"
              class="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl dark:border-slate-700 dark:bg-slate-800"
              @click="
                (() => {
                  const index = filteredVideos.findIndex((v) => String(v.id) === String(video.id))
                  if (index >= 0) openVideoLightbox(index)
                })()
              "
            >
              <div
                class="relative aspect-video block cursor-pointer overflow-hidden touch-manipulation active:opacity-90"
                style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
              >
                <NuxtImg
                  :src="video.thumbnail"
                  :alt="video.title"
                  class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  :quality="75"
                />
                <div
                  class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 transition-all duration-300 group-hover:bg-opacity-50"
                >
                  <Icon
                    name="mdi:play-circle"
                    class="text-6xl text-white opacity-80 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100"
                  />
                  <span
                    class="absolute bottom-2 right-2 rounded bg-black bg-opacity-70 px-2 py-1 text-xs font-semibold text-white"
                  >
                    {{ video.duration }}
                  </span>
                </div>
              </div>
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
          <ResourcesTab />
        </div>

        <!-- Apps Tab -->
        <div
          v-else-if="activeTab === 'apps' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'apps'"
        >
          <AppsTab />
        </div>

        <!-- Musical Notes Tab -->
        <div
          v-else-if="activeTab === 'musical-notes' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'musical-notes'"
        >
          <MusicalNotesTab />
        </div>

        <!-- Travel Map Tab -->
        <div
          v-else-if="activeTab === 'travel-map' && (isAuthenticated || !currentTabRequiresAuth)"
          :key="'travel-map'"
        >
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
              <p class="text-red-600 dark:text-red-400 mb-4">{{ mapError }}</p>
              <button
                type="button"
                class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                @click="loadTravelPlaces"
              >
                <Icon name="mdi:refresh" class="mr-2 inline" size="18" />
                Try Again
              </button>
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

      <!-- Lightbox Component (photos) -->
      <GalleryLightbox
        v-if="activeTab === 'photos'"
        :items="sortedItems"
        :current-index="lightboxIndex"
        :is-open="lightboxOpen"
        @close="lightboxOpen = false"
        @update:current-index="lightboxIndex = $event"
        @like-changed="handleLikeChanged"
        @comment-added="handleCommentAdded"
        @open-metadata="openMetadataPanel"
      />

      <!-- Lightbox Component (videos) -->
      <GalleryLightbox
        v-if="activeTab === 'videos'"
        :items="videoLightboxItems"
        :current-index="videoLightboxIndex"
        :is-open="videoLightboxOpen"
        @close="videoLightboxOpen = false"
        @update:current-index="videoLightboxIndex = $event"
        @like-changed="handleVideoLikeChanged"
        @comment-added="handleVideoCommentAdded"
        @open-metadata="openMetadataPanel"
      />

      <MediaMetadataPanel
        :open="isMetadataPanelOpen"
        :item="selectedItem"
        @close="closeMetadataPanel"
      />
    </div>

    <!-- Login Modal -->
    <AuthLoginModal :is-open="showLoginModal" @close="closeLoginModal" />
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
</style>
