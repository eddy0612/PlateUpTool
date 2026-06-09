#!/usr/bin/env python3
"""Compare ids.log with appliances.json and produce a Markdown report.

Usage:
  python BuildTools/compare_ids.py --ids-log ../ids.log \
      --appliances ../src/public/res/appliances.json \
      --out BuildTools/report_ids_vs_appliances.md
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List


def load_appliances(path: Path) -> (Dict[int, List[dict]], List[dict]):
    data = json.loads(path.read_text(encoding="utf-8"))
    index: Dict[int, List[dict]] = {}
    for item in data:
        for key in ("GameID", "MapGameId"):
            val = item.get(key)
            if val is None:
                continue
            try:
                ival = int(val)
            except Exception:
                continue
            if ival == -1:
                continue
            index.setdefault(ival, []).append(item)
    return index, data


def parse_ids_log(path: Path) -> Dict[int, dict]:
    id_re = re.compile(r"ID=(-?\d+)")
    name_re = re.compile(r"Name=(.*?)(?:\s+Description=|$)")
    desc_re = re.compile(r"Description=(.*)$")
    mapping: Dict[int, dict] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        m_id = id_re.search(line)
        if not m_id:
            # fallback: find any number on the line
            continue
        try:
            ival = int(m_id.group(1))
        except Exception:
            continue

        name = ""
        desc = ""
        m_name = name_re.search(line)
        if m_name:
            name = m_name.group(1).strip().strip('"')
        m_desc = desc_re.search(line)
        if m_desc:
            desc = m_desc.group(1).strip().strip('"')

        mapping.setdefault(ival, {"name": name, "desc": desc, "raw": line})
    return mapping


def render_entry(item: dict) -> str:
    parts = []
    if "OriginalFileName" in item:
        parts.append(item.get("OriginalFileName"))
    if item.get("ItemDescription"):
        parts.append(item.get("ItemDescription"))
    parts.append(f"GameID={item.get('GameID')}")
    parts.append(f"MapGameId={item.get('MapGameId')}")
    return " — ".join(str(p) for p in parts if p)


def make_report(ids_log_map: Dict[int, dict], appliances_index: Dict[int, List[dict]], appliances_items: List[dict]) -> str:
    ids_in_log = set(ids_log_map.keys())
    ids_in_json = set(appliances_index.keys())

    matched = sorted(ids_in_log & ids_in_json)
    only_in_log_raw = sorted(ids_in_log - ids_in_json)
    # exclude ids that have no name and no description from the "only in ids.log" table
    only_in_log = [i for i in only_in_log_raw if ids_log_map.get(i, {}).get("name") or ids_log_map.get(i, {}).get("desc")]
    only_in_json = sorted(ids_in_json - ids_in_log)

    # Build an undirected graph of GameID <-> MapGameId links (ignore -1)
    adj: Dict[int, set] = {}
    for item in appliances_items:
        try:
            g = int(item.get("GameID"))
        except Exception:
            continue
        m = int(item.get("MapGameId") or -1)
        if m == -1:
            continue
        adj.setdefault(g, set()).add(m)
        adj.setdefault(m, set()).add(g)

    # find all json ids reachable from any id in ids_in_log
    covered: set = set()
    for start in ids_in_log:
        if start not in adj:
            continue
        stack = [start]
        seen = set([start])
        while stack:
            cur = stack.pop()
            covered.add(cur)
            for nb in adj.get(cur, ()):
                if nb not in seen:
                    seen.add(nb)
                    stack.append(nb)

    # exclude ids that are reachable from ids.log entries
    only_in_json = [i for i in only_in_json if i not in covered]

    lines: List[str] = []
    lines.append("# ids.log vs appliances.json Report\n")
    lines.append(f"- Total ids in ids.log: {len(ids_in_log)}")
    lines.append(f"- Total ids mapped from appliances.json: {len(ids_in_json)}")
    lines.append(f"- Matches: {len(matched)}")
    lines.append(f"- Only in ids.log: {len(only_in_log)}")
    lines.append(f"- Only in appliances.json: {len(only_in_json)}\n")

    lines.append("## Matched IDs\n")
    if matched:
        lines.append("| ID | name | description | appliances.json entries |\n|---:|---|---|---|")
        for i in matched:
            entry = ids_log_map.get(i, {"name": "", "desc": "", "raw": ""})
            name = entry.get("name", "")
            desc = entry.get("desc", "")
            entries = appliances_index.get(i, [])
            descr = "<br>".join(render_entry(e) for e in entries)
            lines.append(f"| {i} | {name} | {desc} | {descr} |")
    else:
        lines.append("(none)\n")

    lines.append("\n## IDs only in ids.log\n")
    if only_in_log:
        lines.append("| ID | name | description |\n|---:|---|---|")
        for i in only_in_log:
            entry = ids_log_map.get(i, {"name": "", "desc": "", "raw": ""})
            lines.append(f"| {i} | {entry.get('name','')} | {entry.get('desc','')} |")
    else:
        lines.append("(none)\n")

    # IDs that have no name and no description in ids.log
    lines.append("\n## IDs in ids.log with no name and no description\n")
    # limit the no-name/desc section to ids that actually appear in ids.log
    no_name_desc = [i for i, v in ids_log_map.items() if not v.get("name") and not v.get("desc")]
    if no_name_desc:
        lines.append("| ID | raw line |\n|---:|---|")
        for i in sorted(no_name_desc):
            lines.append(f"| {i} | {ids_log_map.get(i,{}).get('raw','')} |")
    else:
        lines.append("(none)\n")

    lines.append("\n## IDs only in appliances.json\n")
    if only_in_json:
        lines.append("| ID | appliances.json entries |\n|---:|---|")
        for i in only_in_json:
            entries = appliances_index.get(i, [])
            descr = "<br>".join(render_entry(e) for e in entries)
            lines.append(f"| {i} | {descr} |")
    else:
        lines.append("(none)\n")

    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids-log", type=Path, default=Path("../ids.log"))
    ap.add_argument(
        "--appliances",
        type=Path,
        default=Path("src/public/res/appliances.json"),
    )
    ap.add_argument("--out", type=Path, default=Path("BuildTools/report_ids_vs_appliances.md"))
    args = ap.parse_args()

    ids_log_path = args.ids_log
    appliances_path = args.appliances

    if not ids_log_path.exists():
        print(f"ids.log not found at: {ids_log_path}")
        return
    if not appliances_path.exists():
        print(f"appliances.json not found at: {appliances_path}")
        return

    appliances_index, appliances_items = load_appliances(appliances_path)
    ids_map = parse_ids_log(ids_log_path)

    report = make_report(ids_map, appliances_index, appliances_items)
    out_path = args.out
    out_path.write_text(report, encoding="utf-8")
    print(f"Wrote report to {out_path}")


if __name__ == "__main__":
    main()
