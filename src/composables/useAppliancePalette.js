import { ref } from 'vue'
import { getAppliancePalette } from '../appliancePalette'

// Module-level singleton: palette is loaded once and shared across all consumers
const palette = ref([])
const loading = ref(true)
const error = ref(null)

getAppliancePalette()
  .then(data => { palette.value = data; loading.value = false })
  .catch(err => { error.value = err; loading.value = false })

export function useAppliancePalette() {
  return { palette, loading, error }
}
