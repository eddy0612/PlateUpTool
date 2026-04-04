<template>
  <aside class="right-panel">
    <div class="side-box">

      <div class="filter">
        <input v-model="state.filterText" placeholder="Filter appliances..." />
      </div>

      <div class="palette">
        <div
          v-for="item in filteredPalette"
          :key="item.id"
          class="palette-item"
          @click="addToGrid(item)"
        >
          <div class="item-icon">
            <canvas :data-icon="item.icon" class="palette-canvas"></canvas>
          </div>
          <div>{{ item.label }}</div>
        </div>
      </div>

    </div>

    <div class="side-controls">
      <div>
        <label>W: <input type="number" v-model.number="state.roomWidth" min="2" max="50" style="width:48px" /></label>
        <label>H: <input type="number" v-model.number="state.roomHeight" min="2" max="50" style="width:48px" /></label>
      </div>
      <div class="clipboard-row">
        <button @click="cutSelected">Cut</button>
        <button @click="copySelected">Copy</button>
        <button @click="pasteClipboard">Paste</button>
        <button @click="removeSelected">Delete</button>
      </div>
    </div>

    <div class="status">{{ statusText }}</div>
  </aside>
</template>

<script>
import { computed, watch, nextTick } from 'vue'
import { useRestaurantStore } from '../store/restaurant'
import { useAppliancePalette } from '../composables/useAppliancePalette'
import { useGrid } from '../composables/useGrid'

export default {
  name: 'AppliancePalette',
  setup() {
    const { state } = useRestaurantStore()
    const { palette } = useAppliancePalette()
    const { addToGrid } = useGrid()

    const filteredPalette = computed(() => {
      const q = state.filterText.trim().toLowerCase()
      if (!q) return palette.value
      return palette.value.filter(item => item.label.toLowerCase().includes(q))
    })

    const statusText = computed(() => {
      if (state.selectedIds.length === 0) return 'No items selected'
      return `${state.selectedIds.length} items selected`
    })

    // Canvas image drawing with top-crop
    function cropAndDrawImage(canvas, src) {
      if (!canvas || !src) return
      const ctx = canvas.getContext('2d')
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = function () {
        const cropTop = 50
        const sx = 0, sy = cropTop, sw = img.width, sh = Math.max(img.height - cropTop, 1)
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width || 100
        canvas.height = rect.height || 100
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const croppedAspect = sw / sh
        const canvasAspect = canvas.width / canvas.height
        let dw, dh, dx, dy
        if (croppedAspect > canvasAspect) {
          dw = canvas.width; dh = canvas.width / croppedAspect; dx = 0; dy = (canvas.height - dh) / 2
        } else {
          dh = canvas.height; dw = canvas.height * croppedAspect; dx = (canvas.width - dw) / 2; dy = 0
        }
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
      }
      img.src = src
    }

    watch(filteredPalette, async () => {
      await nextTick()
      document.querySelectorAll('.palette-item canvas').forEach(canvas => {
        cropAndDrawImage(canvas, canvas.dataset.icon)
      })
    }, { immediate: true })

    // Clipboard operations
    function cutSelected() { copySelected(); removeSelected() }

    function copySelected() {
      const tab = state.tabs.find(t => t.id === state.activeTabId)
      if (!tab) return
      state.clipboard = tab.items
        .filter(item => state.selectedIds.includes(item.id))
        .map(i => ({ ...i }))
    }

    function pasteClipboard() {
      if (!state.clipboard?.length) return
      const tab = state.tabs.find(t => t.id === state.activeTabId)
      if (!tab) return
      const pasted = state.clipboard.map(item => ({
        ...item,
        id: `${item.sourceId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x: Math.min(state.roomWidth - 1, (item.x + 1) % state.roomWidth),
        y: Math.min(state.roomHeight - 1, (item.y + 1) % state.roomHeight)
      }))
      tab.items.push(...pasted)
      state.selectedIds = pasted.map(i => i.id)
    }

    function removeSelected() {
      const tab = state.tabs.find(t => t.id === state.activeTabId)
      if (!tab) return
      tab.items = tab.items.filter(item => !state.selectedIds.includes(item.id))
      state.selectedIds = []
    }

    return { state, filteredPalette, statusText, addToGrid, cutSelected, copySelected, pasteClipboard, removeSelected }
  }
}
</script>

<style scoped>
.right-panel {
  flex: 0 0 320px;
  max-width: 340px;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}
.side-box {
  border: 1px solid #c8d1dc;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 70vh;
  max-height: 70vh;
  box-sizing: border-box;
  overflow: hidden;
}
.side-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}
.filter input {
  width: 100%;
  padding: 6px;
  border: 1px solid #b9c8db;
  border-radius: 6px;
  box-sizing: border-box;
}
.palette {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  overflow-y: auto;
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
}
.palette-item {
  border: 1px solid #cbd6e5;
  border-radius: 6px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  aspect-ratio: 1 / 1;
  width: 100%;
  box-sizing: border-box;
}
.item-icon {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  min-height: 0;
}
.palette-canvas {
  width: 100%;
  height: 100%;
  display: block;
  aspect-ratio: 1 / 1;
  max-width: 100%;
  max-height: 100%;
}
.clipboard-row { display: flex; gap: 6px }
.clipboard-row button { flex: 1; padding: 7px; border: none; cursor: pointer; border-radius: 4px; background: #1f79ff; color: white }
.status { font-size: 0.92rem; font-weight: 500 }
</style>
