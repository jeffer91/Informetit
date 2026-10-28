@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "node_modules\electron" (
  echo Preparando Informetit Electron por primera vez...
  call npm install
  if errorlevel 1 (echo ERROR: no se pudieron instalar las dependencias. & pause & exit /b 1)
)
call npm start
if errorlevel 1 pause
