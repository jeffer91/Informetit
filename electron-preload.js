'use strict';

// Única función nativa expuesta a la ventana de Informetit.
// El renderizador no tiene acceso directo a Node.js o al disco.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('informetitDesktop', Object.freeze({
  isElectron: true,
  firebaseConnect: method => ipcRenderer.invoke('informetit:firebase-connect',method),
  firebaseRead: () => ipcRenderer.invoke('informetit:firebase-read'),
  firebaseStatus: () => ipcRenderer.invoke('informetit:firebase-status'),
  loadMasterData: () => ipcRenderer.invoke('informetit:read-master'),
  savePDF: (base64, name) => ipcRenderer.invoke('informetit:save-pdf', { base64, name }),
  saveAPAHTML: (html, name, options = {}) => ipcRenderer.invoke('informetit:save-apa-pdf', { html, name, options })
}));
