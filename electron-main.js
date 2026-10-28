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
/*
 * Base GPT EN CÓDIGO: private/base-gpt.cjs es un archivo JavaScript
 * de datos, creado localmente y excluido del GitHub público.
 *
 * También detecta un archivo de datos descargado en Descargas sin
 * pedir al usuario que haga una importación desde la interfaz.
 */
ipcMain.handle('informetit:read-master', async event => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('Solicitud de base GPT no autorizada');
  }
  const sourceDirs = [
    path.join(__dirname, 'data'),
    path.join(__dirname, 'private'),
    app.getPath('downloads'),
    app.getPath('desktop'),
    app.getPath('userData')
  ];
  const selectedFiles = [];
  const namePattern = /^(?:base-gpt(?: \(\d+\))?|informetit_base(?:_[\w-]+)*(?: \(\d+\))?)\.(?:json|cjs)$/i;
  for (const directory of sourceDirs) {
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      const matches = items
        .filter(item => item.isFile() && namePattern.test(item.name))
        .map(item => path.join(directory, item.name));
      const found = await Promise.all(matches.map(async file => {
        const stat = await fs.stat(file);
        return { file, mtime: stat.mtimeMs, size: stat.size };
      }));
      found.sort((a, b) => b.mtime - a.mtime);
      selectedFiles.push(...found);
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'EACCES') {
        console.warn('[Informetit] No se pudo revisar:', directory, error.message);
      }
    }
  }
  let problem;
  for (const entry of selectedFiles) {
    if (entry.size > 12 * 1024 * 1024 || entry.size < 10) continue;
    try {
      const buffer = await fs.readFile(entry.file);
      let raw = buffer.toString('utf8').replace(/^\uFEFF/, '').trim();
      // Se interpreta el objeto literal como JSON, SIN ejecutar JavaScript.
      if (/\.cjs$/i.test(entry.file)) {
        const match = raw.match(/^\/\*[\s\S]*?\*\/\s*module\.exports\s*=\s*([\s\S]*?)\s*;\s*$/);
        if (!match) throw new Error('Código de la base GPT con formato no reconocido.');
        raw = match[1];
      }
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.estudiantes) || !Array.isArray(data.notas) ||
          !data.estudiantes.every(x => x && typeof x.id === 'string')) {
        throw new Error('No contiene estudiantes y notas con el formato esperado.');
      }
      console.info('[Informetit] Base GPT reconocida:', path.basename(entry.file),
        data.estudiantes.length, 'estudiantes;', data.notas.length, 'notas.');
      return {
        data,
        fingerprint: crypto.createHash('sha256').update(raw).digest('hex'),
        filename: path.basename(entry.file)
      };
    } catch(error) {
      problem = error;
      console.warn('[Informetit] Base candidata descartada:', entry.file, error.message);
    }
  }
  if (selectedFiles.length && problem) throw new Error('No se pudo interpretar la base GPT local: ' + problem.message);
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
  return { canceled: false, name: path.basename(selection.filePath), indexStatus };
});


/**
 * Genera el PDF APA 7 con la propia impresión de Chromium/Electron.
 * Respeta la fuente Times New Roman y las reglas CSS @page.
 */
/* Números reales para índices generados: extraídos del primer PDF impreso. */
async function extractIndexPages(pdfBytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({
    data: new Uint8Array(pdfBytes),
    useSystemFonts: true,
    disableFontFace: true
  });
  const doc = await task.promise;
  const pages = {};
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const result = await page.getTextContent();
      const joined = result.items.map(x => x.str || '').join('');
      const matcher = /\[\[INF:([a-z0-9-]+)\]\]/g;
      let match;
      while ((match = matcher.exec(joined))) pages[match[1]] = n;
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return pages;
}
function fillIndexPages(html, pages) {
  return html.replace(/(<span class="inf-index-page" data-page=")([^"]+)(">)(?:—|\d+)(<\/span>)/g,
    (whole, a, id, c, d) => a + id + c + (Number.isInteger(pages[id]) ? pages[id] : '—') + d);
}

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
  const opts = payload?.options || {};
  const template = typeof opts.headerTemplate === 'string' && opts.headerTemplate.length < 4000000
    && /^<!doctype html>/i.test(opts.headerTemplate) ? opts.headerTemplate : '';
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
    const printOptions = {
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: 'A4',
      displayHeaderFooter: !!template,
      headerTemplate: template,
      footerTemplate: '<span></span>',
      generateDocumentOutline: true
    };
    const render = async source => {
      await preview.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(source));
      await preview.webContents.executeJavaScript(
        'Promise.all([document.fonts.ready, ...Array.from(document.images).map(img => img.decode().catch(() => null))]).then(() => true)'
      );
      return Buffer.from(await preview.webContents.printToPDF(printOptions));
    };
    let pdf = await render(html), indexStatus = 'sin_indice';
    if (opts.indexPageNumbers && html.includes('data-page="inf-sec-')) {
      try {
        let previous = null;
        for (let round = 0; round < 3; round++) {
          const pages = await extractIndexPages(pdf);
          if (!Object.keys(pages).length) {
            indexStatus = 'sin_marcadores';
            break;
          }
          const mapped = fillIndexPages(html, pages);
          indexStatus = 'paginado';
          const serialized = JSON.stringify(pages);
          if (serialized === previous) break;
          previous = serialized;
          pdf = await render(mapped);
        }
      } catch (error) {
        indexStatus = 'sin_paginacion';
        console.error('No se pudo completar el índice de páginas:', error);
      }
    }
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
