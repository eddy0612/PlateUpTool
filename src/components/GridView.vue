<template>
  <section class="left-panel">
    <div style="position:relative; width:100%;">

      <div class="viewport-box" ref="viewportEl" :style="{ height: viewportBoxHeight + 'px' }" :class="{ 'file-drag-over': fileDragOver }" @mousemove="onViewportMouseMove" @mouseleave="onViewportMouseLeave" @dragover.prevent="onFileDragOver" @dragleave="onFileDragLeave" @drop.prevent="onFileDrop">
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
                    @error="onApplianceImgError($event, getDisplayCell(cellInfo.x, cellInfo.y).applianceId)"
                  />
                  <template v-else>{{ getApplianceIcon(getDisplayCell(cellInfo.x, cellInfo.y).applianceId) }}</template>
                </span>
                <span
                  v-if="getDisplayCell(cellInfo.x, cellInfo.y).applianceId === TELEPORTER_APPLIANCE_ID && (getDisplayCell(cellInfo.x, cellInfo.y).extraData || 0) > 0"
                  class="teleporter-pair-number"
                >{{ getDisplayCell(cellInfo.x, cellInfo.y).extraData }}</span>
              </template>
            </div>
            <!-- wall edges are now rendered by a single SVG overlay (see wallRects) -->
          </div>
          <svg
            v-if="wallRects.length > 0"
            class="wall-overlay"
            :width="state.roomWidth * cellSize * state.zoom"
            :height="state.roomHeight * cellSize * state.zoom"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="hatchPattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                  <rect width="4" height="8" :fill="hatchPatternColor" />
              </pattern>
            </defs>
            <rect
              v-for="(r, i) in wallRectsHatch"
              :key="'wall-hatch-' + i"
              :x="r.x" :y="r.y" :width="r.w" :height="r.h"
              fill="url(#hatchPattern)"
              :opacity="0.98"
            />
            <rect
              v-for="(r, i) in wallRectsDoor"
              :key="'wall-door-' + i"
              :x="r.x" :y="r.y" :width="r.w" :height="r.h"
              :fill="doorColor"
              :opacity="0.98"
            />
            <rect
              v-for="(r, i) in wallRectsWall"
              :key="'wall-wall-' + i"
              :x="r.x" :y="r.y" :width="r.w" :height="r.h"
              :fill="wallColor"
              :opacity="0.98"
            />
          </svg>

          <svg
            v-if="teleporterPairLines.length > 0 || labelAnchorLines.length > 0"
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
            <line
              v-for="(line, i) in labelAnchorLines"
              :key="'lbline-' + i"
              :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
              stroke="#2b88ff"
              stroke-width="1.6"
              stroke-dasharray="6,4"
              stroke-linecap="round"
              opacity="0.9"
            />
            <circle
              v-for="(line, i) in labelAnchorLines"
              :key="'lbdot-' + i"
              :cx="line.x1" :cy="line.y1" :r="line.r"
              :fill="'#2b88ff'"
              opacity="0.95"
            />
          </svg>
          <!-- Label overlays (above grid items) -->
          <div v-for="lbl in state.labels" :key="'lbl-' + lbl.id"
            v-if="labelDisplayMode !== 2"
            :class="['planner-label', { 'label-selected': selectedLabelIds && selectedLabelIds.has(lbl.id) }]"
            :data-label-id="lbl.id"
            @pointerdown="handleLabelPointerDown(lbl, $event)"
            @dblclick.stop.prevent="editLabel(lbl)"
            :style="getLabelStyle(lbl)">
            {{ lbl.text }}
          </div>
          <!-- Label paste previews -->
          <div v-for="lbl in pastePendingLabels" :key="lbl.id"
            v-if="labelDisplayMode !== 2"
            class="planner-label label-paste-preview"
            :style="getLabelStyle(lbl)">
            {{ lbl.text }}
          </div>
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
      <div class="controls-right">
        <div class="controls">
          <!-- Zoom slider moved to the palette side-controls (no text) -->
        </div>
      </div>
      <div class="toolbox-box" title="Toolbox (mouse-friendly controls)">
          <div class="toolbox" role="toolbar" aria-label="Touch toolbox">
          <button class="toolbox-button" data-help-id="undo" @click="doUndo" title="Undo — Ctrl+Z">
            <span class="toolbox-char" aria-hidden="true">↶</span>
          </button>
          <button class="toolbox-button" data-help-id="cut" @click="cutToClipboard" title="Cut selection — Ctrl+X">
            <span class="toolbox-char" aria-hidden="true">✂</span>
          </button>

          <button class="toolbox-button" data-help-id="copy" @click="copyToClipboard" title="Copy selection — Ctrl+C">
            <span class="toolbox-char" aria-hidden="true">📋</span>
          </button>

          <button class="toolbox-button" data-help-id="paste" @click="startPaste" title="Paste — Ctrl+V">
            <span class="toolbox-char" aria-hidden="true">📥</span>
          </button>

          <button class="toolbox-button" data-help-id="duplicate" @click="startDuplicate" title="Duplicate selection — Ctrl+D">
            <span class="toolbox-char" aria-hidden="true">⎘</span>
          </button>

          <button class="toolbox-button" data-help-id="box-select" @click="armBoxSelect" :aria-pressed="boxSelectArmed" :class="{ active: boxSelectArmed }" aria-label="Box select" title="Box Select (Shift or Ctrl + left click and drag)">
            <svg class="toolbox-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <rect x="3" y="3" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <button class="toolbox-button" data-help-id="select-all" @click="selectAll" title="Select all — Ctrl+A">
            <span class="toolbox-char" aria-hidden="true">▣</span>
          </button>

          <button class="toolbox-button" data-help-id="invert" @click="invertSelection" title="Invert selection — Ctrl+I">
            <svg class="hp-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" />
              <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <polyline points="9,9 6,12 9,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              <polyline points="15,9 18,12 15,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <button class="toolbox-button" data-help-id="rotate-left" @click="rotateSelectionLeft" title="Rotate selection left — Shift + Right-click">
            <span class="toolbox-char" aria-hidden="true">⟲</span>
          </button>

          <button class="toolbox-button" data-help-id="rotate-right" @click="rotateSelectionRight" title="Rotate selection right — Right-click">
            <span class="toolbox-char" aria-hidden="true">⟳</span>
          </button>

          <button class="toolbox-button" data-help-id="flip-h" @click="flipSelectionHorizontal" title="Flip selection horizontally — Ctrl+Shift+F">
            <span class="toolbox-char rotate-90" aria-hidden="true">⇋</span>
          </button>

          <button class="toolbox-button" data-help-id="flip-v" @click="flipSelectionVertical" title="Flip selection vertically — Ctrl+F">
            <span class="toolbox-char" aria-hidden="true">⇋</span>
          </button>

          <button class="toolbox-button" data-help-id="label" @click="createLabel" :disabled="state.activeTabId === 'complete' || isStructureMode || (selectedCells && selectedCells.size > 1)" title="Add label — Click to add a text label" :aria-disabled="state.activeTabId === 'complete' || isStructureMode || (selectedCells && selectedCells.size > 1)">
            <svg class="toolbox-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <!-- Textbox outline -->
              <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
              <!-- Caret cursor on the left -->
              <line x1="7.5" y1="9.5" x2="7.5" y2="14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>

          <button class="toolbox-button" data-help-id="delete" @click="removeSelected" title="Delete selection — Delete / Backspace">
            <span class="toolbox-char" aria-hidden="true">🗑</span>
          </button>

          <!-- Help button -->
          <button class="toolbox-button" data-help-id="help" @click.stop="toggleHelp" :aria-pressed="helpActive" title="Show help for toolbox">
            <span class="toolbox-char" aria-hidden="true">?</span>
          </button>

          <!-- teleporter toggle moved to palette area; GridView listens for changes -->
        </div>
      </div>

      <!-- Help modal: single centered list of toolbar items -->
      <div v-if="helpActive" class="help-backdrop" @click="hideHelp">
        <div class="help-modal" @click.stop>
          <ul class="help-list">
            <li v-for="(item, idx) in helpItems" :key="item.id || ('div-' + idx)" :class="item.divider ? 'help-list-divider-li' : 'help-list-item'">
              <template v-if="item.divider">
                <div class="help-list-divider" />
              </template>
              <template v-else>
                <span class="help-list-icon" v-html="helpIcon(item.id)"></span>
                <div class="help-list-text">
                  <div class="help-popup-title">{{ item.id === 'dark-mode' ? (isDark ? 'Light Mode' : 'Dark Mode') : item.title }}</div>
                  <div class="help-popup-desc">{{ item.id === 'dark-mode' ? (isDark ? 'Switch to light theme.' : 'Toggle the UI dark theme.') : item.desc }}</div>
                </div>
              </template>
            </li>
          </ul>
          <div class="help-modal-actions"><button @click="hideHelp">Close</button></div>
        </div>
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
    <AddLabelDialog v-if="labelDialogVisible"
      :initialText="labelDialogInitial"
      :title="labelDialogTitle"
      :maxLength="15"
      @confirm="onLabelDialogConfirm"
      @cancel="closeLabelDialog" />
  </section>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRestaurantStore, decodeState } from '../store/restaurant'
import { useGrid, TELEPORTER_APPLIANCE_ID } from '../composables/useGrid'
import { readPngText, readStegoFromBytes, readFileAsBytes } from '../composables/usePngMetadata'
import AddLabelDialog from './AddLabelDialog.vue'
import { alert, confirm, toast } from '../utils/ui'

export default {
  name: 'GridView',
  components: { AddLabelDialog },
  setup() {
    const { state } = useRestaurantStore()
    const {
      flatGrid, gridStyleDynamic, cellSize, viewportBoxHeight, rotationStyle, getApplianceIcon, getApplianceLabel, get2DApplianceIcon, isImageIcon,
      hoverLabel,
      selectedLabelIds,
      rotateCell, rotateCellCCW, rotateGroupAroundCell, rotateGroupAroundCellCCW, selectCell, selectedCells, isSelected, selectCellsInRect, addCellsToSelection, selectAll, invertSelection,
      flipSelectionHorizontal, flipSelectionVertical,
      moveSelectionBy,
      moveDragActive, isMoveAllOutside, getCellMoveState, getDisplayCell, isCellGhosted, moveSelectionToTab, addSelectionToTab,
      startMoveDrag, updateMoveDragOffset, commitMoveDrag, cancelMoveDrag, removeSelected,
      copyToClipboard, cutToClipboard,
      pastePending, getCellPasteState, startPaste, startDuplicate, startPasteFromCells, setPasteAnchor, confirmPaste, cancelPaste, pastePendingLabels,
      tabHasVisibleItems, deleteTabItems,
      isStructureMode, selectedStructureTool, getWallEdge, setWallEdge, clearWallEdge,
      loadGridFromState,
      paletteDragActive, paletteDragHoverCell, isPaletteDragDropValid,
      getTeleporterPairPos
      , skipLabelAnchorSync
    } = useGrid()

    // --- Tab colours (10 light, differentiable) ---
    const TAB_COLORS = [
      { bg: '#f3f4f6', border: '#d0d0d0' }, // 0 soft off-white
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

    // Dark-mode variants (used for the inline background behind appliances)
    const TAB_COLORS_DARK = [
      { bg: '#2e3340', border: '#5a6070' }, // 0 base (toned down in dark)
      { bg: '#183560', border: '#3a68a8' }, // 1
      { bg: '#163a22', border: '#348a50' }, // 2
      { bg: '#3a1630', border: '#884060' }, // 3
      { bg: '#2a1448', border: '#6840a0' }, // 4
      { bg: '#3a2408', border: '#906020' }, // 5
      { bg: '#103834', border: '#308878' }, // 6
      { bg: '#3c1818', border: '#904040' }, // 7
      { bg: '#103248', border: '#3078a0' }, // 8
      { bg: '#1e3810', border: '#508828' }, // 9
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
      const dark = isDark && isDark.value
      return { background: (dark ? TAB_COLORS_DARK[idx].bg : TAB_COLORS[idx].bg) }
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


    // --- Tab press-and-hold: open context menu (rename/delete) ---
    const editingTabId = ref(null)
    const editingTabLabel = ref('')
    let tabRenameTimer = null

    function onTabMouseDown(tab, e) {
      if (tab.id === 'complete' || tab.id === 'structure') return
      if (e.button !== 0) return
      // Start a press-and-hold timer to show the tab context menu instead of
      // immediately entering rename mode.
      tabRenameTimer = setTimeout(() => {
        tabRenameTimer = null
        // Use the same handler as right-click context menu so options match.
        onTabContextMenu(tab, e)
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
    const layoutTick = ref(0)
    let gridResizeObserver = null

    const bumpWallLayout = () => { layoutTick.value++ }

    // --- Select-box drag state ---
    const isDragging = ref(false)
    const dragStart = ref(null)
    const dragEnd = ref(null)

    // Toolbox-armed box-select: when true the next click in the grid starts a box selection
    const boxSelectArmed = ref(false)

    function armBoxSelect() {
      boxSelectArmed.value = !boxSelectArmed.value
    }

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

    // --- Structure-mode drag (hold mouse to paint walls/hatches/doors) ---
    const structureDragActive = ref(false)
    const structureDragAction = ref(null) // 'add' | 'remove'
    const structureDraggedEdges = ref(new Set())
    const structureDragStartMouse = ref(null)
    const structureDragActiveAxis = ref(null) // 'horizontal' | 'vertical' | null
    const structureDragAnchor = ref(null) // { x, y }
    const structureDragInitialEdge = ref(null) // 'top'|'right'|'bottom'|'left'
    const structureDragInitialCanonical = ref(null) // { type: 'h'|'v', x, y }

    function onStructureWindowMouseMove(e) {
      if (!structureDragStartMouse.value) return
      // Axis is fixed from mousedown; do nothing if missing
      if (!structureDragActiveAxis.value) return
      const _hit = document.elementFromPoint(e.clientX, e.clientY)
      const el = _hit && _hit.closest ? _hit.closest('.grid-item') : null
      if (!el) return
      // Use canonical initial edge to derive the correct side for the current cell
      const init = structureDragInitialCanonical.value
      if (!init) return
      const x = parseInt(el.dataset.x)
      const y = parseInt(el.dataset.y)
      // Allow cells adjacent to the canonical wall so dragging slightly across
      // a cell boundary still paints the same physical wall.
      if (init.type === 'h') {
        // horizontal wall at init.y can belong to cells with y === init.y (top)
        // or y === init.y - 1 (bottom)
        if (y !== init.y && y !== init.y - 1) return
      } else if (init.type === 'v') {
        // vertical wall at init.x can belong to cells with x === init.x (left)
        // or x === init.x - 1 (right)
        if (x !== init.x && x !== init.x - 1) return
      }
      let dirToUse = null
      if (init.type === 'v') {
        // vertical wall at init.x; for cell (x,y) this is left if init.x === x, right if init.x === x+1
        if (init.x === x) dirToUse = 'left'
        else if (init.x === x + 1) dirToUse = 'right'
        else return
      } else if (init.type === 'h') {
        // horizontal wall at init.y; for cell (x,y) this is top if init.y === y, bottom if init.y === y+1
        if (init.y === y) dirToUse = 'top'
        else if (init.y === y + 1) dirToUse = 'bottom'
        else return
      }
      const edgeKey = `${x},${y},${dirToUse}`
      // debug logging removed
      if (structureDraggedEdges.value.has(edgeKey)) return
      structureDraggedEdges.value.add(edgeKey)
      const existing = getWallEdge(x, y, dirToUse)
      const tool = selectedStructureTool.value
      if (structureDragAction.value === 'add') {
        if (existing !== tool) setWallEdge(x, y, dirToUse, tool)
      } else if (structureDragAction.value === 'remove') {
        if (tool === 'nothing') {
          if (existing) clearWallEdge(x, y, dirToUse)
        } else {
          if (existing === tool) setWallEdge(x, y, dirToUse, tool)
        }
      }
    }

    function onStructureWindowMouseUp() {
      window.removeEventListener('mousemove', onStructureWindowMouseMove)
      window.removeEventListener('mouseup', onStructureWindowMouseUp)
      structureDragActive.value = false
      structureDragAction.value = null
      structureDraggedEdges.value = new Set()
      structureDragStartMouse.value = null
      structureDragActiveAxis.value = null
      structureDragAnchor.value = null
      structureDragInitialEdge.value = null
      // Suppress the subsequent click event from toggling the edge again
      wasDragging.value = true
      setTimeout(() => { wasDragging.value = false }, 0)
    }

    // ---- Event handlers ----

    // --- Paste pending tracking ---
    function onPasteMouseMove(e) {
      const _hit = document.elementFromPoint(e.clientX, e.clientY)
      const el = _hit && _hit.closest ? _hit.closest('.grid-item') : null
      if (el && el.dataset.x !== undefined) {
        setPasteAnchor(parseInt(el.dataset.x), parseInt(el.dataset.y))
      }
    }
    function doUndo() {
      try { window.dispatchEvent(new Event('plateup-undo')) } catch (e) {}
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

    // Like detectEdgeDir but using an explicit element and coords (safe for window events)
    function detectEdgeDirAt(el, clientX, clientY) {
      if (!el) return null
      const rect = el.getBoundingClientRect()
      const relX = (clientX - rect.left) / rect.width
      const relY = (clientY - rect.top) / rect.height
      const d = { top: relY, bottom: 1 - relY, left: relX, right: 1 - relX }
      const minEntry = Object.entries(d).reduce((a, b) => a[1] < b[1] ? a : b)
      return minEntry[1] <= 0.38 ? minEntry[0] : null
    }

    function onApplianceImgError(event, applianceId) {
      const img = event.target
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1'
        img.src = getApplianceIcon(applianceId)
      } else {
        img.style.display = 'none'
        const q = document.createElement('span')
        q.textContent = '?'
        q.style.cssText = 'font-size:1.4em;line-height:1;display:flex;align-items:center;justify-content:center;width:100%;height:100%;'
        img.parentElement.appendChild(q)
      }
    }

    function handleCellClick(e, x, y) {
      if (isStructureMode.value) {
        if (wasDragging.value) { wasDragging.value = false; return }
        const dir = detectEdgeDir(e)
        if (dir) {
          const tool = selectedStructureTool.value
          if (tool === 'nothing') {
            clearWallEdge(x, y, dir)
          } else {
            setWallEdge(x, y, dir, tool)
          }
        }
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
      if (isStructureMode.value) {
        // Start structure-mode edge paint drag: determine edge under cursor
        if (e.button !== 0) return
        const el = e.target.closest('.grid-item')
        if (!el) return
        const cx = parseInt(el.dataset.x)
        const cy = parseInt(el.dataset.y)
        const dir = detectEdgeDir(e)
        if (!dir) return
        const existing = getWallEdge(cx, cy, dir)
        const tool = selectedStructureTool.value

        // Decide whether this drag is adding or removing edges
        if (tool === 'nothing') {
          structureDragAction.value = 'remove'
          if (existing) clearWallEdge(cx, cy, dir)
        } else {
          if (existing === tool) {
            structureDragAction.value = 'remove'
            clearWallEdge(cx, cy, dir)
          } else {
            structureDragAction.value = 'add'
            setWallEdge(cx, cy, dir, tool)
          }
        }

        structureDragActive.value = true
        structureDraggedEdges.value = new Set([`${cx},${cy},${dir}`])
        structureDragStartMouse.value = { x: e.clientX, y: e.clientY }
        // Save initial edge and canonical coordinates and set fixed axis/anchor
        structureDragInitialEdge.value = dir
        if (dir === 'top') structureDragInitialCanonical.value = { type: 'h', x: cx, y: cy }
        else if (dir === 'bottom') structureDragInitialCanonical.value = { type: 'h', x: cx, y: cy + 1 }
        else if (dir === 'left') structureDragInitialCanonical.value = { type: 'v', x: cx, y: cy }
        else if (dir === 'right') structureDragInitialCanonical.value = { type: 'v', x: cx + 1, y: cy }
        structureDragActiveAxis.value = (structureDragInitialCanonical.value.type === 'h') ? 'horizontal' : 'vertical'
        structureDragAnchor.value = { x: cx, y: cy }
        window.addEventListener('mousemove', onStructureWindowMouseMove)
        window.addEventListener('mouseup', onStructureWindowMouseUp)
        return
      }

      // If the box-select toolbox button was armed, the next click should start a box-select drag
      if (boxSelectArmed.value) {
        if (e.button !== 0) { boxSelectArmed.value = false; return }
        const el = e.target.closest('.grid-item')
        if (!el) { boxSelectArmed.value = false; return }
        // Start box-select drag exactly like shift/ctrl modifiers would
        dragStart.value = { x: e.clientX, y: e.clientY }
        dragEnd.value = { x: e.clientX, y: e.clientY }
        isDragging.value = false
        window.addEventListener('mousemove', onWindowMouseMove)
        window.addEventListener('mouseup', onWindowMouseUp)
        // keep `boxSelectArmed` true so the button remains highlighted until mouseup
        return
      }
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
          selectedLabelIds.value = new Set()
          selectCell(cx, cy, false, false)
          if (isSelected(cx, cy) && !isCellGhosted(cx, cy)) {
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
        selectedLabelIds.value = new Set()
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
          const _hit = document.elementFromPoint(e.clientX, e.clientY)
          const el = _hit && _hit.closest ? _hit.closest('.grid-item') : null
          if (el && el.dataset.x !== undefined) {
            updateMoveDragOffset(
              parseInt(el.dataset.x) - pendingMoveCell.value.x,
              parseInt(el.dataset.y) - pendingMoveCell.value.y
            )
          } else if (gridEl.value) {
            // Mouse is outside the grid — compute virtual cell from bounding rect
            const rect = gridEl.value.getBoundingClientRect()
            const cellW = rect.width / state.roomWidth
            const cellH = rect.height / state.roomHeight
            if (cellW > 0 && cellH > 0) {
              const vx = Math.floor((e.clientX - rect.left) / cellW)
              const vy = Math.floor((e.clientY - rect.top) / cellH)
              updateMoveDragOffset(vx - pendingMoveCell.value.x, vy - pendingMoveCell.value.y)
            }
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
          if (isMoveAllOutside.value) {
            removeSelected()
            cancelMoveDrag()
          } else {
            commitMoveDrag()
          }
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
      // If box-select was armed, clear it now that mouse has been released
      if (boxSelectArmed.value) boxSelectArmed.value = false
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

      // Also include any labels whose visual bounding box intersects the drag rect
      const labelEls = gridEl.value.querySelectorAll('.planner-label')
      const selectedLabelIdsLocal = new Set()
      labelEls.forEach(el => {
        const br = el.getBoundingClientRect()
        if (br.left <= rectRight && br.right >= rectLeft && br.top <= rectBottom && br.bottom >= rectTop) {
          const id = el.dataset.labelId
          if (id) selectedLabelIdsLocal.add(id)
        }
      })

      // If a selected label is anchored to a cell, ensure that anchor cell is part of the cell selection
      for (const lblId of selectedLabelIdsLocal) {
        const lbl = (state.labels || []).find(l => l.id === lblId)
        if (!lbl) continue
        let ax = null, ay = null
        if (lbl.anchorIid) {
          const found = flatGrid.value.find(g => g.cell && g.cell.iid === lbl.anchorIid)
          if (found) { ax = found.x; ay = found.y }
        } else if (lbl.anchorX != null && lbl.anchorY != null) {
          ax = lbl.anchorX; ay = lbl.anchorY
        } else if (lbl.x2 != null && lbl.y2 != null) {
          ax = Math.floor(lbl.x2 / 2); ay = Math.floor(lbl.y2 / 2)
        }
        if (ax == null) continue
        // Only add the anchor cell if the anchor cell's DOM element intersects the drag rect
        const anchorEl = gridEl.value.querySelector(`.grid-item[data-x="${ax}"][data-y="${ay}"]`)
        if (!anchorEl) continue
        const br = anchorEl.getBoundingClientRect()
        if (br.left <= rectRight && br.right >= rectLeft && br.top <= rectBottom && br.bottom >= rectTop) {
          cells.push({ x: ax, y: ay })
        }
      }

      // Prevent the grid's label-anchor watcher from pruning these
      // selected labels while we finalize selection — it will run
      // after this tick and would otherwise remove labels whose
      // anchors aren't part of `selectedCells`.
      if (typeof skipLabelAnchorSync !== 'undefined') skipLabelAnchorSync.value = true
      if (addToExisting) {
        addCellsToSelection(cells)
        // merge label selection
        const next = new Set(selectedLabelIds.value)
        for (const id of selectedLabelIdsLocal) next.add(id)
        selectedLabelIds.value = next
      } else {
        selectCellsInRect(cells)
        selectedLabelIds.value = selectedLabelIdsLocal
      }
      nextTick(() => { if (typeof skipLabelAnchorSync !== 'undefined') skipLabelAnchorSync.value = false })
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
        'move-delete-preview': move === 'delete-preview',
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
      // Normalize single-character letter keys so Shift doesn't change match
      const key = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (isStructureMode.value) return
      if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault()
        removeSelected()
      }
      if ((e.ctrlKey || e.metaKey) && key === 'a') { e.preventDefault(); selectAll() }
      if ((e.ctrlKey || e.metaKey) && key === 'i') { e.preventDefault(); invertSelection() }
      if ((e.ctrlKey || e.metaKey) && key === 'c') { e.preventDefault(); copyToClipboard() }
      if ((e.ctrlKey || e.metaKey) && key === 'x') { e.preventDefault(); cutToClipboard() }

      if ((e.ctrlKey || e.metaKey) && key === 'f') {
        e.preventDefault()
        // Ctrl+F: flip across X axis (reverse x). Ctrl+Shift+F: flip across Y axis (reverse y).
        const anyActive = [...selectedCells.value].some(k => { const [x, y] = k.split(',').map(Number); return !isCellGhosted(x, y) })
        if (!anyActive) return
        if (e.shiftKey) flipSelectionHorizontal()
        else flipSelectionVertical()
      }
      if ((e.ctrlKey || e.metaKey) && key === 'v') { e.preventDefault(); startPaste() }
      if ((e.ctrlKey || e.metaKey) && key === 'd') { e.preventDefault(); startDuplicate() }
      if (e.key === 'Escape') {
        if (pastePending.value) { cancelPaste(); return }
        closeContextMenu()
      }
      if (key >= '0' && key <= '9') {
        const idx = key === '0' ? 9 : parseInt(key) - 1
        const userTabs = state.tabs.filter(t => t.id !== 'complete' && t.id !== 'structure')
        if (idx < userTabs.length) state.activeTabId = userTabs[idx].id
      }
      if (key === 't') {
        e.preventDefault()
        showTeleporterLinesAlways.value = !showTeleporterLinesAlways.value
      }
      // Arrow keys: move selection by one cell in that direction
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const anyActive = [...selectedCells.value].some(k => { const [x, y] = k.split(',').map(Number); return !isCellGhosted(x, y) })
        if (!anyActive) return
        e.preventDefault()
        let dx = 0, dy = 0
        if (e.key === 'ArrowUp') dy = -1
        if (e.key === 'ArrowDown') dy = 1
        if (e.key === 'ArrowLeft') dx = -1
        if (e.key === 'ArrowRight') dx = 1
        const success = moveSelectionBy(dx, dy)
        if (!success) flashGroupRed()
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

    // --- Inline help overlay for toolbox ---
    const helpActive = ref(false)
    // overlaySize unused with single-modal help
    const helpItems = [
    { id: 'undo', title: 'Undo', desc: 'Revert previous change.' },
      { id: 'cut', title: 'Cut', desc: 'Remove selection and copy to clipboard.' },
      { id: 'copy', title: 'Copy', desc: 'Copy selection to clipboard.' },
      { id: 'paste', title: 'Paste', desc: 'Paste clipboard contents into grid.' },
      { id: 'duplicate', title: 'Duplicate', desc: 'Duplicate the selected cells.' },
      { id: 'box-select', title: 'Box Select', desc: 'Click and drag to select multiple cells.' },
      { id: 'select-all', title: 'Select All', desc: 'Select every cell in the grid.' },
      { id: 'invert', title: 'Invert', desc: 'Invert the current selection.' },
      { id: 'rotate-left', title: 'Rotate Left', desc: 'Rotate selection counter-clockwise.' },
      { id: 'rotate-right', title: 'Rotate Right', desc: 'Rotate selection clockwise.' },
      { id: 'flip-h', title: 'Flip H', desc: 'Flip selection horizontally.' },
      { id: 'flip-v', title: 'Flip V', desc: 'Flip selection vertically.' },
      { id: 'label', title: 'Add Label', desc: 'Add a text label to the grid.' },
      { id: 'delete', title: 'Delete', desc: 'Delete the selected cells.' },
      { id: 'help', title: 'Help', desc: 'Show this help overlay.' },
      { divider: true },
      { id: 'size', title: 'Change room size', desc: 'Open room size dialog to change dimensions' },
      { id: 'dark-mode', title: 'Dark Mode', desc: 'Toggle the UI dark theme.' },
      { id: 'teleporter-lines', title: 'Teleporter lines', desc: 'Show or hide teleporter connector lines (T).' },
      { id: 'label-display', title: 'Label display', desc: 'Cycle label display: lines+text / text only / hidden' }
    ]

    // Single-modal help UI — no per-popup positions required
    // Track current dark-mode state by observing <html> class so help can show the
    // appropriate opposite-mode toggle wording/icon.
    const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
    let __darkModeObserver = null
    try {
      __darkModeObserver = new MutationObserver(() => { isDark.value = document.documentElement.classList.contains('dark') })
      __darkModeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    } catch (e) {}

    function helpIcon(id) {
      // return small HTML (SVG or emoji) matching the toolbox button
      switch (id) {
        case 'cut': return '<span class="hp-char">✂</span>'
        case 'copy': return '<span class="hp-char">📋</span>'
        case 'paste': return '<span class="hp-char">📥</span>'
        case 'duplicate': return '<span class="hp-char">⎘</span>'
        case 'box-select': return '<svg class="hp-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        case 'select-all': return '<span class="hp-char">▣</span>'
        case 'invert': return '<svg class="hp-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><polyline points="9,9 6,12 9,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><polyline points="15,9 18,12 15,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        case 'rotate-left': return '<span class="hp-char">⟲</span>'
        case 'rotate-right': return '<span class="hp-char">⟳</span>'
        case 'flip-h': return '<span class="hp-char" style="display:inline-block;transform:rotate(90deg)">⇋</span>'
        case 'flip-v': return '<span class="hp-char">⇋</span>'
        case 'undo': return '<span class="hp-char">↶</span>'
        case 'delete': return '<span class="hp-char">🗑</span>'
        case 'help': return '<span class="hp-char">?</span>'
        case 'dark-mode':
          // If we're currently in dark mode, show the "light mode" (sun) icon so
          // the button indicates the action it will perform. Ensure the SVG uses
          // `fill="currentColor"` so it inherits the surrounding `.help-list-icon` color
          // (important for dark mode contrast).
          if (isDark.value) {
            return '<svg class="hp-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zM8 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zM16 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 16 8zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zM12.657 2.343a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM4.464 11.536a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM12.657 13.657a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707z"/></svg>'
          }
          return '<svg class="hp-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>'
        case 'label': return '<svg class="hp-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="7.5" y1="9.5" x2="7.5" y2="14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
        case 'size': return '<svg class="hp-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z" fill="currentColor"/><path d="M3 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H4v4.5a.5.5 0 0 1-1 0v-5zm9-3a.5.5 0 0 1-.5.5H7v-5a.5.5 0 0 1 1 0V6h3.5a.5.5 0 0 1 .5.5z"/></svg>'
        case 'label-display':
          // show icon matching current label display mode
          if (labelDisplayMode && labelDisplayMode.value === 0) {
            return '<svg class="hp-svg" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="9" y1="9" x2="16" y2="16" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 2" stroke-linecap="round"/><circle cx="3.5" cy="3.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/></svg>'
          }
          if (labelDisplayMode && labelDisplayMode.value === 1) {
            return '<svg class="hp-svg" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'
          }
          return '<svg class="hp-svg" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="5" x2="15" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
        case 'teleporter-lines': return '<svg class="hp-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="1.8" y1="1.8" x2="14.2" y2="14.2" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2" stroke-linecap="round"/><circle cx="2" cy="2" r="2" fill="currentColor"/><circle cx="14" cy="14" r="2" fill="currentColor"/></svg>'
        default: return '<span class="hp-char">•</span>'
      }
    }

    function computeHelpPositions() {
      // Deprecated for single-modal help UI. Keep as no-op to avoid errors.
      helpLines.value = []
      popupPositions.value = {}
    }

    function popupStyle(id) {
      return { left: '0px', top: '0px' }
    }

    function showHelp() { helpActive.value = true }
    function hideHelp() { helpActive.value = false }
    function toggleHelp() { helpActive.value ? hideHelp() : showHelp() }
    // no dynamic repositioning required for modal help

    onUnmounted(() => {
      try { if (__darkModeObserver) __darkModeObserver.disconnect() } catch (e) {}
    })

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

    // Persist toolbar pivot across consecutive toolbar-initiated rotates when
    // the selection hasn't changed. This ensures rotating CW then CW (or CW
    // then CCW) with the toolbar uses the same anchor point.
    let lastToolbarPivot = null
    let lastPivotSelectionSig = ''

    function computeToolbarPivot(activeKeys) {
      // Build a stable signature based on appliance instance ids (iids)
      // so the signature doesn't change when selected items move positions.
      const iidList = []
      for (const key of activeKeys) {
        const [x, y] = key.split(',').map(Number)
        const cell = getDisplayCell(x, y)
        if (cell && cell.iid) iidList.push(cell.iid)
        else iidList.push(`pos:${x},${y}`)
      }
      const sig = iidList.slice().sort().join(';')
      if (!lastToolbarPivot || lastPivotSelectionSig !== sig) {
        // compute bounding box center of current positions and prefer upper-left
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        for (const key of activeKeys) {
          const [x, y] = key.split(',').map(Number)
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
        const pivotX = Math.floor((minX + maxX) / 2)
        const pivotY = Math.floor((minY + maxY) / 2)
        lastToolbarPivot = { x: pivotX, y: pivotY }
        lastPivotSelectionSig = sig
      }
      return lastToolbarPivot
    }

    function computeFallbackPivot(activeKeys) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const key of activeKeys) {
        const [x, y] = key.split(',').map(Number)
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
      return { x: Math.floor((minX + maxX) / 2), y: Math.floor((minY + maxY) / 2) }
    }

    // Clear cached toolbar pivot when selection content changes (not mere moves)
    watch(selectedCells, (newSet) => {
      const activeKeys = [...newSet].filter(key => {
        const [x, y] = key.split(',').map(Number)
        return !isCellGhosted(x, y)
      })
      const iidList = activeKeys.map(key => {
        const [x, y] = key.split(',').map(Number)
        const cell = getDisplayCell(x, y)
        return (cell && cell.iid) ? cell.iid : `pos:${x},${y}`
      })
      const sig = iidList.slice().sort().join(';')
      if (!lastPivotSelectionSig || lastPivotSelectionSig !== sig) {
        lastToolbarPivot = null
        lastPivotSelectionSig = ''
      } else {
        // same set of instances — keep cached pivot and refresh signature
        lastPivotSelectionSig = sig
      }
    })
    watch(() => state.activeTabId, () => {
      lastToolbarPivot = null
      lastPivotSelectionSig = ''
    })
    watch(pastePending, () => {
      lastToolbarPivot = null
      lastPivotSelectionSig = ''
    })
    watch(moveDragActive, () => {
      lastToolbarPivot = null
      lastPivotSelectionSig = ''
    })
    watch(paletteDragActive, () => {
      lastToolbarPivot = null
      lastPivotSelectionSig = ''
    })

    // --- Teleporter pair line overlay ---
    // Returns an array of { x1, y1, x2, y2 } in grid-pixel coordinates for each
    // selected paired teleporter, so GridView can draw a dashed connector line.
    const showTeleporterLinesAlways = ref(false)
    const labelDisplayMode = ref(Number(localStorage.getItem('labelDisplayMode') || '0'))

    function toggleTeleporterLines() {
      showTeleporterLinesAlways.value = !showTeleporterLinesAlways.value
    }

    // Listen for label-display-mode changes from App
    function toggleLabelDisplayMode() {
      try { labelDisplayMode.value = (labelDisplayMode.value + 1) % 3 } catch (e) {}
    }

    function rotateSelectionRight() {
      const firstKey = [...selectedCells.value][0]
      if (!firstKey) return

      // Use the rounded center of the non-ghosted selection as the pivot for
      // toolbar rotate buttons (instead of the first/random selected cell).
      const activeKeys = [...selectedCells.value].filter(key => {
        const [kx, ky] = key.split(',').map(Number); return !isCellGhosted(kx, ky)
      })
      if (activeKeys.length > 1) {
        const p = computeToolbarPivot(activeKeys) || computeFallbackPivot(activeKeys)
        const { x: pivotX, y: pivotY } = p
        const success = rotateGroupAroundCell(pivotX, pivotY)
        if (!success) flashGroupRed()
      } else {
        const [x, y] = firstKey.split(',').map(Number)
        rotateCell(x, y)
      }
    }

    function rotateSelectionLeft() {
      const firstKey = [...selectedCells.value][0]
      if (!firstKey) return

      const activeKeys = [...selectedCells.value].filter(key => {
        const [kx, ky] = key.split(',').map(Number); return !isCellGhosted(kx, ky)
      })
      if (activeKeys.length > 1) {
        const p = computeToolbarPivot(activeKeys) || computeFallbackPivot(activeKeys)
        const { x: pivotX, y: pivotY } = p
        const success = rotateGroupAroundCellCCW(pivotX, pivotY)
        if (!success) flashGroupRed()
      } else {
        const [x, y] = firstKey.split(',').map(Number)
        rotateCellCCW(x, y)
      }
    }

    const wallRects = computed(() => {
      const _layoutTick = layoutTick.value
      const rects = []
      const cs = cellSize.value * state.zoom
      const W = state.roomWidth
      const H = state.roomHeight
      const grid = gridEl.value
      if (!grid) return rects

      const cellEls = Array.from(grid.querySelectorAll('.grid-item'))
      if (cellEls.length !== W * H) return rects

      const gridRect = grid.getBoundingClientRect()
      const leftInset = grid.clientLeft
      const topInset = grid.clientTop
      const cellRects = Array.from({ length: H }, () => Array(W).fill(null))

      for (const el of cellEls) {
        const x = Number(el.dataset.x)
        const y = Number(el.dataset.y)
        const rect = el.getBoundingClientRect()
        cellRects[y][x] = {
          left: rect.left - gridRect.left - leftInset,
          top: rect.top - gridRect.top - topInset,
          right: rect.right - gridRect.left - leftInset,
          bottom: rect.bottom - gridRect.top - topInset,
        }
      }

      const edgeThickness = Math.max(cs * 0.125, 2)
      // Reduce overlap to avoid corner bleeding; clamp so overlap never
      // exceeds a portion of the thickness (prevents long corner projection).
      const rawOverlap = Math.max(cs * 0.06, 1.5)
      const edgeOverlap = Math.min(rawOverlap, edgeThickness * 0.6)
      const wallsMap = state.walls || {}
      const outerInset = Math.min(edgeThickness * 0.2, 1)
      const rowRefForEdge = y => Math.min(Math.max(y, 0), H - 1)
      const colRefForEdge = x => Math.min(Math.max(x, 0), W - 1)
      const edgeX = x => {
        const row = rowRefForEdge(0)
        if (x === 0) return cellRects[row][0].left - edgeThickness + outerInset
        if (x === W) return cellRects[row][W - 1].right - outerInset
        const leftCell = cellRects[row][x - 1]
        const rightCell = cellRects[row][x]
        return ((leftCell.right + rightCell.left) / 2) - edgeThickness / 2
      }
      const edgeY = y => {
        const col = colRefForEdge(0)
        if (y === 0) return cellRects[0][col].top - edgeThickness + outerInset
        if (y === H) return cellRects[H - 1][col].bottom - outerInset
        const topCell = cellRects[y - 1][col]
        const bottomCell = cellRects[y][col]
        return ((topCell.bottom + bottomCell.top) / 2) - edgeThickness / 2
      }

      // Horizontal edges: keys are h,x,y for x in [0,W-1], y in [0,H]
      for (let y = 0; y <= H; y++) {
        let x = 0
        while (x < W) {
          const key = `h,${x},${y}`
          let type = wallsMap[key]
          if (!type) {
            if (y === 0 || y === H) type = 'wall'
          }
          if (!type) { x++; continue }
          let start = x, end = x
          while (end + 1 < W) {
            const k2 = `h,${end + 1},${y}`
            let t2 = wallsMap[k2]
            if (!t2 && (y === 0 || y === H)) t2 = 'wall'
            if (t2 !== type) break
            end++
          }
          const rowRef = rowRefForEdge(y)
          const startCell = cellRects[rowRef][start]
          const endCell = cellRects[rowRef][end]
          let x_px = startCell.left - edgeOverlap
          let right_px = endCell.right + edgeOverlap
          if (start === 0) x_px = Math.min(x_px, edgeX(0))
          if (end === W - 1) right_px = Math.max(right_px, edgeX(W) + edgeThickness)
          const width_px = right_px - x_px
          const y_px = edgeY(y)
          rects.push({ x: x_px, y: y_px, w: width_px, h: edgeThickness, type })
          x = end + 1
        }
      }

      // Vertical edges: keys are v,x,y for y in [0,H-1], x in [0,W]
      for (let x = 0; x <= W; x++) {
        let y = 0
        while (y < H) {
          const key = `v,${x},${y}`
          let type = wallsMap[key]
          if (!type) {
            if (x === 0 || x === W) type = 'wall'
          }
          if (!type) { y++; continue }
          let start = y, end = y
          while (end + 1 < H) {
            const k2 = `v,${x},${end + 1}`
            let t2 = wallsMap[k2]
            if (!t2 && (x === 0 || x === W)) t2 = 'wall'
            if (t2 !== type) break
            end++
          }
          const colRef = colRefForEdge(x)
          const startCell = cellRects[start][colRef]
          const endCell = cellRects[end][colRef]
          let y_px = startCell.top - edgeOverlap
          let bottom_px = endCell.bottom + edgeOverlap
          if (start === 0) y_px = Math.min(y_px, edgeY(0))
          if (end === H - 1) bottom_px = Math.max(bottom_px, edgeY(H) + edgeThickness)
          const height_px = bottom_px - y_px
          const x_px = edgeX(x)
          rects.push({ x: x_px, y: y_px, w: edgeThickness, h: height_px, type })
          y = end + 1
        }
      }
      return rects
    })

    const wallRectsHatch = computed(() => wallRects.value.filter(r => r.type === 'hatch'))
    const wallRectsDoor = computed(() => wallRects.value.filter(r => r.type === 'door'))
    const wallRectsWall = computed(() => wallRects.value.filter(r => r.type === 'wall'))

    // Colour overrides for dark mode so walls remain visible on dark backgrounds
    // Even lighter dark-mode tones for better visibility on dark backgrounds
    const wallColor = computed(() => isDark.value ? '#d1d5db' : '#1a1a2e')
    const doorColor = computed(() => isDark.value ? '#ffbf66' : '#c8860a')
    const hatchPatternColor = computed(() => isDark.value ? '#e6eef6' : '#777')

    const teleporterPairLines = computed(() => {
      const lines = []
      const cs = cellSize.value * state.zoom
      const W = state.roomWidth
      const H = state.roomHeight
      const tw = (W * cs - (W - 1) * 2) / W
      const th = (H * cs - (H - 1) * 2) / H
      const cx = x => x * (tw + 2) + tw / 2
      const cy = y => y * (th + 2) + th / 2

      if (showTeleporterLinesAlways.value) {
        // Show lines for every teleporter pair (dedupe pairs)
        const seen = new Set()
        for (const cellInfo of flatGrid.value) {
          const x = cellInfo.x, y = cellInfo.y
          const cell = getDisplayCell(x, y)
          if (cell?.applianceId === TELEPORTER_APPLIANCE_ID && (cell.extraData || 0) > 0) {
            const partner = getTeleporterPairPos(x, y)
            if (!partner) continue
            const key = `${Math.min(x, partner.x)},${Math.min(y, partner.y)},${Math.max(x, partner.x)},${Math.max(y, partner.y)}`
            if (seen.has(key)) continue
            seen.add(key)
            lines.push({ x1: cx(x), y1: cy(y), x2: cx(partner.x), y2: cy(partner.y) })
          }
        }
      } else {
        for (const key of selectedCells.value) {
          const [x, y] = key.split(',').map(Number)
          const cell = getDisplayCell(x, y)
          if (cell?.applianceId === TELEPORTER_APPLIANCE_ID && (cell.extraData || 0) > 0) {
            const partner = getTeleporterPairPos(x, y)
            if (partner) lines.push({ x1: cx(x), y1: cy(y), x2: cx(partner.x), y2: cy(partner.y) })
          }
        }
      }
      return lines
    })

    const labelAnchorLines = computed(() => {
      const lines = []
      const cs = cellSize.value * state.zoom
      const W = state.roomWidth
      const H = state.roomHeight
      const tw = (W * cs - (W - 1) * 2) / W
      const th = (H * cs - (H - 1) * 2) / H
      const cx = x => x * (tw + 2) + tw / 2
      const cy = y => y * (th + 2) + th / 2
      const labels = state.labels || []
      const dotRadius = Math.max(2, Math.round(cs * 0.09))
      for (const lbl of labels) {
        // resolve anchor position: prefer appliance instance id if present
        let anchorCellPos = null
        if (lbl.anchorIid) {
          for (const ci of flatGrid.value) {
            if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break }
          }
        }
        if (!anchorCellPos) {
          if (lbl.anchorX == null || lbl.anchorY == null) continue
          anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
        }
        // compute label pixel position (use dragging pos if present)
        let lx, ly
        const dp = draggingLabelPos.value && draggingLabelPos.value[lbl.id]
        if (dp) {
          lx = dp.left; ly = dp.top
        } else {
          const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : 0)
          const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : 0)
          lx = (x2 / 2) * (tw + 2) + tw / 2
          ly = (y2 / 2) * (th + 2) + th / 2
        }
        const ax = cx(anchorCellPos.x)
        const ay = cy(anchorCellPos.y)
        // Only draw lines when labelDisplayMode is 0 (lines + text)
        if (labelDisplayMode && labelDisplayMode.value !== 0) continue
        // If label visually overlaps the anchor center (within 6px), skip drawing line
        const dx = lx - ax, dy = ly - ay
        if (Math.sqrt(dx * dx + dy * dy) <= 6) continue
        lines.push({ x1: ax, y1: ay, x2: lx, y2: ly, r: dotRadius })
      }
      return lines
    })

    // --- Grid hover status bar ---
    const hoverApplianceId = ref('')

    function onViewportMouseMove(e) {
      const el = e.target.closest?.('.grid-item')
      if (!el) { hoverLabel.value = ''; hoverApplianceId.value = ''; return }
      const x = parseInt(el.dataset.x)
      const y = parseInt(el.dataset.y)
      const rect = el.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width
      const relY = (e.clientY - rect.top) / rect.height
      // debug logging removed
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
      if (state.activeTabId === 'structure') {
        const dir = detectEdgeDir(e)
        if (dir) clearWallEdge(x, y, dir)
        return
      }
      if (state.activeTabId === 'complete') return
      if (isCellGhosted(x, y)) {
        if (!isSelected(x, y)) selectCell(x, y)
        contextMenuPos.value = { x: e.clientX, y: e.clientY }
        contextMenuVisible.value = true
        return
      }
      const ccw = e.shiftKey
      // Group rotation: right-click on a selected non-ghosted cell in a multi-cell selection
      // Only count non-ghosted cells towards the group rotation threshold
      if (isSelected(x, y) && selectedCells.value.size > 1) {
        const activeCount = [...selectedCells.value].filter(k => {
          const [kx, ky] = k.split(',').map(Number); return !isCellGhosted(kx, ky)
        }).length
        if (activeCount > 1) {
          // Right-click group rotation — clear toolbar pivot cache so toolbar
          // rotations don't reuse a pivot chosen by a previous toolbar action.
          lastToolbarPivot = null
          lastPivotSelectionSig = ''
          const success = ccw ? rotateGroupAroundCellCCW(x, y) : rotateGroupAroundCell(x, y)
          if (!success) flashGroupRed()
          return
        }
      }
      // Single-cell right-click rotate — clear cached toolbar pivot as well.
      lastToolbarPivot = null
      lastPivotSelectionSig = ''
      ccw ? rotateCellCCW(x, y) : rotateCell(x, y)
    }

    function onWheel(e) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      state.zoom = Math.min(2.5, Math.max(0.3, Math.round((state.zoom + delta) * 100) / 100))
    }

    // --- File drag-and-drop import ---
    const fileDragOver = ref(false)

    function onFileDragOver(e) {
      if (e.dataTransfer?.types?.includes('Files')) fileDragOver.value = true
    }

    function onFileDragLeave(e) {
      // Only clear when leaving the viewport entirely (not moving over child elements)
      if (!viewportEl.value?.contains(e.relatedTarget)) fileDragOver.value = false
    }

    async function onFileDrop(e) {
      fileDragOver.value = false
      const file = e.dataTransfer?.files?.[0]
      if (!file || file.type !== 'image/png') {
        if (file) await alert('Only PNG export files can be imported by dropping onto the grid.')
        return
      }
      try {
        const bytes = await readFileAsBytes(file)
        // Route through the single shared import handler in AppliancePalette
        window.dispatchEvent(new CustomEvent('plateup-import-bytes', { detail: { bytes } }))
      } catch (e) {
        await alert('Failed to read file: ' + e.message)
      }
    }
    // --- End file drag-and-drop import ---

    onMounted(() => {
      window.addEventListener('keydown', onKeyDown)
      if (viewportEl.value) viewportEl.value.addEventListener('wheel', onWheel, { passive: false })
      nextTick(() => { layoutTick.value++ })
      if (typeof ResizeObserver !== 'undefined' && gridEl.value) {
        gridResizeObserver = new ResizeObserver(() => { layoutTick.value++ })
        gridResizeObserver.observe(gridEl.value)
      }
      window.addEventListener('resize', bumpWallLayout)
      // Initialize teleporter lines toggle from localStorage
      try { showTeleporterLinesAlways.value = localStorage.getItem('teleporterLines') === '1' } catch (e) {}
      // Listen for teleporter toggle events from App
      const teleHandler = (ev) => { try { showTeleporterLinesAlways.value = !!ev.detail } catch (e) {} }
      window.addEventListener('teleporter-lines-changed', teleHandler)
      window.__teleHandlerGridView = teleHandler
      // Initialize label display mode from localStorage and listen for changes
      try { labelDisplayMode.value = Number(localStorage.getItem('labelDisplayMode') || '0') } catch (e) {}
      const labelHandler = (ev) => { try { labelDisplayMode.value = Number(ev.detail) } catch (e) {} }
      window.addEventListener('label-display-mode-changed', labelHandler)
      window.__labelHandlerGridView = labelHandler
    })

    onUnmounted(() => {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup', onWindowMouseUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', bumpWallLayout)
      window.removeEventListener('mousemove', onRightDragMouseMove)
      window.removeEventListener('mouseup', onRightDragMouseUp)
      window.removeEventListener('mousemove', onPasteMouseMove)
      if (gridResizeObserver) {
        gridResizeObserver.disconnect()
        gridResizeObserver = null
      }
      const vp = viewportEl.value
      if (vp) vp.removeEventListener('wheel', onWheel)
      // remove palette teleporter handler
      if (window.__teleHandlerGridView) { window.removeEventListener('teleporter-lines-changed', window.__teleHandlerGridView); delete window.__teleHandlerGridView }
      // remove palette label-display handler
      if (window.__labelHandlerGridView) { window.removeEventListener('label-display-mode-changed', window.__labelHandlerGridView); delete window.__labelHandlerGridView }
      // help overlay listeners removed (no-op positioning for modal)
      cancelMoveDrag()
      cancelPaste()
      if (tabRenameTimer) clearTimeout(tabRenameTimer)
    })

    // Persist teleporter-lines toggle to localStorage
    watch(showTeleporterLinesAlways, (v) => {
      try { localStorage.setItem('teleporterLines', v ? '1' : '0') } catch (e) {}
    })

    watch(() => [state.zoom, state.roomWidth, state.roomHeight], () => {
      nextTick(() => { layoutTick.value++ })
    })

    // --- Label tool state & handlers ---
    const draggingLabelId = ref(null)
    const labelDragInfo = ref(null)
    const labelLastOver = ref(null)
    const draggingLabelPos = ref({}) // transient pixel positions while dragging: { [id]: { left, top } }

    // Dialog state for adding/editing labels
    const labelDialogVisible = ref(false)
    const labelDialogMode = ref('create') // 'create' | 'edit'
    const labelDialogInitial = ref('')
    const labelDialogEditId = ref(null)
    const labelDialogTitle = computed(() => (labelDialogMode.value === 'create' ? 'Label text:' : 'Edit label text (empty to delete):'))

    function openCreateLabelDialog() {
      labelDialogMode.value = 'create'
      labelDialogInitial.value = ''
      labelDialogEditId.value = null
      labelDialogVisible.value = true
    }

    function openEditLabelDialogFor(lbl) {
      labelDialogMode.value = 'edit'
      labelDialogInitial.value = lbl.text || ''
      labelDialogEditId.value = lbl.id
      labelDialogVisible.value = true
    }

    function closeLabelDialog() { labelDialogVisible.value = false; labelDialogEditId.value = null }

    function onLabelDialogConfirm(text) {
      try {
        if (labelDialogMode.value === 'create') {
          // place label at centre of selection if any, otherwise center of room
          let tx = Math.floor(state.roomWidth / 2)
          let ty = Math.floor(state.roomHeight / 2)
          let anchoredCell = null
          if (selectedCells.value && selectedCells.value.size === 1) {
            const [k] = selectedCells.value
            const [sx, sy] = k.split(',').map(Number)
            anchoredCell = { x: sx, y: sy }
            tx = sx; ty = sy
          } else if (selectedCells.value && selectedCells.value.size > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const k of selectedCells.value) { const [sx, sy] = k.split(',').map(Number); minX = Math.min(minX, sx); minY = Math.min(minY, sy); maxX = Math.max(maxX, sx); maxY = Math.max(maxY, sy) }
            const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2; tx = Math.floor(cx); ty = Math.floor(cy)
          }
          let tx2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, tx * 2))
          let ty2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, ty * 2))
          const id = Date.now().toString()
          state.labels = state.labels || []
          const lbl = { id, x2: tx2, y2: ty2, text }
          if (anchoredCell) {
            const cell = getDisplayCell(anchoredCell.x, anchoredCell.y)
            if (cell && cell.iid) lbl.anchorIid = cell.iid
            else { lbl.anchorX = anchoredCell.x; lbl.anchorY = anchoredCell.y }
          }
          state.labels.push(lbl)
        } else if (labelDialogMode.value === 'edit') {
          const idx = (state.labels || []).findIndex(s => s.id === labelDialogEditId.value)
          const t = (text || '').trim().slice(0, 15)
          if (idx === -1) return
          if (t === '') state.labels.splice(idx, 1)
          else state.labels[idx].text = t
        }
      } finally {
        closeLabelDialog()
      }
    }

    function createLabel() {
      if (state.activeTabId === 'complete' || isStructureMode.value) return
      openCreateLabelDialog()
    }

    function getLabelStyle(lbl) {
      // If dragging transient position exists, use it (pixel coords relative to grid)
      const dp = draggingLabelPos.value && draggingLabelPos.value[lbl.id]
      const W = state.roomWidth, H = state.roomHeight
      const cs = cellSize.value * state.zoom
      const tw = (W * cs - (W - 1) * 2) / W
      const th = (H * cs - (H - 1) * 2) / H
      const pitchX = tw + 2
      const pitchY = th + 2
      let leftPx, topPx
      if (dp) {
        leftPx = dp.left
        topPx = dp.top
      } else {
        const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : 0)
        const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : 0)
        leftPx = (x2 / 2) * pitchX + tw / 2
        topPx = (y2 / 2) * pitchY + th / 2
      }
      const dark = isDark && isDark.value
      // Default label colors (used in preview mode or when no anchor found)
      let bg = dark ? 'rgba(20,24,30,0.75)' : 'rgba(255,255,255,0.95)'
      let color = dark ? '#e6f6ff' : '#102330'
      const border = dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)'

      // Helper: compute luminance to choose readable text color
      function parseRgbString(s) {
        const m = s.match(/rgba?\(([^)]+)\)/)
        if (!m) return null
        const parts = m[1].split(',').map(p => parseFloat(p.trim()))
        return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] }
      }
      function hexToRgb(hex) {
        if (!hex) return null
        const h = hex.replace('#','')
        if (h.length === 3) {
          return { r: parseInt(h[0]+h[0],16), g: parseInt(h[1]+h[1],16), b: parseInt(h[2]+h[2],16) }
        }
        if (h.length === 6) {
          return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
        }
        return null
      }
      function luminanceRgb({r,g,b}) {
        const srgb = [r,g,b].map(v => v/255).map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4))
        return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
      }
      function isLightColor(s) {
        if (!s) return false
        let rgb = null
        if (s.startsWith('rgb')) rgb = parseRgbString(s)
        else if (s.startsWith('#')) rgb = hexToRgb(s)
        if (!rgb) return dark === false // fallback: in light mode treat as light
        const L = luminanceRgb(rgb)
        return L > 0.5
      }

      // If label is anchored to an appliance instance and we're NOT in preview mode,
      // use that appliance's tab color as the label background.
      if (lbl.anchorIid && state.activeTabId !== 'complete') {
        try {
          const found = flatGrid.value.find(g => g.cell && g.cell.iid === lbl.anchorIid)
          const firstTab = found && found.cell ? (Array.isArray(found.cell.tabIds) ? found.cell.tabIds[0] : found.cell.tabId) : null
          if (firstTab) {
            const idx = userTabColorMap.value[firstTab]
            if (idx !== undefined) {
              const tabObj = (dark ? TAB_COLORS_DARK[idx] : TAB_COLORS[idx])
              if (tabObj && tabObj.bg) {
                const tabBg = tabObj.bg
                bg = tabBg
                // choose readable text color against tab bg
                color = isLightColor(tabBg) ? '#102330' : '#e6f6ff'
              }
            }
          }
        } catch (e) {}
      }
      return {
        position: 'absolute',
        left: leftPx + 'px',
        top: topPx + 'px',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
        pointerEvents: 'auto',
        background: bg,
        color,
        fontSize: '12px'
      }
    }

    function handleLabelPointerDown(lbl, ev) {
      if (state.activeTabId === 'complete' || isStructureMode.value) return
      // If the box-select tool is armed, allow the event to bubble so the
      // grid's mousedown handler can initiate the box-drag.
      if (boxSelectArmed.value) return

      // Support modifier-click selection on labels (Ctrl/Cmd toggles, Shift adds)
      if (ev.ctrlKey || ev.metaKey || ev.shiftKey) {
        ev.stopPropagation(); ev.preventDefault()
        const next = new Set(selectedLabelIds.value)
        const id = lbl.id
        if (ev.ctrlKey || ev.metaKey) {
          if (next.has(id)) next.delete(id)
          else next.add(id)
        } else if (ev.shiftKey) {
          // add to selection
          next.add(id)
        }
        selectedLabelIds.value = next
        return
      }
      ev.stopPropagation()
      ev.preventDefault()
      draggingLabelId.value = lbl.id
      labelDragInfo.value = { id: lbl.id }
      window.addEventListener('pointermove', onWindowPointerMove)
      window.addEventListener('pointerup', onWindowPointerUp)
    }

    function onWindowPointerMove(e) {
      if (!labelDragInfo.value) return
      if (state.activeTabId === 'complete' || isStructureMode.value) return
      const grid = gridEl.value
      if (!grid) return
      const rect = grid.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      // store transient pixel pos (may be outside 0..grid size)
      draggingLabelPos.value[labelDragInfo.value.id] = { left: localX, top: localY }
      // determine if currently over a grid cell
      const W = state.roomWidth, H = state.roomHeight
      const cs = cellSize.value * state.zoom
      const tw = (W * cs - (W - 1) * 2) / W
      const th = (H * cs - (H - 1) * 2) / H
      const pitchX = tw + 2
      const pitchY = th + 2
      // store transient snapped half-grid coords
      const logicalX = localX / pitchX
      const logicalY = localY / pitchY
      const snappedX2 = Math.round(logicalX * 2)
      const snappedY2 = Math.round(logicalY * 2)
      // compute pixel center for rendering
      const centerX = (snappedX2 / 2) * pitchX + tw / 2
      const centerY = (snappedY2 / 2) * pitchY + th / 2
      draggingLabelPos.value[labelDragInfo.value.id] = { left: centerX, top: centerY }
      // only mark as over-grid if center within grid rect
      if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
        labelLastOver.value = null
      } else {
        const nx = Math.floor(logicalX)
        const ny = Math.floor(logicalY)
        labelLastOver.value = { x: nx, y: ny, snappedX2, snappedY2 }
      }
    }

    function onWindowPointerUp() {
      if (!labelDragInfo.value) {
        window.removeEventListener('pointermove', onWindowPointerMove)
        window.removeEventListener('pointerup', onWindowPointerUp)
        return
      }
      const id = labelDragInfo.value.id
      if (state.activeTabId === 'complete' || isStructureMode.value) {
        // cancel transient drag without committing when in preview/structure
        delete draggingLabelPos.value[id]
        draggingLabelId.value = null
        labelDragInfo.value = null
        labelLastOver.value = null
        window.removeEventListener('pointermove', onWindowPointerMove)
        window.removeEventListener('pointerup', onWindowPointerUp)
        return
      }
      const labelEl = document.querySelector(`[data-label-id="${id}"]`)
      const grid = gridEl.value
      let placed = false
      if (grid) {
        // Prefer using last snapped coords computed during pointermove (more reliable)
        const last = labelLastOver.value
        if (last && typeof last.snappedX2 === 'number' && typeof last.snappedY2 === 'number') {
          const clampedX2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, last.snappedX2))
          const clampedY2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, last.snappedY2))
          const idx = (state.labels || []).findIndex(s => s.id === id)
          if (idx !== -1) {
            state.labels[idx].x2 = clampedX2
            state.labels[idx].y2 = clampedY2
            placed = true
          }
        } else if (labelEl) {
          // Fallback: prefer using the label's stored coords (avoid re-snapping
          // from the element center which can round to the next half-grid).
          const lblR = labelEl.getBoundingClientRect()
          const gridR = grid.getBoundingClientRect()
          const centerX = (lblR.left + lblR.right) / 2
          const centerY = (lblR.top + lblR.bottom) / 2
          const idx = (state.labels || []).findIndex(s => s.id === id)
          if (centerX >= gridR.left && centerY >= gridR.top && centerX <= gridR.right && centerY <= gridR.bottom) {
            if (idx !== -1) {
              // If the label already has half-grid coords, keep them instead
              // of recomputing from the DOM center (which biases rounding).
              const existing = state.labels[idx]
              if (typeof existing.x2 === 'number' && typeof existing.y2 === 'number') {
                const clampedX2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, existing.x2))
                const clampedY2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, existing.y2))
                state.labels[idx].x2 = clampedX2
                state.labels[idx].y2 = clampedY2
                placed = true
              } else {
                // Fallback to computing from the element center if no stored coords
                const W = state.roomWidth, H = state.roomHeight
                const cs = cellSize.value * state.zoom
                const tw = (W * cs - (W - 1) * 2) / W
                const th = (H * cs - (H - 1) * 2) / H
                const pitchX = tw + 2
                const pitchY = th + 2
                const localX = centerX - gridR.left
                const localY = centerY - gridR.top
                const logicalX = localX / pitchX
                const logicalY = localY / pitchY
                const snappedX2 = Math.round(logicalX * 2)
                const snappedY2 = Math.round(logicalY * 2)
                const clampedX2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, snappedX2))
                const clampedY2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, snappedY2))
                state.labels[idx].x2 = clampedX2
                state.labels[idx].y2 = clampedY2
                placed = true
              }
            }
          } else {
            if (idx !== -1) state.labels.splice(idx, 1)
          }
        }
      }
      // cleanup
      delete draggingLabelPos.value[id]
      draggingLabelId.value = null
      labelDragInfo.value = null
      labelLastOver.value = null
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
    }

    function editLabel(lbl) {
      if (state.activeTabId === 'complete' || isStructureMode.value) return
      openEditLabelDialogFor(lbl)
    }

    onUnmounted(() => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
    })

    return {
      state, flatGrid, gridStyleDynamic, viewportBoxHeight, cellSize, rotationStyle, getApplianceIcon, get2DApplianceIcon, isImageIcon,
      rotateCell, selectedCells, isSelected, addTab, selectTab,
      selectedLabelIds,
      gridEl, viewportEl, isDragging, moveDragActive, dragStart, dragEnd, dragRectStyle,
      handleCellClick, handleCellContextMenu, onGridMouseDown, cellClasses, getDisplayCell,
      editingTabId, editingTabLabel, onTabMouseDown, cancelTabRenameTimer, commitTabRename, cancelTabRename,
      contextMenuVisible, contextMenuPos, closeContextMenu, doMoveToThisLevel, doShowInBothLevels,
      tabContextMenuVisible, tabContextMenuPos, tabDeleteConfirmVisible,
      onTabContextMenu, closeTabContextMenu, doTabContextRename, doTabContextDelete,
      cancelTabDeleteConfirm, confirmTabDelete,
      pastePending, pastePendingLabels,
      isStructureMode, getWallEdge,
      getTabColorClass, getApplianceBgStyle,
      hoverLabel, hoverApplianceId, onViewportMouseMove, onViewportMouseLeave,
      getApplianceIcon, isImageIcon, onApplianceImgError,
      TELEPORTER_APPLIANCE_ID, wallRects, wallRectsHatch, wallRectsDoor, wallRectsWall, teleporterPairLines, labelAnchorLines, showTeleporterLinesAlways, labelDisplayMode,
      wallColor, doorColor, hatchPatternColor,
      flipSelectionHorizontal, flipSelectionVertical, startDuplicate, copyToClipboard, cutToClipboard, startPaste, removeSelected, selectAll, invertSelection, rotateSelectionLeft, rotateSelectionRight,
      createLabel, handleLabelPointerDown, getLabelStyle, editLabel, labelDialogVisible, labelDialogInitial, labelDialogTitle, onLabelDialogConfirm, closeLabelDialog,
      boxSelectArmed, armBoxSelect,
      // Help overlay API
      helpActive, toggleHelp, hideHelp, helpItems, helpIcon, isDark,
      doUndo,
      fileDragOver, onFileDragOver, onFileDragLeave, onFileDrop
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
.viewport-box.file-drag-over {
  border-color: #4a90d9;
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.35);
  background: #f0f6ff;
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
  overflow: visible;
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
.grid-item.selected { border: 2px dashed #000000; background: #dde9ff }
.grid-item.selected { cursor: grab }
.grid-item.selected.ghosted { border: 2px dashed #000000; background: #e4e4e4 }
.grid.move-dragging .grid-item { cursor: grabbing }
.grid-item.move-source { border: 2px dashed #000000; background: #dde9ff }
.grid-item.move-source .cell-content { opacity: 0.35; }
.grid-item.move-delete-preview { border: 2px dashed #d93025; background: rgba(217, 48, 37, 0.15) }
.grid-item.move-delete-preview .cell-content { opacity: 0.35; }
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
  border: 2px dashed #1f79ff;
  background: transparent;
  pointer-events: none;
  z-index: 9999;
  border-radius: 4px;
}
.cell-label { font-size: 10px; color: #bbb; position: absolute; top: 2px; left: 2px; }
.planner-label { cursor: grab; user-select: none; white-space: nowrap; border-radius: 10px; border: 1px solid rgba(0,0,0,0.2); box-shadow: 0 4px 10px rgba(16,35,48,0.06), inset 0 1px 0 rgba(255,255,255,0.6); padding: 4px 6px; transition: box-shadow .12s, transform .08s; }
.dark .planner-label { border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 6px 14px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.03); }
.planner-label.label-selected { border: 2px dashed #000000; box-shadow: none; transform: none; z-index: 80 }
.dark .planner-label.label-selected { border: 2px dashed #000000; outline: 2px solid rgba(255,255,255,0.12); box-shadow: 0 0 0 2px rgba(255,255,255,0.03); z-index: 80 }
.planner-label.label-paste-preview { opacity: 0.6; pointer-events: none; border: 1px dashed rgba(43,136,255,0.7); box-shadow: 0 0 0 1px rgba(43,136,255,0.25); }
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
.wall-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 30;
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
.tab-user-0 { background: #f3f4f6; border-color: #d0d0d0; }
.tab-user-0.active { background: #f3f4f6; border-color: #b0b0b0; }
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

/* Dark mode tab overrides */
.dark .tab-postit.tab-color-structure { background: #232323; border-color: #444; color: #eee; }
.dark .tab-postit.tab-color-structure.active { background: #353535; border-color: #888; color: #fff; }
.dark .tab-postit.tab-color-complete { background: #232323; border-color: #444; color: #eee; }
.dark .tab-postit.tab-color-complete.active { background: #353535; border-color: #888; color: #fff; }
.dark .tab-postit.add { background: #1a2a38; border-color: #3a6a8a; color: #cce6ff; }
.dark .tab-postit { color: #eee; }

/* Ensure Base tab (tab-user-0) matches the grid appliance background in dark mode */
.dark .tab-user-0 { background: #2e3340; border-color: #5a6070; }
.dark .tab-user-0.active { background: #363c4a; border-color: #6a7080; }
.controls-with-status { display: flex; flex-direction: row; align-items: center; gap: 8px; justify-content: center; }
.controls-right { display: flex; flex-direction: column; align-items: stretch; gap: 5px; }
.controls { display: flex; gap: 18px; align-items: center; }
.size-status-stack { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.control-compass, .control-mode, .control-zoom, .control-size { display: flex; align-items: center; gap: 6px }
.control-zoom { display: none }
.control-zoom input[type="range"] { flex: 1; width: auto; max-width: none }
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
/* Edge marker overlays (scale with --cell-size) */
.edge-marker {
  position: absolute;
  pointer-events: none;
  z-index: 10;
  border-radius: 2px;
  box-sizing: border-box;
  /* Thickness and overlap are clamped to avoid subpixel gaps when zoomed out.
     Raise the minimums slightly to prevent visual seams at intermediate zooms. */
  --edge-thickness: max(calc(var(--cell-size) * 0.125), 2px);
  --edge-overlap: max(calc(var(--cell-size) * 0.09), 3px);
  /* Rendering hints to reduce subpixel tearing */
  will-change: transform;
  backface-visibility: hidden;
}
.edge-marker.edge-top,
.edge-marker.edge-bottom {
  left: calc(var(--edge-overlap) * -1);
  right: calc(var(--edge-overlap) * -1);
  height: var(--edge-thickness);
}
.edge-marker.edge-left,
.edge-marker.edge-right {
  top: calc(var(--edge-overlap) * -1);
  bottom: calc(var(--edge-overlap) * -1);
  width: var(--edge-thickness);
}
.edge-marker.edge-top    { top: calc(var(--edge-overlap) * -0.5); }
.edge-marker.edge-bottom { bottom: calc(var(--edge-overlap) * -0.5); }
.edge-marker.edge-left   { left: calc(var(--edge-overlap) * -0.5); }
.edge-marker.edge-right  { right: calc(var(--edge-overlap) * -0.5); }
.edge-marker.edge-type-wall   { background: #1a1a2e }
.edge-marker.edge-type-hatch  { background: repeating-linear-gradient(45deg, #555 0px, #555 3px, transparent 3px, transparent 7px); }
.edge-marker.edge-type-door   { background: #c8860a }

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
.toolbox-box { margin: 0 auto; display:flex; align-items:center; padding:6px; background: #f4f8fb; border-radius:8px; border: 1px solid #d2dfe9 }
.dark .toolbox-box { background: #1e2629; border-color: #33393d }
.toolbox { display:flex; gap:8px; align-items:center; }
.toolbox-button {
  background: #fff;
  border: 1px solid #c8d6e8;
  border-radius: 6px;
  padding: 8px 10px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 0 rgba(0,0,0,0.03);
  color: #21313a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
/* Disabled toolbox button appearance */
.toolbox-button:disabled,
.toolbox-button[aria-disabled="true"] {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
  filter: grayscale(20%);
}
.toolbox-icon { width: 22px; height: 22px; display: block }
.toolbox-char { font-size: 22px; line-height: 1; display: inline-block; transform: translateY(-1px) }
.toolbox-button[aria-pressed="true"] { background: #e8f9ee; border-color: #6fd08a; color: #0a4f24 }
.toolbox-button:hover { transform: translateY(-1px) }

/* Dark mode: keep button visible */
.dark .toolbox-button {
  background: #2b3338;
  border-color: #444d55;
  color: #eef6f1;
}
.dark .toolbox-button:disabled,
.dark .toolbox-button[aria-disabled="true"] {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
  filter: grayscale(20%);
}
.dark .toolbox-button[aria-pressed="true"] { background: #114226; border-color: #1f7a44; color: #e6fff0 }
/* Help overlay popups and connector lines */
.help-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  pointer-events: auto;
}
.help-lines {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}
.help-popup {
  position: absolute;
  max-width: 220px;
  background: #ffffff;
  border: 1px solid #c8d6e8;
  border-radius: 8px;
  padding: 8px 10px;
  box-shadow: 2px 4px 14px rgba(0,0,0,0.12);
  color: #21313a;
  pointer-events: auto;
}
.help-list-divider { height: 1px; background: rgba(31,121,255,0.08); margin: 10px 0; border-radius: 1px }
.dark .help-list-divider { background: rgba(255,255,255,0.06) }
.help-popup { display: flex; align-items: flex-start; gap: 8px }
.help-popup-icon { width: 44px; height: 44px; flex: 0 0 44px; display: flex; align-items: center; justify-content: center; background: #f4f8fb; border-radius: 6px; border: 1px solid #dceaf7; color: #21313a }
.help-popup-icon .hp-char { font-size: 20px }
.help-popup-icon .rotate-90 { display: inline-block; transform: rotate(90deg); }
.rotate-90 { display: inline-block; transform: rotate(90deg); }
.toolbox-button .hp-svg { width: 22px; height: 22px }
.help-popup-icon .hp-svg { width: 28px; height: 28px }
.help-popup-body { min-width: 140px }
.help-popup-title { font-weight: 700; margin-bottom: 4px }
.help-popup-desc { font-size: 13px; color: #42556a }
/* Single-modal help styles */
.help-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12,18,28,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.help-modal {
  background: #fff;
  border-radius: 10px;
  padding: 18px 18px;
  width: 650px; /* 25% wider than previous 520px */
  max-width: calc(100% - 32px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
.help-modal-title { margin: 0 0 8px 0; font-size: 16px }
.help-list { list-style: none; padding: 0; margin: 8px 0 12px 0; max-height: 64vh; overflow: auto; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 12px }
.help-list-item { display: flex; gap: 10px; padding: 6px 8px; border-radius: 6px; align-items: center }
.help-list-item + .help-list-item { margin-top: 0 }
.help-list-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #f6fbff; border-radius: 6px; border: 1px solid #cfe6ff; flex: 0 0 40px; box-shadow: 0 2px 6px rgba(17,24,39,0.06), inset 0 1px 0 rgba(255,255,255,0.6) }
.dark .help-list-icon { background: #172127; border: 1px solid #2b3b45; box-shadow: 0 2px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02); color: #d9f6ff }
.help-list-icon .hp-char { font-size: 32px !important; line-height: 40px !important; display: inline-flex; align-items: center; justify-content: center; width: 40px !important; height: 40px !important; font-family: inherit; font-weight: 600 }
.help-list-icon svg.hp-svg { width: 36px; height: 36px }
.help-list-text { min-width: 0; display: flex; flex-direction: column; justify-content: center }

.help-list-divider-li { grid-column: 1 / -1; padding: 6px 0 }
.help-list-divider { height: 2px; background: rgba(31,121,255,0.14); border-radius: 2px }
.dark .help-list-divider { background: rgba(255,255,255,0.08) }

/* Dark-mode help modal adjustments */
.dark .help-modal { background: #172127; color: #e6fff0; box-shadow: 0 12px 40px rgba(0,0,0,0.6) }
.dark .help-modal-actions button { background: #2b3338; border: 1px solid #444d55; color: #eef6f1 }

@media (max-width: 640px) {
  .help-modal { width: 92% }
  .help-list { grid-template-columns: 1fr }
}
.help-modal-actions { text-align: right }
.help-modal-actions button { padding: 8px 12px; border-radius: 6px; border: 1px solid #cbdffb; background: #f6fbff }
</style>
