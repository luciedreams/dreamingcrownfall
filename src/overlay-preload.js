// Brücke für die Ebene über dem Spiel (overlay.html): Aufträge empfangen, quittieren, „neu versuchen“.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlay', {
    on: (cb) => ipcRenderer.on('overlay:show', (_e, m) => cb(m)),
    ack: (id) => ipcRenderer.send('overlay:ack', id),
    done: () => ipcRenderer.send('overlay:done'),
    retry: () => ipcRenderer.send('overlay:retry'),
    signin: () => ipcRenderer.send('overlay:signin'),
    guest: () => ipcRenderer.send('overlay:guest'),
});
