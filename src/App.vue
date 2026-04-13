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
    <div
      v-if="paletteDragActive && paletteDragItem"
      class="palette-drag-ghost"
      :style="{ left: paletteDragPos.x + 'px', top: paletteDragPos.y + 'px', width: (cellSize * state.zoom) + 'px', height: (cellSize * state.zoom) + 'px' }"
    >
      <img v-if="isImageIcon(paletteDragItem.icon)" :src="get2DApplianceIcon(paletteDragItem.id)" />
      <span v-else style="font-size:1.8em">{{ paletteDragItem.icon }}</span>
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
    const { loadGridFromState, paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon, cellSize } = useGrid()

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

    return { startAgain, paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon, cellSize, state }
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
.palette-drag-ghost {
  position: fixed;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 9999;
  opacity: 0.85;
  border-radius: 4px;
  border: 2px solid #1f79ff;
  background: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.palette-drag-ghost img { max-width: 100%; max-height: 100%; display: block; }
.main-grid {
  display: flex;
  gap: 10px;
  padding-left: 90px;
  overflow: visible;
  align-items: flex-start;
}
</style>