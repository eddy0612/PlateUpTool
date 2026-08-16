import { ref } from 'vue'
import { getAppliancePalette } from '../appliancePalette'

// Module-level singleton: palette is loaded once and shared across all consumers
const palette = ref([])
const loading = ref(true)
const error = ref(null)

// Image cache to store preloaded images
const preloadedImages = new Map()

getAppliancePalette()
  .then(data => {
    palette.value = data;
    // Preload all 2D and 3D images efficiently
    data.forEach(entry => {
      // Preload 2D images
      if (entry.icon2D && !preloadedImages.has(entry.icon2D)) {
        const img = new window.Image();
        img.src = entry.icon2D;
        preloadedImages.set(entry.icon2D, img);
      }
      // Preload 3D images (icon)
      if (entry.icon && entry.icon !== entry.icon2D && !preloadedImages.has(entry.icon)) {
        const img = new window.Image();
        img.src = entry.icon;
        preloadedImages.set(entry.icon, img);
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
    // Preload images for new palette entries
    data.forEach(entry => {
      if (entry.icon2D && !preloadedImages.has(entry.icon2D)) {
        const img = new window.Image()
        img.src = entry.icon2D
        preloadedImages.set(entry.icon2D, img)
      }
      if (entry.icon && entry.icon !== entry.icon2D && !preloadedImages.has(entry.icon)) {
        const img = new window.Image()
        img.src = entry.icon
        preloadedImages.set(entry.icon, img)
      }
    })
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}
