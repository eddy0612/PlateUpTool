// Loads appliances.json and provides a palette array for the app



// Returns a Promise that resolves to an array of { id, label, icon }
export async function getAppliancePalette() {
  const base = import.meta.env.BASE_URL
  const resp = await fetch(base + 'res/appliances.json')
  if (!resp.ok) throw new Error('Failed to load appliances.json')
  const applianceMap = await resp.json()
  return applianceMap
    .filter(entry => entry.Keep)
    .map(entry => ({
      id: entry.ID,
      label: entry.ItemDescription,
      icon: `${base}res/3D/${entry["3DFilename"]}`,
      icon2D: `${base}res/2D/${entry["2DFilename"]}`
    }))
}
