#!/usr/bin/env python3
"""
copy_appliances.py

Usage example:
python update_graphics.py \
  --json "..\src\public\res\appliances.json" \
  --src "C:\temp\plateup\originals\1.5.0\1.5.0\AppliancePicture" \
  --dst "..\src\public\res\3D"
"""
import argparse
import json
from pathlib import Path
import shutil
import sys
import hashlib
import typing

def find_source_for_gameid(src_root: Path, gameid: str):
    # Search for first file containing the GameID sequence in its name
    # (keeps the negative sign if present)
    pattern = f"*{gameid}*"
    for p in src_root.rglob(pattern):
        if p.is_file():
            return p
    return None

def main():
    p = argparse.ArgumentParser(description="Copy 3D appliance files by GameID from source tree.")
    p.add_argument("--json", required=True, help="Path to appliances.json")
    p.add_argument("--src", required=True, help="Source root to search for original files")
    p.add_argument("--dst", required=True, help="Destination directory for 3D files")
    p.add_argument("--log", default=None, help="Optional log file path")
    p.add_argument("--dry-run", action="store_true", help="Don't actually copy, just report")
    args = p.parse_args()

    json_path = Path(args.json)
    src_root = Path(args.src)
    dst_root = Path(args.dst)

    if not json_path.exists():
        print(f"ERROR: JSON file not found: {json_path}", file=sys.stderr)
        sys.exit(2)
    if not src_root.exists():
        print(f"ERROR: Source root not found: {src_root}", file=sys.stderr)
        sys.exit(2)
    dst_root.mkdir(parents=True, exist_ok=True)

    log_fp = None
    if args.log:
        log_fp = open(args.log, "w", encoding="utf-8")

    def log(msg, also_print=True):
        if also_print:
            print(msg)
        if log_fp:
            log_fp.write(msg + "\n")

    with open(json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    total = 0
    copied = 0
    missing_source = 0
    missing_dst_after = 0
    skipped_no_3dname = 0
    skipped_skipupdate = 0
    # dry-run specific counters
    new_files = 0
    identical_files = 0
    modified_files = 0
    skipped_identical = 0

    for entry in data:
        if entry.get("Keep") is True:
            total += 1
            if entry.get("SkipUpdate"):
                skipped_skipupdate += 1
                log(f"SKIP_SKIPUPDATE: GameID={entry.get('GameID')} 3DFilename={entry.get('3DFilename')}")
                continue
            gameid = entry.get("GameID")
            dst_name = entry.get("3DFilename")
            if not dst_name:
                skipped_no_3dname += 1
                log(f"SKIP_NO_3DFILENAME: GameID={gameid}", True)
                continue

            # string form of gameid ensures matching negative sign if present
            gameid_str = str(gameid)
            log(f"PROCESS: GameID={gameid_str} -> {dst_name}", True)

            src_file = find_source_for_gameid(src_root, gameid_str)
            if not src_file:
                missing_source += 1
                log(f"SOURCE_NOT_FOUND: GameID={gameid_str}", True)
                continue

            dst_path = dst_root / dst_name

            try:
                # If destination exists, compare contents
                if dst_path.exists():
                    # compare by SHA1
                    def sha1_of(p: Path) -> str:
                        h = hashlib.sha1()
                        with p.open('rb') as fh:
                            for chunk in iter(lambda: fh.read(8192), b''):
                                h.update(chunk)
                        return h.hexdigest()

                    try:
                        src_hash = sha1_of(src_file)
                        dst_hash = sha1_of(dst_path)
                    except Exception as e:
                        log(f"HASH_ERROR: {src_file} or {dst_path} : {e}")
                        src_hash = dst_hash = None

                    if src_hash and dst_hash and src_hash == dst_hash:
                        # identical
                        identical_files += 1
                        skipped_identical += 1
                        log(f"IDENTICAL: {src_file} == {dst_path} (skipped)")
                    else:
                        # different
                        modified_files += 1
                        if not args.dry_run:
                            shutil.copy2(src_file, dst_path)
                            if not dst_path.exists():
                                missing_dst_after += 1
                                log(f"MISSING_AFTER_COPY: {dst_path}", True)
                            else:
                                copied += 1
                                log(f"OVERWRITTEN: {src_file} -> {dst_path}", True)
                        else:
                            log(f"MODIFIED (would overwrite): {src_file} -> {dst_path}")
                else:
                    # destination does not exist
                    new_files += 1
                    if not args.dry_run:
                        shutil.copy2(src_file, dst_path)
                        if not dst_path.exists():
                            missing_dst_after += 1
                            log(f"MISSING_AFTER_COPY: {dst_path}", True)
                        else:
                            copied += 1
                            log(f"COPIED: {src_file} -> {dst_path}", True)
                    else:
                        log(f"NEW (would copy): {src_file} -> {dst_path}")
            except Exception as e:
                log(f"COPY_FAILED: {src_file} -> {dst_path} : {e}", True)

    log("", True)
    if args.dry_run:
        log(f"DRY-RUN SUMMARY: total_keep_true={total} new_files={new_files} identical_files={identical_files} modified_files={modified_files} skipped_no_3dname={skipped_no_3dname}", True)
    log(f"SUMMARY: total_keep_true={total} copied={copied} missing_source={missing_source} missing_dst_after={missing_dst_after} skipped_no_3dname={skipped_no_3dname} skipped_identical={skipped_identical}", True)

    if log_fp:
        log_fp.close()

if __name__ == "__main__":
    main()