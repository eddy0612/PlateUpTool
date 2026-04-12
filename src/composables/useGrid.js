import { ref, computed, watch } from 'vue'
import { useRestaurantStore } from '../store/restaurant'
import { useAppliancePalette } from './useAppliancePalette'

// Module-level singletons — grid state is shared across GridView and AppliancePalette
const { state } = useRestaurantStore()
const { palette } = useAppliancePalette()

// Track viewport dimensions so the grid can fill the available space
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)
window.addEventListener('resize', () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
})

// Track selected cells for highlighting (Set of "x,y" keys)
const selectedCells = ref(new Set())
const anchorCell = ref(null)

function cellKey(x, y) { return `${x},${y}` }

function isSelected(x, y) {
  return selectedCells.value.has(cellKey(x, y))
}

const grid = ref([])

function initGrid() {
  const oldGrid = grid.value
  const newGrid = []
  for (let y = 0; y < state.roomHeight; ++y) {
    const row = []
    for (let x = 0; x < state.roomWidth; ++x) {
      row.push((oldGrid[y] && oldGrid[y][x]) ? oldGrid[y][x] : null)
    }
    newGrid.push(row)
  }
  grid.value = newGrid
}

watch(() => [state.roomWidth, state.roomHeight], initGrid, { immediate: true })

const flatGrid = computed(() => {
  const arr = []
  for (let y = 0; y < grid.value.length; ++y) {
    for (let x = 0; x < grid.value[y].length; ++x) {
      arr.push({ x, y, cell: grid.value[y][x] })
    }
  }
  return arr
})

// Approximate space consumed by chrome outside the grid:
//   Vertical:   ~20px root padding + ~40px header + ~8px gap + ~16px viewport padding + ~40px controls = 124px
//   Horizontal: ~20px root padding + ~90px left tab offset + ~10px gap + ~280px palette + ~16px viewport padding = 416px
const H_OVERHEAD = 130
const W_OVERHEAD = 420

const cellSize = computed(() => {
  const availableH = windowHeight.value - H_OVERHEAD
  const availableW = windowWidth.value - W_OVERHEAD
  return Math.max(16, Math.floor(Math.min(availableH / state.roomHeight, availableW / state.roomWidth) * 0.95))
})

// Height of the .viewport-box element: based on available vertical space so it stays
// consistent when only roomWidth changes (which affects cellSize but not vertical space).
const viewportBoxHeight = computed(() => Math.floor((windowHeight.value - H_OVERHEAD) * 0.95) + 18)

const gridStyleDynamic = computed(() => ({
  gridTemplateColumns: `repeat(${state.roomWidth}, 1fr)`,
  gridTemplateRows: `repeat(${state.roomHeight}, 1fr)`,
  width: `${state.roomWidth * cellSize.value * state.zoom}px`,
  height: `${state.roomHeight * cellSize.value * state.zoom}px`,
  transform: `rotate(${state.orientation}deg)`
}))

function rotationStyle(rot) {
  return { display: 'inline-block', transform: `rotate(${rot * 90}deg)` }
}

function getApplianceIcon(applianceId) {
  const found = palette.value.find(a => a.id === applianceId)
  return found ? found.icon || found.label : '?'
}

function isImageIcon(icon) {
  return /\.(png|jpg|jpeg|webp)$/i.test(icon)
}

function get2DApplianceIcon(applianceId) {
  const icon = getApplianceIcon(applianceId)
  if (!isImageIcon(icon)) return icon
  return icon.replace(/([^\/]*)$/, '2D_$1')
}

function addToGrid(item) {
  if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
  const tabId = state.activeTabId
  if (selectedCells.value.size === 1) {
    const [key] = selectedCells.value
    const [x, y] = key.split(',').map(Number)
    if (!grid.value[y][x]) {
      grid.value[y][x] = { applianceId: item.id, rotation: 0, extraData: 0, tabIds: [tabId] }
      return
    }
  }
  for (let y = 0; y < grid.value.length; ++y) {
    for (let x = 0; x < grid.value[y].length; ++x) {
      if (!grid.value[y][x]) {
        grid.value[y][x] = { applianceId: item.id, rotation: 0, extraData: 0, tabIds: [tabId] }
        return
      }
    }
  }
  alert('Grid is full! Increase room size to add more items.')
}

function rotateCell(x, y) {
  const cell = grid.value[y][x]
  if (cell && cell.applianceId) cell.rotation = (cell.rotation + 1) % 4
}

// Rotate all selected cells 90° CW around the given pivot cell.
// The pivot stays in place; every other selected cell moves to its rotated position.
// Returns true on success, false if the rotation is blocked (out of bounds or collision).
function rotateGroupAroundCell(pivotX, pivotY) {
  if (selectedCells.value.size <= 1) return false

  // Compute rotated positions — CW 90° in grid coords (y increases downward):
  //   new_x = pivotX - (y - pivotY)
  //   new_y = pivotY + (x - pivotX)
  const moves = []
  for (const key of selectedCells.value) {
    const [x, y] = key.split(',').map(Number)
    const dx = x - pivotX
    const dy = y - pivotY
    moves.push({ sx: x, sy: y, tx: pivotX - dy, ty: pivotY + dx })
  }

  // Validate: every target must be in-bounds and not occupied by a non-selected cell
  for (const { tx, ty } of moves) {
    if (tx < 0 || tx >= state.roomWidth || ty < 0 || ty >= state.roomHeight) return false
    if (grid.value[ty]?.[tx]?.applianceId && !selectedCells.value.has(cellKey(tx, ty))) return false
  }

  // Snapshot content (incrementing each appliance's rotation) before any writes
  const moveData = moves.map(({ sx, sy, tx, ty }) => {
    const src = grid.value[sy][sx]
    return {
      tx, ty,
      content: src ? { ...src, rotation: ((src.rotation || 0) + 1) % 4 } : null
    }
  })

  // Clear sources, then write targets
  for (const { sx, sy } of moves) grid.value[sy][sx] = null
  for (const { tx, ty, content } of moveData) grid.value[ty][tx] = content

  // Update selection to the new positions
  selectedCells.value = new Set(moves.map(({ tx, ty }) => cellKey(tx, ty)))
  anchorCell.value = null
  return true
}

function selectCell(x, y, shiftKey = false, ctrlKey = false) {
  if (shiftKey && anchorCell.value) {
    const x0 = Math.min(anchorCell.value.x, x)
    const x1 = Math.max(anchorCell.value.x, x)
    const y0 = Math.min(anchorCell.value.y, y)
    const y1 = Math.max(anchorCell.value.y, y)
    const base = ctrlKey ? new Set(selectedCells.value) : new Set()
    for (let cy = y0; cy <= y1; cy++)
      for (let cx = x0; cx <= x1; cx++)
        base.add(cellKey(cx, cy))
    selectedCells.value = base
  } else if (ctrlKey) {
    const key = cellKey(x, y)
    const next = new Set(selectedCells.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selectedCells.value = next
    anchorCell.value = { x, y }
  } else {
    selectedCells.value = new Set([cellKey(x, y)])
    anchorCell.value = { x, y }
  }
}

function selectCellsInRect(cells) {
  selectedCells.value = new Set(cells.map(c => cellKey(c.x, c.y)))
  if (cells.length > 0) anchorCell.value = cells[cells.length - 1]
}

function addCellsToSelection(cells) {
  const next = new Set(selectedCells.value)
  cells.forEach(c => next.add(cellKey(c.x, c.y)))
  selectedCells.value = next
  if (cells.length > 0) anchorCell.value = cells[cells.length - 1]
}

// --- Move drag state ---
const moveDragActive = ref(false)
const moveDragOffset = ref({ dx: 0, dy: 0 })

// Map of "tx,ty" -> "sx,sy" for every selected cell offset by the current drag delta
const moveDragTargetMap = computed(() => {
  if (!moveDragActive.value || selectedCells.value.size === 0) return new Map()
  const map = new Map()
  for (const srcKey of selectedCells.value) {
    const [sx, sy] = srcKey.split(',').map(Number)
    map.set(cellKey(sx + moveDragOffset.value.dx, sy + moveDragOffset.value.dy), srcKey)
  }
  return map
})

const isMoveValid = computed(() => {
  if (!moveDragActive.value || moveDragTargetMap.value.size === 0) return false
  for (const [tKey] of moveDragTargetMap.value) {
    const [tx, ty] = tKey.split(',').map(Number)
    if (tx < 0 || tx >= state.roomWidth || ty < 0 || ty >= state.roomHeight) return false
    // Occupied by a cell that is NOT one of the sources being moved
    if (grid.value[ty]?.[tx]?.applianceId && !selectedCells.value.has(cellKey(tx, ty))) return false
  }
  return true
})

// Returns 'source' | 'preview-valid' | 'preview-invalid' | null
function getCellMoveState(x, y) {
  if (!moveDragActive.value) return null
  const key = cellKey(x, y)
  if (selectedCells.value.has(key)) return 'source'
  if (moveDragTargetMap.value.has(key)) return isMoveValid.value ? 'preview-valid' : 'preview-invalid'
  return null
}

// What content a cell should visually display (target preview shows source content)
function getDisplayCell(x, y) {
  if (moveDragActive.value) {
    const srcKey = moveDragTargetMap.value.get(cellKey(x, y))
    if (srcKey !== undefined) {
      const [sx, sy] = srcKey.split(',').map(Number)
      return grid.value[sy]?.[sx] || null
    }
  }
  if (pastePending.value) {
    const cell = pastePendingTargetMap.value.get(cellKey(x, y))
    if (cell !== undefined) return cell
  }
  return grid.value[y]?.[x] || null
}

function startMoveDrag() { moveDragActive.value = true }

function updateMoveDragOffset(dx, dy) { moveDragOffset.value = { dx, dy } }

function commitMoveDrag() {
  if (!isMoveValid.value) { cancelMoveDrag(); return }
  const moves = []
  for (const [tKey, sKey] of moveDragTargetMap.value) {
    const [tx, ty] = tKey.split(',').map(Number)
    const [sx, sy] = sKey.split(',').map(Number)
    moves.push({ tx, ty, content: { ...grid.value[sy][sx] } })
  }
  for (const sKey of selectedCells.value) {
    const [sx, sy] = sKey.split(',').map(Number)
    grid.value[sy][sx] = null
  }
  for (const { tx, ty, content } of moves) {
    grid.value[ty][tx] = content
  }
  selectedCells.value = new Set(moveDragTargetMap.value.keys())
  anchorCell.value = null
  moveDragActive.value = false
  moveDragOffset.value = { dx: 0, dy: 0 }
}

function cancelMoveDrag() {
  moveDragActive.value = false
  moveDragOffset.value = { dx: 0, dy: 0 }
}

function removeSelected() {
  if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
  for (const key of selectedCells.value) {
    const [x, y] = key.split(',').map(Number)
    grid.value[y][x] = null
  }
  selectedCells.value = new Set()
}

function moveSelectionToTab(targetTabId) {
  for (const key of selectedCells.value) {
    const [x, y] = key.split(',').map(Number)
    const cell = grid.value[y]?.[x]
    if (cell?.applianceId) {
      cell.tabIds = [targetTabId]
    }
  }
}

function addSelectionToTab(targetTabId) {
  for (const key of selectedCells.value) {
    const [x, y] = key.split(',').map(Number)
    const cell = grid.value[y]?.[x]
    if (cell?.applianceId) {
      if (!Array.isArray(cell.tabIds)) {
        cell.tabIds = cell.tabId ? [cell.tabId] : []
      }
      if (!cell.tabIds.includes(targetTabId)) {
        cell.tabIds.push(targetTabId)
      }
    }
  }
}

function isCellGhosted(x, y) {
  if (pastePending.value && pastePendingTargetMap.value.has(cellKey(x, y))) return false
  const cell = getDisplayCell(x, y)
  if (!cell?.applianceId) return false
  if (state.activeTabId === 'complete') return false
  // Support both new tabIds array and legacy tabId string
  if (Array.isArray(cell.tabIds)) return !cell.tabIds.includes(state.activeTabId)
  if (cell.tabId != null) return cell.tabId !== state.activeTabId
  return false
}

// --- Structure mode ---
const isStructureMode = computed(() => state.activeTabId === 'structure')
const selectedStructureTool = ref('wall') // 'wall' | 'hatch' | 'door'

function setStructureTool(id) { selectedStructureTool.value = id }

function getEdgeKey(x, y, dir) {
  if (dir === 'top')    return `h,${x},${y}`
  if (dir === 'bottom') return `h,${x},${y + 1}`
  if (dir === 'left')   return `v,${x},${y}`
  if (dir === 'right')  return `v,${x + 1},${y}`
  return null
}

function isBorderEdge(x, y, dir) {
  if (dir === 'top'    && y === 0)                    return true
  if (dir === 'bottom' && y === state.roomHeight - 1) return true
  if (dir === 'left'   && x === 0)                    return true
  if (dir === 'right'  && x === state.roomWidth - 1)  return true
  return false
}

function getWallEdge(x, y, dir) {
  if (!state.walls) return isBorderEdge(x, y, dir) ? 'wall' : null
  const key = getEdgeKey(x, y, dir)
  if (state.walls[key]) return state.walls[key]
  // Border edges always show as wall unless overridden by a stored door
  if (isBorderEdge(x, y, dir)) return 'wall'
  return null
}

function setWallEdge(x, y, dir, type) {
  if (!state.walls) state.walls = {}
  const key = getEdgeKey(x, y, dir)
  if (!key) return
  if (isBorderEdge(x, y, dir)) {
    // Only doors can be toggled on border edges; all other tools are ignored
    if (type !== 'door') return
    if (state.walls[key] === 'door') {
      delete state.walls[key]
    } else {
      state.walls[key] = 'door'
    }
    return
  }
  if (state.walls[key] === type) {
    delete state.walls[key]
  } else {
    state.walls[key] = type
  }
}

// Clear selection when switching tabs (including to/from structure mode)
watch(() => state.activeTabId, () => {
  selectedCells.value = new Set()
  anchorCell.value = null
})

// --- Clipboard (module-level, not persisted to URL) ---
const clipboard = ref([])              // [{ dx, dy, cell }] relative to selection top-left
const clipboardPasteOrigin = ref(null) // { x, y } top-left for next paste

function copyToClipboard() {
  if (selectedCells.value.size === 0) return
  let minX = Infinity, minY = Infinity
  for (const key of selectedCells.value) {
    const [x, y] = key.split(',').map(Number)
    if (x < minX) minX = x
    if (y < minY) minY = y
  }
  const entries = []
  for (const key of selectedCells.value) {
    const [x, y] = key.split(',').map(Number)
    const cell = grid.value[y]?.[x]
    if (cell) entries.push({ dx: x - minX, dy: y - minY, cell: { ...cell } })
  }
  clipboard.value = entries
  clipboardPasteOrigin.value = { x: minX + 1, y: minY + 1 }
}

function cutToClipboard() {
  if (selectedCells.value.size === 0) return
  copyToClipboard()
  removeSelected()
}

// --- Paste pending mode ---
const pastePending = ref(false)
const pasteAnchor = ref(null) // { x, y } top-left of paste preview

const pastePendingTargetMap = computed(() => {
  if (!pastePending.value || !pasteAnchor.value || clipboard.value.length === 0) return new Map()
  const map = new Map()
  for (const { dx, dy, cell } of clipboard.value) {
    map.set(cellKey(pasteAnchor.value.x + dx, pasteAnchor.value.y + dy), cell)
  }
  return map
})

const isPasteValid = computed(() => {
  if (!pastePending.value || pastePendingTargetMap.value.size === 0) return false
  for (const [tKey] of pastePendingTargetMap.value) {
    const [tx, ty] = tKey.split(',').map(Number)
    if (tx < 0 || tx >= state.roomWidth || ty < 0 || ty >= state.roomHeight) return false
    if (grid.value[ty]?.[tx]?.applianceId) return false
  }
  return true
})

function getCellPasteState(x, y) {
  if (!pastePending.value) return null
  const key = cellKey(x, y)
  if (!pastePendingTargetMap.value.has(key)) return null
  return isPasteValid.value ? 'paste-preview-valid' : 'paste-preview-invalid'
}

function startPaste() {
  if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
  if (clipboard.value.length === 0) return
  pastePending.value = true
  pasteAnchor.value = clipboardPasteOrigin.value ? { ...clipboardPasteOrigin.value } : { x: 0, y: 0 }
  selectedCells.value = new Set()
}

function setPasteAnchor(x, y) {
  if (pastePending.value) pasteAnchor.value = { x, y }
}

function confirmPaste() {
  if (!pastePending.value || !isPasteValid.value) return
  const newSelected = new Set()
  for (const [tKey, cell] of pastePendingTargetMap.value) {
    const [tx, ty] = tKey.split(',').map(Number)
    grid.value[ty][tx] = { ...cell, tabIds: [state.activeTabId] }
    newSelected.add(tKey)
  }
  selectedCells.value = newSelected
  if (pasteAnchor.value) {
    clipboardPasteOrigin.value = { x: pasteAnchor.value.x + 1, y: pasteAnchor.value.y + 1 }
  }
  pastePending.value = false
  pasteAnchor.value = null
}

function cancelPaste() {
  pastePending.value = false
  pasteAnchor.value = null
}

function tabHasVisibleItems(tabId) {
  for (let y = 0; y < grid.value.length; y++) {
    for (let x = 0; x < grid.value[y].length; x++) {
      const cell = grid.value[y][x]
      if (!cell?.applianceId) continue
      if (Array.isArray(cell.tabIds) && cell.tabIds.includes(tabId)) return true
      if (cell.tabId != null && cell.tabId === tabId) return true
    }
  }
  return false
}

function deleteTabItems(tabId) {
  for (let y = 0; y < grid.value.length; y++) {
    for (let x = 0; x < grid.value[y].length; x++) {
      const cell = grid.value[y][x]
      if (!cell?.applianceId) continue
      if (Array.isArray(cell.tabIds)) {
        if (!cell.tabIds.includes(tabId)) continue
        const remaining = cell.tabIds.filter(id => id !== tabId)
        if (remaining.length === 0) {
          grid.value[y][x] = null
        } else {
          cell.tabIds = remaining
        }
      } else if (cell.tabId === tabId) {
        grid.value[y][x] = null
      }
    }
  }
}

// Serialize grid to state.gridCells whenever it changes so the URL stays current
watch(grid, (newGrid) => {
  const cells = []
  for (let y = 0; y < newGrid.length; y++) {
    for (let x = 0; x < newGrid[y].length; x++) {
      if (newGrid[y][x]) cells.push({ x, y, ...newGrid[y][x] })
    }
  }
  state.gridCells = cells
}, { deep: true })

// Restore the grid from state.gridCells — call this after loadFromHash()
function loadGridFromState() {
  // Resize grid to match the loaded dimensions before populating
  initGrid()
  if (!Array.isArray(state.gridCells) || state.gridCells.length === 0) return
  for (const { x, y, ...cell } of state.gridCells) {
    if (grid.value[y] && x < grid.value[y].length) {
      grid.value[y][x] = cell
    }
  }
}

export function useGrid() {
  return { grid, flatGrid, gridStyleDynamic, viewportBoxHeight, rotationStyle, getApplianceIcon, get2DApplianceIcon, isImageIcon, addToGrid, rotateCell, rotateGroupAroundCell, selectCell, selectedCells, isSelected, selectCellsInRect, addCellsToSelection, moveDragActive, getCellMoveState, getDisplayCell, isCellGhosted, moveSelectionToTab, addSelectionToTab, startMoveDrag, updateMoveDragOffset, commitMoveDrag, cancelMoveDrag, removeSelected, copyToClipboard, cutToClipboard, pastePending, getCellPasteState, startPaste, setPasteAnchor, confirmPaste, cancelPaste, tabHasVisibleItems, deleteTabItems, isStructureMode, selectedStructureTool, setStructureTool, getWallEdge, setWallEdge, loadGridFromState }
}
