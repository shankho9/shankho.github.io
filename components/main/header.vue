<script setup lang="ts">
import { navbarData } from '../../data'
import { ref, onMounted, onUnmounted } from 'vue'
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

const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value
}

const handleSignOut = () => {
  signOut()
  showUserDropdown.value = false
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

      <!-- Mobile Navigation & Controls -->
      <div class="flex md:hidden items-center space-x-1.5 flex-1 justify-end ml-2">
        <!-- Mobile Navigation Links -->
        <nav class="flex items-center space-x-1 text-xs">
          <NuxtLink
            to="/blogs"
            class="px-2 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation whitespace-nowrap"
            style="touch-action: manipulation"
            :class="{ 'bg-gray-200 dark:bg-slate-800 font-semibold': isActive('/blogs') }"
          >
            Blogs
          </NuxtLink>
          <NuxtLink
            to="/personalSpace"
            class="px-2 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation whitespace-nowrap"
            style="touch-action: manipulation"
            :class="{ 'bg-gray-200 dark:bg-slate-800 font-semibold': isActive('/personalSpace') }"
          >
            LifeLines
          </NuxtLink>
          <NuxtLink
            to="/library"
            class="px-2 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation whitespace-nowrap"
            style="touch-action: manipulation"
            :class="{ 'bg-gray-200 dark:bg-slate-800 font-semibold': isActive('/library') }"
          >
            Library
          </NuxtLink>
          <NuxtLink
            to="/about"
            class="px-2 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation whitespace-nowrap"
            style="touch-action: manipulation"
            :class="{ 'bg-gray-200 dark:bg-slate-800 font-semibold': $route.path === '/about' }"
          >
            About
          </NuxtLink>
        </nav>

        <!-- Theme Toggle (Mobile) -->
        <ClientOnly>
          <button
            v-if="colorMode.value === 'light'"
            name="light-mode"
            title="Light"
            class="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded transition-all touch-manipulation"
            style="touch-action: manipulation; min-width: 32px; min-height: 32px"
            @click="onClick('dark')"
          >
            <Icon name="icon-park:moon" size="18" />
          </button>
          <button
            v-if="colorMode.value === 'dark'"
            name="dark-mode"
            title="Dark"
            class="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded transition-all touch-manipulation"
            style="touch-action: manipulation; min-width: 32px; min-height: 32px"
            @click="onClick('light')"
          >
            <Icon name="noto:sun" size="18" />
          </button>
          <template #fallback>
            <Icon name="svg-spinners:180-ring" size="18" />
          </template>
        </ClientOnly>

        <!-- Mobile Auth (Compact) -->
        <ClientOnly>
          <div v-if="isAuthenticated && user" class="user-dropdown-container relative">
            <button
              class="flex items-center hover:opacity-80 transition-opacity touch-manipulation p-1"
              style="touch-action: manipulation; min-width: 32px; min-height: 32px"
              aria-label="User menu"
              @click="toggleUserDropdown"
            >
              <img
                v-if="user.picture"
                :src="user.picture"
                :alt="user.name"
                class="w-6 h-6 rounded-full border-2 border-sky-700 dark:border-sky-400"
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
          <button
            v-else
            class="px-2 py-1 rounded-md bg-sky-700 dark:bg-sky-600 hover:bg-sky-800 dark:hover:bg-sky-700 text-white text-xs font-semibold transition-colors touch-manipulation whitespace-nowrap"
            style="touch-action: manipulation; min-height: 32px"
            title="Login"
            aria-label="Login"
            @click="openLoginModal"
          >
            Login
          </button>
          <template #fallback>
            <Icon name="svg-spinners:180-ring" size="18" />
          </template>
        </ClientOnly>
      </div>
    </div>

    <!-- Login Modal -->
    <AuthLoginModal :is-open="showLoginModal" @close="closeLoginModal" />
  </div>
</template>
