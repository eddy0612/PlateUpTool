import { reactive } from 'vue'
import LZString from 'lz-string'

const DEFAULT_STATE = {
  tabs: [
    { id: 'complete', label: 'Preview' },
    { id: 'structure', label: 'Structure' },
    { id: 'main', label: 'Base' }
  ],
  activeTabId: 'main',
  orientation: 0,
  zoom: 1.0,        // kept in state for UI reactivity, not saved to URL
  roomWidth: 16,
  roomHeight: 12,
  filterText: '',   // kept in state for UI reactivity, not saved to URL
  walls: {},
  gridCells: []     // flat array of { x, y, applianceId, rotation, extraData, tabIds }
}

// Only these fields are serialized into the URL
const URL_FIELDS = ['tabs', 'activeTabId', 'orientation', 'roomWidth', 'roomHeight', 'walls', 'gridCells']

// Wall type string ↔ compact integer code
const WALL_TYPE_TO_CODE = { wall: 1, hatch: 2, door: 3 }
const WALL_CODE_TO_TYPE = { 1: 'wall', 2: 'hatch', 3: 'door' }

const state = reactive(JSON.parse(JSON.stringify(DEFAULT_STATE)))

// Walls: { "h,3,0": "wall" } → [[0,3,0,1], ...]  (orient 0=h 1=v, x, y, typeCode)
function compactWalls(walls) {
  return Object.entries(walls ?? {}).map(([key, type]) => {
    const [orient, x, y] = key.split(',')
    return [orient === 'h' ? 0 : 1, parseInt(x), parseInt(y), WALL_TYPE_TO_CODE[type] ?? 1]
  })
}

function expandWalls(arr) {
  const walls = {}
  for (const [orient, x, y, code] of (arr ?? [])) {
    walls[`${orient === 0 ? 'h' : 'v'},${x},${y}`] = WALL_CODE_TO_TYPE[code] ?? 'wall'
  }
  return walls
}

// gridCells: { x, y, applianceId, rotation, extraData, tabIds } → [x, y, applianceId, tabMask, rotation?, extraData?]
// rotation and extraData are omitted when both are 0 (option 5: skip defaults)
function compactCells(cells, tabs) {
  const tabBits = {}
  tabs.forEach((tab, i) => { tabBits[tab.id] = 1 << i })
  return cells.map(({ x, y, applianceId, rotation, extraData, tabIds }) => {
    const tabMask = Array.isArray(tabIds) ? tabIds.reduce((m, id) => m | (tabBits[id] ?? 0), 0) : 0
    const rot = rotation ?? 0
    const extra = extraData ?? 0
    return (rot === 0 && extra === 0)
      ? [x, y, applianceId, tabMask]
      : [x, y, applianceId, tabMask, rot, extra]
  })
}

function expandCells(cells, tabs) {
  return (cells ?? []).map((cell) => {
    const [x, y, applianceId, tabMask, rotation = 0, extraData = 0] = cell
    const tabIds = tabs.filter((_, i) => tabMask & (1 << i)).map(t => t.id)
    return { x, y, applianceId, rotation, extraData, tabIds }
  })
}

function encodeState(stateObj) {
  const compact = {
    tabs: stateObj.tabs,
    activeTabId: stateObj.activeTabId,
    orientation: stateObj.orientation,
    roomWidth: stateObj.roomWidth,
    roomHeight: stateObj.roomHeight,
    walls: compactWalls(stateObj.walls),
    gridCells: compactCells(stateObj.gridCells ?? [], stateObj.tabs)
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(compact))
}

function decodeState(encoded) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const compact = JSON.parse(json)
    return {
      tabs: compact.tabs,
      activeTabId: compact.activeTabId,
      orientation: compact.orientation,
      roomWidth: compact.roomWidth,
      roomHeight: compact.roomHeight,
      walls: expandWalls(compact.walls),
      gridCells: expandCells(compact.gridCells, compact.tabs)
    }
  } catch {
    return null
  }
}

function syncToHash() {
  const toSave = {}
  URL_FIELDS.forEach(k => { toSave[k] = JSON.parse(JSON.stringify(state[k])) })
  const encoded = encodeState(toSave)
  window.history.replaceState(null, '', `${window.location.pathname}#state=${encoded}`)
}

function loadFromHash() {
  const hash = window.location.hash
  if (!hash.startsWith('#state=')) return
  const raw = hash.slice(7)
  const parsed = decodeState(raw)
  if (parsed && parsed.tabs) {
    URL_FIELDS.forEach((k) => {
      if (k in parsed) state[k] = parsed[k]
      else state[k] = JSON.parse(JSON.stringify(DEFAULT_STATE[k]))
    })
  }
}

function resetState() {
  Object.assign(state, JSON.parse(JSON.stringify(DEFAULT_STATE)))
  syncToHash()
}

export function useRestaurantStore() {
  return { state, loadFromHash, syncToHash, resetState }
}
