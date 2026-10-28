@echo off
chcp 65001 >nul
echo Instalando Informetit Electron en el escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $dest=Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Informetit'; if(Test-Path $dest){Write-Host 'Ya existe Informetit. No se sobrescribio.'; exit 2}; $zip=Join-Path $env:TEMP 'Informetit-main.zip'; $scratch=Join-Path $env:TEMP ('Informetit-'+[guid]::NewGuid().ToString('N')); Invoke-WebRequest -Uri 'https://github.com/jeffer91/Informetit/archive/refs/heads/main.zip' -OutFile $zip -UseBasicParsing; Expand-Archive -LiteralPath $zip -DestinationPath $scratch -Force; Copy-Item -Path (Join-Path $scratch 'Informetit-main') -Destination $dest -Recurse; Write-Host ('Clonado: '+$dest)"
if errorlevel 1 (echo Revisa Internet o la carpeta existente. & pause & exit /b 1)
cd /d "%USERPROFILE%\Desktop\Informetit"
call npm install
if errorlevel 1 (echo No se pudieron instalar las dependencias. & pause & exit /b 1)
call npm start
if errorlevel 1 pause
