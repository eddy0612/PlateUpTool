# Asset Consistency Report

Source data checked:

- `Graphics/appliances.json`
- `src/public/res/3D`
- `src/public/res/2D`

## 3D files with no matching 2D file

Expected 2D filename format: `2D_` + 3D filename.

- `BigCakeTin-933861469-Provider.png`
- `BrownieTray-122760125-Provider.png`
- `Buffet--773196462.png`
- `Chair--1979922052.png`
- `CookieTray--622622812-Provider.png`
- `CupcakeTray-723989167-Provider.png`
- `DoughnutTray--329134625-Provider.png`
- `HamSliced-164425076-Provider.png`
- `LasagnePastaSheet-1521319349-Provider.png`
- `LasagneTray--2080052245-Provider.png`
- `LeftoverBags--940358190.png`
- `Mince--2047874552-Provider.png`
- `MixingBowlMixed-906595973-Provider.png`
- `Pickle-1384381531-Provider.png`
- `Spaghetti--823534126-Provider.png`
- `SundaeGlass-1116040881-Provider.png`
- `SundaeSyrupChocolate-2105393112-Provider.png`
- `SundaeSyrupStrawberry--764053970-Provider.png`
- `TacoTray--1190642520-Provider.png`

## 2D files with no matching 3D file

Expected 3D filename format: 2D filename without the leading `2D_` prefix.

None.

## keep:true JSON objects with missing or blank file references

These are entries where `Keep` is `true` and either the 2D filename is blank or missing from `src/public/res/2D`, or the 3D filename is blank or missing from `src/public/res/3D`.

No entries had blank `2DFilename` or blank `3DFilename`.
No entries had missing 3D files.

| ID | OriginalFileName | 2DFilename | 3DFilename | Issue |
| --- | --- | --- | --- | --- |
| 14 | `BigCakeTin-933861469-Provider.png` | `2D_BigCakeTin-933861469-Provider.png` | `BigCakeTin-933861469-Provider.png` | `2D_MISSING` |
| 31 | `BrownieTray-122760125-Provider.png` | `2D_BrownieTray-122760125-Provider.png` | `BrownieTray-122760125-Provider.png` | `2D_MISSING` |
| 33 | `Buffet--773196462.png` | `2D_Buffet--773196462.png` | `Buffet--773196462.png` | `2D_MISSING` |
| 49 | `Chair--1979922052.png` | `2D_Chair--1979922052.png` | `Chair--1979922052.png` | `2D_MISSING` |
| 79 | `CookieTray--622622812-Provider.png` | `2D_CookieTray--622622812-Provider.png` | `CookieTray--622622812-Provider.png` | `2D_MISSING` |
| 91 | `CupcakeTray-723989167-Provider.png` | `2D_CupcakeTray-723989167-Provider.png` | `CupcakeTray-723989167-Provider.png` | `2D_MISSING` |
| 105 | `DoughnutTray--329134625-Provider.png` | `2D_DoughnutTray--329134625-Provider.png` | `DoughnutTray--329134625-Provider.png` | `2D_MISSING` |
| 157 | `HamSliced-164425076-Provider.png` | `2D_HamSliced-164425076-Provider.png` | `HamSliced-164425076-Provider.png` | `2D_MISSING` |
| 179 | `LasagnePastaSheet-1521319349-Provider.png` | `2D_LasagnePastaSheet-1521319349-Provider.png` | `LasagnePastaSheet-1521319349-Provider.png` | `2D_MISSING` |
| 181 | `LasagneTray--2080052245-Provider.png` | `2D_LasagneTray--2080052245-Provider.png` | `LasagneTray--2080052245-Provider.png` | `2D_MISSING` |
| 183 | `LeftoverBags--940358190.png` | `2D_LeftoverBags--940358190.png` | `LeftoverBags--940358190.png` | `2D_MISSING` |
| 208 | `Mince--2047874552-Provider.png` | `2D_Mince--2047874552-Provider.png` | `Mince--2047874552-Provider.png` | `2D_MISSING` |
| 211 | `MixingBowlMixed-906595973-Provider.png` | `2D_MixingBowlMixed-906595973-Provider.png` | `MixingBowlMixed-906595973-Provider.png` | `2D_MISSING` |
| 236 | `Pickle-1384381531-Provider.png` | `2D_Pickle-1384381531-Provider.png` | `Pickle-1384381531-Provider.png` | `2D_MISSING` |
| 284 | `Spaghetti--823534126-Provider.png` | `2D_Spaghetti--823534126-Provider.png` | `Spaghetti--823534126-Provider.png` | `2D_MISSING` |
| 298 | `SundaeGlass-1116040881-Provider.png` | `2D_SundaeGlass-1116040881-Provider.png` | `SundaeGlass-1116040881-Provider.png` | `2D_MISSING` |
| 300 | `SundaeSyrupChocolate-2105393112-Provider.png` | `2D_SundaeSyrupChocolate-2105393112-Provider.png` | `SundaeSyrupChocolate-2105393112-Provider.png` | `2D_MISSING` |
| 301 | `SundaeSyrupStrawberry--764053970-Provider.png` | `2D_SundaeSyrupStrawberry--764053970-Provider.png` | `SundaeSyrupStrawberry--764053970-Provider.png` | `2D_MISSING` |
| 307 | `TacoTray--1190642520-Provider.png` | `2D_TacoTray--1190642520-Provider.png` | `TacoTray--1190642520-Provider.png` | `2D_MISSING` |
