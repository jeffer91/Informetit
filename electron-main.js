'use strict';

/**
 * Informetit Desktop · Proceso principal Electron.
 * La interfaz se ejecuta como archivo local; no necesita servidor HTTP.
 * Los datos privados se conservan en el perfil local de Electron (IndexedDB).
 */
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

app.setAppUserModelId('ec.itsqmet.informetit');
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Informetit · UTET',
    width: 1420,
    height: 900,
    minWidth: 950,
    minHeight: 680,
    backgroundColor: '#f6f8fc',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // La impresión APA abre un documento HTML creado localmente en about:blank.
  // No se permite abrir otros sitios dentro de ventanas de la aplicación.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          title: 'Vista previa de informe APA 7',
          width: 1050,
          height: 880,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true
          }
        }
      };
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const expected = new URL('file://' + path.join(__dirname, 'index.html').replace(/\\/g, '/')).href;
    if (url !== expected) event.preventDefault();
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('informetit:save-pdf', async (event, payload) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('Solicitud de guardado no autorizada');
  }
  const base64 = payload?.base64;
  const providedName = payload?.name;
  if (typeof base64 !== 'string' || base64.length > 80000000 ||
      !/^[A-Za-z0-9+/=]+$/.test(base64) || typeof providedName !== 'string') {
    throw new Error('Documento PDF inválido');
  }
  const content = Buffer.from(base64, 'base64');
  if (content.length < 10 || content.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('El contenido no es un PDF');
  }
  const cleanName = path.basename(providedName).replace(/[^\p{L}\p{N}_. -]/gu, '_').slice(0, 100);
  const filename = cleanName.toLowerCase().endsWith('.pdf') ? cleanName : cleanName + '.pdf';
  const selection = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar informe de titulación en PDF',
    defaultPath: path.join(app.getPath('documents'), filename),
    buttonLabel: 'Guardar PDF',
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
  });
  if (selection.canceled || !selection.filePath) return { canceled: true };
  await fs.writeFile(selection.filePath, content);
  return { canceled: false, name: path.basename(selection.filePath) };
});

if (singleInstance) {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(createWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
