// Brücke für die Tab-Leiste: Zustand empfangen, Tab wählen, neu laden, hinzufügen, entfernen.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tabs', {
    state: () => ipcRenderer.invoke('tabs:state'),
    onState: (cb) => ipcRenderer.on('tabs:state', (_e, s) => cb(s)),
    select: (i) => ipcRenderer.send('tabs:select', i),
    reload: (i) => ipcRenderer.send('tabs:reload', i),
    add: () => ipcRenderer.send('tabs:add'),
    remove: (i) => ipcRenderer.send('tabs:remove', i),
});
