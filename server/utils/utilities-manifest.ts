/**
 * Canonical list of utilities for access control.
 * Must match utility_id in utility_access_config.
 */
export interface UtilityManifestItem {
  id: string
  name: string
  route: string
  section: string
}

export const UTILITIES_MANIFEST: UtilityManifestItem[] = [
  {
    id: 'visitors',
    name: 'Visitor Analytics',
    route: '/dev/utilities/visitors',
    section: 'Analytics & Insights',
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    route: '/dev/utilities/analytics',
    section: 'Analytics & Insights',
  },
  {
    id: 'emails',
    name: 'Email Logs',
    route: '/dev/utilities/emails',
    section: 'Analytics & Insights',
  },
  {
    id: 'database',
    name: 'Database Stats',
    route: '/dev/utilities/database',
    section: 'Data & Infrastructure',
  },
  {
    id: 'health',
    name: 'API Health',
    route: '/dev/utilities/health',
    section: 'Data & Infrastructure',
  },
  {
    id: 'cache',
    name: 'Cache Management',
    route: '/dev/utilities/cache',
    section: 'Data & Infrastructure',
  },
  {
    id: 'locations-list',
    name: 'Locations',
    route: '/dev/utilities/locations-list',
    section: 'Data & Infrastructure',
  },
  {
    id: 'content',
    name: 'Content Manager',
    route: '/dev/utilities/content',
    section: 'Content & Data Managers',
  },
  {
    id: 'car-manager',
    name: 'Car Database Manager',
    route: '/dev/utilities/car-manager',
    section: 'Content & Data Managers',
  },
  {
    id: 'locations',
    name: 'Location Manager',
    route: '/dev/locations',
    section: 'Content & Data Managers',
  },
  {
    id: 'car-lease-calculator',
    name: 'Car Lease Calculator',
    route: '/dev/utilities/car-lease-calculator',
    section: 'Calculators',
  },
  {
    id: 'rent-vs-buy-calculator',
    name: 'Rent vs Buy (EMI)',
    route: '/dev/utilities/rent-vs-buy-calculator',
    section: 'Calculators',
  },
  {
    id: 'travel-planner',
    name: 'Travel Planner',
    route: '/dev/utilities/travel-planner',
    section: 'Planning',
  },
]

export function getUtilityIdByRoute(route: string): string | null {
  const r = route.replace(/\/$/, '')
  const found = UTILITIES_MANIFEST.find(
    (u) =>
      u.route === r ||
      (r.startsWith(u.route) && (r.length === u.route.length || r[u.route.length] === '/')),
  )
  return found?.id ?? null
}
