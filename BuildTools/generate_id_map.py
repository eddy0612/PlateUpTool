#!/usr/bin/env python3
"""
Generate PUT_IdMap.cs from the MapGameId entries in appliances.json.

A game appliance ID that has a MapGameId entry is an alias for the canonical
PUT ID (MapGameId value).  ScanGameGrid uses GetAltId() to populate
GameAppliance.altId so that FindExactMatch / FindLooseMatch can accept either
the raw game ID or its canonical alias.

Usage (from workspace root):
    python BuildTools/generate_id_map.py
"""

import json
import os

SCRIPT_DIR        = os.path.dirname(os.path.abspath(__file__))
APPLIANCES_JSON   = os.path.join(SCRIPT_DIR, '..', 'src', 'public', 'res', 'appliances.json')
OUTPUT_CS         = os.path.join(SCRIPT_DIR, '..', 'src-mod', 'PlateUpTool_Integration', 'PUT_IdMap.cs')

with open(APPLIANCES_JSON, encoding='utf-8') as f:
    data = json.load(f)

mappings = sorted(
    (e['GameID'], e['MapGameId'])
    for e in data
    if e.get('MapGameId', -1) != -1
)

pair_lines = ',\n            '.join(f'{{ {gid}, {mid} }}' for gid, mid in mappings)

content = f"""\
// AUTO-GENERATED — do not edit manually.
// Regenerate by running from the workspace root:
//   python BuildTools/generate_id_map.py

namespace PlateUpTool_Integration
{{
    public partial class PUT_Exporter
    {{
        // Pairs of [raw game appliance ID, canonical PUT ID] from appliances.json MapGameId entries.
        // Column 0: a game ID that is an alias of column 1 (its canonical equivalent in PUT).
        // Used by GetAltId() which is called from ScanGameGrid to populate GameAppliance.altId.
        private static readonly int[,] _idMapPairs = new int[,]
        {{
            {pair_lines}
        }};

        // Returns the canonical alias for a raw game appliance ID, or 0 if none.
        private static int GetAltId(int id)
        {{
            for (int i = 0; i < _idMapPairs.GetLength(0); i++)
                if (_idMapPairs[i, 0] == id) return _idMapPairs[i, 1];
            return 0;
        }}
    }}
}}
"""

with open(OUTPUT_CS, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Written {len(mappings)} mappings -> {os.path.relpath(OUTPUT_CS)}")
