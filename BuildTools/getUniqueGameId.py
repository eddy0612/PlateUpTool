#!/usr/bin/env python3
"""
Compute the PlateUp appliance hash for a given UniqueNameID.

Replicates KitchenLib's StringUtils.GetInt32HashCode applied to
"{MOD_ID}:{UniqueNameID}", which is what BaseMod.GetHash() returns.

Usage:
    python BuildTools/getUniqueGameId.py SomeName
    python BuildTools/getUniqueGameId.py "My Appliance Name"
"""
import sys
import hashlib
import struct

MOD_ID = "com.eddy0612.plateuptool"


def get_unique_game_id(unique_name_id: str) -> int:
    s = f"{MOD_ID}:{unique_name_id}"
    # C# Encoding.Unicode = UTF-16 little-endian, no BOM
    data = s.encode("utf-16-le")
    digest = hashlib.sha256(data).digest()
    n1 = struct.unpack_from("<I", digest,  0)[0]
    n2 = struct.unpack_from("<I", digest,  8)[0]
    n3 = struct.unpack_from("<I", digest, 16)[0]
    n4 = n1 ^ n2 ^ n3
    unsigned = (0xFFFFFFFF - n4) & 0xFFFFFFFF
    # Reinterpret as signed Int32 (same as C# BitConverter.ToInt32)
    return struct.unpack("<i", struct.pack("<I", unsigned))[0]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: python getUniqueGameId.py <UniqueNameID>")
        print(f"  ModID is fixed as: {MOD_ID}")
        sys.exit(1)

    name = sys.argv[1]
    result = get_unique_game_id(name)
    print(f"{result}")
