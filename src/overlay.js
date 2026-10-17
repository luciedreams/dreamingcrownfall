// Eine Ebene über dem Spiel (seit 0.7.0, damit die App nicht mehr wie ein Browser wirkt):
//   Wechsel      zwischen Accounts, Home und Stats: Bild des alten Tabs einfrieren (capturePage) und
//                verschwimmen lassen, dahinter umschalten, warten bis die neue Seite fertig gezeichnet
//                ist, dann IHR Bild unscharf einblenden und scharf werden lassen — nie die Seite im Aufbau.
//   Laden        solange der Tab vorn noch lädt: Porträt, „Loading <Name> …“ statt leerer Seite.
//   Fehler       statt Chromiums grauer Fehlerseite: eigene Seite mit „Try again now“.
// Die Ebene ist ein eigener durchsichtiger View ganz oben; versteckt, solange sie nichts zeigt
// (sonst finge sie Klicks ab).

const path = require('path');
const { WebContentsView, ipcMain } = require('electron');

const ACK_MS = 1200;  // so lange wird höchstens auf die Seite gewartet (Aufblenden dauert ~760 ms)

module.exports = function createOverlay({ win, onRetry }) {
    const view = new WebContentsView({ webPreferences: {
        preload: path.join(__dirname, 'overlay-preload.js'), contextIsolation: true, sandbox: true,
    } });
    view.setBackgroundColor('#00000000');
    view.webContents.loadFile(path.join(__dirname, 'overlay.html'));
    view.setVisible(false);
    win.contentView.addChildView(view);
    const wc = view.webContents;

    let loaded = false, queue = [];
    wc.once('did-finish-load', () => { loaded = true; for (const m of queue) wc.send('overlay:show', m); queue = []; });

    let seq = 0;
    const waiting = new Map();
    let shown = 'none';   // was die Ebene gerade zeigt: none | cover | dip | arrived | loading | error
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
    ipcMain.on('overlay:done', (e) => { if (e.sender === wc && shown === 'none') view.setVisible(false); });
    ipcMain.on('overlay:retry', (e) => { if (e.sender === wc) onRetry(); });

    async function snap(contents) {
        if (!contents || contents.isDestroyed()) return null;
        let img = null;
        try { img = await contents.capturePage(); } catch {}
        return img && !img.isEmpty() ? 'data:image/jpeg;base64,' + img.toJPEG(90).toString('base64') : null;
    }

    // Ganz nach oben (über die gerade gewählte Ansicht) und sichtbar.
    function raise() {
        win.contentView.addChildView(view);
        view.setVisible(true);
    }

    return {
        view,
        // Bild des bisherigen Tabs festhalten, bevor umgeschaltet wird. Ohne Bild (z. B. Fenster
        // versteckt) einfach weiter — dann eben ohne Überblenden.
        async cover(contents) {
            const img = await snap(contents);
            if (!img) return false;
            raise();
            shown = 'cover';
            lastKey = '';
            await send({ kind: 'cover', img });
            return true;
        },
        // Nach cover(): das Bild verschwimmt und dunkelt ab; aufgelöst, wenn es so weit ist (dann umschalten).
        async dip() {
            if (shown !== 'cover') return;
            shown = 'dip';
            await send({ kind: 'dip' });
        },
        // Nach dem Umschalten: Bild der fertig gezeichneten neuen Seite unscharf einblenden, scharf werden lassen.
        async arrive(contents) {
            if (shown !== 'dip') return false;
            const img = await snap(contents);
            if (!img) return false;
            shown = 'arrived';
            await send({ kind: 'arrive', img });
            return true;
        },
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
