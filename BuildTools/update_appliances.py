
import os
import json
import sys

# Accept AppliancePicture directory as a command line argument
if len(sys.argv) < 2:
    print("Usage: python update_appliances.py <AppliancePicture directory>")
    sys.exit(1)

base_dir = sys.argv[1]

# Directories and reasons (relative to base_dir)
update_dirs = [
    (os.path.join(base_dir, 'NoSpace'), False, 'Item does not take space on grid'),
    (os.path.join(base_dir, 'NotNeeded'), False, 'Item is not needed in planner'),
    (os.path.join(base_dir, 'Duplicates'), False, 'Duplicates of others with same icon'),
    (os.path.join(base_dir, 'Cosmetics'), False, 'Cosmetic effect only')
]
# Path to the appliances.json file
appliances_json = r'..\\Graphics\\appliances.json'

def get_png_files(directory):
    if not os.path.exists(directory):
        return set()
    return set(f for f in os.listdir(directory) if f.lower().endswith('.png'))

def update_items(data, filenames, keep_value, reason):
    count = 0
    for obj in data:
        if obj["OriginalFileName"] in filenames:
            changed = False
            if obj["Keep"] != keep_value:
                obj["Keep"] = keep_value
                changed = True
            if obj["Reason"] != reason:
                obj["Reason"] = reason
                changed = True
            if keep_value is False:
                if obj["2DFilename"] != "":
                    obj["2DFilename"] = ""
                    changed = True
                if obj["3DFilename"] != "":
                    obj["3DFilename"] = ""
                    changed = True
            if changed:
                count += 1
    return count


with open(appliances_json, encoding='utf-8') as f:
    data = json.load(f)

total_updated = 0
all_excluded = set()
for dir_path, keep_val, reason in update_dirs:
    files = get_png_files(dir_path)
    updated = update_items(data, files, keep_val, reason)
    all_excluded.update(files)
    print(f"Updated {updated} entries for {dir_path}.")
    total_updated += updated


# Now set Keep: true and restore filenames for anything left in base_dir, or add new entries
base_pngs = set(f for f in os.listdir(base_dir) if f.lower().endswith('.png'))
existing_filenames = set(obj["OriginalFileName"] for obj in data)
remaining = base_pngs - all_excluded
count_restored = 0
added_count = 0

# Find next available 2-character ID
import string
def next_id(existing_ids):
    chars = string.ascii_uppercase
    for i in range(26*26):
        id_ = chars[i // 26] + chars[i % 26]
        if id_ not in existing_ids:
            yield id_
existing_ids = set(obj["ID"] for obj in data)
id_gen = next_id(existing_ids)

for fname in remaining:
    if fname in existing_filenames:
        for obj in data:
            if obj["OriginalFileName"] == fname:
                changed = False
                if obj["Keep"] is not True:
                    obj["Keep"] = True
                    changed = True
                if obj["2DFilename"] != f"2D_{fname}":
                    obj["2DFilename"] = f"2D_{fname}"
                    changed = True
                if obj["3DFilename"] != fname:
                    obj["3DFilename"] = fname
                    changed = True
                if changed:
                    count_restored += 1
    else:
        new_id = next(id_gen)
        new_obj = {
            "OriginalFileName": fname,
            "Keep": True,
            "ID": new_id,
            "3DFilename": fname,
            "2DFilename": f"2D_{fname}",
            "ItemDescription": "",
            "Reason": ""
        }
        data.append(new_obj)
        print(f"Added new entry: {fname} with ID {new_id}")
        added_count += 1
if count_restored:
    print(f"Restored {count_restored} entries to Keep: true in {base_dir}.")
if added_count:
    print(f"Added {added_count} new entries.")

with open(appliances_json, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Total updated entries: {total_updated}")


# Count how many have Keep: true
keep_true_count = sum(1 for obj in data if obj.get("Keep", False))
print(f"Entries remaining with Keep: true: {keep_true_count}")

# List all OriginalFileName values with Keep true and (ItemDescription empty or Reason not empty)
results = []
for obj in data:
    if obj.get("Keep") is True and (obj.get("ItemDescription", "") == "" or obj.get("Reason", "") != ""):
        results.append(obj["OriginalFileName"])

print("\nOriginalFileName values with Keep: true and missing description or non-empty reason:")
for fname in results:
    print(fname)

print(f"\nTotal matching: {len(results)}")

# List all with Keep: true but file not existing in base_dir
missing_files = []
for obj in data:
    if obj.get("Keep") is True and obj["OriginalFileName"] not in base_pngs:
        missing_files.append(obj["OriginalFileName"])
if missing_files:
    print("\nEntries with Keep: true but file not found in base directory:")
    for fname in missing_files:
        print(fname)
    print(f"\nTotal missing files: {len(missing_files)}")
