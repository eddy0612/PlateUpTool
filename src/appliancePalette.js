// Loads appliances.json and provides a palette array for the app



// Returns a Promise that resolves to an array of { id, label, icon }
// id is the GameID (32-bit signed int matching the game engine's appliance ID)
export async function getAppliancePalette() {
  const base = import.meta.env.BASE_URL
  const resp = await fetch(base + 'res/appliances.json')
  if (!resp.ok) throw new Error('Failed to load appliances.json')
  const applianceMap = await resp.json()
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
