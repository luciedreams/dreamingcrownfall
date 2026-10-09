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
    claim: 'Rewards to claim',
    clock: 'Clock',
};

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
    .dcf-hud__rc { color: #ffb7e3; }
    .dcf-hud__dim { color: #8f84a6; font-weight: 500; }
    .dcf-hud__dot { width: 0.5em; height: 0.5em; border-radius: 50%; background: #7d7194; flex: none; }
    .dcf-hud__dot--on { background: #7fd99a; box-shadow: 0 0 5px #7fd99a; }
    .dcf-hud__acc { display: inline-flex; align-items: center; gap: 0.35em; }
    .dcf-hud__acc + .dcf-hud__acc { margin-left: 0.7em; }
    .dcf-hud--column .dcf-hud__per { display: flex; flex-direction: column; gap: 0.3em; }
    .dcf-hud--column .dcf-hud__acc + .dcf-hud__acc { margin-left: 0; }
    .dcf-hud__empty { padding: 0.85em 1em; color: #8f84a6; font-weight: 500; }
    .dcf-hud__x { -webkit-app-region: no-drag; align-self: center; margin: 0 0.35em 0 auto; border: 0; background: none; color: #8f84a6;
        font: inherit; width: 1.8em; height: 1.8em; border-radius: 0.45em; cursor: pointer; }
    .dcf-hud--column .dcf-hud__x { position: absolute; top: 0.35em; right: 0; margin: 0; }
    .dcf-hud__x:hover { color: #ece4f7; background: rgba(255, 255, 255, 0.08); }`;
}

// root: ein leeres Element; cfg: hud-config; d: Werte (data() in hud.js). onClose: ✕ zeigen.
function renderHud(root, cfg, d, { onClose = null } = {}) {
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-US'));
    const mins = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
    root.className = `dcf-hud dcf-hud--${cfg.layout} dcf-hud--${cfg.size} dcf-hud--${cfg.style}`;
    root.style.setProperty('--a', String(cfg.opacity / 100));
    root.replaceChildren();
    const seg = (...kids) => { const s = el('div', 'dcf-hud__seg'); s.append(...kids); root.append(s); return s; };

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
                x.append(el('span', 'dcf-hud__dot' + (a.earning ? ' dcf-hud__dot--on' : '')), el('span', null, a.name), el('span', 'dcf-hud__sub', fmt(a.tickets)));
                box.append(x);
            }
            if ((d.perAccount || []).length) seg(box);
        } else if (id === 'earning') {
            const e = d.earning || { n: 0, total: 0 };
            seg(el('span', 'dcf-hud__dot' + (e.n ? ' dcf-hud__dot--on' : '')), el('span', null, `${e.n}/${e.total} earning`));
        } else if (id === 'money') {
            seg(el('span', 'dcf-hud__gold dcf-hud__num', `🪙 ${fmt(d.gold)}`), el('span', 'dcf-hud__num', `💎 ${fmt(d.diamonds)}`));
        } else if (id === 'claim') {
            seg(d.claim ? el('span', 'dcf-hud__gold', `🎁 ${d.claim} to claim`) : el('span', 'dcf-hud__dim', d.claim === 0 ? '🎁 all claimed' : '🎁 …'));
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
