<template>
  <span class="help-list-icon">
    <template v-if="id === 'cut'">
      <span class="hp-char">✂</span>
    </template>
    <template v-else-if="id === 'copy'">
      <span class="hp-char">📋</span>
    </template>
    <template v-else-if="id === 'paste'">
      <span class="hp-char">📥</span>
    </template>
    <template v-else-if="id === 'duplicate'">
      <span class="hp-char">⎘</span>
    </template>
    <template v-else-if="id === 'box-select'">
      <svg class="hp-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </template>
    <template v-else-if="id === 'select-all'">
      <span class="hp-char">▣</span>
    </template>
    <template v-else-if="id === 'invert'">
      <svg class="hp-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><polyline points="9,9 6,12 9,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><polyline points="15,9 18,12 15,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </template>
    <template v-else-if="id === 'rotate-left'">
      <span class="hp-char">⟲</span>
    </template>
    <template v-else-if="id === 'rotate-right'">
      <span class="hp-char">⟳</span>
    </template>
    <template v-else-if="id === 'flip-h'">
      <span class="hp-char" style="display:inline-block;transform:rotate(90deg)">⇋</span>
    </template>
    <template v-else-if="id === 'flip-v'">
      <span class="hp-char">⇋</span>
    </template>
    <template v-else-if="id === 'undo'">
      <span class="hp-char">↶</span>
    </template>
    <template v-else-if="id === 'delete'">
      <span class="hp-char">🗑</span>
    </template>
    <template v-else-if="id === 'help'">
      <span class="hp-char">?</span>
    </template>
    <template v-else-if="id === 'dark-mode'">
      <template v-if="isDark">
        <svg class="hp-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zM8 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zM16 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 16 8zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zM12.657 2.343a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM4.464 11.536a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM12.657 13.657a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707z"/></svg>
      </template>
      <template v-else>
        <svg class="hp-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
      </template>
    </template>
    <template v-else-if="id === 'label'">
      <svg class="hp-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="7.5" y1="9.5" x2="7.5" y2="14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </template>
    <template v-else-if="id === 'size'">
      <svg class="hp-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z" fill="currentColor"/><path d="M3 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H4v4.5a.5.5 0 0 1-1 0v-5zm9-3a.5.5 0 0 1-.5.5H7v-5a.5.5 0 0 1 1 0V6h3.5a.5.5 0 0 1 .5.5z"/></svg>
    </template>
    <template v-else-if="id === 'label-display'">
      <template v-if="labelDisplayMode === 0">
        <svg class="hp-svg" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="9" y1="9" x2="16" y2="16" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 2" stroke-linecap="round"/><circle cx="3.5" cy="3.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/></svg>
      </template>
      <template v-else-if="labelDisplayMode === 1">
        <svg class="hp-svg" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
      </template>
      <template v-else>
        <svg class="hp-svg" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="5" x2="15" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </template>
    </template>
    <template v-else-if="id === 'teleporter-lines'">
      <svg class="hp-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="1.8" y1="1.8" x2="14.2" y2="14.2" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2" stroke-linecap="round"/><circle cx="2" cy="2" r="2" fill="currentColor"/><circle cx="14" cy="14" r="2" fill="currentColor"/></svg>
    </template>
    <template v-else>
      <span class="hp-char">•</span>
    </template>
  </span>
</template>

<script>
export default {
  name: 'HelpIcon',
  props: {
    id: { type: String, required: true },
    isDark: { type: Boolean, default: false },
    labelDisplayMode: { type: Number, default: 0 }
  }
}
</script>

<style scoped>
.help-list-icon { width: 48px; display: inline-flex; align-items: center; justify-content: center }
.hp-svg { width: 40px; height: 40px; display: block }
</style>
