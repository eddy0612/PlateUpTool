import { ref } from 'vue'
import { getAppliancePalette } from '../appliancePalette'

// Module-level singleton: palette is loaded once and shared across all consumers
const palette = ref([])
const loading = ref(true)
const error = ref(null)


getAppliancePalette()
  .then(data => {
    palette.value = data;
    // Preload all 2D images
    data.forEach(entry => {
      if (entry.icon2D) {
        const img = new window.Image();
        img.src = entry.icon2D;
      }
    });
    loading.value = false;
  })
  .catch(err => { error.value = err; loading.value = false })

export function useAppliancePalette() {
  return { palette, loading, error }
}

/** Re-fetch the appliance palette (call after clearing the cache) and update the shared ref. */
export async function reloadPalette() {
  loading.value = true
  try {
    const data = await getAppliancePalette()
    palette.value = data
    data.forEach(entry => {
      if (entry.icon2D) {
        const img = new window.Image()
        img.src = entry.icon2D
      }
    })
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}
