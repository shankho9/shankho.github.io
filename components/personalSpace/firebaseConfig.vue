// firebaseConfig.vue
<template>
  <div>
    <h1>Firebase Analytics Example</h1>
    <h3>Check your Firebase Analytics dashboard to see events</h3>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { analytics } from '../firebaseConfig'; // Import the analytics instance

export default {
  setup() {
    onMounted(() => {
      console.log('Firebase analytics initialized example:', analytics);
    });
  },
};
</script>

<style scoped>
h1 {
  color: #da2e2e;
}
</style>
