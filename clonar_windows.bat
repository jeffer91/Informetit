@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo Descargando Informetit desde GitHub (rama main)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $desktop = [Environment]::GetFolderPath('DesktopDirectory'); $dest = Join-Path $desktop 'Informetit'; if (Test-Path $dest) { Write-Host 'La carpeta Informetit ya existe. No se sobrescribe para proteger tus datos.'; exit 2 }; $zip = Join-Path $env:TEMP 'Informetit-main.zip'; $scratch = Join-Path $env:TEMP ('Informetit-descarga-'+[guid]::NewGuid().ToString('N')); Invoke-WebRequest -Uri 'https://github.com/jeffer91/Informetit/archive/refs/heads/main.zip' -OutFile $zip -UseBasicParsing; Expand-Archive -LiteralPath $zip -DestinationPath $scratch -Force; Copy-Item -Path (Join-Path $scratch 'Informetit-main') -Destination $dest -Recurse; Write-Host ('Creado: '+$dest); Start-Process (Join-Path $dest 'index.html')"
if errorlevel 1 (echo No se completo la descarga. Comprueba Internet y que no exista la carpeta Informetit en el escritorio. & pause & exit /b 1)
echo Informetit descargado e iniciado.
pause
