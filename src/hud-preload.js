// Brücke für das HUD: Zustand empfangen, schließen.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hud', {
    state: () => ipcRenderer.invoke('hud:state'),
    onState: (cb) => ipcRenderer.on('hud:state', (_e, s) => cb(s)),
    close: () => ipcRenderer.send('hud:close'),
    fit: (w, h) => ipcRenderer.send('hud:fit', w, h),
});
