// Loads appliances.json and provides a palette array for the app

// Module-level singleton: raw JSON is fetched once and shared across all consumers.
// The list of files to load is read from appliance_sources.json; each entry has an
// "id" (for diagnostics) and a "src" path relative to BASE_URL.  To include a mod,
// add another entry to appliance_sources.json pointing at the mod's own JSON file.
let __rawAppliancesPromise = null
export function getRawAppliances() {
  if (__rawAppliancesPromise) return __rawAppliancesPromise
  const base = import.meta.env.BASE_URL
  __rawAppliancesPromise = fetch(base + 'res/appliance_sources.json')
    .then(resp => {
      if (!resp.ok) throw new Error('Failed to load appliance_sources.json')
      return resp.json()
    })
    .then(sources => {
      return Promise.all(
        sources.map(({ id, src }) =>
          fetch(base + src)
            .then(resp => {
              if (!resp.ok) throw new Error(`Failed to load appliance source "${id}": ${src}`)
              return resp.json()
            })
        )
      )
    })
    .then(arrays => arrays.flat())
  return __rawAppliancesPromise
}

// Returns a Promise that resolves to an array of { id, label, icon }
// id is the GameID (32-bit signed int matching the game engine's appliance ID)
export async function getAppliancePalette() {
  const base = import.meta.env.BASE_URL
  const applianceMap = await getRawAppliances()
  // Build internal ID → GameID lookup so we can convert flipPartner values
  // (flipPartner values in appliances.json are internal sequential IDs)
  const internalIdToGameId = new Map()
  for (const entry of applianceMap) {
    const internalId = Number(entry.ID ?? entry.id ?? entry.Id)
    const gameId = Number(entry.GameID ?? entry.gameid ?? entry.gameId)
    if (!Number.isNaN(internalId) && !Number.isNaN(gameId)) internalIdToGameId.set(internalId, gameId)
  }
  return applianceMap
    .filter(entry => entry.Keep)
    .map(entry => ({
      id: entry.GameID,
      label: entry.ItemDescription,
      icon: `${base}res/3D/${entry["3DFilename"]}`,
      icon2D: `${base}res/2D/${entry["2DFilename"]}`,
      flipPartner: entry.flipPartner != null ? (internalIdToGameId.get(Number(entry.flipPartner)) ?? null) : null
    }))
}
