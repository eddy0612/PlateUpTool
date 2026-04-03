import { ref, computed, watch } from 'vue'
import { useRestaurantStore } from '../store/restaurant'
import { useAppliancePalette } from './useAppliancePalette'

// Module-level singletons — grid state is shared across GridView and AppliancePalette
const { state } = useRestaurantStore()
const { palette } = useAppliancePalette()

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

const gridStyleDynamic = computed(() => ({
  gridTemplateColumns: `repeat(${state.roomWidth}, 1fr)`,
  gridTemplateRows: `repeat(${state.roomHeight}, 1fr)`,
  width: `${Math.min(700, state.roomWidth * 32)}px`,
  height: `${Math.min(540, state.roomHeight * 32)}px`,
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

function selectCell(x, y) {
  // future: highlight/select cell
}

export function useGrid() {
  return { grid, flatGrid, gridStyleDynamic, rotationStyle, getApplianceIcon, isImageIcon, addToGrid, rotateCell, selectCell }
}
