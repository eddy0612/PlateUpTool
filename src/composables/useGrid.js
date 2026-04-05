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
  width: `${state.roomWidth * cellSize.value}px`,
  height: `${state.roomHeight * cellSize.value}px`,
  transform: `scale(${state.zoom}) rotate(${state.orientation}deg)`
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
  for (let y = 0; y < grid.value.length; ++y) {
    for (let x = 0; x < grid.value[y].length; ++x) {
      if (!grid.value[y][x]) {
        grid.value[y][x] = { applianceId: item.id, rotation: 0, extraData: 0 }
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

export function useGrid() {
  return { grid, flatGrid, gridStyleDynamic, viewportBoxHeight, rotationStyle, getApplianceIcon, isImageIcon, addToGrid, rotateCell, selectCell, selectedCells, isSelected, selectCellsInRect, addCellsToSelection }
}
