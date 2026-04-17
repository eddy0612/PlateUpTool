import argparse
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_JSON_PATH = REPO_ROOT / "Graphics" / "appliances.json"
DEFAULT_3D_DIR = REPO_ROOT / "src" / "public" / "res" / "3D"
DEFAULT_2D_DIR = REPO_ROOT / "src" / "public" / "res" / "2D"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "asset-consistency-report.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a markdown asset consistency report for 2D/3D appliance assets."
    )
    parser.add_argument(
        "--json",
        dest="json_path",
        type=Path,
        default=DEFAULT_JSON_PATH,
        help=f"Path to appliances.json (default: {DEFAULT_JSON_PATH})",
    )
    parser.add_argument(
        "--dir3d",
        dest="dir_3d",
        type=Path,
        default=DEFAULT_3D_DIR,
        help=f"Path to the 3D asset directory (default: {DEFAULT_3D_DIR})",
    )
    parser.add_argument(
        "--dir2d",
        dest="dir_2d",
        type=Path,
        default=DEFAULT_2D_DIR,
        help=f"Path to the 2D asset directory (default: {DEFAULT_2D_DIR})",
    )
    parser.add_argument(
        "--output",
        dest="output_path",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help=f"Path to the markdown report to write (default: {DEFAULT_OUTPUT_PATH})",
    )
    return parser.parse_args()


def get_png_filenames(directory: Path) -> set[str]:
    if not directory.is_dir():
        raise FileNotFoundError(f"Directory not found: {directory}")
    return {path.name for path in directory.iterdir() if path.is_file() and path.suffix.lower() == ".png"}


def load_appliances(json_path: Path) -> list[dict]:
    if not json_path.is_file():
        raise FileNotFoundError(f"JSON file not found: {json_path}")
    with json_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def find_missing_2d_files(files_3d: set[str], files_2d: set[str]) -> list[str]:
    return sorted(filename for filename in files_3d if f"2D_{filename}" not in files_2d)


def find_missing_3d_files(files_2d: set[str], files_3d: set[str]) -> list[str]:
    missing = []
    for filename in sorted(files_2d):
        if not filename.startswith("2D_"):
            missing.append(filename)
            continue
        expected_3d_name = filename[3:]
        if expected_3d_name not in files_3d:
            missing.append(filename)
    return missing


def build_keep_true_issues(appliances: list[dict], files_2d: set[str], files_3d: set[str]) -> list[dict]:
    issues = []
    for item in appliances:
        if item.get("Keep") is not True:
            continue

        issue_parts = []
        filename_2d = item.get("2DFilename", "")
        filename_3d = item.get("3DFilename", "")

        if not filename_2d:
            issue_parts.append("2D_BLANK")
        elif filename_2d not in files_2d:
            issue_parts.append("2D_MISSING")

        if not filename_3d:
            issue_parts.append("3D_BLANK")
        elif filename_3d not in files_3d:
            issue_parts.append("3D_MISSING")

        if issue_parts:
            issues.append(
                {
                    "ID": item.get("ID"),
                    "OriginalFileName": item.get("OriginalFileName", ""),
                    "2DFilename": filename_2d,
                    "3DFilename": filename_3d,
                    "Issue": "+".join(issue_parts),
                }
            )

    return sorted(issues, key=lambda item: item["ID"])


def build_notes(missing_2d_files: list[str], missing_3d_files: list[str]) -> list[str]:
    notes = []

    missing_2d_set = {f"2D_{name}" for name in missing_2d_files}
    for filename in missing_3d_files:
        if not filename.endswith(".png.png"):
            continue
        trimmed_name = filename[:-4]
        if trimmed_name in missing_2d_set:
            notes.append(
                f"`{filename}` exists in the 2D folder with an extra `.png` extension, "
                f"so it does not satisfy the expected filename `{trimmed_name}`."
            )

    return notes


def render_markdown(
    missing_2d_files: list[str],
    missing_3d_files: list[str],
    keep_true_issues: list[dict],
    notes: list[str],
) -> str:
    lines = [
        "# Asset Consistency Report",
        "",
        "Source data checked:",
        "",
        "- `Graphics/appliances.json`",
        "- `src/public/res/3D`",
        "- `src/public/res/2D`",
        "",
        "## 3D files with no matching 2D file",
        "",
        "Expected 2D filename format: `2D_` + 3D filename.",
        "",
    ]

    if missing_2d_files:
        lines.extend(f"- `{filename}`" for filename in missing_2d_files)
    else:
        lines.append("None.")

    lines.extend(
        [
            "",
            "## 2D files with no matching 3D file",
            "",
            "Expected 3D filename format: 2D filename without the leading `2D_` prefix.",
            "",
        ]
    )

    if missing_3d_files:
        lines.extend(f"- `{filename}`" for filename in missing_3d_files)
    else:
        lines.append("None.")

    lines.extend(
        [
            "",
            "## keep:true JSON objects with missing or blank file references",
            "",
            "These are entries where `Keep` is `true` and either the 2D filename is blank or missing from `src/public/res/2D`, or the 3D filename is blank or missing from `src/public/res/3D`.",
            "",
        ]
    )

    blank_2d = any("2D_BLANK" in item["Issue"] for item in keep_true_issues)
    blank_3d = any("3D_BLANK" in item["Issue"] for item in keep_true_issues)
    missing_3d = any("3D_MISSING" in item["Issue"] for item in keep_true_issues)

    if not blank_2d:
        lines.append("No entries had blank `2DFilename` or blank `3DFilename`." if not blank_3d else "No entries had blank `2DFilename`.")
    elif not blank_3d:
        lines.append("No entries had blank `3DFilename`.")

    if not missing_3d:
        lines.append("No entries had missing 3D files.")

    lines.append("")

    if keep_true_issues:
        lines.extend(
            [
                "| ID | OriginalFileName | 2DFilename | 3DFilename | Issue |",
                "| --- | --- | --- | --- | --- |",
            ]
        )
        for item in keep_true_issues:
            lines.append(
                "| {ID} | `{OriginalFileName}` | `{2DFilename}` | `{3DFilename}` | `{Issue}` |".format(**item)
            )
    else:
        lines.append("No keep:true entries have blank or missing file references.")

    if notes:
        lines.append("")
        for note in notes:
            lines.append(f"Note: {note}")

    lines.append("")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()

    appliances = load_appliances(args.json_path)
    files_3d = get_png_filenames(args.dir_3d)
    files_2d = get_png_filenames(args.dir_2d)

    missing_2d_files = find_missing_2d_files(files_3d, files_2d)
    missing_3d_files = find_missing_3d_files(files_2d, files_3d)
    keep_true_issues = build_keep_true_issues(appliances, files_2d, files_3d)
    notes = build_notes(missing_2d_files, missing_3d_files)

    report = render_markdown(missing_2d_files, missing_3d_files, keep_true_issues, notes)

    args.output_path.parent.mkdir(parents=True, exist_ok=True)
    with args.output_path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(report)

    print(f"Wrote report to {args.output_path}")
    print(f"3D files missing 2D partner: {len(missing_2d_files)}")
    print(f"2D files missing 3D partner: {len(missing_3d_files)}")
    print(f"Keep=true entries with issues: {len(keep_true_issues)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())