// Updates der App selbst aus den GitHub-Releases — automatisch beim Start und alle 6 Stunden, dazu auf
// Knopfdruck (Settings › About, Tray). Drei Fälle:
//   auto   — Windows-Installer und AppImage: electron-updater lädt im Hintergrund, installiert beim Beenden
//            oder sofort per „Restart to update“.
//   manual — .deb und andere Pakete: können sich nicht selbst ersetzen; hier wird nur bei GitHub nachgesehen
//            und bei einer neuen Version die Release-Seite angeboten.
//   dev    — aus dem Projektordner gestartet (`electron .`): Updates kommen über git, nichts zu tun.
// Der Zustand geht an alle Seiten ('dcf:update:state'), damit die Settings ihn live zeigen.

const { app, Notification, ipcMain, shell, webContents } = require('electron');

const CHECK_MS = 6 * 60 * 60 * 1000;
const GH_LATEST = 'https://api.github.com/repos/luciedreams/dreamingcrownfall/releases/latest';
const RELEASES = 'https://github.com/luciedreams/dreamingcrownfall/releases/latest';

const newer = (a, b) => {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
    return false;
};

module.exports = function startUpdater({ icon }) {
    // process.defaultApp statt nur app.isPackaged: das System-Electron von Arch meldet auch bei `electron .` isPackaged=true.
    const mode = process.defaultApp || !app.isPackaged ? 'dev'
        : (process.platform === 'win32' || process.env.APPIMAGE) ? 'auto' : 'manual';
    // status: idle | checking | latest | downloading | ready | available | error | dev
    const state = { mode, status: mode === 'dev' ? 'dev' : 'idle', current: app.getVersion(), version: null, percent: null, error: null, checkedAt: null };
    let waiters = [];

    function publish(patch) {
        Object.assign(state, patch);
        for (const wc of webContents.getAllWebContents()) if (!wc.isDestroyed()) wc.send('dcf:update:state', { ...state });
        if (['latest', 'ready', 'available', 'error'].includes(state.status)) { const w = waiters; waiters = []; w.forEach((r) => r({ ...state })); }
    }

    let autoUpdater = null;
    if (mode === 'auto') {
        try { ({ autoUpdater } = require('electron-updater')); }
        catch (e) { console.warn(`[dcf] electron-updater fehlt: ${e.message}`); }
    }
    if (autoUpdater) {
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.on('checking-for-update', () => publish({ status: 'checking', error: null }));
        autoUpdater.on('update-not-available', () => publish({ status: 'latest', checkedAt: Date.now() }));
        autoUpdater.on('update-available', (info) => publish({ status: 'downloading', version: info.version, percent: 0 }));
        autoUpdater.on('download-progress', (p) => publish({ status: 'downloading', percent: Math.round(p.percent || 0) }));
        autoUpdater.on('error', (e) => { console.warn(`[dcf] App-Update: ${e?.message || e}`); publish({ status: 'error', error: String(e?.message || e).slice(0, 200), checkedAt: Date.now() }); });
        autoUpdater.on('update-downloaded', (info) => {
            console.log(`[dcf] App-Update ${info.version} geladen`);
            publish({ status: 'ready', version: info.version, percent: 100, checkedAt: Date.now() });
            if (Notification.isSupported()) {
                new Notification({ title: `DreamingCrownfall ${info.version} is ready`, icon,
                    body: 'It will be installed when you quit the app, or right away from Settings › About.' }).show();
            }
        });
    }

    async function checkManual() {
        publish({ status: 'checking', error: null });
        try {
            const r = await fetch(GH_LATEST, { headers: { Accept: 'application/vnd.github+json' } });
            if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`);
            const v = String((await r.json()).tag_name || '').replace(/^v/, '');
            if (v && newer(v, state.current)) publish({ status: 'available', version: v, checkedAt: Date.now() });
            else publish({ status: 'latest', checkedAt: Date.now() });
        } catch (e) { publish({ status: 'error', error: e.message, checkedAt: Date.now() }); }
    }

    // Ergebnis als Promise: wartet auf latest/ready/available/error (höchstens 60 s).
    function check() {
        if (mode === 'dev') return Promise.resolve({ ...state });
        if (state.status === 'ready') return Promise.resolve({ ...state });
        const done = new Promise((resolve) => { waiters.push(resolve); setTimeout(() => resolve({ ...state }), 60000); });
        if (state.status !== 'checking' && state.status !== 'downloading') {
            if (autoUpdater) autoUpdater.checkForUpdates().catch((e) => publish({ status: 'error', error: e.message }));
            else checkManual();
        }
        return done;
    }

    ipcMain.handle('dcf:update:state', () => ({ ...state }));
    ipcMain.handle('dcf:update:check', () => check());
    ipcMain.on('dcf:update:install', () => {
        if (state.status === 'ready' && autoUpdater) autoUpdater.quitAndInstall();
        else if (state.status === 'available') shell.openExternal(RELEASES);
    });

    if (mode !== 'dev') {
        check();
        setInterval(check, CHECK_MS);
    } else if (process.env.DCF_FAKE_UPDATE) {
        // Nur zum Ansehen der Update-Anzeige im Projektordner: ein Schein-Download, installiert wird nichts.
        let p = 0;
        setTimeout(() => {
            const t = setInterval(() => {
                p += 8;
                if (p < 100) publish({ status: 'downloading', version: '9.9.9', percent: p });
                else { clearInterval(t); publish({ status: 'ready', version: '9.9.9', percent: 100 }); }
            }, 700);
        }, 6000);
    }
    return { check, state: () => ({ ...state }) };
};
