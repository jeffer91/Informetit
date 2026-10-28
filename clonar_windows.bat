@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "DEST=%USERPROFILE%\Desktop\Informetit"
echo Descargando Informetit al escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $zip = Join-Path $env:TEMP 'Informetit-main.zip'; Invoke-WebRequest -Uri 'https://github.com/jeffer91/Informetit/archive/refs/heads/main.zip' -OutFile $zip -UseBasicParsing; $dest = Join-Path $env:USERPROFILE 'Desktop\Informetit'; if(Test-Path $dest){Write-Host 'La carpeta Informetit ya existe. Guarda un respaldo antes de reemplazarla.'; exit 2}; New-Item -ItemType Directory -Force -Path $dest | Out-Null; Expand-Archive -LiteralPath $zip -DestinationPath $env:TEMP\Informetit-Descarga -Force; Copy-Item -Path $env:TEMP\Informetit-Descarga\Informetit-main\* -Destination $dest -Recurse -Force; Write-Host ('Carpeta creada: '+$dest)"
if errorlevel 1 (echo No se pudo descargar o ya existe una carpeta Informetit en el escritorio. & pause & exit /b 1)
start "" "%DEST%\index.html"
