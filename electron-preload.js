'use strict';

// Única función nativa expuesta a la ventana de Informetit.
// El renderizador no tiene acceso directo a Node.js o al disco.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('informetitDesktop', Object.freeze({
  isElectron: true,
  chatgptStatus: () => ipcRenderer.invoke('informetit:chatgpt-status'),
  chatgptSelectFolder: data => ipcRenderer.invoke('informetit:chatgpt-select-folder',data),
  chatgptDisable: () => ipcRenderer.invoke('informetit:chatgpt-disable'),
  firebaseBackupUpload: (data,passphrase) => ipcRenderer.invoke('informetit:firebase-backup-upload',{data,passphrase}),
  firebaseBackupList: () => ipcRenderer.invoke('informetit:firebase-backup-list'),
  firebaseBackupDownload: (id,passphrase) => ipcRenderer.invoke('informetit:firebase-backup-download',{id,passphrase}),
  recoveryCheckpoint: data => ipcRenderer.invoke('informetit:recovery-checkpoint',data),
  firebaseConnect: method => ipcRenderer.invoke('informetit:firebase-connect',method),
  firebaseRead: () => ipcRenderer.invoke('informetit:firebase-read'),
  firebaseStatus: () => ipcRenderer.invoke('informetit:firebase-status'),
  firebaseAcademicWrite: payload => ipcRenderer.invoke('informetit:firebase-academic-write',payload),
  loadMasterData: () => ipcRenderer.invoke('informetit:read-master'),
  backupMaster: data => ipcRenderer.invoke('informetit:backup-master',data),
  savePDF: (base64, name) => ipcRenderer.invoke('informetit:save-pdf', { base64, name }),
  saveAPAHTML: (html, name, options = {}) => ipcRenderer.invoke('informetit:save-apa-pdf', { html, name, options })
}));
