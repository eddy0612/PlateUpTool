<template>
  <div class="root">
    <header class="top-bar">
      <h1>PlateUp Tool</h1>
      <div class="header-right">
        <button class="reset-button" @click="startAgain" title="Clear the grid and start over">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Start Again
        </button>
        <button class="donate-button" @click="openDonate" title="Support this project – donate via PayPal">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4 1c2.21 0 4 1.755 4 3.92C8 2.755 9.79 1 12 1s4 1.755 4 3.92c0 3.263-3.234 4.414-7.608 9.608a.513.513 0 0 1-.784 0C3.234 9.334 0 8.183 0 4.92 0 2.755 1.79 1 4 1z"/>
          </svg>
          Donate
        </button>
        <button class="credits-button" @click="showCredits = true" title="Credits &amp; Information">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
          </svg>
          Credits
        </button>
        <button class="feedback-button" @click="openFeedback" title="Report a bug or give feedback">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Bugs/Feedback
        </button>
        <button class="help-button" @click="showHelp = true" title="Keyboard shortcuts &amp; controls">?</button>
      </div>
    </header>

    <teleport to="body">
      <div v-if="showCredits" class="help-modal-backdrop" @click.self="showCredits = false">
        <div class="help-modal">
          <div class="help-modal-header">
            <h2>Credits &amp; Information</h2>
            <button class="help-modal-close" @click="showCredits = false">✕</button>
          </div>
          <div class="help-modal-body credits-body" v-html="creditsHtml"></div>
        </div>
      </div>
    </teleport>

    <teleport to="body">
      <div v-if="showHelp" class="help-modal-backdrop" @click.self="showHelp = false">
        <div class="help-modal">
          <div class="help-modal-header">
            <h2>Controls &amp; Shortcuts</h2>
            <button class="help-modal-close" @click="showHelp = false">✕</button>
          </div>
          <div class="help-modal-body">
            <section>
              <h3>Tabs</h3>
              <dl>
                <div><dt>1 – 9, 0 or click</dt><dd>Switch to tab 1–9 / 10</dd></div>
                <div><dt>Right-click tab</dt><dd>Rename / delete tab</dd></div>
                <div><dt>+ button</dt><dd>Add a new tab (up to 10)</dd></div>
              </dl>
            </section>
            <section>
              <h3>Selection</h3>
              <dl>
                <div><dt>Ctrl+A</dt><dd>Select all items on the current tab</dd></div>
                <div><dt>Ctrl+I</dt><dd>Invert selection</dd></div>
                <div><dt>Click cell</dt><dd>Select that cell</dd></div>
                <div><dt>Shift+Click</dt><dd>Select rectangular range from anchor</dd></div>
                <div><dt>Ctrl+Click</dt><dd>Toggle cell in/out of selection</dd></div>
                <div><dt>Shift/Ctrl+Drag</dt><dd>Box-select cells</dd></div>
              </dl>
            </section>
            <section>
              <h3>Rotation</h3>
              <dl>
                <div><dt>Right-click selection</dt><dd>Pivot 90° clockwise around clicked cell</dd></div>
                <div><dt>Shift+Right-click selection</dt><dd>Pivot 90° counter-clockwise around clicked cell</dd></div>
              </dl>
            </section>
            <section>
              <h3>Cut / Copy / Paste</h3>
              <dl>
                <div><dt>Ctrl+C</dt><dd>Copy selected cells</dd></div>
                <div><dt>Ctrl+X</dt><dd>Cut selected cells</dd></div>
                <div><dt>Ctrl+V</dt><dd>Paste</dd></div>
                <div><dt>Ctrl+D</dt><dd>Duplicate</dd></div>
                <div><dt>Escape</dt><dd>Cancel pending paste</dd></div>
              </dl>
            </section>
            <section>
              <h3>Editing</h3>
              <dl>
                <div><dt>Delete / Backspace</dt><dd>Remove selected cells</dd></div>
                <div><dt>Drag from palette</dt><dd>Place an appliance onto the grid</dd></div>
                <div><dt>Drag selected cells</dt><dd>Move selection to a new position</dd></div>
              </dl>
            </section>
            <section>
              <h3>Structure Mode</h3>
              <dl>
                <div><dt>Left-click edge</dt><dd>Set wall/edge to the selected palette tool</dd></div>
                <div><dt>Right-click edge</dt><dd>Clear that wall/edge</dd></div>
              </dl>
            </section>
            <section>
              <h3>Navigation</h3>
              <dl>
                <div><dt>Scroll wheel</dt><dd>Zoom in / out</dd></div>
                <div><dt>Right-drag</dt><dd>Pan the viewport</dd></div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </teleport>
    <div class="main-grid">
      <GridView />
      <AppliancePalette />
    </div>
    <div
      v-if="paletteDragActive && paletteDragItem"
      class="palette-drag-ghost"
      :style="{ left: paletteDragPos.x + 'px', top: paletteDragPos.y + 'px', width: (cellSize * state.zoom) + 'px', height: (cellSize * state.zoom) + 'px' }"
    >
      <img v-if="isImageIcon(paletteDragItem.icon)" :src="get2DApplianceIcon(paletteDragItem.id)" />
      <span v-else style="font-size:1.8em">{{ paletteDragItem.icon }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useRestaurantStore } from './store/restaurant'
import { useGrid } from './composables/useGrid'
import GridView from './components/GridView.vue'
import AppliancePalette from './components/AppliancePalette.vue'
import creditsRaw from './CREDITS.md?raw'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export default {
  name: 'App',
  components: { GridView, AppliancePalette },
  setup() {
    const { state, loadFromHash, syncToHash, resetState } = useRestaurantStore()
    const { loadGridFromState, paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon, cellSize } = useGrid()

    const showHelp = ref(false)
    const showCredits = ref(false)

    const renderer = new marked.Renderer()
    renderer.link = ({ href, text }) =>
      `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
    marked.setOptions({ renderer })

    const creditsHtml = computed(() =>
      DOMPurify.sanitize(marked.parse(creditsRaw), { ADD_ATTR: ['target', 'rel'] })
    )

    function openDonate() {
      window.open('https://paypal.me/JasonEdmeades', '_blank', 'noopener,noreferrer')
    }

    function openFeedback() {
      window.open('https://github.com/eddy0612/PlateUpTool/issues', '_blank', 'noopener,noreferrer')
    }

    watch(() => ({ ...state }), () => syncToHash(), { deep: true })

    onMounted(() => {
      loadFromHash()
      loadGridFromState()
      window.addEventListener('hashchange', () => {
        loadFromHash()
        loadGridFromState()
      })
      // Initialise any AdSense units rendered by Vue
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
    })

    function startAgain() {
      resetState()
      loadGridFromState()
    }

    return { startAgain, showHelp, showCredits, creditsHtml, openDonate, openFeedback, paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon, cellSize, state }
  }
}
</script>

<style>
* { box-sizing: border-box }
body { margin: 0; font-family: sans-serif; }
</style>

<style scoped>
.root { padding: 10px; display: flex; flex-direction: column; min-height: 100vh }
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px }
.top-bar h1 { margin: 0 }
.header-right { display: flex; align-items: center; gap: 6px; margin-right: 8px }
.reset-button {
  border: none; background: #d9534f; color: white; padding: 0.4rem 0.8rem;
  border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center;
  gap: 5px; font-size: 0.875rem; font-weight: 600;
}
.reset-button:hover { background: #c9302c }
.donate-button {
  border: none; background: #0070ba; color: white; padding: 0.4rem 0.8rem;
  border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center;
  gap: 5px; font-size: 0.875rem; font-weight: 600;
}
.donate-button:hover { background: #005ea6 }
.credits-button {
  border: none; background: #5f4b8b; color: white; padding: 0.4rem 0.8rem;
  border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center;
  gap: 5px; font-size: 0.875rem; font-weight: 600;
}
.credits-button:hover { background: #4e3d74 }
.feedback-button {
  border: none; background: #2d9436; color: white; padding: 0.4rem 0.8rem;
  border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center;
  gap: 5px; font-size: 0.875rem; font-weight: 600;
}
.feedback-button:hover { background: #237a2b }
.help-button {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2px solid #5b8fd9;
  background: #eef4ff;
  color: #2a5db0;
  font-size: 1rem;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
  flex-shrink: 0;
}
.help-button:hover { background: #d0e3ff; border-color: #2a5db0 }

/* Help modal */
.help-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 10000;
  display: flex; align-items: center; justify-content: center;
}
.help-modal {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.28);
  width: min(640px, 96vw);
  max-height: 88vh;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.help-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid #e0e4ec;
}
.help-modal-header h2 { margin: 0; font-size: 1.15rem; color: #1a2a4a }
.help-modal-close {
  border: none; background: none; font-size: 1.1rem; cursor: pointer; color: #666; padding: 2px 6px; border-radius: 4px;
}
.help-modal-close:hover { background: #f0f0f0; color: #333 }
.help-modal-body {
  overflow-y: auto;
  padding: 12px 18px 18px;
  display: flex; flex-direction: column; gap: 14px;
}
.help-modal-body section h3 {
  margin: 0 0 6px; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.07em;
  color: #5070a0; border-bottom: 1px solid #dce4f0; padding-bottom: 3px;
}
.help-modal-body dl { margin: 0; display: flex; flex-direction: column; gap: 4px }
.help-modal-body dl > div { display: flex; gap: 12px; align-items: baseline }
.help-modal-body dt {
  min-width: 220px; font-family: monospace; font-size: 0.88rem;
  background: #f4f6fb; border: 1px solid #d4daeb; border-radius: 4px;
  padding: 1px 6px; white-space: nowrap; flex-shrink: 0;
}
.help-modal-body dd { margin: 0; font-size: 0.9rem; color: #333 }
.credits-body { font-size: 0.92rem; color: #2d3748; line-height: 1.65 }
.credits-body :deep(h1) { font-size: 1.25rem; font-weight: 700; color: #1a2a4a; margin: 0 0 10px }
.credits-body :deep(h2) { font-size: 1rem; font-weight: 700; color: #1a2a4a; margin: 16px 0 4px; padding-bottom: 4px; border-bottom: 1px solid #dce4f0 }
.credits-body :deep(h3) { font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #5070a0; margin: 14px 0 4px; border-bottom: 1px solid #dce4f0; padding-bottom: 3px }
.credits-body :deep(p) { margin: 0 0 10px }
.credits-body :deep(ul) { margin: 0 0 10px; padding-left: 22px }
.credits-body :deep(li) { margin-bottom: 4px }
.credits-body :deep(a) { color: #2a5db0; text-decoration: none }
.credits-body :deep(a:hover) { color: #1a3d80; text-decoration: underline }
.credits-body :deep(code) { background: #f0f4fa; border: 1px solid #d4daeb; border-radius: 3px; padding: 1px 5px; font-size: 0.85em }
.credits-body :deep(blockquote) { margin: 0 0 10px; padding: 8px 14px; background: #f7f9fd; border-left: 3px solid #5b8fd9; color: #555 }
.palette-drag-ghost {
  position: fixed;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 9999;
  opacity: 0.85;
  border-radius: 4px;
  border: 2px solid #1f79ff;
  background: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.palette-drag-ghost img { max-width: 100%; max-height: 100%; display: block; }
.main-grid {
  display: flex;
  gap: 10px;
  padding-left: 90px;
  overflow: visible;
  align-items: flex-start;
}
</style>