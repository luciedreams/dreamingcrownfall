// Brücke für die Tab-Leiste: Zustand empfangen, Tab wählen, neu laden, hinzufügen, entfernen.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tabs', {
    state: () => ipcRenderer.invoke('tabs:state'),
    onState: (cb) => ipcRenderer.on('tabs:state', (_e, s) => cb(s)),
    select: (i) => ipcRenderer.send('tabs:select', i),
    reload: (i) => ipcRenderer.send('tabs:reload', i),
    add: () => ipcRenderer.send('tabs:add'),
    remove: (i) => ipcRenderer.send('tabs:remove', i),
    settings: () => ipcRenderer.send('tabs:settings'),
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    tip: (text, r) => ipcRenderer.send('tabs:tip', text == null ? '' : String(text), r ? { left: +r.left, top: +r.top, right: +r.right, bottom: +r.bottom, width: +r.width, height: +r.height } : null),
    close: () => ipcRenderer.send('win:close'),
    contextMenu: (i, x) => ipcRenderer.send('tabs:ctx', i, x),
    onConfirmRemove: (cb) => ipcRenderer.on('tabs:confirm-remove', (_e, i) => cb(i)),
});
