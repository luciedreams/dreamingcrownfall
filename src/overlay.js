// Eine Ebene über dem Spiel (seit 0.7.0, damit die App nicht mehr wie ein Browser wirkt). Die Wechsel
// zwischen Tabs laufen NICHT hierüber (Schleier in den Seiten selbst, main.js transition) — Bilder per
// capturePage und eine Ebene darüber störten unter Wayland das Zeichnen der Tabs (17.10.).
//   Laden        solange der Tab vorn noch lädt: Porträt, „Loading <Name> …“ statt leerer Seite.
//   Fehler       statt Chromiums grauer Fehlerseite: eigene Seite mit „Try again now“.
// Die Ebene ist ein eigener durchsichtiger View ganz oben. Solange sie nichts zeigt, wird sie NICHT
// versteckt, sondern außerhalb des Fensters geparkt: ein versteckter View zeichnet nicht weiter und
// zeigte beim Wiederanzeigen sein altes Bild (bei Luce ein schmaler „Loading“-Streifen über der
// ladenden Seite — per Bildschirmaufnahme gefunden, 17.10.). Geparkt bleibt er lebendig.

const path = require('path');
const { WebContentsView, ipcMain } = require('electron');

const ACK_MS = 400;   // so lange wird höchstens auf die Seite gewartet

module.exports = function createOverlay({ win, onRetry }) {
    const view = new WebContentsView({ webPreferences: {
        preload: path.join(__dirname, 'overlay-preload.js'), contextIsolation: true, sandbox: true,
    } });
    view.setBackgroundColor('#00000000');
    view.webContents.loadFile(path.join(__dirname, 'overlay.html'));
    win.contentView.addChildView(view);
    let area = { x: 0, y: 0, width: 800, height: 600 }, onStage = false;
    const place = () => view.setBounds(onStage ? area : { ...area, x: -area.width - 200 });
    place();
    const wc = view.webContents;

    let loaded = false, queue = [];
    wc.once('did-finish-load', () => { loaded = true; for (const m of queue) wc.send('overlay:show', m); queue = []; });

    let seq = 0;
    const waiting = new Map();
    let shown = 'none';   // was die Ebene gerade zeigt: none | loading | error
    let lastKey = '';     // Lade-/Fehlerbild nicht bei jedem Aufruf neu zeichnen

    function send(m) {
        const id = ++seq;
        return new Promise((resolve) => {
            const t = setTimeout(() => { waiting.delete(id); resolve(); }, ACK_MS);
            waiting.set(id, () => { clearTimeout(t); resolve(); });
            const msg = { ...m, id };
            if (loaded) wc.send('overlay:show', msg); else queue.push(msg);
        });
    }
    ipcMain.on('overlay:ack', (e, id) => { if (e.sender !== wc) return; const r = waiting.get(id); waiting.delete(id); r?.(); });
    ipcMain.on('overlay:done', (e) => { if (e.sender === wc && shown === 'none') { onStage = false; place(); } });
    ipcMain.on('overlay:retry', (e) => { if (e.sender === wc) onRetry(); });

    // Ganz nach oben (über die gerade gewählte Ansicht) und sichtbar.
    function raise() {
        win.contentView.addChildView(view);
        if (!onStage) { onStage = true; place(); }
    }

    return {
        view,
        // Aus layout() in main.js: Fläche unter der Leiste. Geparkt bleibt die Größe gleich.
        setArea(b) { area = b; place(); },
        // m: { kind: 'loading' | 'error', name, avatar, icon, code, desc, detail }
        async screen(m, instant = false) {
            const key = JSON.stringify(m);
            if (shown === m.kind && key === lastKey) return;
            lastKey = key;
            raise();
            shown = m.kind;
            await send({ ...m, instant });
        },
        reveal() {
            if (shown === 'none') return;
            shown = 'none';
            lastKey = '';
            send({ kind: 'reveal' });
        },
        state: () => shown,
    };
};
