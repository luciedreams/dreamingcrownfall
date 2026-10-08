// Mit dem System starten — unsichtbar im Tray (--hidden), damit Sitzungen, Benachrichtigungen und
// Add-ons laufen, auch wenn man die App nicht selbst öffnet. Standardmäßig aus, Schalter im Tray.
// Windows/macOS: Login-Item von Electron. Linux: Eintrag in ~/.config/autostart/.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { app } = require('electron');

const HIDDEN_ARG = '--hidden';
const desktopFile = () => path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'autostart', 'marblelucefall.desktop');

// Womit die App gestartet wurde: AppImage, installiertes Programm oder `electron <ordner>`.
function command() {
    const q = (s) => `"${String(s).replace(/(["\\$`])/g, '\\$1')}"`;
    if (process.env.APPIMAGE) return q(process.env.APPIMAGE);
    if (app.isPackaged) return q(process.execPath);
    return `${q(process.execPath)} ${q(app.getAppPath())}`;
}

module.exports = {
    startHidden: process.argv.includes(HIDDEN_ARG),

    enabled() {
        if (process.platform === 'linux') return fs.existsSync(desktopFile());
        return app.getLoginItemSettings({ args: [HIDDEN_ARG] }).openAtLogin;
    },

    set(on) {
        if (process.platform === 'linux') {
            const f = desktopFile();
            if (!on) { try { fs.unlinkSync(f); } catch {} return; }
            fs.mkdirSync(path.dirname(f), { recursive: true });
            fs.writeFileSync(f, [
                '[Desktop Entry]',
                'Type=Application',
                'Name=MarbleLuceFall',
                'Comment=Marble Crownfall with MarbleLuceFall (starts in the tray)',
                `Exec=${command()} ${HIDDEN_ARG}`,
                'Terminal=false',
                'X-GNOME-Autostart-enabled=true',
                '',
            ].join('\n'));
            return;
        }
        app.setLoginItemSettings({ openAtLogin: on, args: [HIDDEN_ARG] });
    },
};
