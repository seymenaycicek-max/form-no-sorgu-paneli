@echo off
title HB Panel - Cloudflare Tunnel
setlocal

set "NODE_EXE=%USERPROFILE%\Documents\Codex\tools\node22\node.exe"
set "CLOUDFLARED_EXE=%USERPROFILE%\Documents\Codex\tools\cloudflared\cloudflared.exe"

set "PORT=3000"
set "HOST=0.0.0.0"

rem ==================================================
rem HB Kalite Kontrol - MySQL
rem ==================================================
set "TEST_DB_HOST=127.0.0.1"
set "TEST_DB_PORT=3306"
set "TEST_DB_USER=root"
set "TEST_DB_PASSWORD="
set "TEST_DB_NAME=hb_kalite_kontrol"

rem ==================================================
rem MTK Servis - Microsoft SQL Server
rem ==================================================
set "MTK_SQL_SERVER=192.168.80.60"
set "MTK_SQL_PORT=1433"
set "MTK_SQL_DATABASE=HbServis"
set "MTK_SQL_USER=mtksoft"
set "MTK_SQL_PASSWORD=mtk.1234"

cd /d "%~dp0"

if not exist "%NODE_EXE%" (
    echo Node bulunamadi:
    echo %NODE_EXE%
    pause
    exit /b 1
)

if not exist "%CLOUDFLARED_EXE%" (
    echo Cloudflared bulunamadi:
    echo %CLOUDFLARED_EXE%
    pause
    exit /b 1
)

echo.
echo HB Panel yerel sunucu aciliyor...
echo.

start "HB Panel Yerel Sunucu" cmd /k ^
"cd /d ""%~dp0"" && ^
set PORT=%PORT%&& ^
set HOST=%HOST%&& ^
set TEST_DB_HOST=%TEST_DB_HOST%&& ^
set TEST_DB_PORT=%TEST_DB_PORT%&& ^
set TEST_DB_USER=%TEST_DB_USER%&& ^
set TEST_DB_PASSWORD=%TEST_DB_PASSWORD%&& ^
set TEST_DB_NAME=%TEST_DB_NAME%&& ^
set MTK_SQL_SERVER=%MTK_SQL_SERVER%&& ^
set MTK_SQL_PORT=%MTK_SQL_PORT%&& ^
set MTK_SQL_DATABASE=%MTK_SQL_DATABASE%&& ^
set MTK_SQL_USER=%MTK_SQL_USER%&& ^
set MTK_SQL_PASSWORD=%MTK_SQL_PASSWORD%&& ^
""%NODE_EXE%"" server.js"

echo Sunucunun hazir olmasi bekleniyor...
timeout /t 4 /nobreak >nul

echo.
echo Cloudflare Tunnel aciliyor...
echo.
echo Ekranda su sekilde bir link cikacak:
echo   https://xxxxx.trycloudflare.com
echo.
echo Disaridan kullanilacak adres:
echo   https://xxxxx.trycloudflare.com/mtk-rapor
echo   https://xxxxx.trycloudflare.com/test
echo   https://xxxxx.trycloudflare.com/test-kayitlari
echo   https://xxxxx.trycloudflare.com/teknisyen-test
echo   https://xxxxx.trycloudflare.com/teknisyen-test-kayitlari
echo.
echo Bu pencere ve yerel sunucu penceresi acik kaldigi surece link calisir.
echo Kapatirsan site disaridan kapanir.
echo.

"%CLOUDFLARED_EXE%" tunnel --url http://localhost:%PORT%

pause