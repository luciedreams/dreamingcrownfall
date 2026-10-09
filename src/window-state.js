// Fenstergröße, -position und Maximiert-Zustand über Neustarts merken (<Profil>/window-state.json).
// Position nur, wo das System sie zulässt (Windows, X11) und nur, wenn sie noch auf einem
// Bildschirm liegt — Wayland lässt Programme ihre Fenster nicht platzieren.

const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');

const file = () => path.join(app.getPath('userData'), 'window-state.json');
const wayland = () => process.platform === 'linux' && (process.env.XDG_SESSION_TYPE === 'wayland' || !!process.env.WAYLAND_DISPLAY);

function load(defaults) {
    let s = null;
    try { s = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch {}
    const out = { width: defaults.width, height: defaults.height, maximized: false };
    if (!s || typeof s !== 'object') return out;
    if (s.width >= 600 && s.height >= 400) { out.width = Math.round(s.width); out.height = Math.round(s.height); }
    out.maximized = s.maximized === true;
    if (!wayland() && Number.isFinite(s.x) && Number.isFinite(s.y)) {
        const onScreen = screen.getAllDisplays().some(({ workArea: a }) =>
            s.x + 100 > a.x && s.x < a.x + a.width - 100 && s.y >= a.y - 10 && s.y < a.y + a.height - 100);
        if (onScreen) { out.x = Math.round(s.x); out.y = Math.round(s.y); }
    }
    return out;
}

// Nach dem Erzeugen anhängen: speichert gebündelt, die Größe außerhalb von Maximiert/Vollbild.
function track(win) {
    let t = 0;
    const save = () => {
        if (win.isDestroyed()) return;
        const b = win.getNormalBounds();
        const s = { width: b.width, height: b.height, x: b.x, y: b.y, maximized: win.isMaximized() };
        try { fs.writeFileSync(file(), JSON.stringify(s)); } catch {}
    };
    const later = () => { clearTimeout(t); t = setTimeout(save, 500); };
    for (const ev of ['resize', 'move', 'maximize', 'unmaximize']) win.on(ev, later);
    win.on('close', () => { clearTimeout(t); save(); });
}

module.exports = { load, track };
