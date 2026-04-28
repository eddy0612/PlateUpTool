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
