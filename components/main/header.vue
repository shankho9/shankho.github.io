<script setup lang="ts">
import { navbarData } from '../../data'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'

const colorMode = useColorMode()
function onClick(val: string) {
  colorMode.preference = val
}

const route = useRoute()
function isActive(path: string) {
  return route.path.startsWith(path)
}

// Authentication
const { user, isAuthenticated, signOut } = useAuth()

// Dropdown state
const showUserDropdown = ref(false)
const showLoginModal = ref(false)
const showMobileMenu = ref(false)

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
  if (showMobileMenu.value) showUserDropdown.value = false
}

const closeMobileMenu = () => {
  showMobileMenu.value = false
}

const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value
}

const handleSignOut = async () => {
  await signOut()
  showUserDropdown.value = false
  // If on a protected page, redirect to home or login
  const protectedPaths = ['/gallery', '/library', '/dev', '/auth/settings']
  const currentPath = route.path
  if (protectedPaths.some((path) => currentPath.startsWith(path))) {
    await navigateTo('/')
  }
}

const openLoginModal = () => {
  showLoginModal.value = true
}

const closeLoginModal = () => {
  showLoginModal.value = false
}

// Close dropdown when clicking outside
// Accept target element directly to avoid brittle synthetic event objects
const handleClickOutside = (target: HTMLElement | null) => {
  // Guard against null target
  if (!target) {
    return
  }

  if (!target.closest('.user-dropdown-container')) {
    showUserDropdown.value = false
  }
  if (!target.closest('.mobile-menu-container')) {
    showMobileMenu.value = false
  }
}

// Store reference to the click handler for proper cleanup
const clickHandler = (e: MouseEvent) => {
  // Extract event properties before setTimeout to avoid event object reuse issues
  // Event objects are reused by browsers after synchronous handlers return
  const target = e.target as HTMLElement

  // Use a slight delay to ensure toggle completes before checking outside clicks
  // This prevents the menu from closing immediately after opening
  setTimeout(() => {
    // Pass the target element directly instead of creating a synthetic event
    // This avoids brittle type assertions and makes the code more maintainable
    handleClickOutside(target)
  }, 10)
}

// Close mobile menu on route change
watch(
  () => route.path,
  () => {
    showMobileMenu.value = false
  },
)

// Lock body scroll when mobile menu is open
watch(showMobileMenu, (open) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : ''
  }
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    document.addEventListener('click', clickHandler)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', clickHandler)
  }
})
</script>

<template>
  <div class="py-3 sm:py-5 border-b dark:border-gray-800 font-semibold">
    <div class="flex px-4 sm:px-6 container max-w-5xl justify-between mx-auto items-center">
      <!-- Logo/Title -->
      <div class="flex items-center flex-shrink-0">
        <NuxtLink
          to="/"
          class="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold hover:opacity-80 transition-opacity"
          :class="{ underline: $route.path === '/' }"
          style="
            font-family: 'Brush Script MT', 'Lucida Handwriting', 'Comic Sans MS', cursive;
            letter-spacing: 0.05em;
          "
        >
          {{ navbarData.homeTitle }}
        </NuxtLink>
      </div>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-4 lg:space-x-6 text-sm lg:text-base">
        <NuxtLink
          to="/blogs"
          class="hover:opacity-80 transition-opacity"
          :class="{ underline: isActive('/blogs') }"
        >
          Blogs
        </NuxtLink>
        <NuxtLink
          to="/personalSpace"
          class="hover:opacity-80 transition-opacity"
          :class="{ underline: isActive('/personalSpace') }"
        >
          LifeLines
        </NuxtLink>
        <NuxtLink
          to="/library"
          class="hover:opacity-80 transition-opacity"
          :class="{ underline: isActive('/library') }"
        >
          Library
        </NuxtLink>
        <NuxtLink
          to="/dev"
          class="hover:opacity-80 transition-opacity flex items-center gap-1"
          :class="{ underline: isActive('/dev') }"
          title="Utilities"
          aria-label="Utilities"
        >
          <Icon name="mdi:tools" size="18" />
        </NuxtLink>
        <NuxtLink
          to="/about"
          class="hover:opacity-80 transition-opacity"
          :class="{ underline: $route.path === '/about' }"
          aria-label="About me"
        >
          About
        </NuxtLink>

        <!-- Desktop Auth & Theme -->
        <div class="flex items-center space-x-3 ml-2">
          <ClientOnly>
            <!-- User Profile / Sign In -->
            <div v-if="isAuthenticated && user" class="user-dropdown-container relative">
              <button
                class="flex items-center gap-2 hover:opacity-80 transition-opacity"
                aria-label="User menu"
                @click="toggleUserDropdown"
              >
                <img
                  v-if="user.picture"
                  :src="user.picture"
                  :alt="user.name"
                  class="w-8 h-8 rounded-full border-2 border-sky-700 dark:border-sky-400"
                />
                <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {{ user.name }}
                </span>
                <Icon
                  name="mdi:chevron-down"
                  size="18"
                  class="text-zinc-600 dark:text-zinc-400 transition-transform"
                  :class="{ 'rotate-180': showUserDropdown }"
                />
              </button>

              <!-- Dropdown Menu -->
              <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div
                  v-if="showUserDropdown"
                  class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                  role="menu"
                >
                  <div class="py-1">
                    <div class="px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                      <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {{ user.name }}
                      </p>
                      <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {{ user.email }}
                      </p>
                    </div>
                    <NuxtLink
                      to="/auth/settings"
                      class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                      role="menuitem"
                      @click="showUserDropdown = false"
                    >
                      <Icon name="mdi:cog" size="18" />
                      Settings
                    </NuxtLink>
                    <button
                      class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                      role="menuitem"
                      @click="handleSignOut"
                    >
                      <Icon name="mdi:logout" size="18" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
            <div v-else class="flex items-center">
              <button
                class="px-3 py-1.5 rounded-md bg-sky-700 dark:bg-sky-600 hover:bg-sky-800 dark:hover:bg-sky-700 text-white text-sm font-semibold transition-colors flex items-center gap-2"
                title="Login"
                aria-label="Login"
                @click="openLoginModal"
              >
                <Icon name="mdi:login" size="18" />
                <span>Login</span>
              </button>
            </div>
            <template #fallback>
              <Icon name="svg-spinners:180-ring" size="20" />
            </template>
          </ClientOnly>

          <!-- Theme Toggle -->
          <ClientOnly>
            <button
              v-if="colorMode.value === 'light'"
              name="light-mode"
              title="Light"
              class="hover:scale-110 transition-all ease-out hover:cursor-pointer"
              @click="onClick('dark')"
            >
              <Icon name="icon-park:moon" size="20" />
            </button>
            <button
              v-if="colorMode.value === 'dark'"
              name="dark-mode"
              title="Dark"
              class="hover:scale-110 transition-all ease-out hover:cursor-pointer"
              @click="onClick('light')"
            >
              <Icon name="noto:sun" size="20" />
            </button>
            <template #fallback>
              <Icon name="svg-spinners:180-ring" size="20" />
            </template>
          </ClientOnly>
        </div>
      </nav>

      <!-- Mobile: Hamburger menu button -->
      <div class="flex md:hidden items-center justify-end flex-1 ml-2 mobile-menu-container">
        <button
          class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation"
          style="touch-action: manipulation; min-width: 44px; min-height: 44px"
          :aria-label="showMobileMenu ? 'Close menu' : 'Open menu'"
          :aria-expanded="showMobileMenu"
          @click="toggleMobileMenu"
        >
          <Icon
            :name="showMobileMenu ? 'mdi:close' : 'mdi:menu'"
            size="24"
            class="text-zinc-700 dark:text-zinc-300"
          />
        </button>

        <!-- Mobile slide-out menu -->
        <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 translate-x-full"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 translate-x-0"
          leave-to-class="opacity-0 translate-x-full"
        >
          <div
            v-if="showMobileMenu"
            class="fixed inset-0 z-50 flex justify-end md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/50" aria-hidden="true" @click="closeMobileMenu" />

            <!-- Menu panel -->
            <div
              class="relative w-full max-w-xs bg-[#F1F2F4] dark:bg-slate-950 shadow-xl flex flex-col"
            >
              <div class="flex items-center justify-between p-4 border-b dark:border-gray-800">
                <span class="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Menu</span>
                <button
                  class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close menu"
                  @click="closeMobileMenu"
                >
                  <Icon name="mdi:close" size="24" />
                </button>
              </div>

              <nav class="flex flex-col p-4 gap-1 overflow-y-auto">
                <NuxtLink
                  to="/blogs"
                  class="px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation text-base font-medium"
                  :class="{ 'bg-gray-200 dark:bg-slate-800 font-semibold': isActive('/blogs') }"
                  @click="closeMobileMenu"
                >
                  Blogs
                </NuxtLink>
                <NuxtLink
                  to="/personalSpace"
                  class="px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation text-base font-medium"
                  :class="{
                    'bg-gray-200 dark:bg-slate-800 font-semibold': isActive('/personalSpace'),
                  }"
                  @click="closeMobileMenu"
                >
                  LifeLines
                </NuxtLink>
                <NuxtLink
                  to="/library"
                  class="px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation text-base font-medium"
                  :class="{ 'bg-gray-200 dark:bg-slate-800 font-semibold': isActive('/library') }"
                  @click="closeMobileMenu"
                >
                  Library
                </NuxtLink>
                <NuxtLink
                  to="/dev"
                  class="px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation text-base font-medium flex items-center gap-2"
                  :class="{ 'bg-gray-200 dark:bg-slate-800 font-semibold': isActive('/dev') }"
                  @click="closeMobileMenu"
                >
                  <Icon name="mdi:tools" size="20" />
                  Utilities
                </NuxtLink>
                <NuxtLink
                  to="/about"
                  class="px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation text-base font-medium"
                  :class="{
                    'bg-gray-200 dark:bg-slate-800 font-semibold': $route.path === '/about',
                  }"
                  @click="closeMobileMenu"
                >
                  About
                </NuxtLink>

                <div class="border-t dark:border-gray-800 my-2" />

                <!-- Theme toggle in menu -->
                <div class="px-4 py-3 flex items-center justify-between">
                  <span class="text-base font-medium text-zinc-700 dark:text-zinc-300">Theme</span>
                  <ClientOnly>
                    <button
                      v-if="colorMode.value === 'light'"
                      class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Switch to dark mode"
                      @click="onClick('dark')"
                    >
                      <Icon name="icon-park:moon" size="22" />
                    </button>
                    <button
                      v-else
                      class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Switch to light mode"
                      @click="onClick('light')"
                    >
                      <Icon name="noto:sun" size="22" />
                    </button>
                    <template #fallback>
                      <Icon name="svg-spinners:180-ring" size="22" />
                    </template>
                  </ClientOnly>
                </div>

                <!-- Auth in menu -->
                <div class="px-4 py-3 border-t dark:border-gray-800">
                  <ClientOnly>
                    <div v-if="isAuthenticated && user" class="user-dropdown-container">
                      <div
                        class="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-200/50 dark:bg-slate-800/50"
                      >
                        <img
                          v-if="user.picture"
                          :src="user.picture"
                          :alt="user.name"
                          class="w-10 h-10 rounded-full border-2 border-sky-700 dark:border-sky-400"
                        />
                        <div class="flex-1 min-w-0">
                          <p
                            class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate"
                          >
                            {{ user.name }}
                          </p>
                          <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {{ user.email }}
                          </p>
                        </div>
                      </div>
                      <NuxtLink
                        to="/auth/settings"
                        class="block px-4 py-3 mt-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors text-base font-medium"
                        @click="closeMobileMenu"
                      >
                        <span class="flex items-center gap-2">
                          <Icon name="mdi:cog" size="20" />
                          Settings
                        </span>
                      </NuxtLink>
                      <button
                        class="w-full text-left px-4 py-3 mt-1 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors text-base font-medium text-red-600 dark:text-red-400 flex items-center gap-2"
                        @click="
                          handleSignOut()
                          closeMobileMenu()
                        "
                      >
                        <Icon name="mdi:logout" size="20" />
                        Sign Out
                      </button>
                    </div>
                    <button
                      v-else
                      class="w-full px-4 py-3 rounded-lg bg-sky-700 dark:bg-sky-600 hover:bg-sky-800 dark:hover:bg-sky-700 text-white text-base font-semibold transition-colors flex items-center justify-center gap-2"
                      @click="
                        openLoginModal()
                        closeMobileMenu()
                      "
                    >
                      <Icon name="mdi:login" size="22" />
                      Login
                    </button>
                    <template #fallback>
                      <div class="px-4 py-3">
                        <Icon name="svg-spinners:180-ring" size="24" />
                      </div>
                    </template>
                  </ClientOnly>
                </div>
              </nav>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Login Modal -->
    <AuthLoginModal :is-open="showLoginModal" @close="closeLoginModal" />
  </div>
</template>
