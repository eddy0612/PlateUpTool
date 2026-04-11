<template>
  <section class="left-panel">
    <div style="position:relative; width:100%;">

      <div class="viewport-box" ref="viewportEl" :style="{ height: viewportBoxHeight + 'px' }">
        <div class="grid-centering-wrapper">
        <div class="grid" ref="gridEl" :style="gridStyleDynamic" :class="{ 'move-dragging': moveDragActive, 'paste-pending': pastePending }" @mousedown="onGridMouseDown" @dragstart.prevent>
          <div
            v-for="cellInfo in flatGrid"
            :key="'cell-' + cellInfo.x + '-' + cellInfo.y"
            :class="cellClasses(cellInfo.x, cellInfo.y)"
            :data-x="cellInfo.x"
            :data-y="cellInfo.y"
            @contextmenu.prevent="handleCellContextMenu($event, cellInfo.x, cellInfo.y)"
            @click="(e) => handleCellClick(e, cellInfo.x, cellInfo.y)"
          >
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
      </div>

      <div class="tabs">
        <div
          v-for="tab in state.tabs"
          :key="tab.id"
          :class="['tab-postit', `tab-color-${tab.id}`, { active: state.activeTabId === tab.id }]"
          @click="selectTab(tab)"
          @mousedown="onTabMouseDown(tab, $event)"
          @mouseup="cancelTabRenameTimer"
          @mouseleave="cancelTabRenameTimer"
          @contextmenu.prevent="onTabContextMenu(tab, $event)"
        >
          <input
            v-if="editingTabId === tab.id"
            class="tab-rename-input"
            v-model="editingTabLabel"
            maxlength="12"
            @keydown.enter.prevent="commitTabRename"
            @keydown.escape.prevent="cancelTabRename"
            @blur="commitTabRename"
            @click.stop
            @mousedown.stop
          />
          <template v-else>{{ tab.label }}</template>
        </div>
        <div class="tab-postit add" v-if="state.tabs.filter(t => t.id !== 'complete' && t.id !== 'structure').length < 10" @click="addTab">+</div>
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
        <input type="range" min="0.3" max="2.5" step="0.05" v-model.number="state.zoom" />
      </div>
      <div class="control-size">
        <label>W: <input type="number" v-model.number="state.roomWidth" min="10" max="50" style="width:48px" /></label>
        <label>H: <input type="number" v-model.number="state.roomHeight" min="7" max="50" style="width:48px" /></label>
      </div>
    </div>

    <div
      v-if="isDragging && dragStart && dragEnd"
      class="drag-select-overlay"
      :style="dragRectStyle"
    />

    <template v-if="contextMenuVisible">
      <div class="context-menu-backdrop" @click="closeContextMenu" @contextmenu.prevent="closeContextMenu" />
      <div class="context-menu" :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }">
        <div class="context-menu-item" @click="doMoveToThisLevel">Move selection to this level</div>
        <div class="context-menu-item" @click="doShowInBothLevels">Show selected items in both levels</div>
        <div class="context-menu-item context-menu-cancel" @click="closeContextMenu">Cancel</div>
      </div>
    </template>

    <template v-if="tabContextMenuVisible">
      <div class="context-menu-backdrop" @click="closeTabContextMenu" @contextmenu.prevent="closeTabContextMenu" />
      <div class="context-menu" :style="{ left: tabContextMenuPos.x + 'px', top: tabContextMenuPos.y + 'px' }">
        <div class="context-menu-item" @click="doTabContextRename">Rename tab</div>
        <div class="context-menu-item" @click="doTabContextDelete">Delete tab</div>
        <div class="context-menu-item context-menu-cancel" @click="closeTabContextMenu">Cancel</div>
      </div>
    </template>

    <template v-if="tabDeleteConfirmVisible">
      <div class="context-menu-backdrop" @click="cancelTabDeleteConfirm" @contextmenu.prevent="cancelTabDeleteConfirm" />
      <div class="context-menu" :style="{ left: tabContextMenuPos.x + 'px', top: tabContextMenuPos.y + 'px' }">
        <div class="context-menu-item context-menu-warn">This tab has items on it. Delete them all?</div>
        <div class="context-menu-item" @click="confirmTabDelete">Yes, delete all</div>
        <div class="context-menu-item context-menu-cancel" @click="cancelTabDeleteConfirm">No, cancel</div>
      </div>
    </template>
  </section>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRestaurantStore } from '../store/restaurant'
import { useGrid } from '../composables/useGrid'

export default {
  name: 'GridView',
  setup() {
    const { state } = useRestaurantStore()
    const {
      flatGrid, gridStyleDynamic, viewportBoxHeight, rotationStyle, getApplianceIcon, isImageIcon,
      rotateCell, selectCell, selectedCells, isSelected, selectCellsInRect, addCellsToSelection,
      moveDragActive, getCellMoveState, getDisplayCell, isCellGhosted, moveSelectionToTab, addSelectionToTab,
      startMoveDrag, updateMoveDragOffset, commitMoveDrag, cancelMoveDrag, removeSelected,
      copyToClipboard, cutToClipboard,
      pastePending, getCellPasteState, startPaste, setPasteAnchor, confirmPaste, cancelPaste,
      tabHasVisibleItems, deleteTabItems
    } = useGrid()

    function selectTab(tab) {
      if (pastePending.value && (tab.id === 'complete' || tab.id === 'structure')) return
      if (editingTabId.value !== tab.id) state.activeTabId = tab.id
    }

    function addTab() {
      const userTabs = state.tabs.filter(t => t.id !== 'complete' && t.id !== 'structure')
      if (userTabs.length >= 10) return
      const nextId = `tab-${Date.now()}`
      state.tabs.push({ id: nextId, label: `Tab ${userTabs.length + 1}`, items: [] })
      state.activeTabId = nextId
    }

    // --- Tab rename (long-press on yellow tabs) ---
    const editingTabId = ref(null)
    const editingTabLabel = ref('')
    let tabRenameTimer = null

    function onTabMouseDown(tab, e) {
      if (tab.id === 'complete' || tab.id === 'structure') return
      if (e.button !== 0) return
      if (state.activeTabId !== tab.id) return
      tabRenameTimer = setTimeout(() => {
        tabRenameTimer = null
        editingTabId.value = tab.id
        editingTabLabel.value = tab.label
        nextTick(() => {
          const el = document.querySelector('.tab-rename-input')
          if (el) { el.focus(); el.select() }
        })
      }, 500)
    }

    function cancelTabRenameTimer() {
      if (tabRenameTimer) { clearTimeout(tabRenameTimer); tabRenameTimer = null }
    }

    function commitTabRename() {
      if (!editingTabId.value) return
      const label = editingTabLabel.value.trim().slice(0, 12)
      if (label) {
        const tab = state.tabs.find(t => t.id === editingTabId.value)
        if (tab) tab.label = label
      }
      editingTabId.value = null
    }

    function cancelTabRename() {
      editingTabId.value = null
    }

    // --- Tab right-click context menu ---
    const tabContextMenuVisible = ref(false)
    const tabContextMenuPos = ref({ x: 0, y: 0 })
    const tabContextMenuTabId = ref(null)
    const tabDeleteConfirmVisible = ref(false)

    function onTabContextMenu(tab, e) {
      if (tab.id === 'complete' || tab.id === 'structure') return
      tabContextMenuTabId.value = tab.id
      tabContextMenuPos.value = { x: e.clientX, y: e.clientY }
      tabContextMenuVisible.value = true
    }

    function closeTabContextMenu() {
      tabContextMenuVisible.value = false
      tabContextMenuTabId.value = null
    }

    function doTabContextRename() {
      const tabId = tabContextMenuTabId.value
      tabContextMenuVisible.value = false
      tabContextMenuTabId.value = null
      if (state.activeTabId !== tabId) state.activeTabId = tabId
      editingTabId.value = tabId
      const tab = state.tabs.find(t => t.id === tabId)
      editingTabLabel.value = tab ? tab.label : ''
      nextTick(() => {
        const el = document.querySelector('.tab-rename-input')
        if (el) { el.focus(); el.select() }
      })
    }

    function doTabContextDelete() {
      const tabId = tabContextMenuTabId.value
      tabContextMenuVisible.value = false
      if (tabHasVisibleItems(tabId)) {
        tabDeleteConfirmVisible.value = true
      } else {
        tabContextMenuTabId.value = null
        removeTab(tabId)
      }
    }

    function cancelTabDeleteConfirm() {
      tabDeleteConfirmVisible.value = false
      tabContextMenuTabId.value = null
    }

    function confirmTabDelete() {
      const tabId = tabContextMenuTabId.value
      tabDeleteConfirmVisible.value = false
      tabContextMenuTabId.value = null
      deleteTabItems(tabId)
      removeTab(tabId)
    }

    function removeTab(tabId) {
      const tabIdx = state.tabs.findIndex(t => t.id === tabId)
      if (tabIdx === -1) return
      const userTabPos = state.tabs.filter(t => t.id !== 'complete' && t.id !== 'structure').findIndex(t => t.id === tabId)
      state.tabs.splice(tabIdx, 1)
      if (state.activeTabId === tabId) {
        const userTabs = state.tabs.filter(t => t.id !== 'complete' && t.id !== 'structure')
        if (userTabs.length > 0) {
          state.activeTabId = userTabs[Math.max(0, userTabPos - 1)].id
        } else if (state.tabs.length > 0) {
          state.activeTabId = state.tabs[0].id
        }
      }
    }

    // --- Shared drag helpers ---
    const gridEl = ref(null)
    const viewportEl = ref(null)
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

    // --- Paste pending tracking ---
    function onPasteMouseMove(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.grid-item')
      if (el && el.dataset.x !== undefined) {
        setPasteAnchor(parseInt(el.dataset.x), parseInt(el.dataset.y))
      }
    }
    watch(pastePending, (val) => {
      if (val) window.addEventListener('mousemove', onPasteMouseMove)
      else window.removeEventListener('mousemove', onPasteMouseMove)
    })

    function handleCellClick(e, x, y) {
      if (pastePending.value) {
        setPasteAnchor(x, y)
        confirmPaste()
        return
      }
      if (wasDragging.value) { wasDragging.value = false; return }
      selectCell(x, y, e.shiftKey, e.ctrlKey || e.metaKey)
    }

    function onGridMouseDown(e) {
      if (pastePending.value) return
      if (e.button === 2) {
        if (!viewportEl.value) return
        rightDragStartMouse.value = { x: e.clientX, y: e.clientY }
        rightDragScrollStart.value = { left: viewportEl.value.scrollLeft, top: viewportEl.value.scrollTop }
        isRightDragging = false
        window.addEventListener('mousemove', onRightDragMouseMove)
        window.addEventListener('mouseup', onRightDragMouseUp)
        return
      }
      if (e.button !== 0) return

      // If clicking on an already-selected cell without modifiers → potential move drag
      if (!e.shiftKey && !(e.ctrlKey || e.metaKey)) {
        const el = e.target.closest('.grid-item')
        if (el) {
          const cx = parseInt(el.dataset.x)
          const cy = parseInt(el.dataset.y)
          if (isSelected(cx, cy) && !isCellGhosted(cx, cy)) {
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
        setTimeout(() => { wasDragging.value = false }, 0)
        pendingMoveCell.value = null
        moveDragStartMouse.value = null
        return
      }

      // --- Select-box drag path ---
      if (isDragging.value) {
        finalizeDragSelection(e.ctrlKey || e.metaKey || e.shiftKey)
        wasDragging.value = true
        setTimeout(() => { wasDragging.value = false }, 0)
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
        if (br.left <= rectRight && br.right >= rectLeft && br.top <= rectBottom && br.bottom >= rectTop)
          cells.push({ x: parseInt(el.dataset.x), y: parseInt(el.dataset.y) })
      })

      if (addToExisting) addCellsToSelection(cells)
      else selectCellsInRect(cells)
    }

    function cellClasses(x, y) {
      const move = getCellMoveState(x, y)
      const paste = getCellPasteState(x, y)
      return {
        'grid-item': true,
        selected: isSelected(x, y),
        'move-source': move === 'source',
        'move-preview-valid': move === 'preview-valid',
        'move-preview-invalid': move === 'preview-invalid',
        'paste-preview-valid': paste === 'paste-preview-valid',
        'paste-preview-invalid': paste === 'paste-preview-invalid',
        ghosted: isCellGhosted(x, y),
      }
    }

    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        removeSelected()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copyToClipboard() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') { e.preventDefault(); cutToClipboard() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); startPaste() }
      if (e.key === 'Escape') {
        if (pastePending.value) { cancelPaste(); return }
        closeContextMenu()
      }
      if (e.key >= '0' && e.key <= '9') {
        const idx = e.key === '0' ? 9 : parseInt(e.key) - 1
        const userTabs = state.tabs.filter(t => t.id !== 'complete' && t.id !== 'structure')
        if (idx < userTabs.length) state.activeTabId = userTabs[idx].id
      }
    }

    // --- Context menu for ghosted cells ---
    const contextMenuVisible = ref(false)
    const contextMenuPos = ref({ x: 0, y: 0 })

    function closeContextMenu() { contextMenuVisible.value = false }

    function doMoveToThisLevel() {
      moveSelectionToTab(state.activeTabId)
      contextMenuVisible.value = false
    }

    function doShowInBothLevels() {
      addSelectionToTab(state.activeTabId)
      contextMenuVisible.value = false
    }

    // --- Right-mouse drag to pan ---
    const rightDragStartMouse = ref(null)
    const rightDragScrollStart = ref(null)
    let isRightDragging = false
    const wasRightDragging = ref(false)

    function onRightDragMouseMove(e) {
      if (!rightDragStartMouse.value || !viewportEl.value) return
      const dx = e.clientX - rightDragStartMouse.value.x
      const dy = e.clientY - rightDragStartMouse.value.y
      if (!isRightDragging && Math.sqrt(dx * dx + dy * dy) > 5) isRightDragging = true
      if (isRightDragging) {
        viewportEl.value.scrollLeft = rightDragScrollStart.value.left - dx
        viewportEl.value.scrollTop = rightDragScrollStart.value.top - dy
      }
    }

    function onRightDragMouseUp() {
      window.removeEventListener('mousemove', onRightDragMouseMove)
      window.removeEventListener('mouseup', onRightDragMouseUp)
      if (isRightDragging) {
        wasRightDragging.value = true
        setTimeout(() => { wasRightDragging.value = false }, 0)
      }
      rightDragStartMouse.value = null
      rightDragScrollStart.value = null
      isRightDragging = false
    }

    function handleCellContextMenu(e, x, y) {
      if (wasRightDragging.value) return
      if (state.activeTabId === 'structure') return
      if (isCellGhosted(x, y)) {
        if (!isSelected(x, y)) selectCell(x, y)
        contextMenuPos.value = { x: e.clientX, y: e.clientY }
        contextMenuVisible.value = true
        return
      }
      rotateCell(x, y)
    }

    function onWheel(e) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      state.zoom = Math.min(2.5, Math.max(0.3, Math.round((state.zoom + delta) * 100) / 100))
    }

    onMounted(() => {
      window.addEventListener('keydown', onKeyDown)
      if (viewportEl.value) viewportEl.value.addEventListener('wheel', onWheel, { passive: false })
    })

    onUnmounted(() => {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup', onWindowMouseUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousemove', onRightDragMouseMove)
      window.removeEventListener('mouseup', onRightDragMouseUp)
      window.removeEventListener('mousemove', onPasteMouseMove)
      const vp = viewportEl.value
      if (vp) vp.removeEventListener('wheel', onWheel)
      cancelMoveDrag()
      cancelPaste()
      if (tabRenameTimer) clearTimeout(tabRenameTimer)
    })

    return {
      state, flatGrid, gridStyleDynamic, viewportBoxHeight, rotationStyle, getApplianceIcon, isImageIcon,
      rotateCell, selectedCells, isSelected, addTab, selectTab,
      gridEl, viewportEl, isDragging, moveDragActive, dragStart, dragEnd, dragRectStyle,
      handleCellClick, handleCellContextMenu, onGridMouseDown, cellClasses, getDisplayCell,
      editingTabId, editingTabLabel, onTabMouseDown, cancelTabRenameTimer, commitTabRename, cancelTabRename,
      contextMenuVisible, contextMenuPos, closeContextMenu, doMoveToThisLevel, doShowInBothLevels,
      tabContextMenuVisible, tabContextMenuPos, tabDeleteConfirmVisible,
      onTabContextMenu, closeTabContextMenu, doTabContextRename, doTabContextDelete,
      cancelTabDeleteConfirm, confirmTabDelete,
      pastePending
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
  width: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
}
.grid-centering-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: max-content;
  min-width: 100%;
  height: max-content;
  min-height: 100%;
  box-sizing: border-box;
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
.grid-item.paste-preview-valid { border: 2px solid #22a355; background: rgba(34, 163, 85, 0.25) }
.grid-item.paste-preview-invalid { border: 2px solid #d93025; background: rgba(217, 48, 37, 0.25) }
.grid.paste-pending .grid-item { cursor: copy }
.grid-item.ghosted { opacity: 0.25; filter: grayscale(0.6); }
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
.tab-postit.active { margin-left: 10px; z-index: 20; font-weight: 700 }
.tab-postit.tab-color-structure { background: #ffd5d5; border-color: #e89090; }
.tab-postit.tab-color-structure.active { background: #ffb3b3; border-color: #d06060; }
.tab-postit.tab-color-complete { background: #c8f5c8; border-color: #72c472; }
.tab-postit.tab-color-complete.active { background: #9eea9e; border-color: #4aaa4a; }
.tab-postit.add { font-weight: 700; background: #c8e7ff; border-color: #7bbbf3; }
.tab-postit:hover { transform: translateX(-3px) scale(1.02) rotate(0deg) }
.controls { display: flex; gap: 18px; align-items: center; }
.control-compass, .control-mode, .control-zoom, .control-size { display: flex; align-items: center; gap: 6px }
.compass { display: inline-block; transition: transform 0.2s }
.tab-rename-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid #888;
  outline: none;
  font: inherit;
  font-weight: inherit;
  color: inherit;
  padding: 0;
  display: block;
}
.context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: transparent;
}
.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #b0c0d0;
  border-radius: 6px;
  box-shadow: 2px 4px 14px rgba(0,0,0,0.18);
  padding: 4px 0;
  min-width: 230px;
  user-select: none;
}
.context-menu-item {
  padding: 9px 18px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}
.context-menu-item:hover {
  background: #e8f0ff;
}
.context-menu-cancel {
  color: #666;
  border-top: 1px solid #e8e8e8;
  margin-top: 2px;
}
.context-menu-warn {
  font-weight: 600;
  color: #b03000;
  pointer-events: none;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 2px;
}
</style>
