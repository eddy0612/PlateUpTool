import { reactive } from 'vue'

const DEFAULT_TABS = [
  { id: 'complete', label: 'Preview' },
  { id: 'structure', label: 'Structure' },
  { id: 'main', label: 'Base' }
]
const DEFAULT_ACTIVE_TAB = 'main'
const DEFAULT_TABS_JSON = JSON.stringify(DEFAULT_TABS)

const DEFAULT_STATE = {
  tabs: JSON.parse(DEFAULT_TABS_JSON),
  activeTabId: DEFAULT_ACTIVE_TAB,
  orientation: 0,
  zoom: 1.0,        // kept in state for UI reactivity, not saved to URL
  roomWidth: 16,
  roomHeight: 12,
  filterText: '',   // kept in state for UI reactivity, not saved to URL
  walls: {},
  gridCells: []     // flat array of { x, y, applianceId, rotation, extraData, tabIds }
}

// Only these fields are serialized into the URL
const URL_FIELDS = ['tabs', 'orientation', 'roomWidth', 'roomHeight', 'walls', 'gridCells']

// Wall type string ↔ compact integer code
const WALL_TYPE_TO_CODE = { wall: 1, hatch: 2, door: 3 }
const WALL_CODE_TO_TYPE = { 1: 'wall', 2: 'hatch', 3: 'door' }

const state = reactive(JSON.parse(JSON.stringify(DEFAULT_STATE)))

// ── Base64url (URL-safe, no padding, no % encoding needed in fragment) ───────
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const B64URL_REV = Object.fromEntries([...B64URL].map((c, i) => [c, i]))

function base64urlEncode(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1] ?? 0, b2 = bytes[i + 2] ?? 0
    s += B64URL[b0 >> 2]
    s += B64URL[((b0 & 3) << 4) | (b1 >> 4)]
    if (i + 1 < bytes.length) s += B64URL[((b1 & 15) << 2) | (b2 >> 6)]
    if (i + 2 < bytes.length) s += B64URL[b2 & 63]
  }
  return s
}

function base64urlDecode(s) {
  const bytes = []
  for (let i = 0; i < s.length; i += 4) {
    const c0 = B64URL_REV[s[i]] ?? 0
    const c1 = B64URL_REV[s[i + 1]] ?? 0
    const c2 = B64URL_REV[s[i + 2]] ?? 0
    const c3 = B64URL_REV[s[i + 3]] ?? 0
    bytes.push((c0 << 2) | (c1 >> 4))
    if (s[i + 2] != null) bytes.push(((c1 & 15) << 4) | (c2 >> 2))
    if (s[i + 3] != null) bytes.push(((c2 & 3) << 6) | c3)
  }
  return new Uint8Array(bytes)
}

// ── Bit-level writer / reader ─────────────────────────────────────────────────
class BitWriter {
  constructor() { this._bytes = []; this._cur = 0; this._bits = 0 }
  write(value, n) {
    for (let i = n - 1; i >= 0; i--) {
      this._cur = (this._cur << 1) | ((value >>> i) & 1)
      if (++this._bits === 8) { this._bytes.push(this._cur); this._cur = 0; this._bits = 0 }
    }
  }
  finish() {
    if (this._bits > 0) this._bytes.push(this._cur << (8 - this._bits))
    return new Uint8Array(this._bytes)
  }
}

class BitReader {
  constructor(bytes) { this._b = bytes; this._i = 0; this._cur = 0; this._bits = 0 }
  read(n) {
    let v = 0
    for (let j = 0; j < n; j++) {
      if (this._bits === 0) { this._cur = this._b[this._i++] ?? 0; this._bits = 8 }
      v = (v << 1) | ((this._cur >>> 7) & 1)
      this._cur = (this._cur << 1) & 0xFF; this._bits--
    }
    return v
  }
}

// ── encode / decode ───────────────────────────────────────────────────────────
// Binary layout (all MSB-first):
//   Header (12 bytes):
//     [0]  roomWidth
//     [1]  roomHeight
//     [2]  orientation
//     [3]  flags  (bit0=customTabs, bit1=legacy customActiveTab — consumed but ignored on load)
//     [4]  defaultTabMask
//     [5-6] numCells  (uint16 LE)
//     [7-8] numWalls  (uint16 LE)
//     [9]  xyIdxBits  (bits needed for xyIdx = ceil(log2(w*h)))
//     [10] xBits      (bits for wall x coord)
//     [11] yBits      (bits for wall y coord)
//   [if customTabs:]  1 byte numTabs, then each tab: 1B idLen, id chars, 1B labelLen, label chars
//   [if customActiveTab:]  1 byte activeTab index
//   Cell bit stream (per cell):
//     xyIdxBits: xyIdx
//     9 bits:    appId
//     1 bit:     0=defaultTabMask, 1=custom (followed by 3-bit tabMask)
//     1 bit:     0=rot/extra default, 1=custom (followed by 3-bit rot + 8-bit extra)
//   Wall bit stream (per wall):
//     xBits: x,  yBits: y,  1 bit orient (0=h,1=v),  2 bits typeCode

function encodeState(stateObj) {
  const tabs = stateObj.tabs
  const cells = stateObj.gridCells ?? []
  const wallEntries = Object.entries(stateObj.walls ?? {})
  const roomWidth = stateObj.roomWidth
  const roomHeight = stateObj.roomHeight

  // Find most-common tabMask to use as default
  const tabBitsMap = {}
  tabs.forEach((tab, i) => { tabBitsMap[tab.id] = 1 << i })
  const maskFreq = {}
  for (const { tabIds } of cells) {
    const mask = Array.isArray(tabIds) ? tabIds.reduce((m, id) => m | (tabBitsMap[id] ?? 0), 0) : 0
    maskFreq[mask] = (maskFreq[mask] ?? 0) + 1
  }
  let defaultTabMask = 0
  for (const [m, f] of Object.entries(maskFreq)) {
    if (f > (maskFreq[defaultTabMask] ?? 0)) defaultTabMask = Number(m)
  }

  const customTabs = JSON.stringify(tabs) !== DEFAULT_TABS_JSON
  const flags = (customTabs ? 1 : 0)

  const xyIdxBits = Math.max(1, Math.ceil(Math.log2(roomWidth * roomHeight + 1)))
  const xBits = Math.max(1, Math.ceil(Math.log2(roomWidth + 2)))
  const yBits = Math.max(1, Math.ceil(Math.log2(roomHeight + 2)))

  const w = new BitWriter()
  // Header
  for (const b of [
    roomWidth, roomHeight, stateObj.orientation, flags, defaultTabMask,
    cells.length & 0xFF, (cells.length >> 8) & 0xFF,
    wallEntries.length & 0xFF, (wallEntries.length >> 8) & 0xFF,
    xyIdxBits, xBits, yBits
  ]) w.write(b, 8)

  // Optional custom tabs
  if (customTabs) {
    w.write(tabs.length, 8)
    for (const tab of tabs) {
      w.write(tab.id.length, 8)
      for (const c of tab.id) w.write(c.charCodeAt(0), 8)
      w.write(tab.label.length, 8)
      for (const c of tab.label) w.write(c.charCodeAt(0), 8)
    }
  }

  // Cells
  for (const { x, y, applianceId, rotation, extraData, tabIds } of cells) {
    const tabMask = Array.isArray(tabIds) ? tabIds.reduce((m, id) => m | (tabBitsMap[id] ?? 0), 0) : 0
    const rot = rotation ?? 0
    const extra = extraData ?? 0
    w.write(x + y * roomWidth, xyIdxBits)
    w.write(applianceId, 9)
    if (tabMask === defaultTabMask) {
      w.write(0, 1)
    } else {
      w.write(1, 1); w.write(tabMask, tabs.length)
    }
    if (rot === 0 && extra === 0) {
      w.write(0, 1)
    } else {
      w.write(1, 1); w.write(rot, 3); w.write(extra, 8)
    }
  }

  // Walls
  for (const [key, type] of wallEntries) {
    const [orient, x, y] = key.split(',')
    w.write(parseInt(x), xBits)
    w.write(parseInt(y), yBits)
    w.write(orient === 'v' ? 1 : 0, 1)
    w.write(WALL_TYPE_TO_CODE[type] ?? 1, 2)
  }

  return base64urlEncode(w.finish())
}

function decodeState(encoded) {
  try {
    const bytes = base64urlDecode(encoded)
    const r = new BitReader(bytes)

    const roomWidth       = r.read(8)
    const roomHeight      = r.read(8)
    const orientation     = r.read(8)
    const flags           = r.read(8)
    const defaultTabMask  = r.read(8)
    const numCells        = r.read(8) | (r.read(8) << 8)
    const numWalls        = r.read(8) | (r.read(8) << 8)
    const xyIdxBits       = r.read(8)
    const xBits           = r.read(8)
    const yBits           = r.read(8)

    let tabs = JSON.parse(DEFAULT_TABS_JSON)
    if (flags & 1) {
      tabs = []
      const numTabs = r.read(8)
      for (let i = 0; i < numTabs; i++) {
        let id = '', label = ''
        const idLen = r.read(8)
        for (let j = 0; j < idLen; j++) id += String.fromCharCode(r.read(8))
        const labelLen = r.read(8)
        for (let j = 0; j < labelLen; j++) label += String.fromCharCode(r.read(8))
        tabs.push({ id, label })
      }
    }

    if (flags & 2) r.read(8) // consume legacy activeTab byte (ignored)

    const tabFromMask = (mask) => tabs.filter((_, i) => mask & (1 << i)).map(t => t.id)

    const gridCells = []
    for (let i = 0; i < numCells; i++) {
      const xyIdx = r.read(xyIdxBits)
      const applianceId = r.read(9)
      const tabMask = r.read(1) ? r.read(tabs.length) : defaultTabMask
      let rotation = 0, extraData = 0
      if (r.read(1)) { rotation = r.read(3); extraData = r.read(8) }
      gridCells.push({
        x: xyIdx % roomWidth,
        y: Math.floor(xyIdx / roomWidth),
        applianceId, rotation, extraData,
        tabIds: tabFromMask(tabMask)
      })
    }

    const walls = {}
    for (let i = 0; i < numWalls; i++) {
      const x = r.read(xBits), y = r.read(yBits)
      const orient = r.read(1) ? 'v' : 'h'
      walls[`${orient},${x},${y}`] = WALL_CODE_TO_TYPE[r.read(2)] ?? 'wall'
    }

    return { tabs, orientation, roomWidth, roomHeight, walls, gridCells }
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
    state.activeTabId = 'complete'
  }
}

function resetState() {
  Object.assign(state, JSON.parse(JSON.stringify(DEFAULT_STATE)))
  syncToHash()
}

export function useRestaurantStore() {
  return { state, loadFromHash, syncToHash, resetState }
}
