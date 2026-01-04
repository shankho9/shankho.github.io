export default defineNuxtPlugin(() => {
  // Only run in browser
  if (typeof window === 'undefined') return

  // Prevent right-click context menu on images
  const preventContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.tagName === 'IMG' ||
      target.tagName === 'PICTURE' ||
      target.closest('picture') ||
      target.closest('img')
    ) {
      e.preventDefault()
      return false
    }
  }

  // Prevent drag and drop of images
  const preventDragStart = (e: DragEvent) => {
    const target = e.target as HTMLElement
    if (
      target.tagName === 'IMG' ||
      target.tagName === 'PICTURE' ||
      target.closest('picture') ||
      target.closest('img')
    ) {
      e.preventDefault()
      return false
    }
  }

  // Prevent keyboard shortcuts (Ctrl+S, Ctrl+Shift+I, etc.) only when interacting with images
  const preventKeyboardShortcuts = (e: KeyboardEvent) => {
    // Check if user is interacting with an image
    const target = e.target as HTMLElement
    const activeElement = document.activeElement as HTMLElement

    const isImageInteraction =
      target.tagName === 'IMG' ||
      target.tagName === 'PICTURE' ||
      target.closest('picture') ||
      target.closest('img') ||
      activeElement?.tagName === 'IMG' ||
      activeElement?.closest('picture') ||
      activeElement?.closest('img')

    // Only prevent shortcuts when interacting with images
    if (!isImageInteraction) {
      return
    }

    // Prevent Ctrl+S (Save) when on an image
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      return false
    }
    // Prevent Ctrl+Shift+I (DevTools - can be used to inspect images) when on an image
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      return false
    }
    // Prevent F12 (DevTools) when on an image
    if (e.key === 'F12') {
      e.preventDefault()
      return false
    }
  }

  // Prevent image selection
  const preventSelection = (e: Event) => {
    const target = e.target as HTMLElement
    if (
      target.tagName === 'IMG' ||
      target.tagName === 'PICTURE' ||
      target.closest('picture') ||
      target.closest('img')
    ) {
      e.preventDefault()
      return false
    }
  }

  // Add CSS to disable image dragging and user selection
  const style = document.createElement('style')
  style.textContent = `
    img,
    picture,
    [style*="background-image"] {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
      -khtml-user-drag: none !important;
      -moz-user-drag: none !important;
      -o-user-drag: none !important;
      user-drag: none !important;
      pointer-events: auto !important;
      -webkit-touch-callout: none !important;
    }
    
    /* Prevent image dragging */
    img {
      -webkit-user-drag: none;
      -khtml-user-drag: none;
      -moz-user-drag: none;
      -o-user-drag: none;
      user-drag: none;
    }
    
    /* Disable text selection on images */
    img::selection {
      background: transparent;
    }
    
    img::-moz-selection {
      background: transparent;
    }
  `
  document.head.appendChild(style)

  // Add event listeners
  document.addEventListener('contextmenu', preventContextMenu)
  document.addEventListener('dragstart', preventDragStart)
  document.addEventListener('selectstart', preventSelection)
  document.addEventListener('keydown', preventKeyboardShortcuts)

  // Apply protection to a single image
  const protectImage = (img: HTMLImageElement) => {
    img.setAttribute('draggable', 'false')
    img.style.userSelect = 'none'
    img.style.webkitUserDrag = 'none'
  }

  // Set draggable to false on all existing images (one-time initialization)
  const setImageProtection = () => {
    const images = document.querySelectorAll('img')
    images.forEach(protectImage)
  }

  // Run on load to protect initial images
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setImageProtection)
  } else {
    setImageProtection()
  }

  // Debounce function to limit MutationObserver callback frequency
  let debounceTimer: NodeJS.Timeout | null = null
  const debounceDelay = 250 // 250ms debounce

  // Track protected images to avoid re-processing
  const protectedImages = new WeakSet<HTMLImageElement>()

  // MutationObserver to protect newly added images (debounced and optimized)
  const observer = new MutationObserver((mutations) => {
    // Clear existing debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Debounce the callback to avoid excessive DOM queries
    debounceTimer = setTimeout(() => {
      // Only process newly added images, not all images
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // If the added node is an image, protect it
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            if (element.tagName === 'IMG' && !protectedImages.has(element as HTMLImageElement)) {
              protectImage(element as HTMLImageElement)
              protectedImages.add(element as HTMLImageElement)
            }
            // Also check for images within the added node
            const images = element.querySelectorAll?.('img')
            if (images) {
              images.forEach((img) => {
                if (!protectedImages.has(img)) {
                  protectImage(img)
                  protectedImages.add(img)
                }
              })
            }
          }
        })
      })
    }, debounceDelay)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Fallback interval for images that might be missed (reduced frequency)
  // Only runs every 5 seconds as a safety net, not every 1 second
  let protectionInterval: ReturnType<typeof setInterval> | null = null
  if (import.meta.client) {
    protectionInterval = setInterval(() => {
      // Only check images that aren't already protected
      const images = document.querySelectorAll('img')
      images.forEach((img) => {
        if (!protectedImages.has(img)) {
          protectImage(img)
          protectedImages.add(img)
        }
      })
    }, 5000) // Reduced from 1000ms to 5000ms
  }

  // Cleanup function
  const cleanup = () => {
    // Clear debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    // Clear the interval
    if (protectionInterval) {
      clearInterval(protectionInterval)
    }
    // Remove event listeners
    document.removeEventListener('contextmenu', preventContextMenu)
    document.removeEventListener('dragstart', preventDragStart)
    document.removeEventListener('selectstart', preventSelection)
    document.removeEventListener('keydown', preventKeyboardShortcuts)
    // Disconnect the mutation observer
    observer.disconnect()
    // Remove the style element
    if (style.parentNode) {
      style.parentNode.removeChild(style)
    }
  }

  // Clean up on page unload (for full page reloads)
  // Note: beforeunload doesn't allow async operations, so we use a simple cleanup
  if (import.meta.client) {
    window.addEventListener('beforeunload', () => {
      if (protectionInterval) {
        clearInterval(protectionInterval)
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      observer.disconnect()
    })
  }

  // Return cleanup function for manual invocation
  return {
    provide: {
      imageProtection: {
        disable: cleanup,
      },
    },
  }
})
