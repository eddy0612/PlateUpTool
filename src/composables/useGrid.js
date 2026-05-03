import { ref, computed, watch, nextTick } from 'vue'
import { useRestaurantStore } from '../store/restaurant'
import { useAppliancePalette } from './useAppliancePalette'

// Module-level singletons — grid state is shared across GridView and AppliancePalette
const { state } = useRestaurantStore()
const { palette } = useAppliancePalette()

// Instance id generator for appliance instances
let __instanceCounter = 1
function genInstanceId() {
  return 'iid-' + Date.now().toString(36) + '-' + (__instanceCounter++).toString(36)
}

// Track viewport dimensions so the grid can fill the available space
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)
window.addEventListener('resize', () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
})

// Shared hover status (written by GridView, read by AppliancePalette)
const hoverLabel = ref('')

// Track selected cells for highlighting (Set of "x,y" keys)
const selectedCells = ref(new Set())
const selectedLabelIds = ref(new Set())
const anchorCell = ref(null)
// When true, skip the watcher that prunes label selection based on selected cells.
const skipLabelAnchorSync = ref(false)

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

function getApplianceLabel(applianceId) {
  const found = palette.value.find(a => a.id === applianceId)
  return found ? found.label : applianceId
}

function get2DApplianceIcon(applianceId) {
  const found = palette.value.find(a => a.id === applianceId)
  return found && found.icon2D ? found.icon2D : getApplianceIcon(applianceId)
}

// ── Teleporter pairing ───────────────────────────────────────────────────────
export const TELEPORTER_APPLIANCE_ID = 315

function isTeleporter(cell) {
  return cell?.applianceId === TELEPORTER_APPLIANCE_ID
}

// Returns the lowest positive integer not already used as an extraData pair number
// by any teleporter in the grid.
function _getLowestAvailablePairNumber() {
  const usedNums = new Set()
  for (let y = 0; y < grid.value.length; y++) {
    for (let x = 0; x < grid.value[y].length; x++) {
      const cell = grid.value[y][x]
      if (isTeleporter(cell) && (cell.extraData || 0) > 0) usedNums.add(cell.extraData)
    }
  }
  let n = 1
  while (usedNums.has(n)) n++
  return n
}

// If the cell at (x, y) is an unpaired teleporter, find the first other unpaired
// teleporter in the grid and pair both with the lowest available number.
function _autoTeleporterPair(x, y) {
  const cell = grid.value[y]?.[x]
  if (!isTeleporter(cell) || (cell.extraData || 0) !== 0) return
  for (let py = 0; py < grid.value.length; py++) {
    for (let px = 0; px < grid.value[py].length; px++) {
      if (px === x && py === y) continue
      const c = grid.value[py][px]
      if (isTeleporter(c) && (c.extraData || 0) === 0) {
        const pairNum = _getLowestAvailablePairNumber()
        c.extraData = pairNum
        cell.extraData = pairNum
        return
      }
    }
  }
}

// Scan the grid and clear extraData on the paired partner of the teleporter that
// was at (excludeX, excludeY) with the given pairNum (the cell itself is already
// gone or about to be removed).
function _unpairTeleporterPartner(pairNum) {
  for (let y = 0; y < grid.value.length; y++) {
    for (let x = 0; x < grid.value[y].length; x++) {
      const cell = grid.value[y][x]
      if (isTeleporter(cell) && cell.extraData === pairNum) {
        cell.extraData = 0
      }
    }
  }
}

function addToGrid(item) {
  if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
  const tabId = state.activeTabId
  if (selectedCells.value.size === 1) {
    const [key] = selectedCells.value
    const [x, y] = key.split(',').map(Number)
    if (!grid.value[y][x]) {
      grid.value[y][x] = { applianceId: item.id, rotation: 0, extraData: 0, tabIds: [tabId], iid: genInstanceId() }
      _autoTeleporterPair(x, y)
      return
    }
  }
  for (let y = 0; y < grid.value.length; ++y) {
    for (let x = 0; x < grid.value[y].length; ++x) {
      if (!grid.value[y][x]) {
        grid.value[y][x] = { applianceId: item.id, rotation: 0, extraData: 0, tabIds: [tabId], iid: genInstanceId() }
        _autoTeleporterPair(x, y)
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

function rotateCellCCW(x, y) {
  const cell = grid.value[y][x]
  if (cell && cell.applianceId) cell.rotation = (cell.rotation + 3) % 4
}

// Rotate all selected cells 90° CW around the given pivot cell.
// The pivot stays in place; every other selected cell moves to its rotated position.
// Returns true on success, false if the rotation is blocked (out of bounds or collision).
function rotateGroupAroundCell(pivotX, pivotY) {
  // Only rotate non-ghosted cells; ghosted cells stay in place
  const activeKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number)
    return !isCellGhosted(x, y)
  })
  if (activeKeys.length <= 1) return false

  // Compute rotated positions — CW 90° in grid coords (y increases downward):
  //   new_x = pivotX - (y - pivotY)
  //   new_y = pivotY + (x - pivotX)
  const moves = []
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    const dx = x - pivotX
    const dy = y - pivotY
    const tx = Math.round(pivotX - dy)
    const ty = Math.round(pivotY + dx)
    moves.push({ sx: x, sy: y, tx, ty })
  }

  // Validate: every target must be in-bounds and not occupied by a cell not being moved
  const sourcePositions = new Set(moves.map(m => cellKey(m.sx, m.sy)))
  for (const { tx, ty } of moves) {
    if (tx < 0 || tx >= state.roomWidth || ty < 0 || ty >= state.roomHeight) return false
    if (grid.value[ty]?.[tx]?.applianceId && !sourcePositions.has(cellKey(tx, ty))) return false
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

  // Update selection: rotated active cells at new positions + ghosted cells unchanged
  const ghostedKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number)
    return isCellGhosted(x, y)
  })
  // Preserve label selection across this transform — suppress the watcher
  skipLabelAnchorSync.value = true
  // Preserve label selection across this transform — suppress the watcher
  skipLabelAnchorSync.value = true
  // Preserve label selection across this transform — suppress the watcher
  skipLabelAnchorSync.value = true
  selectedCells.value = new Set([...moves.map(({ tx, ty }) => cellKey(tx, ty)), ...ghostedKeys])
  anchorCell.value = null
  nextTick(() => { skipLabelAnchorSync.value = false })
  nextTick(() => { skipLabelAnchorSync.value = false })
  nextTick(() => { skipLabelAnchorSync.value = false })
  // Update labels anchored to source coords to follow moved appliances
  try {
    // Preserve label selection across this transform — suppress the watcher
    skipLabelAnchorSync.value = true
    nextTick(() => { skipLabelAnchorSync.value = false })
    for (const { sx, sy, tx, ty } of moves) {
      const target = grid.value[ty]?.[tx]
      if (!target || !target.iid) continue
      for (const lbl of state.labels || []) {
        if (lbl.anchorX === sx && lbl.anchorY === sy) {
          lbl.anchorIid = target.iid
          delete lbl.anchorX; delete lbl.anchorY
        }
      }
    }
  } catch (e) {}
  // Also translate any selected labels by the same pivot-based rotation
  try { rotateSelectedLabelsCW(pivotX, pivotY, moves) } catch(e) {}
  return true
}

// Rotate all selected cells 90° CCW around the given pivot cell.
function rotateGroupAroundCellCCW(pivotX, pivotY) {
  // Only rotate non-ghosted cells; ghosted cells stay in place
  const activeKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number)
    return !isCellGhosted(x, y)
  })
  if (activeKeys.length <= 1) return false

  // CCW 90° in grid coords (y increases downward):
  //   new_x = pivotX + (y - pivotY)
  //   new_y = pivotY - (x - pivotX)
  const moves = []
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    const dx = x - pivotX
    const dy = y - pivotY
    const tx = Math.round(pivotX + dy)
    const ty = Math.round(pivotY - dx)
    moves.push({ sx: x, sy: y, tx, ty })
  }

  // Validate: every target must be in-bounds and not occupied by a cell not being moved
  const sourcePositions = new Set(moves.map(m => cellKey(m.sx, m.sy)))
  for (const { tx, ty } of moves) {
    if (tx < 0 || tx >= state.roomWidth || ty < 0 || ty >= state.roomHeight) return false
    if (grid.value[ty]?.[tx]?.applianceId && !sourcePositions.has(cellKey(tx, ty))) return false
  }

  // Snapshot content (decrementing each appliance's rotation) before any writes
  const moveData = moves.map(({ sx, sy, tx, ty }) => {
    const src = grid.value[sy][sx]
    return {
      tx, ty,
      content: src ? { ...src, rotation: ((src.rotation || 0) + 3) % 4 } : null
    }
  })

  // Clear sources, then write targets
  for (const { sx, sy } of moves) grid.value[sy][sx] = null
  for (const { tx, ty, content } of moveData) grid.value[ty][tx] = content

  // Update selection: rotated active cells at new positions + ghosted cells unchanged
  const ghostedKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number)
    return isCellGhosted(x, y)
  })
  // Preserve label selection across this transform — suppress the watcher
  skipLabelAnchorSync.value = true
  selectedCells.value = new Set([...moves.map(({ tx, ty }) => cellKey(tx, ty)), ...ghostedKeys])
  anchorCell.value = null
  nextTick(() => { skipLabelAnchorSync.value = false })
  // Update labels anchored to source coords to follow moved appliances
  try {
    // Preserve label selection across this transform — suppress the watcher
    skipLabelAnchorSync.value = true
    nextTick(() => { skipLabelAnchorSync.value = false })
    for (const { sx, sy, tx, ty } of moves) {
      const target = grid.value[ty]?.[tx]
      if (!target || !target.iid) continue
      for (const lbl of state.labels || []) {
        if (lbl.anchorX === sx && lbl.anchorY === sy) {
          lbl.anchorIid = target.iid
          delete lbl.anchorX; delete lbl.anchorY
        }
      }
    }
  } catch (e) {}
  // Also rotate selected labels CCW
  try { rotateSelectedLabelsCCW(pivotX, pivotY, moves) } catch(e) {}
  return true
}

// Flip selected non-ghosted cells vertically (mirror across vertical axis — reverse x)
function flipSelectionVertical() {
  const activeKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number)
    return !isCellGhosted(x, y)
  })
  if (activeKeys.length === 0) return false

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  const moves = []
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    const tx = minX + (maxX - x)
    const ty = y
    moves.push({ sx: x, sy: y, tx, ty })
  }

  // Validate
  const sourcePositions = new Set(moves.map(m => cellKey(m.sx, m.sy)))
  const targetPositions = new Set()
  for (const { tx, ty } of moves) {
    if (tx < 0 || tx >= state.roomWidth || ty < 0 || ty >= state.roomHeight) return false
    const tKey = cellKey(tx, ty)
    if (targetPositions.has(tKey)) return false
    targetPositions.add(tKey)
    if (grid.value[ty]?.[tx]?.applianceId && !sourcePositions.has(tKey)) return false
  }

  const moveData = moves.map(({ sx, sy, tx, ty }) => {
    const src = grid.value[sy][sx]
    if (!src) return { tx, ty, content: null }
    // When flipping across vertical axis (reverse x), mirror rotation: 1<->3, 0/2 unchanged
    const rot = src.rotation || 0
    const newRot = (4 - rot) % 4
    const paletteEntry = palette.value.find(p => p.id === src.applianceId)
    const newApplianceId = paletteEntry && paletteEntry.flipPartner ? paletteEntry.flipPartner : src.applianceId
    return { tx, ty, content: { ...src, applianceId: newApplianceId, rotation: newRot } }
  })

  // Clear sources then write targets
  for (const { sx, sy } of moves) grid.value[sy][sx] = null
  for (const { tx, ty, content } of moveData) grid.value[ty][tx] = content

  const ghostedKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number); return isCellGhosted(x, y)
  })
  // Preserve label selection across this transform — suppress the watcher
  skipLabelAnchorSync.value = true
  // Preserve label selection across this transform — suppress the watcher
  skipLabelAnchorSync.value = true
  selectedCells.value = new Set([...moves.map(m => cellKey(m.tx, m.ty)), ...ghostedKeys])
  anchorCell.value = null
  nextTick(() => { skipLabelAnchorSync.value = false })
  nextTick(() => { skipLabelAnchorSync.value = false })
  // Migrate labels anchored to source coords to appliance instance ids after flip
  try {
    for (const { sx, sy, tx, ty } of moves) {
      const target = grid.value[ty]?.[tx]
      if (!target || !target.iid) continue
      for (const lbl of state.labels || []) {
        if (lbl.anchorX === sx && lbl.anchorY === sy) {
          lbl.anchorIid = target.iid
          delete lbl.anchorX; delete lbl.anchorY
        }
      }
    }
  } catch (e) {}
  // Flip selected labels vertically
  try { flipSelectedLabelsVertical(minX, maxX) } catch (e) {}
  return true
}

// Flip selected non-ghosted cells horizontally (mirror across horizontal axis — reverse y)
function flipSelectionHorizontal() {
  const activeKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number)
    return !isCellGhosted(x, y)
  })
  if (activeKeys.length === 0) return false

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  const moves = []
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    const tx = x
    const ty = minY + (maxY - y)
    moves.push({ sx: x, sy: y, tx, ty })
  }

  // Validate
  const sourcePositions = new Set(moves.map(m => cellKey(m.sx, m.sy)))
  const targetPositions = new Set()
  for (const { tx, ty } of moves) {
    if (tx < 0 || tx >= state.roomWidth || ty < 0 || ty >= state.roomHeight) return false
    const tKey = cellKey(tx, ty)
    if (targetPositions.has(tKey)) return false
    targetPositions.add(tKey)
    if (grid.value[ty]?.[tx]?.applianceId && !sourcePositions.has(tKey)) return false
  }

  const moveData = moves.map(({ sx, sy, tx, ty }) => {
    const src = grid.value[sy][sx]
    if (!src) return { tx, ty, content: null }
    // When flipping across horizontal axis (reverse y), invert up/down: 0<->2, 1/3 unchanged
    const rot = src.rotation || 0
    const newRot = (2 - rot + 4) % 4
    const paletteEntry = palette.value.find(p => p.id === src.applianceId)
    const newApplianceId = paletteEntry && paletteEntry.flipPartner ? paletteEntry.flipPartner : src.applianceId
    return { tx, ty, content: { ...src, applianceId: newApplianceId, rotation: newRot } }
  })

  // Clear sources then write targets
  for (const { sx, sy } of moves) grid.value[sy][sx] = null
  for (const { tx, ty, content } of moveData) grid.value[ty][tx] = content

  const ghostedKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number); return isCellGhosted(x, y)
  })
  selectedCells.value = new Set([...moves.map(m => cellKey(m.tx, m.ty)), ...ghostedKeys])
  anchorCell.value = null
  // Migrate labels anchored to source coords to appliance instance ids after flip
  try {
    for (const { sx, sy, tx, ty } of moves) {
      const target = grid.value[ty]?.[tx]
      if (!target || !target.iid) continue
      for (const lbl of state.labels || []) {
        if (lbl.anchorX === sx && lbl.anchorY === sy) {
          lbl.anchorIid = target.iid
          delete lbl.anchorX; delete lbl.anchorY
        }
      }
    }
  } catch (e) {}
  // Flip selected labels horizontally
  try { flipSelectedLabelsHorizontal(minY, maxY) } catch (e) {}
  return true
}

// Returns false if the cell has an appliance belonging to a different tab (i.e. would appear ghosted).
// Empty cells are always selectable.
function isCellOnActiveTab(x, y) {
  const cell = grid.value[y]?.[x]
  if (!cell?.applianceId) return false
  if (state.activeTabId === 'complete') return true
  if (Array.isArray(cell.tabIds)) return cell.tabIds.includes(state.activeTabId)
  if (cell.tabId != null) return cell.tabId === state.activeTabId
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
        if (grid.value[cy]?.[cx]?.applianceId) base.add(cellKey(cx, cy))
    selectedCells.value = base
    // Clear label selection when making a new cell selection via shift-range
    selectedLabelIds.value = new Set()
  } else if (ctrlKey) {
    if (!grid.value[y]?.[x]?.applianceId) return
    const key = cellKey(x, y)
    const next = new Set(selectedCells.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selectedCells.value = next
    anchorCell.value = { x, y }
    selectedLabelIds.value = new Set()
  } else {
    if (!grid.value[y]?.[x]?.applianceId) return
    selectedCells.value = new Set([cellKey(x, y)])
    anchorCell.value = { x, y }
    selectedLabelIds.value = new Set()
  }
}

function selectCellsInRect(cells) {
  const filtered = cells.filter(c => grid.value[c.y]?.[c.x]?.applianceId)
  selectedCells.value = new Set(filtered.map(c => cellKey(c.x, c.y)))
  // Clear any label-only selection when selecting cells
  selectedLabelIds.value = new Set()
  if (filtered.length > 0) anchorCell.value = filtered[filtered.length - 1]
}

function selectAll() {
  if (state.activeTabId === 'complete') return
  const all = []
  for (let y = 0; y < grid.value.length; y++)
    for (let x = 0; x < grid.value[y].length; x++)
      if (isCellOnActiveTab(x, y)) all.push({ x, y })
  selectedCells.value = new Set(all.map(c => cellKey(c.x, c.y)))
  // Also select labels whose anchors/positions are on the active tab
  try {
    const labelSet = new Set()
    for (const lbl of (state.labels || [])) {
      const hasAnchor = lbl.anchorIid || (lbl.anchorX != null && lbl.anchorY != null)
      if (!hasAnchor) {
        // Unanchored labels are always selected by Ctrl+A
        labelSet.add(lbl.id)
        continue
      }
      let anchorCellPos = null
      if (lbl.anchorIid) {
        for (const ci of flatGrid.value) {
          if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break }
        }
      } else if (lbl.anchorX != null && lbl.anchorY != null) {
        anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
      }
      if (anchorCellPos && isCellOnActiveTab(anchorCellPos.x, anchorCellPos.y)) labelSet.add(lbl.id)
    }
    selectedLabelIds.value = labelSet
  } catch (e) {
    selectedLabelIds.value = new Set()
  }
  if (all.length > 0) anchorCell.value = all[all.length - 1]
}

function invertSelection() {
  if (state.activeTabId === 'complete') return
  const next = []
  for (let y = 0; y < grid.value.length; y++)
    for (let x = 0; x < grid.value[y].length; x++)
      if (isCellOnActiveTab(x, y) && !selectedCells.value.has(cellKey(x, y))) next.push({ x, y })
  selectedCells.value = new Set(next.map(c => cellKey(c.x, c.y)))
  selectedLabelIds.value = new Set()
  if (next.length > 0) anchorCell.value = next[next.length - 1]
  else anchorCell.value = null
}

function addCellsToSelection(cells) {
  const next = new Set(selectedCells.value)
  cells.forEach(c => { if (grid.value[c.y]?.[c.x]?.applianceId) next.add(cellKey(c.x, c.y)) })
  selectedCells.value = next
  // Clear label selection — adding cells implies label selection should be reset
  selectedLabelIds.value = new Set()
  const last = [...cells].reverse().find(c => grid.value[c.y]?.[c.x]?.applianceId)
  if (last) anchorCell.value = last
}

// --- Move drag state ---
const moveDragActive = ref(false)
const moveDragOffset = ref({ dx: 0, dy: 0 })

// Map of "tx,ty" -> "sx,sy" for every non-ghosted selected cell offset by the current drag delta
const moveDragTargetMap = computed(() => {
  if (!moveDragActive.value || selectedCells.value.size === 0) return new Map()
  const map = new Map()
  for (const srcKey of selectedCells.value) {
    const [sx, sy] = srcKey.split(',').map(Number)
    // Inline ghost check using raw grid data to avoid a circular computed dependency:
    // isCellGhosted → getDisplayCell → moveDragTargetMap.value (undefined mid-evaluation)
    const cell = grid.value[sy]?.[sx]
    if (cell?.applianceId && state.activeTabId !== 'complete') {
      const ghosted = Array.isArray(cell.tabIds)
        ? !cell.tabIds.includes(state.activeTabId)
        : cell.tabId != null ? cell.tabId !== state.activeTabId : false
      if (ghosted) continue
    }
    map.set(cellKey(sx + moveDragOffset.value.dx, sy + moveDragOffset.value.dy), srcKey)
  }
  return map
})

const isMoveValid = computed(() => {
  if (!moveDragActive.value || moveDragTargetMap.value.size === 0) return false
  const sourceKeys = new Set(moveDragTargetMap.value.values())
  for (const [tKey] of moveDragTargetMap.value) {
    const [tx, ty] = tKey.split(',').map(Number)
    if (tx < 0 || tx >= state.roomWidth || ty < 0 || ty >= state.roomHeight) return false
    // Occupied by a cell that is NOT one of the sources being moved
    if (grid.value[ty]?.[tx]?.applianceId && !sourceKeys.has(cellKey(tx, ty))) return false
  }
  return true
})

const isMoveAllOutside = computed(() => {
  if (!moveDragActive.value || moveDragTargetMap.value.size === 0) return false
  for (const [tKey] of moveDragTargetMap.value) {
    const [tx, ty] = tKey.split(',').map(Number)
    if (tx >= 0 && tx < state.roomWidth && ty >= 0 && ty < state.roomHeight) return false
  }
  return true
})

// Returns 'source' | 'delete-preview' | 'preview-valid' | 'preview-invalid' | null
function getCellMoveState(x, y) {
  if (!moveDragActive.value) return null
  const key = cellKey(x, y)
  if (moveDragTargetMap.value.has(key)) return isMoveValid.value ? 'preview-valid' : 'preview-invalid'
  if (selectedCells.value.has(key) && !isCellGhosted(x, y)) return isMoveAllOutside.value ? 'delete-preview' : 'source'
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
  const pairs = []
  for (const [tKey, sKey] of moveDragTargetMap.value) {
    const [tx, ty] = tKey.split(',').map(Number)
    const [sx, sy] = sKey.split(',').map(Number)
    pairs.push({ sx, sy, tx, ty })
    moves.push({ tx, ty, content: { ...grid.value[sy][sx] } })
  }
  for (const sKey of moveDragTargetMap.value.values()) {
    const [sx, sy] = sKey.split(',').map(Number)
    grid.value[sy][sx] = null
  }
  for (const { tx, ty, content } of moves) {
    grid.value[ty][tx] = content
  }
  // Update labels that were anchored to source cell coords to follow appliance instances
  try {
    for (const p of pairs) {
      const { sx, sy, tx, ty } = p
      const target = grid.value[ty]?.[tx]
      if (!target || !target.iid) continue
      for (const lbl of state.labels || []) {
        if (lbl.anchorX === sx && lbl.anchorY === sy) {
          lbl.anchorIid = target.iid
          delete lbl.anchorX; delete lbl.anchorY
        }
      }
    }
  } catch (e) {}
  // Preserve label selection across this move — suppress pruning watcher
  skipLabelAnchorSync.value = true
  selectedCells.value = new Set(moveDragTargetMap.value.keys())
  anchorCell.value = null
  nextTick(() => { skipLabelAnchorSync.value = false })
  moveDragActive.value = false
  moveDragOffset.value = { dx: 0, dy: 0 }
  // Translate any selected labels by the move vector (assume uniform delta from first pair)
  try {
    if (pairs.length > 0) {
      const d0 = pairs[0]
      const dx = d0.tx - d0.sx
      const dy = d0.ty - d0.sy
      translateSelectedLabels(dx, dy)
    }
  } catch (e) {}
}

function cancelMoveDrag() {
  moveDragActive.value = false
  moveDragOffset.value = { dx: 0, dy: 0 }
}

function removeSelected() {
  if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return

  // Only delete non-ghosted cells; ghosted cells are ignored by all operations
  const activeKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number)
    return !isCellGhosted(x, y)
  })

  // Track how many of each teleporter pair number are being deleted.
  // If count < 2 the remaining partner must be unpaired.
  const deletingPairNums = new Map()
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    const cell = grid.value[y][x]
    if (isTeleporter(cell) && (cell.extraData || 0) > 0) {
      const n = cell.extraData
      deletingPairNums.set(n, (deletingPairNums.get(n) || 0) + 1)
    }
  }

  const deletedIids = new Set()
  const deletedCoords = new Set()

  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    const cell = grid.value[y][x]
    // record deleted appliance instance ids so anchored labels can be removed
    if (cell && cell.iid) {
      deletedIids.add(cell.iid)
    }
    deletedCoords.add(cellKey(x, y))
    grid.value[y][x] = null
  }

  // Unpair the surviving partner when only one of a pair was deleted.
  for (const [pairNum, count] of deletingPairNums) {
    if (count < 2) _unpairTeleporterPartner(pairNum)
  }

  selectedCells.value = new Set()
  // Remove labels that were anchored to deleted appliance instances or coordinates
  // Also remove labels that are part of the explicit label selection
  if (state.labels && state.labels.length) {
    const selLblIds = new Set(selectedLabelIds.value)
    state.labels = state.labels.filter(lbl => {
      if (selLblIds.has(lbl.id)) return false
      if (lbl.anchorIid && deletedIids.has(lbl.anchorIid)) return false
      if (lbl.anchorX != null && lbl.anchorY != null && deletedCoords.has(cellKey(lbl.anchorX, lbl.anchorY))) return false
      return true
    })
  }
  selectedLabelIds.value = new Set()
}

// --- Label transform helpers for selected labels ---
function translateSelectedLabels(dx, dy) {
  if (!state.labels) return
  for (const lbl of state.labels) {
    if (!selectedLabelIds.value.has(lbl.id)) continue
    try {
      if (lbl.x2 != null) lbl.x2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, lbl.x2 + dx * 2))
      if (lbl.y2 != null) lbl.y2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, lbl.y2 + dy * 2))
      if (lbl.anchorX != null) lbl.anchorX = lbl.anchorX + dx
      if (lbl.anchorY != null) lbl.anchorY = lbl.anchorY + dy
    } catch (e) {}
  }
}

function rotateSelectedLabelsCW(pivotX, pivotY, moves) {
  // moves is array of { sx, sy, tx, ty } used to migrate anchors; rotate any selected labels around pivot
  if (!state.labels) return
  for (const lbl of state.labels) {
    if (!selectedLabelIds.value.has(lbl.id)) continue
    try {
      // use x2/y2 if present, otherwise anchorX/anchorY
      let x = (lbl.x2 != null) ? lbl.x2 / 2 : (lbl.anchorX != null ? lbl.anchorX : null)
      let y = (lbl.y2 != null) ? lbl.y2 / 2 : (lbl.anchorY != null ? lbl.anchorY : null)
      if (x == null || y == null) continue
      const dx = x - pivotX
      const dy = y - pivotY
      const nx = Math.round(pivotX - dy)
      const ny = Math.round(pivotY + dx)
      if (lbl.x2 != null) lbl.x2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, nx * 2))
      if (lbl.y2 != null) lbl.y2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, ny * 2))
      if (lbl.anchorX != null) lbl.anchorX = nx
      if (lbl.anchorY != null) lbl.anchorY = ny
    } catch (e) {}
  }
}

function rotateSelectedLabelsCCW(pivotX, pivotY, moves) {
  if (!state.labels) return
  for (const lbl of state.labels) {
    if (!selectedLabelIds.value.has(lbl.id)) continue
    try {
      let x = (lbl.x2 != null) ? lbl.x2 / 2 : (lbl.anchorX != null ? lbl.anchorX : null)
      let y = (lbl.y2 != null) ? lbl.y2 / 2 : (lbl.anchorY != null ? lbl.anchorY : null)
      if (x == null || y == null) continue
      const dx = x - pivotX
      const dy = y - pivotY
      const nx = Math.round(pivotX + dy)
      const ny = Math.round(pivotY - dx)
      if (lbl.x2 != null) lbl.x2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, nx * 2))
      if (lbl.y2 != null) lbl.y2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, ny * 2))
      if (lbl.anchorX != null) lbl.anchorX = nx
      if (lbl.anchorY != null) lbl.anchorY = ny
    } catch (e) {}
  }
}

function flipSelectedLabelsVertical(minX, maxX) {
  if (!state.labels) return
  for (const lbl of state.labels) {
    if (!selectedLabelIds.value.has(lbl.id)) continue
    try {
      if (lbl.x2 != null) {
        const x = lbl.x2 / 2
        const nx = minX + (maxX - x)
        lbl.x2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, Math.round(nx * 2)))
      }
      if (lbl.anchorX != null) lbl.anchorX = minX + (maxX - lbl.anchorX)
    } catch (e) {}
  }
}

function flipSelectedLabelsHorizontal(minY, maxY) {
  if (!state.labels) return
  for (const lbl of state.labels) {
    if (!selectedLabelIds.value.has(lbl.id)) continue
    try {
      if (lbl.y2 != null) {
        const y = lbl.y2 / 2
        const ny = minY + (maxY - y)
        lbl.y2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, Math.round(ny * 2)))
      }
      if (lbl.anchorY != null) lbl.anchorY = minY + (maxY - lbl.anchorY)
    } catch (e) {}
  }
}

// Move the non-ghosted selected cells by (dx, dy). Returns true on success,
// false if move is blocked (out of bounds or collision).
function moveSelectionBy(dx, dy) {
  if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return false
  const activeKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number)
    return !isCellGhosted(x, y)
  })
  if (activeKeys.length === 0) return false

  const moves = []
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    moves.push({ sx: x, sy: y, tx: x + dx, ty: y + dy })
  }

  // Validate
  const sourcePositions = new Set(moves.map(m => cellKey(m.sx, m.sy)))
  const targetPositions = new Set()
  for (const { tx, ty } of moves) {
    if (tx < 0 || tx >= state.roomWidth || ty < 0 || ty >= state.roomHeight) return false
    const tKey = cellKey(tx, ty)
    if (targetPositions.has(tKey)) return false
    targetPositions.add(tKey)
    if (grid.value[ty]?.[tx]?.applianceId && !sourcePositions.has(tKey)) return false
  }

  const moveData = moves.map(({ sx, sy, tx, ty }) => {
    const src = grid.value[sy][sx]
    return { tx, ty, content: src ? { ...src } : null }
  })

  // Clear sources then write targets
  for (const { sx, sy } of moves) grid.value[sy][sx] = null
  for (const { tx, ty, content } of moveData) grid.value[ty][tx] = content
  // Preserve label selection across this move — suppress pruning watcher
  skipLabelAnchorSync.value = true
  selectedCells.value = new Set([...moves.map(m => cellKey(m.tx, m.ty))])
  anchorCell.value = null
  nextTick(() => { skipLabelAnchorSync.value = false })
  // Migrate labels anchored to source cell coords to the appliance instance ids at their new positions
  try {
    for (const { sx, sy, tx, ty } of moves) {
      const target = grid.value[ty]?.[tx]
      if (!target || !target.iid) continue
      for (const lbl of state.labels || []) {
        if (lbl.anchorX === sx && lbl.anchorY === sy) {
          lbl.anchorIid = target.iid
          delete lbl.anchorX; delete lbl.anchorY
        }
      }
    }
  } catch (e) {}
  // Translate any selected labels by (dx, dy)
  try { translateSelectedLabels(dx, dy) } catch (e) {}
  return true
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

function clearWallEdge(x, y, dir) {
  if (!state.walls) return
  const key = getEdgeKey(x, y, dir)
  if (!key) return
  delete state.walls[key]
}

// Clear selection when switching tabs (including to/from structure mode)
watch(() => state.activeTabId, () => {
  selectedCells.value = new Set()
  anchorCell.value = null
  selectedLabelIds.value = new Set()
})

// Keep label selection in sync with cell selection. If selected cells change,
// remove any selected labels whose anchor is no longer part of the cell selection.
watch(selectedCells, (newSet) => {
  if (skipLabelAnchorSync.value) return
  if (!newSet || newSet.size === 0) {
    // Do not automatically clear label-only selections when cell selection
    // becomes empty — allow labels to be selected by box-drag without
    // forcing their deselection here. Explicit code paths that clear
    // the selection should also clear `selectedLabelIds` when appropriate.
    return
  }
  const next = new Set()
  for (const id of selectedLabelIds.value) {
    const lbl = (state.labels || []).find(l => l.id === id)
    if (!lbl) continue
    // Truly unanchored labels (no anchor line to any cell) are always kept
    const isUnanchored = !lbl.anchorIid && lbl.anchorX == null && lbl.anchorY == null
    if (isUnanchored) { next.add(id); continue }
    let anchorKey = null
    if (lbl.anchorIid) {
      const found = flatGrid.value.find(g => g.cell && g.cell.iid === lbl.anchorIid)
      if (found) anchorKey = cellKey(found.x, found.y)
    } else if (lbl.anchorX != null && lbl.anchorY != null) {
      anchorKey = cellKey(lbl.anchorX, lbl.anchorY)
    } else if (lbl.x2 != null && lbl.y2 != null) {
      anchorKey = cellKey(Math.floor(lbl.x2 / 2), Math.floor(lbl.y2 / 2))
    }
    if (anchorKey && newSet.has(anchorKey)) next.add(id)
  }
  selectedLabelIds.value = next
})

// --- Clipboard (module-level, not persisted to URL) ---
const clipboard = ref([])              // [{ dx, dy, cell }] relative to selection top-left
const clipboardLabels = ref([])        // [{ dx, dy, label }] relative to selection top-left
const clipboardPasteOrigin = ref(null) // { x, y } top-left for next paste

// --- Duplicate buffer (Ctrl+D) — separate from clipboard so clipboard is preserved ---
const duplicateBuffer = ref([])        // same format as clipboard
const duplicateBufferLabels = ref([])
const duplicateMode = ref(false)       // true when paste is sourced from duplicateBuffer

function copyToClipboard() {
  // Ghosted cells (from other tabs) are excluded from copy/cut operations
  const activeKeys = [...selectedCells.value].filter(key => {
    const [x, y] = key.split(',').map(Number)
    return !isCellGhosted(x, y)
  })
  if (activeKeys.length === 0) return
  let minX = Infinity, minY = Infinity
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    if (x < minX) minX = x
    if (y < minY) minY = y
  }
  const entries = []
  for (const key of activeKeys) {
    const [x, y] = key.split(',').map(Number)
    const cell = grid.value[y]?.[x]
    if (cell) entries.push({ dx: x - minX, dy: y - minY, cell: { ...cell } })
  }

  // Include selected labels anchored to these selected cells. Store precise half-grid offsets
  const labelsToCopy = []
  for (const lbl of state.labels || []) {
    let include = false
    let ax = null, ay = null
    if (lbl.anchorIid) {
      // find anchor cell coords for this instance id and include only if
      // the anchor cell is part of the active selection
      const found = flatGrid.value.find(g => g.cell && g.cell.iid === lbl.anchorIid)
      if (found) { ax = found.x; ay = found.y; include = activeKeys.some(k => k === `${ax},${ay}`) }
    } else if (lbl.anchorX != null && lbl.anchorY != null) {
      ax = lbl.anchorX; ay = lbl.anchorY
      include = activeKeys.some(k => k === `${ax},${ay}`)
    } else if (lbl.x2 != null && lbl.y2 != null) {
      ax = Math.floor(lbl.x2 / 2); ay = Math.floor(lbl.y2 / 2)
      include = activeKeys.some(k => k === `${ax},${ay}`)
    }
    if (include && ax != null) {
      // dxCell/dyCell: anchor cell offset relative to minX/minY
      const dxCell = ax - minX
      const dyCell = ay - minY
      // dx2/dy2: label half-grid coords relative to minX*2/minY*2 (preserves sub-cell offsets)
      const dx2 = (lbl.x2 != null ? lbl.x2 : (ax * 2)) - (minX * 2)
      const dy2 = (lbl.y2 != null ? lbl.y2 : (ay * 2)) - (minY * 2)
      labelsToCopy.push({ dxCell, dyCell, dx2, dy2, label: { ...lbl } })
    }
  }

  // Strip teleporter pair numbers when only ONE of a pair is being copied —
  // that teleporter will be unpaired on paste and may re-pair with an existing
  // unpaired teleporter in the grid.
  const pairNumCount = new Map()
  for (const entry of entries) {
    if (isTeleporter(entry.cell) && (entry.cell.extraData || 0) > 0) {
      const n = entry.cell.extraData
      pairNumCount.set(n, (pairNumCount.get(n) || 0) + 1)
    }
  }
  for (const entry of entries) {
    if (isTeleporter(entry.cell) && (entry.cell.extraData || 0) > 0) {
      if ((pairNumCount.get(entry.cell.extraData) || 0) < 2) {
        entry.cell = { ...entry.cell, extraData: 0 }
      }
    }
  }

  clipboard.value = entries
  clipboardLabels.value = labelsToCopy
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
  const buf = duplicateMode.value ? duplicateBuffer : clipboard
  if (!pastePending.value || !pasteAnchor.value || buf.value.length === 0) return new Map()
  const map = new Map()
  for (const { dx, dy, cell } of buf.value) {
    map.set(cellKey(pasteAnchor.value.x + dx, pasteAnchor.value.y + dy), cell)
  }
  return map
})

const pastePendingLabels = computed(() => {
  if (!pastePending.value || !pasteAnchor.value) return []
  const activeLabelBuf = duplicateMode.value ? duplicateBufferLabels.value : clipboardLabels.value
  if (!activeLabelBuf || activeLabelBuf.length === 0) return []
  return activeLabelBuf.map((entry, i) => {
    const tx = pasteAnchor.value.x + entry.dxCell
    const ty = pasteAnchor.value.y + entry.dyCell
    const offsetX2 = entry.dx2 - entry.dxCell * 2
    const offsetY2 = entry.dy2 - entry.dyCell * 2
    const wasAnchored = entry.label.anchorIid || entry.label.anchorX != null || entry.label.anchorY != null
    return {
      id: '__paste_preview_' + i,
      text: entry.label.text,
      x2: tx * 2 + offsetX2,
      y2: ty * 2 + offsetY2,
      anchorX: wasAnchored ? tx : null,
      anchorY: wasAnchored ? ty : null,
    }
  })
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
  duplicateMode.value = false
  duplicateBuffer.value = []
  pastePending.value = true
  pasteAnchor.value = clipboardPasteOrigin.value ? { ...clipboardPasteOrigin.value } : { x: 0, y: 0 }
  selectedCells.value = new Set()
  selectedLabelIds.value = new Set()
}

function startDuplicate() {
  if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
  if (selectedCells.value.size === 0) return

  // Build buffer relative to selection top-left (same format as clipboard)
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

  // Strip teleporter pair number when only one of a pair is being moved
  const pairNumCount = new Map()
  for (const entry of entries) {
    if (isTeleporter(entry.cell) && (entry.cell.extraData || 0) > 0) {
      const n = entry.cell.extraData
      pairNumCount.set(n, (pairNumCount.get(n) || 0) + 1)
    }
  }
  for (const entry of entries) {
    if (isTeleporter(entry.cell) && (entry.cell.extraData || 0) > 0) {
      if ((pairNumCount.get(entry.cell.extraData) || 0) < 2)
        entry.cell = { ...entry.cell, extraData: 0 }
    }
  }

  duplicateBuffer.value = entries
  // capture any selected labels anchored to the selection (store precise offsets)
  const labelsToCopy = []
  for (const lbl of state.labels || []) {
    let include = false
    let ax = null, ay = null
    if (lbl.anchorIid) {
      // find anchor cell coords for this instance id and include only if
      // the anchor cell is part of the selectedCells
      const found = flatGrid.value.find(g => g.cell && g.cell.iid === lbl.anchorIid)
      if (found) { ax = found.x; ay = found.y; include = selectedCells.value.has(`${ax},${ay}`) }
    } else if (lbl.anchorX != null && lbl.anchorY != null) {
      ax = lbl.anchorX; ay = lbl.anchorY
      include = selectedCells.value.has(`${ax},${ay}`)
    } else if (lbl.x2 != null && lbl.y2 != null) {
      ax = Math.floor(lbl.x2 / 2); ay = Math.floor(lbl.y2 / 2)
      include = selectedCells.value.has(`${ax},${ay}`)
    }
    if (include && ax != null) {
      const dxCell = ax - minX
      const dyCell = ay - minY
      const dx2 = (lbl.x2 != null ? lbl.x2 : (ax * 2)) - (minX * 2)
      const dy2 = (lbl.y2 != null ? lbl.y2 : (ay * 2)) - (minY * 2)
      labelsToCopy.push({ dxCell, dyCell, dx2, dy2, label: { ...lbl } })
    }
  }
  duplicateBufferLabels.value = labelsToCopy
  duplicateMode.value = true
  pastePending.value = true
  pasteAnchor.value = { x: minX, y: minY }
  selectedCells.value = new Set()
  selectedLabelIds.value = new Set()
}

function setPasteAnchor(x, y) {
  if (pastePending.value) pasteAnchor.value = { x, y }
}

function confirmPaste() {
  if (!pastePending.value || !isPasteValid.value) return

  // ── Teleporter pair handling ──────────────────────────────────────────────
  // Count how many times each pair number appears in the active paste buffer.
  // When duplicating or pasting from a blueprint/design, the buffer is duplicateBuffer,
  // not clipboard — using the wrong one caused pairs to never remap and get zeroed out.
  const activeBuf = duplicateMode.value ? duplicateBuffer.value : clipboard.value
  const clipboardPairCount = new Map()
  for (const { cell } of activeBuf) {
    if (isTeleporter(cell) && (cell.extraData || 0) > 0) {
      const n = cell.extraData
      clipboardPairCount.set(n, (clipboardPairCount.get(n) || 0) + 1)
    }
  }

  // For pair numbers where BOTH halves are being pasted, remap to a new
  // number that doesn't clash with existing teleporters in the grid.
  const pasteTargetSet = new Set(pastePendingTargetMap.value.keys())
  const usedNums = new Set()
  for (let y = 0; y < grid.value.length; y++) {
    for (let x = 0; x < grid.value[y].length; x++) {
      if (pasteTargetSet.has(cellKey(x, y))) continue
      const cell = grid.value[y][x]
      if (isTeleporter(cell) && (cell.extraData || 0) > 0) usedNums.add(cell.extraData)
    }
  }
  const pairNumRemap = new Map()
  for (const [oldNum, count] of clipboardPairCount) {
    if (count === 2) {
      let n = 1
      while (usedNums.has(n)) n++
      pairNumRemap.set(oldNum, n)
      usedNums.add(n)
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const newSelected = new Set()
  // Map original iid -> new iid for pasted cells so labels can re-anchor
  const iidRemap = new Map()
  for (const [tKey, cell] of pastePendingTargetMap.value) {
    const [tx, ty] = tKey.split(',').map(Number)
    // Assign a fresh iid to avoid duplicating instance ids
    const oldIid = cell.iid
    let pastedCell = { ...cell, tabIds: [state.activeTabId] }
    if (oldIid) {
      const newIid = genInstanceId()
      pastedCell.iid = newIid
      iidRemap.set(oldIid, newIid)
    } else {
      pastedCell.iid = genInstanceId()
    }
    if (isTeleporter(pastedCell)) {
      const oldNum = pastedCell.extraData || 0
      // Keep pairing only when the clipboard contained both halves of this pair.
      pastedCell = { ...pastedCell, extraData: (oldNum > 0 && pairNumRemap.has(oldNum)) ? pairNumRemap.get(oldNum) : 0 }
    }
    grid.value[ty][tx] = pastedCell
    newSelected.add(tKey)
  }

  // Auto-pair any newly placed unpaired teleporters with existing unpaired ones.
  for (const tKey of pasteTargetSet) {
    const [tx, ty] = tKey.split(',').map(Number)
    _autoTeleporterPair(tx, ty)
  }

  selectedCells.value = newSelected
  // Place any labels that were part of the pasted buffer
  const activeLabelBuf = duplicateMode.value ? duplicateBufferLabels.value : clipboardLabels.value
  const pastedLabelIds = []
  if (activeLabelBuf && activeLabelBuf.length > 0 && pasteAnchor.value) {
    for (const entry of activeLabelBuf) {
      const tx = pasteAnchor.value.x + entry.dxCell
      const ty = pasteAnchor.value.y + entry.dyCell
      const lbl = { ...entry.label }
      // Compute offset relative to original anchor in half-grid units
      const offsetX2 = entry.dx2 - (entry.dxCell * 2)
      const offsetY2 = entry.dy2 - (entry.dyCell * 2)
      // If label was anchored to an appliance iid that was remapped, re-anchor and preserve offset
      if (lbl.anchorIid && iidRemap.has(lbl.anchorIid)) {
        const newIid = iidRemap.get(lbl.anchorIid)
        lbl.anchorIid = newIid
        // find new anchor coords
        const found = flatGrid.value.find(g => g.cell && g.cell.iid === newIid)
        if (found) {
          lbl.anchorX = null
          lbl.anchorY = null
          lbl.x2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, found.x * 2 + offsetX2))
          lbl.y2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, found.y * 2 + offsetY2))
        } else {
          // fallback: anchor to pasted cell coords
          lbl.anchorX = tx
          lbl.anchorY = ty
          lbl.anchorIid = null
          lbl.x2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, tx * 2 + offsetX2))
          lbl.y2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, ty * 2 + offsetY2))
        }
      } else {
        // No iid remap: translate position. Preserve unanchored state for labels that had no anchor.
        lbl.anchorIid = null
        const wasAnchored = entry.label.anchorIid || entry.label.anchorX != null || entry.label.anchorY != null
        if (wasAnchored) {
          lbl.anchorX = tx
          lbl.anchorY = ty
        } else {
          lbl.anchorX = null
          lbl.anchorY = null
        }
        lbl.x2 = Math.max(0, Math.min(state.roomWidth * 2 - 1, tx * 2 + offsetX2))
        lbl.y2 = Math.max(0, Math.min(state.roomHeight * 2 - 1, ty * 2 + offsetY2))
      }
      // always generate a fresh label id for pasted labels to avoid collisions
      lbl.id = 'lbl-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 0xffff).toString(36)
      state.labels = state.labels || []
      state.labels.push(lbl)
      pastedLabelIds.push(lbl.id)
    }
  }
      // Select pasted labels as well
      selectedLabelIds.value = new Set(pastedLabelIds)
  if (!duplicateMode.value && pasteAnchor.value) {
    clipboardPasteOrigin.value = { x: pasteAnchor.value.x + 1, y: pasteAnchor.value.y + 1 }
  }
  pastePending.value = false
  pasteAnchor.value = null
  duplicateMode.value = false
  duplicateBuffer.value = []
  duplicateBufferLabels.value = []
}

function cancelPaste() {
  pastePending.value = false
  pasteAnchor.value = null
  duplicateMode.value = false
  duplicateBuffer.value = []
}

// Start a paste using an explicit set of cells (e.g. from a saved blueprint).
// Uses the duplicate buffer so the user's clipboard is not overwritten.
function startPasteFromCells(payload) {
  // payload may be either an array of cells (legacy) or an object { cells, labels }
  if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
  if (!payload) return
  let cells = null, labels = []
  if (Array.isArray(payload)) {
    cells = payload
  } else if (payload.cells && Array.isArray(payload.cells)) {
    cells = payload.cells
    labels = Array.isArray(payload.labels) ? payload.labels : []
  }
  if (!cells || cells.length === 0) return

  duplicateBuffer.value = cells.map(c => ({ ...c, cell: { ...c.cell } }))
  // accept either blueprint-style labels ({dxCell,dyCell,dx2,dy2,label}) or legacy cells-only
  duplicateBufferLabels.value = labels.map(l => ({ ...l }))

  duplicateMode.value = true
  pastePending.value = true
  pasteAnchor.value = { x: 0, y: 0 }
  selectedCells.value = new Set()
  selectedLabelIds.value = new Set()
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
  // Pre-pass: count how many paired teleporters will be FULLY deleted per pair number.
  const deletingPairNums = new Map()
  for (let y = 0; y < grid.value.length; y++) {
    for (let x = 0; x < grid.value[y].length; x++) {
      const cell = grid.value[y][x]
      if (!cell?.applianceId) continue
      let willBeFullyDeleted = false
      if (Array.isArray(cell.tabIds)) {
        if (cell.tabIds.includes(tabId)) {
          willBeFullyDeleted = cell.tabIds.filter(id => id !== tabId).length === 0
        }
      } else if (cell.tabId === tabId) {
        willBeFullyDeleted = true
      }
      if (willBeFullyDeleted && isTeleporter(cell) && (cell.extraData || 0) > 0) {
        const n = cell.extraData
        deletingPairNums.set(n, (deletingPairNums.get(n) || 0) + 1)
      }
    }
  }

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

  // Unpair surviving partners where only one of a pair was deleted.
  for (const [pairNum, count] of deletingPairNums) {
    if (count < 2) _unpairTeleporterPartner(pairNum)
  }
}

// --- Palette drag (drag from palette and drop onto an empty grid cell) ---
const paletteDragActive = ref(false)
const paletteDragItem = ref(null)
const paletteDragPos = ref({ x: 0, y: 0 })
const paletteDragHoverCell = ref(null)

function startPaletteDrag(item) {
  paletteDragActive.value = true
  paletteDragItem.value = item
}

function updatePaletteDrag(clientX, clientY) {
  paletteDragPos.value = { x: clientX, y: clientY }
  const el = document.elementFromPoint(clientX, clientY)?.closest?.('.grid-item')
  if (el && el.dataset.x !== undefined) {
    paletteDragHoverCell.value = { x: parseInt(el.dataset.x), y: parseInt(el.dataset.y) }
  } else {
    paletteDragHoverCell.value = null
  }
}

function isPaletteDragDropValid(x, y) {
  if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return false
  return !grid.value[y]?.[x]?.applianceId
}

function commitPaletteDrag() {
  let placed = false
  if (paletteDragActive.value && paletteDragItem.value && paletteDragHoverCell.value) {
    const { x, y } = paletteDragHoverCell.value
    if (isPaletteDragDropValid(x, y)) {
      grid.value[y][x] = { applianceId: paletteDragItem.value.id, rotation: 0, extraData: 0, tabIds: [state.activeTabId], iid: genInstanceId() }
      _autoTeleporterPair(x, y)
      placed = true
    }
  }
  cancelPaletteDrag()
  return placed
}

function cancelPaletteDrag() {
  paletteDragActive.value = false
  paletteDragItem.value = null
  paletteDragHoverCell.value = null
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
  // Clear first so initGrid starts with a blank slate (no stale cells carried over)
  grid.value = []
  selectedCells.value = new Set()
  anchorCell.value = null
  initGrid()
  if (!Array.isArray(state.gridCells) || state.gridCells.length === 0) return
  for (const { x, y, ...cell } of state.gridCells) {
        if (grid.value[y] && x < grid.value[y].length) {
      // ensure loaded cells have an instance id so labels can anchor to appliance instances
      if (!cell.iid) cell.iid = genInstanceId()
      grid.value[y][x] = cell
    }
  }
  // Migrate labels that reference explicit coords to appliance instance ids when possible
  if (state.labels && state.labels.length) {
    for (const lbl of state.labels) {
      if (lbl.anchorX != null && lbl.anchorY != null) {
        const target = grid.value[lbl.anchorY]?.[lbl.anchorX]
        if (target && target.iid) {
          lbl.anchorIid = target.iid
          delete lbl.anchorX; delete lbl.anchorY
        }
      }
    }
  }
}

// Returns the {x, y} of the partner teleporter for the cell at (x, y),
// or null if not paired or no partner exists yet.
function getTeleporterPairPos(x, y) {
  const cell = grid.value[y]?.[x]
  if (!isTeleporter(cell) || (cell.extraData || 0) === 0) return null
  const pairNum = cell.extraData
  for (let py = 0; py < grid.value.length; py++) {
    for (let px = 0; px < grid.value[py].length; px++) {
      if (px === x && py === y) continue
      const c = grid.value[py][px]
      if (isTeleporter(c) && c.extraData === pairNum) return { x: px, y: py }
    }
  }
  return null
}

export function useGrid() {
  return { grid, flatGrid, gridStyleDynamic, cellSize, viewportBoxHeight, rotationStyle, getApplianceIcon, getApplianceLabel, get2DApplianceIcon, isImageIcon, addToGrid, hoverLabel, rotateCell, rotateCellCCW, rotateGroupAroundCell, rotateGroupAroundCellCCW, selectCell, selectedCells, selectedLabelIds, isSelected, selectCellsInRect, addCellsToSelection, selectAll, invertSelection, moveSelectionBy, moveDragActive, isMoveAllOutside, getCellMoveState, getDisplayCell, isCellGhosted, moveSelectionToTab, addSelectionToTab, startMoveDrag, updateMoveDragOffset, commitMoveDrag, cancelMoveDrag, removeSelected, copyToClipboard, cutToClipboard, pastePending, getCellPasteState, startPaste, startDuplicate, startPasteFromCells, setPasteAnchor, confirmPaste, cancelPaste, pastePendingLabels, tabHasVisibleItems, deleteTabItems, isStructureMode, selectedStructureTool, setStructureTool, getWallEdge, setWallEdge, clearWallEdge, loadGridFromState, paletteDragActive, paletteDragItem, paletteDragPos, paletteDragHoverCell, startPaletteDrag, updatePaletteDrag, commitPaletteDrag, cancelPaletteDrag, isPaletteDragDropValid, getTeleporterPairPos, flipSelectionVertical, flipSelectionHorizontal, skipLabelAnchorSync }
}
