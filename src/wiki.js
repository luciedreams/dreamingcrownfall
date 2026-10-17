// Das Wiki der Community (marblecrownfall.wikioasis.org, CookingSum) als eigener Bereich wie Stats
// (seit 0.7.0, Luce 17.10.): Knopf oben rechts in der Leiste und Eintrag im ESC-Menü. Eigene, bleibende
// Sitzung (persist:wiki), damit ein Wiki-Login hält. Seiten von wikioasis.org bleiben in der App, alles
// andere geht in den System-Browser. Zurück/Vor: Maustasten 4/5 hier, Alt+←/→ in main.js/handleKeys.

const { WebContentsView, shell } = require('electron');

const START = 'https://marblecrownfall.wikioasis.org/';
const inside = (url) => {
    try { const u = new URL(url); return u.protocol === 'https:' && (u.hostname === 'wikioasis.org' || u.hostname.endsWith('.wikioasis.org')); } catch { return false; }
};
// Wie bei Stats: Scrollbalken in App-Farben, nichts ziehbar, kein Fokusrahmen nach Klicks; dazu die
// Seitentasten der Maus, die in einer App sonst nichts tun.
const PAGE_CSS = `html { scrollbar-color: rgba(180, 138, 232, 0.45) transparent; scrollbar-width: thin; }
    img, a { -webkit-user-drag: none; } :focus:not(:focus-visible) { outline: none; }`;
const MOUSE_JS = `(() => { if (window.__dcfWikiNav) return; window.__dcfWikiNav = true;
    addEventListener('mouseup', (e) => { if (e.button === 3) { e.preventDefault(); history.back(); } else if (e.button === 4) { e.preventDefault(); history.forward(); } }); })()`;

module.exports = function createWiki({ win, wire = () => {} }) {
    let view = null, loaded = false;

    function ensureView() {
        if (view) return view;
        view = new WebContentsView({ webPreferences: { partition: 'persist:wiki', contextIsolation: true, sandbox: true } });
        view.setBackgroundColor('#00000000');   // durchsichtig wie Stats: ohne Bild scheint der Fenstergrund durch
        const wc = view.webContents;
        wc.setWindowOpenHandler(({ url }) => {
            if (inside(url)) wc.loadURL(url); else if (/^https?:/.test(url)) shell.openExternal(url);
            return { action: 'deny' };
        });
        wc.on('will-navigate', (e, url) => { if (!inside(url)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
        wire(wc);
        wc.on('dom-ready', () => { wc.insertCSS(PAGE_CSS).catch(() => {}); wc.executeJavaScript(MOUSE_JS).catch(() => {}); });
        wc.on('did-finish-load', () => wc.setVisualZoomLevelLimits(1, 1).catch(() => {}));
        view.setVisible(false);
        win.contentView.addChildView(view);
        return view;
    }

    function show() {
        const v = ensureView();
        if (!loaded) { loaded = true; v.webContents.loadURL(START); }
        return v;
    }

    // Beim Start im Hintergrund laden (main.js primeTabs) — höchstens 10 s.
    function preload() {
        const v = ensureView();
        if (loaded) return Promise.resolve(v);
        loaded = true;
        return new Promise((r) => {
            const t = setTimeout(() => r(v), 10000);
            v.webContents.once('did-finish-load', () => { clearTimeout(t); r(v); });
            v.webContents.loadURL(START);
        });
    }

    return { show, preload, view: () => view };
};
