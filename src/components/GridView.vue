<template>
  <section class="left-panel">
    <div style="position:relative; width:100%;">

      <div class="viewport-box" ref="viewportEl" :style="{ height: viewportBoxHeight + 'px' }" @mousemove="onViewportMouseMove" @mouseleave="onViewportMouseLeave">
        <div class="grid-centering-wrapper">
        <div class="grid" ref="gridEl" :style="gridStyleDynamic" :class="{ 'move-dragging': moveDragActive, 'paste-pending': pastePending, 'structure-mode': isStructureMode }" @mousedown="onGridMouseDown" @dragstart.prevent>
          <div
            v-for="cellInfo in flatGrid"
            :key="'cell-' + cellInfo.x + '-' + cellInfo.y"
            :class="cellClasses(cellInfo.x, cellInfo.y)"
            :data-x="cellInfo.x"
            :data-y="cellInfo.y"
            @contextmenu.prevent="handleCellContextMenu($event, cellInfo.x, cellInfo.y)"
            @click="(e) => handleCellClick(e, cellInfo.x, cellInfo.y)"
          >
            <div class="cell-content" :style="getApplianceBgStyle(cellInfo.x, cellInfo.y)">
              <template v-if="getDisplayCell(cellInfo.x, cellInfo.y)?.applianceId">
                <span :style="rotationStyle(getDisplayCell(cellInfo.x, cellInfo.y).rotation)">
                  <img
                    v-if="isImageIcon(getApplianceIcon(getDisplayCell(cellInfo.x, cellInfo.y).applianceId))"
                    :src="get2DApplianceIcon(getDisplayCell(cellInfo.x, cellInfo.y).applianceId)"
                    :alt="getDisplayCell(cellInfo.x, cellInfo.y).applianceId"
                    draggable="false"
                    style="max-width:100%;max-height:100%;display:block;"
                    @error="$event.target.onerror=null; $event.target.src=getApplianceIcon(getDisplayCell(cellInfo.x, cellInfo.y).applianceId)"
                  />
                  <template v-else>{{ getApplianceIcon(getDisplayCell(cellInfo.x, cellInfo.y).applianceId) }}</template>
                </span>
                <span
                  v-if="getDisplayCell(cellInfo.x, cellInfo.y).applianceId === TELEPORTER_APPLIANCE_ID && (getDisplayCell(cellInfo.x, cellInfo.y).extraData || 0) > 0"
                  class="teleporter-pair-number"
                >{{ getDisplayCell(cellInfo.x, cellInfo.y).extraData }}</span>
              </template>
            </div>
            <div v-if="getWallEdge(cellInfo.x, cellInfo.y, 'top')"    :class="['edge-marker', 'edge-top',    `edge-type-${getWallEdge(cellInfo.x, cellInfo.y, 'top')}`]" />

            <div v-if="getWallEdge(cellInfo.x, cellInfo.y, 'right')"  :class="['edge-marker', 'edge-right',  `edge-type-${getWallEdge(cellInfo.x, cellInfo.y, 'right')}`]" />
            <div v-if="getWallEdge(cellInfo.x, cellInfo.y, 'bottom')" :class="['edge-marker', 'edge-bottom', `edge-type-${getWallEdge(cellInfo.x, cellInfo.y, 'bottom')}`]" />
            <div v-if="getWallEdge(cellInfo.x, cellInfo.y, 'left')"   :class="['edge-marker', 'edge-left',   `edge-type-${getWallEdge(cellInfo.x, cellInfo.y, 'left')}`]" />
          </div>
          <svg
            v-if="teleporterPairLines.length > 0"
            class="teleporter-pair-overlay"
            :width="state.roomWidth * cellSize * state.zoom"
            :height="state.roomHeight * cellSize * state.zoom"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              v-for="(line, i) in teleporterPairLines"
              :key="'tpline-' + i"
              :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
              stroke="#4dbb5f"
              stroke-width="2"
              stroke-dasharray="7,4"
              stroke-linecap="round"
              opacity="0.85"
            />
          </svg>
        </div>
        </div>
      </div>

      <div class="tabs">
        <div
          v-for="tab in state.tabs"
          :key="tab.id"
          :class="['tab-postit', getTabColorClass(tab), { active: state.activeTabId === tab.id }]"
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

    <div class="controls-with-status">
      <div class="hover-icon-box">
        <img
          v-if="hoverApplianceId && isImageIcon(getApplianceIcon(hoverApplianceId))"
          :src="getApplianceIcon(hoverApplianceId)"
          class="hover-icon-img"
        />
      </div>
      <div class="controls-right">
        <div class="controls">
          <div class="control-zoom">
            <label>Zoom {{ (state.zoom * 100).toFixed(0) }}%</label>
            <input type="range" min="0.3" max="2.5" step="0.05" v-model.number="state.zoom" />
          </div>
          <div class="control-size">
            <label>W: <input type="number" :value="state.roomWidth" min="10" max="50" style="width:48px" @change="state.roomWidth = Math.min(50, Math.max(10, parseInt($event.target.value) || 10)); $event.target.value = state.roomWidth" /></label>
            <label>H: <input type="number" :value="state.roomHeight" min="7" max="50" style="width:48px" @change="state.roomHeight = Math.min(50, Math.max(7, parseInt($event.target.value) || 7)); $event.target.value = state.roomHeight" /></label>
          </div>
        </div>
        <div class="grid-status-bar">{{ hoverLabel }}</div>
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
    import { useGrid, TELEPORTER_APPLIANCE_ID } from '../composables/useGrid'
export default {
  name: 'GridView',
  setup() {
    const { state } = useRestaurantStore()
    const {
      flatGrid, gridStyleDynamic, cellSize, viewportBoxHeight, rotationStyle, getApplianceIcon, getApplianceLabel, get2DApplianceIcon, isImageIcon,
      rotateCell, rotateCellCCW, rotateGroupAroundCell, rotateGroupAroundCellCCW, selectCell, selectedCells, isSelected, selectCellsInRect, addCellsToSelection, selectAll, invertSelection,
      moveDragActive, getCellMoveState, getDisplayCell, isCellGhosted, moveSelectionToTab, addSelectionToTab,
      startMoveDrag, updateMoveDragOffset, commitMoveDrag, cancelMoveDrag, removeSelected,
      copyToClipboard, cutToClipboard,
      pastePending, getCellPasteState, startPaste, startDuplicate, setPasteAnchor, confirmPaste, cancelPaste,
      tabHasVisibleItems, deleteTabItems,
      isStructureMode, selectedStructureTool, getWallEdge, setWallEdge,
      paletteDragActive, paletteDragHoverCell, isPaletteDragDropValid,
      getTeleporterPairPos
    } = useGrid()

    // --- Tab colours (10 light, differentiable) ---
    const TAB_COLORS = [
      { bg: '#fff8a0', border: '#d0c048' }, // 0 yellow
      { bg: '#aad6ff', border: '#5090d0' }, // 1 sky blue
      { bg: '#a0f0b8', border: '#48c870' }, // 2 green
      { bg: '#ffb0d0', border: '#d87098' }, // 3 pink
      { bg: '#d8b0ff', border: '#9060d0' }, // 4 lavender
      { bg: '#ffd898', border: '#d09048' }, // 5 orange
      { bg: '#80ffe0', border: '#28c090' }, // 6 teal
      { bg: '#ffb0a8', border: '#d06858' }, // 7 salmon
      { bg: '#b0e8ff', border: '#58a8d8' }, // 8 cyan
      { bg: '#ccffb0', border: '#80c048' }, // 9 lime
    ]

    const userTabColorMap = computed(() => {
      const map = {}
      state.tabs
        .filter(t => t.id !== 'complete' && t.id !== 'structure')
        .forEach((tab, idx) => { map[tab.id] = idx % TAB_COLORS.length })
      return map
    })

    function getTabColorClass(tab) {
      if (tab.id === 'complete') return 'tab-color-complete'
      if (tab.id === 'structure') return 'tab-color-structure'
      const idx = userTabColorMap.value[tab.id] ?? 0
      return `tab-user-${idx}`
    }

    function getApplianceBgStyle(x, y) {
      if (state.activeTabId === 'complete') return {}
      const cell = getDisplayCell(x, y)
      if (!cell?.applianceId) return {}
      const firstTabId = Array.isArray(cell.tabIds) ? cell.tabIds[0] : cell.tabId
      if (!firstTabId) return {}
      const idx = userTabColorMap.value[firstTabId]
      if (idx === undefined) return {}
      return { background: TAB_COLORS[idx].bg }
    }
    // --- End tab colours ---

    function selectTab(tab) {
      if (pastePending.value && (tab.id === 'complete' || tab.id === 'structure')) return
      if (editingTabId.value !== tab.id) state.activeTabId = tab.id
    }

    function addTab() {
      const userTabs = state.tabs.filter(t => t.id !== 'complete' && t.id !== 'structure')
      if (userTabs.length >= 10) return
      const existingLabels = new Set(userTabs.map(t => t.label))
      let n = userTabs.length + 1
      while (existingLabels.has(`Tab ${n}`)) n++
      const nextId = `tab-${Date.now()}`
      state.tabs.push({ id: nextId, label: `Tab ${n}` })
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

    // --- Structure mode edge detection ---
    function detectEdgeDir(e) {
      const el = e.target.closest?.('.grid-item') || e.currentTarget
      if (!el) return null
      const rect = el.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width
      const relY = (e.clientY - rect.top) / rect.height
      const d = { top: relY, bottom: 1 - relY, left: relX, right: 1 - relX }
      const minEntry = Object.entries(d).reduce((a, b) => a[1] < b[1] ? a : b)
      return minEntry[1] <= 0.38 ? minEntry[0] : null
    }

    function handleCellClick(e, x, y) {
      if (isStructureMode.value) {
        const dir = detectEdgeDir(e)
        if (dir) setWallEdge(x, y, dir, selectedStructureTool.value)
        return
      }
      if (state.activeTabId === 'complete') return  // no selection on preview tab
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
      if (isStructureMode.value) return  // no drag/selection in structure mode
      if (state.activeTabId === 'complete') return  // no drag/selection on preview tab
      if (e.button !== 0) return

      // Without modifiers: move-drag behaviour
      if (!e.shiftKey && !(e.ctrlKey || e.metaKey)) {
        const el = e.target.closest('.grid-item')
        if (el) {
          const cx = parseInt(el.dataset.x)
          const cy = parseInt(el.dataset.y)
          if (isSelected(cx, cy) && !isCellGhosted(cx, cy)) {
            // Already-selected cell → potential move drag
            pendingMoveCell.value = { x: cx, y: cy }
            moveDragStartMouse.value = { x: e.clientX, y: e.clientY }
            window.addEventListener('mousemove', onWindowMouseMove)
            window.addEventListener('mouseup', onWindowMouseUp)
            return
          }
          // Unselected cell → clear selection, select this cell, start potential move drag
          selectedCells.value = new Set()
          selectCell(cx, cy, false, false)
          if (isSelected(cx, cy)) {
            pendingMoveCell.value = { x: cx, y: cy }
            moveDragStartMouse.value = { x: e.clientX, y: e.clientY }
            window.addEventListener('mousemove', onWindowMouseMove)
            window.addEventListener('mouseup', onWindowMouseUp)
            return
          }
          // Empty or ghosted cell: selection cleared, no drag
          return
        }
        // Clicked on grid background (not a cell): clear selection
        selectedCells.value = new Set()
        return
      }

      // Shift or Ctrl held: start box-select drag
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
          // Suppress click after an actual drag
          wasDragging.value = true
          setTimeout(() => { wasDragging.value = false }, 0)
        }
        // If no drag: let handleCellClick fire to collapse the selection to just this cell
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
      if (isStructureMode.value) {
        return { 'grid-item': true, 'structure-cell': true }
      }
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
        'group-flash': groupFlashing.value && isSelected(x, y),
        'palette-drop-valid': paletteDragActive.value && paletteDragHoverCell.value?.x === x && paletteDragHoverCell.value?.y === y && isPaletteDragDropValid(x, y),
        'palette-drop-invalid': paletteDragActive.value && paletteDragHoverCell.value?.x === x && paletteDragHoverCell.value?.y === y && !isPaletteDragDropValid(x, y),
      }
    }

    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (isStructureMode.value) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        removeSelected()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectAll() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); invertSelection() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copyToClipboard() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') { e.preventDefault(); cutToClipboard() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); startPaste() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); startDuplicate() }
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

    // --- Group flash (red flash when group rotation is blocked) ---
    const groupFlashing = ref(false)

    function flashGroupRed() {
      groupFlashing.value = true
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 440
        osc.type = 'square'
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.2)
      } catch (e) {}
      setTimeout(() => { groupFlashing.value = false }, 400)
    }

    // --- Teleporter pair line overlay ---
    // Returns an array of { x1, y1, x2, y2 } in grid-pixel coordinates for each
    // selected paired teleporter, so GridView can draw a dashed connector line.
    const teleporterPairLines = computed(() => {
      const lines = []
      const cs = cellSize.value * state.zoom
      const W = state.roomWidth
      const H = state.roomHeight
      const tw = (W * cs - (W - 1) * 2) / W
      const th = (H * cs - (H - 1) * 2) / H
      const cx = x => x * (tw + 2) + tw / 2
      const cy = y => y * (th + 2) + th / 2
      for (const key of selectedCells.value) {
        const [x, y] = key.split(',').map(Number)
        const cell = getDisplayCell(x, y)
        if (cell?.applianceId === TELEPORTER_APPLIANCE_ID && (cell.extraData || 0) > 0) {
          const partner = getTeleporterPairPos(x, y)
          if (partner) lines.push({ x1: cx(x), y1: cy(y), x2: cx(partner.x), y2: cy(partner.y) })
        }
      }
      return lines
    })

    // --- Grid hover status bar ---
    const hoverLabel = ref('')
    const hoverApplianceId = ref('')

    function onViewportMouseMove(e) {
      const el = e.target.closest?.('.grid-item')
      if (!el) { hoverLabel.value = ''; hoverApplianceId.value = ''; return }
      const x = parseInt(el.dataset.x)
      const y = parseInt(el.dataset.y)
      const cell = getDisplayCell(x, y)
      hoverLabel.value = cell?.applianceId ? getApplianceLabel(cell.applianceId) : ''
      hoverApplianceId.value = cell?.applianceId ?? ''
    }

    function onViewportMouseLeave() {
      hoverLabel.value = ''
      hoverApplianceId.value = ''
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
      if (state.activeTabId === 'complete') return
      if (isCellGhosted(x, y)) {
        if (!isSelected(x, y)) selectCell(x, y)
        contextMenuPos.value = { x: e.clientX, y: e.clientY }
        contextMenuVisible.value = true
        return
      }
      const ccw = e.shiftKey
      // Group rotation: right-click on a selected cell in a multi-cell selection
      if (isSelected(x, y) && selectedCells.value.size > 1) {
        const success = ccw ? rotateGroupAroundCellCCW(x, y) : rotateGroupAroundCell(x, y)
        if (!success) flashGroupRed()
        return
      }
      ccw ? rotateCellCCW(x, y) : rotateCell(x, y)
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
      state, flatGrid, gridStyleDynamic, viewportBoxHeight, cellSize, rotationStyle, getApplianceIcon, get2DApplianceIcon, isImageIcon,
      rotateCell, selectedCells, isSelected, addTab, selectTab,
      gridEl, viewportEl, isDragging, moveDragActive, dragStart, dragEnd, dragRectStyle,
      handleCellClick, handleCellContextMenu, onGridMouseDown, cellClasses, getDisplayCell,
      editingTabId, editingTabLabel, onTabMouseDown, cancelTabRenameTimer, commitTabRename, cancelTabRename,
      contextMenuVisible, contextMenuPos, closeContextMenu, doMoveToThisLevel, doShowInBothLevels,
      tabContextMenuVisible, tabContextMenuPos, tabDeleteConfirmVisible,
      onTabContextMenu, closeTabContextMenu, doTabContextRename, doTabContextDelete,
      cancelTabDeleteConfirm, confirmTabDelete,
      pastePending,
      isStructureMode, getWallEdge,
      getTabColorClass, getApplianceBgStyle,
      hoverLabel, hoverApplianceId, onViewportMouseMove, onViewportMouseLeave,
      getApplianceIcon, isImageIcon,
      TELEPORTER_APPLIANCE_ID, teleporterPairLines
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
  overflow: hidden;
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
.grid-item.move-source { border: 2px dashed #1f79ff; background: #dde9ff }
.grid-item.move-source .cell-content { opacity: 0.35; }
.grid-item.move-preview-valid { border: 2px solid #22a355; background: rgba(34, 163, 85, 0.18) }
.grid-item.move-preview-invalid { border: 2px solid #d93025; background: rgba(217, 48, 37, 0.18) }
.grid-item.paste-preview-valid { border: 2px solid #22a355; background: rgba(34, 163, 85, 0.25) }
.grid-item.paste-preview-invalid { border: 2px solid #d93025; background: rgba(217, 48, 37, 0.25) }
.grid-item.palette-drop-valid { border: 2px solid #22a355; background: rgba(34, 163, 85, 0.25) }
.grid-item.palette-drop-invalid { border: 2px solid #d93025; background: rgba(217, 48, 37, 0.25) }
.grid.paste-pending .grid-item { cursor: copy }
.grid-item.ghosted .cell-content { opacity: 0.7; }
.grid-item.ghosted .cell-content > span { opacity: 0.3; filter: grayscale(0.7); }
.drag-select-overlay {
  position: fixed;
  border: 1.5px solid #1f79ff;
  background: rgba(31, 121, 255, 0.12);
  pointer-events: none;
  z-index: 9999;
}
.cell-label { font-size: 10px; color: #bbb; position: absolute; top: 2px; left: 2px; }
.teleporter-pair-number {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 3px #000, 0 0 6px #000;
  pointer-events: none;
  z-index: 5;
}
.teleporter-pair-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 20;
  overflow: visible;
}
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
  background: #fff7c5;
  border: 1px solid #eeda8f;
  border-radius: 4px 4px 6px 6px;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.2);
  cursor: pointer;
  transform-origin: left top;
  transition: transform 0.2s, background 0.2s, border-color 0.2s;
  transform: translateX(-3px) rotate(0deg);
}
.tab-postit.active { margin-left: 10px; z-index: 20; font-weight: 700 }
.tab-postit.tab-color-structure { background: #e8e8e8; border-color: #b8b8b8; }
.tab-postit.tab-color-structure.active { background: #d9d9d9; border-color: #a6a6a6; }
.tab-postit.tab-color-complete { background: #eeeeee; border-color: #c4c4c4; }
.tab-postit.tab-color-complete.active { background: #dfdfdf; border-color: #acacac; }
.tab-postit.add { font-weight: 700; background: #d6edff; border-color: #9cccf6; }
/* User tab colours (10 light, differentiable) */
.tab-user-0 { background: #fffab8; border-color: #dccc70; }
.tab-user-0.active { background: #f4e870; border-color: #c0b040; }
.tab-user-1 { background: #bfe0ff; border-color: #7ab0da; }
.tab-user-1.active { background: #9bcaf4; border-color: #5898c8; }
.tab-user-2 { background: #b8f4ca; border-color: #72d890; }
.tab-user-2.active { background: #88e2ac; border-color: #46c070; }
.tab-user-3 { background: #ffc4dc; border-color: #e295b0; }
.tab-user-3.active { background: #f4a0c4; border-color: #cc7098; }
.tab-user-4 { background: #e2c4ff; border-color: #aa84da; }
.tab-user-4.active { background: #caa0f4; border-color: #9060c8; }
.tab-user-5 { background: #ffe2b2; border-color: #daaa6c; }
.tab-user-5.active { background: #f4ca82; border-color: #c08848; }
.tab-user-6 { background: #a0ffe8; border-color: #56d0a8; }
.tab-user-6.active { background: #70e8d0; border-color: #30b890; }
.tab-user-7 { background: #ffc4be; border-color: #da8878; }
.tab-user-7.active { background: #f4a094; border-color: #c46858; }
.tab-user-8 { background: #c4eeff; border-color: #7ec4e2; }
.tab-user-8.active { background: #9ad9fa; border-color: #58aace; }
.tab-user-9 { background: #d9ffc4; border-color: #9ad868; }
.tab-user-9.active { background: #b8f494; border-color: #78b848; }
.tab-postit:hover { transform: translateX(-3px) scale(1.02) rotate(0deg) }
.controls-with-status { display: flex; flex-direction: row; align-items: center; gap: 8px; }
.hover-icon-box {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  background: #eef3fa;
  border: 1px solid #c8d6e8;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.hover-icon-img { width: 100%; height: 100%; object-fit: contain; }
.controls-right { display: flex; flex-direction: column; align-items: stretch; gap: 5px; }
.controls { display: flex; gap: 18px; align-items: center; }
.size-status-stack { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.grid-status-bar {
  min-height: 1.4em;
  font-size: 0.82rem;
  color: #3a5070;
  padding: 2px 6px;
  background: #eef3fa;
  border: 1px solid #c8d6e8;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
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

/* ---- Structure mode ---- */
.grid.structure-mode .grid-item {
  cursor: crosshair;
}
.grid.structure-mode .grid-item .cell-content {
  opacity: 0.45;
  filter: grayscale(0.75);
}
.grid.structure-mode .grid-item:hover .cell-content {
  opacity: 0.6;
}
.cell-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
/* Edge marker overlays */
.edge-marker {
  position: absolute;
  pointer-events: none;
  z-index: 10;
  border-radius: 2px;
}
.edge-marker.edge-top,
.edge-marker.edge-bottom {
  left: -3px; right: -3px; height: 5px;
}
.edge-marker.edge-left,
.edge-marker.edge-right {
  top: -3px; bottom: -3px; width: 5px;
}
.edge-marker.edge-top    { top: -2px }
.edge-marker.edge-bottom { bottom: -2px }
.edge-marker.edge-left   { left: -2px }
.edge-marker.edge-right  { right: -2px }
.edge-marker.edge-type-wall   { background: #1a1a2e }
.edge-marker.edge-type-hatch  {
  background: repeating-linear-gradient(45deg, #555 0px, #555 3px, transparent 3px, transparent 7px);
}
.edge-marker.edge-type-door   { background: #c8860a }

/* Group rotation blocked: flash cells red */
@keyframes group-flash-red {
  0%   { background: rgba(220, 40, 40, 0.80); border-color: #cc2020; }
  60%  { background: rgba(220, 40, 40, 0.40); border-color: #d04040; }
  100% { background: #dde9ff; border-color: #1f79ff; }
}
.grid-item.group-flash {
  animation: group-flash-red 0.4s ease-out;
}
</style>
