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

  // Prevent keyboard shortcuts (Ctrl+S, Ctrl+Shift+I, etc.)
  const preventKeyboardShortcuts = (e: KeyboardEvent) => {
    // Prevent Ctrl+S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      return false
    }
    // Prevent Ctrl+Shift+I (DevTools - can be used to inspect images)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      return false
    }
    // Prevent F12 (DevTools)
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

  // Also prevent on dynamically loaded images
  const observer = new MutationObserver(() => {
    // Re-apply protection to newly added images
    const images = document.querySelectorAll('img')
    images.forEach((img) => {
      img.setAttribute('draggable', 'false')
      img.style.userSelect = 'none'
      img.style.webkitUserDrag = 'none'
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Set draggable to false on all existing images
  const setImageProtection = () => {
    const images = document.querySelectorAll('img')
    images.forEach((img) => {
      img.setAttribute('draggable', 'false')
      img.style.userSelect = 'none'
      img.style.webkitUserDrag = 'none'
    })
  }

  // Run on load and after a delay to catch dynamically loaded images
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setImageProtection)
  } else {
    setImageProtection()
  }

  // Also run periodically to catch images loaded after initial page load (e.g., ImageKit images)
  // Store interval ID so it can be cleared on cleanup
  const protectionInterval = setInterval(setImageProtection, 1000)

  // Cleanup on unmount (though this is unlikely in a SPA)
  return {
    provide: {
      imageProtection: {
        disable: () => {
          // Clear the interval to prevent memory leaks
          clearInterval(protectionInterval)
          // Remove event listeners
          document.removeEventListener('contextmenu', preventContextMenu)
          document.removeEventListener('dragstart', preventDragStart)
          document.removeEventListener('selectstart', preventSelection)
          document.removeEventListener('keydown', preventKeyboardShortcuts)
          // Disconnect the mutation observer
          observer.disconnect()
        },
      },
    },
  }
})
