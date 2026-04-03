@echo off
setlocal
cd /d "%~dp0src"
echo Installing dependencies (if needed)...
call npm install

echo Starting Vite from src
call npm run dev
endlocal
