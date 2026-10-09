// Kompakt-HUD: kleines Fenster, immer oben. Was es zeigt und wie es aussieht, stellt jede Person
// selbst ein (Settings › HUD, hud-config.js). Auf/zu mit F2 (nur bei fokussierter App,
// main.js/handleKeys), im Tray oder in den Settings. Ohne Rahmen, an sich selbst verschiebbar,
// durchsichtig (Deckkraft), zeigt sich, ohne den Fokus zu nehmen, und passt seine Größe dem
// Inhalt an. Abgerufen wird nur, was eingeschaltet ist, und nur solange es offen ist:
//   Kopfzeile jedes Spiel-Tabs (Tickets + Status)  alle 10 s  — kein API-Aufruf
//   /api/stats/me, /api/king/beverages/me, /api/dailies  alle 60 s  — nur für Gold/Diamanten/Abholbares
// King und Royal Celebration kommen aus dem Snapshot des Notifiers.

const fs = require('fs');
const path = require('path');
const { BrowserWindow, ipcMain, webContents } = require('electron');
const config = require('./hud-config.js');

const FAST_MS = 10 * 1000;
const SLOW_MS = 60 * 1000;

const HEADER_JS = `(() => { const c = document.querySelector('[data-role="metric-cell"][data-metric-role="tickets"]');
    if (!c) return null;
    const n = Number(String(c.querySelector('[data-role="tickets"]')?.textContent || '').replace(/[^0-9]/g, ''));
    const status = c.innerText.split('\\n').map((s) => s.trim()).filter(Boolean).slice(2).join(' ');
    return { tickets: Number.isFinite(n) ? n : null, earning: /earning/i.test(status) && !/not earning/i.test(status) }; })()`;

const API_JS = `(async () => {
    const j = (p) => fetch(p, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [stats, bev, daily] = await Promise.all([j('/api/stats/me'), j('/api/king/beverages/me'), j('/api/dailies')]);
    const quests = Array.isArray(daily?.quests?.quests) ? daily.quests.quests : [];
    const items = Array.isArray(daily?.dailyItems?.items) ? daily.dailyItems.items : [];
    return {
        gold: stats?.current?.currentGold ?? null,
        diamonds: bev?.balances?.diamonds ?? null,
        claim: quests.filter((q) => q.complete === true && q.claimState !== 'claimed' && q.claimState !== 'pending').length
             + items.filter((i) => i.status !== 'claimed' && i.status !== 'locked').length,
    };
})()`;

module.exports = function createHud({ views, kingNow, icon, onToggle }) {
    let win = null, fast = null, slow = null;
    const header = new Map(), api = new Map(); // view-Eintrag → letzte Werte
    const live = (v) => !v.guest && !v.view.webContents.isDestroyed() && !v.view.webContents.isLoading();

    function data() {
        const k = kingNow();
        const mine = k ? views.findIndex((v) => v.playerId && v.playerId === k.playerId) : -1;
        const acc = views.filter((v) => !v.guest);
        const sum = (map, key) => (acc.some((v) => map.get(v)?.[key] != null) ? acc.reduce((n, v) => n + (map.get(v)?.[key] || 0), 0) : null);
        return {
            king: k ? { name: mine >= 0 ? (views[mine].name || k.name) : k.name, since: k.since, mine: mine >= 0 } : null,
            rc: k?.rc || null,
            tickets: sum(header, 'tickets'),
            perAccount: acc.map((v) => ({ name: v.name || 'Account', tickets: header.get(v)?.tickets ?? null, earning: !!header.get(v)?.earning })),
            earning: { n: acc.filter((v) => header.get(v)?.earning).length, total: acc.length },
            gold: sum(api, 'gold'),
            diamonds: sum(api, 'diamonds'),
            claim: sum(api, 'claim'),
        };
    }
    const state = () => ({ cfg: config.get(), data: data() });

    function send() {
        if (win && !win.isDestroyed()) win.webContents.send('hud:state', state());
    }
    async function readHeaders() {
        const on = config.get().items.some((i) => i.on && ['tickets', 'ticketsPer', 'earning'].includes(i.id));
        if (on) await Promise.all(views.filter(live).map(async (v) => {
            const d = await v.view.webContents.executeJavaScript(HEADER_JS).catch(() => null);
            if (d) header.set(v, d);
        }));
        send();
    }
    async function readApi() {
        if (!config.enabled('money') && !config.enabled('claim')) return;
        await Promise.all(views.filter(live).map(async (v) => {
            const d = await v.view.webContents.executeJavaScript(API_JS).catch(() => null);
            if (d) api.set(v, d);
        }));
        send();
    }

    function open() {
        if (win && !win.isDestroyed()) { win.showInactive(); return; }
        win = new BrowserWindow({
            width: 560, height: 44, frame: false, transparent: true, hasShadow: false, resizable: false,
            alwaysOnTop: true, skipTaskbar: true, fullscreenable: false, minimizable: false, maximizable: false,
            show: false, icon, title: 'DreamingCrownfall HUD',
            webPreferences: { preload: path.join(__dirname, 'hud-preload.js'), contextIsolation: true, sandbox: true },
        });
        win.setAlwaysOnTop(true, 'screen-saver');
        win.loadFile(path.join(__dirname, 'hud.html'));
        win.once('ready-to-show', () => { win.showInactive(); readHeaders(); readApi(); });
        win.on('closed', () => { win = null; clearInterval(fast); clearInterval(slow); fast = slow = null; onToggle(false); broadcast(); });
        fast = setInterval(readHeaders, FAST_MS);
        slow = setInterval(readApi, SLOW_MS);
        onToggle(true);
        broadcast();
    }
    function close() { if (win && !win.isDestroyed()) win.close(); }
    const isOpen = () => !!(win && !win.isDestroyed());
    function toggle() { if (isOpen()) close(); else open(); }

    // Settings-Seiten in allen Tabs auf dem Laufenden halten (Vorschau, „HUD offen“).
    function broadcast() {
        const s = { cfg: config.get(), open: isOpen() };
        for (const wc of webContents.getAllWebContents()) if (!wc.isDestroyed()) wc.send('dcf:hud:changed', s);
    }

    // HUD-Fenster
    ipcMain.handle('hud:state', () => state());
    ipcMain.on('hud:close', close);
    ipcMain.on('hud:fit', (_e, w, h) => {
        if (!win || win.isDestroyed()) return;
        const W = Math.max(120, Math.min(1600, Math.ceil(Number(w) || 0))), H = Math.max(28, Math.min(1000, Math.ceil(Number(h) || 0)));
        win.setResizable(true); win.setContentSize(W, H); win.setResizable(false);
    });
    // Settings › HUD (Brücke im Preload des Spiels)
    ipcMain.on('dcf:hud:get', (e) => { e.returnValue = { cfg: config.get(), open: isOpen() }; });
    ipcMain.on('dcf:hud:set', (_e, c) => {
        config.set(c);
        send();
        broadcast();
        if (isOpen()) { readHeaders(); readApi(); } // ein neu eingeschalteter Baustein bekommt sofort Werte
    });
    ipcMain.on('dcf:hud:toggle', () => toggle());
    ipcMain.handle('dcf:hud:data', () => data());
    ipcMain.on('dcf:hud:renderer', (e) => { try { e.returnValue = fs.readFileSync(path.join(__dirname, 'hud-render.js'), 'utf8'); } catch { e.returnValue = ''; } });

    return { open, close, toggle, isOpen };
};
