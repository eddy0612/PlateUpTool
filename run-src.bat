@echo off
setlocal
cd /d "%~dp0src"
echo Installing dependencies (if needed)...
call npm install

echo Starting Vite from src (listening on all interfaces)
call npm run dev -- --host
endlocal
