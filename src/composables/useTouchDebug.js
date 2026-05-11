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

const showTouchDebug = ref(getInitialEnabled())
const touchDebugCounter = ref(0)
const touchDebugLog = ref([])

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
    touchDebugLog,
    logTouchDebug,
    clearTouchDebugLog,
    copyTouchDebugLog,
    setTouchDebugEnabled,
    toggleTouchDebug,
  }
}