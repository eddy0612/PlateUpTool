<template>
  <teleport to="body">
    <div class="tutorial-backdrop" @click.self="skip">
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

// Dummy pages – replace gif paths and copy when real assets are ready
const pages = [
  {
    title: 'Welcome to PlateUp Tool',
    body: 'This tool lets you design and plan your PlateUp restaurant layout. Drag appliances from the palette on the right onto the grid to build your kitchen.',
    gif: 'https://placehold.co/480x270/1a2a4a/ffffff?text=Tutorial+Page+1',
    gifAlt: 'Animated overview of the tool'
  },
  {
    title: 'Using the Grid',
    body: 'Click a cell to select it, drag to move appliances, and use Ctrl+C / Ctrl+V to copy and paste. You can also right-click a selection to rotate it.',
    gif: 'https://placehold.co/480x270/2d5a27/ffffff?text=Tutorial+Page+2',
    gifAlt: 'Animated demonstration of grid editing'
  },
  {
    title: 'Tabs & Sharing',
    body: 'Use tabs at the top of the grid to organise your layout into layers. When you are happy with your design, copy the URL to share it with friends.',
    gif: 'https://placehold.co/480x270/4a1a2a/ffffff?text=Tutorial+Page+3',
    gifAlt: 'Animated demonstration of tabs and sharing'
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
