// PUT_PngImport.cs — PNG clipboard import helpers for PUT_Exporter
//
// Handles reading a layout from a PNG image on the Windows clipboard, as produced
// by the web tool's "Copy to Clipboard" button.  Two extraction methods are tried:
//
//   1. tEXt chunk  – A standard PNG metadata chunk with keyword "plateup-v2-export".
//                    Fast, no pixel decoding needed.  Stripped by Discord on upload.
//
//   2. Stego LSBs  – The payload is also written into the least-significant bit of
//                    every R, G, B channel starting at pixel 0, with the "PLUP" magic
//                    header (see writeStegoText / readStegoFromBytes in usePngMetadata.js).
//                    Survives Discord because Discord strips tEXt chunks but preserves
//                    pixel data for PNGs that fall below its re-encode size threshold.
//
// In both cases the raw payload is base64( UTF-8( JSON.stringify({type:"complete",...}) ) ),
// matching encodePayload() in AppliancePalette.vue.  The JSON is deserialized directly
// into PUTState using Newtonsoft.Json, so additionalData arrays are preserved.

using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Newtonsoft.Json;
using UnityEngine;

namespace PlateUpTool_Integration
{
    public partial class PUT_Exporter
    {
        // ─────────────────────────────────────────────────────────────────────────────
        // Win32 clipboard P/Invoke
        // ─────────────────────────────────────────────────────────────────────────────

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool OpenClipboard(IntPtr hWndNewOwner);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool CloseClipboard();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr GetClipboardData(uint uFormat);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern uint RegisterClipboardFormat(string lpszFormat);

        [DllImport("kernel32.dll")]
        private static extern IntPtr GlobalLock(IntPtr hMem);

        [DllImport("kernel32.dll")]
        private static extern bool GlobalUnlock(IntPtr hMem);

        [DllImport("kernel32.dll")]
        private static extern UIntPtr GlobalSize(IntPtr hMem);

        // ─────────────────────────────────────────────────────────────────────────────
        // JSON deserialization wrapper (encodePayload produces base64 of UTF-8 JSON)
        // ─────────────────────────────────────────────────────────────────────────────

#pragma warning disable CS0649
        private class CompleteExportPayload
        {
            public string type;
            public int roomWidth;
            public int roomHeight;
            public int URLVersion;
            public Dictionary<string, string> walls;
            public List<PUTTab> tabs;
            public List<PUTGridCell> gridCells;
            public List<PUTLabel> labels;
        }
#pragma warning restore CS0649

        // ─────────────────────────────────────────────────────────────────────────────
        // Public entry point called from ReallyImportStage1
        // ─────────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Try to extract a complete PUT layout state from a PNG image on the clipboard.
        /// Tries the tEXt chunk first (fast, no pixel decoding), then stego LSBs
        /// (slower but survives Discord).  Returns null if no suitable PNG is found.
        /// </summary>
        private PUTState TryImportFromPngClipboard()
        {
            PlateUpTool_Integration.TDbg("TryImportFromPngClipboard: checking for PNG on clipboard");

            byte[] pngBytes = TryReadPngFromClipboard();
            if (pngBytes == null) return null;

            // Method 1: tEXt chunk
            PlateUpTool_Integration.TDbg("Trying tEXt chunk extraction...");
            string payload = TryReadPngTextChunk(pngBytes, "plateup-v2-export");
            if (payload != null)
            {
                PlateUpTool_Integration.TDbg("Found payload in tEXt chunk");
                var state = TryDecodePngCompleteState(payload);
                if (state != null) return state;
                PlateUpTool_Integration.TDbg("tEXt payload was not a complete export, trying stego...");
            }

            // Method 2: stego LSB encoding
            PlateUpTool_Integration.TDbg("Trying stego LSB extraction...");
            payload = TryReadStegoFromPng(pngBytes, "plateup-v2-export");
            if (payload != null)
            {
                PlateUpTool_Integration.TDbg("Found payload in stego LSBs");
                var state = TryDecodePngCompleteState(payload);
                if (state != null) return state;
                PlateUpTool_Integration.TDbg("Stego payload was not a complete export");
            }

            PlateUpTool_Integration.TDbg("No complete export found in PNG clipboard");
            return null;
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // Step 1 – read raw PNG bytes from the Windows clipboard (CF_PNG)
        // ─────────────────────────────────────────────────────────────────────────────

        private static byte[] TryReadPngFromClipboard()
        {
            try
            {
                uint cfPng = RegisterClipboardFormat("PNG");
                if (cfPng == 0) { PlateUpTool_Integration.TDbg("RegisterClipboardFormat PNG failed"); return null; }

                if (!OpenClipboard(IntPtr.Zero)) { PlateUpTool_Integration.TDbg("OpenClipboard failed"); return null; }
                try
                {
                    IntPtr hData = GetClipboardData(cfPng);
                    if (hData == IntPtr.Zero) { PlateUpTool_Integration.TDbg("No PNG on clipboard (GetClipboardData returned null)"); return null; }

                    IntPtr ptr = GlobalLock(hData);
                    if (ptr == IntPtr.Zero) { PlateUpTool_Integration.TDbg("GlobalLock failed"); return null; }
                    try
                    {
                        int size = (int)(ulong)GlobalSize(hData);
                        if (size <= 0) { PlateUpTool_Integration.TDbg("GlobalSize returned 0"); return null; }
                        byte[] bytes = new byte[size];
                        Marshal.Copy(ptr, bytes, 0, size);
                        PlateUpTool_Integration.TDbg("Read " + size + " bytes of PNG from clipboard");
                        return bytes;
                    }
                    finally { GlobalUnlock(hData); }
                }
                finally { CloseClipboard(); }
            }
            catch (Exception ex)
            {
                PlateUpTool_Integration.TDbg("TryReadPngFromClipboard failed: " + ex.Message);
                return null;
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // Step 2a – parse a tEXt chunk from raw PNG bytes
        // ─────────────────────────────────────────────────────────────────────────────

        private static string TryReadPngTextChunk(byte[] png, string keyword)
        {
            if (png == null || png.Length < 8) return null;
            // Verify PNG signature: \x89 P N G \r \n \x1a \n
            if (png[0] != 0x89 || png[1] != 0x50 || png[2] != 0x4E || png[3] != 0x47) return null;

            int off = 8; // skip 8-byte signature
            while (off + 12 <= png.Length)
            {
                int len = (int)(((uint)png[off] << 24) | ((uint)png[off + 1] << 16) | ((uint)png[off + 2] << 8) | png[off + 3]);
                string type = "" + (char)png[off + 4] + (char)png[off + 5] + (char)png[off + 6] + (char)png[off + 7];

                if (type == "IEND") break;

                if (type == "tEXt" && len > 0 && off + 8 + len <= png.Length)
                {
                    // tEXt chunk: keyword \0 value  (all Latin-1 / ASCII)
                    int nullIdx = -1;
                    for (int i = 0; i < len; i++) { if (png[off + 8 + i] == 0) { nullIdx = i; break; } }
                    if (nullIdx >= 0)
                    {
                        string kw = Encoding.ASCII.GetString(png, off + 8, nullIdx);
                        if (kw == keyword)
                        {
                            int valStart = off + 8 + nullIdx + 1;
                            int valLen   = len - nullIdx - 1;
                            PlateUpTool_Integration.TDbg("Found tEXt chunk: keyword=" + kw + " valLen=" + valLen);
                            return Encoding.ASCII.GetString(png, valStart, valLen);
                        }
                    }
                }

                off += 12 + len;
            }
            return null;
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // Step 2b – extract stego-encoded value from PNG pixel LSBs
        //
        // Format written by writeStegoText() in usePngMetadata.js:
        //   4 B  magic "PLUP"
        //   4 B  totalLen (big-endian uint32)
        //   [entries until totalLen exhausted]
        //     1 B  keyLen  (0 = end sentinel)
        //     N B  key (ASCII)
        //     4 B  valLen (big-endian uint32)
        //     M B  val (ASCII / base64)
        //
        // Each bit is stored in the LSB of successive R, G, B channels (channel 0=R,
        // 1=G, 2=B) starting at pixel 0, MSB of each byte first.
        // ─────────────────────────────────────────────────────────────────────────────

        private static string TryReadStegoFromPng(byte[] pngBytes, string keyword)
        {
            if (pngBytes == null) return null;
            try
            {
                using (var ms = new MemoryStream(pngBytes))
                using (var bmp = new Bitmap(ms))
                {
                    int w = bmp.Width, h = bmp.Height;
                    int maxBits = w * h * 3;
                    int bi = 0; // bit index across all R,G,B channels

                    // GetPixel is simpler and avoids stride direction complexity.
                    // For typical export images (~600×500) with payloads up to ~50 KB this
                    // requires reading at most ~130 K pixels, which completes in < 2 s.
                    int ReadByte()
                    {
                        int val = 0;
                        for (int b = 7; b >= 0; b--)
                        {
                            if (bi >= maxBits) break;
                            int pixelIdx = bi / 3;
                            int channel  = bi % 3; // 0=R, 1=G, 2=B (same order as HTML Canvas RGBA)
                            int px = pixelIdx % w;
                            int py = pixelIdx / w;
                            if (py >= h) break;
                            System.Drawing.Color c = bmp.GetPixel(px, py);
                            byte ch = channel == 0 ? c.R : (channel == 1 ? c.G : c.B);
                            val |= (ch & 1) << b;
                            bi++;
                        }
                        return val;
                    }

                    uint ReadU32() =>
                        ((uint)ReadByte() << 24) | ((uint)ReadByte() << 16) |
                        ((uint)ReadByte() <<  8) | (uint)ReadByte();

                    // Verify PLUP magic
                    if (ReadByte() != 0x50 || ReadByte() != 0x4C ||
                        ReadByte() != 0x55 || ReadByte() != 0x50)
                    {
                        PlateUpTool_Integration.TDbg("No PLUP stego magic found");
                        return null;
                    }

                    uint totalLen = ReadU32();
                    PlateUpTool_Integration.TDbg("Stego PLUP totalLen=" + totalLen);
                    if (totalLen > 10_000_000) { PlateUpTool_Integration.TDbg("Stego totalLen sanity-check failed"); return null; }

                    uint remaining = totalLen;
                    while (remaining > 0)
                    {
                        int keyLen = ReadByte(); remaining--;
                        if (keyLen == 0) break;
                        if ((uint)keyLen > remaining) return null;

                        var kwChars = new char[keyLen];
                        for (int i = 0; i < keyLen; i++) { kwChars[i] = (char)ReadByte(); remaining--; }

                        if (remaining < 4) return null;
                        uint valLen = ReadU32(); remaining -= 4;
                        if (valLen > remaining) return null;

                        var valBytes = new byte[valLen];
                        for (int i = 0; i < (int)valLen; i++) { valBytes[i] = (byte)ReadByte(); remaining--; }

                        string kw = new string(kwChars);
                        PlateUpTool_Integration.TDbg("Stego entry: keyword=" + kw + " valLen=" + valLen);
                        if (kw == keyword)
                            return Encoding.ASCII.GetString(valBytes);
                    }

                    PlateUpTool_Integration.TDbg("Stego keyword '" + keyword + "' not found in entries");
                    return null;
                }
            }
            catch (Exception ex)
            {
                PlateUpTool_Integration.TDbg("TryReadStegoFromPng failed: " + ex.Message);
                return null;
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // Step 3 – decode payload (base64 of UTF-8 JSON) into PUTState
        // ─────────────────────────────────────────────────────────────────────────────

        private static PUTState TryDecodePngCompleteState(string payload)
        {
            if (string.IsNullOrEmpty(payload)) return null;
            try
            {
                byte[] jsonBytes = Convert.FromBase64String(payload);
                string json = Encoding.UTF8.GetString(jsonBytes);
                PlateUpTool_Integration.TDbg("PNG payload JSON (first 200 chars): " + json.Substring(0, Math.Min(200, json.Length)));

                var data = JsonConvert.DeserializeObject<CompleteExportPayload>(json);
                if (data == null) { PlateUpTool_Integration.TDbg("Failed to deserialize PNG payload"); return null; }
                if (data.type != "complete")
                {
                    PlateUpTool_Integration.TDbg("PNG payload type='" + data.type + "' is not 'complete' — ignoring");
                    return null;
                }

                var state = new PUTState();
                state.roomWidth  = data.roomWidth;
                state.roomHeight = data.roomHeight;
                state.URLVersion = data.URLVersion;
                state.walls      = data.walls     ?? new Dictionary<string, string>();
                state.tabs       = data.tabs      ?? state.tabs;
                state.gridCells  = data.gridCells ?? new List<PUTGridCell>();
                state.labels     = data.labels    ?? new List<PUTLabel>();

                PlateUpTool_Integration.TDbg("Decoded PNG complete state: " +
                    state.roomWidth + "x" + state.roomHeight + ", " +
                    state.gridCells.Count + " cells, " + state.walls.Count + " walls");
                return state;
            }
            catch (Exception ex)
            {
                PlateUpTool_Integration.TDbg("TryDecodePngCompleteState failed: " + ex.Message);
                return null;
            }
        }
    }
}
