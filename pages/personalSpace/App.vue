// App.vue
<template>
  <div id="app">
    <FirebaseComponent />
  </div>
</template>

<script>
import FirebaseComponent from './components/personalSpace/firebaseComponent.vue'

export default {
  name: 'App',
  components: {
    FirebaseComponent,
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  margin-top: 40px;
}
</style>
