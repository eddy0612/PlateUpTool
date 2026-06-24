<template>
  <teleport to="body">
    <div class="news-backdrop">
      <div class="news-modal" role="dialog" aria-modal="true" aria-labelledby="news-modal-title">
        <!-- Header -->
        <div class="news-header">
          <h2 id="news-modal-title">What's New</h2>
        </div>

        <!-- Body: scrollable list of news entries, oldest first -->
        <div class="news-body">
          <div v-for="entry in [...news].reverse()" :key="entry.version" class="news-entry">
            <div class="news-entry-meta">
              <span class="news-version">v{{ entry.version }}</span>
              <span class="news-date">{{ entry.date }}</span>
            </div>
            <h3 class="news-entry-title">{{ entry.title }}</h3>
            <ul class="news-entry-items">
              <li v-for="(item, i) in entry.items" :key="i">{{ item }}</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div class="news-footer">
          <button class="news-btn-primary" @click="$emit('close')">Got it</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
export default {
  name: 'NewsModal',
  props: {
    news: {
      type: Array,
      required: true
    }
  },
  emits: ['close']
}
</script>

<style scoped>
.news-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.news-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.35);
  width: min(520px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────── */
.news-header {
  display: flex;
  align-items: center;
  padding: 14px 18px 10px;
  border-bottom: 1px solid #e0e4ec;
  flex-shrink: 0;
}

.news-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #1a2a4a;
}

/* ── Body ────────────────────────────────────────── */
.news-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.news-entry {
  border: 1px solid #e0e4ec;
  border-radius: 8px;
  padding: 12px 14px;
}

.news-entry-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.news-version {
  font-size: 0.75rem;
  font-weight: 700;
  background: #1a2a4a;
  color: #fff;
  border-radius: 4px;
  padding: 2px 7px;
  letter-spacing: 0.03em;
}

.news-date {
  font-size: 0.78rem;
  color: #888;
}

.news-entry-title {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: #1a2a4a;
}

.news-entry-items {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.news-entry-items li {
  font-size: 0.88rem;
  color: #333;
  line-height: 1.4;
}

/* ── Footer ──────────────────────────────────────── */
.news-footer {
  padding: 12px 18px;
  border-top: 1px solid #e0e4ec;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.news-btn-primary {
  background: #1a2a4a;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 22px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s;
}

.news-btn-primary:hover {
  background: #2a3e6a;
}

/* ── Dark mode ───────────────────────────────────── */
/* Use full :global() so selectors work inside <teleport> regardless of scoping */
:global(.dark .news-modal) {
  background: #1e2433;
  color: #e0e4ec;
}

:global(.dark .news-header) {
  border-bottom-color: #2e3a50;
}

:global(.dark .news-header h2) {
  color: #c8d4e8;
}

:global(.dark .news-entry) {
  border-color: #2e3a50;
  background: #252d3d;
}

:global(.dark .news-entry-title) {
  color: #c8d4e8;
}

:global(.dark .news-entry-items li) {
  color: #a0aec0;
}

:global(.dark .news-footer) {
  border-top-color: #2e3a50;
}

:global(.dark .news-date) {
  color: #6a7a90;
}
</style>
