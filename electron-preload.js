'use strict';

// Única función nativa expuesta a la ventana de Informetit.
// El renderizador no tiene acceso directo a Node.js o al disco.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('informetitDesktop', Object.freeze({
  isElectron: true,
  loadMasterData: () => ipcRenderer.invoke('informetit:read-master'),
  savePDF: (base64, name) => ipcRenderer.invoke('informetit:save-pdf', { base64, name }),
  saveAPAHTML: (html, name) => ipcRenderer.invoke('informetit:save-apa-pdf', { html, name })
}));
