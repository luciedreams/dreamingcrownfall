// Home: Übersicht aller Accounts in einem eigenen Tab, links in der Tab-Leiste. Gibt es nur ab
// zwei Accounts — mit einem bliebe die Übersicht eine Kopie der Kopfzeile des Spiels.
// Daten holt jeder Spiel-Tab selbst (Seitenkontext = Cookie seiner Partition), und nur solange
// Home zu sehen ist: beim Öffnen sofort, dann alle 30 s. Wer Home nicht ansieht, zahlt nichts.
//   Kopfzeile des Spiels  → Tickets und ihr Status („Earning …“ / „Inactive …“), live vom Socket
//   /api/stats/me         → Punkte, Gold, VIP, Thron-Werte der Episode
//   /api/king/beverages/me → Diamanten (balances.diamonds)
//   /api/dailies          → Quests (erledigt/abholbar) und Daily Items (abholbar), Regeln wie in der Spiel-Ebene
// King: aus dem Snapshot des Notifiers (alle 15 s).

const path = require('path');
const { WebContentsView, ipcMain } = require('electron');

const EVERY_MS = 30 * 1000;

const COLLECT_JS = `(async () => {
    const cell = (r) => document.querySelector('[data-role="metric-cell"][data-metric-role="' + r + '"]');
    const t = cell('tickets');
    const lines = t ? t.innerText.split('\\n').map((s) => s.trim()).filter(Boolean) : [];
    const tickets = Number(String(t?.querySelector('[data-role="tickets"]')?.textContent || '').replace(/[^0-9]/g, '')) || null;
    const j = (p) => fetch(p, { credentials: 'same-origin', headers: { accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [stats, bev, daily] = await Promise.all([j('/api/stats/me'), j('/api/king/beverages/me'), j('/api/dailies')]);
    const quests = Array.isArray(daily?.quests?.quests) ? daily.quests.quests : [];
    const items = Array.isArray(daily?.dailyItems?.items) ? daily.dailyItems.items : [];
    return {
        tickets,
        ticketStatus: lines.slice(2).join(' · '),
        points: stats?.current?.currentPoints ?? null,
        gold: stats?.current?.currentGold ?? null,
        vip: stats?.current?.vipPoints ?? null,
        kingMinutes: stats?.episode?.totalTimeAsKingMinutes ?? null,
        throneCaptures: stats?.episode?.throneCaptures ?? null,
        diamonds: bev?.balances?.diamonds ?? null,
        quests: {
            total: quests.length,
            done: quests.filter((q) => q.complete === true).length,
            claimable: quests.filter((q) => q.complete === true && q.claimState !== 'claimed' && q.claimState !== 'pending').length,
        },
        items: {
            total: items.length,
            claimable: items.filter((i) => i.status !== 'claimed' && i.status !== 'locked').length,
        },
        resetAtMs: Number(daily?.questsResetAtMs) || null,
    };
})()`;

module.exports = function createHome({ win, views, label, kingNow, onSelect }) {
    const view = new WebContentsView({ webPreferences: {
        preload: path.join(__dirname, 'home-preload.js'), contextIsolation: true, sandbox: true,
    } });
    view.setBackgroundColor('#14101c');
    view.webContents.loadFile(path.join(__dirname, 'home.html'));
    view.setVisible(false);
    win.contentView.addChildView(view);

    const data = new Map(); // view-Eintrag → { at, ...Werte }
    let timer = null, shown = false;

    const available = () => views.length >= 2;

    function snapshot() {
        const k = kingNow();
        return {
            king: k ? { name: k.name, since: k.since, mine: views.findIndex((v) => v.playerId && v.playerId === k.playerId) } : null,
            accounts: views.map((v, i) => ({
                index: i,
                name: label(v),
                avatar: v.avatar || '',
                guest: v.guest,
                loading: v.view.webContents.isLoading(),
                ...(data.get(v) || {}),
            })),
        };
    }
    function push() {
        if (!view.webContents.isDestroyed()) view.webContents.send('home:state', snapshot());
    }

    async function collect() {
        await Promise.all(views.map(async (v) => {
            const wc = v.view.webContents;
            if (v.guest || wc.isDestroyed() || wc.isLoading()) return;
            const d = await wc.executeJavaScript(COLLECT_JS).catch(() => null);
            if (d) data.set(v, { at: Date.now(), ...d });
        }));
        push();
    }

    function setVisible(on) {
        shown = on;
        view.setVisible(on);
        clearInterval(timer);
        timer = null;
        if (on) {
            push();          // was schon da ist, sofort
            collect();
            timer = setInterval(collect, EVERY_MS);
        }
    }

    ipcMain.handle('home:state', () => snapshot());
    ipcMain.on('home:select', (_e, i) => onSelect(Number(i)));
    ipcMain.on('home:refresh', () => { if (shown) collect(); });

    return { view, available, setVisible, push, forget: (v) => data.delete(v) };
};
