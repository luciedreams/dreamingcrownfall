// Updates der App selbst (nicht von MLF — das holt mlf-source.js) aus den GitHub-Releases.
// Nur in der installierten Fassung: Windows-Installer oder AppImage. Beim Starten aus dem
// Projektordner (electron .) bleibt es aus.

const { app, Notification } = require('electron');

const CHECK_MS = 6 * 60 * 60 * 1000;

module.exports = function startUpdater({ icon }) {
    if (!app.isPackaged) return;
    if (process.platform === 'linux' && !process.env.APPIMAGE) return; // nur das AppImage kann sich selbst ersetzen
    let autoUpdater;
    try { ({ autoUpdater } = require('electron-updater')); }
    catch (e) { console.warn(`[dcf] electron-updater fehlt: ${e.message}`); return; }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('error', (e) => console.warn(`[dcf] App-Update: ${e?.message || e}`));
    autoUpdater.on('update-downloaded', (info) => {
        console.log(`[dcf] App-Update ${info.version} geladen`);
        if (Notification.isSupported()) {
            new Notification({ title: `DreamingCrownfall ${info.version} is ready`, icon,
                body: 'It will be installed when you quit the app.' }).show();
        }
    });
    const check = () => autoUpdater.checkForUpdates().catch(() => {});
    check();
    setInterval(check, CHECK_MS);
};
