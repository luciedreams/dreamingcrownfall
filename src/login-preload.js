// Leiste des Login-Fensters (login-bar.html): zurück, minimieren, schließen.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('login', {
    back: () => ipcRenderer.send('login:back'),
    minimize: () => ipcRenderer.send('login:min'),
    close: () => ipcRenderer.send('login:close'),
});
