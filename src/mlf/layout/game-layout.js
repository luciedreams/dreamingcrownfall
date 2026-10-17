    // =========================================================================================
    // GAME LAYOUT — the board as a game client, not a website (DreamingCrownfall 0.7.0)
    // =========================================================================================
    // Switch: Settings › General › Layout (app setting ui.gameLayout). Off = the classic layout,
    // untouched. On:
    //   1. a resource bar at the top instead of the header cards (click a value: as before)
    //   2. a hotbar at the bottom instead of the footer and the tray under the King
    //   3. keys for it: 1 / 5 / 0 bid, U unbid, R rebellion, F attack, Q W E A S D drinks,
    //      I inventory, P profile
    //   4. the chat floats in the bottom-left corner and fades while nothing happens
    //   5. lanes and King as one arena without the website's boxes
    // Nothing of the game is moved in the DOM: its parts are hidden by a stylesheet and ours
    // read their values from them and click their buttons. Colours come from the chosen theme;
    // without one, DreamingCrownfall's violet and gold.
    // While you are King the bid chips turn into the toll field — then the game's own footer comes
    // back and the hotbar keeps only its King half, at the side.
    const GL_CSS_ID = 'dcf-gl-css';
    const GL_ON = 'html[data-dcf-gl]:not(#dcf-gl-a#dcf-gl-b)';
    let glOn = false, glTimer = 0, glChatIdle = 0, glBuilt = null;

    const glQ = (s, r = document) => r.querySelector(s);
    const glApi = () => (typeof window.dcfApp === 'object' && window.dcfApp) || null;
    const glWanted = () => { const a = glApi(); try { return !!a && a.settings()['ui.gameLayout'] !== false; } catch (e) { return false; } };

    // ---- colours of the theme -------------------------------------------------------------------
    const glRgb = s => {
        const m = /rgba?\(([^)]+)\)/.exec(s || '');
        if (!m) return null;
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return p.length >= 3 && (p[3] === undefined || p[3] > 0.08) ? p.slice(0, 3).map(Math.round) : null;
    };
    // panel/line/text/accent as "r, g, b"; the bid buttons take the theme's own button paint
    // (most themes draw buttons with a gradient) and its text colour.
    const GL_APP = { panel: [22, 15, 36], line: [180, 138, 232], text: [236, 228, 247], accent: [255, 211, 110],
        bidBg: 'radial-gradient(120% 95% at 50% 0%, #ffe08f, #c48a26 75%)', bidText: [29, 20, 5] };
    const glLight = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    function glPalette() {
        if (!document.documentElement.hasAttribute('data-mcfo-theme')) return GL_APP;
        const st = el => (el ? getComputedStyle(el) : null);
        const cell = st(glQ('[data-role="metric-cell"]')), val = st(glQ('[data-role="tickets"]')), btn = st(glQ('.mcfo-unbid'));
        const text = glRgb(val && val.color) || GL_APP.text;
        const paint = btn && btn.backgroundImage && btn.backgroundImage !== 'none' ? btn.backgroundImage : (glRgb(btn && btn.backgroundColor) ? btn.backgroundColor : '');
        // Accent for text on the dark bars: the first colour of the button paint, if it is light enough to read.
        const stop = glRgb((/rgba?\([^)]+\)/.exec(paint) || [])[0]);
        return {
            panel: glRgb(cell && cell.backgroundColor) || GL_APP.panel,
            line: glRgb(cell && cell.borderTopColor) || GL_APP.line,
            text,
            accent: stop && glLight(stop) > 0.45 ? stop : text,
            bidBg: paint || GL_APP.bidBg,
            bidText: paint ? (glRgb(btn.color) || GL_APP.bidText) : GL_APP.bidText,
        };
    }
    let glPaletteKey = '';
    function glColours() {
        const p = glPalette();
        const key = JSON.stringify(p);
        if (key === glPaletteKey) return;
        glPaletteKey = key;
        const root = document.documentElement;
        for (const [k, v] of Object.entries(p)) root.style.setProperty('--gl-' + k, Array.isArray(v) ? v.join(', ') : v);
    }

    function glStyles() {
        if (document.getElementById(GL_CSS_ID)) return;
        const s = document.createElement('style');
        s.id = GL_CSS_ID;
        s.textContent = `
            /* 1 resource bar: the header cards make room (kept for their menus and values) */
            ${GL_ON} [data-role="top-status-region"] { height: 48px !important; min-height: 48px !important; overflow: hidden !important;
                background: linear-gradient(180deg, rgba(var(--gl-panel), .95), rgba(var(--gl-panel), 0)) !important; border: 0 !important; box-shadow: none !important; }
            ${GL_ON} [data-role="top-status-region"] > * { visibility: hidden !important; }
            .dcf-gl-res { position: fixed; top: 6px; left: 50%; transform: translateX(-50%); z-index: 50; display: flex; gap: 4px; align-items: center;
                padding: 4px 6px; border-radius: 14px; background: rgba(var(--gl-panel), .82); border: 1px solid rgba(var(--gl-line), .4);
                box-shadow: 0 8px 24px rgba(0, 0, 0, .45), inset 0 1px 0 rgba(255, 255, 255, .05); backdrop-filter: blur(6px);
                font: 700 14px/1 system-ui, sans-serif; color: rgb(var(--gl-text)); user-select: none; }
            .dcf-gl-res__c { display: flex; align-items: center; gap: 7px; padding: 5px 12px 5px 6px; border-radius: 10px; cursor: pointer; font-variant-numeric: tabular-nums; white-space: nowrap; }
            .dcf-gl-res__c:hover { background: rgba(var(--gl-line), .16); }
            .dcf-gl-res__c img { width: 22px; height: 22px; }
            .dcf-gl-res__dot { width: 7px; height: 7px; border-radius: 50%; background: #7fd99a; box-shadow: 0 0 8px #7fd99a; }
            .dcf-gl-res__dot[data-off] { background: rgba(var(--gl-text), .3); box-shadow: none; }
            .dcf-gl-res__sep { width: 1px; height: 20px; background: rgba(var(--gl-line), .3); }
            .dcf-gl-res__ev { font-weight: 600; font-size: 12px; opacity: .8; }
            .dcf-gl-res__ev b { color: rgb(var(--gl-accent)); opacity: 1; }
            .dcf-gl-res__fps { font-weight: 600; font-size: 11.5px; opacity: .65; padding: 0 8px 0 4px; white-space: nowrap; font-variant-numeric: tabular-nums; }
            ${GL_ON} .mcfo-fps { display: none !important; }

            /* 2 hotbar: the footer and the King's tray make room */
            ${GL_ON} [data-role="action-region"] { height: 92px !important; min-height: 92px !important;
                background: linear-gradient(0deg, rgba(var(--gl-panel), .95), rgba(var(--gl-panel), 0)) !important; border: 0 !important; box-shadow: none !important; }
            ${GL_ON}:not([data-dcf-gl-toll]) [data-role="action-region"] > * { visibility: hidden !important; }
            ${GL_ON} [data-role="king-action-tray"] { display: none !important; }
            .dcf-gl-bar { position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 50; display: flex; align-items: stretch; gap: 10px;
                padding: 6px 10px 9px; border-radius: 14px; background: linear-gradient(180deg, rgba(var(--gl-panel), .94), rgba(var(--gl-panel), .98));
                border: 1px solid rgba(var(--gl-line), .45); box-shadow: 0 10px 28px rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .06); user-select: none; }
            .dcf-gl-bar::before { content: ''; position: absolute; left: 18px; right: 18px; top: -1px; height: 2px; border-radius: 2px;
                background: linear-gradient(90deg, transparent, rgb(var(--gl-accent)) 30%, rgb(var(--gl-line)) 70%, transparent); opacity: .85; }
            html[data-dcf-gl-toll] .dcf-gl-bar { left: auto; right: 18px; transform: none; }
            html[data-dcf-gl-toll] .dcf-gl-bar__grp[data-grp="bids"], html[data-dcf-gl-toll] .dcf-gl-bar__div { display: none; }
            .dcf-gl-bar__grp { display: flex; flex-direction: column; gap: 4px; }
            .dcf-gl-bar__gl { font: 800 9.5px/1 system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: rgba(var(--gl-text), .6); padding-left: 2px; }
            .dcf-gl-bar__row { display: flex; gap: 6px; }
            .dcf-gl-bar__div { width: 1px; margin: 14px 2px 0; background: rgba(var(--gl-line), .3); }
            .dcf-gl-bar button { position: relative; width: 66px; height: 52px; border-radius: 10px; padding: 0; cursor: pointer; display: grid; place-items: center;
                border: 1px solid rgba(var(--gl-line), .45); color: rgb(var(--gl-text)); font: 800 16px/1 system-ui, sans-serif;
                background: radial-gradient(120% 95% at 50% 0%, rgba(var(--gl-line), .26), rgba(var(--gl-panel), .98) 72%);
                box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .4), inset 0 2px 0 rgba(255, 255, 255, .08), 0 3px 8px rgba(0, 0, 0, .35); transition: transform 80ms, box-shadow 120ms, border-color 120ms; }
            .dcf-gl-bar button:hover { border-color: rgb(var(--gl-accent)); box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .4), 0 0 14px rgba(var(--gl-accent), .35); }
            .dcf-gl-bar button:focus:not(:focus-visible) { outline: none; }
            .dcf-gl-bar button[data-hit] { transform: scale(.94); border-color: rgb(var(--gl-accent)); }
            .dcf-gl-bar button[data-off] { opacity: .45; filter: grayscale(.6); }
            .dcf-gl-bar button.bid { background: var(--gl-bidBg); color: rgb(var(--gl-bidText)); border-color: rgba(255, 255, 255, .5); }
            .dcf-gl-bar button.warn { background: radial-gradient(120% 95% at 50% 0%, rgba(224, 122, 122, .5), rgba(var(--gl-panel), .98) 72%); border-color: rgba(224, 122, 122, .6); }
            .dcf-gl-bar button svg { width: 26px; height: 26px; filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .45)); }
            .dcf-gl-bar__k { position: absolute; left: 5px; top: 4px; font: 800 10px/1 system-ui, sans-serif; color: rgb(var(--gl-accent)); text-shadow: 0 1px 2px rgba(0, 0, 0, .9); }
            .dcf-gl-bar__n { position: absolute; bottom: 4px; left: 0; right: 0; font: 700 8.5px/1 system-ui, sans-serif; letter-spacing: .05em; text-transform: uppercase; color: rgba(var(--gl-text), .85); text-shadow: 0 1px 2px rgba(0, 0, 0, .9); }
            .dcf-gl-bar button.bid .dcf-gl-bar__k { color: rgb(var(--gl-bidText)); text-shadow: none; }
            .dcf-gl-bar button.has-n > span:first-child { margin-top: -10px; }

            /* 4 chat: floating in the bottom-left corner, see-through, fades while quiet */
            ${GL_ON} [data-role="desktop-chat-pane"] { position: fixed !important; left: 14px !important; bottom: 12px !important; top: auto !important;
                width: 480px !important; height: 360px !important; max-height: 360px !important; z-index: 40 !important; transition: opacity .6s ease; }
            ${GL_ON} [data-role="desktop-chat-pane"][data-dcf-gl-idle]:not(:hover):not(:focus-within) { opacity: .28; }
            ${GL_ON} [data-role="chat-pane"] { height: 100% !important; background: rgba(var(--gl-panel), .38) !important; backdrop-filter: blur(6px);
                border: 1px solid rgba(var(--gl-line), .22) !important; border-radius: 12px !important; box-shadow: 0 10px 30px rgba(0, 0, 0, .3) !important; }
            ${GL_ON} [data-role="chat-pane"] .mcf-chat__header { background: transparent !important; border-color: rgba(var(--gl-line), .15) !important; box-shadow: none !important; }
            ${GL_ON} [data-role="chat-status"] { display: none !important; }
            /* Pop-out and folding make no sense for a chat that floats in its corner. */
            ${GL_ON} [data-role="chat-pane"] :is([data-role="chat-collapse"], .mcfo-chatpop-btn) { display: none !important; }
            ${GL_ON} [data-role="chat-messages"] { background: transparent !important; }
            ${GL_ON} [data-role="lane-play-region"] { grid-template-columns: minmax(0, 1fr) !important; }

            /* 5 arena: one board, no website boxes */
            ${GL_ON} [data-role="main-region"] { gap: 0 !important; border-radius: 14px; outline: 1px solid rgba(var(--gl-line), .38);
                box-shadow: 0 0 0 1px rgba(0, 0, 0, .4), 0 0 40px rgba(var(--gl-line), .16); overflow: hidden; }
            ${GL_ON} [data-role="lane-panel"], ${GL_ON} [data-role="king-pane"] { border: 0 !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; }
            ${GL_ON} [data-role="king-pane"] { border-left: 1px solid rgba(var(--gl-accent), .25) !important; border-right: 1px solid rgba(var(--gl-accent), .25) !important; }
            @media (prefers-reduced-motion: reduce) { ${GL_ON} [data-role="desktop-chat-pane"] { transition: none; } }`;
        (document.head || document.documentElement).appendChild(s);
    }

    // ---- pieces -----------------------------------------------------------------------------------
    const GL_ICON = {
        rebel: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/>',
        unbid: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
        attack: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5 21 18v3h-3"/>',
        auto: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/>',
    };
    const glSvg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GL_ICON[n]}</svg>`;
    const GL_DRINKS = ['Water', 'Lava', 'Bomb', 'Milk', 'Acid', 'Mystery'];
    const glDrink = n => glQ(`[data-role="king-action-tray"] .mcfo-drink[title^="${n}"]`);
    // key → what it does. Pages open like from the account menu (core/anchors.js PAGES).
    const GL_SLOTS = [
        { grp: 'bids', id: 'rebel', key: 'R', name: 'Rebel', cls: 'warn', icon: 'rebel', target: () => glQ('.mcfo-rebellion') },
        { grp: 'bids', id: 'b1', key: '1', text: '×1', name: 'Bid 1', cls: 'bid', target: () => glQ('[data-role="bid-1"]') },
        { grp: 'bids', id: 'b5', key: '5', text: '×5', name: 'Bid 5', cls: 'bid', target: () => glQ('[data-role="bid-5"]') },
        { grp: 'bids', id: 'b10', key: '0', text: '×10', name: 'Bid 10', cls: 'bid', target: () => glQ('[data-role="bid-10"]') },
        { grp: 'bids', id: 'unbid', key: 'U', name: 'Unbid', icon: 'unbid', target: () => glQ('.mcfo-unbid') },
        { grp: 'king', id: 'attack', key: 'F', name: 'Attack', cls: 'warn', icon: 'attack', target: () => glQ('[data-role="king-action-tray"] .mcf-king-attack-placeholder:not([hidden])') },
        ...GL_DRINKS.map((n, i) => ({ grp: 'king', id: 'drink-' + n, key: 'QWEASD'[i], name: n, drink: n, target: () => glDrink(n) })),
    ];
    const GL_PAGE_KEYS = { I: 'inventory-nav', P: 'profile-nav' };

    function glBuild() {
        if (glBuilt) return glBuilt;
        // 1 resource bar
        const res = document.createElement('div');
        res.className = 'dcf-gl-res';
        const chips = ['tickets', 'current-points', 'gold', 'diamonds'].map(roleName => {
            const c = document.createElement('div');
            c.className = 'dcf-gl-res__c';
            const img = document.createElement('img');
            img.alt = '';
            const v = document.createElement('span');
            c.append(img, v);
            let dot = null;
            if (roleName === 'tickets') { dot = document.createElement('i'); dot.className = 'dcf-gl-res__dot'; c.append(dot); }
            c.addEventListener('click', () => {
                const cell = glQ(`[data-role="metric-cell"][data-metric-role="${roleName}"]`) || glQ(`[data-role="${roleName}"]`)?.closest('[data-role="metric-cell"]');
                const go = cell && (glQ('[data-role="diamonds-purchase-link"]', cell) || glQ('.mcfo-signpost', cell) || glQ('.mcfo-tstatus', cell) || cell);
                if (go) go.click();
            });
            res.append(c);
            return { roleName, c, img, v, dot };
        });
        const sep = document.createElement('i');
        sep.className = 'dcf-gl-res__sep';
        const ev = document.createElement('div');
        ev.className = 'dcf-gl-res__c dcf-gl-res__ev';
        ev.title = 'Upcoming tilesets';
        ev.addEventListener('click', e => { e.stopPropagation(); showEvents(ev); });
        const fps = document.createElement('span');
        fps.className = 'dcf-gl-res__fps';
        res.append(sep, ev, fps);

        // 2 hotbar
        const bar = document.createElement('div');
        bar.className = 'dcf-gl-bar';
        const buttons = new Map();
        for (const [grp, label] of [['bids', 'Bids'], ['king', 'King']]) {
            if (grp === 'king') { const d = document.createElement('i'); d.className = 'dcf-gl-bar__div'; bar.append(d); }
            const g = document.createElement('div');
            g.className = 'dcf-gl-bar__grp';
            g.dataset.grp = grp;
            const gl = document.createElement('span');
            gl.className = 'dcf-gl-bar__gl';
            gl.textContent = label;
            const row = document.createElement('div');
            row.className = 'dcf-gl-bar__row';
            for (const s of GL_SLOTS.filter(x => x.grp === grp)) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = (s.cls || '') + (s.text ? '' : ' has-n');
                b.title = `${s.name} (${s.key})`;
                b.innerHTML = `<span>${s.text || (s.icon ? glSvg(s.icon) : '')}</span><span class="dcf-gl-bar__k">${s.key}</span>` + (s.text ? '' : `<span class="dcf-gl-bar__n">${s.name}</span>`);
                b.addEventListener('click', () => glFire(s));
                row.append(b);
                buttons.set(s.id, b);
            }
            g.append(gl, row);
            bar.append(g);
        }
        glBuilt = { res, chips, ev, fps, bar, buttons };
        return glBuilt;
    }

    function glFire(s) {
        const t = s.target();
        const b = glBuilt && glBuilt.buttons.get(s.id);
        if (b) { b.setAttribute('data-hit', ''); setTimeout(() => b.removeAttribute('data-hit'), 120); }
        if (t && !t.disabled) t.click();
    }

    // Values, states and the drinks' pictures follow the game every half second.
    function glTick() {
        if (!glOn || !glBuilt) return;
        glColours();
        for (const ch of glBuilt.chips) {
            const val = glQ(`[data-role="${ch.roleName}"]`);
            ch.v.textContent = (val && val.textContent.trim()) || '–';
            const cell = val && val.closest('[data-role="metric-cell"]');
            const icon = cell && glQ('img', cell);
            if (icon && ch.img.src !== icon.src) ch.img.src = icon.src;
            if (ch.dot) {
                const earning = /earning tickets/i.test(cell ? cell.textContent : '') && !/not earning/i.test(cell ? cell.textContent : '');
                ch.dot.toggleAttribute('data-off', !earning);
                ch.c.title = earning ? 'Tickets · earning' : 'Tickets · not earning';
            }
        }
        const t = (glQ('[data-role="session-cell"]')?.textContent || '').replace(/\s+/g, ' ');
        const set = (glQ('[data-role="current-tileset-name"]')?.textContent || '').trim() || (/Current:\s*(.+?)\s+Season/.exec(t) || [])[1] || '';
        const next = (/Next:\s*(.+?\))/.exec(t) || [])[1] || '';
        const evHtml = set ? `<b>${set.replace(/</g, '&lt;')}</b>${next ? ' · Next ' + next.replace(/</g, '&lt;').replace('(', ' (') : ''}` : '';
        if (glBuilt.ev.innerHTML !== evHtml) glBuilt.ev.innerHTML = evHtml;
        const badge = glQ('.mcfo-fps');
        glBuilt.fps.textContent = badge && !badge.hidden ? badge.textContent.trim() : '';
        for (const s of GL_SLOTS) {
            const b = glBuilt.buttons.get(s.id), tgt = s.target();
            const off = !tgt || tgt.disabled || tgt.getAttribute('aria-disabled') === 'true' || (tgt.style && Number(tgt.style.opacity) < 0.6 && tgt.style.opacity !== '');
            b.toggleAttribute('data-off', off);
            if (s.drink) {
                const svg = tgt && glQ('svg', tgt);
                const want = svg ? svg.outerHTML : s.name[0];
                if (b.dataset.pic !== want) { b.dataset.pic = want; b.firstElementChild.innerHTML = want; }
            }
        }
        const toll = !!glQ('[data-role="bid-area"][data-king-toll-mode="true"]');
        document.documentElement.toggleAttribute('data-dcf-gl-toll', toll);
        // The hotbar sits in the middle, unless the chat in the corner reaches into it.
        const chat = glQ('[data-role="desktop-chat-pane"]'), bar = glBuilt.bar;
        const cr = chat && chat.getBoundingClientRect();
        const w = bar.offsetWidth, room = cr && cr.width ? cr.right + 14 : 0;
        const left = !toll && room > innerWidth / 2 - w / 2 ? Math.min(room + w / 2, innerWidth - w / 2 - 8) + 'px' : '';
        if (bar.style.left !== left) bar.style.left = left;
    }

    // 4 chat: quiet after 8 s without a new line.
    function glChatWatch() {
        const pane = glQ('[data-role="desktop-chat-pane"]'), list = glQ('[data-role="chat-messages"]');
        if (!pane || !list || list.__dcfGl) return;
        list.__dcfGl = true;
        const wake = () => {
            pane.removeAttribute('data-dcf-gl-idle');
            clearTimeout(glChatIdle);
            glChatIdle = setTimeout(() => { if (glOn) pane.setAttribute('data-dcf-gl-idle', ''); }, 8000);
        };
        new MutationObserver(wake).observe(list, { childList: true });
        wake();
    }

    // 3 keys: never while typing, with a modifier, or under an open card, menu or window.
    function glKeys(e) {
        if (!glOn || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
        const t = e.target;
        if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (glQ('dcf-esc-menu, .dcf-pn, .dcf-set, .dcf-tour, .mcfo-menu')) return;
        const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        const page = GL_PAGE_KEYS[k];
        // The same key closes the page again, like a bag in a game.
        if (page) {
            e.preventDefault();
            const p = PAGES[page];
            if (!p) return;
            const w = windows.get(p.path);
            if (w && !w.min && !w.lazy) closeWindow(p.path); else openPage(p.path, p.title);
            return;
        }
        const s = GL_SLOTS.find(x => x.key === k);
        if (s) { e.preventDefault(); glFire(s); }
    }

    function glApply() {
        const want = glWanted();
        if (want === glOn) return;
        glOn = want;
        const root = document.documentElement;
        if (want) {
            glStyles();
            const b = glBuild();
            document.body.append(b.res, b.bar);
            root.setAttribute('data-dcf-gl', '');
            glColours();
            glTick();
            glChatWatch();
            glTimer = setInterval(() => { glTick(); glChatWatch(); }, 500);
        } else {
            clearInterval(glTimer);
            clearTimeout(glChatIdle);
            root.removeAttribute('data-dcf-gl');
            root.removeAttribute('data-dcf-gl-toll');
            glQ('[data-role="desktop-chat-pane"]')?.removeAttribute('data-dcf-gl-idle');
            if (glBuilt) { glBuilt.res.remove(); glBuilt.bar.remove(); }
        }
        // The game lays out its board from the room it has: let it measure again.
        dispatchEvent(new Event('resize'));
    }

    function startGameLayout() {
        if (window.top !== window.self) return;
        document.addEventListener('keydown', glKeys);
        glApply();
        const api = glApi();
        if (api && api.onChange) api.onChange(() => glApply());
        // Only one tab greets: the one in front, once the board is up.
        setTimeout(glMaybeIntro, 2500);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(glMaybeIntro, 1200); });
    }

    // ---- welcome to the new design: a card, a short tour, then the choice ---------------------
    function glMaybeIntro() {
        const api = glApi();
        if (!api || document.hidden || !glOn) return;
        let s;
        try { s = api.settings(); } catch (e) { return; }
        if (s['app.layoutIntro'] === true || !api.introClaim || !api.introClaim()) return;
        api.set('app.layoutIntro', true);
        glIntroCard();
    }

    function glIntroCard() {
        pnStyles();
        const root = pnEl('div', 'dcf-pn');
        root.setAttribute('role', 'dialog');
        const card = pnEl('div', 'dcf-pn__card');
        const head = pnEl('header', 'dcf-pn__head');
        head.innerHTML = PN_LOGO;
        const titles = pnEl('div', 'dcf-pn__titles');
        titles.append(pnEl('div', 'dcf-pn__brand', 'DreamingCrownfall'), pnEl('h2', 'dcf-pn__title', 'Welcome to the new design'));
        head.append(titles, pnEl('span', 'dcf-pn__ver', 'v' + SCRIPT_VERSION));
        const body = pnEl('div', 'dcf-pn__body');
        body.append(pnEl('p', 'dcf-pn__intro', 'The board now looks like a game instead of a website: your gold and tickets in a bar at the top, every action in a hotbar with keys at the bottom, the chat floating in the corner and lanes and King as one arena. Take a one-minute tour, then decide whether you keep it.'));
        const foot = pnEl('footer', 'dcf-pn__foot');
        const close = () => { document.removeEventListener('keydown', onKey, true); root.remove(); };
        const classic = pnEl('button', 'dcf-pn__btn', 'Back to classic');
        classic.type = 'button';
        classic.addEventListener('click', () => { close(); const a = glApi(); if (a) a.set('ui.gameLayout', false); });
        const tour = pnEl('button', 'dcf-pn__btn dcf-pn__btn--main', 'Show me around');
        tour.type = 'button';
        tour.addEventListener('click', () => { close(); glTour(); });
        foot.append(classic, pnEl('span', 'dcf-pn__spacer'), tour);
        card.append(head, body, foot);
        root.append(card);
        const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
        document.addEventListener('keydown', onKey, true);
        document.body.append(root);
        tour.focus({ preventScroll: true });
    }

    function glTour() {
        const part = 'New design';
        startTour('', { steps: [
            { part, place: 'below', title: 'Your resources', text: 'Tickets, points, gold and diamonds in one bar. The green dot means you are earning tickets. Click a value for its shop, history or loadouts, and the tileset for the next 12 hours.',
              at: [{ find: () => glBuilt && glBuilt.res }] },
            { part, place: 'above', title: 'The hotbar', text: 'Every action of the footer, now with keys: 1, 5 and 0 bid, U takes your bids back, R starts a Rebellion. While you are King the toll field comes back here and the hotbar moves aside.',
              at: [{ find: () => glQ('.dcf-gl-bar__grp[data-grp="bids"]') }, { find: () => glBuilt && glBuilt.bar }] },
            { part, place: 'above', title: 'King actions', text: 'Attack when free on F, the drinks on Q W E and A S D — the same buttons that sat under the King tile.',
              at: [{ find: () => glQ('.dcf-gl-bar__grp[data-grp="king"]') }] },
            { part, place: 'right', title: 'The chat', text: 'Floats in the corner and fades while it is quiet. A new line, the mouse or a click brings it back.',
              at: [{ find: () => glQ('[data-role="desktop-chat-pane"]') }] },
            { part, title: 'Menus and keys', text: 'I opens your inventory, P your profile. Esc brings up the game menu with everything else, F1 lists every shortcut.' },
            { part, title: 'Keep the new design?', text: 'You can switch any time in Settings › General › Layout.' },
        ], finish: [
            { label: 'Back to classic', run: () => { const a = glApi(); if (a) a.set('ui.gameLayout', false); } },
            { label: 'Keep the new design', main: true, run: () => {} },
        ] });
    }
