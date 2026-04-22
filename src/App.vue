<template>
  <div class="root">
    <header class="top-bar">
      <div class="title-group">
        <h1>PlateUp Tool</h1>
        <span class="title-tagline">An online planner for your restaurant</span>
      </div>
      <div class="header-right">
        <button class="reset-button" @click="startAgain" title="Clear the grid and start over">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Start Again
        </button>
        <button class="tutorial-button" @click="showTutorial = true" title="Launch the tutorial">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
          </svg>
          Tutorial
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
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20 2H4C2.897 2 2 2.897 2 4v14c0 1.103 0.897 2 2 2h16c1.103 0 2-0.897 2-2V4c0-1.103-0.897-2-2-2zm0 16H4V4h16v14zm-2-7h-2v2h2v-2zm-4 0h-2v2h2v-2zm-4 0H8v2h2v-2z"/>
          </svg>
          Feedback
        </button>
        <button class="share-button" @click="copyUrl" title="Copy link to clipboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/>
          </svg>
          Share
        </button>
        <button class="help-button" @click="showHelp = true" title="Keyboard shortcuts &amp; controls">?</button>
      </div>
    </header>

    <TutorialModal v-if="showTutorial" @close="showTutorial = false" />

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
    <teleport to="body">
      <div v-if="showFeedbackModal" class="feedback-modal-backdrop" @click.self="showFeedbackModal = false">
        <div class="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title">
          <div class="feedback-modal-header">
            <h2 id="feedback-modal-title">Bugs &amp; Feedback</h2>
            <button class="feedback-modal-close" @click="showFeedbackModal = false" aria-label="Close">✕</button>
          </div>
          <p class="feedback-modal-subtitle">How would you like to get in touch?</p>
          <div class="feedback-modal-options">
            <button class="feedback-option feedback-option--github" @click="openGitHubIssues">
              <span class="feedback-option-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
              </span>
              <span class="feedback-option-text">
                <span class="feedback-option-title">GitHub Issues</span>
                <span class="feedback-option-desc">Report a bug or suggest a feature on GitHub</span>
              </span>
              <svg class="feedback-option-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
            <button class="feedback-option feedback-option--discord" @click="openDiscord">
              <span class="feedback-option-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </span>
              <span class="feedback-option-text">
                <span class="feedback-option-title">Discord Server</span>
                <span class="feedback-option-desc">Chat with the community on Discord</span>
              </span>
              <svg class="feedback-option-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <div class="main-grid">
      <GridView />
      <AppliancePalette />
    </div>
    <transition name="toast">
      <div v-if="showCopiedToast" class="copied-toast">Link copied to clipboard</div>
    </transition>
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
import TutorialModal, { hasTutorialBeenSeen } from './components/TutorialModal.vue'

export default {
  name: 'App',
  components: { GridView, AppliancePalette, TutorialModal },
  setup() {
    const { state, loadFromHash, syncToHash, resetState } = useRestaurantStore()
    const { loadGridFromState, paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon, cellSize } = useGrid()

    const showHelp = ref(false)
    const showCredits = ref(false)
    const showTutorial = ref(false)
    const showCopiedToast = ref(false)
    const showFeedbackModal = ref(false)

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
      showFeedbackModal.value = true
    }

    function openGitHubIssues() {
      window.open('https://github.com/eddy0612/PlateUpTool/issues', '_blank', 'noopener,noreferrer')
      showFeedbackModal.value = false
    }

    function openDiscord() {
      window.open('https://discord.gg/KyQ26Z3Qxa', '_blank', 'noopener,noreferrer')
      showFeedbackModal.value = false
    }

    function copyUrl() {
      navigator.clipboard.writeText(window.location.href)
      showCopiedToast.value = true
      setTimeout(() => { showCopiedToast.value = false }, 2500)
    }

    watch(() => ({ ...state }), () => syncToHash(), { deep: true })

    onMounted(() => {
      loadFromHash()
      loadGridFromState()
      if (!hasTutorialBeenSeen()) showTutorial.value = true
      window.addEventListener('hashchange', () => {
        loadFromHash()
        loadGridFromState()
      })
    })

    function startAgain() {
      resetState()
      loadGridFromState()
    }

    return { startAgain, showHelp, showCredits, showTutorial, showCopiedToast, creditsHtml, openDonate, openFeedback, openGitHubIssues, openDiscord, showFeedbackModal, copyUrl, paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon, cellSize, state }
  }
}
</script>

<style>
* { box-sizing: border-box }
html, body { margin: 0; font-family: sans-serif; overflow: hidden; height: 100%; }
</style>

<style scoped>
.root { padding: 10px; display: flex; flex-direction: column; min-height: 100vh }
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px }
.title-group { display: flex; align-items: baseline; gap: 10px }
.top-bar h1 { margin: 0 }
.title-tagline { font-size: 1.1rem; color: #aaa; font-style: italic; white-space: nowrap }
.header-right { display: flex; align-items: center; gap: 6px; margin-right: 8px }
.tutorial-button {
  border: none; background: #e07b20; color: white; padding: 0.4rem 0.8rem;
  border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center;
  gap: 5px; font-size: 0.875rem; font-weight: 600;
}
.tutorial-button:hover { background: #c46a14 }
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

/* Feedback modal */
.feedback-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}
.feedback-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.28);
  width: 420px;
  max-width: calc(100vw - 32px);
  padding: 28px 28px 24px;
  font-family: sans-serif;
}
.feedback-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px;
}
.feedback-modal-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1a2e;
}
.feedback-modal-close {
  background: none; border: none; cursor: pointer;
  color: #888; font-size: 1rem; line-height: 1;
  padding: 4px 6px; border-radius: 4px;
}
.feedback-modal-close:hover { background: #f0f0f0; color: #333 }
.feedback-modal-subtitle {
  margin: 0 0 20px;
  color: #666;
  font-size: 0.875rem;
}
.feedback-modal-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.feedback-option {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  text-align: left;
  background: #f8f9fa;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  width: 100%;
}
.feedback-option:hover { transform: translateY(-1px); }
.feedback-option:active { transform: translateY(0); }
.feedback-option--github { color: #24292e; }
.feedback-option--github:hover { background: #f0f6ff; border-color: #24292e; }
.feedback-option--discord { color: #5865F2; }
.feedback-option--discord:hover { background: #f0f1ff; border-color: #5865F2; }
.feedback-option--discord:disabled { opacity: 0.45; cursor: not-allowed; transform: none; background: initial; border-color: #ddd; }
.feedback-option-icon {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  width: 44px; height: 44px;
  border-radius: 10px;
}
.feedback-option--github .feedback-option-icon { background: #e8eaed; color: #24292e; }
.feedback-option--discord .feedback-option-icon { background: #e8e9fd; color: #5865F2; }
.feedback-option-badge { font-size: 0.65rem; font-weight: 600; background: #e0e0e0; color: #666; border-radius: 4px; padding: 1px 5px; vertical-align: middle; margin-left: 5px; text-transform: uppercase; letter-spacing: 0.03em; }
.feedback-option-text {
  display: flex; flex-direction: column; gap: 2px; flex: 1;
}
.feedback-option-title {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
}
.feedback-option-desc {
  font-size: 0.8rem;
  opacity: 0.65;
  line-height: 1.3;
}
.feedback-option-arrow {
  flex-shrink: 0;
  opacity: 0.4;
}
.copied-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #1a1a2e;
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  z-index: 99999;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.3s, transform 0.3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }
.toast-enter-to, .toast-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
.share-button {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #5b8fd9;
  background: #eef4ff;
  color: #2a5db0;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}
.share-button:hover { background: #d0e3ff; border-color: #2a5db0 }
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