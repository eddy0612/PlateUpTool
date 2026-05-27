#!/usr/bin/env python3
"""
Generate a C# mapping file from GameID -> PUT `ID`.

Behavior:
- Reads `src/public/res/appliances.json`.
- For each appliance object, determines the effective game id:
  - If `MapGameId` is set and not -1, use that as the game id.
  - Otherwise use `GameID` if it's not -1.
- Skips entries with no usable game id.
- Writes `BuildTools/GameIdToPutId.cs` with a static Dictionary<int,int> mapping GameID -> PUT ID.

Runs with no parameters.
"""
from __future__ import annotations
import json
import pathlib
import sys
from typing import Dict, Tuple, List


def main() -> int:
    root = pathlib.Path(__file__).resolve().parents[1]
    appl_path = root / 'src' / 'public' / 'res' / 'appliances.json'
    out_path = root / 'src-mod' / 'PlateUpTool_Integration' / 'GameIdToPutId.cs'
    if not appl_path.exists():
        print('appliances.json not found at', appl_path)
        return 2

    data = json.loads(appl_path.read_text(encoding='utf-8'))

    mapping: Dict[int, int] = {}
    duplicates: List[Tuple[int, int, int, str]] = []
    skipped: List[Tuple[str, str]] = []

    # Build helper indexes
    gameid_to_obj: Dict[int, dict] = {}
    base_map: Dict[int, int] = {}

    for obj in data:
        if not isinstance(obj, dict):
            continue
        gameid = obj.get('GameID', -1)
        try:
            gameid_int = int(gameid)
        except Exception:
            gameid_int = -1
        if gameid_int != -1:
            gameid_to_obj[gameid_int] = obj

    # First pass: map objects that are canonical (MapGameId == -1) by their GameID -> ID
    for obj in data:
        if not isinstance(obj, dict):
            continue
        put_id = obj.get('ID')
        if put_id is None:
            continue
        try:
            put_id = int(put_id)
        except Exception:
            continue

        mapid = obj.get('MapGameId', -1)
        try:
            mapid_int = int(mapid)
        except Exception:
            mapid_int = -1

        gameid = obj.get('GameID', -1)
        try:
            gameid_int = int(gameid)
        except Exception:
            gameid_int = -1

        if gameid_int == -1:
            continue

        if mapid_int == -1:
            # canonical provider — claim this gameid maps to this PUT id
            if gameid_int in base_map and base_map[gameid_int] != put_id:
                duplicates.append((gameid_int, base_map[gameid_int], put_id, str(obj.get('OriginalFileName', ''))))
                # keep first
                continue
            base_map[gameid_int] = put_id

    # Start mapping with the canonical base_map
    mapping.update(base_map)

    # Second pass: resolve MapGameId targets for duplicates and map their GameID to the target's PUT id
    for obj in data:
        if not isinstance(obj, dict):
            continue
        put_id = obj.get('ID')
        if put_id is None:
            skipped.append(('no ID', str(obj.get('OriginalFileName', ''))))
            continue
        try:
            put_id = int(put_id)
        except Exception:
            skipped.append(('bad ID', str(obj.get('OriginalFileName', ''))))
            continue

        mapid = obj.get('MapGameId', -1)
        try:
            mapid_int = int(mapid)
        except Exception:
            mapid_int = -1

        gameid = obj.get('GameID', -1)
        try:
            gameid_int = int(gameid)
        except Exception:
            gameid_int = -1

        if gameid_int == -1:
            skipped.append(('no gameid', str(obj.get('OriginalFileName', ''))))
            continue

        if mapid_int != -1:
            # try to resolve the target PUT id via base_map or by following MapGameId chains
            target = mapid_int
            visited = set()
            target_put = None
            while True:
                if target in base_map:
                    target_put = base_map[target]
                    break
                if target in gameid_to_obj:
                    nxt = gameid_to_obj[target]
                    try:
                        nxt_map = int(nxt.get('MapGameId', -1))
                    except Exception:
                        nxt_map = -1
                    if nxt_map != -1 and nxt_map not in visited:
                        visited.add(target)
                        target = nxt_map
                        continue
                    # fallback to the object's own ID if present
                    try:
                        nxt_id = int(nxt.get('ID'))
                        target_put = nxt_id
                    except Exception:
                        target_put = None
                    break
                # cannot resolve
                break

            if target_put is None:
                skipped.append(('unresolved map target', str(obj.get('OriginalFileName', ''))))
                continue

            # assign mapping for this object's GameID to the resolved target_put
            key = gameid_int
            if key in mapping and mapping[key] != target_put:
                duplicates.append((key, mapping[key], target_put, str(obj.get('OriginalFileName', ''))))
                continue
            mapping[key] = target_put
        else:
            # already handled as canonical in base_map
            continue

    # Generate C#
    lines: List[str] = []
    lines.append('// Auto-generated by BuildTools/generate_gameid_to_putid.py')
    lines.append('using System.Collections.Generic;')
    lines.append('')
    lines.append('namespace PlateUpTool_Integration')
    lines.append('{')
    lines.append('    public static class GameIdToPutId')
    lines.append('    {')
    lines.append('        public static readonly Dictionary<int, int> Map = new Dictionary<int, int>')
    lines.append('        {')

    for k in sorted(mapping.keys()):
        lines.append(f'            {{ {k}, {mapping[k]} }},')

    lines.append('        };')
    lines.append('')
    lines.append('        /// <summary>')
    lines.append('        /// Returns the PUT `ID` for the provided in-game id, or -1 if no mapping exists.')
    lines.append('        /// </summary>')
    lines.append('        public static int GetPutId(int gameId)')
    lines.append('        {')
    lines.append('            if (Map.TryGetValue(gameId, out var put))')
    lines.append('            {')
    lines.append('                return put;')
    lines.append('            }')
    lines.append('            return -1;')
    lines.append('        }')

    lines.append('    }')
    lines.append('}')
    lines.append('')

    out_path.write_text('\n'.join(lines), encoding='utf-8')

    print(f'Wrote {out_path} with {len(mapping)} entries; {len(duplicates)} duplicate keys; {len(skipped)} skipped entries')
    if duplicates:
        print('Duplicates (kept first):')
        for d in duplicates:
            print(d)
    if skipped:
        print('Skipped examples:')
        for s in skipped[:20]:
            print(s)

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
