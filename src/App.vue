<template>
  <div :class="['root', { dark: darkMode }]">
    <header class="top-bar">
      <div class="title-group">
        <div v-if="showCompactMenu" class="menu-root">
          <button class="menu-button" @click.stop="toggleMainMenu" aria-haspopup="true" :aria-expanded="showMainMenu">
            <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true"><rect y="1" width="20" height="2" rx="1" fill="currentColor"/><rect y="6" width="20" height="2" rx="1" fill="currentColor"/><rect y="11" width="20" height="2" rx="1" fill="currentColor"/></svg>
          </button>

          <h1 class="compact-title news-title-link" @touchend.prevent.stop="openAllNews" @click.stop="openAllNews" title="View what's new">PlateUp Tool</h1>
          <div v-if="showMainMenu" class="menu-dropdown" @click.stop>
            <button class="menu-item" @click="startAgain">Restart</button>
            <div class="menu-item has-sub">
              <button @click="toggleShareSubmenu">Share / Import</button>
              <div v-if="showShareSubmenu" class="submenu" @click.stop>
                <div class="menu-item has-sub">
                  <button class="sub-item" @click="toggleShareSubClipboard">📋 Share to Clipboard</button>
                  <div v-if="showShareSubClipboard" class="submenu" @click.stop>
                    <button class="menu-item sub-item" @click="compactShareClipboard('tab')">{{ state.activeTabId === 'structure' ? 'Structure only' : 'Current tab' }}</button>
                    <button class="menu-item sub-item" @click="compactShareClipboard('all-tabs')">All appliance tabs</button>
                    <button class="menu-item sub-item" @click="compactShareClipboard('complete')">Complete</button>
                    <button class="menu-item sub-item" @click="compactCopyLink">🔗 Copy URL</button>
                  </div>
                </div>
                <div class="menu-item has-sub">
                  <button class="sub-item" @click="toggleShareSubFile">💾 Share to File</button>
                  <div v-if="showShareSubFile" class="submenu" @click.stop>
                    <button class="menu-item sub-item" @click="compactExportFile('tab')">{{ state.activeTabId === 'structure' ? 'Structure only' : 'Current tab' }}</button>
                    <button class="menu-item sub-item" @click="compactExportFile('all-tabs')">All appliance tabs</button>
                    <button class="menu-item sub-item" @click="compactExportFile('complete')">Complete</button>
                  </div>
                </div>
                <button class="menu-item sub-item" @click="compactImportFile">📂 Load from File</button>
                <button class="menu-item sub-item" @click="compactImportClipboard">📋 Load from Clipboard</button>
              </div>
            </div>
            <button class="menu-item" @click="openChangeSizeModal">
              <svg class="menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/><path d="M3 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H4v4.5a.5.5 0 0 1-1 0v-5zm9-3a.5.5 0 0 1-.5.5H7v-5a.5.5 0 0 1 1 0V6h3.5a.5.5 0 0 1 .5.5z"/></svg>
              Change Dimensions
            </button>
            <div class="menu-sep"></div>
            <div class="menu-item has-sub">
              <button @click="toggleSettingsSubmenu">Settings</button>
              <div v-if="showSettingsSubmenu" class="submenu" @click.stop>
                <button class="menu-item sub-item" @click="toggleDarkMode">
                  <svg v-if="!darkMode" class="menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
                  <svg v-else class="menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zM8 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zM16 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 16 8zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zM12.657 2.343a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM4.464 11.536a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM12.657 13.657a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707z"/></svg>
                  Light / Dark mode
                </button>
                <button :class="['menu-item', 'sub-item', { 'menu-item--active': teleporterLines }]" @click="toggleTeleporterLines">
                  <svg class="menu-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="1.8" y1="1.8" x2="14.2" y2="14.2" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2" stroke-linecap="round"/><circle cx="2" cy="2" r="2" fill="currentColor"/><circle cx="14" cy="14" r="2" fill="currentColor"/></svg>
                  Show / Hide teleporter lines
                </button>
                <button class="menu-item sub-item" @click="toggleLabelDisplayMode">
                  <svg v-if="labelDisplayMode === 0" class="menu-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="9" y1="9" x2="16" y2="16" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 2" stroke-linecap="round"/><circle cx="3.5" cy="3.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/></svg>
                  <svg v-else-if="labelDisplayMode === 1" class="menu-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="5" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  <svg v-else class="menu-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="5" x2="15" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                  Show labels (lines/text/none)
                </button>
                <button class="menu-item sub-item" @click="openModsSettingsModal">
                  <svg class="menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/></svg>
                  MOD Support
                </button>
              </div>
            </div>
            <div class="menu-sep"></div>
            <div class="menu-item has-sub">
              <button @click="toggleHelpSubmenu">Help</button>
              <div v-if="showHelpSubmenu" class="submenu" @click.stop>
                <button class="menu-item sub-item" @click="showTutorial = true; closeMainMenu()">Tutorial</button>
                <button class="menu-item sub-item" @click="openFeedback">Feedback</button>
                <button class="menu-item sub-item" @click="openDonate">Donate</button>
                <button class="menu-item sub-item" @click="showCredits = true; closeMainMenu()">Credits</button>
                <button class="menu-item sub-item" @click="showHelp = true; closeMainMenu()">Keyboard Shortcuts</button>
              </div>
            </div>
          </div>
        </div>
        <h1 v-else class="news-title-link" @touchend.prevent="openAllNews" @click="openAllNews" title="View what's new">PlateUp Tool</h1>
        <span v-if="!showCompactMenu" class="title-tagline">An online planner for your PlateUp! restaurant</span>
      </div>
      <div class="header-right" v-if="!showCompactMenu">
        <button class="reset-button" @click="startAgain" title="Clear the grid and start over">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Restart
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
          <span class="feedback-button-icons" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </span>
          Feedback
        </button>
        <button class="saveload-button" @click="openSaveLoadMenu" title="Share, import, save or load your design">
          <!-- Share / Import icon (box with arrow up) -->
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.646 2.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 1 1-.708.708L8.5 3.707V9.5a.5.5 0 0 1-1 0V3.707L5.354 4.854a.5.5 0 1 1-.708-.708l2-2z"/>
            <path fill-rule="evenodd" d="M14 13.5V12a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v1.5A1.5 1.5 0 0 0 3.5 15h9A1.5 1.5 0 0 0 14 13.5z"/>
          </svg>
          Share / Import
        </button>

        <button class="help-button" @click="showHelp = true" title="Keyboard shortcuts &amp; controls">?</button>
      </div>

      <!-- Top zoom row for very small screens (moves slider next to tab dropdown) -->
      <div v-if="smallTopZoom" class="top-zoom-row">
        <span class="palette-zoom-icon" role="button" tabindex="0" title="Reset zoom to 100%" @click="resetZoom" @keydown.enter="resetZoom" @keydown.space.prevent="resetZoom">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" stroke="#3a5070" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 21l-4.3-4.3" stroke="#3a5070" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <input class="palette-zoom" type="range" min="0.3" max="2.5" step="0.05" v-model.number="state.zoom" :title="`Zoom ${Math.round(state.zoom * 100)}%`" :aria-valuetext="`${Math.round(state.zoom * 100)}%`" />
      </div>

    </header>
    <!-- Spinner overlay while appliance metadata is loading -->
    <div v-if="applianceMapLoading" class="appliance-map-overlay" role="status" aria-live="polite">
      <div class="appliance-map-spinner"></div>
      <div class="appliance-map-text">Loading appliance metadata…</div>
    </div>

    <TutorialModal v-if="showTutorial" @close="showTutorial = false" />
    <NewsModal v-if="showNews" :news="pendingNews" @close="closeNews" />

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
                <div><dt>Ctrl+F</dt><dd>Flip selection (Shift+Ctrl+F to flip vertically)</dd></div>
              </dl>
            </section>
            <section>
              <h3>Cut / Copy / Paste</h3>
              <dl>
                <div><dt>Ctrl+C</dt><dd>Copy selected cells</dd></div>
                <div><dt>Ctrl+X</dt><dd>Cut selected cells</dd></div>
                <div><dt>Ctrl+V</dt><dd>Paste</dd></div>
                <div><dt>Ctrl+D</dt><dd>Duplicate</dd></div>
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
            <section>
              <h3>Other</h3>
              <dl>
                <div><dt>T</dt><dd>Toggle teleporter connector lines (always show)</dd></div>
                <div><dt>Ctrl+Z</dt><dd>Undo last change</dd></div>
                <div><dt>[ / ]</dt><dd>Change appliance to alternatives (single cell selected)</dd></div>
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

    <!-- Settings Modal -->
    <teleport to="body">
      <div v-if="showSettingsModal" class="settings-modal-backdrop" @click.self="closeSettingsModal">
        <div class="settings-modal" role="dialog" aria-modal="true">
          <!-- Header -->
          <div class="settings-modal-header">
            <div class="settings-modal-header-left">
              <button v-if="settingsPage === 'mods'" class="settings-modal-close" @click="closeSettingsModal" aria-label="Close MOD Support">✕</button>
            </div>
            <h2 class="settings-modal-title">{{ settingsPage === 'mods' ? 'MOD Support' : 'Settings' }}</h2>
            <button class="settings-modal-close" @click="closeSettingsModal" aria-label="Close">✕</button>
          </div>

          <!-- Main settings page -->
          <div v-if="settingsPage === 'main'" class="settings-modal-body">

            <button class="settings-row" @click="closeSettingsModal(); openChangeSizeModal()">
              <span class="settings-row-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
                  <path d="M3 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H4v4.5a.5.5 0 0 1-1 0v-5zm9-3a.5.5 0 0 1-.5.5H7v-5a.5.5 0 0 1 1 0V6h3.5a.5.5 0 0 1 .5.5z"/>
                </svg>
              </span>
              <span class="settings-row-body">
                <span class="settings-row-title">Room Size</span>
                <span class="settings-row-desc">Currently {{ state.roomWidth }} × {{ state.roomHeight }} tiles — click to change</span>
              </span>
              <span class="settings-row-chevron" aria-hidden="true">›</span>
            </button>

            <div class="settings-row">
              <span class="settings-row-icon">
                <svg v-if="!darkMode" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zM8 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zM16 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 16 8zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zM12.657 2.343a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM4.464 11.536a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM12.657 13.657a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707z"/>
                </svg>
              </span>
              <span class="settings-row-body">
                <span class="settings-row-title">Dark Mode</span>
                <span class="settings-row-desc">Switch between light and dark theme</span>
              </span>
              <button :class="['settings-toggle', { active: darkMode }]" @click="toggleDarkMode" :aria-pressed="darkMode" aria-label="Toggle dark mode">
                <span class="settings-toggle-thumb"></span>
              </button>
            </div>

            <div class="settings-row">
              <span class="settings-row-icon">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <line x1="1.8" y1="1.8" x2="14.2" y2="14.2" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2" stroke-linecap="round"/>
                  <circle cx="2" cy="2" r="2" fill="currentColor"/>
                  <circle cx="14" cy="14" r="2" fill="currentColor"/>
                </svg>
              </span>
              <span class="settings-row-body">
                <span class="settings-row-title">Teleporter Lines</span>
                <span class="settings-row-desc">Show connecting lines between teleporters</span>
              </span>
              <button :class="['settings-toggle', { active: teleporterLines }]" @click="toggleTeleporterLines" :aria-pressed="teleporterLines" aria-label="Toggle teleporter lines">
                <span class="settings-toggle-thumb"></span>
              </button>
            </div>

            <button class="settings-row" @click="toggleLabelDisplayMode">
              <span class="settings-row-icon">
                <svg v-if="labelDisplayMode === 0" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="3" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/>
                  <line x1="9" y1="9" x2="16" y2="16" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 2" stroke-linecap="round"/>
                  <circle cx="3.5" cy="3.5" r="1" fill="currentColor"/>
                  <circle cx="15.5" cy="15.5" r="1" fill="currentColor"/>
                </svg>
                <svg v-else-if="labelDisplayMode === 1" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/>
                  <line x1="5" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
                <svg v-else viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/>
                  <line x1="3" y1="5" x2="15" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="settings-row-body">
                <span class="settings-row-title">Label Display</span>
                <span class="settings-row-desc">{{ labelDisplayMode === 0 ? 'Showing lines and text' : (labelDisplayMode === 1 ? 'Showing text only' : 'Labels hidden') }} — click to cycle</span>
              </span>
              <span class="settings-row-badge">{{ labelDisplayMode === 0 ? 'Lines' : (labelDisplayMode === 1 ? 'Text' : 'Off') }}</span>
            </button>

            <button class="settings-row settings-row--mods" @click="goToModsPage">
              <span class="settings-row-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M6 .5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H9v1.07A7.001 7.001 0 0 1 8 16a7 7 0 0 1-5.277-11.568l.463.44A6 6 0 1 0 8 2.071V1h-.5A.5.5 0 0 1 6 .5zm2 1.026v1.986A4 4 0 1 1 4.004 9H3a5 5 0 1 0 5-5.999V1.526z"/>
                </svg>
              </span>
              <span class="settings-row-body">
                <span class="settings-row-title">MOD Support</span>
                <span class="settings-row-desc">Manage mod appliance packs</span>
              </span>
              <span class="settings-row-chevron" aria-hidden="true">›</span>
            </button>

          </div>

          <!-- MOD Support page -->
          <div v-else-if="settingsPage === 'mods'" class="settings-modal-body">

            <div class="settings-row">
              <span class="settings-row-icon settings-row-icon--mod">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
                </svg>
              </span>
              <span class="settings-row-body">
                <span class="settings-row-title">Show MODs</span>
                <span class="settings-row-desc">Enable or disable all mod appliances</span>
              </span>
              <button :class="['settings-toggle', { active: modsEnabled }]" @click="toggleModsEnabled" :aria-pressed="modsEnabled" aria-label="Toggle mod support">
                <span class="settings-toggle-thumb"></span>
              </button>
            </div>

            <div v-if="allModSources.length === 0" class="settings-mods-empty">
              No mod packs found in appliance_sources.json
            </div>
            <template v-else>
              <p class="settings-mods-label">Enabled Mod Packs</p>
              <div class="settings-mods-list">
                <button v-for="mod in allModSources" :key="mod.SteamID"
                  :class="['settings-mod-item', { 'settings-mod-item--off': !modsEnabled }]"
                  :disabled="!modsEnabled"
                  @click="toggleMod(mod.SteamID)"
                  :aria-pressed="isModEnabled(mod.SteamID)">
                  <span :class="['settings-mod-check', { 'settings-mod-check--on': isModEnabled(mod.SteamID) }]" aria-hidden="true">
                    <svg v-if="isModEnabled(mod.SteamID)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="11" height="11" aria-hidden="true">
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                    </svg>
                  </span>
                  <span class="settings-mod-name">{{ mod.Description }}</span>
                </button>
              </div>
            </template>

          </div>
        </div>
      </div>
    </teleport>

    <div class="main-grid">
      <GridView />
      <div v-if="!smallTopZoom" class="palette-column">
        <AppliancePalette />
        <div v-show="!showCompactMenu" class="palette-toolbox-box">
          <button class="toolbox-settings-btn" @click="openSettingsModal">
            <svg class="toolbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
        </div>
      </div>
    </div>
    <!-- Bottom palette bar replaces the right panel at < 640 px -->
    <div v-if="smallTopZoom" class="bottom-bar-wrapper" :style="{ height: bbLargeMode ? '186px' : '110px' }">
      <AppliancePalette :bottom-bar-mode="true" />
    </div>
    <RestaurantSizeModal
      v-if="showSizeModal"
      :dismissable="sizeModalDismissable"
      :dark-mode="darkMode"
      @choose="onSizeChosen"
      @cancel="onSizeCancelled"
        @toggle-dark-mode="toggleDarkMode"
      />

      <transition name="toast">
        <div v-if="showCopiedToast" class="copied-toast">Link copied to clipboard</div>
      </transition>
      <div
        v-if="paletteDragActive && paletteDragItem"
        class="palette-drag-ghost"
        :style="{ left: paletteDragPos.x + 'px', top: paletteDragPos.y + 'px', width: (cellSize * state.zoom) + 'px', height: (cellSize * state.zoom) + 'px' }"
      >
        <img v-if="isImageIcon(paletteDragItem.icon)" :src="get2DApplianceIcon(paletteDragItem.id, paletteDragItem.alternativeKey)" />
        <span v-else style="font-size:1.8em">{{ paletteDragItem.icon }}</span>
      </div>

    <!-- small-screen toolbox: bottom-left toolbox icon + vertical popup (hidden in bottom-bar mode where tools move into the palette) -->
    <div v-if="smallToolbox && !smallTopZoom" class="tool-toggle-root">
      <button class="tool-toggle-button" @click.stop="toggleToolboxPopup" :aria-expanded="showToolboxPopup" aria-label="Open toolbox">
        <!-- toolbox icon -->
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7H3zm17 2H4v10h16V9zM9 3h6v3H9V3z"/></svg>
      </button>
      <div v-if="showToolboxPopup" class="tool-popup" @click.stop>
        <button class="tool-popup-button" @click="undo(); closeToolboxPopup()" title="Undo (Ctrl+Z)"><span class="toolbox-char">↶</span></button>
        <button class="tool-popup-button" @click="cutToClipboard(); closeToolboxPopup()" title="Cut (Ctrl+X)"><span class="toolbox-char">✂</span></button>
        <button class="tool-popup-button" @click="copyToClipboard(); closeToolboxPopup()" title="Copy (Ctrl+C)"><span class="toolbox-char">📋</span></button>
        <button class="tool-popup-button" @click="startPaste(); closeToolboxPopup()" title="Paste (Ctrl+V)"><span class="toolbox-char">📥</span></button>
        <button class="tool-popup-button" @click="startDuplicate(); closeToolboxPopup()" title="Duplicate (Ctrl+D)"><span class="toolbox-char">⎘</span></button>
        <button class="tool-popup-button" @click="invokeAndClose('plateup-invoke-box-select')" title="Box Select">
          <svg class="toolbox-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button class="tool-popup-button" @click="invokeAndClose('plateup-invoke-select-all')" title="Select All"><span class="toolbox-char">▣</span></button>
        <button class="tool-popup-button" @click="invokeAndClose('plateup-invoke-invert')" title="Invert Selection">
          <svg class="hp-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" />
            <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <polyline points="9,9 6,12 9,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            <polyline points="15,9 18,12 15,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button class="tool-popup-button" @click="invokeAndClose('plateup-invoke-rotate-left')" title="Rotate Left"><span class="toolbox-char">⟲</span></button>
        <button class="tool-popup-button" @click="invokeAndClose('plateup-invoke-rotate-right')" title="Rotate Right"><span class="toolbox-char">⟳</span></button>
        <button class="tool-popup-button" @click="invokeAndClose('plateup-invoke-flip-h')" title="Flip Horizontal"><span class="toolbox-char rotate-90">⇋</span></button>
        <button class="tool-popup-button" @click="invokeAndClose('plateup-invoke-flip-v')" title="Flip Vertical"><span class="toolbox-char">⇋</span></button>
        <button class="tool-popup-button" @click="invokeAndClose('plateup-invoke-label')" title="Add Label">
          <svg class="toolbox-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
            <line x1="7.5" y1="9.5" x2="7.5" y2="14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
        <button class="tool-popup-button" @click="deleteAndClose" title="Delete"><span class="toolbox-char">🗑</span></button>
        <button class="tool-popup-button" @click="invokeAndClose('plateup-invoke-help')" title="Help"><span class="toolbox-char">?</span></button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRestaurantStore, encodeState as encodeStateFn } from './store/restaurant'
import { useGrid, smallScreenMode, compactMenuMode, bottomBarHeight, clearGridCaches } from './composables/useGrid'
import { clearAppliancePaletteCache } from './appliancePalette'
import { reloadPalette } from './composables/useAppliancePalette'
import GridView from './components/GridView.vue'
import AppliancePalette from './components/AppliancePalette.vue'
import creditsRaw from './CREDITS.md?raw'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import TutorialModal, { hasTutorialBeenSeen } from './components/TutorialModal.vue'
import NewsModal from './components/NewsModal.vue'
import RestaurantSizeModal from './components/RestaurantSizeModal.vue'
import { isDefaultState } from './store/restaurant'
import { alert, confirm, toast } from './utils/ui'
import { useTouchDebug } from './composables/useTouchDebug'

export default {
  name: 'App',
  components: { GridView, AppliancePalette, TutorialModal, NewsModal, RestaurantSizeModal },
  setup() {
    const { state, loadFromHash, syncToHash } = useRestaurantStore()
    const _encodeState = encodeStateFn
    const { loadGridFromState, paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon, cellSize, selectedCells, selectedLabelIds,
      copyToClipboard, cutToClipboard, startPaste, startDuplicate, removeSelected, applianceMapLoading } = useGrid()

    const showHelp = ref(false)
    const showCredits = ref(false)

    const showTutorial = ref(false)
    const showNews = ref(false)
    const pendingNews = ref([])
    const showMainMenu = ref(false)
    const showSettingsSubmenu = ref(false)
    const showHelpSubmenu = ref(false)
    const showShareSubmenu = ref(false)
    const showShareSubClipboard = ref(false)
    const showShareSubFile = ref(false)
    // Use matchMedia for breakpoint booleans so JS fires at exactly the same
    // point as CSS media queries, avoiding subpixel rounding discrepancies.
    const _mqSmall = window.matchMedia('(max-width: 1100px)')
    const _mqBbLarge = window.matchMedia('(min-width: 520px)')
    const _mqBbTallEnough = window.matchMedia('(min-height: 700px)')
    const _mqSmallVal = ref(_mqSmall.matches)
    const _mqBbLargeVal = ref(_mqBbLarge.matches)
    const _mqBbTallEnoughVal = ref(_mqBbTallEnough.matches)
    _mqSmall.addEventListener('change', e => { _mqSmallVal.value = e.matches })
    _mqBbLarge.addEventListener('change', e => { _mqBbLargeVal.value = e.matches })
    _mqBbTallEnough.addEventListener('change', e => { _mqBbTallEnoughVal.value = e.matches })
    const showCompactMenu = computed(() => _mqSmallVal.value)
    const showToolboxPopup = ref(false)
    const smallToolbox = computed(() => _mqSmallVal.value)
    const smallTopZoom = computed(() => _mqSmallVal.value)
    // When in bottom-bar mode AND the viewport is wide enough to show ≥8 small
    // items (≥520px) AND tall enough (≥400px), switch to the large-icon bar.
    const bbLargeMode = computed(() => _mqSmallVal.value && _mqBbLargeVal.value && _mqBbTallEnoughVal.value)
    // Sync bottom-bar mode with useGrid so cellSize/viewportBoxHeight adapt
    watch(smallTopZoom, v => { smallScreenMode.value = v }, { immediate: true })
    watch(bbLargeMode, v => { bottomBarHeight.value = v ? 186 : 110 }, { immediate: true })
    watch(showCompactMenu, v => { compactMenuMode.value = v }, { immediate: true })
    // Broadcast tabs-hidden state so GridView can hide its tabs when needed
    watch(smallToolbox, (v) => { try { window.dispatchEvent(new CustomEvent('plateup-tabs-hidden', { detail: false })) } catch (e) {} }, { immediate: true })
    const showTabsDropdown = ref(false)
    const toggleTabsDropdown = () => { showTabsDropdown.value = !showTabsDropdown.value }
    const closeTabsDropdown = () => { showTabsDropdown.value = false }
    const currentTabLabel = computed(() => {
      const t = (state.tabs || []).find(x => x.id === state.activeTabId)
      return t ? t.label : 'Tab'
    })
    // Tab colours (duplicate of GridView's palette) so dropdown items match tab colours
    const TAB_COLORS = [
      { bg: '#f3f4f6', border: '#d0d0d0' },
      { bg: '#aad6ff', border: '#5090d0' },
      { bg: '#a0f0b8', border: '#48c870' },
      { bg: '#ffb0d0', border: '#d87098' },
      { bg: '#d8b0ff', border: '#9060d0' },
      { bg: '#ffd898', border: '#d09048' },
      { bg: '#80ffe0', border: '#28c090' },
      { bg: '#ffb0a8', border: '#d06858' },
      { bg: '#b0e8ff', border: '#58a8d8' },
      { bg: '#ccffb0', border: '#80c048' },
    ]
    const TAB_COLORS_DARK = [
      { bg: '#2e3340', border: '#5a6070' },
      { bg: '#183560', border: '#3a68a8' },
      { bg: '#163a22', border: '#348a50' },
      { bg: '#3a1630', border: '#884060' },
      { bg: '#2a1448', border: '#6840a0' },
      { bg: '#3a2408', border: '#906020' },
      { bg: '#103834', border: '#308878' },
      { bg: '#3c1818', border: '#904040' },
      { bg: '#103248', border: '#3078a0' },
      { bg: '#1e3810', border: '#508828' },
    ]
    const darkMode = ref(localStorage.getItem('darkMode') === 'true')
    const userTabColorMap = computed(() => {
      const map = {}
      (state.tabs || [])
        .filter(t => t.id !== 'complete' && t.id !== 'structure')
        .forEach((tab, idx) => { map[tab.id] = idx % TAB_COLORS.length })
      return map
    })
    // getTabDropdownStyle left intentionally for backward-compat but not used by tabStyleMap
    function getTabDropdownStyle(tab) {
      return {}
    }
    const tabStyleMap = computed(() => {
      const m = {}
      try {
        const userTabs = (state.tabs || []).filter(t => t.id !== 'complete' && t.id !== 'structure')
        for (const t of (state.tabs || [])) {
          if (t.id === 'complete' || t.id === 'structure') { m[t.id] = {} ; continue }
          const idx = Math.max(0, userTabs.findIndex(u => u.id === t.id)) % TAB_COLORS.length
          const col = darkMode.value ? TAB_COLORS_DARK[idx] : TAB_COLORS[idx]
          const hex = (col.bg || '#ffffff').replace('#','')
          const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
          const lum = 0.2126*r + 0.7152*g + 0.0722*b
          const textColor = lum > 180 ? '#111' : '#fff'
          m[t.id] = { ['--tab-bg']: col.bg, ['--tab-border']: col.border, ['--tab-color']: textColor, background: col.bg, borderColor: col.border, color: textColor }
        }
        // debug logs removed
      } catch (e) {}
      return m
    })
    const currentTabStyle = computed(() => {
      try { return tabStyleMap.value[state.activeTabId] || {} } catch (e) { return {} }
    })
    function setActiveTab(id) {
      try { state.activeTabId = id } catch (e) {}
      closeTabsDropdown()
    }
    function addNewTab() {
      try {
        const userTabs = state.tabs.filter(t => t.id !== 'complete' && t.id !== 'structure')
        if (userTabs.length >= 10) return
        const existingLabels = new Set(userTabs.map(t => t.label))
        let n = userTabs.length + 1
        while (existingLabels.has(`Tab ${n}`)) n++
        const nextId = `tab-${Date.now()}`
        state.tabs.push({ id: nextId, label: `Tab ${n}` })
        state.activeTabId = nextId
      } catch (e) {}
      closeTabsDropdown()
    }

    const showSizeModal = ref(false)
    const sizeModalDismissable = ref(false)
    const showCopiedToast = ref(false)
    const showFeedbackModal = ref(false)
    const { showTouchDebug, toggleTouchDebug } = useTouchDebug()

    // Settings modal state
    const showSettingsModal = ref(false)
    const settingsPage = ref('main') // 'main' | 'mods'

    // Mod support state (persisted to localStorage)
    const modsEnabled = ref(localStorage.getItem('modsEnabled') !== 'false')
    const allModSources = ref([])
    const enabledModSteamIds = ref((() => {
      const raw = localStorage.getItem('enabledModSteamIds')
      if (raw === null) return null // null = all enabled
      try { return JSON.parse(raw) } catch (e) { return null }
    })())

    // Ensure teleporterLines defaults to visible (true) when not set
    let _teleporterLines = localStorage.getItem('teleporterLines')
    if (_teleporterLines === null) { try { localStorage.setItem('teleporterLines', '1') } catch (e) {} _teleporterLines = '1' }
    const teleporterLines = ref(_teleporterLines === '1')
    // Ensure labelDisplayMode key exists; default to 0 (lines + text)
    if (localStorage.getItem('labelDisplayMode') === null) { try { localStorage.setItem('labelDisplayMode', '0') } catch (e) {} }
    const labelDisplayMode = ref(Number(localStorage.getItem('labelDisplayMode') || '0'))


    const renderer = new marked.Renderer()
    renderer.link = ({ href, text }) =>
      `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
    marked.setOptions({ renderer })

    const creditsHtml = computed(() =>
      DOMPurify.sanitize(marked.parse(creditsRaw), { ADD_ATTR: ['target', 'rel'] })
    )

    function openDonate() {
      closeMainMenu()
      window.open('https://paypal.me/JasonEdmeades', '_blank', 'noopener,noreferrer')
    }

    function openFeedback() {
      closeMainMenu()
      showFeedbackModal.value = true
    }

    function openChangeSizeModal() {
      closeMainMenu()
      sizeModalDismissable.value = true
      showSizeModal.value = true
    }

    function openGitHubIssues() {
      window.open('https://github.com/eddy0612/PlateUpTool/issues', '_blank', 'noopener,noreferrer')
      showFeedbackModal.value = false
    }

    function openDiscord() {
      window.open('https://discord.gg/KyQ26Z3Qxa', '_blank', 'noopener,noreferrer')
      showFeedbackModal.value = false
    }

    function toggleDarkMode() {
      closeMainMenu()
      darkMode.value = !darkMode.value
      localStorage.setItem('darkMode', darkMode.value)
      document.documentElement.classList.toggle('dark', darkMode.value)
    }




    function copyUrl() {
      navigator.clipboard.writeText(window.location.href)
      showCopiedToast.value = true
      setTimeout(() => { showCopiedToast.value = false }, 2500)
    }

    function openSaveLoadMenu(event) {
      const rect = event.currentTarget.getBoundingClientRect()
      const menuMinWidth = 220
      const x = Math.min(rect.left, window.innerWidth - menuMinWidth - 8)
      window.dispatchEvent(new CustomEvent('plateup-open-saveload-menu', {
        detail: { x: Math.max(0, x), top: rect.bottom + 4, bottom: null }
      }))
    }

    // Maintain an undo stack (last 30 full snapshots) in sessionStorage
    const UNDO_KEY = 'undoStack'
    const MAX_UNDO = 30
    const URL_KEYS = ['tabs', 'URLVersion', 'roomWidth', 'roomHeight', 'walls', 'gridCells', 'labels']
    const buildUrlState = (s) => {
      const toSave = {}
      URL_KEYS.forEach(k => { toSave[k] = JSON.parse(JSON.stringify(s[k])) })
      toSave.activeTabId = s.activeTabId
      return toSave
    }
    const buildFullSnapshot = () => {
      return {
        urlState: buildUrlState(state),
        ui: {
          selectedCells: Array.from(selectedCells.value || []),
          selectedLabelIds: Array.from(selectedLabelIds.value || []),
          teleporterLines: teleporterLines.value,
          labelDisplayMode: labelDisplayMode.value
        }
      }
    }
    const readUndo = () => { try { return JSON.parse(sessionStorage.getItem(UNDO_KEY) || '[]') } catch (e) { return [] } }
    const writeUndo = (arr) => { try { sessionStorage.setItem(UNDO_KEY, JSON.stringify(arr)) } catch (e) {} }
    // initialize undo stack with current snapshot
    try {
      const init = readUndo()
      const curSnap = JSON.stringify(buildFullSnapshot())
      if (init.length === 0 || init[init.length - 1] !== curSnap) { init.push(curSnap); writeUndo(init.slice(-MAX_UNDO)) }
    } catch (e) {}

    // Guard used to skip recording snapshots while we're restoring a previous state
    let isRestoring = false

    watch(() => buildFullSnapshot(), (nv, ov) => {
      if (isRestoring) return
      try {
        const stack = readUndo()
        const cur = JSON.stringify(nv)
        if (!stack.length || stack[stack.length - 1] !== cur) {
          stack.push(cur)
          writeUndo(stack.slice(-MAX_UNDO))
        }
      } catch (e) {}
      syncToHash()
    }, { deep: true })

    onMounted(async () => {
      document.documentElement.classList.toggle('dark', darkMode.value)
      // Prevent syncToHash from running while we restore state from the URL/hash
      isRestoring = true
      try {
        loadFromHash()
        await loadGridFromState()
      } finally {
        isRestoring = false
      }
      // Fit the restaurant to the viewport on initial load (mirrors what
      // resetZoom does when clicking the magnifying glass).
      nextTick(() => resetZoom())
      // Broadcast current visibility preferences so components render consistently
      try {
        window.dispatchEvent(new CustomEvent('teleporter-lines-changed', { detail: teleporterLines.value }))
        window.dispatchEvent(new CustomEvent('label-display-mode-changed', { detail: labelDisplayMode.value }))
      } catch (e) {}
      // Load available mod sources for the Settings → MOD Support dialog
      try {
        const sourcesUrl = import.meta.env.BASE_URL + 'res/appliance_sources.json'
        const srcResp = await fetch(sourcesUrl)
        if (srcResp.ok) {
          const srcData = await srcResp.json()
          allModSources.value = srcData.filter(s => s.SteamID !== -1)
        }
      } catch (e) {}
      if (!hasTutorialBeenSeen()) {
        showTutorial.value = true
      } else {
        // Returning user — check for unseen news, fall back to size modal
        const newsShown = await checkAndShowNews()
        if (!newsShown && isDefaultState()) {
          showSizeModal.value = true
          sizeModalDismissable.value = false
        }
      }
      window.addEventListener('hashchange', async () => {
        // When the URL/hash changes externally, treat this as a restore operation
        isRestoring = true
        try {
          loadFromHash()
          await loadGridFromState()
        } finally {
          isRestoring = false
        }
        // Ensure the grid fits the viewport after loading a new URL/state
        nextTick(() => resetZoom())
        // Reset undo stack when a new URL/state is loaded
        try {
          const snap = JSON.stringify(buildFullSnapshot())
          writeUndo([snap])
        } catch (e) {}
        // Ensure the size modal reflects the newly loaded state. If the loaded
        // state is the default (new restaurant) show the modal, otherwise hide it.
        try {
          showSizeModal.value = isDefaultState()
          if (showSizeModal.value) sizeModalDismissable.value = false
        } catch (e) {
          showSizeModal.value = false
        }
      })
      window.addEventListener('plateup-copy-link', copyUrl)
      // Listen for external undo requests (from child components)
      window.addEventListener('plateup-undo', undo)
      // Listen for rezoom requests (e.g. after complete import)
      window.addEventListener('plateup-rezoom', () => nextTick(() => resetZoom()))
      // Recompute best-fit zoom when the viewport changes (dispatched by
      // `useTouchDebug` when visual metrics change). Debounced there.
      window.addEventListener('plateup-viewport-changed', () => nextTick(() => resetZoom()))
      // Also respond to orientation changes which may not always trigger
      // visualViewport resize events on some mobile browsers.
      window.addEventListener('orientationchange', () => nextTick(() => resetZoom()))
      const onDocClick = (e) => {
        // close menus when clicking outside
        if (showMainMenu.value) {
          showMainMenu.value = false
          showSettingsSubmenu.value = false
          showHelpSubmenu.value = false
          showShareSubmenu.value = false
          showShareSubClipboard.value = false
          showShareSubFile.value = false
        }
        try {
          if (showToolboxPopup.value && !e.target.closest('.tool-toggle-root')) {
            showToolboxPopup.value = false
          }
          if (showTabsDropdown.value && !e.target.closest('.tab-dropdown-root')) {
            showTabsDropdown.value = false
          }
        } catch (err) {}
      }
      document.addEventListener('click', onDocClick)
      // Ctrl+Z undo handler
      const onKey = (e) => {
        const key = (e.key || '').toLowerCase()
        if ((e.ctrlKey || e.metaKey) && key === 'z') {
          e.preventDefault()
          undo()
        }
      }
      window.addEventListener('keydown', onKey)
      // Prevent the browser context menu on the app background, but allow it
      // for editable controls (inputs, textareas, selects or contentEditable).
      const onContextMenu = (e) => {
        const tag = (e && e.target && e.target.tagName) || ''
        const editable = e && e.target && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag))
        if (editable) return
        e.preventDefault()
      }
      window.addEventListener('contextmenu', onContextMenu)
      // remove on unload
      window.addEventListener('beforeunload', () => {
        window.removeEventListener('keydown', onKey)
        window.removeEventListener('plateup-undo', undo)
        window.removeEventListener('contextmenu', onContextMenu)
        document.removeEventListener('click', onDocClick)
      })
    })

    function toggleMainMenu() {
      const next = !showMainMenu.value
      showMainMenu.value = next
      if (!next) {
        showSettingsSubmenu.value = false
        showHelpSubmenu.value = false
        showShareSubmenu.value = false
        showShareSubClipboard.value = false
        showShareSubFile.value = false
      }
    }
    function closeMainMenu() {
      showMainMenu.value = false
      showSettingsSubmenu.value = false
      showHelpSubmenu.value = false
      showShareSubmenu.value = false
      showShareSubClipboard.value = false
      showShareSubFile.value = false
    }
    function toggleSettingsSubmenu() {
      showHelpSubmenu.value = false
      showShareSubmenu.value = false
      showSettingsSubmenu.value = !showSettingsSubmenu.value
    }
    function toggleHelpSubmenu() {
      showSettingsSubmenu.value = false
      showShareSubmenu.value = false
      showHelpSubmenu.value = !showHelpSubmenu.value
    }
    function toggleShareSubmenu() {
      showSettingsSubmenu.value = false
      showHelpSubmenu.value = false
      const next = !showShareSubmenu.value
      showShareSubmenu.value = next
      if (!next) {
        showShareSubClipboard.value = false
        showShareSubFile.value = false
      }
    }
    function toggleShareSubClipboard() {
      showShareSubFile.value = false
      showShareSubClipboard.value = !showShareSubClipboard.value
    }
    function toggleShareSubFile() {
      showShareSubClipboard.value = false
      showShareSubFile.value = !showShareSubFile.value
    }
    function compactShareClipboard(type) {
      window.dispatchEvent(new CustomEvent('plateup-compact-share-clipboard', { detail: { type } }))
      showMainMenu.value = false
    }
    function compactCopyLink() {
      copyUrl()
      showMainMenu.value = false
    }
    function compactExportFile(type) {
      window.dispatchEvent(new CustomEvent('plateup-compact-export-file', { detail: { type } }))
      showMainMenu.value = false
    }
    function compactImportFile() {
      window.dispatchEvent(new CustomEvent('plateup-compact-import-file'))
      showMainMenu.value = false
    }
    function compactImportClipboard() {
      window.dispatchEvent(new CustomEvent('plateup-compact-import-clipboard'))
      showMainMenu.value = false
    }

    function toggleToolboxPopup() {
      showToolboxPopup.value = !showToolboxPopup.value
    }

    function resetZoom() {
      try {
        const vb = typeof document !== 'undefined' ? document.querySelector('.viewport-box') : null
        if (vb && cellSize.value > 0 && state.roomWidth > 0 && state.roomHeight > 0) {
          const innerW = vb.clientWidth - 16  // 8px padding each side
          const innerH = vb.clientHeight - 16
          const fz = Math.min(innerW / (state.roomWidth * cellSize.value), innerH / (state.roomHeight * cellSize.value))
          state.zoom = Math.max(0.25, Math.floor(fz * 100) / 100)
        } else {
          state.zoom = 1
        }
      } catch (e) {}
    }

    function closeToolboxPopup() {
      showToolboxPopup.value = false
    }

    function invokeAndClose(name) {
      try { if (typeof window !== 'undefined' && window && window.dispatchEvent) { window.dispatchEvent(new Event(name)) } } catch (e) {}
      closeToolboxPopup()
    }

    function deleteAndClose() {
      try { removeSelected() } catch (e) {}
      closeToolboxPopup()
    }



    async function startAgain() {
      closeMainMenu()
      // If there are any modifications (appliances/walls), confirm before discarding them
      if (!isDefaultState()) {
        const confirmed = await confirm('This will discard any unsaved changes and reset the planner. Continue?')
        if (!confirmed) return
      }
      // Ensure visibility prefs are set to defaults before reloading
      try {
        localStorage.setItem('teleporterLines', '1')
        localStorage.setItem('labelDisplayMode', '0')
      } catch (e) {}
      // Clear undo stack when starting again
      try { writeUndo([]) } catch (e) {}
      // Navigate to the base URL (remove hash and query) without adding a history entry
      window.location.replace(window.location.origin + window.location.pathname)
    }

    // Undo: revert to previous encoded state from sessionStorage stack
    async function undo() {
      try {
        const stack = readUndo()
        if (!stack || stack.length <= 1) { return }
        // remove current state snapshot
        stack.pop()
        const prev = stack[stack.length - 1]
        if (!prev) { return }
        // write back truncated stack (we keep previous as current)
        writeUndo(stack.slice(-MAX_UNDO))
        // Restore parsed snapshot
        const parsed = JSON.parse(prev)
        // Prevent the watcher from recording this restoration as a new snapshot
        isRestoring = true
        if (parsed && parsed.urlState) {
          try {
            URL_KEYS.forEach(k => { state[k] = parsed.urlState[k] ? JSON.parse(JSON.stringify(parsed.urlState[k])) : JSON.parse(JSON.stringify(state[k])) })
            state.activeTabId = parsed.urlState.activeTabId || 'complete'
          } catch (e) {}
        }
        // Rebuild grid view first (this clears selections internally)
        await loadGridFromState()
        // Restore UI selections/preferences after grid is rebuilt
        try {
          selectedCells.value = new Set(parsed.ui.selectedCells || [])
          selectedLabelIds.value = new Set(parsed.ui.selectedLabelIds || [])
          teleporterLines.value = !!parsed.ui.teleporterLines
          labelDisplayMode.value = Number(parsed.ui.labelDisplayMode || 0)
          window.dispatchEvent(new CustomEvent('teleporter-lines-changed', { detail: teleporterLines.value }))
          window.dispatchEvent(new CustomEvent('label-display-mode-changed', { detail: labelDisplayMode.value }))
        } catch (e) {}
        // Sync URL/state
        syncToHash()
        // allow the watcher to resume on next tick
        setTimeout(() => { isRestoring = false }, 0)
      } catch (e) { /* swallow errors, avoid alert dialogs */ }
    }

    function toggleTeleporterLines() {
      closeMainMenu()
      try {
        teleporterLines.value = !teleporterLines.value
        const next = teleporterLines.value
        localStorage.setItem('teleporterLines', next ? '1' : '0')
        window.dispatchEvent(new CustomEvent('teleporter-lines-changed', { detail: next }))
      } catch (e) {}
    }

    function toggleLabelDisplayMode() {
      closeMainMenu()
      try {
        labelDisplayMode.value = (labelDisplayMode.value + 1) % 3
        localStorage.setItem('labelDisplayMode', String(labelDisplayMode.value))
        window.dispatchEvent(new CustomEvent('label-display-mode-changed', { detail: labelDisplayMode.value }))
      } catch (e) {}
    }

    // ── Settings modal ──────────────────────────────────────────────────────
    function openSettingsModal() { showSettingsModal.value = true; settingsPage.value = 'main' }
    function closeSettingsModal() { showSettingsModal.value = false }
    function goToModsPage() { settingsPage.value = 'mods' }
    function openModsSettingsModal() { showSettingsModal.value = true; settingsPage.value = 'mods'; closeMainMenu() }

    function isModEnabled(steamId) {
      if (enabledModSteamIds.value === null) return true
      return enabledModSteamIds.value.includes(steamId)
    }

    async function _applyModSettingsChange() {
      clearAppliancePaletteCache()
      clearGridCaches()
      await reloadPalette()
      await loadGridFromState()
    }

    async function toggleModsEnabled() {
      modsEnabled.value = !modsEnabled.value
      try { localStorage.setItem('modsEnabled', modsEnabled.value ? 'true' : 'false') } catch (e) {}
      await _applyModSettingsChange()
    }

    async function toggleMod(steamId) {
      const allIds = allModSources.value.map(s => s.SteamID)
      let current = enabledModSteamIds.value === null ? [...allIds] : [...enabledModSteamIds.value]
      if (current.includes(steamId)) {
        current = current.filter(id => id !== steamId)
      } else {
        current.push(steamId)
      }
      // Normalise to null when all mods are enabled
      if (allIds.length > 0 && allIds.every(id => current.includes(id))) {
        enabledModSteamIds.value = null
        try { localStorage.removeItem('enabledModSteamIds') } catch (e) {}
      } else {
        enabledModSteamIds.value = current
        try { localStorage.setItem('enabledModSteamIds', JSON.stringify(current)) } catch (e) {}
      }
      await _applyModSettingsChange()
    }
    // ────────────────────────────────────────────────────────────────────────

    async function onSizeChosen({ w, h }) {
      state.roomWidth = Number(w)
      state.roomHeight = Number(h)
      await loadGridFromState()
      showSizeModal.value = false
      sizeModalDismissable.value = false
      resetZoom()
    }

    function onSizeCancelled() {
      showSizeModal.value = false
      sizeModalDismissable.value = false
    }

    // Fetch news.json, show any unseen entries. Falls back to size modal if nothing to show.
    async function checkAndShowNews() {
      try {
        const newsUrl = import.meta.env.BASE_URL + 'res/news.json'
        const resp = await fetch(newsUrl)
        if (resp.ok) {
          const data = await resp.json()
          const allNews = data.news || []
          const seenVersions = JSON.parse(localStorage.getItem('plateuptool_news_seen') || '[]')
          const unseen = allNews.filter(n => !seenVersions.includes(n.version))
          if (unseen.length > 0) {
            pendingNews.value = unseen
            showNews.value = true
            return true
          }
        }
      } catch (e) {}
      return false
    }

    async function openAllNews() {
      try {
        const newsUrl = import.meta.env.BASE_URL + 'res/news.json'
        const resp = await fetch(newsUrl)
        if (resp.ok) {
          const data = await resp.json()
          const allNews = data.news || []
          if (allNews.length > 0) {
            pendingNews.value = allNews
            showNews.value = true
          }
        }
      } catch (e) {}
    }

    function closeNews() {
      try {
        const seenVersions = JSON.parse(localStorage.getItem('plateuptool_news_seen') || '[]')
        pendingNews.value.forEach(n => {
          if (!seenVersions.includes(n.version)) seenVersions.push(n.version)
        })
        localStorage.setItem('plateuptool_news_seen', JSON.stringify(seenVersions))
      } catch (e) {}
      showNews.value = false
      pendingNews.value = []
      if (isDefaultState()) { showSizeModal.value = true; sizeModalDismissable.value = false }
    }

    // When tutorial closes, check for news first; fall back to size modal
    watch(showTutorial, async (v) => {
      if (!v) {
        const newsShown = await checkAndShowNews()
        if (!newsShown && isDefaultState()) { showSizeModal.value = true; sizeModalDismissable.value = false }
      }
    })

    return {
      startAgain, showHelp, showCredits, showTutorial, showNews, pendingNews, closeNews, openAllNews, showSizeModal, sizeModalDismissable,
      showCopiedToast, creditsHtml, openDonate, openFeedback, openGitHubIssues, openDiscord,
      showFeedbackModal, copyUrl, openSaveLoadMenu, darkMode, toggleDarkMode, openChangeSizeModal,
      toggleTeleporterLines, teleporterLines, toggleLabelDisplayMode, labelDisplayMode,
      paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon,
      cellSize, state, onSizeChosen, onSizeCancelled, undo, showTouchDebug, toggleTouchDebug,
      applianceMapLoading,
      closeMainMenu,
      /* menu controls */ showMainMenu, showSettingsSubmenu, showHelpSubmenu, showShareSubmenu, showShareSubClipboard, showShareSubFile, showCompactMenu,
      toggleMainMenu, toggleSettingsSubmenu, toggleHelpSubmenu, toggleShareSubmenu, toggleShareSubClipboard, toggleShareSubFile,
      compactShareClipboard, compactCopyLink, compactExportFile, compactImportFile, compactImportClipboard,
      /* small-screen toolbox */ showToolboxPopup, toggleToolboxPopup, closeToolboxPopup, smallToolbox,
      smallTopZoom, bbLargeMode, resetZoom,
      invokeAndClose, deleteAndClose,
      /* tabs dropdown */ showTabsDropdown, toggleTabsDropdown, closeTabsDropdown, currentTabLabel, setActiveTab, addNewTab, getTabDropdownStyle, tabStyleMap, currentTabStyle,
      /* grid clipboard actions */ copyToClipboard, cutToClipboard, startPaste, startDuplicate, removeSelected,
      applianceMapLoading,
      /* settings modal */ showSettingsModal, settingsPage, openSettingsModal, closeSettingsModal, goToModsPage,
      openModsSettingsModal,
      modsEnabled, allModSources, enabledModSteamIds, isModEnabled, toggleModsEnabled, toggleMod,
    }
  }
}
</script>

<style>
* { box-sizing: border-box }
html, body { margin: 0; font-family: sans-serif; overflow: hidden; height: 100%; }
html.dark { background: #12141c; color: #d0daea; color-scheme: dark; }
/* Ensure inline SVG icons with class hp-svg follow dark-mode text color */
html.dark svg.hp-svg { color: #d0daea }
/* In dark mode, inherit currentColor for strokes and for fills unless
   the SVG element explicitly sets `fill="none"` (keep outlines unfilled). */
html.dark svg.hp-svg *:not([fill="none"]) { fill: currentColor !important; }
html.dark svg.hp-svg * { stroke: currentColor !important; }

/* Ensure help dialog character icons render large and consistently */
.help-list-icon .hp-char { font-size: 36px !important; line-height: 40px !important; width: 40px !important; height: 40px !important; display: inline-flex; align-items: center; justify-content: center }
/* also match popup help variant */
.help-popup-icon .hp-char { font-size: 36px !important; line-height: 40px !important; width: 40px !important; height: 40px !important; display: inline-flex; align-items: center; justify-content: center }
</style>

<style scoped>
.root { padding: calc(10px + env(safe-area-inset-top, 0px)) calc(10px + env(safe-area-inset-right, 0px)) calc(10px + env(safe-area-inset-bottom, 0px)) calc(10px + env(safe-area-inset-left, 0px)); display: flex; flex-direction: column; min-height: 100vh }
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; touch-action: manipulation; }
.top-bar { position: relative }
.title-group { display: flex; align-items: baseline; gap: 10px }
.menu-root { display: flex; align-items: center; gap: 8px }
.top-bar h1 { margin: 0; white-space: nowrap; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.title-tagline { font-size: 1.1rem; color: #aaa; font-style: italic; white-space: nowrap }
.compact-title { margin: 0; font-size: 1.05rem; font-weight: 700; align-self: center; margin-left: 8px; white-space: nowrap; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.header-right { display: flex; align-items: center; gap: 6px; margin-right: 8px }
/* Top zoom row (for very small screens). Positioned between the title area
   and the tab dropdown; it grows to fill available horizontal space. */
.top-zoom-row {
  display: flex; align-items: center; gap: 8px; z-index: 20; flex: 1 1 auto; min-width: 60px; margin-left: 12px;
}
.top-zoom-row .palette-zoom { width: 100%; }
.top-zoom-row .palette-zoom-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; cursor: pointer }
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

.feedback-button-icons { display: inline-flex; align-items: center; gap: 6px; margin-right: 4px }

.saveload-button {
  border: none; background: #1e7e94; color: white; padding: 0.4rem 0.8rem;
  border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center;
  gap: 5px; font-size: 0.875rem; font-weight: 600; white-space: nowrap;
}
.saveload-button:hover { background: #186a7d }

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
  max-height: 97vh; /* 10% taller than previous 88vh */
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
.darkmode-button {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2px solid #5b8fd9;
  background: #eef4ff;
  color: #2a5db0;
  font-size: 1rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
  flex-shrink: 0;
}
.darkmode-button:hover { background: #d0e3ff; border-color: #2a5db0 }
.main-grid {
  display: flex;
  gap: 10px;
  padding-left: 60px;
  overflow: visible;
  align-items: flex-start;
}

.tabs-hidden .main-grid {
  padding-left: 0;
}

.palette-column { display:flex; flex-direction:column; gap:8px; align-items:stretch }
.bottom-bar-wrapper {
  position: fixed;
  bottom: calc(4px + env(safe-area-inset-bottom, 0px));
  left: 10px;
  right: 10px;
  height: 110px;
  z-index: 9900;
  overflow: hidden;
  border-radius: 0 0 10px 10px;
}
.palette-toolbox-box { display:flex; align-items:center; padding:5px; background: #f4f8fb; border-radius:8px; border: 1px solid #d2dfe9; width: 100%; box-sizing: border-box }
.dark .palette-toolbox-box { background: #1e2629; border-color: #33393d }
.palette-toolbox { display:flex; gap:8px; align-items:center; justify-content: space-between; flex: 1 }
.palette-toolbox > * { flex: 0 0 auto }
.palette-toolbox .toolbox-button { background: #fff; border: 1px solid #c8d6e8; border-radius: 6px; padding: 8px 10px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 0 rgba(0,0,0,0.03); color: #21313a; display: inline-flex; align-items: center; justify-content: center; touch-action: manipulation; -webkit-tap-highlight-color: transparent }
.toolbox-icon { width: 22px; height: 22px; display: block }
.dark .palette-toolbox .toolbox-button { background: #2b3338; border-color: #444d55; color: #eef6f1 }
/* Active state for toolbox buttons (e.g., teleporter lines) */
.palette-toolbox .toolbox-button.active { background: #1f79ff; color: #fff; border-color: #1766d6 }
.dark .palette-toolbox .toolbox-button.active { background: #1a5fe0; color: #fff; border-color: #0f4fb8 }
/* Icon-style toolbox buttons (no inset border) */
.palette-toolbox .toolbox-button--icon { background: transparent; border: none; padding: 8px 10px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center }
.palette-toolbox .toolbox-button--icon .toolbox-icon { width: 22px; height: 22px; display: block }
.palette-toolbox .toolbox-button--icon.active { background: #1f79ff; color: #fff }
.dark .palette-toolbox .toolbox-button--icon.active { background: #1a5fe0 }
/* Teleporter-specific: remove padding so icon sits flush */
.palette-toolbox .toolbox-button--teleporter { padding: 0; width: 44px; height: 40px; border: 1px solid #c8d6e8; background: #fff; border-radius: 6px; box-shadow: 0 1px 0 rgba(0,0,0,0.03); display: inline-flex; align-items: center; justify-content: center }
.palette-toolbox .toolbox-button--teleporter .toolbox-icon { width: 100%; height: 100% }
.dark .palette-toolbox .toolbox-button--teleporter { background: #2b3338; border-color: #444d55; color: #eef6f1 }
/* Room size button inside palette toolbox */
.palette-toolbox .toolbox-button--size { gap: 6px; padding: 8px 12px; }
.toolbox-size-text { font-size: 0.85rem; font-weight: 700; letter-spacing: 0.03em; white-space: nowrap; min-width: 56px; text-align: center }

/* Hide the tagline when space is limited */
@media (max-width: 1310px) {
  .title-tagline { display: none !important }
}



/* Compact responsive rules: hide palette toolbox and adjust header */
@media (max-width: 1100px) {
  .menu-root { position: relative }

  .menu-button {
    background: none; border: none; padding: 8px; border-radius: 6px; cursor: pointer;
    color: inherit; display: inline-flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .menu-button:hover { background: rgba(255,255,255,0.14) }

  .menu-dropdown {
    position: absolute; left: 0; top: 46px; min-width: 248px;
    background: #fff; color: #1a2030;
    border-radius: 10px;
    box-shadow: 0 10px 36px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08);
    border: 1px solid rgba(0,0,0,0.08);
    padding: 6px; z-index: 20001;
    display: flex; flex-direction: column; gap: 2px;
  }
  html.dark .menu-dropdown {
    background: #1a1f2e; color: #d0daea;
    border-color: rgba(255,255,255,0.08);
    box-shadow: 0 10px 36px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25);
  }

  .menu-item {
    background: transparent; border: none; text-align: left;
    padding: 9px 12px; border-radius: 7px; cursor: pointer;
    font-weight: 600; font-size: 0.9rem; color: inherit; width: 100%;
    transition: background 0.12s;
    display: flex; align-items: center; gap: 8px;
  }
  .menu-item--active { background: #1f79ff !important; color: #fff !important }
  .menu-item--active:hover { background: #1766d6 !important }
  html.dark .menu-item--active { background: #1a5fe0 !important; color: #fff !important }
  html.dark .menu-item--active:hover { background: #1450c0 !important }

  .menu-icon { width: 16px; height: 16px; flex-shrink: 0; display: block; overflow: visible }
  .menu-item:hover { background: rgba(30,126,148,0.1) }
  html.dark .menu-item:hover { background: rgba(30,126,148,0.2) }

  /* Expandable (Settings / Help) rows */
  .menu-item.has-sub { padding: 0; display: flex; flex-direction: column }
  .menu-item.has-sub > button {
    background: transparent; border: none; text-align: left;
    padding: 9px 12px; border-radius: 7px; cursor: pointer;
    font-weight: 600; font-size: 0.9rem; color: inherit;
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    transition: background 0.12s;
  }
  .menu-item.has-sub > button::after { content: '›'; font-size: 1.1rem; opacity: 0.5; transition: transform 0.18s }
  .menu-item.has-sub > button:hover { background: rgba(30,126,148,0.1) }
  html.dark .menu-item.has-sub > button:hover { background: rgba(30,126,148,0.2) }

  .submenu {
    margin: 2px 0 4px 8px; padding: 3px 0 3px 10px;
    border-left: 2px solid rgba(30,126,148,0.28);
    display: flex; flex-direction: column; gap: 1px;
  }
  html.dark .submenu { border-left-color: rgba(30,126,148,0.45) }

  .sub-item { font-weight: 500; font-size: 0.875rem; padding: 7px 10px }

  .menu-sep { height: 1px; background: rgba(0,0,0,0.07); margin: 4px 6px; border-radius: 1px }
  html.dark .menu-sep { background: rgba(255,255,255,0.08) }
}

/* Tabs visibility is controlled via the `tabs-hidden` root class, which is
   toggled from JavaScript at the single 1100px breakpoint. This avoids
   scrollbar/rounding mismatches between CSS media queries and JS checks. */
.tabs-hidden .tabs { display: none !important }

/* Tab dropdown in header for small screens */
.tab-dropdown-root { position: absolute; right: 12px; top: 8px; z-index: 20002 }
.menu-root .tab-dropdown-root { position: relative; right: auto; top: auto; margin-left: auto }
.menu-root .tab-dropdown-root .tab-dropdown-menu { left: auto; right: 0; top: 36px }
.tab-dropdown-button { background: #fff; border: 1px solid #c8d6e8; padding: 6px 10px; border-radius: 6px; cursor: pointer; white-space: nowrap }
.dark .tab-dropdown-button { background: #1c2030; border-color: #2e3a52; color: #d0daea }
.tab-dropdown-menu { position: absolute; right: 0; top: 40px; min-width: 160px; background: #fff; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.18); padding: 6px; display:flex; flex-direction: column; gap:6px }
.dark .tab-dropdown-menu { background: #12141c; color: #d0daea }
.tab-dropdown-item { background: var(--tab-bg, transparent); border: 1px solid var(--tab-border, transparent); color: var(--tab-color, inherit); text-align: left; padding: 8px 10px; border-radius: 6px; cursor: pointer }
.tab-dropdown-item:hover { filter: brightness(0.95) }


/* Bottom-left small toolbox toggle and popup */
.tool-toggle-root { position: fixed; left: 12px; bottom: 12px; z-index: 20010; display: flex; flex-direction: column-reverse; align-items: flex-start }
.tool-toggle-button { background: #1f79ff; color: #fff; border: none; width: 44px; height: 44px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer }
.tool-toggle-button:hover { filter: brightness(0.95) }
.tool-popup { margin-bottom: 6px; margin-left: 0; display: flex; flex-direction: column; gap: 1px; background: rgba(255,255,255,0.98); border-radius: 8px; padding: 0; box-shadow: 0 8px 30px rgba(0,0,0,0.18) }
.dark .tool-popup { background: #11151b; color: #d0daea }
/* scaled down ~15% from previous 56/56 and 44/44 sizes */
.tool-popup-button { background: transparent; border: none; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; padding: 0; font-size: 24px; line-height: 1 }
.tool-popup-button svg { width: 32px; height: 32px }
.tool-popup-button:hover { background: rgba(0,0,0,0.06) }
.dark .tool-popup-button:hover { background: rgba(255,255,255,0.03) }
/* Ensure character icons inside popup buttons are large and vertically centered */
.tool-popup-button .toolbox-char { font-size: 24px; line-height: 1; display: inline-block; transform: translateY(-1px) }

@media (max-width: 420px) {
  .tool-popup { transform: translateY(-4px); }
}

/* ── Settings launch button (replaces the 4-icon palette toolbox) ── */
.toolbox-settings-btn {
  width: 100%;
  background: #fff;
  border: 1px solid #c8d6e8;
  border-radius: 6px;
  padding: 9px 14px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  color: #21313a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 0 rgba(0,0,0,0.03);
  transition: background 0.12s, border-color 0.12s;
}
.toolbox-settings-btn:hover { background: #eef4ff; border-color: #5b8fd9 }
.toolbox-settings-btn .toolbox-icon { width: 18px; height: 18px; display: block; flex-shrink: 0 }
.dark .toolbox-settings-btn { background: #2b3338; border-color: #444d55; color: #eef6f1 }
.dark .toolbox-settings-btn:hover { background: #1a2640; border-color: #5a7aaa }

/* ── Settings Modal ── */
.settings-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(2px);
}
.settings-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.22);
  width: min(400px, calc(100vw - 32px));
  max-height: min(92vh, 580px);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.settings-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid #e8ecf3;
  gap: 6px;
  flex-shrink: 0;
}
.settings-modal-header-left { min-width: 60px; display: flex; align-items: center }
.settings-modal-title {
  margin: 0; font-size: 1.05rem; font-weight: 700; color: #1a2a4a;
  flex: 1; text-align: center;
}
.settings-modal-close {
  border: none; background: none; cursor: pointer;
  color: #888; font-size: 1rem; padding: 4px 6px;
  border-radius: 4px; min-width: 28px; text-align: center;
  flex-shrink: 0;
}
.settings-modal-close:hover { background: #f0f0f0; color: #333 }
.settings-modal-body {
  overflow-y: auto;
  padding: 6px 0;
  display: flex; flex-direction: column;
  flex: 1;
}
.settings-row {
  display: flex; align-items: center; gap: 14px;
  padding: 11px 18px;
  background: transparent; border: none; width: 100%;
  text-align: left; cursor: default;
  border-bottom: 1px solid #f0f3f8;
  transition: background 0.1s;
  box-sizing: border-box;
}
button.settings-row { cursor: pointer }
button.settings-row:hover { background: #f4f8ff }
.settings-row:last-child { border-bottom: none }
.settings-row-icon {
  flex-shrink: 0;
  width: 34px; height: 34px;
  background: #eef4ff;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #2a5db0;
}
.settings-row-icon svg { width: 16px; height: 16px; display: block }
.settings-row-icon--mod { background: #fff0e8; color: #b85010 }
.settings-row-body {
  flex: 1;
  display: flex; flex-direction: column; gap: 2px;
  min-width: 0;
}
.settings-row-title { font-size: 0.875rem; font-weight: 600; color: #1a2030; line-height: 1.2 }
.settings-row-desc { font-size: 0.75rem; color: #6a7a94; line-height: 1.3 }
.settings-row-chevron { font-size: 1.15rem; color: #aab8cc; flex-shrink: 0; line-height: 1 }
.settings-row-badge {
  font-size: 0.7rem; font-weight: 700;
  background: #e8edf5; color: #4a6080;
  border-radius: 5px; padding: 2px 8px;
  flex-shrink: 0; letter-spacing: 0.02em; white-space: nowrap;
}
.settings-row--mods .settings-row-icon { background: #fff0e8; color: #b85010 }
button.settings-row--mods:hover { background: #fff8f2 }

/* Toggle switch */
.settings-toggle {
  flex-shrink: 0;
  width: 44px; height: 24px;
  border-radius: 12px;
  border: none;
  background: #c4d0e0;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
}
.settings-toggle.active { background: #1f79ff }
.settings-toggle-thumb {
  position: absolute;
  top: 3px; left: 3px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.18);
  transition: transform 0.18s;
  display: block;
}
.settings-toggle.active .settings-toggle-thumb { transform: translateX(20px) }

/* MOD list */
.settings-mods-empty {
  padding: 24px 18px;
  color: #8898b0; font-size: 0.85rem; text-align: center;
}
.settings-mods-label {
  margin: 14px 18px 4px;
  font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.09em;
  color: #5070a0;
}
.settings-mods-list {
  display: flex; flex-direction: column;
  padding: 2px 10px 8px;
}
.settings-mod-item {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 10px;
  background: transparent; border: none; width: 100%;
  text-align: left; cursor: pointer;
  border-radius: 8px;
  transition: background 0.1s;
}
.settings-mod-item:hover:not(:disabled) { background: #eef4ff }
.settings-mod-item--off { opacity: 0.38; pointer-events: none }
.settings-mod-item:disabled { opacity: 0.38; cursor: not-allowed }
.settings-mod-check {
  flex-shrink: 0;
  width: 22px; height: 22px;
  border-radius: 5px;
  border: 2px solid #b8c8d8;
  background: #fff;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}
.settings-mod-check--on { background: #1f79ff; border-color: #1f79ff }
.settings-mod-check--on svg { fill: #fff }
.settings-mod-name { font-size: 0.875rem; font-weight: 500; color: #1a2030 }
</style>
<style>
/* ─── Dark Mode Overrides ──────────────────────────────────────────────────
   html.dark .classname specificity (0,2,1) beats Vue scoped (0,2,0)
   ─────────────────────────────────────────────────────────────────────── */

/* ── Help / Dark buttons ── */
html.dark .help-button { border-color: #3a5a88; background: #1a2640; color: #7aaade; }
html.dark .help-button:hover { background: #223060; border-color: #5a7aaa; }
html.dark .darkmode-button { border-color: #3a5a88; background: #1a2640; color: #7aaade; }
html.dark .darkmode-button:hover { background: #223060; border-color: #5a7aaa; }

/* Palette status bar (hover text) */
html.dark .palette-status-bar {
  background: #1e2629;
  border-color: #33393d;
  color: #b0c0da;
}

/* ── Tagline ── */
html.dark .title-tagline { color: #4a5a70; }

/* ── Help / Credits modal ── */
html.dark .help-modal { background: #1c2030; }
html.dark .help-modal-header { border-bottom-color: #2e3a52; }
html.dark .help-modal-header h2 { color: #d0daea; }
html.dark .help-modal-close { color: #8898b0; }
html.dark .help-modal-close:hover { background: #2e3a52; color: #d0daea; }
html.dark .help-modal-body section h3 { color: #5a7aaa; border-bottom-color: #2e3a52; }
html.dark .help-modal-body dt { background: #141926; border-color: #2a3a54; color: #9ab0cc; }
html.dark .help-modal-body dd { color: #b0c0da; }
html.dark .credits-body { color: #b0c0da; }
html.dark .credits-body h1 { color: #d0daea; }
html.dark .credits-body h2 { color: #d0daea; border-bottom-color: #2e3a52; }
html.dark .credits-body h3 { color: #5a7aaa; border-bottom-color: #2e3a52; }
html.dark .credits-body a { color: #7aaade; }
html.dark .credits-body a:hover { color: #a0c4f0; }
html.dark .credits-body code { background: #141926; border-color: #2a3a54; color: #a0b8d0; }
html.dark .credits-body blockquote { background: #141e2e; border-left-color: #3a5a88; color: #8898b0; }

/* ── Feedback modal ── */
html.dark .feedback-modal { background: #1c2030; }
html.dark .feedback-modal-header h2 { color: #d0daea; }
html.dark .feedback-modal-close { color: #8898b0; }
html.dark .feedback-modal-close:hover { background: #2e3a52; color: #d0daea; }
html.dark .feedback-modal-subtitle { color: #8898b0; }
html.dark .feedback-option { background: #141926; border-color: #2e3a52; }
html.dark .feedback-option--github { color: #d0daea; }
html.dark .feedback-option--github:hover { background: #1c2a40; border-color: #4a6a88; }
html.dark .feedback-option--discord:hover { background: #1c1e40; border-color: #5a5aaa; }
html.dark .feedback-option--github .feedback-option-icon { background: #253040; }
html.dark .feedback-option--discord .feedback-option-icon { background: #1e2040; }

/* ── GridView ── */
html.dark .viewport-box { background: #151a26; border-color: #2a3a54; }
html.dark .viewport-box.file-drag-over { background: #1a2840; border-color: #4a7aaa; }
html.dark .grid { background: #1e2738; border-color: #3a5070; }
html.dark .grid-item { border-color: #2a3a54; }
html.dark .grid-item.selected { background: #11263f; border: 2px dashed #ffffff; box-shadow: none; }
html.dark .grid-item.move-source { background: #11263f; border: 2px dashed #ffffff; box-shadow: none; }
html.dark .hover-icon-box { background: #1a2535; border-color: #2a3a54; }
html.dark .grid-status-bar { color: #6a8ab0; background: #141926; border-color: #2a3a54; }
html.dark .context-menu { background: #1c2030; border-color: #2e3a52; }
html.dark .context-menu-item { color: #d0daea; }
html.dark .context-menu-item:hover { background: #1c2a40; }
html.dark .context-menu-cancel { color: #6a7a94; border-top-color: #2e3a52; }
html.dark .tab-rename-input { border-bottom-color: #5a6a80; }

/* Tab post-its */
html.dark .tab-postit { background: #252015; border-color: #4a3a20; box-shadow: 2px 2px 6px rgba(0,0,0,0.5); }
html.dark .tab-postit.tab-color-structure { background: #1e2028; border-color: #3a3e4a; }
html.dark .tab-postit.tab-color-complete { background: #1e2028; border-color: #3a3e4a; }
html.dark .tab-postit.add { background: #182638; border-color: #2e4060; }
html.dark .tab-user-0 { background: #2e3340; border-color: #5a6070; }
html.dark .tab-user-0.active { background: #363c4a; border-color: #6a7080; }
html.dark .tab-user-1 { background: #183560; border-color: #3a68a8; }
html.dark .tab-user-1.active { background: #1e3e70; border-color: #4a78b8; }
html.dark .tab-user-2 { background: #163a22; border-color: #348a50; }
html.dark .tab-user-2.active { background: #1a4428; border-color: #44a060; }
html.dark .tab-user-3 { background: #3a1630; border-color: #884060; }
html.dark .tab-user-3.active { background: #461a38; border-color: #a05070; }
html.dark .tab-user-4 { background: #2a1448; border-color: #6840a0; }
html.dark .tab-user-4.active { background: #321854; border-color: #7850b0; }
html.dark .tab-user-5 { background: #3a2408; border-color: #906020; }
html.dark .tab-user-5.active { background: #462c0a; border-color: #a07030; }
html.dark .tab-user-6 { background: #103834; border-color: #308878; }
html.dark .tab-user-6.active { background: #14423e; border-color: #409888; }
html.dark .tab-user-7 { background: #3c1818; border-color: #904040; }
html.dark .tab-user-7.active { background: #481e1e; border-color: #a05050; }
html.dark .tab-user-8 { background: #103248; border-color: #3078a0; }
html.dark .tab-user-8.active { background: #143a54; border-color: #4088b0; }
html.dark .tab-user-9 { background: #1e3810; border-color: #508828; }
html.dark .tab-user-9.active { background: #244214; border-color: #609832; }

/* ── AppliancePalette ── */
html.dark .side-box { background: #1c2030; border-color: #2e3a52; }
html.dark .filter input { background: #141926; border-color: #2a3a54; color: #d0daea; }
html.dark .filter input::placeholder { color: #5a6a80; }
html.dark .palette-item { border-color: #2a3a54; }
html.dark .palette-item:hover { border-color: #4a6a8a; background: #1a2030; }
html.dark .palette-tabs { border-bottom-color: #2e3a52; }
html.dark .palette-tab { color: #6a7a94; }
html.dark .palette-tab:hover { color: #7aaade; }
html.dark .blueprint-add-item { background: #141926; border-color: #2a3a54; }
html.dark .blueprint-add-item:hover { background: #1a2840; border-color: #3a5a88; }
html.dark .blueprint-item:hover { background: #1a2840; border-color: #3a5a88; }
html.dark .bp-import-btn { background: #141926; border-color: #2a3a54; color: #7aaade; }
html.dark .bp-import-btn:hover { background: #1a2840; border-color: #4a7aaa; }
html.dark .bp-drop-zone.bp-drag-over { background: #1a2840; border-color: #4a7aaa; }
html.dark .structure-tool-item { background: #141926; border-color: #2e3a52; }
html.dark .structure-tool-item:hover:not(.active) { background: #1a2030; border-color: #3a4a60; }
html.dark .structure-tool-item.active { background: #1a2e50; border-color: #1f79ff; }
html.dark .tool-name { color: #d0daea; }
html.dark .tool-desc { color: #6a7a94; }
html.dark .structure-hint { color: #4a5a70; }
html.dark .structure-header { color: #c87a7a; border-bottom-color: #4a2a2a; }
html.dark .preview-info-banner { background: #1e1c08; border-color: #5a5010; color: #b0a060; }
html.dark .inventory-panel { background: #1c2030; border-color: #2e3a52; }
html.dark .inventory-header { border-bottom-color: #2e3a52; }
html.dark .inventory-title { color: #d0daea; }

/* ── News title link ── */
.news-title-link {
  cursor: pointer;
  user-select: none;
}
.news-title-link:hover {
  opacity: 0.75;
}

/* ── TutorialModal ── */
html.dark .tutorial-modal { background: #1c2030; }
html.dark .tutorial-header { border-bottom-color: #2e3a52; }
html.dark .tutorial-header h2 { color: #d0daea; }
html.dark .tutorial-skip { color: #6a7a94; }
html.dark .tutorial-skip:hover { color: #d0daea; }
html.dark .tutorial-gif { border-color: #2e3a52; }
html.dark .tutorial-text h3 { color: #d0daea; }
html.dark .tutorial-text p { color: #8898b0; }
html.dark .tutorial-footer { border-top-color: #2e3a52; }
html.dark .tutorial-dot { background: #2e3a52; }
html.dark .tutorial-nav-btn.secondary { background: #1e2838; color: #7aaade; }
html.dark .tutorial-nav-btn.secondary:hover { background: #2a3848; }

/* ── Wall / hatch / door edge markers ── */
html.dark .edge-marker.edge-type-wall  { background: #c8d4e8; }
html.dark .edge-marker.edge-type-hatch {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='24' viewBox='0 0 12 24'%3E%3Ccircle cx='6' cy='6' r='5' fill='%23a0b4cc'/%3E%3Ccircle cx='6' cy='18' r='5' fill='%23a0b4cc'/%3E%3C/svg%3E") center/12px 24px repeat;
}
html.dark .edge-marker.edge-type-door  { background: #f0a830; }

/* ── Structure palette swatches ── */
html.dark .swatch-wall  { background: #c8d4e8; }
html.dark .swatch-hatch {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='24' viewBox='0 0 12 24'%3E%3Ccircle cx='6' cy='6' r='5' fill='%23a0b4cc'/%3E%3Ccircle cx='6' cy='18' r='5' fill='%23a0b4cc'/%3E%3C/svg%3E") center/12px 24px repeat;
  border-color: #a0b4cc;
}
html.dark .swatch-door  { background: #f0a830; }

/* ── Number inputs (room size controls in GridView) ── */
html.dark input[type="number"] { background: #141926; border-color: #2a3a54; color: #d0daea; }

/* ── Settings button & modal – dark mode ── */
html.dark .toolbox-settings-btn { background: #2b3338; border-color: #444d55; color: #eef6f1 }
html.dark .toolbox-settings-btn:hover { background: #1a2640; border-color: #5a7aaa }
html.dark .settings-modal { background: #1c2030 }
html.dark .settings-modal-header { border-bottom-color: #2e3a52 }
html.dark .settings-modal-title { color: #d0daea }
html.dark .settings-modal-close { color: #8898b0 }
html.dark .settings-modal-close:hover { background: #2e3a52; color: #d0daea }
html.dark .settings-row { border-bottom-color: #1e2535 }
html.dark button.settings-row:hover { background: #1a2640 }
html.dark .settings-row-icon { background: #1a2640; color: #7aaade }
html.dark .settings-row-icon--mod { background: #3a1e10; color: #e07830 }
html.dark .settings-row-title { color: #d0daea }
html.dark .settings-row-desc { color: #6a7a94 }
html.dark .settings-row-chevron { color: #4a5a70 }
html.dark .settings-row-badge { background: #1e2535; color: #7a94b0 }
html.dark .settings-row--mods .settings-row-icon { background: #3a1e10; color: #e07830 }
html.dark button.settings-row--mods:hover { background: #2a1810 }
html.dark .settings-toggle { background: #2e3d52 }
html.dark .settings-toggle.active { background: #1a5fe0 }
html.dark .settings-mods-label { color: #5a7aaa }
html.dark .settings-mods-empty { color: #5a6a7a }
html.dark .settings-mod-item:hover:not(:disabled) { background: #1a2640 }
html.dark .settings-mod-check { background: #141926; border-color: #2e3a52 }
html.dark .settings-mod-check--on { background: #1a5fe0; border-color: #1a5fe0 }
html.dark .settings-mod-name { color: #d0daea }
</style>

<style>
/* Responsive: when palette collapses to one column hide room size text */
@media (max-width: 1100px) {
  html .palette-toolbox .toolbox-button--size { padding: 8px !important; width: 44px !important; }
  html .palette-toolbox .toolbox-button--size .toolbox-size-text { display: none !important }
  html .palette-toolbox .toolbox-button--size .toolbox-icon { width: 20px !important; height: 20px !important }
}
@media (max-width: 1310px) {
  /* Hide tagline when space is limited */
  html .title-tagline { display: none !important }
}

/* Spinner overlay while waiting for appliances.json */
.appliance-map-overlay {
  position: fixed;
  left: 0; right: 0; top: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.35);
  z-index: 20050;
  flex-direction: column;
}
.appliance-map-spinner {
  width: 64px; height: 64px; border-radius: 50%;
  border: 6px solid rgba(255,255,255,0.2);
  border-top-color: rgba(255,255,255,0.95);
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}
.appliance-map-text { color: #fff; font-weight: 700 }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
</style>