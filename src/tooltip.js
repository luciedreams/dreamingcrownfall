// Eigene Tooltips statt der grauen Browser-Kästchen (seit 0.7.0, Luces Wahl „kompakt wie Rechtsklick“):
// jedes title-Attribut zeigt nach kurzer Pause ein Kästchen im App-Look. Der Hauptprozess spielt den
// Zeichner (PAGE unten) in jeden Frame der Spielseiten, ausgekoppelten Fenster, Home und Stats ein.
// Solange der Zeiger auf einem Element steht, ist sein title-Attribut entfernt (sonst käme das
// Browser-Kästchen obendrauf) und kommt beim Verlassen zurück — Seiten, die es lesen oder ändern,
// merken davon nichts.
// Account-Leiste: zu niedrig für ein Kästchen darunter — sie meldet Text und Lage (tabs:tip), und die
// Ansicht darunter zeichnet es (show()).

const { webFrameMain } = require('electron');

// Läuft in der Seite (Hauptwelt des jeweiligen Frames), deshalb ohne äußere Namen.
// forward: statt zu zeichnen an window.tabs.tip melden (Account-Leiste).
function PAGE(forward) {
    if (window.__dcfTip) return;
    const DELAY = 300;   // bis zum ersten Kästchen
    const WARM = 500;    // so lange danach erscheint das nächste sofort
    const CSS = `
        :host { all: initial; }
        .t { position: fixed; z-index: 2147483647; max-width: 300px; padding: 6px 9px; border-radius: 8px; box-sizing: border-box;
             background: linear-gradient(180deg, rgba(36, 26, 58, 0.98), rgba(20, 15, 32, 0.98));
             border: 1px solid rgba(180, 138, 232, 0.35); box-shadow: 0 10px 26px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.3);
             font: 600 12px/1.35 system-ui, sans-serif; color: #ece4f7; white-space: pre-line; overflow-wrap: anywhere;
             pointer-events: none; user-select: none; opacity: 0; transform: translateY(-2px); transition: opacity 110ms ease-out, transform 110ms ease-out; }
        .t.on { opacity: 1; transform: none; }
        .t.up { transform: translateY(2px); }
        .t.up.on { transform: none; }`;
    let host = null, box = null, cur = null, saved = '', timer = 0, warmUntil = 0, shown = false;

    function ensure() {
        if (host && host.isConnected) return;
        host = document.createElement('dcf-tooltip');
        const root = host.attachShadow({ mode: 'closed' });
        const st = document.createElement('style');
        st.textContent = CSS;
        box = document.createElement('div');
        box.className = 't';
        root.append(st, box);
        document.documentElement.append(host);
    }
    function draw(text, r) {
        ensure();
        box.textContent = text;
        box.classList.remove('on', 'up');
        const w = box.offsetWidth, h = box.offsetHeight;
        let y = r.bottom + 8, up = false;
        if (y + h > innerHeight - 6 && r.top - h - 8 >= 6) { y = r.top - h - 8; up = true; }
        const x = Math.max(6, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 6));
        box.style.left = Math.round(x) + 'px';
        box.style.top = Math.round(Math.max(6, y)) + 'px';
        if (up) box.classList.add('up');
        void box.offsetWidth;
        box.classList.add('on');
        shown = true;
    }
    function undraw() {
        if (shown) warmUntil = Date.now() + WARM;
        shown = false;
        if (box) box.classList.remove('on');
    }
    function release() {
        clearTimeout(timer);
        if (cur && saved && !cur.hasAttribute('title')) cur.setAttribute('title', saved);
        cur = null;
        saved = '';
        if (forward) { if (shown) { shown = false; warmUntil = Date.now() + WARM; forward(null); } }
        else undraw();
    }
    function enter(el) {
        const text = (el.getAttribute('title') || '').trim();
        release();
        if (!text) return;
        cur = el;
        saved = el.getAttribute('title');
        el.removeAttribute('title');
        const go = () => {
            if (cur !== el || !el.isConnected) return;
            const b = el.getBoundingClientRect();
            const r = { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
            if (forward) { shown = true; forward(text, r); } else draw(text, r);
        };
        clearTimeout(timer);
        if (Date.now() < warmUntil) go(); else timer = setTimeout(go, DELAY);
    }

    document.addEventListener('pointerover', (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        if (cur && cur.contains(t)) return;
        const el = t.closest('[title]');
        if (el) enter(el); else if (cur) release();
    }, true);
    document.addEventListener('pointerout', (e) => {
        if (cur && (!e.relatedTarget || !cur.contains(e.relatedTarget))) release();
    }, true);
    for (const ev of ['pointerdown', 'wheel', 'keydown']) document.addEventListener(ev, () => { if (cur) { release(); warmUntil = 0; } }, true);
    window.addEventListener('scroll', () => { if (cur) release(); }, true);
    window.addEventListener('blur', () => { if (cur) release(); });

    window.__dcfTip = {
        // Für die Account-Leiste: Kästchen an einer Stelle dieser Ansicht zeichnen (r in ihren Koordinaten).
        show: (text, r) => { if (text) draw(String(text), r); else undraw(); },
    };
}

const code = (forward) => `(${PAGE.toString()})(${forward ? 'window.tabs && window.tabs.tip' : ''})`;

function inject(frame, forward) {
    try { frame.executeJavaScript(code(forward)).catch(() => {}); } catch {}
}

module.exports = {
    // Jede Seite des Views und jedes iframe (Spielseiten in MLF-Fenstern).
    attach(wc, { forward = false } = {}) {
        wc.on('dom-ready', () => inject(wc.mainFrame, forward));
        if (forward) return;
        wc.on('did-frame-finish-load', (_e, isMain, pid, rid) => {
            if (isMain) return;
            const f = webFrameMain.fromId(pid, rid);
            if (f) inject(f, false);
        });
    },
    // Ausgekoppeltes Fenster: about:blank bekommt kein dom-ready mehr, sobald die App-Schicht es befüllt.
    injectNow(wc) { if (!wc.isDestroyed()) inject(wc.mainFrame, false); },
    // Meldung der Account-Leiste an die Ansicht darunter (barHeight: um so viel liegt sie tiefer).
    showIn(wc, text, r, barHeight) {
        if (!wc || wc.isDestroyed()) return;
        const rr = r ? { left: r.left, top: r.top - barHeight, right: r.right, bottom: r.bottom - barHeight, width: r.width, height: r.height } : null;
        wc.executeJavaScript(`window.__dcfTip && window.__dcfTip.show(${JSON.stringify(text || '')}, ${JSON.stringify(rr)})`).catch(() => {});
    },
};
