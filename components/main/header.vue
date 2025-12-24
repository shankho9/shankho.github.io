<script setup lang="ts">
import { navbarData } from '../../data'
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGoogleAuth } from '~/composables/useGoogleAuth'
import { trackLogin } from '~/utils/trackLogin'

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

const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value
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
    } else {
      // Fallback: try prompt if button click doesn't work
      window.google.accounts.id.prompt()
    }
  })
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.user-dropdown-container')) {
    showUserDropdown.value = false
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }
})

// Initialize auth on mount
onMounted(() => {
  initializeGoogleSignIn()
  loadStoredUser()
})
</script>

<template>
  <div class="py-5 border-b dark:border-gray-800 font-semibold">
    <div class="flex px-6 container max-w-5xl justify-between mx-auto items-baseline">
      <ul class="flex items-baseline space-x-5">
        <li class="text-base sm:text-2xl font-bold">
          <NuxtLink to="/" :class="{ underline: $route.path === '/' }">
            {{ navbarData.homeTitle }}
          </NuxtLink>
        </li>
      </ul>
      <ul class="flex items-center space-x-3 sm:space-x-6 text-sm sm:text-lg">
        <li>
          <NuxtLink to="/blogs" :class="{ underline: isActive('/blogs') }"> Blogs </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/personalSpace" :class="{ underline: isActive('/personalSpace') }">
            LifeLines
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/library" :class="{ underline: isActive('/library') }"> Library </NuxtLink>
        </li>
        <li title="About Me">
          <NuxtLink
            to="/about"
            aria-label="About me"
            :class="{ underline: $route.path === '/about' }"
          >
            About
          </NuxtLink>
        </li>
        <li>
          <ClientOnly>
            <!-- User Profile / Sign In -->
            <div v-if="isAuthenticated && user" class="user-dropdown-container relative">
              <button
                @click="toggleUserDropdown"
                class="flex items-center gap-2 hover:opacity-80 transition-opacity"
                aria-label="User menu"
              >
                <img
                  v-if="user.picture"
                  :src="user.picture"
                  :alt="user.name"
                  class="w-8 h-8 rounded-full border-2 border-sky-700 dark:border-sky-400"
                />
                <span
                  class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 hidden sm:inline"
                >
                  {{ user.name }}
                </span>
                <Icon
                  name="mdi:chevron-down"
                  size="18"
                  class="text-zinc-600 dark:text-zinc-400 hidden sm:inline transition-transform"
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
                      @click="handleSignOut"
                      class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                      role="menuitem"
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
                @click="handleGoogleSignIn"
                class="px-3 py-1.5 rounded-md bg-sky-700 dark:bg-sky-600 hover:bg-sky-800 dark:hover:bg-sky-700 text-white text-sm font-semibold transition-colors flex items-center gap-2"
                title="Sign in with Google"
                aria-label="Sign in with Google"
              >
                <Icon name="mdi:google" size="18" />
                <span>Sign in</span>
              </button>
            </div>
            <template #fallback>
              <!-- this will be rendered on server side -->
              <Icon name="svg-spinners:180-ring" size="20" />
            </template>
          </ClientOnly>
        </li>
        <li>
          <ClientOnly>
            <!-- Theme Toggle -->
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
              <!-- this will be rendered on server side -->
              <Icon name="svg-spinners:180-ring" size="20" />
            </template>
          </ClientOnly>
        </li>
      </ul>
    </div>
  </div>
</template>
