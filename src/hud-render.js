// Zeichnet das HUD — eine Quelle für das HUD-Fenster (hud.html) und die Vorschau in
// Settings › HUD (dort über die Brücke als Text geholt und ausgeführt). Kein Modul-System:
// definiert nur hudCss() und renderHud().

const HUD_ITEMS = {
    king: 'King and throne time',
    rc: 'Royal Celebration',
    tickets: 'Tickets (all accounts)',
    ticketsPer: 'Tickets per account',
    earning: 'Accounts earning tickets',
    money: 'Gold and diamonds (all accounts)',
    goldPer: 'Gold per account',
    diamondsPer: 'Diamonds per account',
    points: 'Points (all accounts)',
    pointsPer: 'Points per account',
    claim: 'Rewards to claim',
    clock: 'Clock',
    mmRuns: 'Runs today',
    mmPlayers: 'Ø players per run',
    mmReigns: 'Reigns today',
    mmAttacks: 'Attacks on the throne today',
    mmRebellions: 'Rebellions today',
    mmChat: 'Chat messages today',
    mmFrozen: 'Frozen runs (24 h)',
    mmDroughts: 'Droughts (rare rarities)',
};
// Bausteine aus der öffentlichen MarbleMind-Statistik und die Unterseite, die ein Klick öffnet.
const HUD_STATS = { mmRuns: 'activity', mmPlayers: 'activity', mmReigns: 'king', mmAttacks: 'attacks', mmRebellions: 'rebellions', mmChat: 'chat', mmFrozen: 'freezes', mmDroughts: 'tileguide' };

function hudCss() {
    return `
    .dcf-hud { --a: 0.92; display: inline-flex; align-items: stretch; position: relative; overflow: hidden;
        border-radius: 12px; font-family: system-ui, sans-serif; font-weight: 600; color: #ece4f7; white-space: nowrap;
        user-select: none; box-sizing: border-box; }
    .dcf-hud * { box-sizing: border-box; }
    .dcf-hud--app { background: linear-gradient(180deg, rgba(36, 26, 58, var(--a)), rgba(20, 15, 32, var(--a))); border: 1px solid rgba(180, 138, 232, calc(var(--a) * 0.35)); }
    .dcf-hud--app::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, #ffd36e 30%, #b48ae8 70%, transparent); opacity: calc(var(--a) * 0.9); }
    .dcf-hud--dark { background: rgba(12, 12, 16, var(--a)); border: 1px solid rgba(255, 255, 255, calc(var(--a) * 0.09)); }
    .dcf-hud--glass { background: rgba(255, 255, 255, calc(var(--a) * 0.13)); border: 1px solid rgba(255, 255, 255, calc(var(--a) * 0.28)); text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85); }
    .dcf-hud--s { font-size: 12px; } .dcf-hud--m { font-size: 13px; } .dcf-hud--l { font-size: 15.5px; }
    .dcf-hud--bar { flex-direction: row; }
    .dcf-hud--column { flex-direction: column; }
    .dcf-hud__seg { display: flex; align-items: center; gap: 0.5em; padding: 0.85em 0.95em; }
    .dcf-hud--s .dcf-hud__seg { padding: 0.65em 0.8em; }
    .dcf-hud--bar .dcf-hud__seg + .dcf-hud__seg { border-left: 1px solid rgba(180, 138, 232, 0.16); }
    .dcf-hud--column .dcf-hud__seg { padding: 0.6em 0.95em; }
    .dcf-hud--column .dcf-hud__seg + .dcf-hud__seg { border-top: 1px solid rgba(180, 138, 232, 0.13); }
    .dcf-hud--column .dcf-hud__seg:first-child { padding-top: 0.85em; padding-right: 2.6em; } /* Platz für ✕ */
    .dcf-hud--column .dcf-hud__seg:last-of-type { padding-bottom: 0.85em; }
    .dcf-hud__sub { color: #a99cc0; font-weight: 500; font-variant-numeric: tabular-nums; }
    .dcf-hud--glass .dcf-hud__sub { color: #e2dcef; }
    .dcf-hud__num { font-variant-numeric: tabular-nums; }
    .dcf-hud__gold { color: #ffd36e; }
    .dcf-hud__dia { color: #9fd3ff; }
    .dcf-hud__rc { color: #ffb7e3; }
    .dcf-hud__dim { color: #8f84a6; font-weight: 500; }
    .dcf-hud__dot { width: 0.5em; height: 0.5em; border-radius: 50%; background: #7d7194; flex: none; }
    .dcf-hud__dot--on { background: #7fd99a; box-shadow: 0 0 5px #7fd99a; }
    .dcf-hud__seg--link { -webkit-app-region: no-drag; cursor: pointer; }
    .dcf-hud__seg--link:hover { background: rgba(255, 255, 255, 0.05); }
    .dcf-hud__green { color: #7fd99a; } .dcf-hud__red { color: #ff8a8a; }
    .dcf-hud__rdot { width: 0.6em; height: 0.6em; border-radius: 50%; flex: none; border: 1px solid rgba(255, 255, 255, 0.3); }
    /* Werte je Account: in beiden Layouts untereinander, Name links, Wert rechtsbündig — nebeneinander
       wurde die Bar mit drei, vier Accounts und mehreren solchen Bausteinen endlos lang. */
    .dcf-hud__per { display: grid; grid-template-columns: auto auto; column-gap: 0.8em; row-gap: 0.25em; }
    .dcf-hud__acc { display: contents; }
    .dcf-hud__name { display: inline-flex; align-items: center; gap: 0.35em; }
    .dcf-hud__per > .dcf-hud__acc > .dcf-hud__sub { text-align: right; }
    .dcf-hud--bar .dcf-hud__seg--per { padding-top: 0.55em; padding-bottom: 0.55em; }
    .dcf-hud__empty { padding: 0.85em 1em; color: #8f84a6; font-weight: 500; }
    .dcf-hud__x { -webkit-app-region: no-drag; align-self: center; margin: 0 0.35em 0 auto; border: 0; background: none; color: #8f84a6;
        font: inherit; width: 1.8em; height: 1.8em; border-radius: 0.45em; cursor: pointer; }
    .dcf-hud--column .dcf-hud__x { position: absolute; top: 0.35em; right: 0; margin: 0; }
    .dcf-hud__x:hover { color: #ece4f7; background: rgba(255, 255, 255, 0.08); }`;
}

// root: ein leeres Element; cfg: hud-config; d: Werte (data() in hud.js). onClose: ✕ zeigen.
// onStats(tab): Klick auf einen MarbleMind-Baustein öffnet diese Unterseite (nur im HUD-Fenster).
function renderHud(root, cfg, d, { onClose = null, onStats = null } = {}) {
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-US'));
    // Punkte gehen in die Milliarden — kurz wie auf Home (1.2B), sonst sprengen sie die Leiste.
    const short = (n) => {
        if (n == null) return '–';
        const a = Math.abs(n);
        for (const [v, u] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) if (a >= v) return (n / v).toFixed(a >= v * 100 ? 0 : 1).replace(/\.0$/, '') + u;
        return String(n);
    };
    const mins = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
    root.className = `dcf-hud dcf-hud--${cfg.layout} dcf-hud--${cfg.size} dcf-hud--${cfg.style}`;
    root.style.setProperty('--a', String(cfg.opacity / 100));
    root.replaceChildren();
    const seg = (...kids) => { const s = el('div', 'dcf-hud__seg'); s.append(...kids); root.append(s); return s; };
    // Ein Wert je Account: Symbol vorn, dann Name + Wert wie bei „Tickets per account“.
    const perSeg = (icon, cls, key, f) => {
        const list = d.perAccount || [];
        if (!list.length) return;
        const box = el('span', 'dcf-hud__per');
        for (const a of list) {
            const x = el('span', 'dcf-hud__acc');
            x.append(el('span', 'dcf-hud__name', a.name), el('span', `dcf-hud__sub dcf-hud__num${cls ? ' ' + cls : ''}`, f(a[key])));
            box.append(x);
        }
        seg(el('span', cls, icon), box).classList.add('dcf-hud__seg--per');
    };

    for (const { id, on } of cfg.items) {
        if (!on) continue;
        if (id === 'king') {
            const k = d.king;
            const s = seg(el('span', k && k.mine ? 'dcf-hud__gold' : '', `👑 ${k ? k.name : '…'}`));
            if (k) s.append(el('span', 'dcf-hud__sub', mins(Date.now() - k.since)));
        } else if (id === 'rc') {
            if (d.rc) seg(el('span', 'dcf-hud__rc', `🎉 Royal Celebration${d.rc.multiplier ? ' x' + d.rc.multiplier : ''}${d.rc.state && d.rc.state !== 'active' ? ' · ' + d.rc.state : ''}`));
        } else if (id === 'tickets') {
            seg(el('span', null, '🎟'), el('span', 'dcf-hud__num', fmt(d.tickets)));
        } else if (id === 'ticketsPer') {
            const box = el('span', 'dcf-hud__per');
            for (const a of d.perAccount || []) {
                const x = el('span', 'dcf-hud__acc');
                const name = el('span', 'dcf-hud__name');
                name.append(el('span', 'dcf-hud__dot' + (a.earning ? ' dcf-hud__dot--on' : '')), el('span', null, a.name));
                x.append(name, el('span', 'dcf-hud__sub dcf-hud__num', fmt(a.tickets)));
                box.append(x);
            }
            if ((d.perAccount || []).length) seg(box).classList.add('dcf-hud__seg--per');
        } else if (id === 'earning') {
            const e = d.earning || { n: 0, total: 0 };
            seg(el('span', 'dcf-hud__dot' + (e.n ? ' dcf-hud__dot--on' : '')), el('span', null, `${e.n}/${e.total} earning`));
        } else if (id === 'money') {
            seg(el('span', 'dcf-hud__gold dcf-hud__num', `🪙 ${fmt(d.gold)}`), el('span', 'dcf-hud__num', `💎 ${fmt(d.diamonds)}`));
        } else if (id === 'goldPer') {
            perSeg('🪙', 'dcf-hud__gold', 'gold', fmt);
        } else if (id === 'diamondsPer') {
            perSeg('💎', 'dcf-hud__dia', 'diamonds', fmt);
        } else if (id === 'points') {
            const s = seg(el('span', null, '⭐'), el('span', 'dcf-hud__num', short(d.points)));
            if (d.points != null) s.title = fmt(d.points);
        } else if (id === 'pointsPer') {
            perSeg('⭐', '', 'points', short);
        } else if (id === 'claim') {
            seg(d.claim ? el('span', 'dcf-hud__gold', `🎁 ${d.claim} to claim`) : el('span', 'dcf-hud__dim', d.claim === 0 ? '🎁 all claimed' : '🎁 …'));
        } else if (HUD_STATS[id]) {
            // Ohne Settings › Stats (d.mm null) bleiben diese Bausteine einfach weg.
            const m = d.mm;
            if (!m) continue;
            const t = m.today || {}, f = m.frozen || {};
            const num = (v, cls) => el('span', 'dcf-hud__num' + (cls ? ' ' + cls : ''), v == null ? '–' : v);
            const sub = (s) => el('span', 'dcf-hud__sub', s);
            let s = null;
            if (id === 'mmRuns') s = seg(el('span', null, '🏁'), num(fmt(t.runs)), sub('runs today'));
            else if (id === 'mmPlayers') s = seg(el('span', null, '👥'), num(t.players == null ? null : Number(t.players).toFixed(1)), sub('players per run'));
            else if (id === 'mmReigns') s = seg(el('span', null, '🏰'), num(fmt(t.reigns)), sub('reigns'));
            else if (id === 'mmAttacks') s = seg(el('span', null, '⚔️'), num(fmt(t.attacks)), sub('attacks'));
            else if (id === 'mmRebellions') s = seg(el('span', null, '⚡'), num(fmt(t.rebellions)), sub('rebellions'));
            else if (id === 'mmChat') s = seg(el('span', null, '💬'), num(fmt(t.chat)), sub('chat'));
            else if (id === 'mmFrozen') {
                const r = f.rate24h;
                s = seg(el('span', null, '🧊'), num(r == null ? null : r + ' %', r == null ? '' : r >= 10 ? 'dcf-hud__red' : r >= 4 ? '' : 'dcf-hud__green'),
                    sub(f.rate7d == null ? 'frozen 24 h' : `frozen 24 h · 7 d ${f.rate7d} %`));
            } else if (id === 'mmDroughts') {
                // Die vier seltensten (Cosmic … Legendary): seit wann nicht mehr, rot über dem Rekord.
                const rows = (m.droughts || []).slice(0, 4);
                if (!rows.length) continue;
                const RAR = { legendary: '#BC7824', mythic: '#992824', ethereal: '#C6A0C1', cosmic: '#272330', epic: '#592285', rare: '#20569D', common: '#214D24' };
                const t2 = (x) => { if (x == null) return '–'; if (x < 90) return Math.round(x) + ' min'; const h = x / 60; return h < 48 ? h.toFixed(1) + ' h' : (h / 24).toFixed(1) + ' d'; };
                const box = el('span', 'dcf-hud__per');
                for (const r of rows) {
                    const x = el('span', 'dcf-hud__acc');
                    const name = el('span', 'dcf-hud__name');
                    const dot = el('span', 'dcf-hud__rdot'); dot.style.background = RAR[String(r.rarity).toLowerCase()] || '#555';
                    name.append(dot, el('span', null, r.rarity));
                    const v = el('span', 'dcf-hud__sub dcf-hud__num' + (r.since > r.longest ? ' dcf-hud__red' : ''), t2(r.since));
                    v.title = `usually ${t2(r.median)}, longest ${t2(r.longest)}`;
                    x.append(name, v);
                    box.append(x);
                }
                s = seg(el('span', null, '⏳'), box);
                s.classList.add('dcf-hud__seg--per');
                s.title = 'Since each rarity last showed up (red: longer than ever before)';
            }
            if (s && onStats) { s.classList.add('dcf-hud__seg--link'); s.onclick = () => onStats(HUD_STATS[id]); if (!s.title) s.title = 'Open in Stats'; }
        } else if (id === 'clock') {
            const t = new Date();
            seg(el('span', 'dcf-hud__num', `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`));
        }
    }
    if (!root.children.length) root.append(el('div', 'dcf-hud__empty', 'Nothing switched on — Settings › HUD'));
    if (onClose) {
        const x = el('button', 'dcf-hud__x', '✕');
        x.type = 'button'; x.title = 'Close (F2)';
        x.onclick = onClose;
        root.append(x);
    }
}
