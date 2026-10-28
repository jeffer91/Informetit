@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist vendor mkdir vendor
echo Descargando bibliotecas para ejecutar sin Internet ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $files = @(@('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','vendor/xlsx.full.min.js'),@('https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js','vendor/pdfmake.min.js'),@('https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/vfs_fonts.js','vendor/vfs_fonts.js')); foreach($file in $files){ Invoke-WebRequest -Uri $file[0] -OutFile $file[1] -UseBasicParsing; Write-Host ('Correcto: ' + $file[1]) }"
if errorlevel 1 (echo No se completaron las descargas. Necesitas acceso a Internet. & pause & exit /b 1)
echo Preparada la aplicacion para ejecutarse sin Internet.
pause
