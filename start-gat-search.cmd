@echo off
setlocal
set "GAT_APP_ROOT=%~dp0"
set "GAT_APP_PORT=4173"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root=$env:GAT_APP_ROOT; $port=[int]$env:GAT_APP_PORT; $isOpen=$false; " ^
  "try { $client=[Net.Sockets.TcpClient]::new(); $task=$client.ConnectAsync('127.0.0.1',$port); $isOpen=$task.Wait(700) -and $client.Connected; $client.Close() } catch { $isOpen=$false }; " ^
  "if (-not $isOpen) { " ^
  "  $out=Join-Path $root 'reports\server-out.log'; $err=Join-Path $root 'reports\server-err.log'; New-Item -ItemType Directory -Force -Path (Join-Path $root 'reports') | Out-Null; " ^
  "  Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err; " ^
  "  Start-Sleep -Seconds 2; " ^
  "}; " ^
  "Start-Process ('http://localhost:' + $port)"

endlocal
