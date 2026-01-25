<template>
  <div
    class="min-h-screen bg-gray-50 dark:bg-slate-900 py-6 sm:py-12 px-4 sm:px-6 overflow-x-hidden"
  >
    <div class="max-w-7xl mx-auto w-full">
      <!-- Not Authenticated - Redirect to login -->
      <div v-if="!isAuthenticated" class="max-w-md mx-auto">
        <div
          class="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-8 text-center"
        >
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Utilities
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Sign in to access development tools and calculators.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <NuxtLink
              to="/auth/login?redirect=/dev"
              class="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign in
            </NuxtLink>
            <NuxtLink
              to="/"
              class="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 transition-colors"
            >
              Back to home
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Main Utilities Dashboard -->
      <div v-else class="space-y-10 sm:space-y-14">
        <!-- Hero -->
        <div
          class="flex flex-row flex-wrap items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-gray-200 dark:border-slate-700"
        >
          <div>
            <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Utilities
            </h1>
            <p class="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Development tools, analytics, and calculators — grouped by purpose.
            </p>
          </div>
          <button
            class="inline-flex items-center px-2.5 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shrink-0"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>

        <div v-if="!allowedLoaded" class="space-y-8 animate-pulse">
          <div class="space-y-4">
            <div class="h-4 w-48 rounded bg-gray-200 dark:bg-slate-700"></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div class="h-28 rounded-xl bg-gray-200 dark:bg-slate-800"></div>
              <div class="h-28 rounded-xl bg-gray-200 dark:bg-slate-800"></div>
              <div class="h-28 rounded-xl bg-gray-200 dark:bg-slate-800"></div>
            </div>
          </div>
          <div class="space-y-4">
            <div class="h-4 w-56 rounded bg-gray-200 dark:bg-slate-700"></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div class="h-28 rounded-xl bg-gray-200 dark:bg-slate-800"></div>
              <div class="h-28 rounded-xl bg-gray-200 dark:bg-slate-800"></div>
              <div class="h-28 rounded-xl bg-gray-200 dark:bg-slate-800"></div>
            </div>
          </div>
          <div class="space-y-4">
            <div class="h-4 w-40 rounded bg-gray-200 dark:bg-slate-700"></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div class="h-28 rounded-xl bg-gray-200 dark:bg-slate-800"></div>
              <div class="h-28 rounded-xl bg-gray-200 dark:bg-slate-800"></div>
              <div class="h-28 rounded-xl bg-gray-200 dark:bg-slate-800"></div>
            </div>
          </div>
        </div>

        <template v-else>
        <!-- Section: Analytics & Insights (Admin only) -->
        <section v-if="isAdmin">
          <h2
            class="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
          >
            <Icon name="mdi:chart-areaspline" size="20" class="text-blue-500 dark:text-blue-400" />
            Analytics & Insights
            <span class="ml-2 text-xs font-normal normal-case text-amber-600 dark:text-amber-400">
              (Admin only)
            </span>
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <NuxtLink
              v-if="canAccess('visitors')"
              to="/dev/utilities/visitors"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50"
                >
                  <Icon name="mdi:chart-line" size="22" class="text-blue-600 dark:text-blue-400" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Visitor Analytics</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Unique visitors & logins
                    <span
                      v-if="requiresPasscode('visitors')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                View unique visitors signing in to various pages with detailed analytics
              </p>
            </NuxtLink>
            <NuxtLink
              v-if="canAccess('analytics')"
              to="/dev/utilities/analytics"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-pink-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-pink-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/50"
                >
                  <Icon name="mdi:chart-bar" size="22" class="text-pink-600 dark:text-pink-400" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    Analytics Dashboard
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Popular posts & engagement
                    <span
                      v-if="requiresPasscode('analytics')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                View popular posts, reading time, engagement metrics, and content performance
              </p>
            </NuxtLink>
            <NuxtLink
              v-if="canAccess('emails')"
              to="/dev/utilities/emails"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50"
                >
                  <Icon name="mdi:email" size="22" class="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Email Logs</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Alert history
                    <span
                      v-if="requiresPasscode('emails')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                View email alert history and new user notifications
              </p>
            </NuxtLink>
          </div>
        </section>

        <!-- Section: Site Settings (Admin only) -->
        <section v-if="isAdmin">
          <h2
            class="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
          >
            <Icon name="mdi:cog" size="20" class="text-slate-500 dark:text-slate-400" />
            Site Settings
            <span class="ml-2 text-xs font-normal normal-case text-amber-600 dark:text-amber-400">
              (Admin only)
            </span>
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <NuxtLink
              to="/dev/utilities/access-control"
              target="_blank"
              rel="noopener noreferrer"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-sky-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/50"
                >
                  <Icon
                    name="mdi:shield-account"
                    size="22"
                    class="text-sky-600 dark:text-sky-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    Utility Access Control
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Role-based access</p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                Choose which roles can view or access each utility. Requires passcode verification.
              </p>
            </NuxtLink>
          </div>
        </section>

        <!-- Section: Data & Infrastructure -->
        <section>
          <h2
            class="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
          >
            <Icon name="mdi:server" size="20" class="text-purple-500 dark:text-purple-400" />
            Data & Infrastructure
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <NuxtLink
              v-if="canAccess('database')"
              to="/dev/utilities/database"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-purple-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50"
                >
                  <Icon
                    name="mdi:database"
                    size="22"
                    class="text-purple-600 dark:text-purple-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Database Stats</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Table statistics
                    <span
                      v-if="requiresPasscode('database')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                View database table statistics and row counts
              </p>
            </NuxtLink>
            <NuxtLink
              v-if="canAccess('health')"
              to="/dev/utilities/health"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-amber-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-amber-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50"
                >
                  <Icon
                    name="mdi:heart-pulse"
                    size="22"
                    class="text-amber-600 dark:text-amber-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">API Health</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    System status
                    <span
                      v-if="requiresPasscode('health')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                Check API endpoints and database connectivity status
              </p>
            </NuxtLink>
            <NuxtLink
              v-if="canAccess('cache')"
              to="/dev/utilities/cache"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-teal-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/50"
                >
                  <Icon name="mdi:cached" size="22" class="text-teal-600 dark:text-teal-400" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Cache Management</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Clear & manage cache
                    <span
                      v-if="requiresPasscode('cache')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                Clear application cache and manage cache settings
              </p>
            </NuxtLink>
            <NuxtLink
              v-if="canAccess('locations-list')"
              to="/dev/utilities/locations-list"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50"
                >
                  <Icon
                    name="mdi:map-marker-multiple"
                    size="22"
                    class="text-emerald-600 dark:text-emerald-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Locations</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    List from Location Manager
                    <span
                      v-if="requiresPasscode('locations-list')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                View all locations from the database (added via Location Manager)
              </p>
            </NuxtLink>
          </div>
        </section>

        <!-- Section: Content & Data Managers -->
        <section>
          <h2
            class="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
          >
            <Icon name="mdi:folder-cog" size="20" class="text-green-500 dark:text-green-400" />
            Content & Data Managers
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <NuxtLink
              v-if="canAccess('car-manager')"
              to="/dev/utilities/car-manager"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-orange-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-orange-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/50"
                >
                  <Icon
                    name="mdi:car-multiple"
                    size="22"
                    class="text-orange-600 dark:text-orange-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    Car Database Manager
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Manage car data
                    <span
                      v-if="requiresPasscode('car-manager')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                View, edit, and manage car manufacturers, models, and variants with CSV
                import/export
              </p>
            </NuxtLink>
            <NuxtLink
              v-if="canAccess('content')"
              to="/dev/utilities/content"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-rose-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-rose-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/50"
                >
                  <Icon
                    name="mdi:file-document-edit"
                    size="22"
                    class="text-rose-600 dark:text-rose-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Content Manager</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Quick actions
                    <span
                      v-if="requiresPasscode('content')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                Quick links to manage blog posts, gallery items, and resources
              </p>
            </NuxtLink>
            <NuxtLink
              v-if="canAccess('locations')"
              to="/dev/locations"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-green-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-green-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50"
                >
                  <Icon
                    name="mdi:map-marker"
                    size="22"
                    class="text-green-600 dark:text-green-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Location Manager</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Add places to map
                    <span
                      v-if="requiresPasscode('locations')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                Web interface to add and manage locations on the travel map
              </p>
            </NuxtLink>
          </div>
        </section>

        <!-- Section: Calculators -->
        <section>
          <h2
            class="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
          >
            <Icon
              name="mdi:calculator-variant"
              size="20"
              class="text-cyan-500 dark:text-cyan-400"
            />
            Calculators
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <NuxtLink
              v-if="canAccess('car-lease-calculator')"
              to="/dev/utilities/car-lease-calculator"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-cyan-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/50"
                >
                  <Icon
                    name="mdi:calculator-variant"
                    size="22"
                    class="text-cyan-600 dark:text-cyan-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    Car Lease Calculator
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Ownership vs lease analysis
                    <span
                      v-if="requiresPasscode('car-lease-calculator')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                Compare car ownership vs leasing with tax savings, reimbursements, and investment
                returns. Save and manage templates.
              </p>
            </NuxtLink>
            <NuxtLink
              v-if="canAccess('rent-vs-buy-calculator')"
              to="/dev/utilities/rent-vs-buy-calculator"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50"
                >
                  <Icon
                    name="mdi:home-currency-usd"
                    size="22"
                    class="text-emerald-600 dark:text-emerald-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Rent vs Buy (EMI)</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Housing decision analysis
                    <span
                      v-if="requiresPasscode('rent-vs-buy-calculator')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                Compare renting vs buying with EMI, taxes, maintenance, appreciation, and investment
                opportunity cost. Includes sensitivity scenarios and PDF export.
              </p>
            </NuxtLink>
          </div>
        </section>

        <!-- Section: Planning -->
        <section>
          <h2
            class="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
          >
            <Icon
              name="mdi:calendar-check"
              size="20"
              class="text-orange-500 dark:text-orange-400"
            />
            Planning
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <NuxtLink
              v-if="canAccess('planner')"
              to="/dev/planner"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-orange-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-orange-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/50"
                >
                  <Icon
                    name="mdi:calendar-check"
                    size="22"
                    class="text-orange-600 dark:text-orange-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Personal Planner</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Daily planning & tasks
                    <span
                      v-if="requiresPasscode('planner')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                Daily planner with Kanban board, weekly reviews, and printable plans
              </p>
            </NuxtLink>
            <NuxtLink
              v-if="canAccess('travel-planner')"
              to="/dev/utilities/travel-planner"
              class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-600 active:scale-[0.99] touch-manipulation"
            >
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50"
                >
                  <Icon
                    name="mdi:map-marker-path"
                    size="22"
                    class="text-indigo-600 dark:text-indigo-400"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">Travel Planner</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Road vs flight comparison
                    <span
                      v-if="requiresPasscode('travel-planner')"
                      class="ml-2 text-amber-600 dark:text-amber-400"
                    >
                      · Passcode required
                    </span>
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                Plan trips, compare road vs flight costs, calculate distances, and find the most
                cost-effective travel option. Save plans as templates.
              </p>
            </NuxtLink>
          </div>
        </section>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useUtilityAccess } from '~/composables/useUtilityAccess'

const { isAuthenticated, isAdmin, checkAuth, signOut } = useAuth()
const { canAccess, requiresPasscode, fetchAllowed, allowedLoaded } = useUtilityAccess()

const handleLogout = async () => {
  await signOut()
  await new Promise((resolve) => setTimeout(resolve, 100))
  await navigateTo('/auth/login?redirect=/dev')
}

onMounted(async () => {
  await checkAuth()
  if (isAuthenticated.value) await fetchAllowed()
})
</script>
