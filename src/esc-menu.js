// ESC-Menü (seit 0.7.0, Luces Wahl „Pausenmenü mittig“ vom 17.10.): Resume, die Spielseiten, die
// App-Sachen, Quit. Kommt in jeder Ansicht — Spiel-Tab, Home, Stats — und sieht überall gleich aus:
// der Hauptprozess stellt die Einträge zusammen und spielt den Zeichner (PAGE unten) in eine eigene
// isolierte Welt der Seite, die vorn steht. Dort hängt das Menü in einem Shadow-Root über der Seite
// (Unschärfe dahinter geht nur IN der Seite — durchsichtige Views darüber zeigen nichts durch).
// Ein Klick kommt als Rückgabewert von __dcfEsc.wait() zurück; was er tut, steht hier.
//
// Wann ESC das Menü öffnet: im Spiel entscheidet die Spiel-Ebene (core/windows.js — erst Fenster,
// offene Menüs, Spiel-Popups, nie aus Eingabefeldern) und ruft dcfApp.menu.open(); auf Home und
// Stats main.js/handleKeys.

const { app, nativeImage } = require('electron');
const path = require('path');

const WORLD = 1717;   // eigene isolierte Welt, getrennt von der des Preloads

// Läuft in der Seite (isolierte Welt), muss deshalb ohne äußere Namen auskommen.
function PAGE() {
    if (window.__dcfEsc) return;
    const ICONS = {
        play: '<path d="M7 5v14l11-7Z"/>',
        box: '<path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
        daily: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
        bag: '<path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
        trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
        medal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 11.5 6 3h4l2 5 2-5h4l-2.5 8.5"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
        chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
        hud: '<rect x="2" y="6" width="20" height="6" rx="2"/><path d="M6 9h.01M10 9h4M18 9h.01"/><path d="M5 16h14M8 19h8"/>',
        gear: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
        scroll: '<path d="M8 3h11v15a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2h11v2a3 3 0 0 0 3 3"/><path d="M8 3a3 3 0 0 0-3 3v10M11 8h5M11 12h5"/>',
        refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
        power: '<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
    };
    const CSS = `
        :host { all: initial; }
        .esc {
            --bg1: #241938; --bg2: #140e20; --line: rgba(180, 138, 232, 0.28);
            --text: #ece4f7; --muted: #a99cc0; --dim: #7d7194; --violet: #b48ae8; --gold: #ffd36e;
            position: fixed; inset: 0; z-index: 2147482900; box-sizing: border-box;
            display: grid; place-items: center; padding: 24px;
            background: rgba(9, 6, 16, 0.62); backdrop-filter: blur(6px) saturate(0.85);
            font: 14px/1.3 var(--font, system-ui, sans-serif); color: var(--text); user-select: none;
            animation: fade 140ms ease-out;
        }
        .esc.noblur { backdrop-filter: none; background: rgba(9, 6, 16, 0.8); }
        * { box-sizing: border-box; }
        .col { display: flex; flex-direction: column; width: 280px; max-height: 100%; animation: rise 180ms cubic-bezier(.2, .8, .2, 1); }
        .card {
            position: relative; display: flex; flex-direction: column; min-height: 0;
            background: linear-gradient(180deg, var(--bg1), var(--bg2));
            border: 1px solid var(--line); border-radius: 16px;
            box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06); overflow: hidden;
        }
        .card::before {
            content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; opacity: 0.85;
            background: linear-gradient(90deg, transparent, var(--gold) 30%, var(--violet) 70%, transparent);
        }
        .head { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 20px 16px; border-bottom: 1px solid rgba(180, 138, 232, 0.14); }
        .logo { width: 56px; height: 56px; filter: drop-shadow(0 6px 16px rgba(180, 138, 232, 0.35)); -webkit-user-drag: none; }
        .brand { text-align: center; font-size: 15px; line-height: 1.15; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
        .brand b { display: block; color: var(--gold); font-weight: 800; }
        .list { flex: 1; min-height: 0; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 2px; scrollbar-width: thin; scrollbar-color: rgba(180, 138, 232, 0.4) transparent; }
        .sep { height: 1px; margin: 8px 6px; background: rgba(180, 138, 232, 0.14); flex: none; }
        .it {
            display: flex; align-items: center; gap: 12px; width: 100%; flex: none; padding: 9px 12px;
            border: 0; border-radius: 9px; background: transparent; cursor: pointer;
            font: inherit; font-size: 14.5px; font-weight: 600; color: var(--text); text-align: left;
            transition: background 100ms, color 100ms;
        }
        .it:hover, .it:focus-visible { background: rgba(180, 138, 232, 0.14); outline: none; }
        .it:focus-visible { box-shadow: inset 0 0 0 1px rgba(180, 138, 232, 0.55); }
        .it:focus:not(:focus-visible) { outline: none; }
        .ic { width: 18px; height: 18px; flex: none; color: var(--violet); }
        .lb { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hn { flex: none; font-size: 11.5px; font-weight: 600; color: var(--dim); }
        .hn.good { color: #7fd99a; }
        .hn.gold { color: var(--gold); }
        .it.main {
            justify-content: center; margin-bottom: 6px; padding: 11px 12px; color: #1a1026; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 800;
            background: linear-gradient(180deg, #ffe08f, #f2b84b);
            box-shadow: 0 6px 18px rgba(242, 184, 75, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
        .it.main .ic { color: #1a1026; width: 15px; height: 15px; }
        .it.main .lb { flex: none; }
        .it.main:hover, .it.main:focus-visible { background: linear-gradient(180deg, #ffe7a6, #f5c25f); }
        .it.quit .ic { color: #e07a7a; }
        .it.quit:hover, .it.quit:focus-visible { background: rgba(224, 122, 122, 0.14); }
        .it.ask { color: #ffb4b4; }
        .foot { margin-top: 10px; text-align: center; font-size: 11.5px; color: var(--dim); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }
        kbd { font: inherit; font-weight: 700; color: var(--muted); padding: 0 5px; border: 1px solid rgba(180, 138, 232, 0.3); border-radius: 4px; }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rise { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .esc, .col { animation: none; } }`;

    let cur = null;   // { host, items: Map(id → { b, lb, hn, stay }), waiter, keyHandler }
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const svg = name => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

    function finish(result) {
        if (!cur) return;
        const c = cur;
        cur = null;
        window.removeEventListener('keydown', c.keyHandler, true);
        c.host.remove();
        if (c.waiter) c.waiter(result);
    }
    function emit(id) {
        if (!cur) return;
        if (cur.waiter) { const w = cur.waiter; cur.waiter = null; w(id); }
        else cur.queue.push(id);
    }
    function setItem(id, s) {
        const it = cur && cur.items.get(id);
        if (!it) return;
        if (s.label != null) it.lb.textContent = s.label;
        if (s.hint != null) it.hn.textContent = s.hint;
        it.hn.className = 'hn' + (s.tone ? ' ' + s.tone : '');
        if (s.stay != null) it.stay = s.stay;
    }

    window.__dcfEsc = {
        // cfg: { version, logo, font?, items: [{ id, icon, label, hint?, cls?, stay?, tone? } | { sep: true }] }
        open(cfg) {
            if (cur) return 'open';
            const a = document.activeElement;
            if (a && a.closest && a.closest('input, textarea, select, [contenteditable="true"]')) return 'busy';
            const host = document.createElement('dcf-esc-menu');
            const sh = host.attachShadow({ mode: 'closed' });
            const style = el('style');
            style.textContent = CSS;
            const root = el('div', 'esc');
            if (/noblur/.test(document.documentElement.getAttribute('data-mcfo-perf') || '')) root.classList.add('noblur');
            root.setAttribute('role', 'dialog');
            root.setAttribute('aria-modal', 'true');
            root.setAttribute('aria-label', 'Game menu');
            const col = el('div', 'col'), card = el('div', 'card'), head = el('div', 'head'), list = el('div', 'list');
            const logo = el('img', 'logo');
            logo.alt = '';
            logo.src = cfg.logo || '';
            const brand = el('div', 'brand', 'Dreaming');
            brand.appendChild(el('b', '', 'Crownfall'));
            head.append(logo, brand);
            const items = new Map();
            let first = null;
            for (const it of cfg.items) {
                if (it.sep) { list.appendChild(el('div', 'sep')); continue; }
                const b = el('button', 'it' + (it.cls ? ' ' + it.cls : ''));
                b.type = 'button';
                b.innerHTML = svg(it.icon);
                const lb = el('span', 'lb', it.label), hn = el('span', 'hn' + (it.tone ? ' ' + it.tone : ''), it.hint || '');
                b.append(lb, hn);
                const rec = { b, lb, hn, stay: !!it.stay, confirm: it.confirm || null, asked: false };
                b.addEventListener('click', () => {
                    if (rec.confirm && !rec.asked) {
                        rec.asked = true;
                        b.classList.add('ask');
                        lb.textContent = rec.confirm;
                        hn.textContent = 'click again';
                        return;
                    }
                    if (rec.stay) emit(it.id); else finish(it.id);
                });
                items.set(it.id, rec);
                list.appendChild(b);
                if (!first) first = b;
            }
            card.append(head, list);
            const foot = el('div', 'foot');
            foot.append(`v${cfg.version} · `, el('kbd', '', 'Esc'), ' to resume');
            col.append(card, foot);
            root.appendChild(col);
            root.addEventListener('mousedown', e => { if (e.target === root) finish(null); });
            // Die Schrift der Seite (Spiel: seine eigene) — ein Shadow-Root erbt sie über den Host nicht immer.
            try { root.style.setProperty('--font', getComputedStyle(document.body).fontFamily); } catch (e) {}
            sh.append(style, root);
            const keyHandler = e => {
                if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); finish(null); return; }
                if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(e.key)) return;
                e.stopPropagation(); e.preventDefault();
                const all = [...items.values()].map(r => r.b);
                const at = all.indexOf(sh.activeElement);
                const down = e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey);
                const next = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (at + (down ? 1 : all.length - 1)) % all.length;
                all[next].focus();
            };
            window.addEventListener('keydown', keyHandler, true);
            (document.body || document.documentElement).appendChild(host);
            cur = { host, items, waiter: null, queue: [], keyHandler };
            if (first) first.focus({ preventScroll: true });
            return 'ok';
        },
        // Nächster Klick: Eintrags-ID, oder null, wenn das Menü zuging (Esc, Resume-Fläche, Auswahl).
        wait() {
            if (!cur) return Promise.resolve(null);
            if (cur.queue.length) return Promise.resolve(cur.queue.shift());
            return new Promise(r => { cur.waiter = r; });
        },
        set: setItem,
        close: () => finish(null),
        isOpen: () => !!cur,
    };
}

const PAGE_CODE = `(${PAGE.toString()})()`;

// Spielseiten: Schlüssel aus src/mlf/core/anchors.js (PAGES), geöffnet von der Spiel-Ebene (panel/esc-menu.js).
const GAME_PAGES = [
    ['box', 'Inventory', 'inventory-nav'], ['daily', 'Dailies', 'dailies-nav'], ['bag', 'Shop', 'shop-nav'],
    ['trophy', 'Leaderboards', 'leaderboards-nav'], ['medal', 'Achievements', 'achievements'], ['user', 'Profile', 'profile-nav'],
];

// Anzeige des Update-Eintrags je Zustand des Updaters (updater.js).
function updateLook(s) {
    const st = s?.status || '';
    if (st === 'ready') return { label: 'Restart to update', hint: s.version ? 'v' + s.version : '', tone: 'gold', stay: false, act: true };
    if (st === 'available' || st === 'installfailed') return { label: 'Get the update', hint: s.version ? 'v' + s.version : '', tone: 'gold', stay: false, act: true };
    if (st === 'downloading') return { label: 'Downloading update', hint: s.percent != null ? s.percent + ' %' : '…', tone: '', stay: true };
    if (st === 'checking') return { label: 'Checking …', hint: '', tone: '', stay: true };
    if (st === 'latest') return { label: 'Up to date', hint: '', tone: 'good', stay: true };
    if (st === 'error') return { label: 'Update check failed', hint: 'retry', tone: '', stay: true };
    if (st === 'dev') return { label: 'Updates come via git', hint: 'dev', tone: '', stay: true };
    return { label: 'Check for updates', hint: '', tone: '', stay: true };
}

// ctx: was das Menü über die App wissen muss und was es auslösen darf (main.js).
//   where(wc)     'game' | 'home' | 'stats'
//   homeOk() statsOk() hudOpen()   welche Einträge es gibt
//   gameAct(id)   in den Spiel-Tab wechseln und dort 'page:<key>' / 'patchnotes' ausführen
//   home() stats() hud() settings() quit()
//   updater       { state(), check(), install() }
module.exports = function createEscMenu(ctx) {
    const logo = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 128, height: 128, quality: 'best' }).toDataURL();
    const open = new Map();   // webContents-ID → Merker des laufenden Menüs (Seitenwechsel löst ihn)

    const run = (wc, code) => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code }]);

    function items(wc) {
        const where = ctx.where(wc);
        const list = [{ id: 'resume', icon: 'play', label: 'Resume', cls: 'main' }];
        for (const [icon, label, key] of GAME_PAGES) list.push({ id: 'page:' + key, icon, label });
        list.push({ sep: true });
        if (where !== 'home' && ctx.homeOk()) list.push({ id: 'home', icon: 'home', label: 'Home' });
        if (where !== 'stats' && ctx.statsOk()) list.push({ id: 'stats', icon: 'chart', label: 'Stats' });
        list.push({ id: 'hud', icon: 'hud', label: ctx.hudOpen() ? 'Hide the HUD' : 'Show the HUD', hint: 'F2' });
        list.push({ id: 'settings', icon: 'gear', label: 'Settings', hint: 'Ctrl+,' });
        list.push({ id: 'patchnotes', icon: 'scroll', label: 'Patch notes' });
        const u = updateLook(ctx.updater?.state());
        list.push({ id: 'update', icon: 'refresh', label: u.label, hint: u.hint, tone: u.tone, stay: u.stay });
        list.push({ sep: true });
        list.push({ id: 'quit', icon: 'power', label: 'Quit', cls: 'quit', confirm: 'Really quit?' });
        return list;
    }

    async function act(wc, id) {
        if (id.startsWith('page:') || id === 'patchnotes') return ctx.gameAct(id);
        if (id === 'home') return ctx.home();
        if (id === 'stats') return ctx.stats();
        if (id === 'hud') return ctx.hud();
        if (id === 'settings') return ctx.settings();
        if (id === 'quit') return ctx.quit();
        if (id === 'update') {
            const now = updateLook(ctx.updater?.state());
            if (now.act) { ctx.updater.install(); return; }
            await run(wc, `__dcfEsc.set('update', ${JSON.stringify(updateLook({ status: 'checking' }))})`);
            const s = await ctx.updater.check();
            await run(wc, `__dcfEsc.set('update', ${JSON.stringify(updateLook(s))})`);
        }
    }

    async function show(wc) {
        if (!wc || wc.isDestroyed() || open.has(wc.id)) return;
        const token = {};
        open.set(wc.id, token);
        try {
            await run(wc, PAGE_CODE);
            const cfg = { version: app.getVersion(), logo, items: items(wc) };
            if (await run(wc, `__dcfEsc.open(${JSON.stringify(cfg)})`) !== 'ok') return;
            for (;;) {
                const id = await run(wc, '__dcfEsc.wait()');
                if (open.get(wc.id) !== token || !id || id === 'resume') return;
                // Update: prüft und bleibt offen; steht ein Update bereit, installiert der nächste Klick
                // (das Menü ist dann schon zu, wait() liefert null).
                if (id === 'update') { await act(wc, id); continue; }
                await act(wc, id);
                return;
            }
        } catch (e) {
            console.error(`[dcf] ESC-Menü: ${e.message}`);
        } finally {
            if (open.get(wc.id) === token) open.delete(wc.id);
        }
    }

    return {
        show,
        isOpen: (wc) => !!wc && open.has(wc.id),
        // Home/Stats: ESC kommt über main.js an, nicht über die Seite — offen = schließen.
        toggle(wc) {
            if (!wc || wc.isDestroyed()) return;
            if (open.has(wc.id)) run(wc, 'window.__dcfEsc && __dcfEsc.close()').catch(() => {});
            else show(wc);
        },
        // Neue Seite im View: die alte Welt samt Menü ist weg, ein hängendes wait() kommt nie zurück.
        attach(wc) {
            wc.on('did-start-navigation', (_e, _url, inPage, isMain) => { if (isMain && !inPage) open.delete(wc.id); });
            wc.once('destroyed', () => open.delete(wc.id));
        },
    };
};
