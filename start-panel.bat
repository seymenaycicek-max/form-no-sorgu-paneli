@echo off
set "NODE_EXE=%USERPROFILE%\Documents\Codex\tools\node22\node.exe"
cd /d "%~dp0"
"%NODE_EXE%" server.js
pause
