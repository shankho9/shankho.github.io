<script setup lang="ts">
import { navbarData } from '../../data'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useGoogleAuth } from '~/composables/useGoogleAuth'
import { trackLogin } from '~/utils/analytics/trackLogin'

const colorMode = useColorMode()
function onClick(val: string) {
  colorMode.preference = val
}

const route = useRoute()
function isActive(path: string) {
  return route.path.startsWith(path)
}

// Authentication
const { user, isAuthenticated, signOut, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()

// Dropdown state
const showUserDropdown = ref(false)
const showMobileMenu = ref(false)
const isTogglingMenu = ref(false)

const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value
}

const toggleMobileMenu = (event?: Event) => {
  // Prevent event propagation to avoid immediate closure
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  isTogglingMenu.value = true
  showMobileMenu.value = !showMobileMenu.value
  // Reset toggle flag after a brief delay
  setTimeout(() => {
    isTogglingMenu.value = false
  }, 100)
}

const handleSignOut = () => {
  signOut()
  showUserDropdown.value = false
}

const handleGoogleSignIn = async () => {
  if (typeof window === 'undefined') return

  // Ensure Google script is loaded
  if (!window.google) {
    initializeGoogleSignIn()
    // Wait for script to load
    await new Promise<void>((resolve) => {
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle)
          resolve()
        }
      }, 100)
      setTimeout(() => {
        clearInterval(checkGoogle)
        resolve()
      }, 5000)
    })
  }

  if (!window.google) {
    console.error('[Header] Google Identity Services failed to load')
    return
  }

  const clientId = useRuntimeConfig().public.googleClientId
  if (!clientId) {
    console.error('[Header] Google Client ID not configured')
    return
  }

  // Create or get hidden button element
  let buttonElement = document.getElementById('header-hidden-google-signin')
  if (!buttonElement) {
    buttonElement = document.createElement('div')
    buttonElement.id = 'header-hidden-google-signin'
    buttonElement.style.display = 'none'
    document.body.appendChild(buttonElement)
  }

  // Clear any existing button
  buttonElement.innerHTML = ''

  // Initialize Google Sign-In
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
        user.value = result.user
        localStorage.setItem('google_user', JSON.stringify(result.user))

        // Track login event for analytics
        if (typeof window !== 'undefined') {
          await trackLogin(result.user.email, result.user.name, window.location.pathname)
        }

        // Dispatch custom event to notify all components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
        }

        // Clean up hidden button after successful login
        if (buttonElement && buttonElement.parentNode) {
          buttonElement.parentNode.removeChild(buttonElement)
        }
      } catch (error) {
        console.error('[Header] Authentication failed:', error)
      }
    },
  })

  // Render button in hidden element
  window.google.accounts.id.renderButton(buttonElement, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    width: 250,
  })

  // Programmatically click the rendered button
  nextTick(() => {
    const googleButton = buttonElement?.querySelector('div[role="button"]') as HTMLElement
    if (googleButton) {
      googleButton.click()
    } else if (window.google?.accounts?.id) {
      // Fallback: try prompt if button click doesn't work
      window.google.accounts.id.prompt(() => {
        // Callback for prompt notification
      })
    }
  })
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent | TouchEvent) => {
  // Don't close if we're in the process of toggling
  if (isTogglingMenu.value) {
    return
  }

  const target = event.target as HTMLElement
  if (!target.closest('.user-dropdown-container')) {
    showUserDropdown.value = false
  }
  // Only close mobile menu if clicking outside both the menu and the button
  if (!target.closest('.mobile-menu-container') && !target.closest('.mobile-menu-button')) {
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
    // Create a synthetic event-like object with the captured target
    // This avoids accessing the original event object which may have been reused
    const syntheticEvent = {
      target,
    } as MouseEvent | TouchEvent

    handleClickOutside(syntheticEvent)
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

// Initialize auth on mount
onMounted(() => {
  initializeGoogleSignIn()
  loadStoredUser()
})
</script>

<template>
  <div class="py-3 sm:py-5 border-b dark:border-gray-800 font-semibold">
    <div class="flex px-4 sm:px-6 container max-w-5xl justify-between mx-auto items-center">
      <!-- Logo/Title -->
      <div class="flex items-center">
        <NuxtLink
          to="/"
          class="text-3xl sm:text-4xl md:text-5xl font-bold hover:opacity-80 transition-opacity"
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
                title="Sign in with Google"
                aria-label="Sign in with Google"
                @click="handleGoogleSignIn"
              >
                <Icon name="mdi:google" size="18" />
                <span>Sign in</span>
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

      <!-- Mobile Menu Button -->
      <div class="flex md:hidden items-center space-x-2">
        <ClientOnly>
          <!-- Theme Toggle (Mobile) -->
          <button
            v-if="colorMode.value === 'light'"
            name="light-mode"
            title="Light"
            class="hover:scale-110 transition-all ease-out"
            @click="onClick('dark')"
          >
            <Icon name="icon-park:moon" size="20" />
          </button>
          <button
            v-if="colorMode.value === 'dark'"
            name="dark-mode"
            title="Dark"
            class="hover:scale-110 transition-all ease-out"
            @click="onClick('light')"
          >
            <Icon name="noto:sun" size="20" />
          </button>
          <template #fallback>
            <Icon name="svg-spinners:180-ring" size="20" />
          </template>
        </ClientOnly>

        <button
          class="mobile-menu-button p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors touch-manipulation active:bg-gray-200 dark:active:bg-slate-700"
          style="
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            min-width: 44px;
            min-height: 44px;
          "
          aria-label="Toggle menu"
          :aria-expanded="showMobileMenu"
          @click.stop.prevent="toggleMobileMenu"
        >
          <Icon
            :name="showMobileMenu ? 'mdi:close' : 'mdi:menu'"
            size="24"
            class="text-zinc-700 dark:text-zinc-300"
          />
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showMobileMenu"
        class="mobile-menu-container md:hidden border-t dark:border-gray-800 bg-[#F1F2F4] dark:bg-slate-950"
      >
        <div class="px-4 py-3 space-y-2">
          <NuxtLink
            to="/blogs"
            class="block px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation"
            style="touch-action: manipulation"
            :class="{ 'bg-gray-200 dark:bg-slate-800': isActive('/blogs') }"
            @click.stop="showMobileMenu = false"
          >
            Blogs
          </NuxtLink>
          <NuxtLink
            to="/personalSpace"
            class="block px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation"
            style="touch-action: manipulation"
            :class="{ 'bg-gray-200 dark:bg-slate-800': isActive('/personalSpace') }"
            @click.stop="showMobileMenu = false"
          >
            LifeLines
          </NuxtLink>
          <NuxtLink
            to="/library"
            class="block px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation"
            style="touch-action: manipulation"
            :class="{ 'bg-gray-200 dark:bg-slate-800': isActive('/library') }"
            @click.stop="showMobileMenu = false"
          >
            Library
          </NuxtLink>
          <NuxtLink
            to="/about"
            class="block px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors touch-manipulation"
            style="touch-action: manipulation"
            :class="{ 'bg-gray-200 dark:bg-slate-800': $route.path === '/about' }"
            @click.stop="showMobileMenu = false"
          >
            About
          </NuxtLink>

          <!-- Mobile Auth -->
          <div class="pt-2 border-t dark:border-gray-800">
            <ClientOnly>
              <div v-if="isAuthenticated && user" class="px-3 py-2">
                <div class="flex items-center gap-3 mb-3">
                  <img
                    v-if="user.picture"
                    :src="user.picture"
                    :alt="user.name"
                    class="w-10 h-10 rounded-full border-2 border-sky-700 dark:border-sky-400"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {{ user.name }}
                    </p>
                    <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {{ user.email }}
                    </p>
                  </div>
                </div>
                <button
                  class="w-full px-3 py-2 rounded-md bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  @click="handleSignOut"
                >
                  <Icon name="mdi:logout" size="18" />
                  Sign Out
                </button>
              </div>
              <div v-else class="px-3">
                <button
                  class="w-full px-3 py-2 rounded-md bg-sky-700 dark:bg-sky-600 hover:bg-sky-800 dark:hover:bg-sky-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  @click="handleGoogleSignIn"
                >
                  <Icon name="mdi:google" size="18" />
                  Sign in with Google
                </button>
              </div>
              <template #fallback>
                <div class="px-3 py-2">
                  <Icon name="svg-spinners:180-ring" size="20" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
