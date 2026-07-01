// Loads appliances.json and provides a palette array for the app

// Module-level singleton: raw JSON is fetched once and shared across all consumers.
// The list of files to load is read from appliance_sources.json; each entry has an
// "id" (for diagnostics) and a "src" path relative to BASE_URL.  To include a mod,
// add another entry to appliance_sources.json pointing at the mod's own JSON file.
let __rawAppliancesPromise = null

/** Clear the cached promise so the next call re-fetches with updated mod settings. */
export function clearAppliancePaletteCache() {
  __rawAppliancesPromise = null
}

export function getRawAppliances() {
  if (__rawAppliancesPromise) return __rawAppliancesPromise
  const base = import.meta.env.BASE_URL
  __rawAppliancesPromise = fetch(base + 'res/appliance_sources.json')
    .then(resp => {
      if (!resp.ok) throw new Error('Failed to load appliance_sources.json')
      return resp.json()
    })
    .then(sources => {
      // Apply mod visibility filter from localStorage
      const modsEnabled = localStorage.getItem('modsEnabled') !== 'false'
      const enabledRaw = localStorage.getItem('enabledModSteamIds')
      const enabledIds = enabledRaw !== null ? JSON.parse(enabledRaw) : null // null = all enabled
      const filteredSources = sources.filter(s => {
        if (s.SteamID === -1) return true // base always included
        if (!modsEnabled) return false
        if (enabledIds === null) return true
        return enabledIds.includes(s.SteamID)
      })
      return Promise.all(
        filteredSources.map(({ id, src }) =>
          fetch(base + src)
            .then(resp => {
              if (!resp.ok) throw new Error(`Failed to load appliance source "${id}": ${src}`)
              return resp.json().then(data => data.map(entry => ({ ...entry, _sourceId: id })))
            })
        )
      )
    })
    .then(arrays => arrays.flat())
  return __rawAppliancesPromise
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
          isMod: entry._sourceId !== 'base'
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
        isMod: entry._sourceId !== 'base'
      })
    }
  }
  return result
}
