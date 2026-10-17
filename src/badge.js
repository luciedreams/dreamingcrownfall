// Zahl am Taskleisten-Symbol (seit 0.7.0, Luces Wahl vom 17.10.): wie viel über alle Accounts abzuholen
// ist — dieselbe goldene Zahl, die am Porträt in der Account-Leiste steht (tab-status.js, „claim“).
//   Linux    Unity-LauncherEntry-Signal über D-Bus (KDE Plasma, Dock-Programme lesen es); die Zuordnung
//            läuft über die Desktop-Datei dreamingcrownfall.desktop (package.json desktopName).
//            Ohne gdbus: Electrons setBadgeCount (geht nur mit libunity).
//   Windows  kleines goldenes Overlay-Symbol mit der Zahl, gezeichnet von der Leiste (render).
//   macOS    Dock-Zahl.

const { app, nativeImage } = require('electron');
const { execFile } = require('child_process');

const DESKTOP = 'application://dreamingcrownfall.desktop';

module.exports = function createBadge({ getWin, render }) {
    let last = -1;

    function linux(n) {
        const props = `{'count': <int64 ${n}>, 'count-visible': <${n > 0}>}`;
        execFile('gdbus', ['emit', '--session', '--object-path', '/com/canonical/unity/launcherentry/dreamingcrownfall',
            '--signal', 'com.canonical.Unity.LauncherEntry.Update', DESKTOP, props], (err) => {
            if (err) { try { app.setBadgeCount(n); } catch {} }
        });
    }

    async function windows(n) {
        const win = getWin();
        if (!win || win.isDestroyed()) return;
        if (!n) { win.setOverlayIcon(null, ''); return; }
        try {
            const url = await render(n > 99 ? '99+' : String(n));
            if (url && n === last) win.setOverlayIcon(nativeImage.createFromDataURL(url), `${n} to claim`);
        } catch {}
    }

    return {
        set(n) {
            n = Math.max(0, Math.floor(Number(n) || 0));
            if (n === last) return;
            last = n;
            if (process.platform === 'linux') linux(n);
            else if (process.platform === 'win32') windows(n);
            else if (process.platform === 'darwin') { try { app.setBadgeCount(n); } catch {} }
        },
    };
};
