<template>
  <div class="dialog-backdrop" :class="{ dark: isDark }" @click="onCancel">
    <div class="dialog" :class="{ dark: isDark }" @click.stop>
      <div class="dialog-title">{{ title }}</div>
      <div class="dialog-body">
        <input ref="inp" v-model="textLocal" :maxlength="maxLength" @keydown.enter.prevent="confirm" @keydown.esc.prevent="onCancel" />
        <div class="dialog-meta">
          <div class="dialog-hint">Allows up to {{ maxLength }} characters.</div>
          <div class="char-count">{{ textLocal.trim().length }} / {{ maxLength }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <button @click="onCancel">Cancel</button>
        <button @click="confirm" :disabled="!canConfirm">OK</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
export default {
  name: 'AddLabelDialog',
  props: {
    initialText: { type: String, default: '' },
    title: { type: String, default: 'Label text:' },
    maxLength: { type: Number, default: 15 }
  },
  emits: ['confirm', 'cancel'],
  setup(props, ctx) {
    const textLocal = ref(props.initialText || '')
    const inp = ref(null)
    onMounted(() => { nextTick(() => { if (inp.value) { inp.value.focus(); inp.value.select() } }) })

    // Track global dark-mode class on <html> so dialog can style itself
    const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
    let __observer = null
    try {
      __observer = new MutationObserver(() => { isDark.value = document.documentElement.classList.contains('dark') })
      __observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    } catch (e) {}
    onUnmounted(() => { try { if (__observer) __observer.disconnect() } catch (e) {} })
    function confirm() {
      const t = (textLocal.value || '').trim().slice(0, props.maxLength)
      if (!t) return
      ctx.emit('confirm', t)
    }
    function onCancel() { ctx.emit('cancel') }
    const canConfirm = computed(() => (textLocal.value || '').trim().length > 0)
    return { textLocal, inp, confirm, onCancel, canConfirm, isDark }
  }
}
</script>

<style scoped>
.dialog-backdrop { position: fixed; inset: 0; background: rgba(12,18,28,0.45); display:flex; align-items:center; justify-content:center; z-index:20000 }
.dialog { background: #fff; border-radius:8px; padding: 14px; width: 320px; box-shadow: 0 12px 30px rgba(0,0,0,0.35) }
.dialog-title { font-weight:700; margin-bottom:8px }
.dialog-body { display:block }
.dialog-body input { display:block; width:100%; padding:8px 10px; border-radius:6px; border:1px solid #c8d6e8; outline:none }
.dialog-meta { display:flex; justify-content:space-between; align-items:center; margin-top:8px }
.dialog-hint { font-size:12px; color:#586b7a }
.char-count { font-size:12px; color:#586b7a }
.dialog-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px }
.dialog-actions button { padding:8px 12px; border-radius:6px; border:1px solid #cbdffb; background:#f6fbff }

/* Dark mode (component-local) */
.dialog-backdrop.dark { background: rgba(8,12,16,0.65) }
.dialog.dark { background: #172127; color: #e6fff0; box-shadow: 0 12px 30px rgba(0,0,0,0.6) }
.dialog.dark .dialog-title { color: #e6fff0 }
.dialog.dark .dialog-body input { background: #0f1620; color: #e6fff0; border: 1px solid rgba(255,255,255,0.06) }
.dialog.dark .dialog-hint, .dialog.dark .char-count { color: #9fd0ff }
.dialog.dark .dialog-actions button { background: #1a2a38; border-color: #3a6a8a; color: #cce6ff }
.dialog.dark .dialog-actions button:disabled { opacity: 0.45; background: #0d1a24; border-color: rgba(255,255,255,0.03); color: rgba(255,255,255,0.4) }
</style>
