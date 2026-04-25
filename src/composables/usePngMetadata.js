// PNG tEXt chunk utilities — pure JS, no dependencies
// PNG tEXt chunks store Latin-1 text: keyword + null byte + value.
// We base64-encode our JSON payloads so any Unicode content is safe.

const _crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function _crc32(bytes) {
  let crc = 0xffffffff
  for (const b of bytes) crc = _crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function _u32be(n) {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
}

function _readU32be(bytes, off) {
  return ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0
}

/**
 * Find a tEXt chunk value in a PNG byte array.
 * @param {Uint8Array} bytes
 * @param {string} keyword
 * @returns {string|null}
 */
export function readPngText(bytes, keyword) {
  let off = 8 // skip 8-byte PNG signature
  while (off + 12 <= bytes.length) {
    const len = _readU32be(bytes, off)
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7])
    if (type === 'tEXt' && off + 8 + len <= bytes.length) {
      const data = bytes.subarray(off + 8, off + 8 + len)
      let nullIdx = -1
      for (let i = 0; i < data.length; i++) { if (data[i] === 0) { nullIdx = i; break } }
      if (nullIdx >= 0) {
        const kw = String.fromCharCode(...data.subarray(0, nullIdx))
        if (kw === keyword) return String.fromCharCode(...data.subarray(nullIdx + 1))
      }
    }
    if (type === 'IEND') break
    off += 12 + len
  }
  return null
}

/**
 * Insert a tEXt chunk before IEND and return a new Uint8Array.
 * @param {Uint8Array} bytes
 * @param {string} keyword  ASCII, 1–79 chars
 * @param {string} value    ASCII/Latin-1 string
 * @returns {Uint8Array}
 */
export function writePngText(bytes, keyword, value) {
  const kwBytes = Array.from(keyword, c => c.charCodeAt(0))
  const valBytes = Array.from(value, c => c.charCodeAt(0))
  const chunkData = new Uint8Array([...kwBytes, 0, ...valBytes])
  const typeBytes = [0x74, 0x45, 0x58, 0x74] // 'tEXt'
  const crcInput = new Uint8Array([...typeBytes, ...chunkData])
  const crc = _crc32(crcInput)
  const newChunk = new Uint8Array([..._u32be(chunkData.length), ...typeBytes, ...chunkData, ..._u32be(crc)])

  // Find IEND offset
  let iendOff = bytes.length - 12
  let off = 8
  while (off + 12 <= bytes.length) {
    const len = _readU32be(bytes, off)
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7])
    if (type === 'IEND') { iendOff = off; break }
    off += 12 + len
  }

  const result = new Uint8Array(bytes.length + newChunk.length)
  result.set(bytes.subarray(0, iendOff))
  result.set(newChunk, iendOff)
  result.set(bytes.subarray(iendOff), iendOff + newChunk.length)
  return result
}

/** Convert a PNG data URL to Uint8Array */
export function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1]
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** Convert Uint8Array back to a PNG data URL */
export function bytesToDataUrl(bytes, mimeType = 'image/png') {
  // Process in chunks to avoid call-stack overflow on large PNGs
  const CHUNK = 0x8000
  let bin = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return `data:${mimeType};base64,${btoa(bin)}`
}

// ── Steganography: LSB pixel encoding ────────────────────────────────────────
// Encodes keyword+value into the 1 LSB of each R,G,B channel, starting at
// pixel 0.  Format (all big-endian):
//   4 B  magic "PLUP"
//   4 B  totalLen  (bytes that follow)
//   [repeating entries until totalLen exhausted]
//     1 B  keyLen  (0 = end sentinel)
//     N B  key (ASCII)
//     4 B  valLen
//     M B  val (ASCII / base64 payload)
// Capacity = floor(width × height × 3 / 8) bytes.

const _STEGO_MAGIC = [0x50, 0x4C, 0x55, 0x50] // "PLUP"

/**
 * Encode keyword+value into the LSBs of the R,G,B channels of a PNG dataUrl.
 * Returns a Promise<string> — a new dataUrl with stego data, or the original if
 * the payload is too large for the image.
 * @param {string} dataUrl  PNG data URL
 * @param {string} keyword  ASCII keyword
 * @param {string} value    ASCII/base64 value
 * @returns {Promise<string>}
 */
export function writeStegoText(dataUrl, keyword, value) {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const w = img.width, h = img.height
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, w, h)
      const px = imageData.data

      // Build payload bytes
      const keyB = Array.from(keyword, c => c.charCodeAt(0))
      const valB = Array.from(value,   c => c.charCodeAt(0))
      const entry = [
        keyB.length, ...keyB,
        (valB.length >>> 24) & 0xff, (valB.length >>> 16) & 0xff,
        (valB.length >>>  8) & 0xff,  valB.length & 0xff,
        ...valB,
        0 // end sentinel (keyLen = 0)
      ]
      const tl = entry.length
      const payload = [
        ..._STEGO_MAGIC,
        (tl >>> 24) & 0xff, (tl >>> 16) & 0xff, (tl >>> 8) & 0xff, tl & 0xff,
        ...entry
      ]

      const capacity = Math.floor(w * h * 3 / 8)
      if (payload.length > capacity) {
        console.warn(`[stego] Payload ${payload.length} B > capacity ${capacity} B — skipping stego.`)
        resolve(dataUrl)
        return
      }

      // Write 1 bit per R/G/B channel, MSB first
      let bi = 0
      for (const byte of payload) {
        for (let b = 7; b >= 0; b--) {
          const off = Math.floor(bi / 3) * 4 + (bi % 3)
          px[off] = (px[off] & 0xfe) | ((byte >> b) & 1)
          bi++
        }
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * Read a stego-encoded value from PNG bytes for the given keyword.
 * Returns a Promise<string|null>.
 * @param {Uint8Array} bytes
 * @param {string} keyword
 * @returns {Promise<string|null>}
 */
export function readStegoFromBytes(bytes, keyword) {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      try {
        const w = img.width, h = img.height
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0)
        const px = ctx.getImageData(0, 0, w, h).data

        let bi = 0
        const maxBits = w * h * 3

        function readByte() {
          let byte = 0
          for (let b = 7; b >= 0; b--) {
            if (bi >= maxBits) return 0
            const off = Math.floor(bi / 3) * 4 + (bi % 3)
            byte |= (px[off] & 1) << b
            bi++
          }
          return byte
        }
        function readU32() {
          return ((readByte() << 24) | (readByte() << 16) | (readByte() << 8) | readByte()) >>> 0
        }

        // Verify magic
        for (const m of _STEGO_MAGIC) { if (readByte() !== m) { resolve(null); return } }

        const totalLen = readU32()
        // Sanity: totalLen must fit in remaining bits
        if (totalLen > Math.floor((maxBits - bi) / 8)) { resolve(null); return }

        let remaining = totalLen
        while (remaining > 0) {
          const keyLen = readByte(); remaining--
          if (keyLen === 0) break
          if (keyLen > remaining) { resolve(null); return }
          let kw = ''
          for (let i = 0; i < keyLen; i++) { kw += String.fromCharCode(readByte()); remaining-- }
          if (remaining < 4) { resolve(null); return }
          const valLen = readU32(); remaining -= 4
          if (valLen > remaining) { resolve(null); return }
          let val = ''
          for (let i = 0; i < valLen; i++) { val += String.fromCharCode(readByte()); remaining-- }
          if (kw === keyword) { resolve(val); return }
        }
        resolve(null)
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = bytesToDataUrl(bytes)
  })
}

/** Trigger a browser file download from a data URL */
export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** Read a File object as Uint8Array */
export function readFileAsBytes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(new Uint8Array(e.target.result))
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
