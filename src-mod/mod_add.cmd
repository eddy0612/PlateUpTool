@echo off

set destdir=C:\Program Files (x86)\Steam\steamapps\common\PlateUp\PlateUp\Mods\PlateUpTool_Integration
if exist "%destdir%" rd "%destdir%" /s /q
mkdir "%destdir%"
copy "PlateUpTool_Integration\bin\Release\PlateUpTool_Integration.dll" "%destdir%"
