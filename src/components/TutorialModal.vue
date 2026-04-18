<template>
  <teleport to="body">
    <div class="tutorial-backdrop">
      <div class="tutorial-modal">
        <!-- Header -->
        <div class="tutorial-header">
          <h2>PlateUp Tool – Tutorial</h2>
          <button class="tutorial-skip" @click="skip" title="Skip tutorial">Skip</button>
        </div>

        <!-- Body -->
        <div class="tutorial-body">
          <div class="tutorial-gif-area">
            <img :src="currentPage.gif" :alt="currentPage.gifAlt" class="tutorial-gif" />
          </div>
          <div class="tutorial-text">
            <h3>{{ currentPage.title }}</h3>
            <p>{{ currentPage.body }}</p>
          </div>
        </div>

        <!-- Footer: dots + navigation -->
        <div class="tutorial-footer">
          <div class="tutorial-dots">
            <span
              v-for="(page, i) in pages"
              :key="i"
              class="tutorial-dot"
              :class="{ active: i === currentIndex }"
              @click="currentIndex = i"
            ></span>
          </div>
          <div class="tutorial-nav">
            <button
              class="tutorial-nav-btn secondary"
              :disabled="currentIndex === 0"
              @click="prev"
            >Back</button>
            <button
              v-if="currentIndex < pages.length - 1"
              class="tutorial-nav-btn primary"
              @click="next"
            >Next</button>
            <button
              v-else
              class="tutorial-nav-btn primary"
              @click="finish"
            >Done</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { ref, computed } from 'vue'

const STORAGE_KEY = 'plateuptool_tutorial_seen'

export function hasTutorialBeenSeen() {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function markTutorialSeen() {
  localStorage.setItem(STORAGE_KEY, 'true')
}

// Pages – gif paths point to src/public/res/tutorial/ (falls back to placeholder if file missing)
function gifUrl(filename) {
  return import.meta.env.BASE_URL + 'res/tutorial/' + filename
}

const pages = [
  {
    title: 'Welcome to PlateUp Tool',
    body: 'PlateUp Tool is a layout planner for PlateUp! Drag appliances from the palette on the right onto the grid to start designing your restaurant. Your design is saved automatically in the URL — no account needed.',
    gif: gifUrl('page1.gif'),
    gifAlt: 'Overview of the PlateUp Tool interface'
  },
  {
    title: 'Moving Items Around the Grid',
    body: 'Click any cell to select it, then drag it to a new position. Right-click a selected item to rotate it 90° clockwise, or hold Shift while right-clicking to rotate counter-clockwise.',
    gif: gifUrl('page2.gif'),
    gifAlt: 'Dragging and rotating items on the grid'
  },
  {
    title: 'Selecting Multiple Items',
    body: 'Hold Shift or Ctrl and drag across the grid to box-select multiple items at once. Ctrl+Click toggles individual cells in or out of the selection, and Ctrl+A selects everything on the current tab.',
    gif: gifUrl('page3.gif'),
    gifAlt: 'Selecting multiple grid cells'
  },
  {
    title: 'Working with Selections',
    body: 'Right-click any cell within a selection to rotate the whole group around that pivot — Shift+Right-click rotates the other way. You can also cut (Ctrl+X), copy (Ctrl+C), paste (Ctrl+V) or duplicate (Ctrl+D) the entire selection.',
    gif: gifUrl('page4.gif'),
    gifAlt: 'Rotating and copying a selection'
  },
  {
    title: 'Adding Walls, Hatches and Doors',
    body: 'Switch to the Structure tab to define the shape of your restaurant. Select a tool from the palette, then left-click any cell edge to apply it. Right-click an edge to clear it.',
    gif: gifUrl('page5.gif'),
    gifAlt: 'Adding walls and doors in Structure mode'
  },
  {
    title: 'Organising with Tabs',
    body: 'Add extra tabs to separate different areas of your restaurant — for example, Pizza, Pies and Soups. Selected cells can be moved to another tab or set to appear on multiple tabs at the same time.',
    gif: gifUrl('page6.gif'),
    gifAlt: 'Using tabs to organise the layout'
  },
  {
    title: 'Previewing Your Design',
    body: 'Click the Preview tab to see a fully rendered view of your complete layout, along with a full inventory of every appliance placed across all tabs.',
    gif: gifUrl('page7.gif'),
    gifAlt: 'Preview tab showing the finished layout'
  },
  {
    title: 'Sharing Your Design',
    body: 'Your entire design — every appliance, wall and tab — is encoded directly in the page URL. Copy the address from your browser and share it with friends; they will see exactly what you see.',
    gif: gifUrl('page8.gif'),
    gifAlt: 'Copying the URL to share a design'
  },
  {
    title: 'Keyboard Shortcuts',
    body: 'A full list of keyboard shortcuts and controls is available at any time. Click the ? button in the top-right corner of the screen to open the Controls & Shortcuts reference.',
    gif: gifUrl('page9.gif'),
    gifAlt: 'The keyboard shortcuts reference panel'
  },
  {
    title: 'Advanced: Blueprints & Import / Export',
    body: 'Blueprints let you save a group of items as a reusable block. Select the cells you want, save them as a blueprint, and it will appear in the palette just like any appliance. You can also export or import the full restaurant structure, the entire design, or an individual blueprint to back up or share your work.',
    gif: gifUrl('page10.gif'),
    gifAlt: 'Creating and using blueprints'
  }
]

export default {
  name: 'TutorialModal',
  emits: ['close'],
  setup(_, { emit }) {
    const currentIndex = ref(0)
    const currentPage = computed(() => pages[currentIndex.value])

    function next() {
      if (currentIndex.value < pages.length - 1) currentIndex.value++
    }
    function prev() {
      if (currentIndex.value > 0) currentIndex.value--
    }
    function finish() {
      markTutorialSeen()
      emit('close')
    }
    function skip() {
      markTutorialSeen()
      emit('close')
    }

    return { pages, currentIndex, currentPage, next, prev, finish, skip }
  }
}
</script>

<style scoped>
.tutorial-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tutorial-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.35);
  width: 50vw;
  height: 50vh;
  min-width: 400px;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────── */
.tutorial-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid #e0e4ec;
  flex-shrink: 0;
}
.tutorial-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #1a2a4a;
}
.tutorial-skip {
  border: none;
  background: none;
  font-size: 0.85rem;
  color: #888;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  text-decoration: underline;
}
.tutorial-skip:hover { color: #333 }

/* ── Body ────────────────────────────────────────── */
.tutorial-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 20px 8px;
  gap: 12px;
  overflow: hidden;
}
.tutorial-gif-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;
}
.tutorial-gif {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid #e0e4ec;
}
.tutorial-text {
  width: 100%;
  flex-shrink: 0;
}
.tutorial-text h3 {
  margin: 0 0 4px;
  font-size: 1rem;
  color: #1a2a4a;
}
.tutorial-text p {
  margin: 0;
  font-size: 0.88rem;
  color: #444;
  line-height: 1.5;
}

/* ── Footer ──────────────────────────────────────── */
.tutorial-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px 14px;
  border-top: 1px solid #e0e4ec;
  flex-shrink: 0;
}
.tutorial-dots {
  display: flex;
  gap: 8px;
  align-items: center;
}
.tutorial-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #c8d4e8;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.tutorial-dot.active {
  background: #2a5db0;
  transform: scale(1.25);
}
.tutorial-nav {
  display: flex;
  gap: 8px;
}
.tutorial-nav-btn {
  padding: 0.38rem 1rem;
  border-radius: 5px;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.tutorial-nav-btn.primary {
  background: #2a5db0;
  color: #fff;
}
.tutorial-nav-btn.primary:hover { background: #1a3d80 }
.tutorial-nav-btn.secondary {
  background: #e8edf5;
  color: #2a5db0;
}
.tutorial-nav-btn.secondary:hover { background: #d0daea }
.tutorial-nav-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
