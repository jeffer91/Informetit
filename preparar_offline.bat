@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Preparando Electron, Excel y PDF para trabajar sin Internet despues de instalar...
call npm install
if errorlevel 1 (echo ERROR de instalacion. Revisa la conexion y Node.js. & pause & exit /b 1)
echo Dependencias y bibliotecas locales instaladas.
pause
