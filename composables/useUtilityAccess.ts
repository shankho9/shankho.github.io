/** Allowed utilities per user; admin config for Access Control. */

export interface UtilityItem {
  id: string
  name: string
  route: string
  section: string
  rolesAllowed: string[]
  requiresPasscode: boolean
}

const sharedAllowed = shallowRef<string[]>([])
const sharedConfig = shallowRef<UtilityItem[] | null>(null)
const sharedAllowedLoaded = shallowRef(false)

export function useUtilityAccess() {
  const { isAuthenticated } = useAuth()

  const allowed = sharedAllowed
  const config = sharedConfig
  const allowedLoaded = sharedAllowedLoaded

  const canAccess = (utilityId: string) => allowedLoaded.value && allowed.value.includes(utilityId)

  const fetchAllowed = async () => {
    sharedAllowedLoaded.value = false
    if (!isAuthenticated.value) {
      sharedAllowed.value = []
      sharedAllowedLoaded.value = true
      return []
    }
    try {
      const res = await $fetch<{ allowed: string[] }>('/api/dev/utility-access/allowed')
      sharedAllowed.value = Array.isArray(res.allowed) ? res.allowed : []
      return sharedAllowed.value
    } catch {
      sharedAllowed.value = []
      return []
    } finally {
      sharedAllowedLoaded.value = true
    }
  }

  const fetchConfig = async (): Promise<UtilityItem[]> => {
    const { isAdmin } = useAuth()
    if (!isAdmin.value) {
      sharedConfig.value = []
      return []
    }
    try {
      const { utilities } = await $fetch<{ utilities: UtilityItem[] }>('/api/dev/utility-access')
      sharedConfig.value = utilities ?? []
      return sharedConfig.value
    } catch {
      sharedConfig.value = []
      return []
    }
  }

  const saveConfig = async (
    updates: { utilityId: string; rolesAllowed: string[]; requiresPasscode?: boolean }[],
  ) => {
    await $fetch('/api/dev/utility-access', {
      method: 'PUT',
      body: updates,
    })
    sharedConfig.value = null
    await fetchAllowed()
  }

  return {
    allowed,
    config,
    allowedLoaded,
    canAccess,
    fetchAllowed,
    fetchConfig,
    saveConfig,
  }
}
