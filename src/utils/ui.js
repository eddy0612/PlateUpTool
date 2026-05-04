// Lightweight DOM-based modal and toast utilities.
let __ui_style_injected = false
function ensureStyle() {
  if (__ui_style_injected) return
  __ui_style_injected = true
  const css = `
  .puui-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:10000}
  .puui-modal{background:#fff;color:#111;padding:18px;border-radius:8px;max-width:520px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.3);font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  .puui-modal p{margin:0 0 12px}
  .puui-modal-buttons{display:flex;gap:8px;justify-content:flex-end}
  .puui-modal button{padding:6px 10px;border-radius:6px;border:1px solid #ccc;background:#f6f6f6;cursor:pointer}
  .puui-toast{position:fixed;right:18px;bottom:18px;background:rgba(0,0,0,0.85);color:#fff;padding:10px 14px;border-radius:8px;z-index:10010;opacity:0;transition:opacity 250ms ease,transform 250ms ease;transform:translateY(6px);font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  .puui-toast.show{opacity:1;transform:translateY(0)}
  /* Dark-mode variants applied via runtime class 'puui-dark' */
  .puui-modal.puui-dark{background:#111;color:#e6e6e6;box-shadow:0 8px 22px rgba(0,0,0,0.6)}
  .puui-modal.puui-dark p{color:inherit}
  .puui-modal.puui-dark button{background:#1a1a1a;border-color:#333;color:#e6e6e6}
  .puui-modal-backdrop.puui-dark{background:rgba(0,0,0,0.7)}
  .puui-toast.puui-dark{background:rgba(255,255,255,0.06);color:#fff}
  `
  const s = document.createElement('style')
  s.innerText = css
  document.head.appendChild(s)
}

export function alert(message, title = 'Notice') {
  ensureStyle()
  return new Promise(resolve => {
    const backdrop = document.createElement('div')
    backdrop.className = 'puui-modal-backdrop'
    const box = document.createElement('div')
    box.className = 'puui-modal'
    box.innerHTML = `<p>${String(message).replace(/\n/g, '<br/>')}</p>`
    const buttonRow = document.createElement('div')
    buttonRow.className = 'puui-modal-buttons'
    const ok = document.createElement('button')
    ok.textContent = 'OK'
    ok.addEventListener('click', () => { document.body.removeChild(backdrop); resolve(true) })
    buttonRow.appendChild(ok)
    box.appendChild(buttonRow)
    backdrop.appendChild(box)
    document.body.appendChild(backdrop)
    // apply dark mode if root has dark class or user prefers
    try {
      let isDark = false
      const ls = localStorage.getItem('darkMode')
      if (ls === 'true') {
        isDark = true
      } else if (ls === 'false') {
        isDark = false
      } else if (document.querySelector('.root.dark')) {
        isDark = true
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark = true
      }
      if (isDark) {
        backdrop.classList.add('puui-dark')
        box.classList.add('puui-dark')
      }
    } catch (e) {}
    // focus
    ok.focus()
  })
}

export function confirm(message, title = 'Confirm') {
  ensureStyle()
  return new Promise(resolve => {
    const backdrop = document.createElement('div')
    backdrop.className = 'puui-modal-backdrop'
    const box = document.createElement('div')
    box.className = 'puui-modal'
    box.innerHTML = `<p>${String(message).replace(/\n/g, '<br/>')}</p>`
    const buttonRow = document.createElement('div')
    buttonRow.className = 'puui-modal-buttons'
    const cancel = document.createElement('button')
    cancel.textContent = 'Cancel'
    cancel.addEventListener('click', () => { document.body.removeChild(backdrop); resolve(false) })
    const ok = document.createElement('button')
    ok.textContent = 'OK'
    ok.addEventListener('click', () => { document.body.removeChild(backdrop); resolve(true) })
    buttonRow.appendChild(cancel)
    buttonRow.appendChild(ok)
    box.appendChild(buttonRow)
    backdrop.appendChild(box)
    document.body.appendChild(backdrop)
    try {
      let isDark = false
      const ls = localStorage.getItem('darkMode')
      if (ls === 'true') {
        isDark = true
      } else if (ls === 'false') {
        isDark = false
      } else if (document.querySelector('.root.dark')) {
        isDark = true
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark = true
      }
      if (isDark) {
        backdrop.classList.add('puui-dark')
        box.classList.add('puui-dark')
      }
    } catch (e) {}
    ok.focus()
  })
}

export function toast(message, duration = 1700) {
  ensureStyle()
  const el = document.createElement('div')
  el.className = 'puui-toast'
  el.textContent = message
  document.body.appendChild(el)
  // allow CSS flip
  try {
    let isDark = false
    const ls = localStorage.getItem('darkMode')
    if (ls === 'true') {
      isDark = true
    } else if (ls === 'false') {
      isDark = false
    } else if (document.querySelector('.root.dark')) {
      isDark = true
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      isDark = true
    }
    if (isDark) el.classList.add('puui-dark')
  } catch (e) {}
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el) }, 260)
  }, duration)
}

// Default export for convenience
export default { alert, confirm, toast }
