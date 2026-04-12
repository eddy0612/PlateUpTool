@echo off
@rem ------------------------------------------------------------------
@rem Shuffle and convert the resources around for local development
@rem ------------------------------------------------------------------
setlocal enabledelayedexpansion
setlocal

set MYPATH=%~dp0
echo Calculated location of code to be : "%MYPATH%"

@rem ------------------------------------------------------------------
@rem Rextract resources
@rem ------------------------------------------------------------------
for %%i in (%MYPATH%\Resources\*.zip) do set PU_RESOURCE_FILE=%%i
echo Calculated location of resources  : "%PU_RESOURCE_FILE%"

set PU_EXPANDED_RESOURCES=%MYPATH%\Resources\expanded_res
if not exist "%PU_EXPANDED_RESOURCES%" (
    md "%PU_EXPANDED_RESOURCES%"
    echo Expanding provided resources, please wait
    powershell -Command "&{Expand-Archive -Path \"!PU_RESOURCE_FILE!\" -DestinationPath \"!PU_EXPANDED_RESOURCES!\" -Force}"
)
for /d %%i in (%PU_EXPANDED_RESOURCES%\*) do set PU_ACTUAL_FILES=%%i
echo PlateUp provided files are in     : %PU_ACTUAL_FILES%

echo Ensuring csvtojson is available
call npm install csvtojson

echo Converting Appliances
pushd "%MYPATH%\node_modules\csvtojson\bin"
call .\csvtojson parse --output json "%PU_ACTUAL_FILES%/Appliances.txt" > "%PU_ACTUAL_FILES%/Appliances.json"
popd

echo Removing all providers
del %PU_ACTUAL_FILES%\AppliancePicture\*Provider*

echo Processing special case issues
pushd %MYPATH%\BuildTools
call specialcase "%MYPATH%\Resources\SpecialCase.json" "%PU_ACTUAL_FILES%"
popd

@rem ------------------------------------------------------------------
@rem Check we have everything we need, and product an updated json
@rem ------------------------------------------------------------------
if exist "%MYPATH%\src\public\res" rd "%MYPATH%\src\public\res" /s /q
mkdir "%MYPATH%\src\public\res\AppliancePicture"

pushd %MYPATH%\BuildTools
call matcher.bat "%PU_ACTUAL_FILES%\Appliances.json" "%PU_ACTUAL_FILES%\AppliancePicture" "%MYPATH%\src\public\res\AppliancePicture"
popd
copy "%PU_ACTUAL_FILES%\ApplianceMap.json" "%MYPATH%\src\public\res"

rem ------- Temporary for testing
xcopy %MYPATH%\..\PlateUpTool_images_backup\output\2D* "%MYPATH%\src\public\res\AppliancePicture"

endlocal
goto :EOF