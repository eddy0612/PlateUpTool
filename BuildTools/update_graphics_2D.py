#!/usr/bin/env python3
"""Update the 2D graphics from a new data dump

Usage:
  python update_graphics_2D.py \
    --json ../src/public/res/appliances.json \
    --src "C:\\temp\\plateup\\originals\\1.5.0\\Top Snapshot" \
    --log matched_top_snapshot.txt \
    --dst ../src/public/res/2D
    --dry-run
"""
import argparse
import filecmp
import json
import shutil
from pathlib import Path
import sys


def load_entries(json_path: Path):
    """Load JSON and return (keep_true_map, nonkeep_map, mapgameid_to_nonkeep, candidate_gameids).

    - keep_true_map: GameID(str) -> entry dict for Keep==True and not SkipUpdate
    - nonkeep_map: GameID(str) -> entry dict for Keep!=True
    - mapgameid_to_nonkeep: MapGameId(str) -> list of non-keep GameID(str)
    - candidate_gameids: set of all GameID strings present in the JSON
    """
    with json_path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    keep_true_map = {}
    nonkeep_map = {}
    mapgameid_to_nonkeep = {}
    candidate_gameids = set()

    for entry in data:
        gid = entry.get("GameID")
        if gid is None:
            continue
        gid_s = str(gid)
        candidate_gameids.add(gid_s)
        if entry.get("Keep") is True:
            if entry.get("SkipUpdate2D"):
                continue
            keep_true_map[gid_s] = entry
        else:
            nonkeep_map[gid_s] = entry
            map_to = entry.get("MapGameId")
            if map_to is not None:
                map_to_s = str(map_to)
                mapgameid_to_nonkeep.setdefault(map_to_s, []).append(gid_s)

    return keep_true_map, nonkeep_map, mapgameid_to_nonkeep, candidate_gameids


def find_gameid_for_filename(fname: str, candidate_gameids: set):
    """Return matching GameID string for filename, or None.

    Checks the first token, then any GameID that the filename starts with.
    Longer IDs are checked first to avoid short-prefix collisions.
    """
    base = fname
    if not base:
        return None
    first = base.split()[0]
    if first in candidate_gameids:
        return first
    for gid in sorted(candidate_gameids, key=len, reverse=True):
        if base.startswith(gid):
            return gid
    return None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--json", default="src/public/res/appliances.json", help="Path to appliances.json")
    p.add_argument("--src", default=r"C:\\temp\\plateup\\originals\\1.5.0\\Top Snapshot", help="Source Top Snapshot folder")
    p.add_argument("--log", default="matched_top_snapshot.txt", help="Output filename to write in workspace root")
    p.add_argument("--dst", help="Destination directory to copy matched source files into")
    p.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    p.add_argument("--full-path", action="store_true", help="Write full paths instead of basenames")
    args = p.parse_args()

    json_path = Path(args.json)
    src_root = Path(args.src)
    log_path = Path(args.log)
    dst_root = Path(args.dst) if args.dst else None
    dry_run = bool(args.dry_run)

    if not json_path.exists():
        print(f"ERROR: appliances.json not found: {json_path}", file=sys.stderr)
        sys.exit(2)
    if not src_root.exists():
        print(f"ERROR: source folder not found: {src_root}", file=sys.stderr)
        sys.exit(2)

    keep_true_map, nonkeep_map, mapgameid_to_nonkeep, candidate_gameids = load_entries(json_path)
    if not keep_true_map:
        print("No GameIDs found with Keep=true in the JSON.")

    # Build mapping of GameID -> first matching source Path
    file_gameid_map = {}
    for pth in src_root.iterdir():
        if not pth.is_file():
            continue
        name = pth.name
        gid = find_gameid_for_filename(name, candidate_gameids)
        if gid and gid not in file_gameid_map:
            file_gameid_map[gid] = pth

    matches = []
    for keep_gid, entry in keep_true_map.items():
        two_d = entry.get("2DFilename", "") or ""
        matched_pth = None
        # direct match
        if keep_gid in file_gameid_map:
            matched_pth = file_gameid_map[keep_gid]
        else:
            # fallback: check non-keep entries that map to this keep_gid
            for alt_gid in mapgameid_to_nonkeep.get(keep_gid, []):
                if alt_gid in file_gameid_map:
                    matched_pth = file_gameid_map[alt_gid]
                    break

        if matched_pth:
            matches.append((matched_pth, two_d))

    # sort by filename (case-insensitive)
    matches.sort(key=lambda t: (t[0].name.lower()))

    # Ensure destination directory exists if we'll copy
    if dst_root and not dry_run:
        dst_root.mkdir(parents=True, exist_ok=True)

    with log_path.open("w", encoding="utf-8") as fh:
        for src_pth, two_d in matches:
            # if destination is set, determine destination path and whether we should skip
            will_write = True
            dest_pth = None
            if dst_root:
                dest_name = two_d if two_d else src_pth.name
                dest_pth = dst_root / dest_name
                if dest_pth.exists():
                    try:
                        same = filecmp.cmp(src_pth, dest_pth, shallow=False)
                    except Exception:
                        same = False
                    if same:
                        # skip writing this entry since destination already identical
                        print(f"Skipping identical: {src_pth} -> {dest_pth}")
                        will_write = False

            if not will_write:
                continue

            left = str(src_pth) if args.full_path else src_pth.name
            fh.write(f'"{left}","{two_d}"\n')

            # perform copy if requested
            if dst_root:
                if dry_run:
                    print(f"Would copy: {src_pth} -> {dest_pth}")
                else:
                    shutil.copy2(src_pth, dest_pth)
                    print(f"Copied: {src_pth} -> {dest_pth}")

    print(f"Wrote {len(matches)} entries to {log_path}")


if __name__ == "__main__":
    main()
