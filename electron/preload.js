'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  openFile: (name, data) => ipcRenderer.invoke('open-file', name, data),
  portal: (op, body) => ipcRenderer.invoke('portal-soap', op, body),
});
