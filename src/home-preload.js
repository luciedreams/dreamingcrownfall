// Brücke für Home: Zustand empfangen, einen Account-Tab öffnen, neu abrufen.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('home', {
    state: () => ipcRenderer.invoke('home:state'),
    onState: (cb) => ipcRenderer.on('home:state', (_e, s) => cb(s)),
    select: (i) => ipcRenderer.send('home:select', i),
    refresh: () => ipcRenderer.send('home:refresh'),
});
