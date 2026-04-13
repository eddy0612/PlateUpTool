import { reactive } from 'vue'

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

const state = reactive(JSON.parse(JSON.stringify(DEFAULT_STATE)))

function encodeState(stateObj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(stateObj))))
}

function decodeState(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))))
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
