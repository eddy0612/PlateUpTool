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

// Height of the .viewport-box element: grid height + 8px padding top/bottom + 1px border top/bottom
const viewportBoxHeight = computed(() => state.roomHeight * cellSize.value + 18)

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

function addToGrid(item) {
  if (state.activeTabId === 'complete') return
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
  const cell = getDisplayCell(x, y)
  if (!cell?.applianceId) return false
  if (state.activeTabId === 'complete') return false
  // Support both new tabIds array and legacy tabId string
  if (Array.isArray(cell.tabIds)) return !cell.tabIds.includes(state.activeTabId)
  if (cell.tabId != null) return cell.tabId !== state.activeTabId
  return false
}

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

function pasteFromClipboard() {
  if (!clipboard.value.length || !clipboardPasteOrigin.value) return
  const { x: ox, y: oy } = clipboardPasteOrigin.value
  const newSelected = new Set()
  for (const { dx, dy, cell } of clipboard.value) {
    const tx = ox + dx
    const ty = oy + dy
    if (tx >= 0 && tx < state.roomWidth && ty >= 0 && ty < state.roomHeight) {
      grid.value[ty][tx] = { ...cell }
      newSelected.add(cellKey(tx, ty))
    }
  }
  selectedCells.value = newSelected
  clipboardPasteOrigin.value = { x: ox + 1, y: oy + 1 }
}

export function useGrid() {
  return { grid, flatGrid, gridStyleDynamic, viewportBoxHeight, rotationStyle, getApplianceIcon, isImageIcon, addToGrid, rotateCell, selectCell, selectedCells, isSelected, selectCellsInRect, addCellsToSelection, moveDragActive, getCellMoveState, getDisplayCell, isCellGhosted, moveSelectionToTab, addSelectionToTab, startMoveDrag, updateMoveDragOffset, commitMoveDrag, cancelMoveDrag, removeSelected, copyToClipboard, cutToClipboard, pasteFromClipboard }
}
