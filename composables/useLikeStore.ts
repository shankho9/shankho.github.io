// composables/useLikeStore.ts
import { reactive } from 'vue'

const state = reactive<{ [postId: string]: { liked: boolean; count: number } }>({})

export const useLikeStore = (postId: string) => {
  if (!state[postId]) {
    state[postId] = { liked: false, count: 0 }
  }

  const get = () => state[postId]

  const set = (liked: boolean, count: number) => {
    state[postId].liked = liked
    state[postId].count = count
  }

  const toggle = () => {
    const item = state[postId]
    const newLiked = !item.liked
    const newCount = item.count + (newLiked ? 1 : -1)
    state[postId].liked = newLiked
    state[postId].count = Math.max(0, newCount) // never go below 0
  }

  return { get, set, toggle }
}
