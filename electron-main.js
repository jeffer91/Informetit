'use strict';

/**
 * Informetit Desktop · Proceso principal Electron.
 * La interfaz se ejecuta como archivo local; no necesita servidor HTTP.
 * Los datos privados se conservan en el perfil local de Electron (IndexedDB).
 */
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

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
    const expected = pathToFileURL(path.join(__dirname, 'index.html')).href;
    if (url !== expected) event.preventDefault();
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.on('closed', () => { mainWindow = null; });
}

/*
 * La base GPT contiene datos personales: se lee exclusivamente desde un
 * archivo PRIVADO del equipo, jamás desde el repositorio público.
 * Actualiza private/base-gpt.json con un paquete privado para importar
 * automáticamente nuevas notas al siguiente inicio, sin borrar ediciones locales.
 */
ipcMain.handle('informetit:read-master', async event => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('Solicitud de base privada no autorizada');
  }
  const candidates = [
    path.join(__dirname, 'private', 'base-gpt.json'),
    path.join(app.getPath('userData'), 'base-gpt.json')
  ];
  for (const file of candidates) {
    let buffer;
    try { buffer = await fs.readFile(file); }
    catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
    if (buffer.length > 12 * 1024 * 1024) throw new Error('La base GPT supera 12 MB.');
    const data = JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, ''));
    if (!data || !Array.isArray(data.estudiantes) || !Array.isArray(data.notas)) {
      throw new Error('La base GPT local no tiene el formato de Informetit.');
    }
    return {
      data,
      fingerprint: crypto.createHash('sha256').update(buffer).digest('hex'),
      filename: 'base-gpt.json'
    };
  }
  return null;
});

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


/**
 * Genera el PDF APA 7 con la propia impresión de Chromium/Electron.
 * Respeta la fuente Times New Roman y las reglas CSS @page.
 */
ipcMain.handle('informetit:save-apa-pdf', async (event, payload) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('Solicitud de impresión no autorizada');
  }
  const html = payload?.html;
  const providedName = payload?.name;
  if (typeof html !== 'string' || html.length > 12000000 ||
      !/^<!doctype html>/i.test(html) || typeof providedName !== 'string') {
    throw new Error('Documento APA 7 inválido');
  }
  const preview = new BrowserWindow({
    show: false,
    width: 1024,
    height: 1152,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  try {
    await preview.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await preview.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
    const pdf = await preview.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' }
    });
    if (!Buffer.isBuffer(pdf) || pdf.length < 10) throw new Error('No se pudo renderizar el PDF.');
    const cleanName = path.basename(providedName).replace(/[^\\p{L}\\p{N}_. -]/gu, '_').slice(0, 100);
    const selection = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar informe APA 7',
      defaultPath: path.join(app.getPath('documents'), cleanName.toLowerCase().endsWith('.pdf') ? cleanName : cleanName + '.pdf'),
      buttonLabel: 'Guardar PDF',
      filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
    });
    if (selection.canceled || !selection.filePath) return { canceled: true };
    await fs.writeFile(selection.filePath, pdf);
    return { canceled: false, name: path.basename(selection.filePath) };
  } finally {
    if (!preview.isDestroyed()) preview.destroy();
  }
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
