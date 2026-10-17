    // =========================================================================================
    // GAME LAYOUT — the board as a game client, not a website (DreamingCrownfall 0.7.0)
    // =========================================================================================
    // Switch: Settings › General › Layout (app setting ui.gameLayout). Off = the classic layout,
    // untouched. On:
    //   1. a resource bar at the top instead of the header cards (click a value: as before)
    //   2. a hotbar at the bottom instead of the footer and the tray under the King
    //   3. keys for it: 1 / 5 / 0 bid, U unbid, B autobid, R rebellion, F attack, Q W E A S D drinks,
    //      I inventory, P profile, Y achievements, J dailies, O shop, L leaderboards (also as buttons
    //      in the resource bar)
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
            .dcf-gl-res__ic { width: 22px; height: 22px; flex: none; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .45)); }
            .dcf-gl-res__dot { width: 7px; height: 7px; border-radius: 50%; background: #7fd99a; box-shadow: 0 0 8px #7fd99a; }
            .dcf-gl-res__dot[data-off] { background: rgba(var(--gl-text), .3); box-shadow: none; }
            .dcf-gl-res__sep { width: 1px; height: 20px; background: rgba(var(--gl-line), .3); }
            .dcf-gl-res__ev { font-weight: 600; font-size: 12px; opacity: .8; }
            .dcf-gl-res__ev b { color: rgb(var(--gl-accent)); opacity: 1; }
            .dcf-gl-res__nav { display: flex; gap: 2px; }
            .dcf-gl-res__nav button { width: 32px; height: 30px; display: grid; place-items: center; padding: 0; border: 1px solid transparent; border-radius: 9px;
                background: none; color: rgba(var(--gl-text), .8); cursor: pointer; }
            .dcf-gl-res__nav button:hover { background: rgba(var(--gl-line), .16); color: rgb(var(--gl-text)); }
            .dcf-gl-res__nav button[data-on] { color: rgb(var(--gl-accent)); border-color: rgba(var(--gl-accent), .5); background: rgba(var(--gl-accent), .1); }
            .dcf-gl-res__nav button:focus:not(:focus-visible) { outline: none; }
            .dcf-gl-res__nav svg { width: 18px; height: 18px; }
            .dcf-gl-res__fps { font-weight: 600; font-size: 11.5px; opacity: .65; padding: 0 8px 0 4px; white-space: nowrap; font-variant-numeric: tabular-nums; }
            ${GL_ON} .mcfo-fps { display: none !important; }
            /* Themes that put a plaque over the King tile (The Lost Bookshop's quote): the resource bar sits
               there now, so it moves over the left lane (shift from glTick) and stays visible. */
            ${GL_ON} [data-role="top-status-region"] > .mcfo-lb-plaque { visibility: visible !important; translate: var(--gl-plaque-dx, 0px) 0 !important; }
            ${GL_ON} [data-role="top-status-region"]:has(> .mcfo-lb-plaque) { overflow: visible !important; }

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
            /* King: the game's toll field and Royal Celebration button become a block in the hotbar's look,
               left of the hotbar's King half, both in the middle; the rest of the footer stays hidden. */
            ${GL_ON}[data-dcf-gl-toll] [data-role="action-region"] > :not([data-role="bid-area"]) { visibility: hidden !important; }
            ${GL_ON}[data-dcf-gl-toll] [data-role="bid-area"] { position: fixed !important; top: auto !important; left: auto !important; bottom: 10px !important; right: calc(50% + 6px) !important;
                width: auto !important; height: var(--gl-bar-h, 84px) !important; min-height: 0 !important; max-width: none !important; margin: 0 !important; transform: none !important; translate: none !important;
                display: flex !important; align-items: center !important; gap: 10px !important; padding: 0 14px !important; box-sizing: border-box !important; z-index: 50 !important;
                border-radius: 14px !important; background: linear-gradient(180deg, rgba(var(--gl-panel), .94), rgba(var(--gl-panel), .98)) !important;
                border: 1px solid rgba(var(--gl-line), .45) !important; box-shadow: 0 10px 28px rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .06) !important; }
            html[data-dcf-gl-toll] .dcf-gl-bar { left: calc(50% + 6px); right: auto; transform: none; }
            ${GL_ON}[data-dcf-gl-toll] [data-role="bid-area"] .mcfo-rebellion { display: none !important; }
            html:not([data-dcf-gl-toll]) .dcf-gl-bar button[data-king-only], html[data-dcf-gl-toll] .dcf-gl-bar button[data-not-king] { display: none; }
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
            .dcf-gl-bar button[data-busy] { border-color: rgb(var(--gl-accent)); box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .4), 0 0 14px rgba(var(--gl-accent), .45); }
            /* attack running: what it is doing, at the bottom of the King tile */
            .dcf-gl-atk { position: fixed; z-index: 48; transform: translateX(-50%); display: flex; align-items: center; gap: 9px; padding: 8px 14px 8px 10px; border-radius: 12px; cursor: pointer;
                background: linear-gradient(180deg, rgba(var(--gl-panel), .96), rgba(var(--gl-panel), .9)); border: 1px solid rgba(var(--gl-accent), .6);
                box-shadow: 0 0 18px rgba(var(--gl-accent), .25), 0 10px 26px rgba(0, 0, 0, .5); color: rgb(var(--gl-text));
                font: 800 12.5px/1 system-ui, sans-serif; letter-spacing: .06em; white-space: nowrap; user-select: none; animation: dcf-gl-in .18s ease-out; }
            .dcf-gl-atk[hidden] { display: none; }
            .dcf-gl-atk i { width: 9px; height: 9px; border-radius: 50%; background: rgb(var(--gl-accent)); box-shadow: 0 0 8px rgb(var(--gl-accent)); flex: none; }
            .dcf-gl-atk small { font-weight: 600; letter-spacing: 0; opacity: .6; margin-left: 4px; }
            .dcf-gl-atk[data-state="warn"] { border-color: rgba(224, 122, 122, .75); box-shadow: 0 0 18px rgba(224, 122, 122, .3), 0 10px 26px rgba(0, 0, 0, .5); }
            .dcf-gl-atk[data-state="warn"] i { background: #e07a7a; box-shadow: 0 0 8px #e07a7a; }
            @keyframes dcf-gl-in { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translateX(-50%); } }
            .dcf-gl-bar button[data-tone]:not([data-tone="off"]) { border-color: #7fd99a; box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .4), 0 0 12px rgba(127, 217, 154, .35); }
            .dcf-gl-bar button[data-tone="alert"] { border-color: #e07a7a; box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .4), 0 0 12px rgba(224, 122, 122, .45); }
            .dcf-gl-bar button[hidden] { display: none; }
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

            /* side panels instead of free windows (inline position and size from dragging are overruled) */
            ${GL_ON} .mcfo-win[data-dcf-side] { position: fixed !important; top: 56px !important; bottom: 104px !important; height: auto !important;
                min-width: 0 !important; max-width: none !important; transform: none !important; z-index: 45 !important;
                border-radius: 14px !important; box-shadow: 0 18px 50px rgba(0, 0, 0, .55), 0 0 0 1px rgba(var(--gl-line), .35) !important; }
            ${GL_ON} .mcfo-win[data-dcf-side="left"] { left: 14px !important; right: auto !important; width: var(--gl-w-left, min(760px, 40vw)) !important; }
            ${GL_ON} .mcfo-win[data-dcf-side="right"] { right: 14px !important; left: auto !important; width: var(--gl-w-right, min(760px, 40vw)) !important; }
            /* the inner edge of a panel: drag to make it wider or narrower (kept per side) */
            .dcf-gl-grip { display: none; }
            ${GL_ON} .mcfo-win[data-dcf-side] > .dcf-gl-grip { display: block; position: absolute; top: 0; bottom: 0; width: 10px; z-index: 5; cursor: ew-resize; }
            ${GL_ON} .mcfo-win[data-dcf-side="left"] > .dcf-gl-grip { right: 0; }
            ${GL_ON} .mcfo-win[data-dcf-side="right"] > .dcf-gl-grip { left: 0; }
            ${GL_ON} .mcfo-win[data-dcf-side] > .dcf-gl-grip:hover, ${GL_ON} .mcfo-win[data-dcf-side] > .dcf-gl-grip[data-drag] { background: linear-gradient(90deg, transparent 3px, rgba(var(--gl-accent), .6) 3px 7px, transparent 7px); }
            ${GL_ON} .mcfo-win[data-dcf-side] > :is(.mcfo-win__grip, .mcfo-win__edge) { display: none !important; }
            ${GL_ON} .mcfo-win[data-dcf-side] > .mcfo-win__head { cursor: default !important; }
            ${GL_ON} .mcfo-win[data-dcf-side] [data-mcfo-win="min"] { display: none !important; }
            ${GL_ON} .mcfo-taskbar { display: none !important; }
            ${GL_ON} .mcfo-win [data-dcf="pop"] { display: none !important; }

            /* 5 arena: one board, no website boxes */
            ${GL_ON} [data-role="main-region"] { gap: 0 !important; border-radius: 14px; outline: 1px solid rgba(var(--gl-line), .38);
                box-shadow: 0 0 0 1px rgba(0, 0, 0, .4), 0 0 40px rgba(var(--gl-line), .16); overflow: hidden; }
            ${GL_ON} [data-role="lane-panel"], ${GL_ON} [data-role="king-pane"] { border: 0 !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; }
            ${GL_ON} [data-role="king-pane"] { border-left: 1px solid rgba(var(--gl-accent), .25) !important; border-right: 1px solid rgba(var(--gl-accent), .25) !important; }
            @media (prefers-reduced-motion: reduce) { ${GL_ON} [data-role="desktop-chat-pane"] { transition: none; } }`;
        (document.head || document.documentElement).appendChild(s);
    }

    // ---- side panels ------------------------------------------------------------------------------
    // Windows of the game's pages are side panels here, one per side, like the frames in an MMO:
    // what you are (inventory, profile, achievements) on the left above the chat, what the game
    // offers (shop, dailies, leaderboards, the rest) on the right. No moving, no minimising, no
    // taskbar; the same key, Esc or ✕ closes. Classic layout: free windows as before.
    const GL_LEFT = ['/inventory', '/profile', '/achievements'];
    function glSideOf(path) { return GL_LEFT.includes(String(path).replace(/\/+$/, '')) ? 'left' : 'right'; }
    // A panel opened (or brought back): the other one on that side gives way.
    function glSideOpened(path) {
        try { if (!glOn) return; } catch (e) { return; }
        const side = glSideOf(path);
        for (const [p, w] of [...windows.entries()]) {
            if (p !== path && w.el && !w.min && w.el.dataset.dcfSide === side && p !== CHAT_WIN) closeWindow(p);
        }
    }

    // ---- resource icons (own, Luce 17.10.: nicer than the game's) and what a click does -----------
    const GL_RES = [
        { role: 'tickets', name: 'Tickets', hint: 'ticket history',
          run: el => { if (settings.ticketHistory !== false) showTicketHistory(el); },
          svg: '<defs><linearGradient id="glr-t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9cc0"/><stop offset="1" stop-color="#e0457a"/></linearGradient></defs>'
             + '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v2a2.5 2.5 0 0 0 0 5v2a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-2a2.5 2.5 0 0 0 0-5Z" fill="url(#glr-t)" stroke="#6b1735" stroke-width="1.1"/>'
             + '<path d="M15 5.6v12.8" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="1.6 1.6"/>'
             + '<path d="m9 9.2.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L6.1 11.3l2-.3Z" fill="#fff"/>' },
        { role: 'current-points', name: 'Points', hint: 'loadouts',
          run: el => { if (settings.pointsLoadouts !== false) showLoadoutMenu(el); },
          svg: '<defs><linearGradient id="glr-p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9b8ff"/><stop offset="1" stop-color="#7b4fd6"/></linearGradient></defs>'
             + '<path d="M12 2.5 20.2 7v10L12 21.5 3.8 17V7Z" fill="url(#glr-p)" stroke="#2e1660" stroke-width="1.1" stroke-linejoin="round"/>'
             + '<path d="M12 6.8 13.6 10l3.5.5-2.55 2.45.6 3.5L12 14.8l-3.15 1.65.6-3.5L6.9 10.5l3.5-.5Z" fill="#fff"/>' },
        { role: 'gold', name: 'Gold', hint: 'shop',
          run: () => glTogglePage('shop-nav'),
          svg: '<defs><radialGradient id="glr-g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff1b8"/><stop offset=".55" stop-color="#ffcf4d"/><stop offset="1" stop-color="#c4851a"/></radialGradient></defs>'
             + '<circle cx="12" cy="12" r="9" fill="url(#glr-g)" stroke="#7a4a07" stroke-width="1.1"/>'
             + '<circle cx="12" cy="12" r="6.6" fill="none" stroke="#a8670f" stroke-opacity=".55" stroke-width="1"/>'
             + '<path d="M7.8 14.6 7 9.3l2.6 2 2.4-3.3 2.4 3.3 2.6-2-.8 5.3Z" fill="#8a5509" fill-opacity=".85"/>' },
        { role: 'diamonds', name: 'Diamonds', hint: 'buy diamonds',
          run: () => openPage('/payment/packages', 'Buy Diamonds'),
          svg: '<defs><linearGradient id="glr-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9f6ff"/><stop offset="1" stop-color="#2f8fd6"/></linearGradient></defs>'
             + '<path d="M7 4h10l4 5.2L12 20.5 3 9.2Z" fill="url(#glr-d)" stroke="#0f3f6b" stroke-width="1.1" stroke-linejoin="round"/>'
             + '<path d="M3 9.2h18M9.2 4 8 9.2l4 11.3 4-11.3L14.8 4" fill="none" stroke="#0f3f6b" stroke-opacity=".55" stroke-width=".9" stroke-linejoin="round"/>'
             + '<path d="M8 9.2 12 4l4 5.2" fill="#fff" fill-opacity=".35"/>' },
    ];

    // ---- pieces -----------------------------------------------------------------------------------
    const GL_ICON = {
        rebel: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/>',
        unbid: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
        attack: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5 21 18v3h-3"/>',
        auto: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/>',
        crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z"/><path d="M5 19h14"/>',
    };
    const glSvg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GL_ICON[n]}</svg>`;
    const GL_DRINKS = ['Water', 'Lava', 'Bomb', 'Milk', 'Acid', 'Mystery'];
    const glDrink = n => glQ(`[data-role="king-action-tray"] .mcfo-drink[title^="${n}"]`);
    // key → what it does. Pages open like from the account menu (core/anchors.js PAGES).
    const GL_SLOTS = [
        // Slots with a menu (open) open it at the hotbar button — the game's own buttons are hidden,
        // a menu anchored there would open in a corner.
        { grp: 'bids', id: 'rebel', key: 'R', name: 'Rebel', cls: 'warn', icon: 'rebel', target: () => glQ('.mcfo-rebellion'),
          open: b => (settings.rebellionPanel ? (isRoyalMode() ? showCelebrationPopup : showRebellionPopup)(b) : glQ('.mcfo-rebellion')?.click()) },
        { grp: 'bids', id: 'b1', key: '1', text: '×1', name: 'Bid 1', cls: 'bid', target: () => glQ('[data-role="bid-1"]') },
        { grp: 'bids', id: 'b5', key: '5', text: '×5', name: 'Bid 5', cls: 'bid', target: () => glQ('[data-role="bid-5"]') },
        { grp: 'bids', id: 'b10', key: '0', text: '×10', name: 'Bid 10', cls: 'bid', target: () => glQ('[data-role="bid-10"]') },
        { grp: 'bids', id: 'unbid', key: 'U', name: 'Unbid', icon: 'unbid', target: () => glQ('.mcfo-unbid') },
        // Autobid opens its menu right at the hotbar; the button shows whether it runs and how much.
        { grp: 'bids', id: 'auto', key: 'B', name: 'Autobid', icon: 'auto', auto: true, target: () => glQ('.mcfo-autobid'), open: b => showAutobidMenu(b) },
        // Attack when free is the app's copy of the game's button (the game's own one stays 0×0 under it).
        // While you are King there is nothing to attack: the same place and key open the Royal Celebrations.
        { grp: 'king', id: 'celeb', key: 'F', name: 'Celebrate', icon: 'crown', kingOnly: true, target: () => glQ('.mcfo-rebellion'),
          open: b => (settings.rebellionPanel ? showCelebrationPopup(b) : glQ('.mcfo-rebellion')?.click()) },
        { grp: 'king', id: 'attack', key: 'F', name: 'Attack', cls: 'warn', icon: 'attack', notKing: true,
          target: () => glQ('[data-role="king-action-tray"] .mcfo-attack') || glQ('[data-role="king-action-tray"] .mcf-king-attack-placeholder:not([hidden])') },
        ...GL_DRINKS.map((n, i) => ({ grp: 'king', id: 'drink-' + n, key: 'QWEASD'[i], name: n, drink: n, target: () => glDrink(n),
          open: b => { const bev = BEVERAGES.find(x => x.label === n); if (bev) showBeveragePanel(bev, b); } })),
    ];
    // Pages: buttons in the resource bar and keys (I and P asked for by Luce, the rest alike).
    const GL_PAGES = [
        { key: 'I', page: 'inventory-nav', name: 'Inventory', icon: '<path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>' },
        { key: 'P', page: 'profile-nav', name: 'Profile', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' },
        { key: 'Y', page: 'achievements', name: 'Achievements', icon: '<circle cx="12" cy="15" r="5"/><path d="M8.5 11.5 6 3h4l2 5 2-5h4l-2.5 8.5"/>' },
        { key: 'J', page: 'dailies-nav', name: 'Dailies', icon: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
        { key: 'O', page: 'shop-nav', name: 'Shop', icon: '<path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>' },
        { key: 'L', page: 'leaderboards-nav', name: 'Leaderboards', icon: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>' },
    ];
    // The same key or button closes the page again, like a bag in a game.
    function glTogglePage(pageKey) {
        const p = PAGES[pageKey];
        if (!p) return;
        const w = windows.get(p.path);
        if (w && !w.min && !w.lazy) closeWindow(p.path); else openPage(p.path, p.title);
    }

    function glBuild() {
        if (glBuilt) return glBuilt;
        // 1 resource bar
        const res = document.createElement('div');
        res.className = 'dcf-gl-res';
        const chips = GL_RES.map(r => {
            const c = document.createElement('div');
            c.className = 'dcf-gl-res__c';
            c.title = `${r.name} · click: ${r.hint}`;
            c.insertAdjacentHTML('beforeend', `<svg class="dcf-gl-res__ic" viewBox="0 0 24 24" aria-hidden="true">${r.svg}</svg>`);
            const v = document.createElement('span');
            c.append(v);
            let dot = null;
            if (r.role === 'tickets') { dot = document.createElement('i'); dot.className = 'dcf-gl-res__dot'; c.append(dot); }
            // Menus open right here; stopPropagation, or the click that opens one also closes it.
            c.addEventListener('click', e => { e.stopPropagation(); r.run(c); });
            res.append(c);
            return { roleName: r.role, r, c, v, dot };
        });
        const sep = document.createElement('i');
        sep.className = 'dcf-gl-res__sep';
        const ev = document.createElement('div');
        ev.className = 'dcf-gl-res__c dcf-gl-res__ev';
        ev.title = 'Upcoming tilesets';
        ev.addEventListener('click', e => { e.stopPropagation(); showEvents(ev); });
        const fps = document.createElement('span');
        fps.className = 'dcf-gl-res__fps';
        const sep2 = document.createElement('i');
        sep2.className = 'dcf-gl-res__sep';
        const pages = new Map();
        const nav = document.createElement('div');
        nav.className = 'dcf-gl-res__nav';
        for (const pg of GL_PAGES) {
            const b = document.createElement('button');
            b.type = 'button';
            b.title = `${pg.name} (${pg.key})`;
            b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pg.icon}</svg>`;
            b.addEventListener('click', e => { e.stopPropagation(); glTogglePage(pg.page); });
            nav.append(b);
            pages.set(pg.page, b);
        }
        res.append(sep, ev, fps, sep2, nav);

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
                // stopPropagation: the menus close on any click that reaches the page — the opening one included.
                b.addEventListener('click', e => { e.stopPropagation(); glFire(s); });
                if (s.kingOnly) b.dataset.kingOnly = '';
                if (s.notKing) b.dataset.notKing = '';
                row.append(b);
                buttons.set(s.id, b);
            }
            g.append(gl, row);
            bar.append(g);
        }
        // Attack status at the bottom of the King tile; a click cancels, like the button itself.
        const atk = document.createElement('div');
        atk.className = 'dcf-gl-atk';
        atk.hidden = true;
        atk.innerHTML = '<i></i><span></span><small>click to cancel</small>';
        atk.addEventListener('click', e => { e.stopPropagation(); const s = GL_SLOTS.find(x => x.id === 'attack'); if (s) glFire(s); });
        glBuilt = { res, chips, ev, fps, bar, buttons, pages, atk };
        return glBuilt;
    }

    function glFire(s) {
        const t = s.target();
        const b = glBuilt && glBuilt.buttons.get(s.id);
        if (b) { b.setAttribute('data-hit', ''); setTimeout(() => b.removeAttribute('data-hit'), 120); }
        if (s.open) { if (t && b) s.open(b); return; }
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
            if (ch.dot) {
                const earning = /earning tickets/i.test(cell ? cell.textContent : '') && !/not earning/i.test(cell ? cell.textContent : '');
                ch.dot.toggleAttribute('data-off', !earning);
                const t = `Tickets · ${earning ? 'earning' : 'not earning'} · click: ${ch.r.hint}`;
                if (ch.c.title !== t && !ch.c.matches(':hover')) ch.c.title = t;   // under the mouse the tooltip holds it
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
            if (s.auto) {
                // Hidden when the autobid button is switched off in the settings; otherwise its tone and amount.
                b.hidden = !tgt;
                const tone = tgt ? tgt.getAttribute('data-mcfo-tone') || 'off' : 'off';
                if (b.dataset.tone !== tone) b.dataset.tone = tone;
                const n = b.querySelector('.dcf-gl-bar__n'), label = tgt && tone !== 'off' ? (tgt.textContent.match(/×\s*\d+/) || ['On'])[0] : 'Autobid';
                if (n && n.textContent !== label) n.textContent = label;
                if (tgt && b.title !== tgt.title + ' (B)') b.title = tgt.title + ' (B)';
                b.removeAttribute('data-off');
                continue;
            }
            if (s.drink) {
                const svg = tgt && glQ('svg', tgt);
                const want = svg ? svg.outerHTML : s.name[0];
                if (b.dataset.pic !== want) { b.dataset.pic = want; b.firstElementChild.innerHTML = want; }
            }
        }
        for (const [pageKey, b] of glBuilt.pages) {
            const w = PAGES[pageKey] && windows.get(PAGES[pageKey].path);
            b.toggleAttribute('data-on', !!(w && w.el && !w.min && w.el.isConnected));
        }
        for (const el of document.querySelectorAll('.mcfo-win[data-dcf-side]')) {
            if (!el.querySelector(':scope > .dcf-gl-grip')) glGrip(el);
            // The pages inside know they are a side panel (compact shop head, shop-dailies.js).
            for (const f of el.querySelectorAll('iframe')) {
                try { const r = f.contentDocument && f.contentDocument.documentElement; if (r && !r.hasAttribute('data-dcf-gl-panel')) r.setAttribute('data-dcf-gl-panel', ''); } catch (e) {}
            }
        }
        const toll = !!glQ('[data-role="bid-area"][data-king-toll-mode="true"]');
        document.documentElement.toggleAttribute('data-dcf-gl-toll', toll);
        const barH = glBuilt.bar.offsetHeight + 'px';
        if (document.documentElement.style.getPropertyValue('--gl-bar-h') !== barH) document.documentElement.style.setProperty('--gl-bar-h', barH);
        glAttackStatus();
        // A theme plaque centred on the King tile goes to the left lane's left edge instead (see the CSS).
        const plaque = glQ('[data-role="top-status-region"] > .mcfo-lb-plaque');
        const lane = glQ('[data-role="lane-panel"]'), kp = glQ('[data-role="king-pane"]');
        if (plaque && lane && kp) {
            const l = lane.getBoundingClientRect(), k = kp.getBoundingClientRect();
            // Left-aligned at the lane's left edge: centred, the resource bar covered it at 1920 px (Luce).
            const dx = Math.round((l.left + 16 + plaque.offsetWidth / 2) - (k.left + k.width / 2)) + 'px';
            if (document.documentElement.style.getPropertyValue('--gl-plaque-dx') !== dx) document.documentElement.style.setProperty('--gl-plaque-dx', dx);
        }
        // The hotbar sits in the middle, unless the chat in the corner reaches into it.
        const chat = glQ('[data-role="desktop-chat-pane"]'), bar = glBuilt.bar;
        const cr = chat && chat.getBoundingClientRect();
        const w = bar.offsetWidth, room = cr && cr.width ? cr.right + 14 : 0;
        const left = !toll && room > innerWidth / 2 - w / 2 ? Math.min(room + w / 2, innerWidth - w / 2 - 8) + 'px' : '';
        if (bar.style.left !== left) bar.style.left = left;
    }

    // Panel width: dragged at the inner edge, kept per side (localStorage of this tab's account).
    const glWidthKey = side => 'dcf_gl_w_' + side;
    function glWidths() {
        for (const side of ['left', 'right']) {
            let v = 0;
            try { v = Number(localStorage.getItem(glWidthKey(side))) || 0; } catch (e) {}
            if (v) document.documentElement.style.setProperty('--gl-w-' + side, Math.min(v, Math.round(innerWidth * 0.8)) + 'px');
        }
    }
    function glGrip(el) {
        const g = document.createElement('div');
        g.className = 'dcf-gl-grip';
        g.title = 'Drag to resize';
        g.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault(); e.stopPropagation();
            g.setPointerCapture(e.pointerId);
            g.setAttribute('data-drag', '');
            const side = el.dataset.dcfSide;
            const move = ev => {
                const r = el.getBoundingClientRect();
                const w = Math.round(Math.max(380, Math.min(innerWidth * 0.8, side === 'left' ? ev.clientX - r.left : r.right - ev.clientX)));
                document.documentElement.style.setProperty('--gl-w-' + side, w + 'px');
            };
            const up = () => {
                g.removeEventListener('pointermove', move);
                g.removeAttribute('data-drag');
                const w = parseInt(document.documentElement.style.getPropertyValue('--gl-w-' + side), 10);
                try { if (w) localStorage.setItem(glWidthKey(side), String(w)); } catch (e) {}
            };
            g.addEventListener('pointermove', move);
            g.addEventListener('pointerup', up, { once: true });
            g.addEventListener('pointercancel', up, { once: true });
        });
        el.append(g);
    }

    // The app's attack-when-free button says what it is doing (WAITING: IN TILE, ATTACKING … — king/
    // attack-when-free.js); its tray is hidden here, so the words go to the bottom of the King tile.
    function glAttackStatus() {
        const copy = glQ('[data-role="king-action-tray"] .mcfo-attack');
        const state = copy ? copy.getAttribute('data-mcfo-state') || '' : '';
        const a = glBuilt.atk, btn = glBuilt.buttons.get('attack');
        btn.toggleAttribute('data-busy', !!state);
        const king = glQ('[data-role="king-pane"]');
        if (!state || !king) { a.hidden = true; return; }
        const text = (copy.textContent || '').trim();
        const span = a.querySelector('span');
        if (span.textContent !== text) span.textContent = text;
        if (a.dataset.state !== state) a.dataset.state = state;
        const r = king.getBoundingClientRect();
        a.style.left = Math.round(r.left + r.width / 2) + 'px';
        a.style.bottom = Math.round(innerHeight - r.bottom + 18) + 'px';
        a.hidden = false;
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
        // An open hotbar menu does not block: the same key closes it again (showPanel toggles per anchor).
        if (glQ('dcf-esc-menu, .dcf-pn, .dcf-set, .dcf-tour')) return;
        const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        const pg = GL_PAGES.find(x => x.key === k);
        if (pg) { e.preventDefault(); glTogglePage(pg.page); return; }
        const king = document.documentElement.hasAttribute('data-dcf-gl-toll');
        const s = GL_SLOTS.find(x => x.key === k && !(king ? x.notKing : x.kingOnly));
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
            document.body.append(b.res, b.bar, b.atk);
            root.setAttribute('data-dcf-gl', '');
            glWidths();
            glColours();
            glTick();
            glChatWatch();
            glTimer = setInterval(() => { glTick(); glChatWatch(); }, 500);
            // The attack status changes by the second (lava countdown): follow the button directly.
            const tray = glQ('[data-role="king-action-tray"]');
            if (tray && !tray.__dcfGlObs) { tray.__dcfGlObs = true; new MutationObserver(() => { if (glOn && glBuilt) glAttackStatus(); }).observe(tray, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-mcfo-state'] }); }
        } else {
            clearInterval(glTimer);
            clearTimeout(glChatIdle);
            root.removeAttribute('data-dcf-gl');
            root.removeAttribute('data-dcf-gl-toll');
            glQ('[data-role="desktop-chat-pane"]')?.removeAttribute('data-dcf-gl-idle');
            for (const f of document.querySelectorAll('.mcfo-win iframe')) { try { f.contentDocument.documentElement.removeAttribute('data-dcf-gl-panel'); } catch (e) {} }
            if (glBuilt) { glBuilt.res.remove(); glBuilt.bar.remove(); glBuilt.atk.remove(); }
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
        if (s['app.layoutIntro'] === true) return;
        // After an update the patch notes come up first (What's new); the welcome waits until they are
        // closed — on top of them, its tour had nothing to point at (Luce, 17.10. after 0.7.0).
        if (glQ('.dcf-pn, .dcf-set, .dcf-tour, dcf-esc-menu')) { clearTimeout(glMaybeIntro.t); glMaybeIntro.t = setTimeout(glMaybeIntro, 1000); return; }
        if (!api.introClaim || !api.introClaim()) return;
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
        // Nothing may cover the board while the tour points at it.
        try { closePatchNotes(); closeAppSettings(); closeMenus(); } catch (e) {}
        const part = 'New design';
        startTour('', { steps: [
            { part, place: 'below', title: 'Your resources', text: 'Tickets, points, gold and diamonds in one bar. The green dot means you are earning tickets. Click a value for its shop, history or loadouts, the tileset for the next 12 hours — and the buttons on the right open your inventory, profile, achievements, dailies, shop and leaderboards.',
              at: [{ find: () => glBuilt && glBuilt.res }] },
            { part, place: 'above', title: 'The hotbar', text: 'Every action of the footer, now with keys: 1, 5 and 0 bid, U takes your bids back, R starts a Rebellion. While you are King the toll field comes back here and the hotbar moves aside.',
              at: [{ find: () => glQ('.dcf-gl-bar__grp[data-grp="bids"]') }, { find: () => glBuilt && glBuilt.bar }] },
            { part, place: 'above', title: 'King actions', text: 'Attack when free on F, the drinks on Q W E and A S D — the same buttons that sat under the King tile.',
              at: [{ find: () => glQ('.dcf-gl-bar__grp[data-grp="king"]') }] },
            { part, place: 'right', title: 'The chat', text: 'Floats in the corner and fades while it is quiet. A new line, the mouse or a click brings it back.',
              at: [{ find: () => glQ('[data-role="desktop-chat-pane"]') }] },
            { part, title: 'Menus and keys', text: 'Pages open as panels at the sides — drag their inner edge to make them wider. Keys: I inventory, P profile, Y achievements, J dailies, O shop, L leaderboards; the same key closes them. Esc brings up the game menu, F1 lists every shortcut.' },
            { part, title: 'Keep the new design?', text: 'You can switch any time in Settings › General › Layout.' },
        ], finish: [
            { label: 'Back to classic', run: () => { const a = glApi(); if (a) a.set('ui.gameLayout', false); } },
            { label: 'Keep the new design', main: true, run: () => {} },
        ] });
    }
