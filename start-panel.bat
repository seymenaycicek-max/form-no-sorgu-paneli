@echo off
title HB Panel - Yerel Sunucu
set "NODE_EXE=%USERPROFILE%\Documents\Codex\tools\node22\node.exe"
set "PORT=3000"
set "HOST=0.0.0.0"
set "MTK_SQL_CONFIG_PATH=%USERPROFILE%\Documents\Codex\2026-06-23\bilgisayar-mda-mtksoft-servis-takip-sql\sql-config.json"
cd /d "%~dp0"

echo.
echo HB Panel yerel sunucu baslatiliyor...
echo.
echo Bu bilgisayardan:
echo   http://localhost:%PORT%/mtk-rapor
echo.
echo Ayni Wi-Fi / agdaki telefonlardan:
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -ExpandProperty IPAddress"') do echo   http://%%i:%PORT%/mtk-rapor
echo.
echo Pencere acik kaldigi surece site calisir. Kapatirsan site durur.
echo.

"%NODE_EXE%" server.js
pause
