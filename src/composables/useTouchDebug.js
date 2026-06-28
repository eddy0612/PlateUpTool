import { ref } from 'vue'

const MAX_ENTRIES = 25

const isClient = typeof window !== 'undefined'

function getInitialEnabled() {
  if (!isClient) return false
  try {
    const params = new URLSearchParams(window.location.search)
    const debugParam = params.get('touchDebug') || params.get('debugTouch')
    if (debugParam === '1' || debugParam === 'true') return true
  } catch {}
  return false
}

function getInitialViewportEnabled() {
  if (!isClient) return false
  try {
    const params = new URLSearchParams(window.location.search)
    const v = params.get('viewportDebug') || params.get('showViewport') || params.get('showResolution')
    if (v === '1' || v === 'true') return true
  } catch {}
  return false
}

const showTouchDebug = ref(getInitialEnabled())
const showViewportDebug = ref(getInitialViewportEnabled())
const touchDebugCounter = ref(0)
const touchDebugLog = ref([])

const viewportWidth = ref(0)
const viewportHeight = ref(0)
const visualViewportWidth = ref(null)
const visualViewportHeight = ref(null)
const viewportDpr = ref(1)

function updateViewportInfo() {
  if (!isClient) return
  try {
    viewportWidth.value = Math.round(window.innerWidth || document.documentElement?.clientWidth || 0)
    viewportHeight.value = Math.round(window.innerHeight || document.documentElement?.clientHeight || 0)
    viewportDpr.value = window.devicePixelRatio || 1
    if (window.visualViewport) {
      visualViewportWidth.value = Math.round(window.visualViewport.width)
      visualViewportHeight.value = Math.round(window.visualViewport.height)
    } else {
      visualViewportWidth.value = null
      visualViewportHeight.value = null
    }
  } catch {}
}

if (isClient) {
  // keep values current when enabled or when developer wants to inspect
  // Debounced notification logic: dispatch `plateup-viewport-changed` when
  // the measured viewport metrics actually change.
  let _prev = {
    w: viewportWidth.value,
    h: viewportHeight.value,
    vw: visualViewportWidth.value,
    vh: visualViewportHeight.value,
    dpr: viewportDpr.value,
  }
  let _timer = null
  function scheduleViewportChangeIfNeeded() {
    const now = { w: viewportWidth.value, h: viewportHeight.value, vw: visualViewportWidth.value, vh: visualViewportHeight.value, dpr: viewportDpr.value }
    const changed = now.w !== _prev.w || now.h !== _prev.h || now.vw !== _prev.vw || now.vh !== _prev.vh || now.dpr !== _prev.dpr
    if (!changed) return
    // update previous snapshot
    _prev = now
    if (_timer) clearTimeout(_timer)
    _timer = setTimeout(() => {
      try { window.dispatchEvent(new CustomEvent('plateup-viewport-changed')) } catch (e) {}
      _timer = null
    }, 150)
  }

  // Single handler invoked by resize listeners. Ensures update + schedule
  function _viewportHandler() {
    try { updateViewportInfo() } catch (e) {}
    try { scheduleViewportChangeIfNeeded() } catch (e) {}
  }

  window.addEventListener('resize', _viewportHandler)
  if (window.visualViewport && window.visualViewport.addEventListener) {
    window.visualViewport.addEventListener('resize', _viewportHandler)
  }
  // initial fill + possible notification
  _viewportHandler()
}

function setTouchDebugEnabled(value) {
  showTouchDebug.value = !!value
}

function toggleTouchDebug() {
  setTouchDebugEnabled(!showTouchDebug.value)
}

function logTouchDebug(label, extra = '') {
  if (!showTouchDebug.value) return
  const suffix = extra ? ` ${extra}` : ''
  touchDebugLog.value.unshift({ id: ++touchDebugCounter.value, text: `${label}${suffix}` })
  if (touchDebugLog.value.length > MAX_ENTRIES) touchDebugLog.value.length = MAX_ENTRIES
}

function clearTouchDebugLog() {
  touchDebugLog.value = []
}

function formatTouchDebugLog() {
  return touchDebugLog.value
    .slice()
    .reverse()
    .map(entry => entry.text)
    .join('\n')
}

async function copyTouchDebugLog() {
  if (!isClient || !navigator.clipboard?.writeText) return false
  try {
    const text = formatTouchDebugLog()
    await navigator.clipboard.writeText(text || 'No touch debug entries recorded.')
    return true
  } catch {
    return false
  }
}

if (isClient) {
  window.addEventListener('error', (event) => {
    const message = event?.error?.message || event?.message || 'Unknown error'
    logTouchDebug('window-error', message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    const message = reason?.message || String(reason || 'Unknown rejection')
    logTouchDebug('unhandled-rejection', message)
  })
}

export function useTouchDebug() {
  return {
    showTouchDebug,
    showViewportDebug,
    touchDebugLog,
    logTouchDebug,
    clearTouchDebugLog,
    copyTouchDebugLog,
    setTouchDebugEnabled,
    toggleTouchDebug,
    // viewport info
    viewportWidth,
    viewportHeight,
    visualViewportWidth,
    visualViewportHeight,
    viewportDpr,
  }
}