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

namespace PlateUpTool_Integration
{
    public class PUT_Exporter : RestaurantSystem, IModSystem
    {

        // ======================================================================================================================
        // Below code all produced by AI to represent the state object maintained in the JavaScript web based tool
        // ======================================================================================================================
        // State model matching src/store/restaurant.js DEFAULT_STATE
        public class PUTTab { public string id; public string label; public PUTTab() {} public PUTTab(string id, string label) { this.id = id; this.label = label; } }
        public class PUTGridCell { public int x; public int y; public int applianceId; public int rotation; public int extraData; public List<string> tabIds; public string iid; }
        public class PUTLabel { public string id; public int? x; public int? y; public int? x2; public int? y2; public string text; public string anchorIid; public int? anchorX; public int? anchorY; }
        public class PUTState {
            public List<PUTTab> tabs = new List<PUTTab>() { new PUTTab("complete","Preview"), new PUTTab("structure","Structure"), new PUTTab("main","Generated") };
            public string activeTabId = "main";
            public int orientation = 0;
            public double zoom = 1.0; // not serialized
            public int roomWidth = 16;
            public int roomHeight = 12;
            public string filterText = ""; // not serialized
            public Dictionary<string,string> walls = new Dictionary<string,string>();
            public List<PUTGridCell> gridCells = new List<PUTGridCell>();
            public List<PUTLabel> labels = new List<PUTLabel>();
        }

        // In-memory state instance you can populate with the helpers below
        private PUTState exportState = new PUTState();

        // --- Setter helpers (call these from your mod code to prepare a state) ---
        private void SetRoomSize(int width, int height) { exportState.roomWidth = width; exportState.roomHeight = height; }
        private void SetOrientation(int o) { exportState.orientation = o; }
        private void SetTabs(List<PUTTab> tabs) { exportState.tabs = tabs ?? new List<PUTTab>(); }
        private void ClearCells() { exportState.gridCells.Clear(); }
        private void AddCell(int x, int y, int applianceId, int rotation = 0, int extraData = 0, List<string> tabIds = null, string iid = null) {
            exportState.gridCells.Add(new PUTGridCell { x = x, y = y, applianceId = applianceId, rotation = rotation, extraData = extraData, tabIds = tabIds ?? new List<string>(), iid = iid });
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

            var w = new BitWriter();
            // Header bytes
            var headerBytes = new List<int> {
                roomWidth, roomHeight, stateObj.orientation, flags, defaultTabMask,
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
                w.Write(c.applianceId, 9);
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

            var packed = w.Finish();
            return Base64UrlEncode(packed);
        }
        // ======================================================================================================================
        // Above code all produced by AI to represent the state object maintained in the JavaScript web based tool
        // ======================================================================================================================
        private static PUT_Exporter _instance;

        static int ID_GRABBER_L = -99;
        static int ID_GRABBER_R = -98;
        static int ID_ICECREAM_CHOC = -97;
        static int ID_ICECREAM_STRAW = -96;
        static int ID_ICECREAM_VAN = -95;
        static int PUT_ID_ICECREAM = 168;

        [StructLayout(LayoutKind.Sequential, Size = 1)]
        protected struct PUT_DummyComponent : IComponentData, IModComponent
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
        protected override void OnUpdate()
        {
            if (TryGetSingletonEntity<PUT_DummyComponent>(out var value))
            {
                PlateUpTool_Integration.TDbg("OnUpdate called - found object");
                ReallyExport();
                base.EntityManager.DestroyEntity(value);
            }
        }

        protected void ReallyExport()
        {
            // Get room dimensions and save them away in the export state
            Bounds bounds = base.Bounds;
            int height = (int)(bounds.max.z - bounds.min.z + 1f);
            int width = (int)(bounds.max.x - bounds.min.x + 1f);
            PlateUpTool_Integration.TDbg("Screen size: " + width + " x " + height);
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
                            int tempConvertedApplianceId = GameIdToPutId.GetPutId(appliance.ID);
                            if (tempConvertedApplianceId == PUT_ID_ICECREAM)
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

                            int convertedApplianceId = GameIdToPutId.GetPutId(IDtoUse);

                            PlateUpTool_Integration.TDbg("Convert GameID: input=" + IDtoUse + " -> putId=" + convertedApplianceId);
                            if (convertedApplianceId == -1)
                            {
                                PlateUpTool_Integration.TDbg("Skipping AddCell: no PUT mapping for GameID " + IDtoUse + " (" + applianceName + ")");
                            }
                            else
                            {
                                PlateUpTool_Integration.TDbg("Adding: (" + xPos + "," + yPos + ") = " + applianceName + " which maps to " + convertedApplianceId + ", rot=" + rotation);
                                AddCell(xPos, yPos, convertedApplianceId, rotation, forceExtraData, new System.Collections.Generic.List<string> { "main" });
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
            Process.Start("http://localhost:5173/#state=" + urlState);
        }

        /// <summary>
        /// Return the enum member name for a given appliance value, or null if not found.
        /// </summary>
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
