// Loads ApplianceMap.json and provides a palette array for the app



// Returns a Promise that resolves to an array of { id, label, icon }
export async function getAppliancePalette() {
  const resp = await fetch('/res/ApplianceMap.json')
  if (!resp.ok) throw new Error('Failed to load ApplianceMap.json')
  const applianceMap = await resp.json()
  return applianceMap.map(entry => ({
    id: entry.filename.replace(/\..*$/, ''),
    label: entry.name,
    icon: `/res/AppliancePicture/${entry.filename}`
  }))
}
