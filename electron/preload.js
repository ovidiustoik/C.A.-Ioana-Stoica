'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  openFile: (name, data) => ipcRenderer.invoke('open-file', name, data),
});
