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
for %%i in (%MYPATH%\Resources\*.zip) do set PURESOURCES=%%i
echo Calculated location of resources  : "%PURESOURCES%"

set PUEXPRES=%MYPATH%\res
if not exist "%PUEXPRES%" (
    md "%PUEXPRES%"
    echo Expanding provided resources, please wait
    powershell -Command "&{Expand-Archive -Path \"!PURESOURCES!\" -DestinationPath \"!PUEXPRES!\" -Force}"
)
for /d %%i in (%PUEXPRES%\*) do set PUFILES=%%i
echo PlateUp provided files are in     : %PUFILES%

echo Ensuring csvtojson is available
call npm install csvtojson

echo Converting Appliances
pushd "%MYPATH%\node_modules\csvtojson\bin"
call .\csvtojson parse --output json "%PUFILES%/Appliances.txt" > "%PUFILES%/Appliances.json"
popd

echo Removing all providers
del %PUFILES%\AppliancePicture\*Provider*

echo Processing special case issues
pushd %MYPATH%\BuildTools
call specialcase "%MYPATH%\Resources\SpecialCase.json" "%PUFILES%"
popd

@rem ------------------------------------------------------------------
@rem Check we have everything we need, and product an updated json
@rem ------------------------------------------------------------------
pushd %MYPATH%\BuildTools
call matcher.bat "%PUFILES%\Appliances.json" "%PUFILES%\AppliancePicture"
popd

rd src\public /s /q
xcopy %PUFILES% src\public\res\ /s /e /y

echo Done...
endlocal
goto :EOF