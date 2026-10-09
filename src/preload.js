// Läuft in jedem Frame vor den Seitenskripten (wie @run-at document-start) und führt
// MarbleLuceFall im Seitenkontext aus — dort, wo Tampermonkey es mit unsafeWindow hinstellt.
// Bereitgestellt werden genau die drei Dinge, die das Skript vom Manager erwartet:
// GM_addStyle, unsafeWindow, GM_info. Danach die App-Schicht (nur oberster Frame).

const { contextBridge, ipcRenderer } = require('electron');

const host = location.hostname;
if (host === 'marblecrownfall.com' || host.endsWith('.marblecrownfall.com')) {
    // Brücke zu den App-Einstellungen (Benachrichtigungen, Discord, Autostart) — nur im obersten Frame,
    // und die App nimmt nur die Schalter an, die sie kennt (app-settings.js).
    if (window.top === window.self) {
        const changeHandlers = [];
        ipcRenderer.on('dcf:settings:changed', (_e, s) => { for (const cb of changeHandlers) { try { cb(s); } catch (err) {} } });
        contextBridge.exposeInMainWorld('dcfApp', {
            settings: () => ipcRenderer.sendSync('dcf:settings:get'),
            set: (key, value) => ipcRenderer.send('dcf:settings:set', String(key), value === true),
            onChange: (cb) => { if (typeof cb === 'function') changeHandlers.push(cb); },
            testNotification: () => ipcRenderer.send('dcf:notify:test'),
            perfReport: () => ipcRenderer.invoke('dcf:perf:report'),
            displayHz: () => ipcRenderer.sendSync('dcf:display:hz'),
            hud: {
                get: () => ipcRenderer.sendSync('dcf:hud:get'),
                set: (cfg) => ipcRenderer.send('dcf:hud:set', JSON.parse(JSON.stringify(cfg || {}))),
                toggle: () => ipcRenderer.send('dcf:hud:toggle'),
                data: () => ipcRenderer.invoke('dcf:hud:data'),
                renderer: () => ipcRenderer.sendSync('dcf:hud:renderer'),
                onChange: (cb) => { if (typeof cb === 'function') ipcRenderer.on('dcf:hud:changed', (_e, s) => { try { cb(s); } catch (err) {} }); },
            },
            update: {
                state: () => ipcRenderer.invoke('dcf:update:state'),
                check: () => ipcRenderer.invoke('dcf:update:check'),
                install: () => ipcRenderer.send('dcf:update:install'),
                onChange: (cb) => { if (typeof cb === 'function') ipcRenderer.on('dcf:update:state', (_e, s) => { try { cb(s); } catch (err) {} }); },
            },
        });
    }

    const script = ipcRenderer.sendSync('mlf:script');
    if (script && (script.code || script.layer)) {
        contextBridge.executeInMainWorld({
            func: (code, version, layer) => {
                if (code) {
                    const GM_addStyle = (css) => {
                        const s = document.createElement('style');
                        s.textContent = css;
                        const parent = document.head || document.documentElement;
                        if (parent) parent.appendChild(s);
                        else new MutationObserver((_, o) => {
                            if (document.documentElement) { (document.head || document.documentElement).appendChild(s); o.disconnect(); }
                        }).observe(document, { childList: true });
                        return s;
                    };
                    const GM_info = { script: { name: 'DreamingCrownfall', version }, scriptHandler: 'dreamingcrownfall' };
                    try {
                        new Function('GM_addStyle', 'unsafeWindow', 'GM_info', code)(GM_addStyle, window, GM_info);
                    } catch (e) {
                        console.error('[dcf] Spiel-Ebene abgestürzt:', e);
                    }
                }
                if (layer && window.top === window.self) {
                    try { new Function(layer)(); } catch (e) { console.error('[dcf] App-Schicht abgestürzt:', e); }
                }
            },
            args: [script.code, script.version, script.layer],
        });
    }
}
