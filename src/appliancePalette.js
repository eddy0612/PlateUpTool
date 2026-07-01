// Loads appliances.json and provides a palette array for the app

import { isModEnabled } from './composables/useModSupport'

// Module-level singletons: the source catalog, raw JSON and derived lookups are
// fetched once and shared across all consumers.
let __applianceSourceCatalogPromise = null
let __rawAppliancesPromise = null
let __applianceSourceInfoByGameIdPromise = null

/** Clear the cached promise so the next call re-fetches with updated mod settings. */
export function clearAppliancePaletteCache() {
  __applianceSourceCatalogPromise = null
  __rawAppliancesPromise = null
  __applianceSourceInfoByGameIdPromise = null
}

export async function getApplianceSourceCatalog() {
  if (__applianceSourceCatalogPromise) return __applianceSourceCatalogPromise
  const base = import.meta.env.BASE_URL
  __applianceSourceCatalogPromise = fetch(base + 'res/appliance_sources.json')
    .then(resp => {
      if (!resp.ok) throw new Error('Failed to load appliance_sources.json')
      return resp.json()
    })
  return __applianceSourceCatalogPromise
}

export function getRawAppliances() {
  if (__rawAppliancesPromise) return __rawAppliancesPromise
  const base = import.meta.env.BASE_URL
  __rawAppliancesPromise = getApplianceSourceCatalog()
    .then(sources => Promise.all(
      sources.map(({ id, src, SteamID, Description }) =>
        fetch(base + src)
          .then(resp => {
            if (!resp.ok) throw new Error(`Failed to load appliance source "${id}": ${src}`)
            return resp.json().then(data => data.map(entry => ({
              ...entry,
              _sourceId: id,
              _sourceSteamID: SteamID,
              _sourceDescription: Description || ''
            })))
          })
      )
    ))
    .then(arrays => arrays.flat())
  return __rawAppliancesPromise
}

export async function getApplianceSourceInfoByGameId() {
  if (__applianceSourceInfoByGameIdPromise) return __applianceSourceInfoByGameIdPromise
  __applianceSourceInfoByGameIdPromise = getRawAppliances().then(entries => {
    const map = new Map()
    for (const entry of entries) {
      const id = Number(entry.GameID ?? entry.gameid ?? entry.gameId)
      if (Number.isNaN(id)) continue
      map.set(id, {
        gameId: id,
        sourceId: entry._sourceId,
        steamId: Number(entry._sourceSteamID ?? -1),
        description: entry._sourceDescription || '',
        itemDescription: entry.ItemDescription || ''
      })
    }
    return map
  })
  return __applianceSourceInfoByGameIdPromise
}

// Returns a Promise that resolves to an array of { id, label, icon, icon2D, flipPartner, alternativeKey? }
// id is the GameID (32-bit signed int matching the game engine's appliance ID).
// For entries with an Alternatives map, one palette entry is produced per alternative
// (using that alternative's 3D/2D filenames and its key as alternativeKey).
// The main entry's 3DFilename/2DFilename is ignored when Alternatives are present.
export async function getAppliancePalette() {
  const base = import.meta.env.BASE_URL
  const applianceMap = await getRawAppliances()
  const result = []
  for (const entry of applianceMap) {
    if (!entry.Keep) continue
    const id = Number(entry.GameID ?? entry.gameid ?? entry.gameId)
    const sourceSteamId = Number(entry._sourceSteamID ?? -1)
    if (sourceSteamId !== -1 && !isModEnabled(sourceSteamId)) continue
    const fpRaw = entry.flipPartner
    const fp = fpRaw != null ? (Number(fpRaw) || null) : null
    const flipPartner = Number.isNaN(fp) ? null : fp
    const label = entry.ItemDescription

    if (entry.Alternatives && typeof entry.Alternatives === 'object') {
      // Expand into one palette entry per alternative, sorted by key
      const keys = Object.keys(entry.Alternatives).map(Number).sort((a, b) => a - b)
      for (const k of keys) {
        const alt = entry.Alternatives[String(k)]
        const icon3 = alt['3DFilename'] ? `${base}res/3D/${alt['3DFilename']}` : null
        const icon2 = alt['2DFilename'] ? `${base}res/2D/${alt['2DFilename']}` : null
        // Skip alternatives that provide no visual assets (compat-only entries)
        if (!icon3 && !icon2) continue

        result.push({
          id,
          label: alt['ItemDescription'] || label,
          icon: icon3 || icon2 || '',
          icon2D: icon2 || '',
          flipPartner,
          alternativeKey: k,
          isMod: sourceSteamId !== -1,
          sourceSteamId,
          sourceDescription: entry._sourceDescription || ''
        })
      }
    } else {
      const icon3 = entry['3DFilename'] ? `${base}res/3D/${entry['3DFilename']}` : null
      const icon2 = entry['2DFilename'] ? `${base}res/2D/${entry['2DFilename']}` : null
      result.push({
        id,
        label,
        icon: icon3 || icon2 || '',
        icon2D: icon2 || '',
        flipPartner,
        isMod: sourceSteamId !== -1,
        sourceSteamId,
        sourceDescription: entry._sourceDescription || ''
      })
    }
  }
  return result
}
