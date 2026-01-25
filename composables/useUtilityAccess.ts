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
const sharedPasscodeRequired = shallowRef<string[]>([])
const sharedConfig = shallowRef<UtilityItem[] | null>(null)
const sharedAllowedLoaded = shallowRef(false)

export function useUtilityAccess() {
  const { isAuthenticated, isAdmin } = useAuth()

  const allowed = sharedAllowed
  const passcodeRequired = sharedPasscodeRequired
  const config = sharedConfig
  const allowedLoaded = sharedAllowedLoaded

  const canAccess = (utilityId: string) => allowedLoaded.value && allowed.value.includes(utilityId)

  const requiresPasscode = (utilityId: string) => passcodeRequired.value.includes(utilityId)

  const fetchAllowed = async () => {
    sharedAllowedLoaded.value = false
    if (!isAuthenticated.value) {
      sharedAllowed.value = []
      sharedPasscodeRequired.value = []
      sharedAllowedLoaded.value = true
      return []
    }
    try {
      const res = await $fetch<{
        allowed: string[]
        passcodeRequired?: string[]
      }>('/api/dev/utility-access/allowed')
      sharedAllowed.value = Array.isArray(res.allowed) ? res.allowed : []
      sharedPasscodeRequired.value = Array.isArray(res.passcodeRequired) ? res.passcodeRequired : []
      return sharedAllowed.value
    } catch {
      sharedAllowed.value = []
      sharedPasscodeRequired.value = []
      return []
    } finally {
      sharedAllowedLoaded.value = true
    }
  }

  const fetchConfig = async (): Promise<UtilityItem[]> => {
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
    passcodeRequired,
    config,
    allowedLoaded,
    canAccess,
    requiresPasscode,
    fetchAllowed,
    fetchConfig,
    saveConfig,
  }
}
