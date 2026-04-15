@echo off
@rem ------------------------------------------------------------------
@rem Shuffle and convert the resources around for local development
@rem ------------------------------------------------------------------
setlocal enabledelayedexpansion
setlocal

set MYPATH=%~dp0
echo Calculated location of code to be : "%MYPATH%"

@rem ------------------------------------------------------------------
@rem Shuffle source around so its runnable
@rem ------------------------------------------------------------------
if exist "%MYPATH%\src\public\res" (
    echo Removing previous public\res directory
    rd "%MYPATH%\src\public\res" /s /q
)
mkdir "%MYPATH%\src\public\res\3D"
mkdir "%MYPATH%\src\public\res\2D"

echo Copying in appliances json file
copy "%MYPATH%\Graphics\appliances.json" "%MYPATH%\src\public\res"

echo Copying in appliances 3D icons
xcopy /q "%MYPATH%\Graphics\3D\*.*" "%MYPATH%\src\public\res\3D\"

rem ------- Temporary for testing
echo Copying in appliances 2D icons
xcopy /q "C:\temp\plateup\2D\2D*" "%MYPATH%\src\public\res\2D\"

endlocal
goto :EOF