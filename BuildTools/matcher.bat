@echo off
REM Simple batch file to run the matcher utility

if '%1'=='' (
    echo Usage: matcher.bat [json-path] [directory-path]
    echo.
    echo Example:
    echo   matcher.bat res\1.4.0\Appliances.json res\1.4.0\AppliancePicture
    echo.
    exit /b 1
)

node matcher.js %*
