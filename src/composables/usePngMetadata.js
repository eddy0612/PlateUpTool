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
