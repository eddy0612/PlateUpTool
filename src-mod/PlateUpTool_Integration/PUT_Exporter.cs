using Kitchen;
using Kitchen.Layouts;
using KitchenMods;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Unity.Entities;
using UnityEngine;
using System.Diagnostics;
//using KitchenData;

namespace PlateUpTool_Integration
{
    public partial class PUT_Exporter : RestaurantSystem, IModSystem
    {

        // ======================================================================================================================
        // Below code all produced by AI to represent the state object maintained in the JavaScript web based tool
        // ======================================================================================================================
        // State model matching src/store/restaurant.js DEFAULT_STATE
        public class PUTTab { public string id; public string label; public PUTTab() {} public PUTTab(string id, string label) { this.id = id; this.label = label; } }
        public class PUTGridCell { public int x; public int y; public int applianceId; public int rotation; public int extraData; public List<string> tabIds; public string iid; public List<int> additionalData; }
        public class PUTLabel { public string id; public int? x; public int? y; public int? x2; public int? y2; public string text; public string anchorIid; public int? anchorX; public int? anchorY; }
        public class PUTState {
            public List<PUTTab> tabs = new List<PUTTab>() { new PUTTab("complete","Preview"), new PUTTab("structure","Structure"), new PUTTab("main","Generated") };
            public string activeTabId = "main";
            public int URLVersion = 0;
            public double zoom = 1.0; // not serialized
            public int roomWidth = 16;
            public int roomHeight = 12;
            public string filterText = ""; // not serialized
            public Dictionary<string,string> walls = new Dictionary<string,string>();
            public List<PUTGridCell> gridCells = new List<PUTGridCell>();
            public List<PUTLabel> labels = new List<PUTLabel>();
        }

        // Working data for ReallyImport
        private class GameAppliance {
            public int putX, putY;           // PUT grid coordinates
            public float worldX, worldZ;     // game world coordinates
            public int applianceId;          // effective game ID (after grabber/icecream overrides)
            public int altId;                // canonical alias from MapGameId (0 = none)
            public int rotation;             // 0-3
            public int extraData;            // teleporter GroupID or 0
            public List<int> additionalData;  // non-null when appliance is a configured smart grabber
            public Entity entity;
        }

        // Pairing of an imported cell to the game appliance that will fulfil it
        private struct ImportPairing {
            public PUTGridCell imported;
            public GameAppliance game;
            public ImportPairing(PUTGridCell imported, GameAppliance game) { this.imported = imported; this.game = game; }
        }

        // In-memory state instance you can populate with the helpers below
        private PUTState exportState = new PUTState();

        // --- Setter helpers (call these from your mod code to prepare a state) ---
        private void SetRoomSize(int width, int height) { exportState.roomWidth = width; exportState.roomHeight = height; }
        private void SetURLVersion(int o) { exportState.URLVersion = o; }
        private void SetTabs(List<PUTTab> tabs) { exportState.tabs = tabs ?? new List<PUTTab>(); }
        private void ClearCells() { exportState.gridCells.Clear(); }
        private void AddCell(int x, int y, int applianceId, int rotation = 0, int extraData = 0, List<string> tabIds = null, string iid = null, List<int> additionalData = null) {
            exportState.gridCells.Add(new PUTGridCell { x = x, y = y, applianceId = applianceId, rotation = rotation, extraData = extraData, tabIds = tabIds ?? new List<string>(), iid = iid, additionalData = additionalData });
        }
        private void ClearWalls() { exportState.walls.Clear(); }
        private void AddWall(char orient, int x, int y, string type) { exportState.walls[$"{orient},{x},{y}"] = type; }
        private void ClearLabels() { exportState.labels.Clear(); }
        private void AddLabel(string id, int? x2, int? y2, string text, string anchorIid = null, int? anchorX = null, int? anchorY = null) {
            exportState.labels.Add(new PUTLabel { id = id, x2 = x2, y2 = y2, text = text, anchorIid = anchorIid, anchorX = anchorX, anchorY = anchorY });
        }

        // --- Bit writer and base64url encoder to match JS implementation ---
        private class BitWriter {
            private List<byte> _bytes = new List<byte>();
            private int _cur = 0;
            private int _bits = 0;
            public void Write(int value, int n) {
                for (int i = n - 1; i >= 0; --i) {
                    _cur = (_cur << 1) | ((value >> i) & 1);
                    _bits++;
                    if (_bits == 8) { _bytes.Add((byte)_cur); _cur = 0; _bits = 0; }
                }
            }
            public byte[] Finish() {
                if (_bits > 0) { _bytes.Add((byte)(_cur << (8 - _bits))); _bits = 0; _cur = 0; }
                return _bytes.ToArray();
            }
        }

        private static string Base64UrlEncode(byte[] bytes) {
            string s = Convert.ToBase64String(bytes);
            s = s.TrimEnd('=');
            s = s.Replace('+', '-').Replace('/', '_');
            return s;
        }

        // --- Encoder matching encodeState in src/store/restaurant.js ---
        public string EncodeStateForUrl() {
            var stateObj = exportState;
            var tabs = stateObj.tabs ?? new List<PUTTab>();
            var cells = stateObj.gridCells ?? new List<PUTGridCell>();
            var wallEntries = stateObj.walls ?? new Dictionary<string,string>();
            int roomWidth = stateObj.roomWidth;
            int roomHeight = stateObj.roomHeight;

            // tab bit mapping
            var tabBitsMap = new Dictionary<string,int>();
            for (int i = 0; i < tabs.Count; ++i) tabBitsMap[tabs[i].id] = 1 << i;

            var maskFreq = new Dictionary<int,int>();
            foreach (var c in cells) {
                int mask = 0;
                if (c.tabIds != null) foreach (var id in c.tabIds) if (tabBitsMap.ContainsKey(id)) mask |= tabBitsMap[id];
                if (!maskFreq.ContainsKey(mask)) maskFreq[mask] = 0;
                maskFreq[mask]++;
            }
            int defaultTabMask = 0;
            foreach (var kv in maskFreq) if (kv.Value > (maskFreq.ContainsKey(defaultTabMask) ? maskFreq[defaultTabMask] : 0)) defaultTabMask = kv.Key;

            bool customTabs = !(tabs.Count == 3 && tabs[0].id == "complete" && tabs[0].label == "Preview" && tabs[1].id == "structure" && tabs[1].label == "Structure" && tabs[2].id == "main" && tabs[2].label == "Base");
            int flags = customTabs ? 1 : 0;

            int xyIdxBits = Math.Max(1, (int)Math.Ceiling(Math.Log(roomWidth * roomHeight + 1, 2)));
            int xBits = Math.Max(1, (int)Math.Ceiling(Math.Log(roomWidth + 2, 2)));
            int yBits = Math.Max(1, (int)Math.Ceiling(Math.Log(roomHeight + 2, 2)));
            int applianceIdBits = stateObj.URLVersion == 1 ? 32 : 9;

            var w = new BitWriter();
            // Header bytes
            var headerBytes = new List<int> {
                roomWidth, roomHeight, stateObj.URLVersion, flags, defaultTabMask,
                cells.Count & 0xFF, (cells.Count >> 8) & 0xFF,
                wallEntries.Count & 0xFF, (wallEntries.Count >> 8) & 0xFF,
                xyIdxBits, xBits, yBits
            };
            foreach (var b in headerBytes) w.Write(b, 8);

            // Optional custom tabs
            if (customTabs) {
                w.Write(tabs.Count, 8);
                foreach (var tab in tabs) {
                    var id = tab.id ?? string.Empty;
                    var label = tab.label ?? string.Empty;
                    w.Write(id.Length, 8);
                    foreach (var c in id) w.Write((int)c, 8);
                    w.Write(label.Length, 8);
                    foreach (var c in label) w.Write((int)c, 8);
                }
            }

            // Cells
            foreach (var c in cells) {
                int tabMask = 0;
                if (c.tabIds != null) foreach (var id in c.tabIds) if (tabBitsMap.ContainsKey(id)) tabMask |= tabBitsMap[id];
                int rot = c.rotation;
                int extra = c.extraData;
                w.Write(c.x + c.y * roomWidth, xyIdxBits);
                // Write appliance id using wider 32-bit when URLVersion==1 so full GameIDs are preserved
                w.Write(c.applianceId, applianceIdBits);
                if (tabMask == defaultTabMask) {
                    w.Write(0, 1);
                } else {
                    w.Write(1, 1); w.Write(tabMask, Math.Max(1, tabs.Count));
                }
                if (rot == 0 && extra == 0) {
                    w.Write(0, 1);
                } else {
                    w.Write(1, 1); w.Write(rot, 3); w.Write(extra, 8);
                }
            }

            // Walls
            foreach (var kv in wallEntries) {
                var key = kv.Key; var type = kv.Value;
                var parts = key.Split(',');
                if (parts.Length < 3) continue;
                var orient = parts[0]; int wx = int.Parse(parts[1]); int wy = int.Parse(parts[2]);
                w.Write(wx, xBits);
                w.Write(wy, yBits);
                w.Write(orient == "v" ? 1 : 0, 1);
                int code = 1; if (type == "hatch") code = 2; else if (type == "door") code = 3;
                w.Write(code, 2);
            }

            // Labels
            var labels = stateObj.labels ?? new List<PUTLabel>();
            w.Write(labels.Count & 0xFF, 8);
            foreach (var lbl in labels) {
                int x2 = lbl.x2 ?? (lbl.x.HasValue ? lbl.x.Value * 2 : 0);
                int y2 = lbl.y2 ?? (lbl.y.HasValue ? lbl.y.Value * 2 : 0);
                var bytes = Encoding.UTF8.GetBytes(lbl.text ?? string.Empty);
                int len = Math.Min(255, bytes.Length);
                w.Write(x2 & 0xFF, 8); w.Write(y2 & 0xFF, 8); w.Write(len, 8);
                for (int i = 0; i < len; ++i) w.Write(bytes[i], 8);
                int lflags = 0; int? aX = null; int? aY = null;
                if (!string.IsNullOrEmpty(lbl.anchorIid) && cells.Count > 0) {
                    var found = cells.Find(cc => cc.iid == lbl.anchorIid);
                    if (found != null) { aX = found.x; aY = found.y; }
                }
                if (aX == null && lbl.anchorX.HasValue && lbl.anchorY.HasValue) { aX = lbl.anchorX; aY = lbl.anchorY; }
                if (aX != null && aY != null) lflags |= 2; else if (!string.IsNullOrEmpty(lbl.anchorIid)) lflags |= 1;
                w.Write(lflags, 8);
                if ((lflags & 1) != 0) {
                    var iidBytes = Encoding.UTF8.GetBytes(lbl.anchorIid ?? string.Empty);
                    int iidLen = Math.Min(255, iidBytes.Length);
                    w.Write(iidLen, 8);
                    for (int i = 0; i < iidLen; ++i) w.Write(iidBytes[i], 8);
                }
                if ((lflags & 2) != 0) {
                    w.Write(aX.Value & 0xFF, 8); w.Write(aY.Value & 0xFF, 8);
                }
            }

            // Per-cell additionalData lists (appended after labels for backward compat;
            // older decoders that stop after labels will simply ignore this section).
            var sgEntries = cells
                .Select((c, i) => new { c, i })
                .Where(x => x.c.additionalData != null && x.c.additionalData.Count > 0)
                .ToList();
            int sgCount = Math.Min(255, sgEntries.Count);
            w.Write(sgCount, 8);
            for (int si = 0; si < sgCount; si++)
            {
                var entry = sgEntries[si];
                w.Write(entry.i & 0xFF, 8);
                w.Write((entry.i >> 8) & 0xFF, 8);
                var items = entry.c.additionalData;
                int itemCount = Math.Min(255, items.Count);
                w.Write(itemCount, 8);
                for (int ii = 0; ii < itemCount; ii++)
                    w.Write(items[ii], 32);
            }

            var packed = w.Finish();
            return Base64UrlEncode(packed);
        }

        // --- Bit reader and base64url decoder (mirror of writer/encoder above) ---
        private class BitReader {
            private readonly byte[] _bytes;
            private int _byteIdx = 0;
            private int _bitIdx  = 7;
            public bool IsEOF => _byteIdx >= _bytes.Length;
            public BitReader(byte[] bytes) { _bytes = bytes; }
            public int Read(int n) {
                int result = 0;
                for (int i = 0; i < n; i++) {
                    if (_byteIdx >= _bytes.Length) break;
                    int bit = (_bytes[_byteIdx] >> _bitIdx) & 1;
                    result = (result << 1) | bit;
                    if (--_bitIdx < 0) { _bitIdx = 7; _byteIdx++; }
                }
                return result;
            }
        }

        private static byte[] Base64UrlDecode(string s) {
            s = s.Replace('-', '+').Replace('_', '/');
            switch (s.Length % 4) { case 2: s += "=="; break; case 3: s += "="; break; }
            return Convert.FromBase64String(s);
        }

        // --- Decoder matching encodeState in src/store/restaurant.js ---
        public PUTState DecodeStateFromUrl(string encoded) {
            var bytes = Base64UrlDecode(encoded);
            var r     = new BitReader(bytes);
            var state = new PUTState();

            // Header bytes
            int roomWidth      = r.Read(8);
            int roomHeight     = r.Read(8);
            int urlVersion     = r.Read(8);
            int flags          = r.Read(8);
            int defaultTabMask = r.Read(8);
            int cellCountLo    = r.Read(8);
            int cellCountHi    = r.Read(8);
            int wallCountLo    = r.Read(8);
            int wallCountHi    = r.Read(8);
            int xyIdxBits      = r.Read(8);
            int xBits          = r.Read(8);
            int yBits          = r.Read(8);

            int cellCount       = cellCountLo | (cellCountHi << 8);
            int wallCount       = wallCountLo | (wallCountHi << 8);
            bool customTabs     = (flags & 1) != 0;
            int applianceIdBits = urlVersion == 1 ? 32 : 9;

            state.roomWidth  = roomWidth;
            state.roomHeight = roomHeight;
            state.URLVersion = urlVersion;

            // Tabs
            List<PUTTab> tabs;
            if (customTabs) {
                int tabCount = r.Read(8);
                tabs = new List<PUTTab>();
                for (int i = 0; i < tabCount; i++) {
                    int idLen = r.Read(8);
                    var idChars = new char[idLen];
                    for (int j = 0; j < idLen; j++) idChars[j] = (char)r.Read(8);
                    int labelLen = r.Read(8);
                    var labelChars = new char[labelLen];
                    for (int j = 0; j < labelLen; j++) labelChars[j] = (char)r.Read(8);
                    tabs.Add(new PUTTab(new string(idChars), new string(labelChars)));
                }
            } else {
                tabs = new List<PUTTab> { new PUTTab("complete","Preview"), new PUTTab("structure","Structure"), new PUTTab("main","Base") };
            }
            state.tabs = tabs;

            // Cells
            state.gridCells = new List<PUTGridCell>();
            for (int ci = 0; ci < cellCount; ci++) {
                int xyIdx = r.Read(xyIdxBits);
                int x = xyIdx % roomWidth;
                int y = xyIdx / roomWidth;
                int appId = r.Read(applianceIdBits); // 32-bit read preserves two's-complement sign
                int tabMask = r.Read(1) == 0 ? defaultTabMask : r.Read(Math.Max(1, tabs.Count));
                int rot = 0, extra = 0;
                if (r.Read(1) != 0) { rot = r.Read(3); extra = r.Read(8); }
                var tabIds = new List<string>();
                for (int i = 0; i < tabs.Count; i++)
                    if ((tabMask & (1 << i)) != 0) tabIds.Add(tabs[i].id);
                state.gridCells.Add(new PUTGridCell { x = x, y = y, applianceId = appId, rotation = rot, extraData = extra, tabIds = tabIds });
            }

            // Walls
            state.walls = new Dictionary<string,string>();
            for (int wi = 0; wi < wallCount; wi++) {
                int wx = r.Read(xBits);
                int wy = r.Read(yBits);
                string orient = r.Read(1) == 1 ? "v" : "h";
                int code = r.Read(2);
                string type = code == 2 ? "hatch" : code == 3 ? "door" : "wall";
                state.walls[$"{orient},{wx},{wy}"] = type;
            }

            // Labels
            state.labels = new List<PUTLabel>();
            int labelCount = r.Read(8);
            for (int li = 0; li < labelCount; li++) {
                int lx2 = r.Read(8); int ly2 = r.Read(8);
                int textLen = r.Read(8);
                var textBytes = new byte[textLen];
                for (int i = 0; i < textLen; i++) textBytes[i] = (byte)r.Read(8);
                int lflags = r.Read(8);
                string anchorIid = null; int? anchorX = null, anchorY = null;
                if ((lflags & 1) != 0) {
                    int iidLen = r.Read(8);
                    var iidBytes = new byte[iidLen];
                    for (int i = 0; i < iidLen; i++) iidBytes[i] = (byte)r.Read(8);
                    anchorIid = Encoding.UTF8.GetString(iidBytes);
                }
                if ((lflags & 2) != 0) { anchorX = r.Read(8); anchorY = r.Read(8); }
                state.labels.Add(new PUTLabel { x2 = lx2, y2 = ly2, text = Encoding.UTF8.GetString(textBytes), anchorIid = anchorIid, anchorX = anchorX, anchorY = anchorY });
            }

            // Per-cell additionalData lists (optional trailing section — backward-compat)
            try
            {
                if (!r.IsEOF)
                {
                    int sgCount = r.Read(8);
                    for (int si = 0; si < sgCount && !r.IsEOF; si++)
                    {
                        int idxLo   = r.Read(8);
                        int idxHi   = r.Read(8);
                        int cellIdx = idxLo | (idxHi << 8);
                        int itemCount = r.Read(8);
                        var items = new List<int>();
                        for (int ii = 0; ii < itemCount; ii++)
                            items.Add(r.Read(32));
                        if (cellIdx < state.gridCells.Count)
                            state.gridCells[cellIdx].additionalData = items;
                    }
                }
            }
            catch { /* ignore malformed trailing SG data */ }

            return state;
        }
        // ======================================================================================================================
        // Above code all produced by AI to represent the state object maintained in the JavaScript web based tool
        // ======================================================================================================================
        private static PUT_Exporter _instance;

        static int ID_GRABBER_L = 367215780;
        static int ID_GRABBER_R = -961856961;
        static int ID_GRABBER_S = -331651461;    // GrabberRotatingS (the bidirectional one)
        static int ID_ICECREAM_CHOC = -46968470;
        static int ID_ICECREAM_STRAW = -2094600179;
        static int ID_ICECREAM_VAN = 26405173;
        static int ID_ICECREAM = -1533430406;

        [StructLayout(LayoutKind.Sequential, Size = 1)]
        protected struct PUT_DummyComponent : IComponentData, IModComponent
        {
        }

        [StructLayout(LayoutKind.Sequential, Size = 1)]
        protected struct PUT_DummyComponentImport : IComponentData, IModComponent
        {
        }

        protected override void Initialise()
        {
            base.Initialise();
            _instance = this;
        }

        public void ExportDesign()
        {
            PlateUpTool_Integration.TDbg("ExportDesign called.");

            // Ensure we are in the Kitchen mode
            if (!(GameInfo.CurrentScene == SceneType.Kitchen))
            {
                PlateUpTool_Integration.TDbg("Not in kitchen mode so doing nothing");
                return;
            }
            PlateUpTool_Integration.TDbg("In kitchen mode so continuing");

            _instance?.GetOrCreate<PUT_DummyComponent>();
        }

        public void ImportDesign()
        {
            PlateUpTool_Integration.TDbg("ImportDesign called.");

            // Ensure we are in the Kitchen mode
            if (!(GameInfo.CurrentScene == SceneType.Kitchen))
            {
                PlateUpTool_Integration.TDbg("Not in kitchen mode so doing nothing");
                return;
            }
            PlateUpTool_Integration.TDbg("In kitchen mode so continuing");

            // Ensure we are in prep mode
            if (!(GameInfo.IsPreparationTime))
            {
                PlateUpTool_Integration.TDbg("Not in prep mode, doing nothing");
                return;
            }
            PlateUpTool_Integration.TDbg("In prep mode so continuing");

            _instance?.GetOrCreate<PUT_DummyComponentImport>();
        }

        protected override void OnUpdate()
        {
            if (TryGetSingletonEntity<PUT_DummyComponent>(out var value))
            {
                PlateUpTool_Integration.TDbg("OnUpdate called - found object");
                ReallyExport();
                base.EntityManager.DestroyEntity(value);
            }
            if (TryGetSingletonEntity<PUT_DummyComponentImport>(out var value2))
            {
                PlateUpTool_Integration.TDbg("OnUpdate called - found object");
                ReallyImport();
                base.EntityManager.DestroyEntity(value2);
            }
        }

        // ===================================================================================================
        // Export logic
        // ===================================================================================================
        protected void ReallyExport()
        {
            // Get room dimensions and save them away in the export state
            Bounds bounds = base.Bounds;
            int height = (int)(bounds.max.z - bounds.min.z + 1f);
            int width = (int)(bounds.max.x - bounds.min.x + 1f);
            PlateUpTool_Integration.TDbg("Screen size: " + width + " x " + height);
            SetURLVersion(1);
            SetRoomSize(width, height);
            ClearCells();
            ClearWalls();

            // Enumerate through the grid and work out the appliance and wall states
            for (float roomH = bounds.max.z; roomH >= bounds.min.z; roomH -= 1f)
            {
                // InAttribute webapp, y=0 is top row and increases going down, but in the game world z=0 is bottom row and increases going up, so we flip the y coordinate here to match the webapp orientation
                int yPos = 0 - (int)(roomH - bounds.max.z);

                for (float roomW = bounds.min.x; roomW <= bounds.max.x; roomW += 1f)
                {
                    int xPos = (int)(roomW - bounds.min.x);
                    PlateUpTool_Integration.TDbg("Looking at grid (" + roomW + ", " + roomH + ") == (" + xPos + "," + yPos + ")");

                    // Look at the location in question and see whats primarily occupying it (if anything)
                    // Note I believe this is always an appliance - some things can share the same square such
                    // as wall art or decorations but I dont care about those for the purposes of the tool.
                    Vector3 gridPos = new Vector3(roomW, 0f, roomH);
                    Entity primaryOccupant = TileManager.GetPrimaryOccupant(gridPos);

                    PlateUpTool_Integration.TDbg("Found: " + (primaryOccupant != Entity.Null ? primaryOccupant.ToString() : "nothing"));
                    if (primaryOccupant != Entity.Null)
                    {
                        CAppliance appliance;
                        CPosition position;
                        bool applResult = base.EntityManager.RequireComponent<CAppliance>(primaryOccupant, out appliance);
                        bool posnResult = base.EntityManager.RequireComponent<CPosition>(primaryOccupant, out position);
                        int forceAction = 0;
                        int forceExtraData = 0;
                        List<int> forceAdditionalData = null;


                        // ===================================================================================
                        // Special case for certain appliances vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
                        // ===================================================================================

                        // -----------------------------------------------------------------------------------
                        // Ghost chairs - these are the chairs around a table which can be either enabled
                        // or disabled. In addition a chair might be unreachable - we dont want to include
                        // any which are not enabled / unreachable, leaving us with the ones actually in use
                        // -----------------------------------------------------------------------------------
                        if (base.EntityManager.HasComponent<CApplianceGhostChair>(primaryOccupant))
                        {
                            PlateUpTool_Integration.TDbg("Ghost Chair!!!");
                            var chairComponent = base.EntityManager.GetComponentData<CApplianceGhostChair>(primaryOccupant);

                            if (chairComponent.IsDisabled)
                            {
                                PlateUpTool_Integration.TDbg("Disabled Chair!!!");
                                forceAction = -1; // Ignore chair
                            }
                            if (!chairComponent.IsPathable)
                            {
                                PlateUpTool_Integration.TDbg("Not pathable Chair!!!");
                                forceAction = -1; // Ignore chair
                            }
                        }

                        // -----------------------------------------------------------------------------------
                        // Corner grabbers are a single entity with an attribute saying which orientation
                        // they point. However in PUT they are represented as separate appliances for each
                        // direction so override the appliance type based on the orientation
                        // -----------------------------------------------------------------------------------
                        if (base.EntityManager.HasComponent<CConveyPushRotatable>(primaryOccupant))
                        {
                            PlateUpTool_Integration.TDbg("Corner grabber!!!");
                            var rotateComponent = base.EntityManager.GetComponentData<CConveyPushRotatable>(primaryOccupant);
                            switch (rotateComponent.Target)
                            {
                                case Orientation.Left: PlateUpTool_Integration.TDbg("Corner grabber : LEFT!!!"); forceAction = ID_GRABBER_L; break;
                                case Orientation.Right: PlateUpTool_Integration.TDbg("Corner grabber : RIGHT!!!"); forceAction = ID_GRABBER_R; break;
                                case Orientation.Down: PlateUpTool_Integration.TDbg("Corner grabber : DOWN!!!"); break; // Unexpected - leave as is
                                case Orientation.Up: PlateUpTool_Integration.TDbg("Corner grabber : Up!!!"); break; // Normal straight on, leave as is
                                case Orientation.Null: PlateUpTool_Integration.TDbg("Corner grabber : NULL!!!"); break; // Unexpected - leave as is
                            }
                        }
                        if (base.EntityManager.HasComponent<CConveyPushItems>(primaryOccupant))
                        {
                            var sgData = base.EntityManager.GetComponentData<CConveyPushItems>(primaryOccupant);
                            PlateUpTool_Integration.TDbg("CConveyPushItems: GrabSpecificType=" + sgData.GrabSpecificType + " SpecificType=" + sgData.SpecificType);
                            KitchenData.ItemList il = sgData.SpecificComponents;
                            if (il.Count > 0)
                            {
                                forceAdditionalData = new List<int>();
                                for (int i = 0; i < il.Count; i++)
                                {
                                    forceAdditionalData.Add(il[i]);
                                    PlateUpTool_Integration.TDbg("Smart grabber item[" + i + "]: " + il[i]);
                                }
                            }
                        }

                        // -----------------------------------------------------------------------------------
                        // Teleporters - these are in pairs, and their number is represented in the GroupID
                        // attribute. Extract that and pass it over to PUT so we can keep the same pairings
                        // -----------------------------------------------------------------------------------
                        if (base.EntityManager.HasComponent<CConveyTeleport>(primaryOccupant))
                        {
                            PlateUpTool_Integration.TDbg("Teleporter!!!");
                            var teleportData = base.EntityManager.GetComponentData<CConveyTeleport>(primaryOccupant);
                            PlateUpTool_Integration.TDbg("Group Id: " + teleportData.GroupID);
                            forceExtraData = teleportData.GroupID;
                        }

                        // -----------------------------------------------------------------------------------
                        // Icecream dispensers - these have a variable which flavour they are dispensing. We
                        // want to extract the flavour as in PUT they are represented as different appliances
                        // -----------------------------------------------------------------------------------
                        if (base.EntityManager.HasComponent<CVariableProvider>(primaryOccupant))
                        {
                            PlateUpTool_Integration.TDbg("CVariableProvider - is it icecream?");
                            if (appliance.ID == ID_ICECREAM)
                            {
                                PlateUpTool_Integration.TDbg("IceCream... flavour: ");
                                var variableData = base.EntityManager.GetComponentData<CVariableProvider>(primaryOccupant);
                                PlateUpTool_Integration.TDbg("Variable Value: " + variableData.Current);
                                switch (variableData.Current)
                                {
                                    case 0: PlateUpTool_Integration.TDbg("IceCream flavour: Vanilla"); forceAction = ID_ICECREAM_VAN; break;
                                    case 1: PlateUpTool_Integration.TDbg("IceCream flavour: Chocolate"); forceAction = ID_ICECREAM_CHOC; break;
                                    case 2: PlateUpTool_Integration.TDbg("IceCream flavour: Strawberry"); forceAction = ID_ICECREAM_STRAW; break;
                                    default:
                                        PlateUpTool_Integration.TDbg("IceCream flavour unknown (" + variableData.Current + "): forcing vanilla");
                                        forceAction = ID_ICECREAM_VAN;
                                        break;
                                }
                            }
                        }


                        // ===================================================================================
                        // Special case for certain appliances -------------------------- ^^^^^^^^^^^^^^^^^^^^
                        // ===================================================================================

                        // For each appliance, we want to extract which way its pointing so we can honour
                        // that in the tool. The rotation is stored as an enum but we want to convert it to a
                        // number to pass to PUT, so convert it here
                        string rotationStr = position.Rotation.ToOrientation().ToString();
                        int rotation = 0;
                        switch (rotationStr)
                        {
                            case "Right": rotation = 1; break;
                            case "Left": rotation = 3; break;
                            case "Down": rotation = 2; break;
                            default: rotation = 0; break;
                        }

                        // Log out some diagnostics to help with debugging any issues with the export
                        PlateUpTool_Integration.TDbg("-- " + applResult + " and " + posnResult);
                        PlateUpTool_Integration.TDbg("Appliance ID: " + appliance.ID.ToString());
                        PlateUpTool_Integration.TDbg("Appliance: " + appliance.ToString());
                        PlateUpTool_Integration.TDbg("Position: " + position.ToString() + " / " + rotation);
                        PlateUpTool_Integration.TDbg("Rotation: " + rotation);
                        PlateUpTool_Integration.TDbg("forceAction : " + forceAction);
                        PlateUpTool_Integration.TDbg("forceExtraData: " + forceExtraData);

                        if (forceAction != -1)
                        {
                            String applianceName = GetApplianceEnumName(appliance.ID);
                            int IDtoUse = appliance.ID;
                            if (forceAction != 0) IDtoUse = forceAction;

                            int convertedApplianceId = IDtoUse;

                            PlateUpTool_Integration.TDbg("Convert GameID: input=" + IDtoUse + " -> putId=" + convertedApplianceId);
                            if (convertedApplianceId == -1)
                            {
                                PlateUpTool_Integration.TDbg("Skipping AddCell: no PUT mapping for GameID " + IDtoUse + " (" + applianceName + ")");
                            }
                            else
                            {
                                PlateUpTool_Integration.TDbg("Adding: (" + xPos + "," + yPos + ") = " + applianceName + " which maps to " + convertedApplianceId + ", rot=" + rotation);
                                AddCell(xPos, yPos, convertedApplianceId, rotation, forceExtraData, new System.Collections.Generic.List<string> { "main" }, null, forceAdditionalData);
                            }
                        }
                    }  /* End of handling appliances */

                    // Debug info:
                    CLayoutRoomTile tile = TileManager.GetTile(gridPos);
                    PlateUpTool_Integration.TDbg("Room: " + tile.RoomID);
                    PlateUpTool_Integration.TDbg("Type: " + tile.Type.ToString());
                    PlateUpTool_Integration.TDbg("HasFeature: " + tile.HasFeature);

                    // If we arent at the right edge, look to the right to determine if there is a wall and if so what type (window/door/normal)
                    if (roomW < bounds.max.x)
                    {
                        Vector3 rightCell = gridPos + (Vector3)LayoutHelpers.Directions[3];
                        string featureToAdd = checkGridFeatures(gridPos, rightCell);
                        if (featureToAdd != null)
                        {
                            PlateUpTool_Integration.TDbg("Found feature between " + gridPos + " and " + rightCell + " of type " + featureToAdd);
                            AddWall('v', xPos + 1, yPos, featureToAdd);
                        }
                    }

                    // If we arent at the bottom, look below to determine if there is a wall and if so what type (window/door/normal)
                    if (roomH >= bounds.min.z)
                    {
                        Vector3 belowCell = gridPos + (Vector3)LayoutHelpers.Directions[1];
                        string featureToAdd = checkGridFeatures(gridPos, belowCell);
                        if (featureToAdd != null)
                        {
                            PlateUpTool_Integration.TDbg("Found feature between " + gridPos + " and " + belowCell + " of type " + featureToAdd);
                            // Special case - if we are looking at the bottom row and the feature is a wall, we can ignore it as PUT assumes
                            // there is always a wall at the bottom of the map and it causes confusion to have an extra one there which doesnt
                            // actually exist in the game world, but we do want the front door!
                            if (!(roomH == bounds.min.z && featureToAdd.Equals("wall"))) AddWall('h', xPos, yPos + 1, featureToAdd);
                        }
                    }
                }
            }
            string urlState = EncodeStateForUrl();
            PlateUpTool_Integration.TDbg("Finished, state for my app: " + urlState);
            //Process.Start("https://eddy0612.github.io/PlateUpTool/#state=" + urlState);
            //Process.Start("https://eddy0612.github.io/PlateUpTool/dev/#state=" + urlState);
            Process.Start("http://localhost:5173/#state=" + urlState);
        }

        // ===================================================================================================
        // Export logic
        // ===================================================================================================
        protected void ReallyImport()
        {
            // *** Can we store smart grabber programming?

            PlateUpTool_Integration.TDbg("Called to import from the clipboard");

            // Initial verification stage:
            // - Verify there is something on the clipboard which is a 'complete' export
            string clipboardText = (GUIUtility.systemCopyBuffer ?? "").Trim();
            if (string.IsNullOrEmpty(clipboardText))
            {
                PlateUpTool_Integration.TDbg("Clipboard is empty, aborting import");
                return;
            }

            // Support both a raw encoded state and a full URL containing #state=
            string encodedState = clipboardText;
            int stateMarker = clipboardText.IndexOf("#state=");
            if (stateMarker >= 0)
                encodedState = clipboardText.Substring(stateMarker + 7);

            PUTState importedState;
            try
            {
                importedState = DecodeStateFromUrl(encodedState);
            }
            catch (Exception ex)
            {
                PlateUpTool_Integration.TDbg("Failed to decode clipboard state: " + ex.Message);
                return;
            }

            PlateUpTool_Integration.TDbg("Decoded import: " + importedState.roomWidth + "x" + importedState.roomHeight +
                ", " + importedState.gridCells.Count + " cells, " + importedState.walls.Count + " walls");

            // - Verify the room dimensions match
            Bounds bounds = base.Bounds;
            int height = (int)(bounds.max.z - bounds.min.z + 1f);
            int width = (int)(bounds.max.x - bounds.min.x + 1f);
            PlateUpTool_Integration.TDbg("Game room size: " + width + " x " + height);

            if (importedState.roomWidth != width || importedState.roomHeight != height)
            {
                PlateUpTool_Integration.TDbg("Import aborted: imported layout is " + importedState.roomWidth + "x" + importedState.roomHeight +
                    " but current room is " + width + "x" + height);
                return;
            }
            PlateUpTool_Integration.TDbg("Room dimensions match: " + width + "x" + height);

            // - Verify all walls/doors/hatches in the clipboard version match
            if (!VerifyWallLayout(importedState, bounds))
                return;

            // Build list of all imported appliances
            var importedAppliances = importedState.gridCells.ToList();
            PlateUpTool_Integration.TDbg("Imported appliances: " + importedAppliances.Count);

            // Scan the game grid to build the working lists for the import
            ScanGameGrid(bounds,
                out var gameAppliances,
                out var chairApplianceIds,
                out var emptyCells);

            // Partition imported list into non-chairs and chairs
            var importedNonChairs = importedAppliances.Where(c => !chairApplianceIds.Contains(c.applianceId)).ToList();
            var importedChairs    = importedAppliances.Where(c =>  chairApplianceIds.Contains(c.applianceId)).ToList();

            PlateUpTool_Integration.TDbg("Game appliances: " + gameAppliances.Count +
                ", chair IDs: " + chairApplianceIds.Count + ", empty cells: " + emptyCells.Count);
            PlateUpTool_Integration.TDbg("Import non-chairs: " + importedNonChairs.Count +
                ", import chairs: " + importedChairs.Count);

            // Verify that every imported non-chair appliance has a game appliance to fulfil it.
            // MatchAppliances does a two-pass greedy match (exact then correctable) and returns the
            // pairings for the placement loop, or null if anything is unresolvable.
            var pairings = MatchAppliances(importedNonChairs, gameAppliances);
            if (pairings == null)
            {
                PlateUpTool_Integration.TDbg("Import aborted: appliance inventory does not match (see above for details)");
                return;
            }
            PlateUpTool_Integration.TDbg("All " + pairings.Count + " non-chair appliances matched");

            LogImportStats(pairings);

            PlaceAppliances(pairings, bounds, emptyCells, gameAppliances);

            FixUpTableChairs(pairings, importedChairs);

        }

        // ===================================================================================================
        // Utility functions
        // ===================================================================================================

        // -------------------------------------------------------------------------------------
        // Appliance matching helpers (used by ReallyImport)
        // -------------------------------------------------------------------------------------

        // Returns true if id is one of the rotating corner-grabber IDs (L/R are the split-out
        // export representations; S is the single in-game ID with an orientation property).
        private static bool IsRotatingGrabber(int id) => id == ID_GRABBER_L || id == ID_GRABBER_R || id == ID_GRABBER_S;

        // Returns true if id is one of the three ice-cream flavour overrides.
        private static bool IsIceCream(int id) => id == ID_ICECREAM_CHOC || id == ID_ICECREAM_STRAW || id == ID_ICECREAM_VAN;

        // Returns true if a cell/appliance carries a non-empty additionalData list.
        private static bool HasAdditionalData(List<int> items) => items != null && items.Count > 0;

        // Order-independent equality check for two additionalData lists.
        private static bool AdditionalDataMatch(List<int> a, List<int> b)
        {
            if (a == null && b == null) return true;
            if (a == null || b == null) return false;
            if (a.Count != b.Count) return false;
            var sortedA = a.OrderBy(x => x).ToList();
            var sortedB = b.OrderBy(x => x).ToList();
            for (int i = 0; i < sortedA.Count; i++)
                if (sortedA[i] != sortedB[i]) return false;
            return true;
        }

        // Exact match: same applianceId + same extraData. Rotation is always correctable so
        // is not used as a matching criterion. Cross-ID matches (any grabber, any flavour) are
        // handled as correctable loose matches in the second pass.
        // When the imported cell has no additionalData we prefer game appliances that also have
        // no additionalData (same-kind preference), falling back to any match if none found.
        private static GameAppliance FindExactMatch(PUTGridCell imp, List<GameAppliance> available)
        {
            var candidates = available.Where(g =>
                (g.applianceId == imp.applianceId || (g.altId != 0 && g.altId == imp.applianceId)) &&
                g.extraData   == imp.extraData).ToList();
            if (candidates.Count == 0) return null;
            // Prefer a game appliance whose additionalData state mirrors the import's
            if (!HasAdditionalData(imp.additionalData))
                return candidates.FirstOrDefault(g => !HasAdditionalData(g.additionalData)) ?? candidates[0];
            return candidates[0];
        }

        // Loose match rules (correctable alternatives, used when no exact match was found):
        //   Grabbers  – any rotating grabber (L/R/S are interchangeable; direction corrected in-game)
        //   Ice cream – any ice-cream flavour (corrected via CVariableProvider)
        //   Teleporters – extraData (GroupID) must still match; no looser alternative exists
        //   Regular   – same applianceId + same extraData, any rotation (rotation is correctable)
        private static GameAppliance FindLooseMatch(PUTGridCell imp, List<GameAppliance> available)
        {
            if (IsRotatingGrabber(imp.applianceId))
                return available.FirstOrDefault(g => IsRotatingGrabber(g.applianceId));
            if (IsIceCream(imp.applianceId))
                return available.FirstOrDefault(g => IsIceCream(g.applianceId));
            return available.FirstOrDefault(g =>
                (g.applianceId == imp.applianceId || (g.altId != 0 && g.altId == imp.applianceId)) &&
                g.extraData   == imp.extraData);
        }

        // -------------------------------------------------------------------------------------
        // Placement helpers (used by ReallyImport)
        // -------------------------------------------------------------------------------------

        // Converts PUT grid coordinates back to the game world position.
        private static Vector3 PutToWorld(int putX, int putY, Bounds bounds)
        {
            return new Vector3(bounds.min.x + putX, 0f, bounds.max.z - putY);
        }

        // Evict whatever occupies fromPos to the first available empty cell.
        // emptyCells and occupantMap are kept in sync.
        // Returns a dictionary key from a world-space position using integer rounding,
        // avoiding float equality / hash collisions in Dictionary<Vector3,…> lookups.
        private static (int, int) OccupantKey(Vector3 pos) =>
            (Mathf.RoundToInt(pos.x), Mathf.RoundToInt(pos.z));

        private void EvictToEmpty(Vector3 fromPos, List<Vector3> emptyCells, Dictionary<(int, int), Entity> occupantMap)
        {
            if (emptyCells.Count == 0)
            {
                PlateUpTool_Integration.TDbg("EvictToEmpty: no empty cell available, cannot evict from " + fromPos);
                return;
            }
            Vector3 toPos = emptyCells[0];
            emptyCells.RemoveAt(0);
            emptyCells.Add(fromPos);   // fromPos will be free once the move completes
            Entity occupant;
            if (!occupantMap.TryGetValue(OccupantKey(fromPos), out occupant))
            {
                PlateUpTool_Integration.TDbg("EvictToEmpty: no entity in map at " + fromPos);
                return;
            }
            occupantMap.Remove(OccupantKey(fromPos));
            occupantMap[OccupantKey(toPos)] = occupant;
            var evictPos = base.EntityManager.GetComponentData<CPosition>(occupant);
            evictPos.Position = toPos;
            base.EntityManager.SetComponentData(occupant, evictPos);
            PlateUpTool_Integration.TDbg("Evicted occupant from " + fromPos + " -> " + toPos);
        }

        // Move appliance to targetPos and keep emptyCells and occupantMap in sync.
        private void MoveAppliance(GameAppliance appliance, Vector3 targetPos, List<Vector3> emptyCells, Dictionary<(int, int), Entity> occupantMap)
        {
            Vector3 fromPos = new Vector3(appliance.worldX, 0f, appliance.worldZ);
            emptyCells.Remove(targetPos);
            emptyCells.Add(fromPos);
            occupantMap.Remove(OccupantKey(fromPos));
            occupantMap[OccupantKey(targetPos)] = appliance.entity;
            var movePos = base.EntityManager.GetComponentData<CPosition>(appliance.entity);
            movePos.Position = targetPos;
            base.EntityManager.SetComponentData(appliance.entity, movePos);
            PlateUpTool_Integration.TDbg("Moved appliance (id=" + appliance.applianceId + ") from " + fromPos + " -> " + targetPos);
            appliance.worldX = targetPos.x;
            appliance.worldZ = targetPos.z;
        }

        // Reverse of the read in ScanGameGrid: 0=Up, 1=Right, 2=Down, 3=Left
        private static Quaternion RotationToQuaternion(int rotation)
        {
            switch (rotation)
            {
                case 1: return Quaternion.Euler(0f,  90f, 0f);
                case 2: return Quaternion.Euler(0f, 180f, 0f);
                case 3: return Quaternion.Euler(0f, 270f, 0f);
                default: return Quaternion.identity;
            }
        }

        // Correct the rotation and attributes of an entity to match the imported cell.
        private void FixUpAppliance(Entity entity, PUTGridCell target)
        {
            // Fix rotation via CPosition
            var position = base.EntityManager.GetComponentData<CPosition>(entity);
            position.Rotation = RotationToQuaternion(target.rotation);
            base.EntityManager.SetComponentData(entity, position);
            PlateUpTool_Integration.TDbg("FixUp entity " + entity + ": rotation set to " + target.rotation);

            // Fix grabber direction — ID_GRABBER_L/R are the export-side representations of
            // CConveyPushRotatable.Target; ID_GRABBER_S uses normal rotation only.
            if (target.applianceId == ID_GRABBER_L || target.applianceId == ID_GRABBER_R)
            {
                var grabber = base.EntityManager.GetComponentData<CConveyPushRotatable>(entity);
                grabber.Target = target.applianceId == ID_GRABBER_L ? Orientation.Left : Orientation.Right;
                base.EntityManager.SetComponentData(entity, grabber);
                PlateUpTool_Integration.TDbg("FixUp entity " + entity + ": grabber target set to " + grabber.Target);
            }

            // Fix ice cream flavour — 0=Vanilla, 1=Chocolate, 2=Strawberry (mirrors ScanGameGrid read)
            if (IsIceCream(target.applianceId))
            {
                int flavour = target.applianceId == ID_ICECREAM_CHOC ? 1 :
                              target.applianceId == ID_ICECREAM_STRAW ? 2 : 0;
                var provider = base.EntityManager.GetComponentData<CVariableProvider>(entity);
                provider.Current = flavour;
                base.EntityManager.SetComponentData(entity, provider);
                PlateUpTool_Integration.TDbg("FixUp entity " + entity + ": ice cream flavour set to " + flavour);
            }
        }

        // Place each paired appliance at its imported target position, evicting any
        // unexpected occupant first, then fix up rotation/attributes.
        private void PlaceAppliances(List<ImportPairing> pairings, Bounds bounds, List<Vector3> emptyCells, List<GameAppliance> gameAppliances)
        {
            // Build occupant map from ALL game appliances so that unmatched appliances
            // (e.g. a table removed from the import) are still visible as blockers.
            // Integer (putX,putY) keys via OccupantKey() avoid float equality/hash issues.
            var occupantMap = new Dictionary<(int, int), Entity>();
            foreach (var ga in gameAppliances)
                occupantMap[OccupantKey(new Vector3(ga.worldX, 0f, ga.worldZ))] = ga.entity;
            PlateUpTool_Integration.TDbg("PlaceAppliances: occupantMap has " + occupantMap.Count + " entries");

            foreach (var p in pairings)
            {
                Vector3 targetPos = PutToWorld(p.imported.x, p.imported.y, bounds);
                Entity currentOccupant;
                occupantMap.TryGetValue(OccupantKey(targetPos), out currentOccupant);
                PlateUpTool_Integration.TDbg("Pairing imp=" + p.imported.applianceId + "@(" + p.imported.x + "," + p.imported.y + ") target=" + targetPos + " mapOccupant=" + currentOccupant.Index + ":" + currentOccupant.Version + " gameEntity=" + p.game.entity.Index + ":" + p.game.entity.Version);

                if (currentOccupant == p.game.entity)
                {
                    // Already in the right cell — only attributes may need correcting.
                    PlateUpTool_Integration.TDbg("Appliance id=" + p.game.applianceId +
                        " already at target " + targetPos + ", skipping move");
                }
                else
                {
                    if (currentOccupant != Entity.Null)
                    {
                        // Something else is blocking the target cell — move it out of the way first.
                        PlateUpTool_Integration.TDbg("Evicting occupant entity " + currentOccupant.Index + ":" + currentOccupant.Version + " from " + targetPos);
                        EvictToEmpty(targetPos, emptyCells, occupantMap);
                    }
                    MoveAppliance(p.game, targetPos, emptyCells, occupantMap);
                }

                FixUpAppliance(p.game.entity, p.imported);
            }
        }

        // For each table entity in pairings, set its CApplianceTable Prevent flags based on
        // whether the imported layout has a chair in each adjacent cell pointing back at the table.
        // Only tables present in the import are updated; unmatched tables are left as-is.
        private void FixUpTableChairs(List<ImportPairing> pairings, List<PUTGridCell> importedChairs)
        {
            // Index imported chairs by grid position for O(1) adjacency checks.
            var chairByPos = new Dictionary<(int, int), PUTGridCell>();
            foreach (var chair in importedChairs)
                chairByPos[(chair.x, chair.y)] = chair;

            foreach (var p in pairings)
            {
                if (!base.EntityManager.HasComponent<CApplianceTable>(p.game.entity))
                    continue;

                int tx = p.imported.x;
                int ty = p.imported.y;

                // A chair at an adjacent cell "points at" this table when its rotation faces
                // away from the table centre (chair faces the same direction as its offset):
                //   Up    cell (ty-1): chair faces Up    (rotation 0)
                //   Down  cell (ty+1): chair faces Down  (rotation 2)
                //   Left  cell (tx-1): chair faces Left  (rotation 3)
                //   Right cell (tx+1): chair faces Right (rotation 1)
                bool upChair    = HasChairFacing(chairByPos, tx,   ty - 1, 0);
                bool downChair  = HasChairFacing(chairByPos, tx,   ty + 1, 2);
                bool leftChair  = HasChairFacing(chairByPos, tx - 1, ty,   3);
                bool rightChair = HasChairFacing(chairByPos, tx + 1, ty,   1);

                var tableData = base.EntityManager.GetComponentData<CApplianceTable>(p.game.entity);
                tableData.PreventSittingUp    = !upChair;
                tableData.PreventSittingDown  = !downChair;
                tableData.PreventSittingLeft  = !leftChair;
                tableData.PreventSittingRight = !rightChair;
                base.EntityManager.SetComponentData(p.game.entity, tableData);

                PlateUpTool_Integration.TDbg("FixUpTableChairs entity=" + p.game.entity +
                    " up=" + upChair + " down=" + downChair +
                    " left=" + leftChair + " right=" + rightChair);
            }
        }

        // Returns true if importedChairs contains a chair at (x, y) with the given rotation.
        private static bool HasChairFacing(
            Dictionary<(int, int), PUTGridCell> chairByPos, int x, int y, int expectedRotation)
        {
            PUTGridCell chair;
            return chairByPos.TryGetValue((x, y), out chair) && chair.rotation == expectedRotation;
        }

        private static void LogImportStats(List<ImportPairing> pairings)
        {
            int noChange    = 0;
            int attrOnly    = 0;
            int needsMove   = 0;

            foreach (var p in pairings)
            {
                bool samePos  = p.imported.x == p.game.putX && p.imported.y == p.game.putY;
                bool sameRot  = p.imported.rotation  == p.game.rotation;
                bool sameAttr = p.imported.extraData == p.game.extraData;

                if (samePos && sameRot && sameAttr)
                    noChange++;
                else if (samePos)
                    attrOnly++;
                else
                    needsMove++;
            }

            PlateUpTool_Integration.TDbg(
                "Import stats: " + noChange + " need no changes, " +
                attrOnly + " need rotation/attribute fix only, " +
                needsMove + " need to be moved");
        }

        // Three-pass greedy match:
        //   Pass 0 – imported cells with additionalData are matched against game appliances
        //            with the exact same additionalData set (order-independent).  Only after
        //            ALL strict matches are resolved do unresolved cells fall through.
        //   Pass 1 – exact match (same applianceId + same extraData) for everything else.
        //   Pass 2 – loose / correctable match for whatever remains.
        // Returns the full pairings list, or null if any imported appliance cannot be matched.
        private static List<ImportPairing> MatchAppliances(
            List<PUTGridCell> imported,
            List<GameAppliance> available)
        {
            var remaining = new List<GameAppliance>(available);
            var pairings  = new List<ImportPairing>();

            PlateUpTool_Integration.TDbg("MatchAppliances: " + imported.Count + " imported, " + available.Count + " game appliances");
            PlateUpTool_Integration.TDbg("  Imported IDs: " + string.Join(", ", imported.Select(c => c.applianceId + "@(" + c.x + "," + c.y + ")").ToArray()));
            PlateUpTool_Integration.TDbg("  Game IDs:     " + string.Join(", ", available.Select(g => g.applianceId + (g.altId != 0 ? "/alt" + g.altId : "") + "@(" + g.putX + "," + g.putY + ")").ToArray()));

            // Pass 0: strict additionalData matching
            var strictUnmatched = new List<PUTGridCell>(); // cells with additionalData and no strict partner yet
            var noAdditional    = new List<PUTGridCell>(); // cells without additionalData
            foreach (var imp in imported)
            {
                if (HasAdditionalData(imp.additionalData))
                {
                    var match = remaining.FirstOrDefault(g =>
                        (g.applianceId == imp.applianceId || (g.altId != 0 && g.altId == imp.applianceId)) &&
                        g.extraData == imp.extraData &&
                        AdditionalDataMatch(g.additionalData, imp.additionalData));
                    if (match != null)
                    {
                        PlateUpTool_Integration.TDbg("  Strict additionalData match: imp=" + imp.applianceId + "@(" + imp.x + "," + imp.y + ") data=[" + string.Join(",", imp.additionalData) + "] -> game@(" + match.putX + "," + match.putY + ")");
                        pairings.Add(new ImportPairing(imp, match));
                        remaining.Remove(match);
                    }
                    else
                    {
                        PlateUpTool_Integration.TDbg("  No strict additionalData match for imp=" + imp.applianceId + "@(" + imp.x + "," + imp.y + ") data=[" + string.Join(",", imp.additionalData) + "] -> deferring to loose passes");
                        strictUnmatched.Add(imp);
                    }
                }
                else
                {
                    noAdditional.Add(imp);
                }
            }

            // Pass 1: exact match for cells without additionalData and those that had no strict partner
            var unmatched = new List<PUTGridCell>();
            foreach (var imp in noAdditional.Concat(strictUnmatched).OrderBy(c => c.applianceId))
            {
                var match = FindExactMatch(imp, remaining);
                if (match != null)
                {
                    PlateUpTool_Integration.TDbg("  Exact match: imp=" + imp.applianceId + "@(" + imp.x + "," + imp.y + ") -> game=" + match.applianceId + "@(" + match.putX + "," + match.putY + ")");
                    pairings.Add(new ImportPairing(imp, match));
                    remaining.Remove(match);
                }
                else
                {
                    PlateUpTool_Integration.TDbg("  No exact match for imp=" + imp.applianceId + " extra=" + imp.extraData + " at (" + imp.x + "," + imp.y + ") -> deferring to loose pass");
                    unmatched.Add(imp);
                }
            }

            // Pass 2: loose / correctable match for anything still unmatched
            foreach (var imp in unmatched)
            {
                var match = FindLooseMatch(imp, remaining);
                if (match == null)
                {
                    PlateUpTool_Integration.TDbg("  FAIL loose match: imp=" + imp.applianceId + " extra=" + imp.extraData + " at (" + imp.x + "," + imp.y + ")");
                    PlateUpTool_Integration.TDbg("  Remaining game IDs: " + string.Join(", ", remaining.Select(g => g.applianceId + (g.altId != 0 ? "/alt" + g.altId : "") + "@(" + g.putX + "," + g.putY + ")").ToArray()));
                    PlateUpTool_Integration.TDbg("  IsRotatingGrabber(imp)=" + IsRotatingGrabber(imp.applianceId) + "  IsIceCream(imp)=" + IsIceCream(imp.applianceId));
                    return null;
                }
                PlateUpTool_Integration.TDbg("  Loose match: imp=" + imp.applianceId + "@(" + imp.x + "," + imp.y + ") -> game=" + match.applianceId + "@(" + match.putX + "," + match.putY + ")");
                pairings.Add(new ImportPairing(imp, match));
                remaining.Remove(match);
            }

            return pairings;
        }

        // Scan the game grid and produce the three working lists needed by ReallyImport:
        //   gameAppliances  – every non-chair occupant with effective ID/rotation/extraData
        //   chairApplianceIds – set of applianceIds that are ghost chairs (for partitioning the import list)
        //   emptyCells      – world positions of squares with no primary occupant
        private void ScanGameGrid(
            Bounds bounds,
            out List<GameAppliance> gameAppliances,
            out HashSet<int> chairApplianceIds,
            out List<Vector3> emptyCells)
        {
            gameAppliances    = new List<GameAppliance>();
            chairApplianceIds = new HashSet<int>();
            emptyCells        = new List<Vector3>();

            for (float roomH = bounds.max.z; roomH >= bounds.min.z; roomH -= 1f)
            {
                int yPos = 0 - (int)(roomH - bounds.max.z);
                for (float roomW = bounds.min.x; roomW <= bounds.max.x; roomW += 1f)
                {
                    int xPos = (int)(roomW - bounds.min.x);
                    Vector3 gridPos = new Vector3(roomW, 0f, roomH);
                    Entity occupant = TileManager.GetPrimaryOccupant(gridPos);

                    if (occupant == Entity.Null)
                    {
                        emptyCells.Add(gridPos);
                        continue;
                    }

                    CAppliance appliance; CPosition position;
                    base.EntityManager.RequireComponent<CAppliance>(occupant, out appliance);
                    base.EntityManager.RequireComponent<CPosition>(occupant, out position);

                    // Ghost chairs are handled in the separate chair pass
                    if (base.EntityManager.HasComponent<CApplianceGhostChair>(occupant))
                    {
                        chairApplianceIds.Add(appliance.ID);
                        continue;
                    }

                    // Apply the same ID overrides as ReallyExport
                    int effectiveId = appliance.ID;
                    int altId     = GetAltId(appliance.ID); // canonical alias (0 if none)
                    int extraData = 0;
                    if (base.EntityManager.HasComponent<CConveyPushRotatable>(occupant))
                    {
                        var cr = base.EntityManager.GetComponentData<CConveyPushRotatable>(occupant);
                        if (cr.Target == Orientation.Left)  effectiveId = ID_GRABBER_L;
                        if (cr.Target == Orientation.Right) effectiveId = ID_GRABBER_R;
                    }
                    if (base.EntityManager.HasComponent<CConveyTeleport>(occupant))
                        extraData = base.EntityManager.GetComponentData<CConveyTeleport>(occupant).GroupID;
                    if (base.EntityManager.HasComponent<CVariableProvider>(occupant) && appliance.ID == ID_ICECREAM)
                    {
                        int flavour = base.EntityManager.GetComponentData<CVariableProvider>(occupant).Current;
                        effectiveId = flavour == 1 ? ID_ICECREAM_CHOC : flavour == 2 ? ID_ICECREAM_STRAW : ID_ICECREAM_VAN;
                    }

                    string rotStr = position.Rotation.ToOrientation().ToString();
                    int rotation = rotStr == "Right" ? 1 : rotStr == "Left" ? 3 : rotStr == "Down" ? 2 : 0;

                    List<int> sgItems = null;
                    if (base.EntityManager.HasComponent<CConveyPushItems>(occupant))
                    {
                        var sgData = base.EntityManager.GetComponentData<CConveyPushItems>(occupant);
                        KitchenData.ItemList il = sgData.SpecificComponents;
                        if (il.Count > 0)
                        {
                            sgItems = new List<int>();
                            for (int i = 0; i < il.Count; i++)
                                sgItems.Add(il[i]);
                        }
                    }

                    gameAppliances.Add(new GameAppliance {
                        putX = xPos, putY = yPos,
                        worldX = roomW, worldZ = roomH,
                        applianceId = effectiveId,
                        altId     = altId,
                        rotation = rotation,
                        extraData = extraData,
                        additionalData = sgItems,
                        entity = occupant
                    });
                    PlateUpTool_Integration.TDbg("ScanGrid ("+xPos+","+yPos+"): rawId="+appliance.ID+" effectiveId="+effectiveId+" altId="+altId+" rot="+rotation+" extra="+extraData);
                }
            }
        }

        // Scan the current game wall layout and verify it matches the imported state.
        // Returns true if compatible, false (with diagnostics logged) if not.
        // door/hatch mismatches are tolerated; extra game walls that the import doesn't mention are ignored.
        private bool VerifyWallLayout(PUTState importedState, Bounds bounds)
        {
            var currentWalls = new Dictionary<string, string>();
            for (float roomH = bounds.max.z; roomH >= bounds.min.z; roomH -= 1f)
            {
                int yPos = 0 - (int)(roomH - bounds.max.z);
                for (float roomW = bounds.min.x; roomW <= bounds.max.x; roomW += 1f)
                {
                    int xPos = (int)(roomW - bounds.min.x);
                    Vector3 gridPos = new Vector3(roomW, 0f, roomH);

                    if (roomW < bounds.max.x)
                    {
                        Vector3 rightCell = gridPos + (Vector3)LayoutHelpers.Directions[3];
                        string feature = checkGridFeatures(gridPos, rightCell);
                        if (feature != null) currentWalls[$"v,{xPos + 1},{yPos}"] = feature;
                    }
                    if (roomH >= bounds.min.z)
                    {
                        Vector3 belowCell = gridPos + (Vector3)LayoutHelpers.Directions[1];
                        string feature = checkGridFeatures(gridPos, belowCell);
                        if (feature != null && !(roomH == bounds.min.z && feature == "wall"))
                            currentWalls[$"h,{xPos},{yPos + 1}"] = feature;
                    }
                }
            }

            var wallMismatches = new List<string>();
            foreach (var kv in importedState.walls)
            {
                currentWalls.TryGetValue(kv.Key, out string currentType);
                bool typesMatch = currentType == kv.Value ||
                    (currentType != null && WallTypesCompatible(kv.Value, currentType));
                if (!typesMatch)
                    wallMismatches.Add($"import has {kv.Key}={kv.Value}, game has {currentType ?? "nothing"}");
            }

            if (wallMismatches.Count > 0)
            {
                PlateUpTool_Integration.TDbg("Import aborted: wall layout does not match (" + wallMismatches.Count + " differences)");
                foreach (var m in wallMismatches) PlateUpTool_Integration.TDbg("  " + m);
                return false;
            }

            PlateUpTool_Integration.TDbg("Wall layout matches (" + currentWalls.Count + " walls)");
            return true;
        }

        // door and hatch are interchangeable: the game auto-converts doors adjacent to appliances into hatches
        private static bool WallTypesCompatible(string a, string b) =>
            (a == "door" || a == "hatch") && (b == "door" || b == "hatch");

        // Return the enum member name for a given appliance value, or null if not found.
        public static string GetApplianceEnumName(int value)
        {
            var t = typeof(KitchenLib.References._ApplianceReferences);
            var name = Enum.GetName(t, value);
            if (name != null) return name;
            // Fallback: handle duplicate values or other cases
            var matches = Enum.GetValues(t)
                              .Cast<object>()
                              .Where(v => Convert.ToInt64(v) == value)
                              .Select(v => Enum.GetName(t, v))
                              .Where(n => n != null)
                              .ToArray();
            return matches.Length > 0 ? matches[0] : null;
        }

        // Look for a feature or calculate walls on the grid between two cells, return a string representing the feature
        private string checkGridFeatures(Vector3 from, Vector3 to)
        {
            CLayoutFeature feature;
            if (TryGetFeature(from, to, out feature))
            {
                PlateUpTool_Integration.TDbg("Found feature between " + from + " and " + to + " of type " + feature.Type);
                switch (feature.Type)
                {
                    case FeatureType.Door: return "door";
                    case FeatureType.DoorReversed: return "door";
                    case FeatureType.FrontDoor: return "door";
                    case FeatureType.EmployeesOnlyDoor: return "door";
                    case FeatureType.LightDoor: return "door";
                    case FeatureType.MissingDoor: return "door";
                    case FeatureType.Hatch: return "hatch";
                    case FeatureType.Generic: return "wall";
                }
            }

            if (TileManager.GetRoom(from) == TileManager.GetRoom(to))
            {
                // Same room - must be no wall or anything
                return null;
            }
            else if (TileManager.CanReach(from, to))
            {
                // Can reach between the rooms but different rooms - hatch
                // Should be handled by code above for features, but just in case.
                return "hatch";
            }
            else
            {
                // Must be a wall
                return "wall";
            }
        }

        // Look for an explicit feature on the grid between two cells
        private bool TryGetFeature(Vector3 from, Vector3 to, out CLayoutFeature feature)
        {
            var EM = base.EntityManager;
            feature = default;
            var buffer = EM.GetBuffer<CLayoutFeature>(base.GetSingletonEntity<SLayout>());
            for (int i = 0; i < buffer.Length; i++)
            {
                var checkedFeature = buffer[i];
                if ((from.IsSameTile(checkedFeature.Tile1) && to.IsSameTile(checkedFeature.Tile2)) ||
                    (from.IsSameTile(checkedFeature.Tile2) && to.IsSameTile(checkedFeature.Tile1)))
                {
                    feature = checkedFeature;
                    return true;
                }
            }
            return false;
        }
    }
}
