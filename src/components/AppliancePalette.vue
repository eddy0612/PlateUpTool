<template>
  <aside class="right-panel" :style="rightPanelStyle">

    <!-- Inventory panel shown when Preview tab is active -->
    <template v-if="isPreviewTab">
      <div class="inventory-panel" :style="{ maxHeight: viewportBoxHeight + 'px' }">
        <div class="inventory-header">
          <span class="inventory-title">Inventory</span>
          <span class="inventory-total-badge">{{ inventoryTotal }} items</span>
        </div>
        <div class="inventory-list">
          <div v-for="item in inventoryList" :key="item.id" class="inventory-row">
            <div class="inventory-icon">
              <img v-if="isImageIcon(item.icon)" :src="item.icon" :alt="item.label" />
              <span v-else class="inventory-icon-emoji">{{ item.icon }}</span>
            </div>
            <span class="inventory-count-badge">{{ item.count }}</span>
            <span class="inventory-multiply">×</span>
            <span class="inventory-name">{{ item.label }}</span>
          </div>
          <div v-if="inventoryList.length === 0" class="inventory-empty">
            No appliances placed yet
          </div>
        </div>
      </div>
    </template>

    <!-- Normal / Structure panel -->
    <template v-else>
      <div class="side-panel-wrapper" :style="{ height: viewportBoxHeight + 'px' }">
      <div class="side-box">

        <!-- Structure mode: tool selector -->
        <template v-if="isStructureMode">
          <div class="structure-header">Draw structure</div>
          <div class="structure-tool-list">
            <div
              v-for="tool in structureTools"
              :key="tool.id"
              :class="['structure-tool-item', { active: selectedStructureTool === tool.id }]"
              @click="setStructureTool(tool.id)"
            >
              <div :class="['tool-swatch', `swatch-${tool.id}`]"></div>
              <div class="tool-info">
                <div class="tool-name">{{ tool.label }}</div>
                <div class="tool-desc">{{ tool.description }}</div>
              </div>
            </div>
          </div>
          <div class="structure-hint">Click near a cell edge to place or remove.</div>
        </template>

        <!-- Normal mode: filter + appliance palette -->
        <template v-else>
          <div class="filter">
            <input v-model="state.filterText" placeholder="Filter appliances..." />
          </div>

          <div class="palette" :style="paletteGridStyle">
            <div
              v-for="item in filteredPalette"
              :key="item.id"
              class="palette-item"
              @click="onPaletteItemClick(item)"
              @mousedown="onPaletteItemMouseDown(item, $event)"
            >
              <div class="item-icon">
                <canvas :data-icon="item.icon" class="palette-canvas"></canvas>
              </div>
              <div>{{ item.label }}</div>
            </div>
          </div>
        </template>

      </div>

      <div v-if="!isStructureMode" class="side-controls">
        <div class="clipboard-row">
          <button @click="cutToClipboard">Cut</button>
          <button @click="copyToClipboard">Copy</button>
          <button @click="startPaste">Paste</button>
          <button @click="removeSelected">Delete</button>
        </div>
        <button class="fill-all-button" @click="addAllToGrid">Fill All (Testing)</button>
      </div>
      </div>
    </template>

  </aside>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRestaurantStore } from '../store/restaurant'
import { useAppliancePalette } from '../composables/useAppliancePalette'
import { useGrid } from '../composables/useGrid'

export default {
  name: 'AppliancePalette',
  setup() {
    const { state } = useRestaurantStore()
    const { palette } = useAppliancePalette()
    const { addToGrid, viewportBoxHeight, removeSelected, selectedCells, copyToClipboard, cutToClipboard, startPaste, isStructureMode, selectedStructureTool, setStructureTool, flatGrid, isImageIcon, startPaletteDrag, updatePaletteDrag, commitPaletteDrag } = useGrid()

    const structureTools = [
      { id: 'wall',  label: 'Wall',  description: 'Full-height wall',  },
      { id: 'hatch', label: 'Hatch', description: 'Half-height wall',  },
      { id: 'door',  label: 'Door',  description: 'Doorway / opening', },
    ]

    const isPreviewTab = computed(() => state.activeTabId === 'complete')

    const filteredPalette = computed(() => {
      const q = state.filterText.trim().toLowerCase()
      if (!q) return palette.value
      return palette.value.filter(item => item.label.toLowerCase().includes(q))
    })

    const inventoryList = computed(() => {
      const counts = {}
      for (const { cell } of flatGrid.value) {
        if (cell?.applianceId) {
          counts[cell.applianceId] = (counts[cell.applianceId] || 0) + 1
        }
      }
      return Object.entries(counts)
        .map(([id, count]) => {
          const p = palette.value.find(a => a.id === id)
          return { id, count, label: p?.label || id, icon: p?.icon || '' }
        })
        .sort((a, b) => b.count - a.count)
    })

    const inventoryTotal = computed(() => inventoryList.value.reduce((s, i) => s + i.count, 0))

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

    async function redrawPaletteCanvases() {
      await nextTick()
      document.querySelectorAll('.palette-item canvas').forEach(canvas => {
        cropAndDrawImage(canvas, canvas.dataset.icon)
      })
    }

    watch(filteredPalette, redrawPaletteCanvases, { immediate: true })

    watch(isStructureMode, (val) => {
      if (!val) redrawPaletteCanvases()
    })

    watch(isPreviewTab, (val) => {
      if (!val) redrawPaletteCanvases()
    })

    function addAllToGrid() {
      for (const item of palette.value) {
        addToGrid(item)
      }
    }

    // Responsive palette columns: ~30% of screen width, snapping 1-3 cols, icon size fixed at 120px
    const ICON_SIZE = 120
    const ICON_GAP = 8
    const SIDE_BOX_INSET = 22  // 10px padding + 1px border, each side = 22 total

    const windowWidth = ref(window.innerWidth)
    function onWindowResize() { windowWidth.value = window.innerWidth }
    onMounted(() => window.addEventListener('resize', onWindowResize))
    onUnmounted(() => window.removeEventListener('resize', onWindowResize))

    const paletteColumns = computed(() => {
      const available = windowWidth.value * 0.20
      return Math.max(1, Math.min(3, Math.floor(available / (ICON_SIZE + ICON_GAP))))
    })

    const rightPanelStyle = computed(() => {
      const cols = paletteColumns.value
      const w = cols * ICON_SIZE + (cols - 1) * ICON_GAP + SIDE_BOX_INSET
      return { flex: `0 0 ${w}px`, width: `${w}px`, maxWidth: 'none', minWidth: '0' }
    })

    const paletteGridStyle = computed(() => ({
      gridTemplateColumns: `repeat(${paletteColumns.value}, ${ICON_SIZE}px)`
    }))

    const suppressNextClick = ref(false)

    function onPaletteItemClick(item) {
      if (suppressNextClick.value) { suppressNextClick.value = false; return }
      addToGrid(item)
    }

    function onPaletteItemMouseDown(item, e) {
      if (e.button !== 0) return
      if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
      const startX = e.clientX, startY = e.clientY
      let dragStarted = false

      function onMove(e) {
        if (!dragStarted) {
          const dx = e.clientX - startX
          const dy = e.clientY - startY
          if (Math.sqrt(dx * dx + dy * dy) > 5) {
            dragStarted = true
            startPaletteDrag(item)
          }
        }
        if (dragStarted) updatePaletteDrag(e.clientX, e.clientY)
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        if (dragStarted) {
          suppressNextClick.value = true
          commitPaletteDrag()
        }
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }

    return { state, filteredPalette, addToGrid, addAllToGrid, cutToClipboard, copyToClipboard, startPaste, removeSelected, viewportBoxHeight, isStructureMode, selectedStructureTool, setStructureTool, structureTools, isPreviewTab, inventoryList, inventoryTotal, isImageIcon, onPaletteItemClick, onPaletteItemMouseDown, rightPanelStyle, paletteGridStyle }
  }
}
</script>

<style scoped>
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  flex-shrink: 0;
}
.side-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.side-box {
  border: 1px solid #c8d1dc;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.side-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}
.fill-all-button {
  width: 100%;
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  background: #5a7fc2;
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
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
  grid-template-columns: repeat(2, 120px);
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

/* ---- Structure mode palette ---- */
.structure-header {
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a3030;
  padding-bottom: 4px;
  border-bottom: 1px solid #eecaca;
}
.structure-tool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.structure-tool-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 2px solid #d8dde8;
  border-radius: 8px;
  cursor: pointer;
  background: #f8f9fb;
  transition: border-color 0.12s, background 0.12s;
  user-select: none;
}
.structure-tool-item.active {
  border-color: #1f79ff;
  background: #e8f0ff;
}
.structure-tool-item:hover:not(.active) {
  border-color: #9ab0cc;
  background: #f0f3f8;
}
.tool-swatch {
  width: 18px;
  height: 44px;
  border-radius: 3px;
  flex-shrink: 0;
}
.swatch-wall  { background: #1a1a2e }
.swatch-hatch {
  background: repeating-linear-gradient(
    45deg, #555 0px, #555 4px, transparent 4px, transparent 8px
  );
  border: 1px solid #555;
}
.swatch-door  { background: #c8860a }
.tool-name { font-weight: 600; font-size: 15px; color: #222 }
.tool-desc { font-size: 12px; color: #777; margin-top: 2px }
.structure-hint {
  font-size: 11px;
  color: #999;
  font-style: italic;
  text-align: center;
  padding-top: 4px;
}

/* ---- Inventory panel (Preview tab) ---- */
.inventory-panel {
  border: 1px solid #c8d1dc;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.inventory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 9px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.inventory-title {
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #3a4a5c;
}
.inventory-total-badge {
  background: #e8f0fe;
  color: #1a56db;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 12px;
}
.inventory-list {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.inventory-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 6px;
  border-radius: 6px;
  transition: background 0.1s;
}
.inventory-row:hover {
  background: #f0f4f8;
}
.inventory-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dde3ea;
  border-radius: 5px;
  background: #f7f9fb;
  overflow: hidden;
}
.inventory-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.inventory-icon-emoji {
  font-size: 22px;
  line-height: 1;
}
.inventory-count-badge {
  background: #1f79ff;
  color: white;
  font-size: 13px;
  font-weight: 700;
  min-width: 28px;
  text-align: center;
  padding: 2px 7px;
  border-radius: 12px;
  flex-shrink: 0;
}
.inventory-multiply {
  color: #8a9ab0;
  font-size: 13px;
  flex-shrink: 0;
}
.inventory-name {
  font-size: 13px;
  color: #2c3e50;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inventory-empty {
  text-align: center;
  color: #9fadbf;
  font-style: italic;
  font-size: 13px;
  padding: 28px 0;
}
</style>
