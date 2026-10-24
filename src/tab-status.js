// Werte für die Account-Rahmen in der Tab-Leiste (Unit-Frames): je Spiel-Tab Punkte, Tickets und ob
// sie gerade verdient werden, Daily Quests (erledigt/gesamt), VIP-Stufe und Abholbares. Läuft immer,
// solange die App offen ist — die Leiste ist immer zu sehen:
//   Kopfzeile des Spiels (Tickets, Statuszeile) alle 10 s — kein Netzwerkabruf
//   geplante Rebellion (localStorage mcfo_reb_plans, mlf/king/rebellion-plan.js) im selben Abruf
//   /api/stats/me (Punkte, VIP), /api/dailies (Quests)  alle 60 s
// Regeln für „abholbar“ wie in Home und HUD.

const FAST_MS = 10 * 1000;
const SLOW_MS = 60 * 1000;

const HEADER_JS = `(() => { const c = document.querySelector('[data-role="metric-cell"][data-metric-role="tickets"]');
    if (!c) return null;
    const n = Number(String(c.querySelector('[data-role="tickets"]')?.textContent || '').replace(/[^0-9]/g, ''));
    // Statuszeile des Spiels („Active: Earning Tickets“) direkt, nicht die Kopie in der Ticket-Karte:
    // die fehlt bei ausgeschaltetem Current/Next, und innerText einer versteckten Kopfzeile hat keine Zeilen.
    const s = document.querySelector('[data-role="session-cell"] [data-role="socket"]') || document.querySelector('[data-role="socket"]');
    const status = String(s?.textContent || '').trim();
    let plan = null;
    try {
        const l = JSON.parse(localStorage.getItem('mcfo_reb_plans') || '[]');
        const p = l.filter((x) => x.state === 'planned').sort((a, b) => a.start - b.start)[0];
        const warn = l.some((x) => !x.seen && (x.state === 'failed' || x.state === 'missed'));
        if (p || warn) plan = { cost: p ? p.cost : null, start: p ? p.start : null, end: p ? p.end : null, tileset: p ? p.tilesetId : null, warn };
    } catch (e) {}
    return { tickets: Number.isFinite(n) && n > 0 ? n : null, earning: /earning/i.test(status) && !/not earning/i.test(status), plan }; })()`;

const API_JS = `(async () => {
    const j = (p) => fetch(p, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [stats, daily] = await Promise.all([j('/api/stats/me'), j('/api/dailies')]);
    const quests = Array.isArray(daily?.quests?.quests) ? daily.quests.quests : [];
    const items = Array.isArray(daily?.dailyItems?.items) ? daily.dailyItems.items : [];
    return {
        points: stats?.current?.currentPoints ?? null,
        vip: stats?.current?.vipPoints ?? null,
        questsDone: quests.filter((q) => q.complete === true).length,
        questsTotal: quests.length,
        claim: quests.filter((q) => q.complete === true && q.claimState !== 'claimed' && q.claimState !== 'pending').length
             + items.filter((i) => i.status !== 'claimed' && i.status !== 'locked').length,
    };
})()`;

module.exports = function startTabStatus({ views, onChange }) {
    const header = new Map(), api = new Map(); // view-Eintrag → letzte Werte
    const live = (v) => !v.guest && !v.view.webContents.isDestroyed() && !v.view.webContents.isLoading();

    async function read(map, js) {
        let changed = false;
        await Promise.all(views.filter(live).map(async (v) => {
            const d = await v.view.webContents.executeJavaScript(js).catch(() => null);
            if (!d) return;
            if (JSON.stringify(map.get(v)) !== JSON.stringify(d)) changed = true;
            map.set(v, d);
        }));
        if (changed) onChange();
    }
    const fast = () => read(header, HEADER_JS);
    const slow = () => read(api, API_JS);
    setInterval(fast, FAST_MS);
    setInterval(slow, SLOW_MS);

    return {
        // Für tabState() in main.js; null-Werte = noch nicht gelesen.
        of(v) {
            const h = header.get(v) || {}, a = api.get(v) || {};
            return {
                tickets: h.tickets ?? null, earning: h.earning ?? null, plan: h.plan ?? null,
                points: a.points ?? null, vip: a.vip ?? null, questsDone: a.questsDone ?? null, questsTotal: a.questsTotal ?? null, claim: a.claim ?? null,
            };
        },
        // Neu eingeloggter oder neu geladener Tab: gleich lesen statt bis zu einer Minute zu warten.
        refresh() { fast(); slow(); },
        forget(v) { header.delete(v); api.delete(v); },
    };
};
