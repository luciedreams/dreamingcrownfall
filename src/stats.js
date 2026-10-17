// MarbleMind-Statistik: die öffentliche Seite marblemind.fun/public als eigener Tab „Stats“, dazu ihre
// Tageswerte für Home und HUD. Nur mit Schalter (Settings › Stats, `stats.enabled`, Standard aus).
// Nur öffentliche Adressen, ohne Login und ohne Cookies — die App schickt nichts über die Person mit:
//   /public                    → der Tab (lädt erst beim ersten Öffnen)
//   /api/public/home?from=…    → „Today“: Runs, Ø Spieler, Regentschaften, Angriffe, Rebellionen, Chat,
//                                 Freeze-Rate 24 h/7 Tage — dieselben Zahlen wie oben auf der Seite
//   /api/public/stats/droughts → wie lange jede Rarität schon nicht mehr kam (Median, Rekord)
// Abgerufen wird nur, solange jemand hinsieht (Home sichtbar oder HUD mit einem dieser Bausteine offen):
// „Today“ alle 30 s (so lange cacht auch der Server), Droughts alle 5 min.

const { WebContentsView, net, shell } = require('electron');

const BASE = 'https://marblemind.fun';
const TODAY_MS = 30 * 1000;
const DROUGHTS_MS = 5 * 60 * 1000;
// Unterseiten der öffentlichen Seite, die Home und HUD direkt öffnen (public.html, TAB_IDS).
const PAGE_TABS = ['home', 'activity', 'rotation', 'tileguide', 'shops', 'shop-king', 'shop-chat', 'shop-marble', 'freezes', 'chat', 'king', 'attacks', 'rebellions'];

const isPublicPage = (url) => {
    try { const u = new URL(url); return u.origin === BASE && (u.pathname === '/public' || u.pathname.startsWith('/public/')); } catch { return false; }
};

async function getJson(path) {
    const r = await net.fetch(BASE + path, { headers: { accept: 'application/json' }, credentials: 'omit', cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}

// wire(wc): main.js hängt seine Tastenkürzel an (Strg+Tab, F5, F2 …) wie bei den anderen Tabs.
module.exports = function createStats({ win, setting, onSettingsChange, onChange, wire = () => {} }) {
    let view = null, loaded = false;
    let today = null, droughts = null, todayAt = 0, droughtsAt = 0, failed = false;
    let timer = null;
    const wanted = new Set();   // wer gerade Daten braucht: 'home', 'hud'

    const enabled = () => setting('stats.enabled') === true;

    // ---- Tab ------------------------------------------------------------------------------------
    function ensureView() {
        if (view) return view;
        view = new WebContentsView({ webPreferences: { partition: 'marblemind-public', contextIsolation: true, sandbox: true } });
        view.setBackgroundColor('#00000000');   // durchsichtig: ohne Bild scheint der Fenstergrund (Schleierfarbe) durch
        const wc = view.webContents;
        // Alles außerhalb der öffentlichen Seite (Twitch-Profile, Spiel, Discord) im System-Browser.
        wc.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
        wc.on('will-navigate', (e, url) => { if (!isPublicPage(url)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
        wire(wc);
        view.setVisible(false);
        win.contentView.addChildView(view);
        return view;
    }
    const tabUrl = (tab) => `${BASE}/public${PAGE_TABS.includes(tab) ? `?tab=${tab}` : ''}`;
    // Sichtbar machen; tab = Unterseite (aus Home/HUD) — ohne bleibt die Seite, wo sie war.
    function show(tab) {
        const v = ensureView();
        if (!loaded || tab) {
            loaded = true;
            const wc = v.webContents;
            // Schon geladen: nur umschalten (switchTab der Seite), sonst neu laden mit ?tab=.
            if (tab && wc.getURL() && isPublicPage(wc.getURL()) && !wc.isLoading()) {
                wc.executeJavaScript(`typeof switchTab === 'function' ? (switchTab(${JSON.stringify(tab)}), true) : false`)
                    .then((ok) => { if (!ok) wc.loadURL(tabUrl(tab)); }).catch(() => wc.loadURL(tabUrl(tab)));
            } else wc.loadURL(tabUrl(tab));
        }
        return v;
    }

    // ---- Daten ----------------------------------------------------------------------------------
    // „Heute“ wie auf der Seite: seit Mitternacht der Person, die zusieht.
    const midnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

    async function poll(force = false) {
        if (!enabled() || !wanted.size) return;
        const now = Date.now();
        const jobs = [];
        if (force || now - todayAt >= TODAY_MS - 1000) jobs.push(getJson(`/api/public/home?from=${midnight()}`).then((d) => { today = d; todayAt = Date.now(); }));
        if (force || now - droughtsAt >= DROUGHTS_MS - 1000) jobs.push(getJson('/api/public/stats/droughts').then((d) => { droughts = d; droughtsAt = Date.now(); }));
        if (!jobs.length) return;
        const res = await Promise.allSettled(jobs);
        const bad = res.find((r) => r.status === 'rejected');
        if (bad && !failed) console.error(`[dcf] MarbleMind-Statistik nicht erreichbar: ${bad.reason?.message || bad.reason}`);
        failed = !!bad;
        onChange();
    }
    function schedule() {
        clearInterval(timer);
        timer = null;
        if (enabled() && wanted.size) { poll(); timer = setInterval(poll, TODAY_MS); }
    }
    // Home/HUD melden an und ab, ob sie gerade Daten brauchen.
    function want(who, on) {
        const had = wanted.has(who);
        if (on) wanted.add(who); else wanted.delete(who);
        if (had !== on) schedule();
    }

    // Für Home und HUD: nur die fertigen Zahlen, null solange nichts da ist oder der Schalter aus ist.
    function data() {
        if (!enabled()) return null;
        const h = today?.heute || null, f = today?.freeze || null;
        return {
            at: todayAt || null,
            failed,
            today: h && {
                runs: h.runs ?? null, players: h.spieler ?? null, reigns: h.regentschaften ?? null,
                attacks: h.angriffe ?? null, rebellions: h.rebellionen ?? null, chat: h.chat ?? null,
            },
            frozen: f && { rate24h: f.rate24h ?? null, rate7d: f.rate7d ?? null },
            droughts: Array.isArray(droughts?.rows)
                ? droughts.rows.map((r) => ({ rarity: r.rarity, median: r.median_min, longest: r.max_min, since: r.since_min }))
                : null,
        };
    }

    // Schalter aus: Tab verschwindet (main.js), Abrufe stoppen. An: wer schon wartet, bekommt gleich Werte.
    let was = enabled();
    onSettingsChange(() => {
        const now = enabled();
        if (now === was) return;
        was = now;
        if (!now) { today = droughts = null; todayAt = droughtsAt = 0; }
        schedule();
        onChange();
    });

    // Beim Start im Hintergrund laden (main.js primeTabs), damit der erste Wechsel nicht die halb
    // geladene Seite zeigt. Aufgelöst, sobald sie geladen ist (höchstens 10 s).
    function preload() {
        if (!enabled()) return Promise.resolve(null);
        const v = ensureView();
        if (loaded) return Promise.resolve(v);
        loaded = true;
        const wc = v.webContents;
        return new Promise((r) => {
            const t = setTimeout(() => r(v), 10000);
            wc.once('did-finish-load', () => { clearTimeout(t); r(v); });
            wc.loadURL(tabUrl());
        });
    }

    return { enabled, show, preload, view: () => view, want, data, refresh: () => poll(true) };
};
