/**
 * Client-only plugin to initialize DOMPurify for safe HTML sanitization
 * DOMPurify requires the DOM and only works on the client-side
 */
import DOMPurify from 'dompurify'

export default defineNuxtPlugin(() => {
  // Make DOMPurify available globally on window for components that need it
  if (import.meta.client && typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).DOMPurify = DOMPurify
  }
})
