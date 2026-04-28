<template>
  <teleport to="body">
    <div class="size-modal-backdrop" role="dialog" aria-modal="true">
      <div class="size-modal">
        <div class="size-modal-header">
          <h2>Select Restaurant Size</h2>
        </div>
        <div class="size-modal-body">
          <div class="size-grid">
            <button class="size-card" v-for="opt in options" :key="opt.label" @click="choose(opt)">
              <div class="floor-preview-wrap">
                <div class="floor-preview-wrap">
                  <img
                    v-if="!fallbackMap[getPreviewKey(opt)]"
                    :src="getPreviewSrc(opt)"
                    class="floor-preview"
                    @error="() => setFallback(opt.label, isDark())"
                    aria-hidden="true"
                    alt="preview"
                  />

                  <!-- SVG fallback if the pre-generated PNG is missing -->
                  <svg v-else class="floor-preview" :viewBox="`0 0 ${opt.w} ${opt.h}`" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                    <rect x="0" y="0" :width="opt.w" :height="opt.h" class="outer" fill="#f9fbff" />
                    <g class="grid-lines">
                      <rect v-for="i in range(opt.w - 1)" :key="`v${i}`" :x="(i+1) - 0.25" y="0" :width="0.5" :height="opt.h" />
                      <rect v-for="j in range(opt.h - 1)" :key="`h${j}`" x="0" :y="(j+1) - 0.25" :width="opt.w" :height="0.5" />
                    </g>
                  </svg>
                </div>
              </div>
              <div class="size-label">{{ opt.label }}</div>
              <div class="size-dim">{{ opt.dim }}</div>
            </button>
            <div class="size-card size-card--custom">
              <div class="size-label">Custom</div>
              <div class="custom-inputs">
                <input type="number" v-model.number="customW" :min="MIN_W" :max="MAX_W" aria-label="Width" />
                <span class="by">×</span>
                <input type="number" v-model.number="customH" :min="MIN_H" :max="MAX_H" aria-label="Height" />
              </div>
              <button class="custom-confirm" @click="chooseCustom" :disabled="!validCustom">Choose</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed, reactive } from 'vue'
export default {
  name: 'RestaurantSizeModal',
  emits: ['choose'],
  setup(_, { emit }) {
    const options = [
      { label: 'Diner', dim: '10×6', w: 10, h: 6 },
      { label: 'Small', dim: '10×7', w: 10, h: 7 },
      { label: 'Medium', dim: '14×6', w: 14, h: 6 },
      { label: 'Large', dim: '13×9', w: 13, h: 9 },
      { label: 'Huge', dim: '16×12', w: 16, h: 12 },
      { label: 'Banquet', dim: '20×12', w: 20, h: 12 }
    ]

    const customW = ref(16)
    const customH = ref(12)

    // map of option.label -> whether PNG preview failed to load
    const fallbackMap = reactive({})

    function isDark() {
      try { return document.documentElement.classList.contains('dark') }
      catch (e) { return false }
    }

    function getPreviewSrc(opt) {
      const suffix = isDark() ? '-dark' : ''
      return `/res/previews/${opt.w}x${opt.h}${suffix}.png`
    }

    function getPreviewKey(opt) {
      return `${opt.w}x${opt.h}${isDark() ? ':dark' : ''}`
    }

    function setFallback(label, dark = false) {
      const key = `${label}${dark ? ':dark' : ''}`
      fallbackMap[key] = true
    }

    const MIN_W = 10, MAX_W = 50
    const MIN_H = 6,  MAX_H = 50

    const validCustom = computed(() => {
      const w = Number(customW.value)
      const h = Number(customH.value)
      return Number.isFinite(w) && Number.isFinite(h) && w >= MIN_W && w <= MAX_W && h >= MIN_H && h <= MAX_H
    })

    function range(n) {
      n = Number(n) || 0
      return Array.from({ length: Math.max(0, n) }, (_, i) => i)
    }

    function choose(opt) {
      emit('choose', { w: opt.w, h: opt.h })
    }
    function chooseCustom() {
      if (!validCustom.value) return
      const w = Math.min(MAX_W, Math.max(MIN_W, Math.round(customW.value)))
      const h = Math.min(MAX_H, Math.max(MIN_H, Math.round(customH.value)))
      emit('choose', { w, h })
    }

    // Prevent Escape from closing anything — stop propagation for Escape
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation(); e.preventDefault();
      }
    }
    onMounted(() => window.addEventListener('keydown', onKey, true))
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))

    return { options, customW, customH, choose, chooseCustom, validCustom, range, MIN_W, MAX_W, MIN_H, MAX_H, fallbackMap, getPreviewSrc, setFallback, getPreviewKey, isDark }
  }
}
</script>

<style scoped>
.size-modal-backdrop {
  position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.6); z-index: 10000; backdrop-filter: blur(2px);
}
.size-modal {
  background: #fff; color: #222; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.35);
  width: 864px; max-width: calc(100vw - 32px); padding: 26px; font-family: sans-serif;
}
.size-modal-header h2 { margin: 0 0 8px; font-size: 1.25rem }
.size-modal-body { margin-top: 6px }
.size-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px }
.size-card {
  background: #eef6ff; border-radius: 10px; padding: 19px; display:flex; flex-direction:column; align-items:center; gap:10px;
  border: 1.5px solid rgba(31,111,235,0.14); cursor: pointer; min-height: 101px;
  transition: transform 0.12s, box-shadow 0.12s;
}
.size-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(31,111,235,0.07) }
.size-label { font-weight:700; color: #0b1220 }
.size-dim { color:#475569 }
.size-card--custom { grid-column: span 2; display:flex; align-items:center; justify-content:space-between }
.custom-inputs { display:flex; align-items:center; gap:8px }
.custom-inputs input { width:86px; padding:7px 10px; border-radius:6px; border:1px solid #ddd; color: #0b1220; background: #fff }
.custom-confirm { margin-left:14px; padding:9px 14px; border-radius:8px; border:none; background:#1f6feb; color:white; cursor:pointer }
.custom-confirm:disabled { opacity:0.5; cursor:not-allowed }
.by { font-weight:700; color:#333 }

.floor-preview-wrap { width: 144px; height: 101px; display:flex; align-items:center; justify-content:center }
.floor-preview { width: 100%; height: auto; display:block }
.floor-preview .outer { stroke: #1158d6; stroke-width: 0.7; rx: 0.18; fill: #f9fbff }
.floor-preview .grid-lines line {
  stroke: #4b5563;
  stroke-opacity: 0.95;
  stroke-width: 0.16;
  shape-rendering: crispEdges;
  stroke-linecap: butt;
  vector-effect: non-scaling-stroke;
}

/* Rect-based grid lines (used for modal preview) */
.floor-preview .grid-lines rect {
  fill: #4b5563;
  fill-opacity: 0.9;
  shape-rendering: crispEdges;
}

/* Removed Firefox-specific overrides — previews are now loaded from
  pre-generated PNGs with an SVG fallback for missing files. */

/* Dark mode overrides when html.dark is set */
html.dark .size-modal {
  background: #0b1220;
  color: #d7e8ff;
  box-shadow: 0 12px 48px rgba(0,0,0,0.6);
}
html.dark .size-card {
  background: #071029;
  border: 1.5px solid rgba(90,140,255,0.18);
}
html.dark .size-label { color: #e6f0ff }
html.dark .size-dim { color: #9fb0c8 }
html.dark .custom-inputs input { background: #071029; color: #e6f0ff; border: 1px solid #19314a }
html.dark .custom-confirm { background: #2563eb }
html.dark .floor-preview .outer { stroke: #7da7ff; stroke-width: 0.7; fill: #071029 }
html.dark .floor-preview .grid-lines line { stroke: #9aa7b8; stroke-opacity: 0.85; stroke-width: 0.14 }
</style>
