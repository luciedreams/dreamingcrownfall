// Mit dem System starten — wahlweise unsichtbar im Tray (--hidden, Standard), damit Sitzungen,
// Benachrichtigungen und Add-ons laufen, ohne dass ein Fenster aufgeht, oder gleich sichtbar
// (App-Schalter 'autostart.hidden', seit 0.3.3). Standardmäßig aus, Schalter in Settings › General und im Tray.
// Windows/macOS: Login-Item von Electron. Linux: Eintrag in ~/.config/autostart/.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { app } = require('electron');

const HIDDEN_ARG = '--hidden';
const desktopFile = () => path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'autostart', 'dreamingcrownfall.desktop');

// Womit die App gestartet wurde: AppImage, installiertes Programm oder `electron <ordner>`.
function command() {
    const q = (s) => `"${String(s).replace(/(["\\$`])/g, '\\$1')}"`;
    if (process.env.APPIMAGE) return q(process.env.APPIMAGE);
    // process.defaultApp statt app.isPackaged: das System-Electron von Arch meldet auch bei `electron <ordner>`
    // isPackaged=true — dann fehlte hier der Ordner und der Autostart öffnete ein leeres Electron.
    if (!process.defaultApp && app.isPackaged) return q(process.execPath);
    return `${q(process.execPath)} ${q(app.getAppPath())}`;
}

module.exports = {
    startHidden: process.argv.includes(HIDDEN_ARG),

    enabled() {
        if (process.platform === 'linux') return fs.existsSync(desktopFile());
        return app.getLoginItemSettings({ args: [HIDDEN_ARG] }).openAtLogin || app.getLoginItemSettings({ args: [] }).openAtLogin;
    },

    set(on, hidden = true) {
        const args = hidden ? [HIDDEN_ARG] : [];
        if (process.platform === 'linux') {
            const f = desktopFile();
            try { fs.unlinkSync(path.join(path.dirname(f), 'marblelucefall.desktop')); } catch {} // Eintrag vor der Umbenennung
            if (!on) { try { fs.unlinkSync(f); } catch {} return; }
            fs.mkdirSync(path.dirname(f), { recursive: true });
            fs.writeFileSync(f, [
                '[Desktop Entry]',
                'Type=Application',
                'Name=DreamingCrownfall',
                `Comment=Marble Crownfall desktop app${hidden ? ' (starts in the tray)' : ''}`,
                `Exec=${command()}${hidden ? ' ' + HIDDEN_ARG : ''}`,
                'Terminal=false',
                'X-GNOME-Autostart-enabled=true',
                '',
            ].join('\n'));
            return;
        }
        // Beide Varianten abmelden, dann die gewählte eintragen (sonst blieben zwei Login-Items).
        app.setLoginItemSettings({ openAtLogin: false, args: [HIDDEN_ARG] });
        app.setLoginItemSettings({ openAtLogin: false, args: [] });
        if (on) app.setLoginItemSettings({ openAtLogin: true, args });
    },
};
