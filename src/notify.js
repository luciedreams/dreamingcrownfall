// Systembenachrichtigungen für die drei Accounts.
//
// Quellen:
//   Chat-Socket (öffentlich, ein Anschluss)  → Erwähnungen, Rebellion-Start
//   /api/king/snapshot (öffentlich, 15 s)     → Thronwechsel eigener Accounts, Royal Celebration
//   je Account im Seitenkontext seines Tabs   → Achievements, Geschenke, Shop-Quest im Angebot
// Account-Abrufe laufen über executeJavaScript im Tab, damit sie genau den Cookie der Partition
// benutzen — wie das Spiel selbst. Erster Abruf je Quelle setzt nur den Wasserstand (keine Lawine
// beim Start); gemeldet wird erst, was danach neu dazukommt.
//
// Regel „nur wenn ich nicht hinschaue": Account-Ereignisse schweigen, wenn das Fenster den Fokus
// hat UND genau dieser Account-Tab vorne ist; allgemeine Ereignisse schweigen bei Fensterfokus.

const { Notification } = require('electron');

const BASE = 'https://marblecrownfall.com';
const KING_MS = 15_000;
const ACCOUNT_MS = 60_000;
const DAILIES_MS = 5 * 60_000;
const SHOPS = ['crowns', 'chat'];
const SHOP_KIND = { crown_shop: 'crowns', chat_shop: 'chat', marble_shop: 'marbles', misc_shop: 'misc' };
const RARITY = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6, ethereal: 7, cosmic: 8 };
const ACH_MARK = ',"families":';

module.exports = function startNotifier({ views, icon, isWatching, isFocused, focusTab }) {
    const st = {
        king: undefined,       // playerId des Kings beim letzten Snapshot
        kingName: '',
        celebs: new Set(),     // gemeldete Royal-Celebration-IDs
        shopRot: {},           // shopId → rotation.id des letzten Abrufs
        shopPinged: new Set(), // rotationId|definitionId
    };
    // Zustand je Tab-Eintrag (nicht je Index): Tabs können dazukommen und wegfallen.
    const state = new Map();
    const fresh = () => ({ ach: null, gifts: null, quests: [], dailiesAt: 0 });
    const S = (i) => { const v = views[i]; if (!state.has(v)) state.set(v, fresh()); return state.get(v); };

    const label = (i) => views[i]?.name || `Account ${i + 1}`;
    const ownIndexById = (pid) => views.findIndex((v) => v.playerId && v.playerId === pid);

    function notify({ title, body, tab = null, global = false }) {
        if (global ? isFocused() : (tab != null && isWatching(tab))) return;
        if (!Notification.isSupported()) return;
        const n = new Notification({ title, body, icon, silent: false });
        const v = tab != null ? views[tab] : null; // Klick später: Tab per Eintrag finden, Index kann sich verschieben
        n.on('click', () => focusTab(v ? views.indexOf(v) : null));
        n.show();
        console.log(`[mlf-app] 🔔 ${title} — ${body}`);
    }

    // ---- Seitenkontext eines Tabs ---------------------------------------------------------

    function pageJson(i, path, { headUntil = null } = {}) {
        const wc = views[i]?.view.webContents;
        if (!wc || wc.isDestroyed() || wc.isLoading()) return Promise.resolve(null);
        const js = `(async () => {
            try {
                const r = await fetch(${JSON.stringify(path)}, { credentials: 'same-origin', headers: { accept: 'application/json' } });
                if (!r.ok) return null;
                const mark = ${JSON.stringify(headUntil)};
                if (!mark) return await r.json();
                // Nur den Kopf lesen: Bytes sammeln, an der Marke abbrechen (Mehrbyte-Zeichen bleiben heil).
                const reader = r.body.getReader(), parts = [], dec = new TextDecoder();
                let total = 0;
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    parts.push(value); total += value.length;
                    const buf = new Uint8Array(total); let o = 0;
                    for (const p of parts) { buf.set(p, o); o += p.length; }
                    const text = dec.decode(buf);
                    const cut = text.indexOf(mark);
                    if (cut > 0) { reader.cancel().catch(() => {}); return JSON.parse(text.slice(0, cut) + '}'); }
                    if (total > 512 * 1024) { reader.cancel().catch(() => {}); return null; }
                }
                return null;
            } catch (e) { return null; }
        })()`;
        return wc.executeJavaScript(js, false).catch(() => null);
    }

    const loggedIn = (i) => views[i] && views[i].playerId && !views[i].guest;

    // ---- Achievements ---------------------------------------------------------------------

    async function checkAchievements(i) {
        const d = await pageJson(i, '/api/achievements', { headUntil: ACH_MARK });
        if (!d || !Array.isArray(d.recentlyUnlocked)) return;
        const recent = d.recentlyUnlocked
            .map((a) => ({ id: String(a?.id || ''), title: a?.title, desc: a?.description, ap: a?.achievementPoints, at: Number(a?.completedAtMs) || 0 }))
            .filter((a) => a.id);
        const s = S(i);
        if (!s.ach) {
            s.ach = { seen: new Set(recent.map((a) => a.id)), count: d.completionCount };
            console.log(`[mlf-app] ${label(i)}: Achievements bereit (${d.completionCount ?? '?'})`);
            return;
        }
        const neu = recent.filter((a) => !s.ach.seen.has(a.id)).sort((a, b) => a.at - b.at);
        for (const a of neu) {
            s.ach.seen.add(a.id);
            notify({ tab: i, title: `🏅 ${label(i)}: ${a.title || 'Achievement'}`,
                body: [a.desc, a.ap != null ? `+${a.ap} AP` : ''].filter(Boolean).join(' · ') });
        }
        // recentlyUnlocked ist auf 5 gedeckelt — ein größerer Sprung wird ehrlich ausgewiesen.
        const more = (Number(d.completionCount) || 0) - (Number(s.ach.count) || 0) - neu.length;
        if (s.ach.count != null && more > 0) notify({ tab: i, title: `🏅 ${label(i)}`, body: `and ${more} more achievement(s)` });
        s.ach.count = d.completionCount;
    }

    // ---- Geschenke (Belohnungs-Hinweis des Spiels, ohne ihn zu quittieren) -----------------

    async function checkGifts(i) {
        const d = await pageJson(i, '/api/payment/diamonds/notices');
        if (!d) return;
        const n = d.notice && typeof d.notice === 'object' ? d.notice : null;
        const pos = {
            gold: Number(n?.acknowledgeThroughGoldGiftPosition) || 0,
            diamonds: Number(n?.acknowledgeThroughDiamondGiftPosition) || 0,
        };
        const s = S(i);
        if (!s.gifts) { s.gifts = pos; console.log(`[mlf-app] ${label(i)}: Geschenke bereit`); return; }
        const neuGold = pos.gold > s.gifts.gold, neuDia = pos.diamonds > s.gifts.diamonds;
        s.gifts = { gold: Math.max(pos.gold, s.gifts.gold), diamonds: Math.max(pos.diamonds, s.gifts.diamonds) };
        if (!neuGold && !neuDia) return;
        const quellen = (Array.isArray(n?.sources) ? n.sources : [])
            .filter((q) => /gift|geschenk/i.test(String(q?.label || '')) || (neuGold && q?.currency === 'gold') || (neuDia && q?.currency === 'diamonds'))
            .map((q) => `${q.label || 'Gift'}: +${Number(q.amount || 0).toLocaleString('en-US')} ${q.currency === 'gold' ? 'Gold' : 'Diamonds'}`);
        notify({ tab: i, title: `🎁 ${label(i)} got a gift`,
            body: quellen.slice(0, 4).join('\n') || [neuGold && 'Gold', neuDia && 'Diamonds'].filter(Boolean).join(' and ') });
    }

    // ---- Shop-Quest im Angebot --------------------------------------------------------------

    async function refreshDailies(i) {
        const d = await pageJson(i, '/api/dailies');
        // Die Quests stecken eine Ebene tiefer: { quests: { dayKey, quests: [...] }, dailyItems: … }
        const list = Array.isArray(d?.quests?.quests) ? d.quests.quests : null;
        if (!list) return;
        S(i).quests = list.filter((q) => q?.metric === 'shop_purchase' && q.complete !== true && q.parameters);
        if (!S(i).dailiesAt) console.log(`[mlf-app] ${label(i)}: Dailies bereit (${S(i).quests.length} offene Shop-Quest(s))`);
        S(i).dailiesAt = Date.now();
    }

    function offerFits(o, p) {
        // Gelistet = verfügbar (mcf.shops/v1 hat kein Angebots-status mehr; ein altes darf gewinnen).
        if (!o || (o.status && o.status !== 'available') || o.owned) return false;
        // shopItemType nennt nur der Chat-Shop; fehlt er, filtert der Shop schon selbst (Kronen).
        if (p.shopItemType && String(o.slotType) !== String(p.shopItemType) && String(o.itemType) !== String(p.shopItemType)) return false;
        return (RARITY[String(o.rarity || '').toLowerCase()] || 0) >= (RARITY[String(p.minimumRarity || '').toLowerCase()] || 0);
    }

    async function checkShops() {
        for (const shopId of SHOPS) {
            let pub;
            try { pub = await (await fetch(`${BASE}/api/shops/${shopId}`)).json(); } catch { continue; }
            const rot = pub?.rotation?.id;
            if (!rot) continue;
            st.shopRot[shopId] = rot;
            const offers = Array.isArray(pub.offers) ? pub.offers : [];
            for (let i = 0; i < views.length; i++) {
                if (!loggedIn(i)) continue;
                for (const q of S(i).quests) {
                    if (SHOP_KIND[q.parameters.shopKind] !== shopId) continue;
                    const key = `${rot}|${q.definitionId}|${i}`;
                    if (st.shopPinged.has(key)) continue;
                    if (!offers.some((o) => offerFits({ ...o, owned: false }, q.parameters))) continue;
                    // Besitz gilt je Account → mit dessen Login nachfragen.
                    const me = await pageJson(i, `/api/shops/${shopId}/me`);
                    const fits = (Array.isArray(me?.offers) ? me.offers : []).filter((o) => offerFits(o, q.parameters));
                    st.shopPinged.add(key);
                    if (!fits.length) continue;
                    const ends = pub.rotation.endsAt ? new Date(pub.rotation.endsAt).getTime() : 0;
                    const rest = ends ? Math.max(0, Math.round((ends - Date.now()) / 60000)) : null;
                    notify({ tab: i, title: `🛍️ ${label(i)}: quest item in the ${shopId === 'crowns' ? 'King' : 'Chat'} Shop`,
                        body: `${q.title || q.definitionId}\n` + fits.map((o) => `${o.displayName || o.definitionId} (${o.rarity}), slot ${(o.slotIndex || 0) + 1}`).join('\n')
                            + (rest != null ? `\n${rest} min left` : '') });
                }
            }
        }
    }

    // ---- King-Snapshot: Thronwechsel + Royal Celebration ------------------------------------

    async function checkKing() {
        let d;
        try { d = await (await fetch(`${BASE}/api/king/snapshot`)).json(); } catch { return; }
        const k = d?.king;
        if (k && k.playerId) {
            const prev = st.king, prevName = st.kingName;
            st.king = k.playerId; st.kingName = k.displayName || '';
            if (prev === undefined) console.log(`[mlf-app] King-Snapshot ok: ${st.kingName}`);
            if (prev !== undefined && prev !== k.playerId) {
                const neu = ownIndexById(k.playerId), alt = ownIndexById(prev);
                if (neu >= 0) notify({ tab: neu, title: `👑 ${label(neu)} is King!`,
                    body: prevName ? `Took the throne from ${prevName}` : 'Took the throne' });
                else if (alt >= 0) notify({ tab: alt, title: `💔 ${label(alt)} lost the throne`,
                    body: `${k.displayName || 'Someone'} took the crown` });
            }
        }
        // Royal Celebration: je ID einmal; was beim ersten Abruf schon läuft, ist Wasserstand.
        const rc = d?.royalCelebration;
        if (rc && rc.id && !st.celebs.has(rc.id)) {
            st.celebs.add(rc.id);
            if (st.kingSeen && ['pending', 'ready', 'active'].includes(String(rc.state))) {
                const own = ownIndexById(rc.playerId);
                const who = rc.playerId === k?.playerId ? (k.displayName || 'The King') : 'The King';
                notify({ global: own < 0, tab: own >= 0 ? own : null,
                    title: `🎉 Royal Celebration${rc.multiplier ? ` x${rc.multiplier}` : ''}`,
                    body: `${who} is celebrating` + (rc.tiles ? ` · ${rc.tiles} tiles` : '') });
            }
        }
        st.kingSeen = true;
    }

    // ---- Chat-Socket: Erwähnungen + Rebellion -----------------------------------------------

    let ws = null, wsBackoff = 2000;
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    function onChatMessage(m) {
        const text = String(m?.body?.text || '');
        if (!text) return;
        const kind = m?.sender?.kind;
        if (kind === 'system') {
            const reb = text.match(/^(.*?)\s+has started a x(\d+) Rebellion\b/i);
            if (reb) notify({ global: true, title: `⚡ Rebellion x${reb[2]}`, body: text });
            return;
        }
        if (kind !== 'player') return;
        if (ownIndexById(m.sender.playerId) >= 0) return; // eigene Accounts erwähnen sich nicht selbst
        for (let i = 0; i < views.length; i++) {
            const names = [views[i].name].filter(Boolean);
            if (names.some((n) => new RegExp(`(^|[^\\w])@?${esc(n)}(?![\\w])`, 'i').test(text))) {
                notify({ tab: i, title: `💬 ${m.sender.displayName || 'Someone'} → ${label(i)}`, body: text });
                break;
            }
        }
    }

    function connectChat() {
        try {
            ws = new WebSocket('wss://marblecrownfall.com/chat/ws?roomId=Lobby00');
        } catch { return setTimeout(connectChat, wsBackoff); }
        ws.onopen = () => { wsBackoff = 2000; console.log('[mlf-app] Chat-Socket verbunden'); };
        ws.onmessage = (ev) => {
            let d; try { d = JSON.parse(ev.data); } catch { return; }
            if (d.type === 'chat.room.message' && d.message) onChatMessage(d.message);
        };
        ws.onclose = () => { ws = null; setTimeout(connectChat, wsBackoff); wsBackoff = Math.min(wsBackoff * 2, 60_000); };
        ws.onerror = () => { try { ws.close(); } catch {} };
    }

    // ---- Takt ---------------------------------------------------------------------------------

    async function accountTick() {
        for (let i = 0; i < views.length; i++) {
            if (!views[i] || !loggedIn(i)) continue;
            await checkAchievements(i);
            await checkGifts(i);
            if (Date.now() - S(i).dailiesAt > DAILIES_MS) await refreshDailies(i);
        }
        await checkShops();
    }

    // Wechselt ein Tab den Account (Login/Logout), beginnt sein Wasserstand neu.
    function resetAccount(v) { state.delete(v); }

    connectChat();
    checkKing();
    setInterval(checkKing, KING_MS);
    setTimeout(accountTick, 15_000); // erst wenn die Tabs geladen und die Identitäten bekannt sind
    setInterval(accountTick, ACCOUNT_MS);

    // Tray › Test-Benachrichtigung: prüft den Weg bis zum Desktop, ohne Fokus-Regel.
    function test() {
        const n = new Notification({ title: '🔔 MarbleLuceFall', body: 'This is what notifications look like. Click to bring the window up.', icon });
        n.on('click', () => focusTab(null));
        n.show();
    }

    return { resetAccount, test };
};
