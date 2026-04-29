@echo off
setlocal

rem Build and run production preview (build happens in src so dist ends up at src/dist)
cd /d "%~dp0src"
echo Installing dependencies (if needed)...
call npm install

echo Building production bundle...
call npm run build

rem Return to repo root and start the preview server
cd /d "%~dp0"
echo Starting production preview server (serve-dist.cjs)...
echo Ensuring express is installed for the preview server...
cd /d "%~dp0"
call npm install express --no-save

echo Starting production preview server (serve-dist.cjs)...
node BuildTools\serve-dist.cjs
endlocal
