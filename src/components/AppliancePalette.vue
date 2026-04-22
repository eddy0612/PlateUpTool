<template>
  <aside class="right-panel" :style="rightPanelStyle" @contextmenu.prevent>

    <!-- Hidden file inputs for PNG import -->
    <input ref="blueprintImportInput" type="file" accept="image/png" style="display:none" @change="handleBlueprintImport" />
    <input ref="unifiedImportInput" type="file" accept="image/png" style="display:none" @change="handleUnifiedImport" />

    <!-- Inventory panel shown when Preview tab is active -->
    <template v-if="isPreviewTab">
      <div class="preview-wrapper" :style="{ height: viewportBoxHeight + 'px' }">
        <div class="preview-info-banner">
          <span class="preview-info-icon">👁</span>
          <span>Preview mode — to make changes, select a coloured tab on the left.</span>
        </div>
        <div class="inventory-panel">
        <div class="inventory-header">
          <span class="inventory-title">Inventory</span>
          <span class="inventory-total-badge">{{ inventoryTotal }} items</span>
        </div>
        <div class="inventory-list">
          <div v-for="item in inventoryList" :key="item.id" class="inventory-row">
            <div class="inventory-icon">
              <img v-if="isImageIcon(item.icon)" :src="item.icon" :alt="item.label" />
              <span v-else class="inventory-icon-emoji">{{ item.icon }}</span>
            </div>
            <span class="inventory-count-badge">{{ item.count }}</span>
            <span class="inventory-multiply">×</span>
            <span class="inventory-name">{{ item.label }}</span>
          </div>
          <div v-if="inventoryList.length === 0" class="inventory-empty">
            No appliances placed yet
          </div>
        </div>
      </div>
      </div>
    </template>

    <!-- Normal / Structure panel -->
    <template v-else>
      <div class="side-panel-wrapper" :style="{ height: viewportBoxHeight + 'px' }">
      <div class="side-box">

        <!-- Structure mode: tool selector -->
        <template v-if="isStructureMode">
          <div class="structure-header">Draw structure</div>
          <div class="structure-tool-list">
            <div
              v-for="tool in structureTools"
              :key="tool.id"
              :class="['structure-tool-item', { active: selectedStructureTool === tool.id }]"
              @click="setStructureTool(tool.id)"
            >
              <div :class="['tool-swatch', `swatch-${tool.id}`]"></div>
              <div class="tool-info">
                <div class="tool-name">{{ tool.label }}</div>
                <div class="tool-desc">{{ tool.description }}</div>
              </div>
            </div>
          </div>
          <div class="structure-hint">Click near a cell edge to place or remove.</div>
        </template>

        <!-- Normal mode: tabbed panel (Appliances | Blueprints) -->
        <template v-else>
          <!-- Tab bar -->
          <div class="palette-tabs">
            <button
              :class="['palette-tab', { active: paletteTab === 'appliances' }]"
              @click="paletteTab = 'appliances'"
            >Appliances</button>
            <button
              :class="['palette-tab', { active: paletteTab === 'blueprints' }]"
              @click="paletteTab = 'blueprints'"
            >Blueprints</button>
          </div>

          <!-- Appliances tab -->
          <template v-if="paletteTab === 'appliances'">
            <div class="filter">
              <input v-model="state.filterText" placeholder="Filter appliances..." />
            </div>
            <div class="palette" :style="paletteGridStyle">
              <div
                v-for="item in filteredPalette"
                :key="item.id"
                class="palette-item"
                @click="onPaletteItemClick(item)"
                @mousedown="onPaletteItemMouseDown(item, $event)"
              >
                <div class="item-icon">
                  <canvas :data-icon="item.icon" class="palette-canvas"></canvas>
                </div>
                <div>{{ item.label }}</div>
              </div>
            </div>
          </template>

          <!-- Blueprints tab -->
          <template v-else>
            <div class="filter">
              <input v-model="blueprintFilter" placeholder="Filter blueprints..." />
            </div>
            <button class="bp-import-btn" @click="triggerBlueprintImport" title="Import a blueprint from a PNG file">⬆ Import Blueprint</button>
            <div class="palette" :style="paletteGridStyle">

              <!-- "+" new blueprint button -->
              <div
                class="palette-item blueprint-add-item"
                title="Create blueprint from selection"
                @click="createBlueprint"
              >
                <div class="item-icon blueprint-plus-icon">
                  <span class="blueprint-plus">+</span>
                </div>
                <div>New</div>
              </div>

              <!-- Saved blueprints -->
              <div
                v-for="bp in filteredBlueprints"
                :key="bp.id"
                class="palette-item blueprint-item"
                :title="bp.name + '\n(right-click to delete)'"
                @click="applyBlueprint(bp)"
                @mousedown="onBlueprintMouseDown(bp, $event)"
                @dragstart.prevent
                @contextmenu.prevent="deleteBlueprint(bp)"
              >
                <div class="item-icon" style="position:relative">
                  <img
                    v-if="bp.preview"
                    :src="bp.preview"
                    :alt="bp.name"
                    class="blueprint-preview-img"
                    draggable="false"
                  />
                  <span v-else class="blueprint-placeholder">📋</span>
                  <button class="bp-export-btn" @click.stop="exportBlueprint(bp)" title="Export blueprint as PNG">⬇</button>
                </div>
                <div class="blueprint-name">{{ bp.name }}</div>
              </div>

            </div>
          </template>
        </template>

      </div>

      <div class="side-controls">
        <div v-if="!isStructureMode" class="clipboard-row">
          <button @click="cutToClipboard">Cut</button>
          <button @click="copyToClipboard">Copy</button>
          <button @click="startPaste">Paste</button>
          <button @click="removeSelected">Delete</button>
        </div>
        <div class="io-row">
          <button @click="showExportMenu($event)" title="Export to PNG">Export</button>
          <button @click="triggerUnifiedImport" title="Import from a PNG file">Import</button>
        </div>
      </div>
      </div>
    </template>

    <teleport to="body">
      <template v-if="exportMenuVisible">
        <div class="context-menu-backdrop" @click="closeExportMenu" @contextmenu.prevent="closeExportMenu" />
        <div class="context-menu" :style="{ left: exportMenuPos.x + 'px', bottom: exportMenuPos.bottom + 'px' }">
          <div class="context-menu-item" @click="doExport('tab')">{{ state.activeTabId === 'structure' ? 'Structure only' : 'Current tab' }}</div>
          <div class="context-menu-item" @click="doExport('all-tabs')">All appliance tabs</div>
          <div class="context-menu-item" @click="doExport('complete')">Complete</div>
          <div class="context-menu-item context-menu-cancel" @click="closeExportMenu">Cancel</div>
        </div>
      </template>
    </teleport>

  </aside>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRestaurantStore, decodeState } from '../store/restaurant'
import { useAppliancePalette } from '../composables/useAppliancePalette'
import { useGrid } from '../composables/useGrid'
import { readPngText, writePngText, dataUrlToBytes, bytesToDataUrl, downloadDataUrl, readFileAsBytes } from '../composables/usePngMetadata'

const LS_BLUEPRINTS_KEY = 'plateup-blueprints'

function loadBlueprintsFromStorage() {
  try {
    const raw = localStorage.getItem(LS_BLUEPRINTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export default {
  name: 'AppliancePalette',
  setup() {
    const { state } = useRestaurantStore()
    const { palette } = useAppliancePalette()
    const { addToGrid, viewportBoxHeight, removeSelected, selectedCells, copyToClipboard, cutToClipboard, startPaste, startPasteFromCells, setPasteAnchor, confirmPaste, cancelPaste, isStructureMode, selectedStructureTool, setStructureTool, flatGrid, isImageIcon, isCellGhosted, grid, startPaletteDrag, updatePaletteDrag, commitPaletteDrag, loadGridFromState } = useGrid()

    const structureTools = [
      { id: 'wall',  label: 'Wall',  description: 'Full-height wall',  },
      { id: 'hatch', label: 'Hatch', description: 'Half-height wall',  },
      { id: 'door',  label: 'Door',  description: 'Doorway / opening', },
    ]

    const isPreviewTab = computed(() => state.activeTabId === 'complete')

    const filteredPalette = computed(() => {
      const q = state.filterText.trim().toLowerCase()
      const items = q
        ? palette.value.filter(item => item.label.toLowerCase().includes(q))
        : palette.value.slice()
      return items.slice().sort((a, b) => a.label.localeCompare(b.label))
    })

    const inventoryList = computed(() => {
      const counts = {}
      for (const { cell } of flatGrid.value) {
        if (cell?.applianceId) {
          counts[cell.applianceId] = (counts[cell.applianceId] || 0) + 1
        }
      }
      return Object.entries(counts)
        .map(([id, count]) => {
          const p = palette.value.find(a => a.id === Number(id))
          return { id, count, label: p?.label || id, icon: p?.icon || '' }
        })
        .sort((a, b) => b.count - a.count)
    })

    const inventoryTotal = computed(() => inventoryList.value.reduce((s, i) => s + i.count, 0))

    // Canvas image drawing with top-crop
    function cropAndDrawImage(canvas, src) {
      if (!canvas || !src) return
      const ctx = canvas.getContext('2d')
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = function () {
        const cropTop = 50
        const sx = 0, sy = cropTop, sw = img.width, sh = Math.max(img.height - cropTop, 1)
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width || 100
        canvas.height = rect.height || 100
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const croppedAspect = sw / sh
        const canvasAspect = canvas.width / canvas.height
        let dw, dh, dx, dy
        if (croppedAspect > canvasAspect) {
          dw = canvas.width; dh = canvas.width / croppedAspect; dx = 0; dy = (canvas.height - dh) / 2
        } else {
          dh = canvas.height; dw = canvas.height * croppedAspect; dx = (canvas.width - dw) / 2; dy = 0
        }
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
      }
      img.src = src
    }

    async function redrawPaletteCanvases() {
      await nextTick()
      document.querySelectorAll('.palette-item canvas').forEach(canvas => {
        cropAndDrawImage(canvas, canvas.dataset.icon)
      })
    }

    watch(filteredPalette, redrawPaletteCanvases, { immediate: true })

    watch(isStructureMode, (val) => {
      if (!val) redrawPaletteCanvases()
    })

    watch(isPreviewTab, (val) => {
      if (!val) redrawPaletteCanvases()
    })

    function addAllToGrid() {
      for (const item of palette.value) {
        addToGrid(item)
      }
    }

    // Responsive palette columns: ~30% of screen width, snapping 1-3 cols, icon size fixed at 120px
    const ICON_SIZE = 120
    const ICON_GAP = 8
    const SIDE_BOX_INSET = 22 + 15  // 10px padding + 1px border each side = 22, +15 for scrollbar-gutter

    const windowWidth = ref(window.innerWidth)
    function onWindowResize() { windowWidth.value = window.innerWidth }
    onMounted(() => window.addEventListener('resize', onWindowResize))
    onUnmounted(() => window.removeEventListener('resize', onWindowResize))

    const paletteColumns = computed(() => {
      const available = windowWidth.value * 0.20
      return Math.max(1, Math.min(3, Math.floor(available / (ICON_SIZE + ICON_GAP))))
    })

    const rightPanelStyle = computed(() => {
      const cols = paletteColumns.value
      const w = cols * ICON_SIZE + (cols - 1) * ICON_GAP + SIDE_BOX_INSET
      return { flex: `0 0 ${w}px`, width: `${w}px`, maxWidth: 'none', minWidth: '0' }
    })

    const paletteGridStyle = computed(() => ({
      gridTemplateColumns: `repeat(${paletteColumns.value}, ${ICON_SIZE}px)`
    }))

    const suppressNextClick = ref(false)

    function onPaletteItemClick(item) {
      if (suppressNextClick.value) { suppressNextClick.value = false; return }
      addToGrid(item)
    }

    function onPaletteItemMouseDown(item, e) {
      if (e.button !== 0) return
      if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
      const startX = e.clientX, startY = e.clientY
      let dragStarted = false

      function onMove(e) {
        if (!dragStarted) {
          const dx = e.clientX - startX
          const dy = e.clientY - startY
          if (Math.sqrt(dx * dx + dy * dy) > 5) {
            dragStarted = true
            startPaletteDrag(item)
          }
        }
        if (dragStarted) updatePaletteDrag(e.clientX, e.clientY)
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        if (dragStarted) {
          suppressNextClick.value = true
          commitPaletteDrag()
        }
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }

    // ── Blueprints ───────────────────────────────────────────────────────────
    const paletteTab = ref('appliances')
    watch(paletteTab, (val) => { if (val === 'appliances') redrawPaletteCanvases() })
    const blueprintFilter = ref('')
    const blueprints = ref(loadBlueprintsFromStorage())

    function saveBlueprintsToStorage() {
      try { localStorage.setItem(LS_BLUEPRINTS_KEY, JSON.stringify(blueprints.value)) } catch {}
    }

    const filteredBlueprints = computed(() => {
      const q = blueprintFilter.value.trim().toLowerCase()
      if (!q) return blueprints.value
      return blueprints.value.filter(bp => bp.name.toLowerCase().includes(q))
    })

    // Generate a small thumbnail image for a set of blueprint cells.
    async function generateBlueprintPreview(cells, cellPx = 40) {
      if (!cells.length) return null
      const maxDx = Math.max(...cells.map(c => c.dx))
      const maxDy = Math.max(...cells.map(c => c.dy))
      const CELL_PX = cellPx
      const PAD = 3
      const canvasW = (maxDx + 1) * CELL_PX + PAD * 2
      const canvasH = (maxDy + 1) * CELL_PX + PAD * 2

      const offscreen = document.createElement('canvas')
      offscreen.width  = canvasW
      offscreen.height = canvasH
      const ctx = offscreen.getContext('2d')
      // Use a light blue 'blueprint' background for blueprint previews and exports
      ctx.fillStyle = '#cce7ff'
      ctx.fillRect(0, 0, canvasW, canvasH)

      await Promise.all(cells.map(({ dx, dy, cell }) => new Promise(resolve => {
        const entry = palette.value.find(a => a.id === cell.applianceId)
        const iconSrc = entry?.icon2D || entry?.icon
        const cx = PAD + dx * CELL_PX
        const cy = PAD + dy * CELL_PX

        if (!iconSrc || !isImageIcon(iconSrc)) {
          ctx.fillStyle = '#dde3ea'
          ctx.fillRect(cx + 1, cy + 1, CELL_PX - 2, CELL_PX - 2)
          ctx.fillStyle = '#555'
          ctx.font = `${Math.floor(CELL_PX * 0.45)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText((entry?.label || '?').slice(0, 2), cx + CELL_PX / 2, cy + CELL_PX / 2)
          return resolve()
        }

        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const cropTop = 50
          const sx = 0, sy = cropTop, sw = img.width, sh = Math.max(img.height - cropTop, 1)
          const rot = cell.rotation || 0
          ctx.save()
          if (rot > 0) {
            ctx.translate(cx + CELL_PX / 2, cy + CELL_PX / 2)
            ctx.rotate(rot * Math.PI / 2)
            ctx.drawImage(img, sx, sy, sw, sh, -CELL_PX / 2, -CELL_PX / 2, CELL_PX, CELL_PX)
          } else {
            ctx.drawImage(img, sx, sy, sw, sh, cx, cy, CELL_PX, CELL_PX)
          }
          ctx.restore()
          resolve()
        }
        img.onerror = () => resolve()
        img.src = iconSrc
      })))

      return offscreen.toDataURL('image/png')
    }

    async function createBlueprint() {
      if (selectedCells.value.size === 0) {
        alert('Select some appliances on the grid first, then click New.')
        return
      }

      // Collect non-ghosted selected cells with appliances
      let minX = Infinity, minY = Infinity
      const valid = []
      for (const key of selectedCells.value) {
        const [x, y] = key.split(',').map(Number)
        if (!isCellGhosted(x, y)) {
          const cell = grid.value[y]?.[x]
          if (cell?.applianceId) {
            if (x < minX) minX = x
            if (y < minY) minY = y
            valid.push({ x, y, cell })
          }
        }
      }

      if (valid.length === 0) {
        alert('No visible appliances are selected. Select appliances on the current tab first.')
        return
      }

      const name = window.prompt('Blueprint name:', 'My Blueprint')
      if (name === null) return
      const trimmedName = name.trim() || 'Blueprint'

      const cells = valid.map(({ x, y, cell }) => ({
        dx: x - minX,
        dy: y - minY,
        cell: { ...cell }
      }))

      const preview = await generateBlueprintPreview(cells)

      blueprints.value.push({
        id: Date.now().toString(),
        name: trimmedName,
        preview,
        cells
      })
      saveBlueprintsToStorage()
    }

    function applyBlueprint(bp) {
      if (suppressNextBlueprintClick.value) { suppressNextBlueprintClick.value = false; return }
      startPasteFromCells(bp.cells)
    }

    const suppressNextBlueprintClick = ref(false)

    function onBlueprintMouseDown(bp, e) {
      if (e.button !== 0) return
      if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
      const startX = e.clientX, startY = e.clientY
      let dragStarted = false

      function getCellFromPoint(clientX, clientY) {
        const el = document.elementFromPoint(clientX, clientY)?.closest?.('.grid-item')
        if (el && el.dataset.x !== undefined) return { x: parseInt(el.dataset.x), y: parseInt(el.dataset.y) }
        return null
      }

      function onMove(e) {
        if (!dragStarted) {
          const dx = e.clientX - startX
          const dy = e.clientY - startY
          if (Math.sqrt(dx * dx + dy * dy) > 5) {
            dragStarted = true
            suppressNextBlueprintClick.value = true
            startPasteFromCells(bp.cells)
          }
        }
        if (dragStarted) {
          const cell = getCellFromPoint(e.clientX, e.clientY)
          if (cell) setPasteAnchor(cell.x, cell.y)
        }
      }

      function onUp(e) {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        if (dragStarted) {
          const cell = getCellFromPoint(e.clientX, e.clientY)
          if (cell) { setPasteAnchor(cell.x, cell.y); confirmPaste() }
          else cancelPaste()
        }
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }

    function deleteBlueprint(bp) {
      if (!window.confirm(`Delete blueprint "${bp.name}"?`)) return
      blueprints.value = blueprints.value.filter(b => b.id !== bp.id)
      saveBlueprintsToStorage()
    }

    // ── Blueprint export / import ────────────────────────────────────────────
    const blueprintImportInput = ref(null)
    function triggerBlueprintImport() { blueprintImportInput.value?.click() }

    async function exportBlueprint(bp) {
      // Always generate a fresh high-res image for the exported PNG (not from localStorage)
      const exportPreview = await generateBlueprintPreview(bp.cells, 100)
      if (!exportPreview) { alert('Could not generate preview image.'); return }
      const json = JSON.stringify({ name: bp.name, cells: bp.cells })
      const payload = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
      const bytes = dataUrlToBytes(exportPreview)
      const modified = writePngText(bytes, 'plateup-blueprint', payload)
      const safeName = bp.name.replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || 'blueprint'
      downloadDataUrl(bytesToDataUrl(modified), `plateup-blueprint-${safeName}-${exportTimestamp()}.png`)
    }

    async function handleBlueprintImport(event) {
      const file = event.target.files?.[0]
      if (!file) return
      event.target.value = ''
      try {
        const bytes = await readFileAsBytes(file)
        const raw = readPngText(bytes, 'plateup-blueprint')
        if (!raw) {
          if (readPngText(bytes, 'plateup-design')) alert('This is a design file — use \u2b06 Import Design to load it.')
          else if (readPngText(bytes, 'plateup-structure')) alert('This is a structure file — use \u2b06 Import Structure to load it.')
          else alert('No blueprint data found in this image.')
          return
        }
        const json = new TextDecoder().decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0)))
        const { name, cells } = JSON.parse(json)
        if (!name || !Array.isArray(cells) || cells.length === 0) { alert('Invalid blueprint data.'); return }
        blueprints.value.push({ id: Date.now().toString(), name, preview: bytesToDataUrl(bytes), cells })
        saveBlueprintsToStorage()
        paletteTab.value = 'blueprints'
      } catch (e) {
        alert('Failed to read blueprint: ' + e.message)
      }
    }

    // ── Unified export / import ───────────────────────────────────────────────

    function exportTimestamp() {
      const d = new Date()
      const yy = String(d.getFullYear()).slice(-2)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      return `${yy}${mm}${dd}-${hh}${min}${ss}`
    }

    function encodePayload(obj) {
      return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
    }

    function decodePayload(raw) {
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0))))
    }

    // Generate a preview canvas with optional tab filter (null = all tabs) and optional walls overlay
    async function generateGridPreview(tabId, includeWalls) {
      const CELL_PX = 42
      const PAD = 6
      const canvasW = state.roomWidth * CELL_PX + PAD * 2
      const canvasH = state.roomHeight * CELL_PX + PAD * 2
      const offscreen = document.createElement('canvas')
      offscreen.width = canvasW
      offscreen.height = canvasH
      const ctx = offscreen.getContext('2d')
      ctx.fillStyle = includeWalls ? '#f8f9fb' : '#e8eef8'
      ctx.fillRect(0, 0, canvasW, canvasH)
      ctx.strokeStyle = includeWalls ? '#d0d8e8' : '#c8d4e4'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= state.roomWidth; x++) {
        ctx.beginPath(); ctx.moveTo(PAD + x * CELL_PX, PAD); ctx.lineTo(PAD + x * CELL_PX, PAD + state.roomHeight * CELL_PX); ctx.stroke()
      }
      for (let y = 0; y <= state.roomHeight; y++) {
        ctx.beginPath(); ctx.moveTo(PAD, PAD + y * CELL_PX); ctx.lineTo(PAD + state.roomWidth * CELL_PX, PAD + y * CELL_PX); ctx.stroke()
      }
      if (includeWalls) {
        for (const [key, type] of Object.entries(state.walls || {})) {
          const [orient, xStr, yStr] = key.split(',')
          const wx = parseInt(xStr), wy = parseInt(yStr)
          if (type === 'wall')       { ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3; ctx.setLineDash([]) }
          else if (type === 'hatch') { ctx.strokeStyle = '#555555'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]) }
          else if (type === 'door')  { ctx.strokeStyle = '#c8860a'; ctx.lineWidth = 3; ctx.setLineDash([]) }
          ctx.beginPath()
          if (orient === 'h') {
            ctx.moveTo(PAD + wx * CELL_PX, PAD + wy * CELL_PX)
            ctx.lineTo(PAD + (wx + 1) * CELL_PX, PAD + wy * CELL_PX)
          } else {
            ctx.moveTo(PAD + wx * CELL_PX, PAD + wy * CELL_PX)
            ctx.lineTo(PAD + wx * CELL_PX, PAD + (wy + 1) * CELL_PX)
          }
          ctx.stroke()
        }
        ctx.setLineDash([])
        ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3
        ctx.strokeRect(PAD, PAD, state.roomWidth * CELL_PX, state.roomHeight * CELL_PX)
      }
      const cells = []
      for (let y = 0; y < grid.value.length; y++) {
        for (let x = 0; x < (grid.value[y]?.length ?? 0); x++) {
          const cell = grid.value[y][x]
          if (!cell?.applianceId) continue
          if (tabId !== null) {
            const inTab = Array.isArray(cell.tabIds) ? cell.tabIds.includes(tabId) : cell.tabId === tabId
            if (!inTab) continue
          }
          cells.push({ x, y, cell })
        }
      }
      await Promise.all(cells.map(({ x, y, cell }) => new Promise(resolve => {
        const entry = palette.value.find(a => a.id === cell.applianceId)
        const iconSrc = entry?.icon2D || entry?.icon
        const cx = PAD + x * CELL_PX, cy = PAD + y * CELL_PX
        if (!iconSrc || !isImageIcon(iconSrc)) {
          ctx.fillStyle = '#dde3ea'
          ctx.fillRect(cx + 1, cy + 1, CELL_PX - 2, CELL_PX - 2)
          ctx.fillStyle = '#555'
          ctx.font = `${Math.floor(CELL_PX * 0.4)}px sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText((entry?.label || '?').slice(0, 2), cx + CELL_PX / 2, cy + CELL_PX / 2)
          return resolve()
        }
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const rot = cell.rotation || 0
          ctx.save()
          if (rot > 0) {
            ctx.translate(cx + CELL_PX / 2, cy + CELL_PX / 2)
            ctx.rotate(rot * Math.PI / 2)
            ctx.drawImage(img, 0, 50, img.width, Math.max(img.height - 50, 1), -CELL_PX / 2, -CELL_PX / 2, CELL_PX, CELL_PX)
          } else {
            ctx.drawImage(img, 0, 50, img.width, Math.max(img.height - 50, 1), cx, cy, CELL_PX, CELL_PX)
          }
          ctx.restore()
          resolve()
        }
        img.onerror = () => resolve()
        img.src = iconSrc
      })))
      return offscreen.toDataURL('image/png')
    }

    async function generateStructureOnlyPreview() {
      const CELL_PX = 36, PAD = 6
      const canvasW = state.roomWidth * CELL_PX + PAD * 2
      const canvasH = state.roomHeight * CELL_PX + PAD * 2
      const offscreen = document.createElement('canvas')
      offscreen.width = canvasW; offscreen.height = canvasH
      const ctx = offscreen.getContext('2d')
      ctx.fillStyle = '#f8f9fb'
      ctx.fillRect(0, 0, canvasW, canvasH)
      ctx.strokeStyle = '#d0d8e8'; ctx.lineWidth = 0.5
      for (let y = 0; y <= state.roomHeight; y++) {
        ctx.beginPath(); ctx.moveTo(PAD, PAD + y * CELL_PX); ctx.lineTo(PAD + state.roomWidth * CELL_PX, PAD + y * CELL_PX); ctx.stroke()
      }
      for (let x = 0; x <= state.roomWidth; x++) {
        ctx.beginPath(); ctx.moveTo(PAD + x * CELL_PX, PAD); ctx.lineTo(PAD + x * CELL_PX, PAD + state.roomHeight * CELL_PX); ctx.stroke()
      }
      for (const [key, type] of Object.entries(state.walls || {})) {
        const [orient, xStr, yStr] = key.split(',')
        const wx = parseInt(xStr), wy = parseInt(yStr)
        if (type === 'wall')       { ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3; ctx.setLineDash([]) }
        else if (type === 'hatch') { ctx.strokeStyle = '#555555'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]) }
        else if (type === 'door')  { ctx.strokeStyle = '#c8860a'; ctx.lineWidth = 3; ctx.setLineDash([]) }
        ctx.beginPath()
        if (orient === 'h') {
          ctx.moveTo(PAD + wx * CELL_PX, PAD + wy * CELL_PX)
          ctx.lineTo(PAD + (wx + 1) * CELL_PX, PAD + wy * CELL_PX)
        } else {
          ctx.moveTo(PAD + wx * CELL_PX, PAD + wy * CELL_PX)
          ctx.lineTo(PAD + wx * CELL_PX, PAD + (wy + 1) * CELL_PX)
        }
        ctx.stroke()
      }
      ctx.setLineDash([]); ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3
      ctx.strokeRect(PAD, PAD, state.roomWidth * CELL_PX, state.roomHeight * CELL_PX)
      return offscreen.toDataURL('image/png')
    }

    // ── Export popup ────────────────────────────────────────────────────────
    const exportMenuVisible = ref(false)
    const exportMenuPos = ref({ x: 0, bottom: 0 })

    function showExportMenu(event) {
      const rect = event.currentTarget.getBoundingClientRect()
      exportMenuPos.value = { x: rect.left, bottom: window.innerHeight - rect.top + 4 }
      exportMenuVisible.value = true
    }

    function closeExportMenu() {
      exportMenuVisible.value = false
    }

    async function doExport(type) {
      closeExportMenu()

      // When on the structure tab and exporting only the current layer, do a structure export
      if (state.activeTabId === 'structure' && type === 'tab') {
        const preview = await generateStructureOnlyPreview()
        const payload = encodePayload({ type: 'structure', roomWidth: state.roomWidth, roomHeight: state.roomHeight, walls: state.walls || {} })
        const bytes = dataUrlToBytes(preview)
        let modified = writePngText(bytes, 'plateup-v2-export', payload)
        // Also write legacy key for backward compat
        modified = writePngText(modified, 'plateup-structure', encodePayload({ roomWidth: state.roomWidth, roomHeight: state.roomHeight, walls: state.walls || {} }))
        downloadDataUrl(bytesToDataUrl(modified), `plateup-structure-${state.roomWidth}x${state.roomHeight}-${exportTimestamp()}.png`)
        return
      }

      if (type === 'tab') {
        const tabId = state.activeTabId
        const tab = state.tabs.find(t => t.id === tabId)
        const tabLabel = tab?.label || tabId
        const cells = []
        let minX = Infinity, minY = Infinity
        for (let y = 0; y < grid.value.length; y++) {
          for (let x = 0; x < (grid.value[y]?.length ?? 0); x++) {
            const cell = grid.value[y][x]
            if (!cell?.applianceId) continue
            const inTab = Array.isArray(cell.tabIds) ? cell.tabIds.includes(tabId) : cell.tabId === tabId
            if (!inTab) continue
            if (x < minX) minX = x
            if (y < minY) minY = y
            cells.push({ x, y, cell })
          }
        }
        if (cells.length === 0) { alert('No appliances on the current tab to export.'); return }
        const exportCells = cells.map(({ x, y, cell }) => ({
          dx: x - minX, dy: y - minY,
          cell: { applianceId: cell.applianceId, rotation: cell.rotation ?? 0, extraData: cell.extraData ?? 0, tabIds: [] }
        }))
        const preview = await generateGridPreview(tabId, false)
        const payload = encodePayload({ type: 'tab', tabId, tabLabel, cells: exportCells })
        const bytes = dataUrlToBytes(preview)
        const modified = writePngText(bytes, 'plateup-v2-export', payload)
        const safeName = tabLabel.replace(/[^a-z0-9_-]/gi, '_').slice(0, 30) || tabId
        downloadDataUrl(bytesToDataUrl(modified), `plateup-tab-${safeName}-${exportTimestamp()}.png`)

      } else if (type === 'all-tabs') {
        const cells = []
        let minX = Infinity, minY = Infinity
        for (let y = 0; y < grid.value.length; y++) {
          for (let x = 0; x < (grid.value[y]?.length ?? 0); x++) {
            const cell = grid.value[y][x]
            if (!cell?.applianceId) continue
            if (x < minX) minX = x
            if (y < minY) minY = y
            cells.push({ x, y, cell })
          }
        }
        if (cells.length === 0) { alert('No appliances to export.'); return }
        const exportCells = cells.map(({ x, y, cell }) => ({
          dx: x - minX, dy: y - minY,
          cell: { applianceId: cell.applianceId, rotation: cell.rotation ?? 0, extraData: cell.extraData ?? 0, tabIds: [] }
        }))
        const preview = await generateGridPreview(null, false)
        const payload = encodePayload({ type: 'all-tabs', cells: exportCells })
        const bytes = dataUrlToBytes(preview)
        const modified = writePngText(bytes, 'plateup-v2-export', payload)
        downloadDataUrl(bytesToDataUrl(modified), `plateup-all-tabs-${exportTimestamp()}.png`)

      } else if (type === 'complete') {
        const preview = await generateGridPreview(null, true)
        const payload = encodePayload({
          type: 'complete',
          roomWidth: state.roomWidth,
          roomHeight: state.roomHeight,
          orientation: state.orientation,
          walls: state.walls || {},
          tabs: state.tabs,
          gridCells: state.gridCells
        })
        const bytes = dataUrlToBytes(preview)
        const modified = writePngText(bytes, 'plateup-v2-export', payload)
        downloadDataUrl(bytesToDataUrl(modified), `plateup-complete-${exportTimestamp()}.png`)
      }
    }

    // ── Unified import ──────────────────────────────────────────────────────
    const unifiedImportInput = ref(null)
    function triggerUnifiedImport() { unifiedImportInput.value?.click() }

    function hasAnyContent() {
      return state.gridCells.length > 0 || Object.keys(state.walls || {}).length > 0
    }

    async function handleUnifiedImport(event) {
      const file = event.target.files?.[0]
      if (!file) return
      event.target.value = ''
      try {
        const bytes = await readFileAsBytes(file)

        // ── Try new unified format first ──────────────────────────────────
        const v2raw = readPngText(bytes, 'plateup-v2-export')
        if (v2raw) {
          const payload = decodePayload(v2raw)
          const { type } = payload

          if (type === 'tab' || type === 'all-tabs') {
            if (state.activeTabId === 'complete' || state.activeTabId === 'structure') {
              alert('Switch to a coloured tab before importing appliances.')
              return
            }
            const { cells } = payload
            if (!Array.isArray(cells) || cells.length === 0) { alert('No appliance data found in this file.'); return }
            startPasteFromCells(cells)
            return
          }

          if (type === 'structure') {
            const { roomWidth, roomHeight, walls } = payload
            if (!roomWidth || !roomHeight) { alert('Invalid structure data.'); return }
            if (roomWidth !== state.roomWidth || roomHeight !== state.roomHeight) {
              alert(`Cannot import: structure is ${roomWidth}×${roomHeight} but current room is ${state.roomWidth}×${state.roomHeight}.\nResize the room to match before importing.`)
              return
            }
            const hasWalls = Object.keys(state.walls || {}).length > 0
            if (hasWalls && !window.confirm('This will replace all current structure (walls/doors). Would you like to continue?')) return
            state.walls = walls || {}
            return
          }

          if (type === 'complete') {
            const { roomWidth, roomHeight, orientation, walls, tabs, gridCells } = payload
            if (!roomWidth || !roomHeight) { alert('Invalid complete export data.'); return }
            const dimChanged = roomWidth !== state.roomWidth || roomHeight !== state.roomHeight
            const dimNote = dimChanged ? `\n\nNote: the room will also be resized from ${state.roomWidth}×${state.roomHeight} to ${roomWidth}×${roomHeight}.` : ''
            if (hasAnyContent() && !window.confirm(`This will replace ALL current structure and appliances. All your current design will be lost.${dimNote}\n\nWould you like to continue?`)) return
            state.roomWidth = roomWidth
            state.roomHeight = roomHeight
            state.orientation = orientation ?? 0
            state.walls = walls || {}
            state.tabs = tabs || JSON.parse(JSON.stringify([{ id: 'complete', label: 'Preview' }, { id: 'structure', label: 'Structure' }, { id: 'main', label: 'Base' }]))
            state.gridCells = gridCells || []
            // Switch to first user tab
            const firstUserTab = state.tabs.find(t => t.id !== 'complete' && t.id !== 'structure')
            state.activeTabId = firstUserTab?.id ?? 'main'
            // Rebuild the internal grid from the new state
            loadGridFromState()
            return
          }

          alert('Unknown export type in this file.')
          return
        }

        // ── Backward compat: legacy plateup-design (treat as all-tabs) ────
        const legacyDesign = readPngText(bytes, 'plateup-design')
        if (legacyDesign) {
          if (state.activeTabId === 'complete' || state.activeTabId === 'structure') {
            alert('Switch to a coloured tab before importing appliances.')
            return
          }
          const parsed = decodeState(legacyDesign)
          if (!parsed?.gridCells?.length) { alert('Invalid or empty design data.'); return }
          let minX = Infinity, minY = Infinity
          for (const c of parsed.gridCells) { if (c.x < minX) minX = c.x; if (c.y < minY) minY = c.y }
          const cells = parsed.gridCells.map(c => ({
            dx: c.x - minX, dy: c.y - minY,
            cell: { applianceId: c.applianceId, rotation: c.rotation ?? 0, extraData: c.extraData ?? 0, tabIds: [] }
          }))
          startPasteFromCells(cells)
          return
        }

        // ── Backward compat: legacy plateup-structure ─────────────────────
        const legacyStructure = readPngText(bytes, 'plateup-structure')
        if (legacyStructure) {
          const { roomWidth, roomHeight, walls } = decodePayload(legacyStructure)
          if (!roomWidth || !roomHeight) { alert('Invalid structure data.'); return }
          if (roomWidth !== state.roomWidth || roomHeight !== state.roomHeight) {
            alert(`Cannot import: structure is ${roomWidth}×${roomHeight} but current room is ${state.roomWidth}×${state.roomHeight}.\nResize the room to match before importing.`)
            return
          }
          const hasWalls = Object.keys(state.walls || {}).length > 0
          if (hasWalls && !window.confirm('This will replace all current structure (walls/doors). Would you like to continue?')) return
          state.walls = walls || {}
          return
        }

        // ── Blueprint file ────────────────────────────────────────────────
        if (readPngText(bytes, 'plateup-blueprint')) {
          alert('This is a blueprint file — use Import Blueprint in the Blueprints palette tab.')
          return
        }

        alert('No PlateUp Tool export data found in this image.')
      } catch (e) {
        alert('Failed to read import file: ' + e.message)
      }
    }

    return { state, filteredPalette, addToGrid, addAllToGrid, cutToClipboard, copyToClipboard, startPaste, removeSelected, viewportBoxHeight, isStructureMode, selectedStructureTool, setStructureTool, structureTools, isPreviewTab, inventoryList, inventoryTotal, isImageIcon, onPaletteItemClick, onPaletteItemMouseDown, rightPanelStyle, paletteGridStyle,
      // blueprints
      paletteTab, blueprintFilter, filteredBlueprints, createBlueprint, applyBlueprint, deleteBlueprint, onBlueprintMouseDown,
      exportBlueprint, handleBlueprintImport, triggerBlueprintImport, blueprintImportInput,
      // unified export/import
      unifiedImportInput, triggerUnifiedImport, handleUnifiedImport,
      exportMenuVisible, exportMenuPos, showExportMenu, closeExportMenu, doExport,
    }
  }
}
</script>

<style scoped>
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  flex-shrink: 0;
}
.side-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.side-box {
  border: 1px solid #c8d1dc;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.side-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}
.filter input {
  width: 100%;
  padding: 6px;
  border: 1px solid #b9c8db;
  border-radius: 6px;
  box-sizing: border-box;
}
.palette {
  display: grid;
  grid-template-columns: repeat(2, 120px);
  gap: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
}
.palette-item {
  border: 1px solid #cbd6e5;
  border-radius: 6px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  aspect-ratio: 1 / 1;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}
.item-icon {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  min-height: 0;
}
.palette-canvas {
  width: 100%;
  height: 100%;
  display: block;
  aspect-ratio: 1 / 1;
  max-width: 100%;
  max-height: 100%;
}
.clipboard-row { display: flex; gap: 6px }
.clipboard-row button { flex: 1; padding: 7px; border: none; cursor: pointer; border-radius: 4px; background: #1f79ff; color: white }
.fill-all-btn {
  flex: 0 0 auto;
  padding: 7px 8px;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  background: #5a7fc2;
  color: white;
  font-size: 0.78rem;
}
.fill-all-btn:hover { background: #4a6fb2 }
.io-row { display: flex; gap: 6px }
.io-row button {
  flex: 1;
  padding: 6px 4px;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  background: #4a6fa5;
  color: white;
  font-size: 0.78rem;
  white-space: nowrap;
}
.io-row button:hover { background: #3a5f95 }
.bp-import-btn {
  width: 100%;
  padding: 5px 8px;
  border: 1px dashed #9ab0cc;
  border-radius: 4px;
  background: #f5f8ff;
  color: #2a5db0;
  cursor: pointer;
  font-size: 0.82rem;
  text-align: center;
  flex-shrink: 0;
}
.bp-import-btn:hover { background: #e8f0ff; border-color: #1f79ff }
.bp-export-btn {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
  padding: 0;
  line-height: 1;
}
.blueprint-item:hover .bp-export-btn { opacity: 1 }

/* ── Palette tabs ─────────────────────────────────────────────────────────── */
.palette-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #d0d9e6;
  flex-shrink: 0;
}
.palette-tab {
  flex: 1;
  padding: 6px 4px;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  background: transparent;
  color: #6b7a8d;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.12s, border-color 0.12s;
  white-space: nowrap;
}
.palette-tab:hover { color: #2a5db0 }
.palette-tab.active {
  color: #1f79ff;
  border-bottom-color: #1f79ff;
}

/* ── Blueprint palette items ─────────────────────────────────────────────── */
.blueprint-add-item {
  border-style: dashed;
  border-color: #9ab0cc;
  background: #f5f8ff;
}
.blueprint-add-item:hover {
  background: #e8f0ff;
  border-color: #1f79ff;
}
.blueprint-plus-icon {
  font-size: 48px;
  color: #6b9fd4;
}
.blueprint-plus {
  font-size: 52px;
  font-weight: 300;
  color: #6b9fd4;
  line-height: 1;
}
.blueprint-item:hover {
  border-color: #1f79ff;
  background: #f0f5ff;
}
.blueprint-item {
  user-select: none;
}
.blueprint-preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.blueprint-placeholder {
  font-size: 40px;
}
.blueprint-name {
  font-size: 11px;
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ---- Structure mode palette ---- */
.structure-header {
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a3030;
  padding-bottom: 4px;
  border-bottom: 1px solid #eecaca;
}
.structure-tool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.structure-tool-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 2px solid #d8dde8;
  border-radius: 8px;
  cursor: pointer;
  background: #f8f9fb;
  transition: border-color 0.12s, background 0.12s;
  user-select: none;
}
.structure-tool-item.active {
  border-color: #1f79ff;
  background: #e8f0ff;
}
.structure-tool-item:hover:not(.active) {
  border-color: #9ab0cc;
  background: #f0f3f8;
}
.tool-swatch {
  width: 18px;
  height: 44px;
  border-radius: 3px;
  flex-shrink: 0;
}
.swatch-wall  { background: #1a1a2e }
.swatch-hatch {
  background: repeating-linear-gradient(
    45deg, #555 0px, #555 4px, transparent 4px, transparent 8px
  );
  border: 1px solid #555;
}
.swatch-door  { background: #c8860a }
.tool-name { font-weight: 600; font-size: 15px; color: #222 }
.tool-desc { font-size: 12px; color: #777; margin-top: 2px }
.structure-hint {
  font-size: 11px;
  color: #999;
  font-style: italic;
  text-align: center;
  padding-top: 4px;
}

/* ---- Preview wrapper (banner + inventory, fixed to viewport height) ---- */
.preview-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}

/* ---- Preview info banner ---- */
.preview-info-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #fffbe6;
  border: 1px solid #f0d070;
  border-radius: 7px;
  padding: 9px 12px;
  font-size: 12px;
  color: #6b5600;
  line-height: 1.45;
  flex-shrink: 0;
}
.preview-info-icon {
  flex-shrink: 0;
  font-size: 15px;
  line-height: 1;
  margin-top: 1px;
}

/* ---- Inventory panel (Preview tab) ---- */
.inventory-panel {
  border: 1px solid #c8d1dc;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.inventory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 9px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.inventory-title {
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #3a4a5c;
}
.inventory-total-badge {
  background: #e8f0fe;
  color: #1a56db;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 12px;
}
.inventory-list {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.inventory-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 6px;
  border-radius: 6px;
  transition: background 0.1s;
}
.inventory-row:hover {
  background: #f0f4f8;
}
.inventory-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dde3ea;
  border-radius: 5px;
  background: #f7f9fb;
  overflow: hidden;
}
.inventory-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.inventory-icon-emoji {
  font-size: 22px;
  line-height: 1;
}
.inventory-count-badge {
  background: #1f79ff;
  color: white;
  font-size: 13px;
  font-weight: 700;
  min-width: 28px;
  text-align: center;
  padding: 2px 7px;
  border-radius: 12px;
  flex-shrink: 0;
}
.inventory-multiply {
  color: #8a9ab0;
  font-size: 13px;
  flex-shrink: 0;
}
.inventory-name {
  font-size: 13px;
  color: #2c3e50;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inventory-empty {
  text-align: center;
  color: #9fadbf;
  font-style: italic;
  font-size: 13px;
  padding: 28px 0;
}

/* ---- Export popup menu ---- */
.context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: transparent;
}
.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #b0c0d0;
  border-radius: 6px;
  box-shadow: 2px 4px 14px rgba(0,0,0,0.18);
  padding: 4px 0;
  min-width: 180px;
  user-select: none;
}
.context-menu-item {
  padding: 9px 18px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}
.context-menu-item:hover {
  background: #e8f0ff;
}
.context-menu-cancel {
  color: #666;
  border-top: 1px solid #e8e8e8;
  margin-top: 2px;
}
</style>
