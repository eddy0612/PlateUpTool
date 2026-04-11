<template>
  <div class="root">
    <header class="top-bar">
      <h1>PlateUp Tool</h1>
      <button class="reset-button" @click="startAgain">Start Again</button>
    </header>
    <div class="main-grid">
      <GridView />
      <AppliancePalette />
    </div>
  </div>
</template>

<script>
import { watch, onMounted } from 'vue'
import { useRestaurantStore } from './store/restaurant'
import { useGrid } from './composables/useGrid'
import GridView from './components/GridView.vue'
import AppliancePalette from './components/AppliancePalette.vue'

export default {
  name: 'App',
  components: { GridView, AppliancePalette },
  setup() {
    const { state, loadFromHash, syncToHash, resetState } = useRestaurantStore()
    const { loadGridFromState } = useGrid()

    watch(() => ({ ...state }), () => syncToHash(), { deep: true })

    onMounted(() => {
      loadFromHash()
      loadGridFromState()
      if (!window.location.hash.startsWith('#state=')) syncToHash()
      window.addEventListener('hashchange', () => {
        loadFromHash()
        loadGridFromState()
      })
    })

    function startAgain() {
      resetState()
    }

    return { startAgain }
  }
}
</script>

<style>
* { box-sizing: border-box }
body { margin: 0; font-family: sans-serif; }
</style>

<style scoped>
.root { padding: 10px; display: flex; flex-direction: column; min-height: 100vh }
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px }
.top-bar h1 { margin: 0 }
.reset-button { border: none; background: #d9534f; color: white; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer }
.main-grid {
  display: flex;
  gap: 10px;
  padding-left: 90px;
  overflow: visible;
  align-items: flex-start;
}
</style>