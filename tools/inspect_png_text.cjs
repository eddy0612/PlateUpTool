// inspect_png_text.cjs
// Usage: node inspect_png_text.cjs <png-path>
const fs = require('fs')
const path = process.argv[2]
if (!path) { console.error('Usage: node inspect_png_text.cjs <png-path>'); process.exit(2) }
try {
  const b = fs.readFileSync(path)
  if (b.length < 8) { console.error('Not a PNG'); process.exit(1) }
  // verify signature
  if (!(b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47)) { console.error('Not PNG signature'); process.exit(1) }
  let off = 8
  let found = false
  while (off + 12 <= b.length) {
    const len = b.readUInt32BE(off)
    const type = b.toString('ascii', off+4, off+8)
    if (type === 'IEND') break
    if (type === 'tEXt' && off + 8 + len <= b.length) {
      const data = b.slice(off + 8, off + 8 + len)
      let nullIdx = data.indexOf(0)
      if (nullIdx >= 0) {
        const kw = data.slice(0, nullIdx).toString('latin1')
        if (kw === 'plateup-v2-export') {
          const val = data.slice(nullIdx + 1).toString('latin1')
          console.log('FOUND tEXt plateup-v2-export, bytes=' + val.length)
          try {
            const json = Buffer.from(val, 'base64').toString('utf8')
            console.log('DECODED JSON (first 2000 chars):')
            console.log(json.slice(0, 2000))
            try { const parsed = JSON.parse(json); console.log('\nSUMMARY: type=' + parsed.type + ' room=' + (parsed.roomWidth||'-') + 'x' + (parsed.roomHeight||'-') + ' gridCells=' + (Array.isArray(parsed.gridCells)? parsed.gridCells.length : '-')) } catch (e) { console.log('JSON parse failed: ' + e.message) }
          } catch (e) { console.log('base64->utf8 decode failed: ' + e.message) }
          found = true
          break
        }
      }
    }
    off += 12 + len
  }
  if (!found) console.log('tEXt plateup-v2-export not found')
} catch (e) { console.error('Error:', e.message); process.exit(1) }
