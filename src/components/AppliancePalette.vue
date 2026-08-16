
<template>
  <aside :class="['right-panel', { 'bottom-bar-mode': bottomBarMode }]" :style="rightPanelStyle" @contextmenu.prevent>

    <!-- Hidden file inputs for PNG import -->
    <input ref="blueprintImportInput" type="file" accept="image/png" style="display:none" @change="handleBlueprintImport" />
    <input ref="unifiedImportInput" type="file" accept="image/png" style="display:none" @change="handleUnifiedImport" />

    <!-- Bottom-bar mode: horizontal palette strip (< 640 px) -->
    <template v-if="bottomBarMode">
      <div class="bb-wrap">
        <!-- Tab row: Appliances / Blueprints / mode label -->
        <div class="bb-tabs">
          <template v-if="isStructureMode">
            <span class="bb-tab-label">Draw mode</span>
          </template>
          <template v-else-if="isPreviewTab">
            <span class="bb-tab-label">Preview</span>
            <button class="bb-tab bb-tab-inv" @click="openBbInventory" title="View inventory">Inventory</button>
          </template>
          <template v-else>
            <button :class="['bb-tab', { 'bb-tab-active': paletteTab === 'appliances' }]" @click="paletteTab = 'appliances'">Appliances</button>
            <button :class="['bb-tab', { 'bb-tab-active': paletteTab === 'blueprints' }]" @click="paletteTab = 'blueprints'">Blueprints</button>
            <button :class="['bb-tab', { 'bb-tab-active': paletteTab === 'toolbox' }]" @click="paletteTab = 'toolbox'">Toolbox</button>
          </template>
        </div>
        <!-- Scrollable items row with left/right chevrons -->
        <div class="bb-scroll-wrap">
          <button v-if="canScrollLeft" class="bb-chevron bb-chevron-left" @click="scrollPalette(-200)" aria-label="Scroll left">&#8249;</button>
          <div :class="['bb-scroll', { 'bb-scroll-appliances': paletteTab === 'appliances' }]" ref="bbScrollEl" @scroll="updateScrollChevrons">
            <template v-if="isPreviewTab">
              <div class="bb-preview-action">
                <button class="bb-inv-btn" @click="openBbInventory" title="Open inventory">Show item inventory</button>
                <div class="bb-preview-msg">
                  <div class="bb-preview-title">Preview</div>
                  <div class="bb-preview-sub">Switch to a coloured tab on the left to place items</div>
                </div>
              </div>
            </template>
            <template v-else-if="isStructureMode">
              <div
                v-for="tool in structureTools"
                :key="tool.id"
                :class="['bb-item', 'bb-item-structure', { 'bb-item-active': selectedStructureTool === tool.id }]"
                @click="setStructureTool(tool.id)"
              >
                <div :class="['bb-swatch', 'swatch-' + tool.id]"></div>
                <div class="bb-label">{{ tool.label }}</div>
              </div>
            </template>
            <template v-else-if="paletteTab === 'appliances'">
              <!-- Search / Cancel-filter button — always first in the list -->
              <div
                v-if="!bbSearchQuery"
                class="bb-item bb-item-appliance bb-search-item"
                title="Filter appliances"
                @click="openBbSearch"
              >
                <div class="bb-icon">
                  <svg class="bb-search-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="bb-label">Search</div>
              </div>
              <div
                v-else
                class="bb-item bb-item-appliance bb-search-item bb-search-active"
                :title="'Clear filter: \'' + bbSearchQuery + '\''"
                @click="clearBbSearch"
              >
                <div class="bb-icon bb-search-cancel-icon">
                  <svg class="bb-search-svg bb-search-svg-sm" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/>
                    <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="bb-search-clear-text">Clear Filter</span>
                </div>
                <div class="bb-label bb-search-active-term">'{{ bbSearchQuery }}'</div>
              </div>
              <!-- Appliance items, filtered by the bb search query -->
              <div
                v-for="item in bbFilteredPalette"
                :key="item.id + '_' + (item.alternativeKey ?? '')"
                class="bb-item bb-item-appliance"
                @click="onPaletteItemClick(item)"
                @pointerdown="onPaletteItemPointerDown(item, $event)"
              >
                <div class="bb-icon">
                  <canvas :data-icon="item.icon" :data-is-mod="item.isMod ? 'true' : null" class="bb-canvas"></canvas>
                </div>
                <div class="bb-label">{{ item.label }}</div>
              </div>
            </template>
            <template v-else-if="paletteTab === 'toolbox'">
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-undo')" title="Undo (Ctrl+Z)"><div class="bb-icon"><span class="bb-tool-char">↶</span></div><div class="bb-label">Undo</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-cut')" title="Cut (Ctrl+X)"><div class="bb-icon"><span class="bb-tool-char">✂</span></div><div class="bb-label">Cut</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-copy')" title="Copy (Ctrl+C)"><div class="bb-icon"><span class="bb-tool-char">📋</span></div><div class="bb-label">Copy</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-paste')" title="Paste (Ctrl+V)"><div class="bb-icon"><span class="bb-tool-char">📥</span></div><div class="bb-label">Paste</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-duplicate')" title="Duplicate (Ctrl+D)"><div class="bb-icon"><span class="bb-tool-char">⎘</span></div><div class="bb-label">Duplicate</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-box-select')" title="Box Select">
                <div class="bb-icon"><svg class="bb-tool-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="bb-label">Box Sel</div>
              </button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-select-all')" title="Select All"><div class="bb-icon"><span class="bb-tool-char">▣</span></div><div class="bb-label">Sel All</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-invert')" title="Invert Selection">
                <div class="bb-icon"><svg class="bb-tool-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><polyline points="9,9 6,12 9,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><polyline points="15,9 18,12 15,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="bb-label">Invert</div>
              </button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-rotate-left')" title="Rotate Left"><div class="bb-icon"><span class="bb-tool-char">⟲</span></div><div class="bb-label">Rot L</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-rotate-right')" title="Rotate Right"><div class="bb-icon"><span class="bb-tool-char">⟳</span></div><div class="bb-label">Rot R</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-flip-h')" title="Flip Horizontal"><div class="bb-icon"><span class="bb-tool-char" style="display:inline-block;transform:rotate(90deg)">⇋</span></div><div class="bb-label">Flip H</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-flip-v')" title="Flip Vertical"><div class="bb-icon"><span class="bb-tool-char">⇋</span></div><div class="bb-label">Flip V</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-label')" title="Add Label">
                <div class="bb-icon"><svg class="bb-tool-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="7.5" y1="9.5" x2="7.5" y2="14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>
                <div class="bb-label">Label</div>
              </button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-delete')" title="Delete"><div class="bb-icon"><span class="bb-tool-char">🗑</span></div><div class="bb-label">Delete</div></button>
              <button class="bb-item bb-tool-btn" @click="bbInvoke('plateup-invoke-help')" title="Help"><div class="bb-icon"><span class="bb-tool-char">?</span></div><div class="bb-label">Help</div></button>
            </template>
            <template v-else>
              <div class="bb-item bb-item-add" title="Create blueprint from current selection" @click="createBlueprint">
                <div class="bb-icon bb-icon-add"><span>+</span></div>
                <div class="bb-label">New</div>
              </div>
              <div
                v-for="bp in filteredBlueprints"
                :key="bp.id"
                class="bb-item"
                :title="bp.name"
                @click="applyBlueprint(bp)"
                @pointerdown="onBlueprintPointerDown(bp, $event)"
                @contextmenu.prevent="openBpContextMenu(bp)"
              >
                <div class="bb-icon">
                  <img v-if="bp.preview" :src="bp.preview" :alt="bp.name" class="bb-bp-img" />
                  <span v-else class="bb-icon-placeholder">📋</span>
                </div>
                <div class="bb-label">{{ bp.name }}</div>
              </div>
            </template>
          </div>
          <button v-if="canScrollRight" class="bb-chevron bb-chevron-right" @click="scrollPalette(200)" aria-label="Scroll right">&#8250;</button>
        </div>
      </div>
    </template>

    <!-- Normal vertical panel mode -->
    <template v-else>

    <!-- Inventory panel shown when Preview tab is active -->
    <template v-if="isPreviewTab">
      <div class="preview-wrapper" :style="{ height: viewportBoxHeight + 'px' }">
        <div class="preview-info-banner">
          <span class="preview-info-icon">👁</span>
            <span v-if="!tabsHidden">Preview mode — to make changes, select a coloured tab on the left.</span>
            <span v-else>Preview mode — to make changes, select a tab from the dropdown at the top.</span>
        </div>
        <div class="inventory-panel">
        <div class="inventory-header">
          <span class="inventory-title">Inventory</span>
          <span class="inventory-total-badge">{{ inventoryTotal }} items</span>
        </div>
        <div class="inventory-list">
          <div v-for="item in inventoryList" :key="item.id" class="inventory-row">
            <div v-if="showInventoryIcons" class="inventory-icon">
              <canvas v-if="isImageIcon(item.icon)" :data-icon="item.icon" class="inv-canvas"></canvas>
              <span v-else class="inventory-icon-emoji">{{ item.icon }}</span>
            </div>
            <span v-if="showInventoryIcons" class="inventory-count-badge">{{ item.count }}</span>
            <span v-else class="inventory-count-text">{{ item.count }}</span>
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
                :key="item.id + '_' + (item.alternativeKey ?? '')"
                class="palette-item"
                @click="onPaletteItemClick(item)"
                @pointerdown="onPaletteItemPointerDown(item, $event)"
              >
                <div class="item-icon">
                  <canvas :data-icon="item.icon" :data-is-mod="item.isMod ? 'true' : null" class="palette-canvas"></canvas>
                </div>
                <div>{{ item.label }}</div>
              </div>
            </div>
          </template>

          <!-- Blueprints tab -->
          <template v-else>
            <div class="bp-drop-zone" :class="{ 'bp-drag-over': bpDragOver }" @dragover.prevent="onBpDragOver" @dragleave="onBpDragLeave" @drop.prevent="onBpFileDrop">
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
                :title="bp.name"
                @click="applyBlueprint(bp)"
                @pointerdown="onBlueprintPointerDown(bp, $event)"
                @dragstart.prevent
                @contextmenu.prevent="openBpContextMenu(bp)"
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
                  <button class="bp-export-btn" @pointerdown.stop @click.stop="exportBlueprint(bp)" title="Export blueprint as PNG">⬇</button>
                  <button class="bp-delete-btn" @pointerdown.stop @click.stop="deleteBlueprint(bp)" title="Delete blueprint">🗑</button>
                </div>
                <div class="blueprint-name">{{ bp.name }}</div>
              </div>

            </div>
            </div><!-- end bp-drop-zone -->
          </template>
        </template>

      </div>

      <div class="side-controls">
        <div v-if="isStructureMode" class="seed-row">
          <div class="seed-header">Load structure by seed</div>
          <div class="seed-controls">
                <div style="position:relative; width:100%" ref="seedWrapper">
                  <input ref="seedInput" v-model="seedValue" maxlength="8" placeholder="enter seed (max 8 chars)" @input="onSeedInput" @keydown="onSeedKeydown" @blur="onSeedBlur" @focus="openSeedSuggestions" />
                  <div v-if="seedSuggestionsOpen && filteredSeedOptions.length" class="seed-suggestions" :style="seedSuggestionStyle">
                    <div v-for="(s, idx) in filteredSeedOptions" :key="s.id" :class="['seed-suggestion', { active: selectedSuggestionIndex === idx }]" @click="applySuggestion(s, idx)">
                      <div class="suggest-id">{{ s.id }}</div>
                    </div>
                  </div>
                </div>
                <button :disabled="seedLoading" @click="loadSeed">Load</button>
          </div>
          <div class="seed-hint">Lowercase a-z and 0-9 only (max 8 characters).</div>
          <div class="seed-status" v-if="seedStatus">{{ seedStatus }}</div>
        </div>

        <!-- Clipboard controls moved to the left-panel toolbox for touch/mouse use -->

        <div class="palette-status-bar">{{ hoverLabel }}</div>
        <div class="palette-zoom-row">
          <span class="palette-zoom-icon" role="button" tabindex="0" title="Reset zoom to 100%" @click="resetZoom" @keydown.enter="resetZoom" @keydown.space.prevent="resetZoom">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" stroke="#3a5070" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 21l-4.3-4.3" stroke="#3a5070" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <input class="palette-zoom" type="range" min="0.3" max="2.5" step="0.05" v-model.number="state.zoom"
            :title="`Zoom ${Math.round(state.zoom * 100)}%`"
            :aria-valuetext="`${Math.round(state.zoom * 100)}%`" />
        </div>
      </div>
        <!-- Palette toolbox moved to App layout (below the palette) -->
      </div>
    </template>
    </template><!-- end normal panel mode -->

    <teleport to="body">
      <template v-if="exportMenuVisible">
        <div class="context-menu-backdrop" @click="closeExportMenu" @contextmenu.prevent="closeExportMenu" />
        <div class="context-menu" :style="exportMenuPos.top != null ? { left: exportMenuPos.x + 'px', top: exportMenuPos.top + 'px' } : { left: exportMenuPos.x + 'px', bottom: exportMenuPos.bottom + 'px' }">
          <div class="context-menu-group-label">Share via Clipboard</div>
          <div class="context-menu-item" :class="{ disabled: !hasNonGhostSelection }" @click="exportSelectedToClipboard"><span class="icon">📤</span> Selected cells...</div>
          <div class="context-menu-item" @click="doExportClipboard('tab')"><span class="icon">📋</span> {{ state.activeTabId === 'structure' ? 'Structure only' : 'Current tab' }}</div>
          <div class="context-menu-item" @click="doExportClipboard('all-tabs')"><span class="icon">📋</span> All appliance tabs</div>
          <div class="context-menu-item" @click="doExportClipboard('complete')"><span class="icon">📋</span> Complete</div>

          <div class="context-menu-item" @click="copyLinkFromMenu">
            <span class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style="display:block">
                <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/>
              </svg>
            </span>
            Copy URL to clipboard
          </div>

          <div class="context-menu-group-label">Share via File</div>
          <div class="context-menu-item" :class="{ disabled: !hasNonGhostSelection }" @click="exportSelectedToFile"><span class="icon">💾</span> Selected cells...</div>
          <div class="context-menu-item" @click="doExport('tab')"><span class="icon">💾</span> {{ state.activeTabId === 'structure' ? 'Structure only' : 'Current tab' }}</div>
          <div class="context-menu-item" @click="doExport('all-tabs')"><span class="icon">💾</span> All appliance tabs</div>
          <div class="context-menu-item" @click="doExport('complete')"><span class="icon">💾</span> Complete</div>

          <div class="context-menu-group-label">Import</div>
          <div class="context-menu-item" @click="loadFromMenu"><span class="icon">📂</span> Load from file...</div>
          <div class="context-menu-item" @click="importFromClipboard"><span class="icon">📋</span> Import from clipboard</div>
        </div>
      </template>
    </teleport>

    <teleport to="body">
      <AddLabelDialog v-if="blueprintDialogVisible"
        :initialText="blueprintDialogInitial"
        title="Blueprint name:"
        :maxLength="40"
        @confirm="onBlueprintDialogConfirm"
        @cancel="closeBlueprintDialog" />
    </teleport>

    <!-- Bottom-bar appliance search dialog -->
    <teleport to="body">
      <div v-if="bbSearchDialogVisible" class="bb-search-backdrop" @click="bbSearchCancel">
        <div class="bb-search-dialog" role="dialog" aria-modal="true" aria-label="Filter appliances" @click.stop>
          <div class="bb-search-dialog-header">
            <svg class="bb-search-dialog-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Filter Appliances</span>
          </div>
          <input
            ref="bbSearchInputEl"
            v-model="bbSearchInputText"
            class="bb-search-dialog-input"
            placeholder="e.g. counter, oven, sink…"
            maxlength="50"
            autocomplete="off"
            spellcheck="false"
            @keydown.enter.prevent="bbSearchConfirm"
            @keydown.esc.prevent="bbSearchCancel"
          />
          <div class="bb-search-dialog-actions">
            <button class="bb-search-btn-cancel" @click="bbSearchCancel">Cancel</button>
            <button class="bb-search-btn-confirm" :disabled="!bbSearchInputText.trim()" @click="bbSearchConfirm">Apply Filter</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Bottom-bar inventory modal -->
    <teleport to="body">
      <div v-if="bbInventoryVisible" class="bb-inv-backdrop" @click="closeBbInventory">
        <div class="bb-inv-dialog" role="dialog" aria-modal="true" aria-label="Inventory" @click.stop>
          <div class="bb-inv-header">
            <span class="bb-inv-title">Inventory</span>
            <span class="bb-inv-total-badge">{{ inventoryTotal }} items</span>
            <button class="bb-inv-close" @click="closeBbInventory" aria-label="Close">&#10005;</button>
          </div>
          <div class="bb-inv-scroll-wrap">
            <button v-if="bbInvCanScrollUp" class="bb-inv-chevron bb-inv-chevron-up" @click="scrollInvList(-160)" aria-label="Scroll up">
              <span style="display:inline-block;transform:rotate(-90deg)">&#8250;</span>
            </button>
            <div class="bb-inv-list" ref="bbInvListEl" @scroll="updateInvScrollChevrons">
              <div v-for="item in inventoryList" :key="item.id" class="inventory-row">
                <div v-if="showInventoryIcons" class="inventory-icon">
                  <canvas v-if="isImageIcon(item.icon)" :data-icon="item.icon" class="inv-canvas"></canvas>
                  <span v-else class="inventory-icon-emoji">{{ item.icon }}</span>
                </div>
                <span v-if="showInventoryIcons" class="inventory-count-badge">{{ item.count }}</span>
                <span v-else class="inventory-count-text">{{ item.count }}</span>
                <span class="inventory-multiply">&#215;</span>
                <span class="inventory-name">{{ item.label }}</span>
              </div>
              <div v-if="inventoryList.length === 0" class="inventory-empty">
                No appliances placed yet
              </div>
            </div>
            <button v-if="bbInvCanScrollDown" class="bb-inv-chevron bb-inv-chevron-down" @click="scrollInvList(160)" aria-label="Scroll down">
              <span style="display:inline-block;transform:rotate(90deg)">&#8250;</span>
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Blueprint long-press context menu -->
    <teleport to="body">
      <div v-if="bpContextMenuVisible" class="bp-ctx-backdrop" @click="closeBpContextMenu" @contextmenu.prevent="closeBpContextMenu">
        <div class="bp-ctx-dialog" role="dialog" aria-modal="true" :aria-label="'Blueprint options for ' + (bpContextMenuBp?.name || '')" @click.stop>
          <div class="bp-ctx-title">{{ bpContextMenuBp?.name }}</div>
          <div class="bp-ctx-item" @click="bpCtxShareClipboard">
            <span class="bp-ctx-icon">📋</span> Share blueprint via clipboard
          </div>
          <div class="bp-ctx-item" @click="bpCtxShareFile">
            <span class="bp-ctx-icon">💾</span> Share blueprint via file
          </div>
          <div class="bp-ctx-divider"></div>
          <div class="bp-ctx-item bp-ctx-item-danger" @click="bpCtxDelete">
            <span class="bp-ctx-icon">🗑</span> Delete blueprint
          </div>
          <button class="bp-ctx-cancel" @click="closeBpContextMenu">Cancel</button>
        </div>
      </div>
    </teleport>

  </aside>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import AddLabelDialog from './AddLabelDialog.vue'
import { useRestaurantStore, decodeState } from '../store/restaurant'
import { useAppliancePalette } from '../composables/useAppliancePalette'
import { getRawAppliances } from '../appliancePalette'
import { useGrid, convertCellsToGameId, canonicalizeV1Cells, enableSessionModsForCells, supportsTeleporterLines } from '../composables/useGrid'
import { useTouchDebug } from '../composables/useTouchDebug'
import { readPngText, writePngText, writeStegoText, readStegoFromBytes, dataUrlToBytes, bytesToDataUrl, downloadDataUrl, readFileAsBytes, writePngDpi } from '../composables/usePngMetadata'
import { alert, confirm, toast } from '../utils/ui'

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
  components: { AddLabelDialog },
  props: {
    bottomBarMode: { type: Boolean, default: false }
  },
  setup(props) {
    const bottomBarMode = props.bottomBarMode
    const { state } = useRestaurantStore()
    const { palette, loading } = useAppliancePalette()
    const { logTouchDebug } = useTouchDebug()
    const { addToGrid, hoverLabel, viewportBoxHeight, removeSelected, selectedCells, selectedLabelIds, copyToClipboard, cutToClipboard, startPaste, startPasteFromCells, setPasteAnchor, confirmPaste, cancelPaste, isStructureMode, selectedStructureTool, setStructureTool, flatGrid, isImageIcon, isCellGhosted, grid, startPaletteDrag, updatePaletteDrag, commitPaletteDrag, loadGridFromState, getTeleporterPairPos, cellSize } = useGrid()

    const structureTools = [
      { id: 'wall', label: 'Wall', description: 'Full-height wall' },
      { id: 'hatch', label: 'Hatch', description: 'Half-height wall' },
      { id: 'door', label: 'Door', description: 'Doorway / opening' },
      { id: 'nothing', label: 'Nothing', description: 'Remove any wall, hatch or door' },
    ]

    const isPreviewTab = computed(() => state.activeTabId === 'complete')

    function resetZoom() {
      try {
        const vb = typeof document !== 'undefined' ? document.querySelector('.viewport-box') : null
        if (vb && cellSize.value > 0 && state.roomWidth > 0 && state.roomHeight > 0) {
          const innerW = vb.clientWidth - 16  // 8px padding each side
          const innerH = vb.clientHeight - 16
          const fz = Math.min(innerW / (state.roomWidth * cellSize.value), innerH / (state.roomHeight * cellSize.value))
          state.zoom = Math.max(0.25, Math.floor(fz * 100) / 100)
        } else {
          state.zoom = 1.0
        }
      } catch (e) { /* ignore */ }
    }

    function bbInvoke(eventName) {
      try { window.dispatchEvent(new Event(eventName)) } catch (e) { /* ignore */ }
    }

    const filteredPalette = computed(() => {
      const q = state.filterText.trim().toLowerCase()
      const items = q
        ? palette.value.filter(item => item.label.toLowerCase().includes(q))
        : palette.value.slice()
      return items.slice().sort((a, b) => {
        const modDiff = (a.isMod ? 1 : 0) - (b.isMod ? 1 : 0)
        if (modDiff !== 0) return modDiff
        return a.label.localeCompare(b.label)
      })
    })

    // ── Bottom-bar search ─────────────────────────────────────────────────────
    const bbSearchQuery = ref('')
    const bbSearchInputText = ref('')
    const bbSearchDialogVisible = ref(false)
    const bbSearchInputEl = ref(null)

    const bbFilteredPalette = computed(() => {
      const q = bbSearchQuery.value.trim().toLowerCase()
      const items = q
        ? palette.value.filter(item => item.label.toLowerCase().includes(q))
        : palette.value.slice()
      return items.slice().sort((a, b) => {
        const modDiff = (a.isMod ? 1 : 0) - (b.isMod ? 1 : 0)
        if (modDiff !== 0) return modDiff
        return a.label.localeCompare(b.label)
      })
    })

    function openBbSearch() {
      bbSearchInputText.value = bbSearchQuery.value || ''
      bbSearchDialogVisible.value = true
      nextTick(() => { try { bbSearchInputEl.value?.focus() } catch (e) {} })
    }

    function bbSearchConfirm() {
      const q = (bbSearchInputText.value || '').trim()
      if (!q) return
      bbSearchQuery.value = q
      bbSearchDialogVisible.value = false
      nextTick(() => {
        try { if (bbScrollEl.value) bbScrollEl.value.scrollLeft = 0 } catch (e) {}
        scheduleRedrawPaletteCanvases()
        updateScrollChevrons()
      })
    }

    function bbSearchCancel() {
      bbSearchDialogVisible.value = false
    }

    function clearBbSearch() {
      bbSearchQuery.value = ''
      nextTick(() => {
        try { if (bbScrollEl.value) bbScrollEl.value.scrollLeft = 0 } catch (e) {}
        scheduleRedrawPaletteCanvases()
        updateScrollChevrons()
      })
    }

    // ── Bottom-bar inventory modal ────────────────────────────────────────────
    const bbInventoryVisible = ref(false)
    const bbInvListEl = ref(null)
    const bbInvCanScrollUp = ref(false)
    const bbInvCanScrollDown = ref(false)

    function updateInvScrollChevrons() {
      if (!bbInvListEl.value) { bbInvCanScrollUp.value = false; bbInvCanScrollDown.value = false; return }
      const el = bbInvListEl.value
      bbInvCanScrollUp.value = el.scrollTop > 2
      bbInvCanScrollDown.value = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    }

    function scrollInvList(delta) {
      if (!bbInvListEl.value) return
      bbInvListEl.value.scrollBy({ top: delta, behavior: 'smooth' })
      setTimeout(updateInvScrollChevrons, 200)
    }

    function openBbInventory() {
      bbInventoryVisible.value = true
      nextTick(() => { updateInvScrollChevrons(); scheduleRedrawPaletteCanvases() })
    }

    function closeBbInventory() {
      bbInventoryVisible.value = false
    }

    // Close inventory popup on Escape key
    function onBbInventoryKey(e) {
      if (!bbInventoryVisible.value) return
      if (e.key === 'Escape' || e.key === 'Esc') {
        closeBbInventory()
      }
    }

    watch(bbInventoryVisible, (val) => {
      if (val) window.addEventListener('keydown', onBbInventoryKey, true)
      else window.removeEventListener('keydown', onBbInventoryKey, true)
    })

    onUnmounted(() => { window.removeEventListener('keydown', onBbInventoryKey, true) })

    const baseLabelMap = ref({})
    // Load raw appliance entries to obtain base ItemDescription for items with Alternatives
    getRawAppliances().then(list => {
      try {
        for (const entry of list) {
          const id = Number(entry.GameID ?? entry.gameid ?? entry.gameId)
          if (!Number.isNaN(id)) baseLabelMap.value[id] = entry.ItemDescription || baseLabelMap.value[id]
        }
      } catch (e) { /* ignore */ }
    }).catch(() => {})

    const inventoryList = computed(() => {
      const counts = {}
      for (const { cell } of flatGrid.value) {
        if (cell?.applianceId) {
          counts[cell.applianceId] = (counts[cell.applianceId] || 0) + 1
        }
      }
      return Object.entries(counts)
        .map(([id, count]) => {
          const numericId = Number(id)
          const p = palette.value.find(a => a.id === numericId)
          const baseLabel = baseLabelMap.value[numericId]
          return { id, count, label: baseLabel || p?.label || id, icon: p?.icon || '' }
        })
        .sort((a, b) => b.count - a.count)
    })

    const inventoryTotal = computed(() => inventoryList.value.reduce((s, i) => s + i.count, 0))

    // Canvas image drawing with top-crop (but avoid top-crop for 2D icons).
    // Images are cached in memory to avoid re-downloading on every redraw.

    function drawModBadge(ctx, width, height) {
      const badgeH = Math.max(13, Math.round(height * 0.17))
      const badgeW = Math.max(26, Math.round(width * 0.40))
      const fontSize = Math.max(8, Math.round(badgeH * 0.60))
      const x = 0
      const y = height - badgeH
      ctx.save()
      ctx.fillStyle = '#F5C500'
      ctx.beginPath()
      ctx.moveTo(x, y + 3)
      ctx.arcTo(x, y + badgeH, x + 3, y + badgeH, 3)
      ctx.lineTo(x + badgeW - 3, y + badgeH)
      ctx.arcTo(x + badgeW, y + badgeH, x + badgeW, y + badgeH - 3, 3)
      ctx.lineTo(x + badgeW, y)
      ctx.lineTo(x, y)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#3a2600'
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText('MOD', x + badgeW / 2, y + badgeH / 2)
      ctx.restore()
    }

    // Module-level image cache to prevent re-downloading images
    const imageCache = new Map()
    const loadingImages = new Map()

    function cropAndDrawImage(canvas, src) {
      if (!canvas || !src) return
      const ctx = canvas.getContext('2d')

      function drawImageToCanvas(img, url) {
        const cropTop = (typeof url === 'string' && (url.includes('/res/2D/') || url.includes('2D_'))) ? 0 : 50
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
        if (canvas.dataset.isMod === 'true') {
          drawModBadge(ctx, canvas.width, canvas.height)
        }
      }

      function loadAndCacheImage(url, fallbackUrl = null) {
        // Check if image is already cached
        if (imageCache.has(url)) {
          const img = imageCache.get(url)
          if (img.complete && img.naturalWidth > 0) {
            drawImageToCanvas(img, url)
            return
          }
        }

        // Check if image is currently being loaded
        if (loadingImages.has(url)) {
          loadingImages.get(url).push(() => {
            const img = imageCache.get(url)
            if (img && img.complete) drawImageToCanvas(img, url)
          })
          return
        }

        // Start loading the image
        const callbacks = []
        loadingImages.set(url, callbacks)

        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = function () {
          imageCache.set(url, img)
          loadingImages.delete(url)
          drawImageToCanvas(img, url)
          // Execute any pending callbacks for this image
          callbacks.forEach(cb => cb())
        }
        
        img.onerror = function () {
          loadingImages.delete(url)
          if (fallbackUrl) {
            loadAndCacheImage(fallbackUrl)
          }
        }
        
        img.src = url
      }

      // For 3D images, set up 2D fallback
      if (typeof src === 'string' && src.includes('/res/3D/')) {
        const fallback = src.replace('/res/3D/', '/res/2D/')
        loadAndCacheImage(src, fallback)
      } else {
        loadAndCacheImage(src)
      }
    }

    // Clipboard export (uses same previews as file export but writes image to clipboard)
    async function doExportClipboard(type, scale = 2, dpi = 300) {
      closeExportMenu()
      let dataUrl
      if (state.activeTabId === 'structure' && type === 'tab') {
        dataUrl = await generateStructureOnlyPreview()
      } else if (type === 'tab') {
        dataUrl = await generateGridPreview(state.activeTabId, false)
      } else if (type === 'all-tabs') {
        dataUrl = await generateGridPreview(null, false)
      } else if (type === 'complete') {
        dataUrl = await generateGridPreview(null, true)
      }
      if (!dataUrl) {
        await alert('Nothing to copy.')
        return
      }
      dataUrl = await addWatermark(dataUrl)
      try {
        // Build the same payloads and embed both stego (LSB) and tEXt metadata
        let payload = null
        if (state.activeTabId === 'structure' && type === 'tab') {
          payload = encodePayload({ type: 'structure', roomWidth: state.roomWidth, roomHeight: state.roomHeight, walls: state.walls || {} })
        } else if (type === 'tab') {
          const tabId = state.activeTabId
          const tab = state.tabs.find(t => t.id === tabId)
          const tabLabel = tab?.label || tabId
          const tabCells = []
          let tabMinX = Infinity, tabMinY = Infinity
          for (let y = 0; y < grid.value.length; y++) {
            for (let x = 0; x < (grid.value[y]?.length ?? 0); x++) {
              const cell = grid.value[y][x]
              if (!cell?.applianceId) continue
              const inTab = Array.isArray(cell.tabIds) ? cell.tabIds.includes(tabId) : cell.tabId === tabId
              if (!inTab) continue
              if (x < tabMinX) tabMinX = x
              if (y < tabMinY) tabMinY = y
              tabCells.push({ x, y, cell })
            }
          }
          const exportCells = tabCells.map(({ x, y, cell }) => ({
            dx: x - tabMinX, dy: y - tabMinY,
            cell: { applianceId: cell.applianceId, rotation: cell.rotation ?? 0, extraData: cell.extraData ?? 0, tabIds: [] }
          }))
          const tabCellKeySet = new Set(tabCells.map(({ x, y }) => `${x},${y}`))
          const tabExportLabels = []
          for (const lbl of state.labels || []) {
            let ax = null, ay = null
            if (lbl.anchorIid) { const found = flatGrid.value.find(g => g.cell && g.cell.iid === lbl.anchorIid); if (found) { ax = found.x; ay = found.y } }
            if (ax == null && lbl.anchorX != null && lbl.anchorY != null) { ax = lbl.anchorX; ay = lbl.anchorY }
            if (ax == null) continue
            // Only include labels whose anchor is on this tab; skip floating unanchored labels.
            if (!tabCellKeySet.has(`${ax},${ay}`)) continue
            tabExportLabels.push({ dxCell: ax - tabMinX, dyCell: ay - tabMinY, dx2: (lbl.x2 != null ? lbl.x2 : ax * 2) - tabMinX * 2, dy2: (lbl.y2 != null ? lbl.y2 : ay * 2) - tabMinY * 2, label: { ...lbl } })
          }
          payload = encodePayload({ type: 'tab', tabId, tabLabel, URLVersion: 1, cells: exportCells, labels: tabExportLabels })
        } else if (type === 'all-tabs') {
          const allCells = []
          let allMinX = Infinity, allMinY = Infinity
          for (let y = 0; y < grid.value.length; y++) {
            for (let x = 0; x < (grid.value[y]?.length ?? 0); x++) {
              const cell = grid.value[y][x]
              if (!cell?.applianceId) continue
              if (x < allMinX) allMinX = x
              if (y < allMinY) allMinY = y
              allCells.push({ x, y, cell })
            }
          }
          const exportCells = allCells.map(({ x, y, cell }) => ({
            dx: x - allMinX, dy: y - allMinY,
            cell: { applianceId: cell.applianceId, rotation: cell.rotation ?? 0, extraData: cell.extraData ?? 0, tabIds: [] }
          }))
          const allCellKeySet2 = new Set(allCells.map(({ x, y }) => `${x},${y}`))
          const allExportLabels = []
          for (const lbl of state.labels || []) {
            let ax = null, ay = null
            if (lbl.anchorIid) { const found = flatGrid.value.find(g => g.cell && g.cell.iid === lbl.anchorIid); if (found) { ax = found.x; ay = found.y } }
            if (ax == null && lbl.anchorX != null && lbl.anchorY != null) { ax = lbl.anchorX; ay = lbl.anchorY }
            if (ax == null) { if (lbl.x2 != null && lbl.y2 != null) { allExportLabels.push({ dxCell: Math.floor(lbl.x2 / 2) - allMinX, dyCell: Math.floor(lbl.y2 / 2) - allMinY, dx2: lbl.x2 - allMinX * 2, dy2: lbl.y2 - allMinY * 2, label: { ...lbl } }) }; continue }
            // Only include anchored labels whose anchor cell is in the all-tabs set.
            if (!allCellKeySet2.has(`${ax},${ay}`)) continue
            allExportLabels.push({ dxCell: ax - allMinX, dyCell: ay - allMinY, dx2: (lbl.x2 != null ? lbl.x2 : ax * 2) - allMinX * 2, dy2: (lbl.y2 != null ? lbl.y2 : ay * 2) - allMinY * 2, label: { ...lbl } })
          }
          payload = encodePayload({ type: 'all-tabs', URLVersion: 1, cells: exportCells, labels: allExportLabels })
        } else if (type === 'complete') {
          payload = encodePayload({
            type: 'complete',
            roomWidth: state.roomWidth,
            roomHeight: state.roomHeight,
            URLVersion: state.URLVersion,
            walls: state.walls || {},
            tabs: state.tabs,
            gridCells: state.gridCells,
            labels: state.labels || []
          })
        }

        // If we have a payload, write stego LSB and tEXt chunk like file exports
        let finalBlob
        if (payload) {
          const stegoDataUrl = await writeStegoText(dataUrl, 'plateup-v2-export', payload)
          const bytes = dataUrlToBytes(stegoDataUrl)
          let modified = writePngText(bytes, 'plateup-v2-export', payload)
          // structure export also writes legacy key
          if (state.activeTabId === 'structure' && type === 'tab') {
            modified = writePngText(modified, 'plateup-structure', encodePayload({ roomWidth: state.roomWidth, roomHeight: state.roomHeight, walls: state.walls || {} }))
          }
          try { modified = writePngDpi(modified, dpi) } catch (e) { /* ignore */ }
          finalBlob = new Blob([modified], { type: 'image/png' })
        } else {
          finalBlob = await (await fetch(dataUrl)).blob()
        }

        await navigator.clipboard.write([
          new window.ClipboardItem({ [finalBlob.type]: finalBlob })
        ])
        toast('Image copied to clipboard!')
      } catch (e) {
        await alert('Failed to copy image to clipboard: ' + e.message)
      }
    }

    async function redrawPaletteCanvases() {
      await nextTick()
      document.querySelectorAll('.palette-item canvas, .bb-item canvas, .inv-canvas').forEach(canvas => {
        cropAndDrawImage(canvas, canvas.dataset.icon)
      })
    }

    // Debounced version to batch multiple rapid redraw requests
    let redrawTimeout = null
    function scheduleRedrawPaletteCanvases() {
      if (redrawTimeout) clearTimeout(redrawTimeout)
      redrawTimeout = setTimeout(() => {
        redrawTimeout = null
        redrawPaletteCanvases()
      }, 10)
    }

    watch(filteredPalette, scheduleRedrawPaletteCanvases, { immediate: true })

    watch(bbSearchQuery, () => {
      nextTick(() => { scheduleRedrawPaletteCanvases(); updateScrollChevrons() })
    })

    watch(isStructureMode, (val) => {
      if (!val) scheduleRedrawPaletteCanvases()
      nextTick(updateScrollChevrons)
    })

    watch(isPreviewTab, (val) => {
      if (!val) scheduleRedrawPaletteCanvases()
      else nextTick(scheduleRedrawPaletteCanvases)
      nextTick(updateScrollChevrons)
    })

    watch(inventoryList, () => { nextTick(scheduleRedrawPaletteCanvases) })

    function addAllToGrid() {
      for (const item of palette.value) {
        addToGrid(item)
      }
    }

    // Responsive palette columns: ~30% of screen width, snapping 1-3 cols, icon size fixed at 120px
    const ICON_SIZE = 120
    const ICON_GAP = 8
    const SIDE_BOX_INSET = 22 + 15  // 10px padding + 1px border each side = 22, +15 for scrollbar-gutter

    function getViewportWidth() {
      return Math.round(window.visualViewport?.width || window.innerWidth || document.documentElement?.clientWidth || 0)
    }

    const windowWidth = ref(getViewportWidth())
    const tabsHidden = ref(getViewportWidth() <= 1100)

    // Redraw bb-item canvases when the large-icon threshold (520px) is crossed so
    // cropAndDrawImage picks up the new CSS-driven canvas dimensions.
    const bbLargeItems = computed(() => bottomBarMode && windowWidth.value >= 520)
    watch(bbLargeItems, scheduleRedrawPaletteCanvases)

    function onWindowResize() {
      windowWidth.value = getViewportWidth()
      try { tabsHidden.value = getViewportWidth() <= 1100 } catch (e) {}
    }

    onMounted(() => {
      window.addEventListener('resize', onWindowResize)
      window.visualViewport?.addEventListener?.('resize', onWindowResize)
      window.visualViewport?.addEventListener?.('scroll', onWindowResize)
      onWindowResize()
      // Listen for App requesting tabs hidden (small toolbox)
      const tabsHandler = (ev) => { try { tabsHidden.value = !!ev.detail } catch (e) {} }
      window.addEventListener('plateup-tabs-hidden', tabsHandler)
      window.__tabsHandlerAppPalette = tabsHandler
    })

    onUnmounted(() => {
      window.removeEventListener('resize', onWindowResize)
      window.visualViewport?.removeEventListener?.('resize', onWindowResize)
      window.visualViewport?.removeEventListener?.('scroll', onWindowResize)
      if (window.__tabsHandlerAppPalette) { window.removeEventListener('plateup-tabs-hidden', window.__tabsHandlerAppPalette); delete window.__tabsHandlerAppPalette }
    })

    function handleGlobalSaveLoadMenu(e) { showExportMenu(e.detail) }
    onMounted(() => window.addEventListener('plateup-open-saveload-menu', handleGlobalSaveLoadMenu))
    onUnmounted(() => window.removeEventListener('plateup-open-saveload-menu', handleGlobalSaveLoadMenu))

    async function handleGlobalImportBytes(e) { await processImportBytes(e.detail.bytes) }
    onMounted(() => window.addEventListener('plateup-import-bytes', handleGlobalImportBytes))
    onUnmounted(() => window.removeEventListener('plateup-import-bytes', handleGlobalImportBytes))

    function handleCompactShareClipboard(e) { doExportClipboard(e.detail.type) }
    onMounted(() => window.addEventListener('plateup-compact-share-clipboard', handleCompactShareClipboard))
    onUnmounted(() => window.removeEventListener('plateup-compact-share-clipboard', handleCompactShareClipboard))

    function handleCompactExportFile(e) { doExport(e.detail.type) }
    onMounted(() => window.addEventListener('plateup-compact-export-file', handleCompactExportFile))
    onUnmounted(() => window.removeEventListener('plateup-compact-export-file', handleCompactExportFile))

    function handleCompactImportFile() { loadFromMenu() }
    onMounted(() => window.addEventListener('plateup-compact-import-file', handleCompactImportFile))
    onUnmounted(() => window.removeEventListener('plateup-compact-import-file', handleCompactImportFile))

    async function handleCompactImportClipboard() { await importFromClipboard() }
    onMounted(() => window.addEventListener('plateup-compact-import-clipboard', handleCompactImportClipboard))
    onUnmounted(() => window.removeEventListener('plateup-compact-import-clipboard', handleCompactImportClipboard))

    const paletteColumns = computed(() => {
      const available = windowWidth.value * 0.20
      return Math.max(1, Math.min(3, Math.floor(available / (ICON_SIZE + ICON_GAP))))
    })

    const rightPanelStyle = computed(() => {
      if (bottomBarMode) return {}
      const cols = paletteColumns.value
      const w = cols * ICON_SIZE + (cols - 1) * ICON_GAP + SIDE_BOX_INSET
      return { flex: `0 0 ${w}px`, width: `${w}px`, maxWidth: 'none', minWidth: '0' }
    })

    const paletteGridStyle = computed(() => ({
      gridTemplateColumns: `repeat(${paletteColumns.value}, ${ICON_SIZE}px)`
    }))

    const showInventoryIcons = computed(() => paletteColumns.value > 1 || bottomBarMode)

    const suppressNextClickForId = ref(null)

    // Dark mode & teleporter controls moved to App-level toolbox

    function onPaletteItemClick(item) {
      if (suppressNextClickForId.value !== null && suppressNextClickForId.value === item.id) { suppressNextClickForId.value = null; return }
      addToGrid(item)
    }

    function isPointWithinRect(clientX, clientY, rect) {
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    }

    function beginDeferredPalettePointerDrag(e, options) {
      if (e.button !== 0 || e.isPrimary === false) return

      const boundaryEl = e.currentTarget?.closest?.('.palette') || e.currentTarget?.closest?.('.bb-scroll') || e.currentTarget
      const boundaryRect = boundaryEl?.getBoundingClientRect?.()
      if (!boundaryRect) return

      const pointerType = e.pointerType || 'mouse'
      const startX = e.clientX
      const startY = e.clientY
      const isTouchLike = pointerType === 'touch' || pointerType === 'pen'
      let dragStarted = false
      // For touch, defer pointer capture until we know it's a drag (not a horizontal palette scroll)
      const captureEl = e.currentTarget
      const capturePointerId = e.pointerId
      let pointerCaptured = false

      if (isTouchLike) {
        logTouchDebug('palette-down', `${pointerType} ${Math.round(startX)},${Math.round(startY)} item=${options.label}`)
      }

      if (pointerType === 'mouse') {
        try { e.preventDefault() } catch (err) {}
      }

      function cleanup() {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
      }

      function maybeStartDrag(moveEvent) {
        if (dragStarted) return true
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        const movedEnough = Math.sqrt(dx * dx + dy * dy) > 6
        if (!movedEnough) return false

        if (isTouchLike) {
          // If movement is primarily horizontal, this is a palette scroll gesture — abort
          // and let the browser's native pan-x handle it on .bb-scroll.
          if (Math.abs(dx) > Math.abs(dy) * 1.2) {
            logTouchDebug('palette-scroll-abort', `dx=${Math.round(dx)} dy=${Math.round(dy)}`)
            cleanup()
            return false
          }
          const stillInPalette = isPointWithinRect(moveEvent.clientX, moveEvent.clientY, boundaryRect)
          if (stillInPalette) {
            logTouchDebug('palette-wait', `${Math.round(moveEvent.clientX)},${Math.round(moveEvent.clientY)} in-palette=1`)
            return false
          }
          // Confirmed drag: capture pointer now so it stays locked during the drag
          if (!pointerCaptured) {
            try {
              captureEl?.setPointerCapture?.(capturePointerId)
              pointerCaptured = true
              logTouchDebug('palette-capture-deferred', `pointer=${capturePointerId}`)
            } catch (err) {
              logTouchDebug('palette-capture-fail', err?.message || String(err))
            }
          }
          try { moveEvent.preventDefault() } catch (err) {}
        }

        dragStarted = true
        try {
          options.onStart()
          logTouchDebug('palette-start', `${Math.round(moveEvent.clientX)},${Math.round(moveEvent.clientY)} item=${options.label}`)
        } catch (err) {
          logTouchDebug('error-palette-start', err?.message || String(err))
          throw err
        }
        return true
      }

      function onMove(moveEvent) {
        if (!maybeStartDrag(moveEvent)) return
        if (isTouchLike) {
          try { moveEvent.preventDefault() } catch (err) {}
        }
        try {
          options.onMove(moveEvent.clientX, moveEvent.clientY)
          if (isTouchLike) logTouchDebug('palette-move', `${Math.round(moveEvent.clientX)},${Math.round(moveEvent.clientY)}`)
        } catch (err) {
          logTouchDebug('error-palette-move', err?.message || String(err))
          throw err
        }
      }

      function onUp(upEvent) {
        cleanup()
        if (dragStarted) {
          if (isTouchLike) {
            try { upEvent.preventDefault() } catch (err) {}
          }
          try {
            options.onCommit(upEvent.clientX, upEvent.clientY)
            logTouchDebug('palette-up', `${Math.round(upEvent.clientX)},${Math.round(upEvent.clientY)} item=${options.label}`)
          } catch (err) {
            logTouchDebug('error-palette-up', err?.message || String(err))
            throw err
          }
          options.onSuppressClick()
          return
        }
        if (!isTouchLike) return
        const dx = upEvent.clientX - startX
        const dy = upEvent.clientY - startY
        if (Math.sqrt(dx * dx + dy * dy) > 6) {
          options.onSuppressClick()
        }
      }

      function onCancel(cancelEvent) {
        cleanup()
        if (isTouchLike) {
          const cx = cancelEvent?.clientX != null ? Math.round(cancelEvent.clientX) : '-'
          const cy = cancelEvent?.clientY != null ? Math.round(cancelEvent.clientY) : '-'
          logTouchDebug('palette-cancel', `${cx},${cy} item=${options.label} started=${dragStarted ? '1' : '0'}`)
        }
        if (dragStarted) {
          try {
            options.onCancel()
          } catch (err) {
            logTouchDebug('error-palette-cancel', err?.message || String(err))
            throw err
          }
        }
      }

      window.addEventListener('pointermove', onMove, { passive: false })
      window.addEventListener('pointerup', onUp, { passive: false })
      window.addEventListener('pointercancel', onCancel, { passive: false })

      // For mouse, capture immediately (no scroll conflict). For touch/pen, capture is
      // deferred to maybeStartDrag so horizontal palette swipes reach the scroll container.
      if (pointerType === 'mouse') {
        try {
          e.currentTarget?.setPointerCapture?.(e.pointerId)
          logTouchDebug('palette-capture', `pointer=${e.pointerId}`)
        } catch (err) {
          logTouchDebug('palette-capture-fail', err?.message || String(err))
        }
      }
    }

    function onPaletteItemPointerDown(item, e) {
      if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return
      beginDeferredPalettePointerDrag(e, {
        label: item.label,
        onStart: () => startPaletteDrag(item),
        onMove: (clientX, clientY) => updatePaletteDrag(clientX, clientY),
        onCommit: () => commitPaletteDrag(),
        onCancel: () => {},
        onSuppressClick: () => { suppressNextClickForId.value = item.id }
      })
    }

    // ── Blueprints ───────────────────────────────────────────────────────────
    const paletteTab = ref('appliances')
    const bbScrollEl = ref(null)
    const canScrollLeft = ref(false)
    const canScrollRight = ref(false)
    function updateScrollChevrons() {
      const el = bbScrollEl.value
      if (!el) return
      canScrollLeft.value = el.scrollLeft > 2
      canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 2
    }
    function scrollPalette(delta) {
      const el = bbScrollEl.value
      if (!el) return
      el.scrollBy({ left: delta, behavior: 'smooth' })
    }
    watch(paletteTab, (val) => {
      if (val === 'appliances') scheduleRedrawPaletteCanvases()
      nextTick(updateScrollChevrons)
    })
    const blueprintFilter = ref('')
    const blueprints = ref(loadBlueprintsFromStorage())

    function saveBlueprintsToStorage() {
      try { localStorage.setItem(LS_BLUEPRINTS_KEY, JSON.stringify(blueprints.value)) } catch {}
    }

    // Ensure loaded blueprints have up-to-date previews (including labels)
    onMounted(async () => {
      // Wait for palette to finish loading so icons are available
      try {
        if (loading && loading.value) {
          await new Promise(resolve => {
            const stop = watch(loading, v => {
              if (!v) { stop(); resolve() }
            })
          })
        }
      } catch (e) {}

      let migrated = false
      for (const bp of blueprints.value || []) {
        try {
          // If a previous broken migration wiped cells but set version=1, reset version so
          // migration can re-attempt on this load (cells are still lost, but at least the
          // entry won't permanently block re-migration if cells are somehow restored).
          if (bp.version === 1 && (!bp.cells || bp.cells.length === 0)) {
            bp.version = undefined
            migrated = true
          }

          // Migrate old blueprints that stored internal sequential IDs (pre-GameID refactor).
          // Blueprints without a version field were saved before the GameID migration.
          if (!bp.version && Array.isArray(bp.cells) && bp.cells.length > 0) {
            const inputCells = bp.cells.map(c => ({ ...c.cell, _dx: c.dx, _dy: c.dy }))
            const raw = await convertCellsToGameId(inputCells)
            const converted = raw?.map(c => { const { _dx, _dy, ...cell } = c; return { dx: _dx, dy: _dy, cell } })
            // Only accept conversion if it produced cells (guard against map-load failure)
            if (converted && converted.length > 0) {
              bp.cells = converted
              bp.version = 1
              migrated = true
            }
          }
          const newPreview = await generateBlueprintPreview(bp.cells || [], 40, bp.labels || [])
          // Only overwrite preview if generation succeeded; preserve existing thumbnail otherwise
          if (newPreview) bp.preview = newPreview
        } catch (e) {}
      }
      if (migrated) saveBlueprintsToStorage()
      nextTick(updateScrollChevrons)
    })

    const filteredBlueprints = computed(() => {
      const q = blueprintFilter.value.trim().toLowerCase()
      if (!q) return blueprints.value
      return blueprints.value.filter(bp => bp.name.toLowerCase().includes(q))
    })

    // Dialog state for blueprint naming
    const blueprintDialogVisible = ref(false)
    const blueprintDialogInitial = ref('My Blueprint')
    const blueprintCandidate = ref(null)

    function closeBlueprintDialog() { blueprintDialogVisible.value = false; blueprintCandidate.value = null }

    function onBlueprintDialogConfirm(name) {
      const trimmedName = (name || '').trim() || 'Blueprint'
      if (!blueprintCandidate.value) { closeBlueprintDialog(); return }
      blueprints.value.push({ id: Date.now().toString(), version: 1, name: trimmedName, preview: blueprintCandidate.value.preview, cells: blueprintCandidate.value.cells, labels: blueprintCandidate.value.labels })
      saveBlueprintsToStorage()
      closeBlueprintDialog()
    }

    // Generate a small thumbnail image for a set of blueprint cells.
    async function generateBlueprintPreview(cells, cellPx = 40, labels = [], useBlueprintBg = true) {
      if (!cells.length) return null
      let maxDx = Math.max(...cells.map(c => c.dx))
      let maxDy = Math.max(...cells.map(c => c.dy))
      let minDx = Math.min(...cells.map(c => c.dx))
      let minDy = Math.min(...cells.map(c => c.dy))

      // Normalize incoming labels and expand min/max to include label positions
      const labelsForDraw = []
      try {
        if (Array.isArray(labels) && labels.length) {
          for (const lbl of labels) {
            try {
              // blueprint-style: { dxCell, dyCell, dx2, dy2, label }
              if (lbl && (lbl.dx2 != null || lbl.dxCell != null)) {
                const absX2 = (lbl.dx2 != null) ? lbl.dx2 : (lbl.label && lbl.label.x2 != null ? lbl.label.x2 : 0)
                const absY2 = (lbl.dy2 != null) ? lbl.dy2 : (lbl.label && lbl.label.y2 != null ? lbl.label.y2 : 0)
                const origLbl = lbl.label || {}
                const origHasAnchor = origLbl.anchorIid || origLbl.anchorX != null || origLbl.anchorY != null
                const absAx = origHasAnchor ? ((lbl.dxCell != null) ? lbl.dxCell : (origLbl.anchorX != null ? origLbl.anchorX : null)) : null
                const absAy = origHasAnchor ? ((lbl.dyCell != null) ? lbl.dyCell : (origLbl.anchorY != null ? origLbl.anchorY : null)) : null
                const text = (lbl.label && lbl.label.text) || lbl.text || ''
                // expand bounds
                const cellX = Math.floor(absX2 / 2)
                const cellY = Math.floor(absY2 / 2)
                if (!isNaN(cellX)) { maxDx = Math.max(maxDx, cellX); minDx = Math.min(minDx, cellX) }
                if (!isNaN(cellY)) { maxDy = Math.max(maxDy, cellY); minDy = Math.min(minDy, cellY) }
                labelsForDraw.push({ x2: absX2, y2: absY2, anchorDx: absAx, anchorDy: absAy, text })
                continue
              }
              // preview-style: { x2, y2, anchorDx, anchorDy, text }
              const absX2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : 0)
              const absY2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : 0)
              const absAx = (lbl.anchorDx != null) ? lbl.anchorDx : (lbl.anchorX != null ? lbl.anchorX : null)
              const absAy = (lbl.anchorDy != null) ? lbl.anchorDy : (lbl.anchorY != null ? lbl.anchorY : null)
              const text = lbl.text || ''
              const cellX = Math.floor(absX2 / 2)
              const cellY = Math.floor(absY2 / 2)
              if (!isNaN(cellX)) { maxDx = Math.max(maxDx, cellX); minDx = Math.min(minDx, cellX) }
              if (!isNaN(cellY)) { maxDy = Math.max(maxDy, cellY); minDy = Math.min(minDy, cellY) }
              labelsForDraw.push({ x2: absX2, y2: absY2, anchorDx: absAx, anchorDy: absAy, text })
            } catch (e) {}
          }
        }
      } catch (e) {}
      const CELL_PX = cellPx
      const BASE_PAD = 3

      // Measure labels to compute extra padding so text isn't clipped
      let padLeft = BASE_PAD, padRight = BASE_PAD, padTop = BASE_PAD, padBottom = BASE_PAD
      try {
        if (Array.isArray(labels) && labels.length) {
          const measureCanvas = document.createElement('canvas')
          const mctx = measureCanvas.getContext('2d')
          const fontSize = Math.max(10, Math.floor(cellPx * 0.28))
          mctx.font = `${fontSize}px sans-serif`
          const padX = 6, padY = 4
          const contentW = cols * CELL_PX
          const contentH = rows * CELL_PX
          let minXpx = Infinity, maxXpx = -Infinity, minYpx = Infinity, maxYpx = -Infinity
          for (const lbl of labelsForDraw) {
            try {
              const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : 0)
              const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : 0)
              const lx = ((x2 / 2 - minDx) + 0.5) * CELL_PX
              const ly = ((y2 / 2 - minDy) + 0.5) * CELL_PX
              const tw = Math.ceil(mctx.measureText(String(lbl.text || '')).width)
              const bw = tw + padX * 2
              const bh = fontSize + padY * 2
              minXpx = Math.min(minXpx, lx - bw / 2)
              maxXpx = Math.max(maxXpx, lx + bw / 2)
              minYpx = Math.min(minYpx, ly - bh / 2)
              maxYpx = Math.max(maxYpx, ly + bh / 2)
            } catch (e) {}
          }
          if (minXpx !== Infinity) {
            if (minXpx < 0) padLeft += Math.ceil(-minXpx)
            if (maxXpx > contentW) padRight += Math.ceil(maxXpx - contentW)
            if (minYpx < 0) padTop += Math.ceil(-minYpx)
            if (maxYpx > contentH) padBottom += Math.ceil(maxYpx - contentH)
          }
        }
      } catch (e) {}

      const cols = maxDx - minDx + 1
      const rows = maxDy - minDy + 1
      const canvasW = cols * CELL_PX + padLeft + padRight
      const canvasH = rows * CELL_PX + padTop + padBottom

      const offscreen = document.createElement('canvas')
      offscreen.width  = canvasW
      offscreen.height = canvasH
      const ctx = offscreen.getContext('2d')
      // Background: blueprint-only or theme-aware when not exporting blueprints
      const isDark = document.documentElement.classList.contains('dark')
      if (useBlueprintBg) {
        ctx.fillStyle = '#cce7ff'
      } else {
        ctx.fillStyle = isDark ? '#1e2738' : '#e8eef8'
      }
      ctx.fillRect(0, 0, canvasW, canvasH)

      // Draw cell dividers (vertical and horizontal) so exported PNGs show the grid
      try {
        ctx.save()
        ctx.strokeStyle = '#4a90d9'
        ctx.lineWidth = 1
        for (let x = 0; x <= cols; x++) {
          ctx.beginPath()
          ctx.moveTo(padLeft + x * CELL_PX, padTop)
          ctx.lineTo(padLeft + x * CELL_PX, padTop + rows * CELL_PX)
          ctx.stroke()
        }
        for (let y = 0; y <= rows; y++) {
          ctx.beginPath()
          ctx.moveTo(padLeft, padTop + y * CELL_PX)
          ctx.lineTo(padLeft + cols * CELL_PX, padTop + y * CELL_PX)
          ctx.stroke()
        }
        ctx.restore()
      } catch (e) {}

      // shift cells so minDx/minDy become 0
      const localCells = cells.map(c => ({ dx: c.dx - minDx, dy: c.dy - minDy, cell: { ...c.cell } }))

      await Promise.all(localCells.map(({ dx, dy, cell }) => new Promise(resolve => {
        // match palette id loosely to tolerate string/number mismatches from older blueprints
        const entry = palette.value.find(a => a.id == cell.applianceId)
        const iconSrc = entry?.icon2D || entry?.icon
        const cx = padLeft + dx * CELL_PX
        const cy = padTop + dy * CELL_PX

        if (!iconSrc || !isImageIcon(iconSrc)) {
          ctx.fillStyle = '#dde3ea'
          ctx.fillRect(cx + 1, cy + 1, CELL_PX - 2, CELL_PX - 2)
          ctx.fillStyle = '#555'
          ctx.font = `${Math.floor(CELL_PX * 0.45)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText((entry?.label || '?').slice(0, 2), cx + CELL_PX / 2, cy + CELL_PX / 2)
          // Draw teleporter pair number if present
          try {
            if (supportsTeleporterLines(cell?.applianceId) && (cell.extraData || 0) > 0) {
              const num = String(cell.extraData)
              const nx = cx + CELL_PX / 2, ny = cy + CELL_PX / 2
              ctx.save()
              ctx.fillStyle = '#000'
              ctx.font = `700 ${Math.floor(CELL_PX * 0.45)}px sans-serif`
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
              ctx.shadowColor = 'rgba(0,0,0,0.6)'
              ctx.shadowBlur = 4
              ctx.fillText(num, nx, ny)
              ctx.restore()
            }
          } catch (e) {}
          return resolve()
        }

        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          // Avoid top-cropping for 2D icons
          const cropTop = (typeof iconSrc === 'string' && iconSrc.includes('2D_')) ? 0 : 50
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
          try {
            if (supportsTeleporterLines(cell?.applianceId) && (cell.extraData || 0) > 0) {
              const num = String(cell.extraData)
              const nx = cx + CELL_PX / 2, ny = cy + CELL_PX / 2
              ctx.save()
              ctx.fillStyle = '#000'
              ctx.font = `700 ${Math.floor(CELL_PX * 0.45)}px sans-serif`
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
              ctx.shadowColor = 'rgba(0,0,0,0.6)'
              ctx.shadowBlur = 4
              ctx.fillText(num, nx, ny)
              ctx.restore()
            }
          } catch (e) {}
          resolve()
        }
        img.onerror = () => resolve()
        img.src = iconSrc
      })))

      // If teleporter-line overlay toggle is set, draw connector lines for paired teleporters
      try {
        if (localStorage.getItem('teleporterLines') === '1') {
          const ctx = offscreen.getContext('2d')
          ctx.save()
          ctx.strokeStyle = '#4dbb5f'
          ctx.lineWidth = 2
          ctx.setLineDash([7,4])
          const seen = new Set()
          const cxp = x => padLeft + x * CELL_PX + CELL_PX / 2
          const cyp = y => padTop + y * CELL_PX + CELL_PX / 2
          // Build groups by extraData among localCells and draw all unordered pairs
          const groups = new Map()
          for (const a of localCells) {
            const cell = a.cell
            const pairNum = Number(cell?.extraData || 0)
            if (!supportsTeleporterLines(cell?.applianceId) || pairNum <= 0) continue
            if (!groups.has(pairNum)) groups.set(pairNum, [])
            groups.get(pairNum).push(a)
          }
          for (const arr of groups.values()) {
            if (arr.length < 2) continue
            for (let i = 0; i < arr.length; i++) {
              for (let j = i + 1; j < arr.length; j++) {
                const a = arr[i], b = arr[j]
                const key = `${Math.min(a.dx, b.dx)},${Math.min(a.dy, b.dy)},${Math.max(a.dx, b.dx)},${Math.max(a.dy, b.dy)}`
                if (seen.has(key)) continue
                seen.add(key)
                ctx.beginPath()
                ctx.moveTo(cxp(a.dx), cyp(a.dy))
                ctx.lineTo(cxp(b.dx), cyp(b.dy))
                ctx.stroke()
              }
            }
          }
          ctx.restore()
        }
      } catch (e) {}

        // Draw labels according to label display mode (0 = lines+text, 1 = text only, 2 = hidden)
        try {
          const labelMode = Number(localStorage.getItem('labelDisplayMode') || '0')
          if (labelMode !== 2 && Array.isArray(labelsForDraw) && labelsForDraw.length) {
            const drawLabel = (lx, ly, text) => {
              const padX = 6, padY = 4
              ctx.save()
              ctx.font = `${Math.max(10, Math.floor(cellPx * 0.28))}px sans-serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              const tw = Math.ceil(ctx.measureText(text).width)
              const bw = tw + padX * 2
              const bh = Math.ceil(parseInt(ctx.font)) + padY * 2
              // theme-aware background, outline and text
              const isDarkLocal = !!document.documentElement.classList.contains('dark')
              const bgCol = isDarkLocal ? '#1c2030' : '#ffffff'
              const outlineCol = isDarkLocal ? 'rgba(255,255,255,0.06)' : 'rgba(16,35,48,0.12)'
              const textCol = isDarkLocal ? '#d0daea' : '#102330'
              ctx.fillStyle = bgCol
              ctx.globalAlpha = 0.95
              const rx = lx - bw / 2, ry = ly - bh / 2
              const r = Math.min(8, Math.floor(bh / 2), Math.floor(bw / 4))
              ctx.beginPath()
              ctx.moveTo(rx + r, ry)
              ctx.lineTo(rx + bw - r, ry)
              ctx.quadraticCurveTo(rx + bw, ry, rx + bw, ry + r)
              ctx.lineTo(rx + bw, ry + bh - r)
              ctx.quadraticCurveTo(rx + bw, ry + bh, rx + bw - r, ry + bh)
              ctx.lineTo(rx + r, ry + bh)
              ctx.quadraticCurveTo(rx, ry + bh, rx, ry + bh - r)
              ctx.lineTo(rx, ry + r)
              ctx.quadraticCurveTo(rx, ry, rx + r, ry)
              ctx.closePath()
              ctx.fill()
              // outline
              ctx.lineWidth = 1
              ctx.strokeStyle = outlineCol
              ctx.stroke()
              ctx.globalAlpha = 1
              ctx.fillStyle = textCol
              ctx.fillText(text, lx, ly)
              ctx.restore()
            }

            for (const lbl of labelsForDraw) {
              try {
                const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : 0)
                const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : 0)
                const hasAnchor = lbl.anchorDx != null
                const anchorCellX = hasAnchor ? lbl.anchorDx : Math.floor(x2 / 2)
                const anchorCellY = hasAnchor ? lbl.anchorDy : Math.floor(y2 / 2)
                const ax = padLeft + ((anchorCellX - minDx) + 0.5) * CELL_PX
                const ay = padTop + ((anchorCellY - minDy) + 0.5) * CELL_PX
                const lx = padLeft + (((x2 / 2) - minDx) + 0.5) * CELL_PX
                const ly = padTop + (((y2 / 2) - minDy) + 0.5) * CELL_PX
                // Only draw connector line for mode 0 and when label has a real anchor
                if (labelMode === 0 && hasAnchor) {
                  const dx = lx - ax, dy = ly - ay
                  if (Math.sqrt(dx * dx + dy * dy) > 6) {
                    ctx.save()
                    ctx.strokeStyle = '#4a90d9'
                    ctx.lineWidth = 2
                    ctx.setLineDash([6, 4])
                    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke()
                    // small filled circle at anchor (same color as line)
                    try {
                      ctx.fillStyle = ctx.strokeStyle
                      const r = Math.max(3, Math.round(CELL_PX * 0.12))
                      ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill()
                    } catch (e) {}
                    ctx.restore()
                  }
                }
                // Draw the label text
                if (labelMode === 0 || labelMode === 1) drawLabel(lx, ly, String(lbl.text || ''))
              } catch (e) {}
            }
          }
        } catch (e) {}

      return offscreen.toDataURL('image/png')
    }

    async function createBlueprint() {
      if (selectedCells.value.size === 0) {
        await alert('Select some appliances on the grid first, then click New.')
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
        await alert('No visible appliances are selected. Select appliances on the current tab first.')
        return
      }

      // compute max bounds for the selected region
      let maxX = -Infinity, maxY = -Infinity
      for (const v of valid) { if (v.x > maxX) maxX = v.x; if (v.y > maxY) maxY = v.y }

      const cells = valid.map(({ x, y, cell }) => ({ dx: x - minX, dy: y - minY, cell: { ...cell } }))

      // Collect labels whose ANCHOR is inside the selected region. Store absolute positions
      const includedLabels = []
      try {
        for (const lbl of (state.labels || [])) {
          let anchorCellPos = null
          if (lbl.anchorIid) {
            for (const ci of flatGrid.value) {
              if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break }
            }
          }
          if (!anchorCellPos) {
            if (lbl.anchorX == null || lbl.anchorY == null) continue
            anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
          }
          // include label when its anchor cell lies within the originally selected bounding box
          if (anchorCellPos.x >= minX && anchorCellPos.y >= minY && anchorCellPos.x <= maxX && anchorCellPos.y <= maxY) {
            const absX2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : (anchorCellPos.x * 2))
            const absY2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : (anchorCellPos.y * 2))
            includedLabels.push({ id: lbl.id, anchorX: anchorCellPos.x, anchorY: anchorCellPos.y, absX2, absY2, text: lbl.text, raw: { ...lbl } })
          }
        }
      } catch (e) {}

      // expand bounds to include any label positions that fall outside the selected cell box
      try {
        if (labelsForPreview.length) {
          for (const l of labelsForPreview) {
            try {
              const absX2 = (l.x2 != null) ? (l.x2 + minX * 2) : (Math.floor((l.anchorDx || 0)) * 2)
              const absY2 = (l.y2 != null) ? (l.y2 + minY * 2) : (Math.floor((l.anchorDy || 0)) * 2)
              const lx = Math.floor(absX2 / 2)
              const ly = Math.floor(absY2 / 2)
              if (lx < minX) minX = lx
              if (ly < minY) minY = ly
              if (lx > maxX) maxX = lx
              if (ly > maxY) maxY = ly
            } catch (e) {}
          }
        }
      } catch (e) {}

      // add a small margin so labels and their connector lines aren't clipped
      try {
        minX = Math.max(0, Math.floor(minX) - 1)
        minY = Math.max(0, Math.floor(minY) - 1)
        if (typeof state.roomWidth === 'number') maxX = Math.min(state.roomWidth - 1, Math.ceil(maxX) + 1)
        else maxX = Math.ceil(maxX) + 1
        if (typeof state.roomHeight === 'number') maxY = Math.min(state.roomHeight - 1, Math.ceil(maxY) + 1)
        else maxY = Math.ceil(maxY) + 1
      } catch (e) {}

      // rebuild cells after margin expansion
      const cellsFinal = valid.map(({ x, y, cell }) => ({ dx: x - minX, dy: y - minY, cell: { ...cell } }))

      // Build labels payload (relative to new minX/minY) and labelsForPreview
      const labelsToSave = []
      const labelsForPreview = []
      try {
        for (const l of includedLabels) {
          const relAx = l.anchorX - minX
          const relAy = l.anchorY - minY
          const relX2 = l.absX2 - minX * 2
          const relY2 = l.absY2 - minY * 2
          labelsToSave.push({ dxCell: relAx, dyCell: relAy, dx2: relX2, dy2: relY2, label: { ...l.raw } })
          labelsForPreview.push({ id: l.id, x2: relX2, y2: relY2, x: null, y: null, anchorDx: relAx, anchorDy: relAy, text: l.text })
        }
      } catch (e) {}

      const preview = await generateBlueprintPreview(cellsFinal, 40, labelsForPreview)

      // Save candidate and open dialog for name
      blueprintCandidate.value = { cells: cellsFinal, labels: labelsToSave, preview }
      blueprintDialogInitial.value = 'My Blueprint'
      blueprintDialogVisible.value = true
    }

    async function applyBlueprint(bp) {
      if (suppressNextBlueprintClickForId.value !== null && suppressNextBlueprintClickForId.value === bp.id) { suppressNextBlueprintClickForId.value = null; return }
      let { cells, labels } = bp
      // Migrate old blueprints that used internal sequential IDs (pre-GameID refactor).
      if (!bp.version && Array.isArray(cells) && cells.length > 0) {
        const raw = await convertCellsToGameId(cells.map(c => ({ ...c.cell, _dx: c.dx, _dy: c.dy })))
        if (raw) cells = raw.map(c => { const { _dx, _dy, ...cell } = c; return { dx: _dx, dy: _dy, cell } })
      }
      // Ensure canonicalization is applied (v0->GameID conversion above guarantees GameIDs)
      try { cells = await canonicalizeV1Cells(cells) } catch (e) { /* ignore */ }
      await startPasteFromCells({ cells, labels: labels || [] })
    }

    const suppressNextBlueprintClickForId = ref(null)

    function onBlueprintPointerDown(bp, e) {
      if (state.activeTabId === 'complete' || state.activeTabId === 'structure') return

      const pointerType = e.pointerType || 'mouse'
      const isTouchLike = pointerType === 'touch' || pointerType === 'pen'

      // On touch/pen, detect a long press (500 ms with no significant movement) and
      // show the blueprint context menu instead of starting a drag.
      if (isTouchLike) {
        const startX = e.clientX
        const startY = e.clientY
        const pointerId = e.pointerId
        let longPressTimer = setTimeout(() => {
          cleanupLp()
          suppressNextBlueprintClickForId.value = bp.id
          // Cancel any pending drag the pointer-drag machinery may have set up
          try { window.dispatchEvent(new PointerEvent('pointercancel', { pointerId, bubbles: true })) } catch (_) {}
          openBpContextMenu(bp)
        }, 500)

        function cleanupLp() {
          clearTimeout(longPressTimer)
          longPressTimer = null
          window.removeEventListener('pointermove', onLpMove)
          window.removeEventListener('pointerup', onLpUp)
        }
        function onLpMove(me) {
          if (!longPressTimer || me.pointerId !== pointerId) return
          const dx = me.clientX - startX
          const dy = me.clientY - startY
          if (Math.sqrt(dx * dx + dy * dy) > 8) cleanupLp()
        }
        function onLpUp(me) {
          if (me.pointerId !== pointerId) return
          cleanupLp()
        }
        window.addEventListener('pointermove', onLpMove, { passive: true })
        window.addEventListener('pointerup', onLpUp, { passive: true })
      }

      function getCellFromPoint(clientX, clientY) {
        const el = document.elementFromPoint(clientX, clientY)?.closest?.('.grid-item')
        if (el && el.dataset.x !== undefined) return { x: parseInt(el.dataset.x), y: parseInt(el.dataset.y) }
        return null
      }

      beginDeferredPalettePointerDrag(e, {
        label: bp.name,
        onStart: async () => { await applyBlueprint(bp) },
        onMove: (clientX, clientY) => {
          const cell = getCellFromPoint(clientX, clientY)
          if (cell) setPasteAnchor(cell.x, cell.y)
        },
        onCommit: (clientX, clientY) => {
          const cell = getCellFromPoint(clientX, clientY)
          if (cell) {
            setPasteAnchor(cell.x, cell.y)
            confirmPaste()
            return true
          }
          cancelPaste()
          return false
        },
        onCancel: () => cancelPaste(),
        onSuppressClick: () => { suppressNextBlueprintClickForId.value = bp.id }
      })
    }

    async function deleteBlueprint(bp) {
      if (!(await confirm(`Delete blueprint "${bp.name}"?`))) return
      blueprints.value = blueprints.value.filter(b => b.id !== bp.id)
      saveBlueprintsToStorage()
    }

    // ── Blueprint export / import ────────────────────────────────────────────
    const blueprintImportInput = ref(null)
    function triggerBlueprintImport() { blueprintImportInput.value?.click() }

    async function exportBlueprint(bp) {
      // Always generate a fresh high-res image for the exported PNG (not from localStorage)
      const exportPreview = await generateBlueprintPreview(bp.cells, 100, bp.labels || [])
      if (!exportPreview) { await alert('Could not generate preview image.'); return }
      const json = JSON.stringify({ name: bp.name, version: bp.version ?? 1, cells: bp.cells, labels: bp.labels || [] })
      const payload = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
      const bytes = dataUrlToBytes(await writeStegoText(await addWatermark(exportPreview), 'plateup-blueprint', payload))
      let modified = writePngText(bytes, 'plateup-blueprint', payload)
      try { modified = writePngDpi(modified, 300) } catch (e) {}
      const safeName = bp.name.replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || 'blueprint'
      downloadDataUrl(bytesToDataUrl(modified), `plateup-blueprint-${safeName}-${exportTimestamp()}.png`)
    }

    // ── Blueprint long-press context menu ────────────────────────────────────
    const bpContextMenuVisible = ref(false)
    const bpContextMenuBp = ref(null)

    function openBpContextMenu(bp) {
      bpContextMenuBp.value = bp
      bpContextMenuVisible.value = true
    }

    function closeBpContextMenu() {
      bpContextMenuVisible.value = false
      bpContextMenuBp.value = null
    }

    async function bpCtxShareClipboard() {
      const bp = bpContextMenuBp.value
      closeBpContextMenu()
      if (!bp) return
      await shareBlueprintToClipboard(bp)
    }

    async function bpCtxShareFile() {
      const bp = bpContextMenuBp.value
      closeBpContextMenu()
      if (!bp) return
      await exportBlueprint(bp)
    }

    async function bpCtxDelete() {
      const bp = bpContextMenuBp.value
      closeBpContextMenu()
      if (!bp) return
      await deleteBlueprint(bp)
    }

    async function shareBlueprintToClipboard(bp) {
      const exportPreview = await generateBlueprintPreview(bp.cells, 100, bp.labels || [])
      if (!exportPreview) { await alert('Could not generate preview image.'); return }
      const json = JSON.stringify({ name: bp.name, version: bp.version ?? 1, cells: bp.cells, labels: bp.labels || [] })
      const payload = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
      const bytes = dataUrlToBytes(await writeStegoText(await addWatermark(exportPreview), 'plateup-blueprint', payload))
      let modified = writePngText(bytes, 'plateup-blueprint', payload)
      try { modified = writePngDpi(modified, 300) } catch (e) {}
      try {
        const finalBlob = new Blob([modified], { type: 'image/png' })
        await navigator.clipboard.write([new window.ClipboardItem({ [finalBlob.type]: finalBlob })])
        toast('Blueprint copied to clipboard!')
      } catch (e) {
        await alert('Failed to copy blueprint to clipboard: ' + e.message)
      }
    }

    async function handleBlueprintImport(event) {
      const file = event.target.files?.[0]
      if (!file) return
      event.target.value = ''
      await importBlueprintFromBytes(file)
    }

    async function importBlueprintFromBytes(file) {
      try {
        const bytes = await readFileAsBytes(file)
        const raw = readPngText(bytes, 'plateup-blueprint') || await readStegoFromBytes(bytes, 'plateup-blueprint')
        if (!raw) {
          if (readPngText(bytes, 'plateup-design')) await alert('This is a design file — use \u2b06 Import Design to load it.')
          else if (readPngText(bytes, 'plateup-structure')) await alert('This is a structure file — use \u2b06 Import Structure to load it.')
          else await alert('No blueprint data found in this image.')
          return
        }
        const json = new TextDecoder().decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0)))
        let { name, version, cells, labels } = JSON.parse(json)
        if (!name || !Array.isArray(cells) || cells.length === 0) { await alert('Invalid blueprint data.'); return }
        // Migrate cells from old blueprint PNGs that predate the GameID version field
        if (!version) {
          const raw = await convertCellsToGameId(cells.map(c => ({ ...c.cell, _dx: c.dx, _dy: c.dy })))
          if (raw) cells = raw.map(c => { const { _dx, _dy, ...cell } = c; return { dx: _dx, dy: _dy, cell } })
          version = 1
        }
        const preview = await generateBlueprintPreview(cells, 40, labels || [])
        blueprints.value.push({ id: Date.now().toString(), version: 1, name, preview, cells, labels: labels || [] })
        saveBlueprintsToStorage()
        paletteTab.value = 'blueprints'
      } catch (e) {
        await alert('Failed to read blueprint: ' + e.message)
      }
    }

    // --- Blueprint palette drag-and-drop ---
    const bpDragOver = ref(false)

    function onBpDragOver(e) {
      if (e.dataTransfer?.types?.includes('Files')) bpDragOver.value = true
    }

    function onBpDragLeave(e) {
      if (!e.currentTarget.contains(e.relatedTarget)) bpDragOver.value = false
    }

    async function onBpFileDrop(e) {
      bpDragOver.value = false
      const file = e.dataTransfer?.files?.[0]
      if (!file || file.type !== 'image/png') {
        if (file) await alert('Only PNG blueprint files can be imported by dropping here.')
        return
      }
      await importBlueprintFromBytes(file)
    }
    // --- End blueprint drag-and-drop ---

    // ── Unified export / import ───────────────────────────────────────────────

    /** Adds a small branding strip to the bottom of an exported PNG data URL. */
    async function addWatermark(dataUrl) {
      try {
        const img = new window.Image()
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl })

        const STRIP_H = 28
        const ICON_SIZE = 13
        const FONT_SIZE = 11
        const INNER_PAD_X = 8
        const INNER_PAD_Y = 5
        const TEXT = 'eddy0612.github.io/PlateUpTool'
        const isDark = document.documentElement.classList.contains('dark')
        const stripBg = isDark ? '#1c2030' : '#e8eef8'
        const stripText = isDark ? '#d0daea' : '#e8eef8'
        const canvas = document.createElement('canvas')

        // Measure text using a temporary canvas context to compute minimum badge width
        const tmp = document.createElement('canvas')
        const tctx = tmp.getContext('2d')
        tctx.font = `${FONT_SIZE}px sans-serif`
        const textW = tctx.measureText(TEXT).width
        const badgeW = INNER_PAD_X + ICON_SIZE + 5 + textW + INNER_PAD_X
        const badgeH = STRIP_H - INNER_PAD_Y * 2
        const MIN_EXTRA_PAD = 16
        const minCanvasWidth = Math.max(img.width, Math.round(badgeW + MIN_EXTRA_PAD))

        canvas.width = minCanvasWidth
        canvas.height = img.height + STRIP_H
        const ctx = canvas.getContext('2d')

        // Draw original image centered if canvas was widened
        const imgOffsetX = Math.round((canvas.width - img.width) / 2)
        ctx.drawImage(img, imgOffsetX, 0)

        // Fill strip with the theme background
        ctx.fillStyle = stripBg
        ctx.fillRect(0, img.height, canvas.width, STRIP_H)

        // Position badge centered within the (possibly widened) canvas
        const badgeX = Math.round((canvas.width - badgeW) / 2)
        const badgeY = img.height + INNER_PAD_Y

        // Draw rounded badge background
        ctx.fillStyle = '#0f1117'
        ctx.beginPath()
        const r = 5
        ctx.moveTo(badgeX + r, badgeY)
        ctx.lineTo(badgeX + badgeW - r, badgeY)
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + r)
        ctx.lineTo(badgeX + badgeW, badgeY + badgeH - r)
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - r, badgeY + badgeH)
        ctx.lineTo(badgeX + r, badgeY + badgeH)
        ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - r)
        ctx.lineTo(badgeX, badgeY + r)
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY)
        ctx.closePath()
        ctx.fill()

        // Resolve favicon URL relative to the document base so builds with non-root bases work
        const faviconEl = document.querySelector('link[rel="icon"]')
        const iconUrl = (faviconEl && faviconEl.href) ? faviconEl.href : new URL('favicon-32.png', document.baseURI).href

        // Try fetching the favicon first to avoid tainting the canvas if it's cross-origin
        try {
          const resp = await fetch(iconUrl, { mode: 'cors', credentials: 'same-origin' })
          if (resp.ok) {
            const blob = await resp.blob()
            const iconBlobUrl = URL.createObjectURL(blob)
            try {
              const iconImg = new window.Image()
              await new Promise((res, rej) => { iconImg.onload = res; iconImg.onerror = rej; iconImg.src = iconBlobUrl })
              ctx.drawImage(iconImg, badgeX + INNER_PAD_X, badgeY + (badgeH - ICON_SIZE) / 2, ICON_SIZE, ICON_SIZE)
              URL.revokeObjectURL(iconBlobUrl)
            } catch (e) {
              try { URL.revokeObjectURL(iconBlobUrl) } catch (__) {}
            }
          }
        } catch (e) {
          // Fetch failed (likely CORS) — skip icon and render text-only
        }

        ctx.fillStyle = stripText
        ctx.font = `${FONT_SIZE}px sans-serif`
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'left'
        // Draw text (position assumes icon space reserved)
        ctx.fillText(TEXT, badgeX + INNER_PAD_X + ICON_SIZE + 5, badgeY + badgeH / 2)
        return canvas.toDataURL('image/png')
      } catch (e) {
        return dataUrl
      }
    }

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
    async function generateGridPreview(tabId, includeWalls, scale = 2) {
      const CELL_PX = 42
      const PAD = 6
      const canvasW = state.roomWidth * CELL_PX + PAD * 2
      const canvasH = state.roomHeight * CELL_PX + PAD * 2
      const offscreen = document.createElement('canvas')
      offscreen.width = canvasW * scale
      offscreen.height = canvasH * scale
      const ctx = offscreen.getContext('2d')
      // Draw in logical units then scale to produce higher-resolution export
      ctx.scale(scale, scale)
      const isDark = document.documentElement.classList.contains('dark')
      // Match export colours to the grid's dark-mode variants
      const wallColor = isDark ? '#d1d5db' : '#1a1a2e'
      const doorColor = isDark ? '#ffbf66' : '#c8860a'
      const hatchColor = isDark ? '#e6eef6' : '#555555'
      ctx.fillStyle = isDark ? (includeWalls ? '#151a26' : '#1e2738') : (includeWalls ? '#f8f9fb' : '#e8eef8')
      ctx.fillRect(0, 0, canvasW, canvasH)
      ctx.strokeStyle = isDark ? '#2a3a54' : (includeWalls ? '#d0d8e8' : '#c8d4e4')
      ctx.lineWidth = 0.5
      for (let x = 0; x <= state.roomWidth; x++) {
        ctx.beginPath(); ctx.moveTo(PAD + x * CELL_PX, PAD); ctx.lineTo(PAD + x * CELL_PX, PAD + state.roomHeight * CELL_PX); ctx.stroke()
      }
      for (let y = 0; y <= state.roomHeight; y++) {
        ctx.beginPath(); ctx.moveTo(PAD, PAD + y * CELL_PX); ctx.lineTo(PAD + state.roomWidth * CELL_PX, PAD + y * CELL_PX); ctx.stroke()
      }
      if (includeWalls) {
        // Draw outer rectangle first so explicit wall/door/hatch entries
        // from state.walls can be drawn on top (prevents the border from
        // obscuring outer doors).
        ctx.setLineDash([])
        ctx.strokeStyle = wallColor; ctx.lineWidth = 3
        ctx.strokeRect(PAD, PAD, state.roomWidth * CELL_PX, state.roomHeight * CELL_PX)
        for (const [key, type] of Object.entries(state.walls || {})) {
          const [orient, xStr, yStr] = key.split(',')
          const wx = parseInt(xStr), wy = parseInt(yStr)
          if (type === 'wall')       { ctx.strokeStyle = wallColor; ctx.lineWidth = 3; ctx.setLineDash([]) }
          else if (type === 'hatch') { ctx.strokeStyle = hatchColor; ctx.lineWidth = 2; ctx.setLineDash([3, 3]) }
          else if (type === 'door')  { ctx.strokeStyle = doorColor; ctx.lineWidth = 3; ctx.setLineDash([]) }
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
      }
      const cells = []
      let minCellX = Infinity, minCellY = Infinity, maxCellX = -Infinity, maxCellY = -Infinity
      for (let y = 0; y < grid.value.length; y++) {
        for (let x = 0; x < (grid.value[y]?.length ?? 0); x++) {
          const cell = grid.value[y][x]
          if (!cell?.applianceId) continue
          if (tabId !== null) {
            const inTab = Array.isArray(cell.tabIds) ? cell.tabIds.includes(tabId) : cell.tabId === tabId
            if (!inTab) continue
          }
          cells.push({ x, y, cell })
          if (x < minCellX) minCellX = x
          if (y < minCellY) minCellY = y
          if (x > maxCellX) maxCellX = x
          if (y > maxCellY) maxCellY = y
        }
      }
      await Promise.all(cells.map(({ x, y, cell }) => new Promise(resolve => {
        const entry = palette.value.find(a => a.id === cell.applianceId)
        const iconSrc = entry?.icon2D || entry?.icon
        const cx = PAD + x * CELL_PX, cy = PAD + y * CELL_PX
        if (!iconSrc || !isImageIcon(iconSrc)) {
          ctx.fillStyle = isDark ? '#2a3a54' : '#dde3ea'
          ctx.fillRect(cx + 1, cy + 1, CELL_PX - 2, CELL_PX - 2)
          ctx.fillStyle = isDark ? '#b0c0da' : '#555'
          ctx.font = `${Math.floor(CELL_PX * 0.4)}px sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText((entry?.label || '?').slice(0, 2), cx + CELL_PX / 2, cy + CELL_PX / 2)
          // Draw teleporter pair number if present
          try {
            if (supportsTeleporterLines(cell?.applianceId) && (cell.extraData || 0) > 0) {
              const num = String(cell.extraData)
              const nx = cx + CELL_PX / 2, ny = cy + CELL_PX / 2
              ctx.save()
              ctx.fillStyle = '#000'
              ctx.font = `700 ${Math.floor(CELL_PX * 0.45)}px sans-serif`
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
              ctx.shadowColor = 'rgba(0,0,0,0.6)'
              ctx.shadowBlur = 4
              ctx.fillText(num, nx, ny)
              ctx.restore()
            }
          } catch (e) {}
          return resolve()
        }
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const rot = cell.rotation || 0
          // For 2D icons we should not apply the top-crop used for 3D icons
          const cropTop = (typeof iconSrc === 'string' && iconSrc.includes('2D_')) ? 0 : 50
          const sH = Math.max(img.height - cropTop, 1)
          ctx.save()
          if (rot > 0) {
            ctx.translate(cx + CELL_PX / 2, cy + CELL_PX / 2)
            ctx.rotate(rot * Math.PI / 2)
            ctx.drawImage(img, 0, cropTop, img.width, sH, -CELL_PX / 2, -CELL_PX / 2, CELL_PX, CELL_PX)
          } else {
            ctx.drawImage(img, 0, cropTop, img.width, sH, cx, cy, CELL_PX, CELL_PX)
          }
          ctx.restore()
          // Draw teleporter pair number if present
          try {
            if (supportsTeleporterLines(cell?.applianceId) && (cell.extraData || 0) > 0) {
              const num = String(cell.extraData)
              const nx = cx + CELL_PX / 2, ny = cy + CELL_PX / 2
              ctx.save()
              ctx.fillStyle = '#000'
              ctx.globalAlpha = 0.6
              const r = Math.floor(CELL_PX * 0.35)
              ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.fill()
              ctx.restore()
              ctx.save()
              ctx.fillStyle = '#000'
              ctx.font = `700 ${Math.floor(CELL_PX * 0.45)}px sans-serif`
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
              ctx.shadowColor = 'rgba(0,0,0,0.6)'
              ctx.shadowBlur = 4
              ctx.fillText(num, nx, ny)
              ctx.restore()
            }
          } catch (e) {}
          resolve()
        }
        img.onerror = () => resolve()
        img.src = iconSrc
      })))
      // Build a lookup of exported cells for label-anchor inclusion checks
      const exportedCellSet = new Set(cells.map(c => `${c.x},${c.y}`))

      // Draw teleporter connector lines when toggle enabled
      try {
        if (localStorage.getItem('teleporterLines') === '1') {
          const ctx = offscreen.getContext('2d')
          ctx.save()
          ctx.strokeStyle = '#4dbb5f'
          ctx.lineWidth = 2
          ctx.setLineDash([7,4])
          const seen = new Set()
          const cx = x => PAD + x * CELL_PX + CELL_PX / 2
          const cy = y => PAD + y * CELL_PX + CELL_PX / 2
          // Build groups from the exported `cells` array so only included cells are connected
          const groups = new Map()
          for (const { x, y, cell } of cells) {
            const pairNum = Number(cell?.extraData || 0)
            if (!supportsTeleporterLines(cell?.applianceId) || pairNum <= 0) continue
            if (!groups.has(pairNum)) groups.set(pairNum, [])
            groups.get(pairNum).push({ x, y })
          }
          for (const arr of groups.values()) {
            if (arr.length < 2) continue
            for (let i = 0; i < arr.length; i++) {
              for (let j = i + 1; j < arr.length; j++) {
                const a = arr[i], b = arr[j]
                const key = `${Math.min(a.x, b.x)},${Math.min(a.y, b.y)},${Math.max(a.x, b.x)},${Math.max(a.y, b.y)}`
                if (seen.has(key)) continue
                seen.add(key)
                ctx.beginPath()
                ctx.moveTo(cx(a.x), cy(a.y))
                ctx.lineTo(cx(b.x), cy(b.y))
                ctx.stroke()
              }
            }
          }
          ctx.restore()
        }
      } catch (e) {}

      // add a small margin so labels and their connector lines aren't clipped
      try {
        minX = Math.max(0, Math.floor(minX) - 1)
        minY = Math.max(0, Math.floor(minY) - 1)
        if (typeof state.roomWidth === 'number') maxX = Math.min(state.roomWidth - 1, Math.ceil(maxX) + 1)
        else maxX = Math.ceil(maxX) + 1
        if (typeof state.roomHeight === 'number') maxY = Math.min(state.roomHeight - 1, Math.ceil(maxY) + 1)
        else maxY = Math.ceil(maxY) + 1
      } catch (e) {}

      // Draw labels according to label display mode (0 = lines+text, 1 = text only, 2 = hidden)
      try {
        const labelMode = Number(localStorage.getItem('labelDisplayMode') || '0')
        if (labelMode !== 2 && Array.isArray(state.labels) && state.labels.length) {
          const drawLabel = (lx, ly, text) => {
            const padX = 6, padY = 4
            ctx.save()
            ctx.font = `${Math.max(10, Math.floor(CELL_PX * 0.28))}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const tw = Math.ceil(ctx.measureText(text).width)
            const bw = tw + padX * 2
            const bh = Math.ceil(parseInt(ctx.font)) + padY * 2
            const isDarkLocal = !!document.documentElement.classList.contains('dark')
            const bgCol = isDarkLocal ? '#1c2030' : '#ffffff'
            const outlineCol = isDarkLocal ? 'rgba(255,255,255,0.06)' : 'rgba(16,35,48,0.12)'
            const textCol = isDarkLocal ? '#d0daea' : '#102330'
            // background with rounded corners and outline
            ctx.fillStyle = bgCol
            ctx.globalAlpha = 0.95
            const rx = lx - bw / 2, ry = ly - bh / 2
            const r = Math.min(8, Math.floor(bh / 2), Math.floor(bw / 4))
            ctx.beginPath()
            ctx.moveTo(rx + r, ry)
            ctx.lineTo(rx + bw - r, ry)
            ctx.quadraticCurveTo(rx + bw, ry, rx + bw, ry + r)
            ctx.lineTo(rx + bw, ry + bh - r)
            ctx.quadraticCurveTo(rx + bw, ry + bh, rx + bw - r, ry + bh)
            ctx.lineTo(rx + r, ry + bh)
            ctx.quadraticCurveTo(rx, ry + bh, rx, ry + bh - r)
            ctx.lineTo(rx, ry + r)
            ctx.quadraticCurveTo(rx, ry, rx + r, ry)
            ctx.closePath()
            ctx.fill()
            // outline
            ctx.lineWidth = 1
            ctx.strokeStyle = outlineCol
            ctx.stroke()
            ctx.globalAlpha = 1
            ctx.fillStyle = textCol
            ctx.fillText(text, lx, ly)
            ctx.restore()
          }

          for (const lbl of state.labels) {
            try {
              // Resolve anchor if present
              let anchorCellPos = null
              if (lbl.anchorIid) {
                for (const ci of flatGrid.value) {
                  if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break }
                }
              } else if (lbl.anchorX != null && lbl.anchorY != null) {
                anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
              }

              // Determine whether to include this label in the preview
              let includeLabel = false
              if (anchorCellPos) {
                // include only if anchor is part of exported cells
                includeLabel = exportedCellSet.has(`${anchorCellPos.x},${anchorCellPos.y}`)
              } else {
                // floating label: include only for all-tabs/complete exports (tabId === null)
                includeLabel = (tabId === null)
              }
              if (!includeLabel) continue

              const ax = anchorCellPos ? (PAD + anchorCellPos.x * CELL_PX + CELL_PX / 2) : null
              const ay = anchorCellPos ? (PAD + anchorCellPos.y * CELL_PX + CELL_PX / 2) : null
              const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : 0)
              const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : 0)
              const lx = PAD + (x2 / 2) * CELL_PX + CELL_PX / 2
              const ly = PAD + (y2 / 2) * CELL_PX + CELL_PX / 2
              if (labelMode === 0 && anchorCellPos) {
                const dx = lx - ax, dy = ly - ay
                if (Math.sqrt(dx * dx + dy * dy) > 6) {
                  ctx.save()
                  ctx.strokeStyle = '#4a90d9'
                  ctx.lineWidth = 2
                  ctx.setLineDash([6, 4])
                  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke()
                  // small filled circle at anchor (same color as line)
                  try {
                    ctx.fillStyle = ctx.strokeStyle
                    const r = Math.max(3, Math.round(CELL_PX * 0.12))
                    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill()
                  } catch (e) {}
                  ctx.restore()
                }
              }
              if (labelMode === 0 || labelMode === 1) drawLabel(lx, ly, String(lbl.text || ''))
            } catch (e) {}
          }
        }
      } catch (e) {}

      // Crop to the smallest bounding rectangle containing appliances (tab / all-tabs exports)
      if (!includeWalls && cells.length > 0 && isFinite(minCellX)) {
        const cropX = minCellX * CELL_PX
        const cropY = minCellY * CELL_PX
        const cropW = (maxCellX - minCellX + 1) * CELL_PX + PAD * 2
        const cropH = (maxCellY - minCellY + 1) * CELL_PX + PAD * 2
        const cropped = document.createElement('canvas')
        cropped.width = cropW * scale
        cropped.height = cropH * scale
        const cctx = cropped.getContext('2d')
        cctx.drawImage(offscreen, cropX * scale, cropY * scale, cropW * scale, cropH * scale, 0, 0, cropW * scale, cropH * scale)
        return cropped.toDataURL('image/png')
      }

      return offscreen.toDataURL('image/png')
    }

    async function generateStructureOnlyPreview(scale = 2) {
      const CELL_PX = 36, PAD = 6
      const canvasW = state.roomWidth * CELL_PX + PAD * 2
      const canvasH = state.roomHeight * CELL_PX + PAD * 2
      const offscreen = document.createElement('canvas')
      offscreen.width = canvasW * scale; offscreen.height = canvasH * scale
      const ctx = offscreen.getContext('2d')
      ctx.scale(scale, scale)
      const isDark = document.documentElement.classList.contains('dark')
      // Match dark-mode export colours to the grid
      const wallColor = isDark ? '#d1d5db' : '#1a1a2e'
      const doorColor = isDark ? '#ffbf66' : '#c8860a'
      const hatchColor = isDark ? '#e6eef6' : '#555555'
      ctx.fillStyle = isDark ? '#151a26' : '#f8f9fb'
      ctx.fillRect(0, 0, canvasW, canvasH)
      ctx.strokeStyle = isDark ? '#2a3a54' : '#d0d8e8'; ctx.lineWidth = 0.5
      for (let y = 0; y <= state.roomHeight; y++) {
        ctx.beginPath(); ctx.moveTo(PAD, PAD + y * CELL_PX); ctx.lineTo(PAD + state.roomWidth * CELL_PX, PAD + y * CELL_PX); ctx.stroke()
      }
      for (let x = 0; x <= state.roomWidth; x++) {
        ctx.beginPath(); ctx.moveTo(PAD + x * CELL_PX, PAD); ctx.lineTo(PAD + x * CELL_PX, PAD + state.roomHeight * CELL_PX); ctx.stroke()
      }
      // Draw outer rectangle first so explicit border doors/walls are drawn on top
      ctx.setLineDash([])
      ctx.strokeStyle = wallColor; ctx.lineWidth = 3
      ctx.strokeRect(PAD, PAD, state.roomWidth * CELL_PX, state.roomHeight * CELL_PX)
      for (const [key, type] of Object.entries(state.walls || {})) {
        const [orient, xStr, yStr] = key.split(',')
        const wx = parseInt(xStr), wy = parseInt(yStr)
        if (type === 'wall')       { ctx.strokeStyle = wallColor; ctx.lineWidth = 3; ctx.setLineDash([]) }
        else if (type === 'hatch') { ctx.strokeStyle = hatchColor; ctx.lineWidth = 2; ctx.setLineDash([3, 3]) }
        else if (type === 'door')  { ctx.strokeStyle = doorColor; ctx.lineWidth = 3; ctx.setLineDash([]) }
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
      return offscreen.toDataURL('image/png')
    }

    const hasNonGhostSelection = computed(() => {
      if (!selectedCells.value || selectedCells.value.size === 0) return false
      for (const key of selectedCells.value) {
        const [x, y] = key.split(',').map(Number)
        if (!isCellGhosted(x, y)) {
          const cell = grid.value[y]?.[x]
          if (cell?.applianceId) return true
        }
      }
      return false
    })

    async function exportSelectedToFile() {
      if (!hasNonGhostSelection.value) return
      closeExportMenu()
      // collect non-ghosted selected cells
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
      if (valid.length === 0) { await alert('No visible appliances are selected.'); return }

      let maxX = -Infinity, maxY = -Infinity
      for (const v of valid) { if (v.x > maxX) maxX = v.x; if (v.y > maxY) maxY = v.y }
      const validCellSet = new Set(valid.map(v => `${v.x},${v.y}`))

      // Expand bounds to include any label positions (anchored or floating) that should be part of the selection
      try {
        // include labels anchored inside selection or explicitly selected
        const labelCandidates = []
        for (const lbl of (state.labels || [])) {
          // resolve anchor position
          let anchorCellPos = null
          if (lbl.anchorIid) {
            for (const ci of flatGrid.value) { if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break } }
          } else if (lbl.anchorX != null && lbl.anchorY != null) {
            anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
          }
          // include only if anchor is on an actually-selected cell
          if (anchorCellPos && validCellSet.has(`${anchorCellPos.x},${anchorCellPos.y}`)) {
            labelCandidates.push(lbl)
          }
        }
        // also include explicitly-selected labels
        try {
          const sel = selectedLabelIds?.value || new Set()
          for (const id of sel) {
            const lbl = (state.labels || []).find(l => l.id === id)
            if (lbl) labelCandidates.push(lbl)
          }
        } catch (e) {}

        for (const lbl of labelCandidates) {
          const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : (lbl.anchorX != null ? lbl.anchorX * 2 : 0))
          const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : (lbl.anchorY != null ? lbl.anchorY * 2 : 0))
          const lx = Math.floor(x2 / 2)
          const ly = Math.floor(y2 / 2)
          if (lx < minX) minX = lx
          if (ly < minY) minY = ly
          if (lx > maxX) maxX = lx
          if (ly > maxY) maxY = ly
        }
      } catch (e) {}

      const exportCells = valid.map(({ x, y, cell }) => ({ dx: x - minX, dy: y - minY, cell: { applianceId: cell.applianceId, rotation: cell.rotation ?? 0, extraData: cell.extraData ?? 0, tabIds: [] } }))
      const previewCells = valid.map(({ x, y, cell }) => ({ dx: x - minX, dy: y - minY, cell: { ...cell } }))
      // collect labels anchored inside selection and convert to relative coords
      const labelsForPreview = []
      const exportLabels = []
      try {
        for (const lbl of (state.labels || [])) {
          let anchorCellPos = null
          if (lbl.anchorIid) {
            for (const ci of flatGrid.value) {
              if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break }
            }
          }
          if (!anchorCellPos) {
            if (lbl.anchorX == null || lbl.anchorY == null) continue
            anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
          }
          if (validCellSet.has(`${anchorCellPos.x},${anchorCellPos.y}`)) {
            const relAx = anchorCellPos.x - minX
            const relAy = anchorCellPos.y - minY
            const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : (anchorCellPos.x * 2))
            const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : (anchorCellPos.y * 2))
            const relX2 = x2 - minX * 2
            const relY2 = y2 - minY * 2
            labelsForPreview.push({ id: lbl.id, x2: relX2, y2: relY2, x: null, y: null, anchorDx: relAx, anchorDy: relAy, text: lbl.text })
            exportLabels.push({ dxCell: relAx, dyCell: relAy, dx2: relX2, dy2: relY2, label: { ...lbl } })
          }
        }
      } catch (e) {}

      // Also include explicitly-selected labels (selectedLabelIds)
      try {
        const sel = selectedLabelIds?.value || new Set()
        for (const id of sel) {
          if (labelsForPreview.find(l => l.id === id)) continue
          const lbl = (state.labels || []).find(l => l.id === id)
          if (!lbl) continue
          // resolve anchor if present
          let anchorCellPos = null
          if (lbl.anchorIid) {
            for (const ci of flatGrid.value) { if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break } }
          }
          if (!anchorCellPos && lbl.anchorX != null && lbl.anchorY != null) anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
          const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : ((anchorCellPos ? anchorCellPos.x * 2 : 0)))
          const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : ((anchorCellPos ? anchorCellPos.y * 2 : 0)))
          const relX2 = x2 - minX * 2
          const relY2 = y2 - minY * 2
          const relAx = anchorCellPos ? (anchorCellPos.x - minX) : null
          const relAy = anchorCellPos ? (anchorCellPos.y - minY) : null
          const anchorDxVal = (relAx != null) ? relAx : (relX2 / 2)
          const anchorDyVal = (relAy != null) ? relAy : (relY2 / 2)
          labelsForPreview.push({ id: lbl.id, x2: relX2, y2: relY2, x: null, y: null, anchorDx: anchorDxVal, anchorDy: anchorDyVal, text: lbl.text })
          exportLabels.push({ dxCell: anchorDxVal, dyCell: anchorDyVal, dx2: relX2, dy2: relY2, label: { ...lbl } })
        }
      } catch (e) {}

      const preview = await generateBlueprintPreview(previewCells, 80, labelsForPreview, false)
      const payload = encodePayload({ type: 'tab', tabId: 'selection', tabLabel: 'Selection', URLVersion: 1, cells: exportCells, labels: exportLabels })
      const bytes = dataUrlToBytes(await writeStegoText(await addWatermark(preview), 'plateup-v2-export', payload))
      let modified = writePngText(bytes, 'plateup-v2-export', payload)
      try { modified = writePngDpi(modified, 300) } catch (e) {}
      downloadDataUrl(bytesToDataUrl(modified), `plateup-selection-${exportTimestamp()}.png`)
    }

    async function exportSelectedToClipboard() {
      if (!hasNonGhostSelection.value) return
      closeExportMenu()
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
      if (valid.length === 0) { await alert('No visible appliances are selected.'); return }
      let maxX = -Infinity, maxY = -Infinity
      for (const v of valid) { if (v.x > maxX) maxX = v.x; if (v.y > maxY) maxY = v.y }
      const validCellSet = new Set(valid.map(v => `${v.x},${v.y}`))

      // Expand bounds to include labels that are anchored inside selection or explicitly selected
      try {
        const labelCandidates = []
        for (const lbl of (state.labels || [])) {
          let anchorCellPos = null
          if (lbl.anchorIid) {
            for (const ci of flatGrid.value) { if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break } }
          } else if (lbl.anchorX != null && lbl.anchorY != null) {
            anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
          }
          if (anchorCellPos && validCellSet.has(`${anchorCellPos.x},${anchorCellPos.y}`)) labelCandidates.push(lbl)
        }
        try {
          const sel = selectedLabelIds?.value || new Set()
          for (const id of sel) {
            const lbl = (state.labels || []).find(l => l.id === id)
            if (lbl) labelCandidates.push(lbl)
          }
        } catch (e) {}
        for (const lbl of labelCandidates) {
          const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : (lbl.anchorX != null ? lbl.anchorX * 2 : 0))
          const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : (lbl.anchorY != null ? lbl.anchorY * 2 : 0))
          const lx = Math.floor(x2 / 2), ly = Math.floor(y2 / 2)
          if (lx < minX) minX = lx
          if (ly < minY) minY = ly
          if (lx > maxX) maxX = lx
          if (ly > maxY) maxY = ly
        }
      } catch (e) {}
      // collect labels anchored inside selection and convert to relative coords
      const labelsForPreview = []
      const clipboardExportLabels = []
      try {
        for (const lbl of (state.labels || [])) {
          let anchorCellPos = null
          if (lbl.anchorIid) {
            for (const ci of flatGrid.value) {
              if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break }
            }
          }
          if (!anchorCellPos) {
            if (lbl.anchorX == null || lbl.anchorY == null) continue
            anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
          }
          if (validCellSet.has(`${anchorCellPos.x},${anchorCellPos.y}`)) {
            const relAx = anchorCellPos.x - minX
            const relAy = anchorCellPos.y - minY
            const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : (anchorCellPos.x * 2))
            const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : (anchorCellPos.y * 2))
            const relX2 = x2 - minX * 2
            const relY2 = y2 - minY * 2
            labelsForPreview.push({ id: lbl.id, x2: relX2, y2: relY2, x: null, y: null, anchorDx: relAx, anchorDy: relAy, text: lbl.text })
            clipboardExportLabels.push({ dxCell: relAx, dyCell: relAy, dx2: relX2, dy2: relY2, label: { ...lbl } })
          }
        }
      } catch (e) {}

      // include explicitly selected labels as well
      try {
        const sel = selectedLabelIds?.value || new Set()
        for (const id of sel) {
          if (labelsForPreview.find(l => l.id === id)) continue
          const lbl = (state.labels || []).find(l => l.id === id)
          if (!lbl) continue
          let anchorCellPos = null
          if (lbl.anchorIid) {
            for (const ci of flatGrid.value) { if (ci.cell && ci.cell.iid === lbl.anchorIid) { anchorCellPos = { x: ci.x, y: ci.y }; break } }
          }
          if (!anchorCellPos && lbl.anchorX != null && lbl.anchorY != null) anchorCellPos = { x: lbl.anchorX, y: lbl.anchorY }
          const x2 = (lbl.x2 != null) ? lbl.x2 : (lbl.x != null ? lbl.x * 2 : ((anchorCellPos ? anchorCellPos.x * 2 : 0)))
          const y2 = (lbl.y2 != null) ? lbl.y2 : (lbl.y != null ? lbl.y * 2 : ((anchorCellPos ? anchorCellPos.y * 2 : 0)))
          const relX2 = x2 - minX * 2
          const relY2 = y2 - minY * 2
          const relAx = anchorCellPos ? (anchorCellPos.x - minX) : null
          const relAy = anchorCellPos ? (anchorCellPos.y - minY) : null
          const anchorDxVal = (relAx != null) ? relAx : (relX2 / 2)
          const anchorDyVal = (relAy != null) ? relAy : (relY2 / 2)
          labelsForPreview.push({ id: lbl.id, x2: relX2, y2: relY2, x: null, y: null, anchorDx: relAx, anchorDy: relAy, text: lbl.text })
          clipboardExportLabels.push({ dxCell: anchorDxVal, dyCell: anchorDyVal, dx2: relX2, dy2: relY2, label: { ...lbl } })
        }
      } catch (e) {}

      // rebuild previewCells using possibly-updated minX/minY
      const previewCellsFinal = valid.map(({ x, y, cell }) => ({ dx: x - minX, dy: y - minY, cell: { ...cell } }))

      let dataUrl = await generateBlueprintPreview(previewCellsFinal, 80, labelsForPreview, false)
      if (!dataUrl) { await alert('Nothing to copy.'); return }
      dataUrl = await addWatermark(dataUrl)
      try {
        const payload = encodePayload({ type: 'tab', tabId: 'selection', tabLabel: 'Selection', URLVersion: 1, cells: valid.map(({ x, y, cell }) => ({ dx: x - minX, dy: y - minY, cell: { applianceId: cell.applianceId, rotation: cell.rotation ?? 0, extraData: cell.extraData ?? 0, tabIds: [] } })), labels: clipboardExportLabels })
        const stegoDataUrl = await writeStegoText(dataUrl, 'plateup-v2-export', payload)
        const bytes = dataUrlToBytes(stegoDataUrl)
        let modified = writePngText(bytes, 'plateup-v2-export', payload)
        try { modified = writePngDpi(modified, 300) } catch (e) {}
        const finalBlob = new Blob([modified], { type: 'image/png' })
        await navigator.clipboard.write([
          new window.ClipboardItem({ [finalBlob.type]: finalBlob })
        ])
        toast('Image copied to clipboard!')
      } catch (e) {
        await alert('Failed to copy image to clipboard: ' + e.message)
      }
    }

    // ── Export popup ────────────────────────────────────────────────────────
    const exportMenuVisible = ref(false)
    const exportMenuPos = ref({ x: 0, bottom: 0 })

    function showExportMenu(eventOrPos) {
      if (eventOrPos instanceof Event) {
        const rect = eventOrPos.currentTarget.getBoundingClientRect()
        exportMenuPos.value = { x: rect.left, bottom: window.innerHeight - rect.top + 4, top: null }
      } else {
        exportMenuPos.value = { x: eventOrPos.x, top: eventOrPos.top ?? null, bottom: eventOrPos.bottom ?? null }
      }
      exportMenuVisible.value = true
    }

    function closeExportMenu() {
      exportMenuVisible.value = false
    }

    function loadFromMenu() {
      closeExportMenu()
      triggerUnifiedImport()
    }

    function copyLinkFromMenu() {
      closeExportMenu()
      window.dispatchEvent(new CustomEvent('plateup-copy-link'))
    }

    async function doExport(type) {
      closeExportMenu()

      // When on the structure tab and exporting only the current layer, do a structure export
      if (state.activeTabId === 'structure' && type === 'tab') {
        const preview = await generateStructureOnlyPreview()
        const payload = encodePayload({ type: 'structure', roomWidth: state.roomWidth, roomHeight: state.roomHeight, walls: state.walls || {} })
        const bytes = dataUrlToBytes(await writeStegoText(await addWatermark(preview), 'plateup-v2-export', payload))
        let modified = writePngText(bytes, 'plateup-v2-export', payload)
        // Also write legacy key for backward compat
        modified = writePngText(modified, 'plateup-structure', encodePayload({ roomWidth: state.roomWidth, roomHeight: state.roomHeight, walls: state.walls || {} }))
        try { modified = writePngDpi(modified, 300) } catch (e) {}
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
        if (cells.length === 0) { await alert('No appliances on the current tab to export.'); return }
        const exportCells = cells.map(({ x, y, cell }) => ({
          dx: x - minX, dy: y - minY,
          cell: { applianceId: cell.applianceId, rotation: cell.rotation ?? 0, extraData: cell.extraData ?? 0, tabIds: [] }
        }))
        const cellKeySet = new Set(cells.map(({ x, y }) => `${x},${y}`))
        const exportLabels = []
        for (const lbl of state.labels || []) {
          let ax = null, ay = null
          if (lbl.anchorIid) { const found = flatGrid.value.find(g => g.cell && g.cell.iid === lbl.anchorIid); if (found) { ax = found.x; ay = found.y } }
          if (ax == null && lbl.anchorX != null && lbl.anchorY != null) { ax = lbl.anchorX; ay = lbl.anchorY }
          if (ax == null) continue
          // Only include labels whose anchor is on this tab; skip floating unanchored labels.
          if (!cellKeySet.has(`${ax},${ay}`)) continue
          exportLabels.push({ dxCell: ax - minX, dyCell: ay - minY, dx2: (lbl.x2 != null ? lbl.x2 : ax * 2) - minX * 2, dy2: (lbl.y2 != null ? lbl.y2 : ay * 2) - minY * 2, label: { ...lbl } })
        }
        const preview = await generateGridPreview(tabId, false)
        const payload = encodePayload({ type: 'tab', tabId, tabLabel, URLVersion: 1, cells: exportCells, labels: exportLabels })
        const bytes = dataUrlToBytes(await writeStegoText(await addWatermark(preview), 'plateup-v2-export', payload))
        let modified = writePngText(bytes, 'plateup-v2-export', payload)
        try { modified = writePngDpi(modified, 300) } catch (e) {}
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
        if (cells.length === 0) { await alert('No appliances to export.'); return }
        const exportCells = cells.map(({ x, y, cell }) => ({
          dx: x - minX, dy: y - minY,
          cell: { applianceId: cell.applianceId, rotation: cell.rotation ?? 0, extraData: cell.extraData ?? 0, tabIds: [] }
        }))
        const allCellKeySet = new Set(cells.map(({ x, y }) => `${x},${y}`))
        const exportLabels = []
        for (const lbl of state.labels || []) {
          let ax = null, ay = null
          if (lbl.anchorIid) { const found = flatGrid.value.find(g => g.cell && g.cell.iid === lbl.anchorIid); if (found) { ax = found.x; ay = found.y } }
          if (ax == null && lbl.anchorX != null && lbl.anchorY != null) { ax = lbl.anchorX; ay = lbl.anchorY }
          if (ax == null) { if (lbl.x2 != null && lbl.y2 != null) { exportLabels.push({ dxCell: Math.floor(lbl.x2 / 2) - minX, dyCell: Math.floor(lbl.y2 / 2) - minY, dx2: lbl.x2 - minX * 2, dy2: lbl.y2 - minY * 2, label: { ...lbl } }) }; continue }
          // Only include anchored labels whose anchor cell is in the all-tabs set.
          if (!allCellKeySet.has(`${ax},${ay}`)) continue
          exportLabels.push({ dxCell: ax - minX, dyCell: ay - minY, dx2: (lbl.x2 != null ? lbl.x2 : ax * 2) - minX * 2, dy2: (lbl.y2 != null ? lbl.y2 : ay * 2) - minY * 2, label: { ...lbl } })
        }
        const preview = await generateGridPreview(null, false)
        const payload = encodePayload({ type: 'all-tabs', URLVersion: 1, cells: exportCells, labels: exportLabels })
        const bytes = dataUrlToBytes(await writeStegoText(await addWatermark(preview), 'plateup-v2-export', payload))
        let modified = writePngText(bytes, 'plateup-v2-export', payload)
        try { modified = writePngDpi(modified, 300) } catch (e) {}
        downloadDataUrl(bytesToDataUrl(modified), `plateup-all-tabs-${exportTimestamp()}.png`)

      } else if (type === 'complete') {
        const preview = await generateGridPreview(null, true)
        const payload = encodePayload({
          type: 'complete',
          roomWidth: state.roomWidth,
          roomHeight: state.roomHeight,
          URLVersion: state.URLVersion,
          walls: state.walls || {},
          tabs: state.tabs,
          gridCells: state.gridCells,
          labels: state.labels || []
        })
        const bytes = dataUrlToBytes(await writeStegoText(await addWatermark(preview), 'plateup-v2-export', payload))
        let modified = writePngText(bytes, 'plateup-v2-export', payload)
        try { modified = writePngDpi(modified, 300) } catch (e) {}
        downloadDataUrl(bytesToDataUrl(modified), `plateup-complete-${exportTimestamp()}.png`)
      }
    }

    // ── Unified import ──────────────────────────────────────────────────────
    const unifiedImportInput = ref(null)
    function triggerUnifiedImport() { unifiedImportInput.value?.click() }

    function hasAnyContent() {
      return state.gridCells.length > 0 || Object.keys(state.walls || {}).length > 0
    }

    async function processImportBytes(bytes) {
        // ── Try new unified format first ──────────────────────────────────
        const v2raw = readPngText(bytes, 'plateup-v2-export') || await readStegoFromBytes(bytes, 'plateup-v2-export')
        if (v2raw) {
          const payload = decodePayload(v2raw)
          const { type } = payload

          if (type === 'tab' || type === 'all-tabs') {
            if (state.activeTabId === 'complete' || state.activeTabId === 'structure') {
              await alert('Switch to a coloured tab before importing appliances.')
              return
            }
            let { cells, labels, URLVersion } = payload
            if (!Array.isArray(cells) || cells.length === 0) { await alert('No appliance data found in this file.'); return }
            // If this payload uses internal IDs (v0), convert to GameIDs before pasting
            if (!URLVersion || URLVersion === 0) {
              const raw = await convertCellsToGameId(cells.map(c => ({ ...c.cell, _dx: c.dx, _dy: c.dy })))
              if (raw) cells = raw.map(c => { const { _dx, _dy, ...cell } = c; return { dx: _dx, dy: _dy, cell } })
            }
            // Ensure v0->GameID conversion done above, then always canonicalize mapped GameIDs
            try { cells = await canonicalizeV1Cells(cells) } catch (e) { /* ignore */ }
            const requiredMods = await enableSessionModsForCells(cells)
            if (requiredMods.length) {
              const lines = requiredMods.map(mod => `- ${mod.description || mod.itemDescription || `SteamID ${mod.steamId}`}`)
              await alert([
                'This design needs mod content that is currently disabled.',
                'Those mod packs have been temporarily enabled for this session only:',
                ...lines,
                '',
                'You can permanently enable them in Settings > MODs.'
              ].join('\n'))
            }
            await startPasteFromCells({ cells, labels: labels || [] })
            return
          }

          if (type === 'structure') {
            const { roomWidth, roomHeight, walls } = payload
            if (!roomWidth || !roomHeight) { await alert('Invalid structure data.'); return }
            if (roomWidth !== state.roomWidth || roomHeight !== state.roomHeight) {
              await alert(`Cannot import: structure is ${roomWidth}×${roomHeight} but current room is ${state.roomWidth}×${state.roomHeight}.\nResize the room to match before importing.`)
              return
            }
            const hasWalls = Object.keys(state.walls || {}).length > 0
            if (hasWalls && !(await confirm('This will replace all current structure (walls/doors). Would you like to continue?'))) return
            state.walls = walls || {}
            return
          }

          if (type === 'complete') {
            const { roomWidth, roomHeight, URLVersion, walls, tabs, gridCells, labels } = payload
            if (!roomWidth || !roomHeight) { await alert('Invalid complete export data.'); return }
            const dimChanged = roomWidth !== state.roomWidth || roomHeight !== state.roomHeight
            const dimNote = dimChanged ? `\n\nNote: the room will also be resized from ${state.roomWidth}×${state.roomHeight} to ${roomWidth}×${roomHeight}.` : ''
            if (hasAnyContent() && !(await confirm(`This will replace ALL current structure and appliances. All your current design will be lost.${dimNote}\n\nWould you like to continue?`))) return
            state.roomWidth = roomWidth
            state.roomHeight = roomHeight
            state.URLVersion = URLVersion ?? 0
            state.walls = walls || {}
            state.tabs = tabs || JSON.parse(JSON.stringify([{ id: 'complete', label: 'Preview' }, { id: 'structure', label: 'Structure' }, { id: 'main', label: 'Base' }]))
            state.gridCells = gridCells || []
            state.labels = labels || []
            // Switch to first user tab
            const firstUserTab = state.tabs.find(t => t.id !== 'complete' && t.id !== 'structure')
            state.activeTabId = firstUserTab?.id ?? 'main'
            // Rebuild the internal grid from the new state
            await loadGridFromState()
            const requiredMods = await enableSessionModsForCells(state.gridCells)
            if (requiredMods.length) {
              const lines = requiredMods.map(mod => `- ${mod.description || mod.itemDescription || `SteamID ${mod.steamId}`}`)
              await alert([
                'This design needs mod content that is currently disabled.',
                'Those mod packs have been temporarily enabled for this session only:',
                ...lines,
                '',
                'You can permanently enable them in Settings > MODs.'
              ].join('\n'))
            }
            // Fit viewport to the newly loaded room size
            nextTick(() => window.dispatchEvent(new Event('plateup-rezoom')))
            return
          }

          await alert('Unknown export type in this file.')
          return
        }

        // ── Backward compat: legacy plateup-design (treat as all-tabs) ────
        const legacyDesign = readPngText(bytes, 'plateup-design')
        if (legacyDesign) {
          if (state.activeTabId === 'complete' || state.activeTabId === 'structure') {
            await alert('Switch to a coloured tab before importing appliances.')
            return
          }
          const parsed = decodeState(legacyDesign)
          if (!parsed?.gridCells?.length) { await alert('Invalid or empty design data.'); return }
          let minX = Infinity, minY = Infinity
          for (const c of parsed.gridCells) { if (c.x < minX) minX = c.x; if (c.y < minY) minY = c.y }
          // Legacy format uses internal IDs — convert to GameIDs
          const rawCells = parsed.gridCells.map(c => ({ applianceId: c.applianceId, rotation: c.rotation ?? 0, extraData: c.extraData ?? 0, _dx: c.x - minX, _dy: c.y - minY }))
          const rawConverted = await convertCellsToGameId(rawCells)
          let convertedCells = (rawConverted ?? rawCells).map(c => {
            const { _dx, _dy, ...cell } = c
            return { dx: _dx, dy: _dy, cell: { ...cell, tabIds: [] } }
          })
          try { convertedCells = await canonicalizeV1Cells(convertedCells) } catch (e) { /* ignore */ }
          const requiredMods = await enableSessionModsForCells(convertedCells)
          if (requiredMods.length) {
            const lines = requiredMods.map(mod => `- ${mod.description || mod.itemDescription || `SteamID ${mod.steamId}`}`)
            await alert([
              'This design needs mod content that is currently disabled.',
              'Those mod packs have been temporarily enabled for this session only:',
              ...lines,
              '',
              'You can permanently enable them in Settings > MODs.'
            ].join('\n'))
          }
          await startPasteFromCells(convertedCells)
          return
        }

        // ── Backward compat: legacy plateup-structure ─────────────────────
        const legacyStructure = readPngText(bytes, 'plateup-structure')
        if (legacyStructure) {
          const { roomWidth, roomHeight, walls } = decodePayload(legacyStructure)
          if (!roomWidth || !roomHeight) { await alert('Invalid structure data.'); return }
          if (roomWidth !== state.roomWidth || roomHeight !== state.roomHeight) {
            await alert(`Cannot import: structure is ${roomWidth}×${roomHeight} but current room is ${state.roomWidth}×${state.roomHeight}.\nResize the room to match before importing.`)
            return
          }
          const hasWalls = Object.keys(state.walls || {}).length > 0
          if (hasWalls && !(await confirm('This will replace all current structure (walls/doors). Would you like to continue?'))) return
          state.walls = walls || {}
          return
        }

        // ── Blueprint file ────────────────────────────────────────────────
        if (readPngText(bytes, 'plateup-blueprint')) {
          await alert('This is a blueprint file — use Import Blueprint in the Blueprints palette tab.')
          return
        }

        await alert('No PlateUp Tool export data found in this image.')
    }

    async function handleUnifiedImport(event) {
      const file = event.target.files?.[0]
      if (!file) return
      event.target.value = ''
      try {
        const bytes = await readFileAsBytes(file)
        await processImportBytes(bytes)
      } catch (e) {
        await alert('Failed to read import file: ' + e.message)
      }
    }

    async function importFromClipboard() {
      closeExportMenu()
      try {
        const clipItems = await navigator.clipboard.read()
        let pngBlob = null
        for (const item of clipItems) {
          if (item.types.includes('image/png')) {
            pngBlob = await item.getType('image/png')
            break
          }
        }
        if (!pngBlob) {
          await alert('No PNG image found in clipboard.\nCopy a PlateUp Tool export image first.')
          return
        }
        const bytes = new Uint8Array(await pngBlob.arrayBuffer())
        await processImportBytes(bytes)
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          await alert('Clipboard access was denied. Please allow clipboard access and try again.')
        } else {
          await alert('Failed to read from clipboard: ' + e.message)
        }
      }
    }

    // ── Seed import helpers ───────────────────────────────────────────────
    const seedValue = ref('')
    const seedStatus = ref('')
    const seedLoading = ref(false)
    const seedClearTimer = ref(null)
    const seeds = ref([])
    const seedSuggestionsOpen = ref(false)
    const selectedSuggestionIndex = ref(-1)
    const seedInput = ref(null)
    const seedWrapper = ref(null)
    const seedSuggestionStyle = ref({ position: 'fixed', top: '-9999px', left: '0px', width: '120px', zIndex: 2000 })
    const seedOpenDirection = ref(null) // 'up' | 'down' | null

    const filteredSeedOptions = computed(() => {
      const q = (seedValue.value || '').trim().toLowerCase()
      if (!q) return seeds.value.slice(0, 20)
      return seeds.value.filter(s => s.id.startsWith(q) || (s.label || '').toLowerCase().includes(q)).slice(0, 20)
    })

    // Reset selected suggestion index when options change
    watch(filteredSeedOptions, (v) => {
      if (!v || v.length === 0) selectedSuggestionIndex.value = -1
      else selectedSuggestionIndex.value = 0
    })

    function setSeedStatus(msg) {
      seedStatus.value = msg
      if (seedClearTimer.value) clearTimeout(seedClearTimer.value)
      seedClearTimer.value = window.setTimeout(() => { seedStatus.value = ''; seedClearTimer.value = null }, 60000)
    }

    function clearSeedStatusNow() {
      seedStatus.value = ''
      if (seedClearTimer.value) { clearTimeout(seedClearTimer.value); seedClearTimer.value = null }
    }

    onUnmounted(() => {
      if (seedClearTimer.value) { clearTimeout(seedClearTimer.value); seedClearTimer.value = null }
      // cleanup global listeners added for suggestion positioning
      try { window.removeEventListener('resize', onWindowScrollOrResize); window.removeEventListener('scroll', onWindowScrollOrResize, true) } catch (_) {}
    })

    onMounted(async () => {
      try {
        const base = import.meta.env.BASE_URL || '/'
        const resp = await fetch(base + 'res/seeds/seeds.json')
        if (resp.ok) {
          const j = await resp.json()
          if (Array.isArray(j)) {
            seeds.value = j.map(x => ({ id: String(x.id || x).toLowerCase(), label: x.label || '' }))
            seeds.value.sort((a, b) => a.id.localeCompare(b.id))
          }
        }
      } catch (e) {
        // ignore
      }
    })

    async function importStructureBytes(bytes) {
      try {
        const v2raw = readPngText(bytes, 'plateup-v2-export') || await readStegoFromBytes(bytes, 'plateup-v2-export')
        if (v2raw) {
          const payload = decodePayload(v2raw)
          const { type } = payload
          if (type === 'structure') {
            const { roomWidth, roomHeight, walls } = payload
            if (!roomWidth || !roomHeight) return { success: false, message: 'Invalid structure data.' }
            if (roomWidth !== state.roomWidth || roomHeight !== state.roomHeight) return { success: false, message: `Cannot import: structure is ${roomWidth}×${roomHeight} but current room is ${state.roomWidth}×${state.roomHeight}.` }
            const hasWalls = Object.keys(state.walls || {}).length > 0
            if (hasWalls && !(await confirm('This will replace all current structure (walls/doors). Would you like to continue?'))) return { success: false, message: 'Import cancelled.' }
            state.walls = walls || {}
            return { success: true, message: 'Structure imported.' }
          }
          if (type === 'complete') {
            const { roomWidth, roomHeight, URLVersion, walls, tabs, gridCells } = payload
            if (!roomWidth || !roomHeight) return { success: false, message: 'Invalid complete export data.' }
            const dimChanged = roomWidth !== state.roomWidth || roomHeight !== state.roomHeight
            const dimNote = dimChanged ? `\n\nNote: the room will also be resized from ${state.roomWidth}×${state.roomHeight} to ${roomWidth}×${roomHeight}.` : ''
            if (hasAnyContent() && !(await confirm(`This will replace ALL current structure and appliances. All your current design will be lost.${dimNote}\n\nWould you like to continue?`))) return { success: false, message: 'Import cancelled.' }
            state.roomWidth = roomWidth
            state.roomHeight = roomHeight
            state.URLVersion = URLVersion ?? 0
            state.walls = walls || {}
            state.tabs = tabs || JSON.parse(JSON.stringify([{ id: 'complete', label: 'Preview' }, { id: 'structure', label: 'Structure' }, { id: 'main', label: 'Base' }]))
            state.gridCells = gridCells || []
            const firstUserTab = state.tabs.find(t => t.id !== 'complete' && t.id !== 'structure')
            state.activeTabId = firstUserTab?.id ?? 'main'
            await loadGridFromState()
            return { success: true, message: 'Complete import applied.' }
          }
        }

        // legacy structure chunk
        const legacyStructure = readPngText(bytes, 'plateup-structure')
        if (legacyStructure) {
          const { roomWidth, roomHeight, walls } = decodePayload(legacyStructure)
          if (!roomWidth || !roomHeight) return { success: false, message: 'Invalid structure data.' }
          if (roomWidth !== state.roomWidth || roomHeight !== state.roomHeight) return { success: false, message: `Cannot import: structure is ${roomWidth}×${roomHeight} but current room is ${state.roomWidth}×${state.roomHeight}.` }
          const hasWalls = Object.keys(state.walls || {}).length > 0
          if (hasWalls && !(await confirm('This will replace all current structure (walls/doors). Would you like to continue?'))) return { success: false, message: 'Import cancelled.' }
          state.walls = walls || {}
          return { success: true, message: 'Structure imported.' }
        }

        return { success: false, message: 'No structure data found in file.' }
      } catch (e) {
        return { success: false, message: 'Failed to parse file: ' + e.message }
      }
    }

    async function loadSeed() {
      clearSeedStatusNow()
      const s = (seedValue.value || '').trim()
      if (!/^[a-z0-9]{1,8}$/.test(s)) { setSeedStatus('Invalid seed — use up to 8 chars: a-z0-9.'); return }
      seedLoading.value = true
      try {
        const base = import.meta.env.BASE_URL || '/'
        const url = base + `res/seeds/${s}.png`
        const resp = await fetch(url)
        if (!resp.ok) {
          setSeedStatus('Unknown seed — submit via Feedback to request adding this seed.')
          return
        }
        const ab = await resp.arrayBuffer()
        const bytes = new Uint8Array(ab)
        const res = await importStructureBytes(bytes)
        if (res.success) setSeedStatus('Seed imported successfully.')
        else {
          if (res.message && res.message.includes('No structure data')) setSeedStatus('Unknown seed — submit via Feedback to request adding this seed.')
          else setSeedStatus(res.message || 'Failed to import seed.')
        }
        // close suggestions after a successful or failed attempt
        seedSuggestionsOpen.value = false
        selectedSuggestionIndex.value = -1
      } catch (e) {
        setSeedStatus('Failed to load seed: ' + e.message)
      } finally {
        seedLoading.value = false
      }
    }

    function onSeedInput(e) {
      // auto-lowercase and trim to maxlength
      const raw = e.target.value || ''
      const lowered = raw.toLowerCase().slice(0, 8)
      seedValue.value = lowered
      clearSeedStatusNow()
      openSeedSuggestions()
      selectedSuggestionIndex.value = -1
    }

    function openSeedSuggestions() {
      seedSuggestionsOpen.value = true
      // update position after DOM renders
      nextTick(updateSeedSuggestionPosition)
    }

    async function updateSeedSuggestionPosition(forceRecalc = false) {
      try {
        await nextTick()
        const inp = seedInput.value || document.querySelector('.seed-controls input')
        const list = document.querySelector('.seed-suggestions')
        if (!inp || !list) return
        const rect = inp.getBoundingClientRect()
        const listH = Math.min(list.scrollHeight || list.offsetHeight || 200, 200)
        const margin = 8
        const style = {
          position: 'fixed',
          left: rect.left + 'px',
          width: rect.width + 'px',
          zIndex: 2000,
        }
        // decide direction: if caller forces recalculation or we don't have a direction yet,
        // compute preferred direction; otherwise honor previous direction unless it no longer fits.
        let dir = seedOpenDirection.value
        if (forceRecalc || !dir) {
          dir = (rect.bottom + listH + margin <= window.innerHeight) ? 'down' : 'up'
        }

        if (dir === 'down') {
          if (rect.bottom + listH + margin <= window.innerHeight) {
            style.top = Math.max(rect.bottom + 2, 0) + 'px'
          } else if (rect.top - listH - 2 >= 0) {
            // flip if it doesn't fit down but fits up
            style.top = rect.top - listH - 2 + 'px'
            dir = 'up'
          } else {
            // clamp into viewport
            style.top = Math.max(window.innerHeight - listH - margin, 8) + 'px'
          }
        } else {
          // dir === 'up'
          if (rect.top - listH - 2 >= 0) {
            style.top = rect.top - listH - 2 + 'px'
          } else if (rect.bottom + listH + margin <= window.innerHeight) {
            // flip if it doesn't fit up but fits down
            style.top = Math.max(rect.bottom + 2, 0) + 'px'
            dir = 'down'
          } else {
            style.top = Math.max(8, rect.top - listH - 2) + 'px'
          }
        }

        seedOpenDirection.value = dir
        seedSuggestionStyle.value = style
      } catch (_) {}
    }

    // update on resize/scroll while open
    function onWindowScrollOrResize() { if (seedSuggestionsOpen.value) nextTick(updateSeedSuggestionPosition) }
    window.addEventListener('resize', onWindowScrollOrResize)
    window.addEventListener('scroll', onWindowScrollOrResize, true)

    function applySuggestion(s, idx = -1) {
      seedValue.value = s.id
      seedSuggestionsOpen.value = false
      selectedSuggestionIndex.value = -1
      clearSeedStatusNow()
    }

    // keep position when options change (typing)
    watch(filteredSeedOptions, () => {
      if (seedSuggestionsOpen.value) nextTick(() => updateSeedSuggestionPosition(false))
    })

    function onSeedBlur() {
      // defer closing so click handlers on suggestions can fire
      setTimeout(() => { seedSuggestionsOpen.value = false }, 120)
    }

    function onSeedKeydown(e) {
      if (!seedSuggestionsOpen.value) {
        if (e.key === 'ArrowDown') openSeedSuggestions()
        else if (e.key === 'Enter') { e.preventDefault(); loadSeed(); }
        return
      }
      const len = filteredSeedOptions.value.length
      if (len === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        selectedSuggestionIndex.value = (selectedSuggestionIndex.value + 1) % len
        scrollSuggestionIntoView()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        selectedSuggestionIndex.value = (selectedSuggestionIndex.value - 1 + len) % len
        scrollSuggestionIntoView()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const s = filteredSeedOptions.value[selectedSuggestionIndex.value]
        if (s) applySuggestion(s, selectedSuggestionIndex.value)
        else loadSeed()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        seedSuggestionsOpen.value = false
      }
    }

    function scrollSuggestionIntoView() {
      // try to keep highlighted suggestion visible
      nextTick(() => {
        try {
          const list = document.querySelector('.seed-suggestions')
          if (!list) return
          const active = list.querySelector('.seed-suggestion.active')
          if (active) active.scrollIntoView({ block: 'nearest' })
        } catch (_) {}
      })
    }

    return { state, filteredPalette, addToGrid, hoverLabel, addAllToGrid, cutToClipboard, copyToClipboard, startPaste, removeSelected, viewportBoxHeight, isStructureMode, selectedStructureTool, setStructureTool, structureTools, isPreviewTab, inventoryList, inventoryTotal, isImageIcon, onPaletteItemClick, onPaletteItemPointerDown, rightPanelStyle, paletteGridStyle,
      showInventoryIcons,
      tabsHidden,
      // blueprints
      paletteTab, blueprintFilter, filteredBlueprints, createBlueprint, applyBlueprint, deleteBlueprint, onBlueprintPointerDown,
      blueprintDialogVisible, blueprintDialogInitial, onBlueprintDialogConfirm, closeBlueprintDialog,
      exportBlueprint, handleBlueprintImport, triggerBlueprintImport, blueprintImportInput,
      bpDragOver, onBpDragOver, onBpDragLeave, onBpFileDrop,
      // blueprint context menu
      bpContextMenuVisible, bpContextMenuBp, openBpContextMenu, closeBpContextMenu,
      bpCtxShareClipboard, bpCtxShareFile, bpCtxDelete,
      // unified export/import
      unifiedImportInput, triggerUnifiedImport, handleUnifiedImport,
      exportMenuVisible, exportMenuPos, showExportMenu, closeExportMenu, doExport, doExportClipboard,
      loadFromMenu, copyLinkFromMenu, importFromClipboard,
      // selection export
      hasNonGhostSelection, exportSelectedToFile, exportSelectedToClipboard,
      // seed UI
      seedValue, seedStatus, seedLoading, loadSeed, onSeedInput,
      seeds, filteredSeedOptions, seedSuggestionsOpen, applySuggestion,
      selectedSuggestionIndex, onSeedKeydown, onSeedBlur, openSeedSuggestions, seedSuggestionStyle,
      // zoom helper
      resetZoom,
      // bottom-bar toolbox invoke
      bbInvoke,
      // bottom-bar mode flag
      bottomBarMode,
      // bottom-bar scroll chevrons
      bbScrollEl, canScrollLeft, canScrollRight, updateScrollChevrons, scrollPalette,
      // bottom-bar search
      bbSearchQuery, bbSearchInputText, bbSearchDialogVisible, bbSearchInputEl,
      bbFilteredPalette, openBbSearch, bbSearchConfirm, bbSearchCancel, clearBbSearch,
      // bottom-bar inventory modal
      bbInventoryVisible, bbInvListEl, bbInvCanScrollUp, bbInvCanScrollDown,
      openBbInventory, closeBbInventory, scrollInvList, updateInvScrollChevrons,
      // palette toolbox state removed (handled in App)
      bbInvoke,
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

/* ensure absolute-positioned toolbox anchors to the right-panel */
.right-panel { position: relative }
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

/* Palette toolbox moved to App.vue */
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
  touch-action: pan-y;
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
  touch-action: pan-y;
}
/* Prevent text selection inside palette items to avoid drag visual issues */
.palette-item, .palette-item * {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
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
.palette-status-bar {
  height: 1.4em;
  flex-shrink: 0;
  font-size: 0.82rem;
  color: #3a5070;
  padding: 2px 6px;
  background: #eef3fa;
  border: 1px solid #c8d6e8;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Zoom slider placed below the palette status bar (no text label) */
.palette-zoom-row { margin-top: 6px; display:flex; align-items:center; gap:8px }
.palette-zoom-icon { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; flex:0 0 20px; cursor: pointer }
.palette-zoom-icon svg path { stroke: #3a5070 }
.palette-zoom-icon:hover svg path { stroke: #1f79ff }
.palette-zoom { width: 100%; height: 26px }
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
/* Disabled context menu item state */
.context-menu-item.disabled { opacity: 0.45; pointer-events: none }
.bp-import-btn:hover { background: #e8f0ff; border-color: #1f79ff }
.bp-drop-zone {
  display: contents;
}
.bp-drop-zone.bp-drag-over {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  border: 2px dashed #4a90d9;
  border-radius: 6px;
  background: #f0f6ff;
  padding: 4px;
}
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
.bp-delete-btn {
  position: absolute;
  bottom: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 3px;
  background: rgba(160, 30, 20, 0.55);
  color: white;
  font-size: 11px;
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
.blueprint-item:hover .bp-delete-btn { opacity: 1 }

/* ── Blueprint long-press context menu ───────────────────────────────────── */
.bp-ctx-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12, 18, 28, 0.52);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 20001;
  padding-bottom: 84px;
}
.bp-ctx-dialog {
  background: #fff;
  border-radius: 16px;
  padding: 8px;
  width: min(340px, calc(100vw - 28px));
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 2px;
  user-select: none;
  -webkit-user-select: none;
}
.bp-ctx-title {
  font-size: 13px;
  font-weight: 700;
  color: #6b7a8d;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 14px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bp-ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 15px;
  color: #17202a;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s;
}
.bp-ctx-item:hover, .bp-ctx-item:active { background: rgba(31,121,255,0.07); }
.bp-ctx-icon {
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}
.bp-ctx-item-danger { color: #c0392b; }
.bp-ctx-item-danger:hover, .bp-ctx-item-danger:active { background: rgba(192,57,43,0.07); }
.bp-ctx-divider {
  height: 1px;
  background: #e8eef5;
  margin: 4px 8px;
}
.bp-ctx-cancel {
  margin-top: 4px;
  padding: 13px 16px;
  border: none;
  border-radius: 10px;
  background: #f0f4f8;
  color: #4a6078;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s;
}
.bp-ctx-cancel:hover, .bp-ctx-cancel:active { background: #e2e8f0; }


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
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.blueprint-preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  -webkit-touch-callout: none;
  pointer-events: none;
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
  -webkit-touch-callout: none;
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
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  padding-right: 4px;
  touch-action: pan-y;
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
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='24' viewBox='0 0 12 24'%3E%3Ccircle cx='6' cy='6' r='5' fill='%23555'/%3E%3Ccircle cx='6' cy='18' r='5' fill='%23555'/%3E%3C/svg%3E") center/12px 24px repeat;
  border: 1px solid #555;
}
.swatch-door  { background: #c8860a }
.swatch-nothing { background: transparent; border: 2px solid #bfc9d8; box-sizing: border-box }
.tool-name { font-weight: 600; font-size: 15px; color: #222 }
.tool-desc { font-size: 12px; color: #777; margin-top: 2px }
.structure-hint {
  font-size: 11px;
  color: #999;
  font-style: italic;
  text-align: center;
  padding-top: 4px;
}

/* ---- Seed loader (structure tab) ---- */
.seed-row {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.seed-header {
  font-weight: 800;
  font-size: 14px;
  color: #2b4758;
}
.seed-controls {
  display: flex;
  gap: 8px;
}
.seed-controls input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #cbd6e5;
  border-radius: 6px;
}
.seed-controls button {
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  background: #1f79ff;
  color: white;
  cursor: pointer;
}
.dark .seed-row {
  border-color: #2b3442;
  background: #0f1620;
}
.dark .seed-header { color: #d6e6ff }
.dark .seed-controls input { background: #0c1117; color: #dbe9ff; border-color: #2b3442 }
.dark .seed-controls button { background: #2c7bff }
.dark .seed-hint { color: #94a6bd }
.dark .seed-status { color: #cfe3ff }
.seed-hint { font-size: 11px; color: #8a9ab0 }
.seed-status { font-size: 12px; color: #334; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace; font-size: 11px }

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
.inv-canvas { width: 36px; height: 36px; display: block; flex-shrink: 0; }
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
  background: linear-gradient(180deg,#ffffff,#fbfdff);
  border: 1px solid rgba(31,121,255,0.06);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(17,22,34,0.28);
  padding: 6px;
  min-width: 220px;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
}
.context-menu-group-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #55606a;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 14px 6px;
}
.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  color: #17202a;
  border-radius: 8px;
  transition: background 0.12s, transform 0.06s;
}
.context-menu-item .icon {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0.95;
}
.context-menu-item:hover {
  background: rgba(31,121,255,0.06);
}
.context-menu-item:active { transform: translateY(1px) }
.context-menu-item:focus { outline: none; box-shadow: inset 0 0 0 2px rgba(31,121,255,0.08) }
.context-menu-cancel {
  display: block;
  margin-top: 8px;
  padding: 10px 14px;
  color: #6b7280;
  border-radius: 8px;
  border-top: 1px solid #eef3f8;
  background: linear-gradient(180deg,#fff,#fbfdff);
  text-align: center;
}
.context-menu-cancel:hover { background: rgba(0,0,0,0.02) }

/* subtle separators between groups */
.context-menu-sep { height: 8px }

/* Seed suggestion dropdown */
.seed-suggestions {
  /* positioning is set dynamically via inline styles */
  background: #fff;
  border: 1px solid #d9e3ef;
  max-height: 200px;
  overflow: auto;
}
.seed-suggestion {
  padding: 6px 8px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
}
.seed-suggestion:hover { background: #f3f6fb; }
.seed-suggestion .suggest-id { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace }
.seed-suggestion .suggest-label { color: #6b7a8d; font-size: 12px }
.seed-suggestion.active { background: #e8f4ff; outline: 1px solid rgba(31,121,255,0.12) }

/* Dark mode for suggestions */
.dark .seed-suggestions {
  background: #071029;
  border-color: #19314a;
}
.dark .seed-suggestion { color: #dbe9ff }
.dark .seed-suggestion:hover { background: #0b2a46 }
.dark .seed-suggestion.active { background: #123a6b; outline-color: rgba(90,140,255,0.18) }

/* ── Bottom-bar search button ────────────────────────────────────────────── */
.bb-search-item {
  border-color: #b0cce8;
  background: #eef5ff;
}
.bb-search-item:hover {
  background: #daeaff !important;
  border-color: #1f79ff !important;
}
.bb-search-svg {
  width: 32px;
  height: 32px;
  display: block;
  flex-shrink: 0;
  color: #1e5faa;
}
.bb-search-active {
  border-color: #e89030 !important;
  background: #fff6ec !important;
}
.bb-search-active:hover {
  background: #ffecd8 !important;
  border-color: #cc6a00 !important;
}
.bb-search-active .bb-search-svg {
  color: #c45a00;
}
.bb-search-cancel-icon {
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}
.bb-search-svg-sm {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
.bb-search-clear-text {
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  color: #b85000;
}
.bb-search-active-term {
  color: #b85000 !important;
  font-style: italic;
  font-weight: 600;
}

/* ── Bottom-bar search dialog ─────────────────────────────────────────────── */
.bb-search-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12, 18, 28, 0.52);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 20001;
  padding-bottom: 84px;
}
.bb-search-dialog {
  background: #fff;
  border-radius: 16px;
  padding: 20px 18px 16px;
  width: min(380px, calc(100vw - 28px));
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bb-search-dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16px;
  color: #1a2a3a;
  letter-spacing: -0.01em;
}
.bb-search-dialog-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: #1f79ff;
}
.bb-search-dialog-input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 14px;
  border: 1.5px solid #c0cfe0;
  border-radius: 10px;
  font-size: 16px;
  outline: none;
  color: #1a2a3a;
  background: #f8fbff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.bb-search-dialog-input:focus {
  border-color: #1f79ff;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(31, 121, 255, 0.13);
}
.bb-search-dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.bb-search-btn-cancel {
  padding: 9px 18px;
  border: 1.5px solid #d0dcea;
  border-radius: 9px;
  background: #f4f7fb;
  color: #4a6078;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.bb-search-btn-cancel:hover { background: #e8eef6; border-color: #b8c8da; }
.bb-search-btn-confirm {
  padding: 9px 20px;
  border: none;
  border-radius: 9px;
  background: #1f79ff;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s, opacity 0.12s;
  letter-spacing: -0.01em;
}
.bb-search-btn-confirm:hover:not(:disabled) { background: #0e65e0; }
.bb-search-btn-confirm:disabled { opacity: 0.38; cursor: default; }

/* ── Bottom-bar inventory modal ─────────────────────────────────────────── */
.bb-tab-inv {
  flex: 1; max-width: 130px;
  background: transparent; border: none; cursor: pointer;
  font-size: 11px; font-weight: 700; color: #6b7a8d;
  text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color 0.1s;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
.bb-tab-inv:hover { color: #3a5070; }
.bb-inv-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12, 18, 28, 0.52);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 20001;
  padding-bottom: 84px;
}
.bb-inv-dialog {
  background: #fff;
  border-radius: 16px;
  width: min(420px, calc(100vw - 28px));
  max-height: min(80dvh, calc(100dvh - 96px));
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.bb-inv-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.bb-inv-title {
  font-weight: 700;
  font-size: 16px;
  color: #1a2a3a;
  letter-spacing: -0.01em;
  flex: 1;
}
.bb-inv-total-badge {
  background: #e8f0fe;
  color: #1a56db;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 12px;
  flex-shrink: 0;
}
.bb-inv-close {
  border: none;
  background: #f0f4f8;
  color: #5a6a7a;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s;
}
.bb-inv-close:hover { background: #dde5ef; }
.bb-inv-scroll-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.bb-inv-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: #b0c4d8 transparent;
}
.bb-inv-list::-webkit-scrollbar { width: 6px; }
.bb-inv-list::-webkit-scrollbar-track { background: transparent; }
.bb-inv-list::-webkit-scrollbar-thumb { background: #b0c4d8; border-radius: 3px; }
.bb-inv-chevron {
  width: 100%;
  height: 28px;
  flex-shrink: 0;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #3a5a80;
  z-index: 2;
  touch-action: manipulation;
}
.bb-inv-chevron-up {
  background: linear-gradient(to bottom, rgba(255,255,255,1) 40%, transparent);
  order: -1;
}
.bb-inv-chevron-down {
  background: linear-gradient(to top, rgba(255,255,255,1) 40%, transparent);
}

/* dark mode for inventory modal */
html.dark .inventory-icon { background: #121e30; border-color: #1e3050; }
html.dark .inventory-row:hover { background: #0e1c2e; }
html.dark .inventory-panel { background: #0d1b2e; border-color: #1d2e42; }
html.dark .inventory-header { border-bottom-color: #1d2e42; }
html.dark .inventory-title { color: #dbe9ff; }
html.dark .inventory-total-badge { background: #0e2a50; color: #6aabff; }
html.dark .inventory-name { color: #c8dcf0; }
html.dark .inventory-multiply { color: #4a6a88; }
html.dark .inventory-empty { color: #4a6a88; }
html.dark .bb-inv-dialog { background: #0d1b2e; }
html.dark .bb-inv-header { border-bottom-color: #1d2e42; }
html.dark .bb-inv-title { color: #dbe9ff; }
html.dark .bb-inv-total-badge { background: #0e2a50; color: #6aabff; }
html.dark .bb-inv-close { background: #152840; color: #8ab0d0; }
html.dark .bb-inv-close:hover { background: #1e3655; }
html.dark .bb-inv-list { scrollbar-color: #2a4a68 transparent; }
html.dark .bb-inv-list::-webkit-scrollbar-thumb { background: #2a4a68; }
html.dark .bb-inv-chevron { color: #5a9aff; }
html.dark .bb-inv-chevron-up { background: linear-gradient(to bottom, rgba(13,27,46,1) 40%, transparent); }
html.dark .bb-inv-chevron-down { background: linear-gradient(to top, rgba(13,27,46,1) 40%, transparent); }

/* ── Bottom-bar mode (< 640 px) ─────────────────────────────────────────── */
.right-panel.bottom-bar-mode {
  /* Positioning is handled by .bottom-bar-wrapper in App.vue */
  width: 100%;
  height: 100%;
  background: #fff;
  border-top: 2px solid #c8d6e8;
  border-radius: 0 0 10px 10px;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  padding: 0;
  gap: 0;
  overflow: hidden;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.1);
}
.bb-wrap { display: flex; flex-direction: column; width: 100%; height: 100%; }
.bb-tabs {
  display: flex; flex-direction: row; align-items: stretch;
  height: 26px; flex-shrink: 0;
  border-bottom: 1px solid #e0e8f0;
}
.bb-tab {
  flex: 1; max-width: 130px;
  background: transparent; border: none; cursor: pointer;
  font-size: 11px; font-weight: 700; color: #6b7a8d;
  text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color 0.1s;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
.bb-tab.bb-tab-active { color: #1f79ff; border-bottom-color: #1f79ff; }
.bb-tab:not(.bb-tab-active):hover { color: #3a5070; }
.bb-tab-label {
  display: flex; align-items: center; padding: 0 10px;
  font-size: 11px; font-weight: 700; color: #6b7a8d;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.bb-scroll-wrap {
  flex: 1; min-height: 0;
  position: relative;
  display: flex; flex-direction: row; align-items: stretch;
  overflow: hidden;
}
.bb-scroll {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  align-items: center; overflow-x: auto; overflow-y: hidden;
  gap: 3px; padding: 4px 6px;
  scrollbar-width: none;
  touch-action: pan-x;
}
.bb-scroll::-webkit-scrollbar { display: none }
.bb-chevron {
  position: absolute; top: 0; bottom: 0; width: 32px; z-index: 2;
  border: none; cursor: pointer;
  display: flex; align-items: center;
  font-size: 22px; color: #3a5a80; line-height: 1; padding: 0;
  touch-action: manipulation;
}
.bb-chevron-left { left: 0; justify-content: flex-start; padding-left: 6px; background: linear-gradient(to right, rgba(255,255,255,0.95) 60%, transparent); }
.bb-chevron-right { right: 0; justify-content: flex-end; padding-right: 6px; background: linear-gradient(to left, rgba(255,255,255,0.95) 60%, transparent); }
.bb-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 58px; flex-shrink: 0; height: 74px; cursor: pointer; border-radius: 6px;
  padding: 0 2px; border: 1px solid transparent;
  transition: background 0.1s, border-color 0.1s;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: manipulation;
}
/* pan-x lets horizontal swipes scroll the palette; vertical drags still fire pointer events for drag-to-place */
.bb-item:not(.bb-tool-btn) { touch-action: pan-x; }
.bb-item:hover, .bb-item.bb-item-active { background: #eef4ff; border-color: #b0ccee; }
.bb-item-add { border: 1px dashed #9ab0cc; background: #f5f8ff; }
.bb-item-add:hover { background: #e8f0ff; border-color: #1f79ff; }
.bb-icon {
  width: 58px; height: 58px; display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}
.bb-icon img, .bb-bp-img { width: 100%; height: 100%; object-fit: contain; display: block; -webkit-touch-callout: none; pointer-events: none; }
.bb-icon-add { background: transparent; }
.bb-icon-add span { font-size: 32px; font-weight: 300; color: #6b9fd4; line-height: 1; }
.bb-icon-placeholder { font-size: 24px; }
.bb-canvas { width: 58px; height: 58px; display: block; }
.bb-label {
  font-size: 9px; text-align: center; width: 56px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; color: #3a5070; line-height: 1.2; margin-top: 2px;
}
.bb-swatch { width: 28px; height: 28px; border-radius: 4px; flex-shrink: 0; margin-bottom: 4px; }
.bb-preview-msg {
  display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;
  font-size: 11px; color: #6b7a8d; font-style: italic; padding: 0 12px;
  white-space: normal; text-align: center;
}
.bb-preview-title { font-weight: 700; font-style: normal; color: #3a5070; font-size: 11px; }
.bb-preview-sub { font-size: 11px; color: #6b7a8d; font-style: italic; margin-top: 2px }

/* Preview action: inventory button + message */
.bb-preview-action {
  display: flex; align-items: center; gap: 8px; flex: 1; padding: 0 8px;
}
.bb-inv-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f2f7ff 100%);
  border: 1px solid #d6e6fb; color: #154fbd;
  padding: 8px 10px; border-radius: 10px; font-weight: 700; font-size: 12px;
  box-shadow: 0 6px 18px rgba(31,121,255,0.12);
  cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
.bb-inv-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(31,121,255,0.16); }
.bb-inv-btn { font-size: 13px }

/* Dark mode adjustments */
html.dark .bb-inv-btn { background: linear-gradient(180deg, #0f1a2a 0%, #0c1524 100%); border-color: #20314a; color: #7fb1ff; box-shadow: 0 6px 18px rgba(10,20,36,0.4); }
html.dark .bb-inv-btn svg { color: #7fb1ff; }
html.dark .bb-inv-btn-label { color: #7fb1ff; }
.bb-tool-btn {
  background: none;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.bb-tool-char {
  font-size: 26px; line-height: 1;
}
.bb-tool-svg {
  width: 28px; height: 28px; display: block; color: #3a5070;
}
html.dark .bb-tool-svg { color: #9aaabe; }
html.dark .bb-tool-char { color: #9aaabe; }

/* ── Bottom-bar large-icon mode (≥520px viewport)
   Inside scoped block so specificity matches the base bb-* rules above.
   Toolbox items (bb-tool-btn) stay at the original small size. ── */
@media (min-width: 520px) and (min-height: 700px) {
  /* Appliances: 2-row grid with larger icons, no vertical padding */
  .bb-scroll-appliances {
    display: grid;
    grid-template-rows: repeat(2, 78px);
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    align-items: center;
    padding-top: 0;
    padding-bottom: 0;
  }
  .bb-item-appliance {
    width: 74px;
    height: 78px;
    padding: 0 2px;
  }
  .bb-item-appliance .bb-icon { width: 64px; height: 64px; }
  .bb-item-appliance .bb-canvas { width: 64px; height: 64px; }
  .bb-item-appliance .bb-label { font-size: 10px; width: 72px; }
  /* Blueprints (non-appliance, non-tool items) keep larger icons */
  .bb-item:not(.bb-tool-btn):not(.bb-item-appliance):not(.bb-item-structure) {
    width: 116px;
    height: 148px;
  }
  .bb-item:not(.bb-tool-btn):not(.bb-item-appliance):not(.bb-item-structure) .bb-icon {
    width: 108px;
    height: 108px;
  }
  .bb-item:not(.bb-tool-btn):not(.bb-item-appliance):not(.bb-item-structure) .bb-canvas { width: 108px; height: 108px; }
  .bb-item:not(.bb-tool-btn):not(.bb-item-appliance):not(.bb-item-structure) .bb-label {
    font-size: 18px;
    width: 112px;
  }
  .bb-icon-add span { font-size: 78px; }
  .bb-icon-placeholder { font-size: 58px; }
  /* Search item scales with appliance items in large-icon mode */
  .bb-item.bb-search-item .bb-search-svg { width: 42px; height: 42px; }
  .bb-item.bb-search-item .bb-search-svg-sm { width: 30px; height: 30px; }
  .bb-item.bb-search-item .bb-search-clear-text { font-size: 10px; }
  .bb-item.bb-search-item .bb-search-active-term { font-size: 10px; }
}
</style>

<style>
@media (max-width: 1100px) {
  .palette-zoom-row { display: none !important }
  .palette-status-bar { display: none !important }
}

/* ── Bottom-bar dark-mode overrides (global, since .right-panel is scoped) ── */
html.dark .right-panel.bottom-bar-mode { background: #1c2030; border-top-color: #2e3a52; box-shadow: 0 -2px 12px rgba(0,0,0,0.3); }
html.dark .bb-tabs { border-bottom-color: #2e3a52; }
html.dark .bb-tab, html.dark .bb-tab-label { color: #6a7a94; }
html.dark .bb-tab.bb-tab-active { color: #5a9aff; border-bottom-color: #5a9aff; }
html.dark .bb-tab:not(.bb-tab-active):hover { color: #9aaabe; }
html.dark .bb-chevron-left { background: linear-gradient(to right, rgba(28,32,48,0.95) 60%, transparent); color: #5a9aff; }
html.dark .bb-chevron-right { background: linear-gradient(to left, rgba(28,32,48,0.95) 60%, transparent); color: #5a9aff; }
html.dark .bb-item:hover, html.dark .bb-item.bb-item-active { background: #1a2840; border-color: #3a5a88; }
html.dark .bb-item-add { background: #141926; border-color: #2a3a54; }
html.dark .bb-item-add:hover { background: #1a2840; border-color: #3a5a88; }
html.dark .bb-label { color: #7a9ab0; }
html.dark .bb-preview-msg { color: #6a8aaa; }

/* ── Bottom-bar search — dark mode ──────────────────────────────────────── */
html.dark .bb-search-item { border-color: #2a4870 !important; background: #0e1b2e !important; }
html.dark .bb-search-item:hover { background: #142236 !important; border-color: #3a70c8 !important; }
html.dark .bb-search-item .bb-search-svg { color: #7ab4ff; }
html.dark .bb-search-active { border-color: #8a5200 !important; background: #1c1200 !important; }
html.dark .bb-search-active:hover { background: #241600 !important; border-color: #c87000 !important; }
html.dark .bb-search-active .bb-search-svg { color: #e08020; }
html.dark .bb-search-clear-text { color: #e08020; }
html.dark .bb-search-active-term { color: #e08020 !important; }
html.dark .bb-search-backdrop { background: rgba(6, 10, 18, 0.72); }
html.dark .bb-search-dialog { background: #172230; color: #dbe9ff; box-shadow: 0 20px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04); }
html.dark .bb-search-dialog-header { color: #c8dcf2; }
html.dark .bb-search-dialog-icon { color: #5a9aff; }
html.dark .bb-search-dialog-input { background: #0f1926; color: #dbe9ff; border-color: rgba(255,255,255,0.10); }
html.dark .bb-search-dialog-input:focus { border-color: #4a80ff; background: #101f30; box-shadow: 0 0 0 3px rgba(74,128,255,0.15); }
html.dark .bb-search-btn-cancel { background: #1a2c40; border-color: #2e4868; color: #8aacc8; }
html.dark .bb-search-btn-cancel:hover { background: #1f3550; }
html.dark .bb-search-btn-confirm { background: #2a78ff; }
html.dark .bb-search-btn-confirm:hover:not(:disabled) { background: #1a65e8; }

/* ── Blueprint context menu — dark mode ─────────────────────────────────── */
html.dark .bp-ctx-backdrop { background: rgba(6, 10, 18, 0.72); }
html.dark .bp-ctx-dialog { background: #172230; box-shadow: 0 20px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04); }
html.dark .bp-ctx-title { color: #6a8aaa; }
html.dark .bp-ctx-item { color: #dbe9ff; }
html.dark .bp-ctx-item:hover, html.dark .bp-ctx-item:active { background: rgba(90,154,255,0.1); }
html.dark .bp-ctx-item-danger { color: #e87070; }
html.dark .bp-ctx-item-danger:hover, html.dark .bp-ctx-item-danger:active { background: rgba(232,112,112,0.1); }
html.dark .bp-ctx-divider { background: #2e3e52; }
html.dark .bp-ctx-cancel { background: #1a2c40; color: #8aacc8; }
html.dark .bp-ctx-cancel:hover, html.dark .bp-ctx-cancel:active { background: #1f3550; }
</style>
