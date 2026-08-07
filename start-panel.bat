@echo off
title HB Panel - Yerel Sunucu
set "NODE_EXE=%USERPROFILE%\Documents\Codex\tools\node22\node.exe"
set "PORT=3000"
set "HOST=0.0.0.0"
set "TEST_DB_HOST=127.0.0.1"
set "TEST_DB_PORT=3306"
set "TEST_DB_USER=root"
set "TEST_DB_PASSWORD="
set "TEST_DB_NAME=hb_kalite_kontrol"
set "MTK_SQL_CONFIG_PATH=%USERPROFILE%\Documents\Codex\2026-06-23\bilgisayar-mda-mtksoft-servis-takip-sql\sql-config.json"
cd /d "%~dp0"

echo.
echo HB Panel yerel sunucu baslatiliyor...
echo.
echo Bu bilgisayardan:
echo   http://localhost:%PORT%/mtk-rapor
echo   http://localhost:%PORT%/test
echo   http://localhost:%PORT%/test-kayitlari
echo.
echo Ayni Wi-Fi / agdaki telefonlardan:
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -ExpandProperty IPAddress"') do (
  echo   http://%%i:%PORT%/mtk-rapor
  echo   http://%%i:%PORT%/test
  echo   http://%%i:%PORT%/test-kayitlari
)
echo.
echo Pencere acik kaldigi surece site calisir. Kapatirsan site durur.
echo.

"%NODE_EXE%" server.js
pause
