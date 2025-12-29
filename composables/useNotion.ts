import { ref } from 'vue'

export interface NotionItem {
  id: string
  notionUrl: string
  createdAt: string
  updatedAt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Dynamic properties from Notion
}

export interface NotionResponse {
  success: boolean
  items: NotionItem[]
  hasMore?: boolean
  nextCursor?: string
  error?: string
}

export interface NotionQueryOptions {
  databaseId?: string
  pageSize?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: any // Notion filter format is complex and dynamic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sorts?: any[] // Notion sort format is complex and dynamic
}

/**
 * Composable for fetching data from Notion databases
 */
export const useNotion = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch items from a Notion database
   */
  const fetchDatabase = async (options: NotionQueryOptions = {}): Promise<NotionResponse> => {
    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()

      if (options.databaseId) {
        params.append('databaseId', options.databaseId)
      }

      if (options.pageSize) {
        params.append('pageSize', options.pageSize.toString())
      }

      if (options.filter) {
        params.append('filter', JSON.stringify(options.filter))
      }

      if (options.sorts) {
        params.append('sorts', JSON.stringify(options.sorts))
      }

      const response = await $fetch<NotionResponse>(`/api/notion/database?${params.toString()}`)

      if (!response.success) {
        error.value = response.error || 'Failed to fetch from Notion'
        return response
      }

      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch from Notion'
      error.value = errorMessage
      console.error('[useNotion] Error:', err)
      return {
        success: false,
        error: errorMessage,
        items: [],
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch resources (books, tools, learning resources) from Notion
   * Assumes a specific database structure with properties: Title, Description, Link, Category, etc.
   */
  const fetchResources = async (type: 'books' | 'tools' | 'learning' | 'all' = 'all') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filter: any = {
      property: 'Published',
      checkbox: {
        equals: true,
      },
    }

    if (type !== 'all') {
      // Wrap both conditions in an 'and' array when filtering by type
      // Notion filter format requires all conditions to be in the 'and' array
      filter = {
        and: [
          {
            property: 'Published',
            checkbox: {
              equals: true,
            },
          },
          {
            property: 'Type',
            select: {
              equals: type === 'books' ? 'Book' : type === 'tools' ? 'Tool' : 'Learning Resource',
            },
          },
        ],
      }
    }

    const sorts = [
      {
        property: 'Created',
        direction: 'descending' as const,
      },
    ]

    return fetchDatabase({
      filter,
      sorts,
      pageSize: 100,
    })
  }

  return {
    isLoading,
    error,
    fetchDatabase,
    fetchResources,
  }
}
