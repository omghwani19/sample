@echo off
setlocal
set "GAT_APP_ROOT=%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js가 설치되어 있지 않습니다. Node.js 18 이상을 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=$env:GAT_APP_ROOT; $server=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue; if (-not $server) { Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' -WorkingDirectory $root -WindowStyle Minimized }; Start-Sleep -Seconds 2; Start-Process 'http://localhost:4173'"

endlocal
