<template>
  <section class="left-panel">
    <div style="position:relative; width:100%;">

      <div class="viewport-box">
        <div class="grid" ref="gridEl" :style="gridStyleDynamic" :class="{ 'move-dragging': moveDragActive }" @mousedown="onGridMouseDown" @dragstart.prevent>
          <div
            v-for="cellInfo in flatGrid"
            :key="'cell-' + cellInfo.x + '-' + cellInfo.y"
            :class="cellClasses(cellInfo.x, cellInfo.y)"
            :data-x="cellInfo.x"
            :data-y="cellInfo.y"
            @contextmenu.prevent="rotateCell(cellInfo.x, cellInfo.y)"
            @click="(e) => handleCellClick(e, cellInfo.x, cellInfo.y)"
          >
            <div class="cell-label">{{ cellInfo.y }},{{ cellInfo.x }}</div>
            <template v-if="getDisplayCell(cellInfo.x, cellInfo.y)?.applianceId">
              <span :style="rotationStyle(getDisplayCell(cellInfo.x, cellInfo.y).rotation)">
                <img
                  v-if="isImageIcon(getApplianceIcon(getDisplayCell(cellInfo.x, cellInfo.y).applianceId))"
                  :src="getApplianceIcon(getDisplayCell(cellInfo.x, cellInfo.y).applianceId)"
                  :alt="getDisplayCell(cellInfo.x, cellInfo.y).applianceId"
                  draggable="false"
                  style="max-width:100%;max-height:100%;display:block;"
                />
                <template v-else>{{ getApplianceIcon(getDisplayCell(cellInfo.x, cellInfo.y).applianceId) }}</template>
              </span>
            </template>
          </div>
        </div>
      </div>

      <div class="tabs">
        <div
          v-for="tab in state.tabs"
          :key="tab.id"
          :class="['tab-postit', { active: state.activeTabId === tab.id }]"
          @click="state.activeTabId = tab.id"
        >
          {{ tab.label }}
        </div>
        <div class="tab-postit add" v-if="state.tabs.length < 15" @click="addTab">+</div>
      </div>

    </div>

    <div class="controls">
      <div class="control-compass">
        <span class="compass" :style="{ transform: 'rotate(' + state.orientation + 'deg)' }">🧭</span>
        <span>{{ state.orientation }}°</span>
      </div>
      <div class="control-mode">
        <label><input type="radio" value="2D" v-model="state.viewMode" /> 2D</label>
        <label><input type="radio" value="3D" v-model="state.viewMode" /> 3D</label>
      </div>
      <div class="control-zoom">
        <label>Zoom {{ (state.zoom * 100).toFixed(0) }}%</label>
        <input type="range" min="0.3" max="1.3" step="0.05" v-model.number="state.zoom" />
      </div>
    </div>

    <div
      v-if="isDragging && dragStart && dragEnd"
      class="drag-select-overlay"
      :style="dragRectStyle"
    />
  </section>
</template>

<script>
import { ref, computed, onUnmounted } from 'vue'
import { useRestaurantStore } from '../store/restaurant'
import { useGrid } from '../composables/useGrid'

export default {
  name: 'GridView',
  setup() {
    const { state } = useRestaurantStore()
    const {
      flatGrid, gridStyleDynamic, rotationStyle, getApplianceIcon, isImageIcon,
      rotateCell, selectCell, selectedCells, isSelected, selectCellsInRect, addCellsToSelection,
      moveDragActive, getCellMoveState, getDisplayCell,
      startMoveDrag, updateMoveDragOffset, commitMoveDrag, cancelMoveDrag
    } = useGrid()

    function addTab() {
      if (state.tabs.length >= 15) return
      const nextId = `tab-${Date.now()}`
      state.tabs.push({ id: nextId, label: `Tab ${state.tabs.length + 1}`, items: [] })
      state.activeTabId = nextId
    }

    // --- Shared drag helpers ---
    const gridEl = ref(null)
    const wasDragging = ref(false)

    // --- Select-box drag state ---
    const isDragging = ref(false)
    const dragStart = ref(null)
    const dragEnd = ref(null)

    const dragRectStyle = computed(() => {
      if (!dragStart.value || !dragEnd.value) return {}
      return {
        left: Math.min(dragStart.value.x, dragEnd.value.x) + 'px',
        top: Math.min(dragStart.value.y, dragEnd.value.y) + 'px',
        width: Math.abs(dragEnd.value.x - dragStart.value.x) + 'px',
        height: Math.abs(dragEnd.value.y - dragStart.value.y) + 'px',
      }
    })

    // --- Move drag state ---
    const pendingMoveCell = ref(null)
    const isMoveDragging = ref(false)
    const moveDragStartMouse = ref(null)

    // ---- Event handlers ----

    function handleCellClick(e, x, y) {
      if (wasDragging.value) { wasDragging.value = false; return }
      selectCell(x, y, e.shiftKey, e.ctrlKey || e.metaKey)
    }

    function onGridMouseDown(e) {
      if (e.button !== 0) return

      // If clicking on an already-selected cell without modifiers → potential move drag
      if (!e.shiftKey && !(e.ctrlKey || e.metaKey)) {
        const el = e.target.closest('.grid-item')
        if (el) {
          const cx = parseInt(el.dataset.x)
          const cy = parseInt(el.dataset.y)
          if (isSelected(cx, cy)) {
            pendingMoveCell.value = { x: cx, y: cy }
            moveDragStartMouse.value = { x: e.clientX, y: e.clientY }
            window.addEventListener('mousemove', onWindowMouseMove)
            window.addEventListener('mouseup', onWindowMouseUp)
            return
          }
        }
      }

      // Normal select-box drag
      dragStart.value = { x: e.clientX, y: e.clientY }
      dragEnd.value = { x: e.clientX, y: e.clientY }
      isDragging.value = false
      window.addEventListener('mousemove', onWindowMouseMove)
      window.addEventListener('mouseup', onWindowMouseUp)
    }

    function onWindowMouseMove(e) {
      // --- Move drag path ---
      if (pendingMoveCell.value) {
        const dx = e.clientX - moveDragStartMouse.value.x
        const dy = e.clientY - moveDragStartMouse.value.y
        if (!isMoveDragging.value && Math.sqrt(dx * dx + dy * dy) > 5) {
          isMoveDragging.value = true
          startMoveDrag()
        }
        if (isMoveDragging.value) {
          const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.grid-item')
          if (el && el.dataset.x !== undefined) {
            updateMoveDragOffset(
              parseInt(el.dataset.x) - pendingMoveCell.value.x,
              parseInt(el.dataset.y) - pendingMoveCell.value.y
            )
          }
        }
        return
      }

      // --- Select-box drag path ---
      if (!dragStart.value) return
      const dx = e.clientX - dragStart.value.x
      const dy = e.clientY - dragStart.value.y
      if (!isDragging.value && Math.sqrt(dx * dx + dy * dy) > 5) isDragging.value = true
      if (isDragging.value) dragEnd.value = { x: e.clientX, y: e.clientY }
    }

    function onWindowMouseUp(e) {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup', onWindowMouseUp)

      // --- Move drag path ---
      if (pendingMoveCell.value) {
        if (isMoveDragging.value) {
          commitMoveDrag()
          isMoveDragging.value = false
        }
        // Suppress the click event in both cases (drag or plain click on selected cell)
        wasDragging.value = true
        pendingMoveCell.value = null
        moveDragStartMouse.value = null
        return
      }

      // --- Select-box drag path ---
      if (isDragging.value) {
        finalizeDragSelection(e.ctrlKey || e.metaKey || e.shiftKey)
        wasDragging.value = true
        isDragging.value = false
      }
      dragStart.value = null
      dragEnd.value = null
    }

    function finalizeDragSelection(addToExisting) {
      if (!gridEl.value || !dragStart.value || !dragEnd.value) return
      const rectLeft = Math.min(dragStart.value.x, dragEnd.value.x)
      const rectRight = Math.max(dragStart.value.x, dragEnd.value.x)
      const rectTop = Math.min(dragStart.value.y, dragEnd.value.y)
      const rectBottom = Math.max(dragStart.value.y, dragEnd.value.y)

      const cells = []
      gridEl.value.querySelectorAll('.grid-item').forEach(el => {
        const br = el.getBoundingClientRect()
        const cx = br.left + br.width / 2
        const cy = br.top + br.height / 2
        if (cx >= rectLeft && cx <= rectRight && cy >= rectTop && cy <= rectBottom)
          cells.push({ x: parseInt(el.dataset.x), y: parseInt(el.dataset.y) })
      })

      if (addToExisting) addCellsToSelection(cells)
      else selectCellsInRect(cells)
    }

    function cellClasses(x, y) {
      const move = getCellMoveState(x, y)
      return {
        'grid-item': true,
        selected: isSelected(x, y),
        'move-source': move === 'source',
        'move-preview-valid': move === 'preview-valid',
        'move-preview-invalid': move === 'preview-invalid',
      }
    }

    onUnmounted(() => {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup', onWindowMouseUp)
      cancelMoveDrag()
    })

    return {
      state, flatGrid, gridStyleDynamic, rotationStyle, getApplianceIcon, isImageIcon,
      rotateCell, selectedCells, isSelected, addTab,
      gridEl, isDragging, moveDragActive, dragStart, dragEnd, dragRectStyle,
      handleCellClick, onGridMouseDown, cellClasses, getDisplayCell
    }
  }
}
</script>

<style scoped>
.left-panel {
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: visible;
  padding-left: 0;
  height: auto;
}
.viewport-box {
  background: #f7f8fa;
  border: 1px solid #bfc9d8;
  border-radius: 8px;
  padding: 8px;
  position: relative;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: auto;
  min-width: 0;
  min-height: 0;
}
.grid {
  display: grid;
  gap: 2px;
  background: #e8eef8;
  border: 2px solid #b0c7dd;
  position: relative;
  overflow: auto;
  transform-origin: center;
  min-height: 0;
  min-width: 0;
  flex-shrink: 0;
  user-select: none;
}
.grid::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, transparent 0%, transparent calc(100%/16 - 2px), #c8d6e4 calc(100%/16 - 2px), #c8d6e4 calc(100%/16));
  pointer-events: none;
  z-index: 0;
}
.grid::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 0%, transparent calc(100%/12 - 2px), #c8d6e4 calc(100%/12 - 2px), #c8d6e4 calc(100%/12));
  pointer-events: none;
  z-index: 0;
}
.grid-item {
  z-index: 1;
}
.grid-item {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #c8d6e4;
  box-sizing: border-box;
  position: relative;
}
.grid-item.selected { border: 2px solid #1f79ff; background: #dde9ff }
.grid-item.selected { cursor: grab }
.grid.move-dragging .grid-item { cursor: grabbing }
.grid-item.move-source { opacity: 0.35; border: 2px dashed #1f79ff; background: #dde9ff }
.grid-item.move-preview-valid { border: 2px solid #22a355; background: rgba(34, 163, 85, 0.18) }
.grid-item.move-preview-invalid { border: 2px solid #d93025; background: rgba(217, 48, 37, 0.18) }
.drag-select-overlay {
  position: fixed;
  border: 1.5px solid #1f79ff;
  background: rgba(31, 121, 255, 0.12);
  pointer-events: none;
  z-index: 9999;
}
.cell-label { font-size: 10px; color: #bbb; position: absolute; top: 2px; left: 2px; }
.tabs {
  position: absolute;
  bottom: 16px;
  left: -60px;
  width: 160px;
  max-height: calc(100% - 32px);
  overflow: visible;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  z-index: 100;
  pointer-events: auto;
}
.tab-postit {
  width: 110px;
  min-width: 100px;
  margin-left: 0;
  padding: 8px 12px;
  background: #fff4b2;
  border: 1px solid #e8ce6a;
  border-radius: 4px 4px 6px 6px;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.2);
  cursor: pointer;
  transform-origin: left top;
  transition: transform 0.2s, background 0.2s, border-color 0.2s;
  transform: translateX(-3px) rotate(0deg);
}
.tab-postit.active { margin-left: 10px; z-index: 20; background: #ffe680; border-color: #f0c542; font-weight: 700 }
.tab-postit.add { font-weight: 700; background: #c8e7ff; border-color: #7bbbf3; }
.tab-postit:hover { transform: translateX(-3px) scale(1.02) rotate(0deg) }
.controls { display: flex; gap: 18px; align-items: center; }
.control-compass, .control-mode, .control-zoom { display: flex; align-items: center; gap: 6px }
.compass { display: inline-block; transition: transform 0.2s }
</style>
