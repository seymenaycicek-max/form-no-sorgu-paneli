@echo off
title HB Kalite Kontrol - JSON Kayitlarini MySQL'e Aktar
setlocal

set "NODE_EXE=%USERPROFILE%\Documents\Codex\tools\node22\node.exe"
set "TEST_DB_HOST=127.0.0.1"
set "TEST_DB_PORT=3306"
set "TEST_DB_USER=root"
set "TEST_DB_PASSWORD="
set "TEST_DB_NAME=hb_kalite_kontrol"

cd /d "%~dp0"

if not exist "%NODE_EXE%" (
  echo Node bulunamadi:
  echo %NODE_EXE%
  pause
  exit /b 1
)

echo.
echo JSON test kayitlari MySQL'e aktariliyor...
echo MySQL XAMPP uzerinde acik olmali.
echo.

"%NODE_EXE%" scripts\migrate-test-records-json-to-mysql.js

echo.
pause
