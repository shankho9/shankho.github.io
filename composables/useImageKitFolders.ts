/** Load ImageKit subfolders under a root path (shared by Photos and Videos tabs). */
export async function fetchImageKitSubfolders(
  rootFolder: string,
  fileType: 'image' | 'video' | 'all' = 'image',
): Promise<string[]> {
  const response = await $fetch<{
    success: boolean
    folders: string[]
    error?: string
  }>(`/api/imagekit/folders?rootFolder=${encodeURIComponent(rootFolder)}&fileType=${fileType}`)

  if (!response.success || !response.folders) {
    if (response.error) {
      console.error('[ImageKit] Failed to load folders:', response.error)
    }
    return []
  }

  const normalizedRoot = rootFolder.startsWith('/') ? rootFolder.slice(1) : rootFolder
  return response.folders.filter((folder) => {
    const normalizedFolder = folder.startsWith('/') ? folder.slice(1) : folder
    return normalizedFolder !== normalizedRoot && normalizedFolder.startsWith(`${normalizedRoot}/`)
  })
}

export function useImageKitFoldersLoader(
  folders: Ref<string[]>,
  isLoading: Ref<boolean>,
  logLabel: string,
) {
  return async (rootFolder: string, fileType: 'image' | 'video' | 'all' = 'image') => {
    isLoading.value = true
    try {
      folders.value = await fetchImageKitSubfolders(rootFolder, fileType)
    } catch (error) {
      console.error(`[Library] Failed to load ${logLabel} folders:`, error)
      folders.value = []
    } finally {
      isLoading.value = false
    }
  }
}
