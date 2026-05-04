<template>
  <div :class="['root', { dark: darkMode }]">
    <header class="top-bar">
      <div class="title-group">
        <h1>PlateUp Tool</h1>
        <span class="title-tagline">An online planner for your PlateUp! restaurant</span>
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
        <button class="saveload-button" @click="openSaveLoadMenu" title="Save, load or share your design">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M11 2H9v3h2V2z"/>
            <path d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0zM1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v3.5A1.5 1.5 0 0 1 11.5 6h-7A1.5 1.5 0 0 1 3 4.5V1H1.5a.5.5 0 0 0-.5.5zm3 4a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V1H4v4.5zM3 15h10v-4.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5V15z"/>
          </svg>
          Save / Load
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
      <div class="palette-column">
        <AppliancePalette />
        <div class="palette-toolbox-box" title="Palette toolbox (controls) - Undo - Ctrl + Z">
          <div class="palette-toolbox" role="toolbar" aria-label="Palette toolbox">
            <button class="toolbox-button toolbox-button--size" @click="showSizeModal = true" title="Change room size">
              <svg class="toolbox-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
                <path d="M3 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H4v4.5a.5.5 0 0 1-1 0v-5zm9-3a.5.5 0 0 1-.5.5H7v-5a.5.5 0 0 1 1 0V6h3.5a.5.5 0 0 1 .5.5z"/>
              </svg>
              <span class="toolbox-size-text">{{ state.roomWidth }}&times;{{ state.roomHeight }}</span>
            </button>

            <button class="toolbox-button" @click="toggleDarkMode" :title="darkMode ? 'Switch to light mode' : 'Switch to dark mode'">
              <svg class="toolbox-icon" v-if="!darkMode" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
              </svg>
              <svg class="toolbox-icon" v-else xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zM8 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zM16 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 16 8zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zM12.657 2.343a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM4.464 11.536a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM12.657 13.657a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707z"/>
              </svg>
            </button>

            <button :class="['toolbox-button', 'toolbox-button--icon', 'toolbox-button--teleporter', { active: teleporterLines } ]" @click="toggleTeleporterLines" title="Toggle teleporter connector lines (T)">
              <svg class="toolbox-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <line x1="1.8" y1="1.8" x2="14.2" y2="14.2" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2" stroke-linecap="round"/>
                <circle cx="2" cy="2" r="2" fill="currentColor"/>
                <circle cx="14" cy="14" r="2" fill="currentColor"/>
              </svg>
            </button>

            <button :class="['toolbox-button', 'toolbox-button--icon', 'toolbox-button--teleporter']" @click="toggleLabelDisplayMode" :title="labelDisplayMode === 0 ? 'Labels: lines + text' : (labelDisplayMode === 1 ? 'Labels: text only' : 'Labels: hidden')">
              <svg v-if="labelDisplayMode === 0" class="toolbox-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <!-- small rectangle top-left (6x6) -->
                <rect x="3" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4" />
                <!-- dashed diagonal from rect bottom-right (9,9) to icon bottom-right (16,16) -->
                <line x1="9" y1="9" x2="16" y2="16" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 2" stroke-linecap="round" />
                <circle cx="3.5" cy="3.5" r="1" fill="currentColor" />
                <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
              </svg>
              <svg v-else-if="labelDisplayMode === 1" class="toolbox-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4" />
                <line x1="5" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
              </svg>
              <svg v-else class="toolbox-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4" />
                <line x1="3" y1="5" x2="15" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <RestaurantSizeModal v-if="showSizeModal" @choose="onSizeChosen" />
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
import { useRestaurantStore, encodeState as encodeStateFn } from './store/restaurant'
import { useGrid } from './composables/useGrid'
import GridView from './components/GridView.vue'
import AppliancePalette from './components/AppliancePalette.vue'
import creditsRaw from './CREDITS.md?raw'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import TutorialModal, { hasTutorialBeenSeen } from './components/TutorialModal.vue'
import RestaurantSizeModal from './components/RestaurantSizeModal.vue'
import { isDefaultState } from './store/restaurant'

export default {
  name: 'App',
  components: { GridView, AppliancePalette, TutorialModal, RestaurantSizeModal },
  setup() {
    const { state, loadFromHash, syncToHash } = useRestaurantStore()
    const _encodeState = encodeStateFn
    const { loadGridFromState, paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon, cellSize, selectedCells, selectedLabelIds } = useGrid()

    const showHelp = ref(false)
    const showCredits = ref(false)
    const showTutorial = ref(false)
    const showSizeModal = ref(false)
    const showCopiedToast = ref(false)
    const showFeedbackModal = ref(false)
    const darkMode = ref(localStorage.getItem('darkMode') === 'true')
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

    function toggleDarkMode() {
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
    const URL_KEYS = ['tabs', 'orientation', 'roomWidth', 'roomHeight', 'walls', 'gridCells', 'labels']
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

    onMounted(() => {
      document.documentElement.classList.toggle('dark', darkMode.value)
      loadFromHash()
      loadGridFromState()
      // Broadcast current visibility preferences so components render consistently
      try {
        window.dispatchEvent(new CustomEvent('teleporter-lines-changed', { detail: teleporterLines.value }))
        window.dispatchEvent(new CustomEvent('label-display-mode-changed', { detail: labelDisplayMode.value }))
      } catch (e) {}
      if (!hasTutorialBeenSeen()) {
        showTutorial.value = true
      } else if (isDefaultState()) {
        showSizeModal.value = true
      }
      window.addEventListener('hashchange', () => {
        loadFromHash()
        loadGridFromState()
        // Reset undo stack when a new URL/state is loaded
        try {
          const snap = JSON.stringify(buildFullSnapshot())
          writeUndo([snap])
        } catch (e) {}
        // Ensure the size modal reflects the newly loaded state. If the loaded
        // state is the default (new restaurant) show the modal, otherwise hide it.
        try {
          showSizeModal.value = isDefaultState()
        } catch (e) {
          showSizeModal.value = false
        }
      })
      window.addEventListener('plateup-copy-link', copyUrl)
      // Listen for external undo requests (from child components)
      window.addEventListener('plateup-undo', undo)
      // Ctrl+Z undo handler
      const onKey = (e) => {
        const key = (e.key || '').toLowerCase()
        if ((e.ctrlKey || e.metaKey) && key === 'z') {
          e.preventDefault()
          undo()
        }
      }
      window.addEventListener('keydown', onKey)
      // remove on unload
      window.addEventListener('beforeunload', () => {
        window.removeEventListener('keydown', onKey)
        window.removeEventListener('plateup-undo', undo)
      })
    })

    function startAgain() {
      // If there are any modifications (appliances/walls), confirm before discarding them
      if (!isDefaultState()) {
        const confirmed = window.confirm('This will discard any unsaved changes and reset the planner. Continue?')
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
    function undo() {
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
        loadGridFromState()
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
      try {
        teleporterLines.value = !teleporterLines.value
        const next = teleporterLines.value
        localStorage.setItem('teleporterLines', next ? '1' : '0')
        window.dispatchEvent(new CustomEvent('teleporter-lines-changed', { detail: next }))
      } catch (e) {}
    }

    function toggleLabelDisplayMode() {
      try {
        labelDisplayMode.value = (labelDisplayMode.value + 1) % 3
        localStorage.setItem('labelDisplayMode', String(labelDisplayMode.value))
        window.dispatchEvent(new CustomEvent('label-display-mode-changed', { detail: labelDisplayMode.value }))
      } catch (e) {}
    }

    function onSizeChosen({ w, h }) {
      state.roomWidth = Number(w)
      state.roomHeight = Number(h)
      loadGridFromState()
      showSizeModal.value = false
    }

    // When tutorial closes, if state is default show the size picker
    watch(showTutorial, (v) => {
      if (!v && isDefaultState()) showSizeModal.value = true
    })

    return { startAgain, showHelp, showCredits, showTutorial, showSizeModal, showCopiedToast, creditsHtml, openDonate, openFeedback, openGitHubIssues, openDiscord, showFeedbackModal, copyUrl, openSaveLoadMenu, darkMode, toggleDarkMode, toggleTeleporterLines, teleporterLines, toggleLabelDisplayMode, labelDisplayMode, paletteDragActive, paletteDragItem, paletteDragPos, get2DApplianceIcon, isImageIcon, cellSize, state, onSizeChosen, undo }
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

.feedback-button-icons { display: inline-flex; align-items: center; gap: 6px; margin-right: 4px }

.saveload-button {
  border: none; background: #1e7e94; color: white; padding: 0.4rem 0.8rem;
  border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center;
  gap: 5px; font-size: 0.875rem; font-weight: 600;
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
  padding-left: 90px;
  overflow: visible;
  align-items: flex-start;
}

.palette-column { display:flex; flex-direction:column; gap:8px; align-items:stretch }
.palette-toolbox-box { display:flex; align-items:center; padding:5px; background: #f4f8fb; border-radius:8px; border: 1px solid #d2dfe9; width: 100%; box-sizing: border-box }
.dark .palette-toolbox-box { background: #1e2629; border-color: #33393d }
.palette-toolbox { display:flex; gap:8px; align-items:center }
.palette-toolbox::before, .palette-toolbox::after { content: ''; flex: 1 1 auto }
.palette-toolbox > * { flex: 0 0 auto }
.palette-toolbox .toolbox-button { background: #fff; border: 1px solid #c8d6e8; border-radius: 6px; padding: 8px 10px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 0 rgba(0,0,0,0.03); color: #21313a; display: inline-flex; align-items: center; justify-content: center }
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
  background: repeating-linear-gradient(45deg, #a0b4cc 0px, #a0b4cc 3px, transparent 3px, transparent 7px);
}
html.dark .edge-marker.edge-type-door  { background: #f0a830; }

/* ── Structure palette swatches ── */
html.dark .swatch-wall  { background: #c8d4e8; }
html.dark .swatch-hatch {
  background: repeating-linear-gradient(45deg, #a0b4cc 0px, #a0b4cc 4px, transparent 4px, transparent 8px);
  border-color: #a0b4cc;
}
html.dark .swatch-door  { background: #f0a830; }

/* ── Number inputs (room size controls in GridView) ── */
html.dark input[type="number"] { background: #141926; border-color: #2a3a54; color: #d0daea; }
</style>

<style>
/* Responsive: when palette collapses to one column hide room size text */
@media (max-width: 1280px) {
  html .palette-toolbox .toolbox-button--size { padding: 8px !important; width: 44px !important; }
  html .palette-toolbox .toolbox-button--size .toolbox-size-text { display: none !important }
  html .palette-toolbox .toolbox-button--size .toolbox-icon { width: 20px !important; height: 20px !important }
}
</style>