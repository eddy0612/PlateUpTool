setlocal enabledelayedexpansion
set src=C:\temp\plateup\originals\1.5.0\Top Snapshot
set dst=..\src\public\res\2D
python update_graphics_2D.py --json ../src/public/res/appliances.json --src "%src%" --log matched_top_snapshot.txt --dst ../src/public/res/2D --dry-run
for /f "tokens=1,2* delims=," %%i in (matched_top_snapshot.txt) do (
    echo %%i %%j
    set LHS=%%i
    set RHS=%%j
    "c:\Program Files\Paint.NET\paintdotnet.exe" "%src%\!LHS:~1! "%dst%\!RHS:~1!

    set /p answer=Overwrite?
    if "!answer!"=="y" copy "%src%\!LHS:~1! "%dst%\!RHS:~1!
    if "!answer!"=="x" goto :EOF
    popd
)