import { ref } from 'vue'

const BASE_URL = import.meta.env.BASE_URL || '/'

const LS_MODS_ENABLED_KEY = 'modsEnabled'
const LS_DISABLED_MODS_KEY = 'disabledModSteamIds'
const LS_LEGACY_ENABLED_MODS_KEY = 'enabledModSteamIds'
const SS_SESSION_ENABLED_MODS_KEY = 'sessionEnabledModSteamIds'

function readJsonArray(storage, key) {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(Number).filter(id => !Number.isNaN(id)) : null
  } catch (e) {
    return null
  }
}

function writeJsonArray(storage, key, value) {
  try {
    if (!Array.isArray(value)) {
      storage.removeItem(key)
      return
    }
    storage.setItem(key, JSON.stringify(value.map(Number).filter(id => !Number.isNaN(id))))
  } catch (e) {}
}

export const modsEnabled = ref(localStorage.getItem(LS_MODS_ENABLED_KEY) !== 'false')
export const disabledModSteamIds = ref(readJsonArray(localStorage, LS_DISABLED_MODS_KEY) || [])
const legacyEnabledModSteamIds = ref(readJsonArray(localStorage, LS_LEGACY_ENABLED_MODS_KEY))
export const sessionEnabledModSteamIds = ref([])
try { sessionStorage.removeItem(SS_SESSION_ENABLED_MODS_KEY) } catch (e) {}

let __modSourceCatalogPromise = null

export async function loadModSourceCatalog() {
  if (__modSourceCatalogPromise) return __modSourceCatalogPromise
  __modSourceCatalogPromise = fetch(BASE_URL + 'res/appliance_sources.json')
    .then(resp => {
      if (!resp.ok) throw new Error('Failed to load appliance_sources.json')
      return resp.json()
    })
  return __modSourceCatalogPromise
}

export function isModEnabled(steamId) {
  const id = Number(steamId)
  if (Number.isNaN(id) || id === -1) return true
  if (sessionEnabledModSteamIds.value.includes(id)) return true
  if (!modsEnabled.value) return false
  if (disabledModSteamIds.value.length > 0) return !disabledModSteamIds.value.includes(id)
  if (legacyEnabledModSteamIds.value && legacyEnabledModSteamIds.value.length > 0) {
    return legacyEnabledModSteamIds.value.includes(id)
  }
  return true
}

export function isModPermanentlyEnabled(steamId) {
  const id = Number(steamId)
  if (Number.isNaN(id) || id === -1) return true
  if (!modsEnabled.value) return false
  if (disabledModSteamIds.value.length > 0) return !disabledModSteamIds.value.includes(id)
  if (legacyEnabledModSteamIds.value && legacyEnabledModSteamIds.value.length > 0) {
    return legacyEnabledModSteamIds.value.includes(id)
  }
  return true
}

export function setModsEnabled(enabled) {
  modsEnabled.value = !!enabled
  try { localStorage.setItem(LS_MODS_ENABLED_KEY, modsEnabled.value ? 'true' : 'false') } catch (e) {}
}

export function setDisabledModSteamIds(ids) {
  const normalized = Array.isArray(ids) ? [...new Set(ids.map(Number).filter(id => !Number.isNaN(id) && id !== -1))].sort((a, b) => a - b) : []
  disabledModSteamIds.value = normalized
  legacyEnabledModSteamIds.value = null
  writeJsonArray(localStorage, LS_DISABLED_MODS_KEY, normalized)
  try { localStorage.removeItem(LS_LEGACY_ENABLED_MODS_KEY) } catch (e) {}
}

export function setSessionEnabledModSteamIds(ids) {
  const normalized = Array.isArray(ids) ? [...new Set(ids.map(Number).filter(id => !Number.isNaN(id) && id !== -1))].sort((a, b) => a - b) : []
  sessionEnabledModSteamIds.value = normalized
  writeJsonArray(sessionStorage, SS_SESSION_ENABLED_MODS_KEY, normalized)
}

export function addSessionEnabledModSteamIds(ids) {
  const next = new Set(sessionEnabledModSteamIds.value)
  for (const id of ids || []) {
    const numericId = Number(id)
    if (!Number.isNaN(numericId) && numericId !== -1) next.add(numericId)
  }
  setSessionEnabledModSteamIds([...next])
}

export function clearSessionEnabledModSteamIds() {
  sessionEnabledModSteamIds.value = []
  try { sessionStorage.removeItem(SS_SESSION_ENABLED_MODS_KEY) } catch (e) {}
}

export async function migrateLegacyModSettings(allSources) {
  if (disabledModSteamIds.value.length > 0) return false
  if (!legacyEnabledModSteamIds.value || legacyEnabledModSteamIds.value.length === 0) return false
  if (!Array.isArray(allSources) || allSources.length === 0) return false

  const allModIds = allSources
    .map(source => Number(source.SteamID))
    .filter(id => !Number.isNaN(id) && id !== -1)
  const enabledSet = new Set(legacyEnabledModSteamIds.value)
  setDisabledModSteamIds(allModIds.filter(id => !enabledSet.has(id)))
  return true
}