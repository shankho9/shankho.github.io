<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLikeStore } from '~/composables/useLikeStore'

const props = defineProps<{
  postId: string
}>()

const animating = ref(false)
const showFloating = ref(false)
const floatingText = ref('')

const { get, set, toggle } = useLikeStore(props.postId)
const state = computed(() => get())
const liked = computed(() => state.value.liked)
const likeCount = computed(() => state.value.count ?? 0)

onMounted(async () => {
  const storedLiked = localStorage.getItem(`likes-${props.postId}`)
  const parsedLiked = storedLiked === 'true'

  try {
    const response = await $fetch(`/api/get-likes?postId=${props.postId}`)
    const count = typeof response.count === 'number' ? response.count : 0
    set(parsedLiked, count)
  } catch (err) {
    console.warn('Failed to load like count', err)
    set(parsedLiked, 0)
  }
})

const toggleLike = async () => {
  const prevLiked = liked.value
  const prevCount = likeCount.value

  // Prepare animation text
  floatingText.value = liked.value ? '-1 💔' : '+1 ❤️'

  // Toggle like in global store
  toggle()
  localStorage.setItem(`likes-${props.postId}`, liked.value.toString())

  // Animate heart and floating
  animating.value = true
  showFloating.value = true
  setTimeout(() => {
    animating.value = false
    showFloating.value = false
  }, 800)

  try {
    await $fetch('/api/like', {
      method: 'POST',
      body: {
        postId: props.postId,
        action: liked.value ? 'like' : 'unlike',
      },
    })
  } catch (err) {
    console.warn('API failed:', err)
    set(prevLiked, prevCount)
    localStorage.setItem(`likes-${props.postId}`, prevLiked.toString())
  }
}
</script>

<template>
  <div class="like-wrapper">
    <button class="like-btn" :class="{ liked, animating }" @click="toggleLike">
      <span class="heart-icon">❤</span>
      <span class="like-count" :class="{ pop: animating }">{{ likeCount }}</span>
    </button>
    <transition name="float">
      <span v-if="showFloating" class="floating-like">{{ floatingText }}</span>
    </transition>
  </div>
</template>

<style scoped>
.like-wrapper {
  position: relative;
  display: inline-block;
}

.like-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: transform 0.2s ease-in-out;
}
.like-btn:hover {
  transform: scale(1.1);
}
.heart-icon {
  font-size: 22px;
  transition: color 0.3s ease-in-out;
}
.liked .heart-icon {
  color: #e63946;
}
.animating.liked .heart-icon {
  animation: pulse 0.4s ease-in-out;
}
.animating:not(.liked) .heart-icon {
  animation: shake 0.3s ease-in-out;
}
.like-count {
  color: #b22222;
  font-weight: bold;
  transition: transform 0.3s;
}
.pop {
  animation: pop 0.3s ease-in-out;
}
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.4);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-2px);
  }
  50% {
    transform: translateX(2px);
  }
  75% {
    transform: translateX(-1px);
  }
}
@keyframes pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.6);
  }
  100% {
    transform: scale(1);
  }
}
.floating-like {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  color: #e63946;
  font-weight: bold;
  animation: floatUp 0.8s ease-out;
  pointer-events: none;
  white-space: nowrap;
}
@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-30px);
  }
}
</style>
