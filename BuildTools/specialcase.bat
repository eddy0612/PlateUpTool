@echo off
REM Simple batch file to run the specialcase utility

if '%1'=='' (
    echo Usage: specialcase.bat [json-path] [directory-path]
    echo.
    echo Example:
    echo   specialcase.bat Resources\SpecialCase.json res\1.4.0\AppliancePicture
    echo.
    exit /b 1
)

node specialcase.js %1 %2

