import { reactive } from 'vue'

const DEFAULT_STATE = {
  tabs: [
    { id: 'complete', label: 'Preview', items: [] },
    { id: 'structure', label: 'Structure', items: [] },
    { id: 'main', label: 'Base', items: [] }
  ],
  activeTabId: 'main',
  orientation: 0,
  viewMode: '2D',
  zoom: 1.0,
  roomWidth: 16,
  roomHeight: 12,
  selectedIds: [],
  clipboard: [],
  filterText: '',
  walls: {}
}

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
  const toSave = JSON.parse(JSON.stringify(state))
  const encoded = encodeState(toSave)
  window.history.replaceState(null, '', `${window.location.pathname}#state=${encoded}`)
}

function loadFromHash() {
  const hash = window.location.hash
  if (!hash.startsWith('#state=')) return
  const raw = hash.slice(7)
  const parsed = decodeState(raw)
  if (parsed && parsed.tabs) {
    Object.keys(DEFAULT_STATE).forEach((k) => {
      if (k in parsed) state[k] = parsed[k]
      else state[k] = DEFAULT_STATE[k]
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
