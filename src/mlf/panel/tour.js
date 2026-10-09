    // =========================================================================================
    // DREAMINGCROWNFALL: GUIDED TOUR (app 0.3.0)
    // =========================================================================================
    // A spotlight over the running game: first how Marble Crownfall works (following the game's
    // own How to Play page: watch, bid, run, results, then King, Gold and Diamonds, Rebellions),
    // then what the app adds. Every step points at a live element; when one is missing (signed
    // out, a different layout) the card stands in the middle instead. Esc ends it, the arrow keys
    // page through. Started from the welcome steps, Settings › About and What's new.
    const TOUR_CSS_ID = 'dcf-tour-css';
    let tourState = null;   // { root, spot, card, steps, i, raf, keyHandler } while running

    const tourRole = r => document.querySelector(`[data-role="${r}"]`);
    const tourMetric = m => document.querySelector(`[data-role="metric-cell"][data-metric-role="${m}"]`);
    const tourByText = (sel, re) => [...document.querySelectorAll(sel)].find(e => re.test((e.textContent || '').trim()) && tourVisible(e)) || null;
    const tourIsKing = () => !!document.querySelector('[data-role="bid-area"][data-king-toll-mode="true"]');

    // Really there for the eye: in the page, on screen, not hidden or faded out, and not under
    // anything else (an open window, a folded panel) — checked at a few points of the element.
    // The tour itself is hidden for the check, or it would cover everything.
    function tourVisible(el) {
        if (!el || !el.isConnected) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 6 || r.height < 6 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false;
        for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
        }
        const root = tourState && tourState.root;
        if (root) root.style.visibility = 'hidden';
        try {
            return [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5], [0.5, 0.25], [0.5, 0.75]].some(([fx, fy]) => {
                const x = r.left + r.width * fx, y = r.top + r.height * fy;
                if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
                const hit = document.elementFromPoint(x, y);
                return !!hit && (el === hit || el.contains(hit) || hit.contains(el));
            });
        } finally { if (root) root.style.visibility = ''; }
    }

    // Each step names where its subject can be, best first: { find, text?, when? }. The first one
    // that is really on screen is shown, with its own text if it has one; none at all — the card
    // stands in the middle and says where the thing is right now (missing). So the tour fits
    // whatever has been switched on, moved or folded, and who you are at the moment (King, guest).
    const TOUR_STEPS = [
        { part: 'The game', title: 'Welcome to the arena',
          text: 'A short tour: first how Marble Crownfall works, then what this app adds on top. Arrow keys page through, Esc ends it whenever you like.' },
        { part: 'The game', place: 'right', title: 'Tiles run here',
          text: 'Each lane moves through bidding, the tile reveal, the live run and the results. Watch one tile from start to finish first; every tile has a rarity, and rarity changes the numbers on it.',
          at: [{ find: () => [...document.querySelectorAll('[data-role="lane-panel"]')].find(tourVisible) }, { find: () => tourRole('main-region') }],
          missing: 'The lanes fill the middle of the game; right now something covers them.' },
        { part: 'The game', place: 'below', title: 'Tickets',
          text: 'Tickets pay for your bids. You earn them while it says "Active: Earning Tickets": an accepted bid or a King attack keeps you earning for 15 minutes; watching alone does not. They arrive in three-minute steps.',
          at: [{ find: () => tourMetric('tickets') }],
          missing: 'Your tickets stand on the first card of the header. Tickets pay for your bids; an accepted bid or a King attack keeps you earning them for 15 minutes.' },
        { part: 'The game', place: 'above', title: 'Bid with the chips',
          text: 'While a lane takes bids, each chip bids at once and adds its number: 5 twice is 10. The 8 highest bids get in, up to 8 more are drawn by chance weighted by their bids. A paid bid is spent when the tile starts, even if you are not drawn.',
          at: [
            { when: tourIsKing, find: () => tourRole('bid-area'), title: 'You are King: the toll',
              text: 'While you wear the Crown, the ticket chips make room for the toll: what every player pays in Points to enter. A higher toll also adds to the Gold you earn at each tile reveal. The chips come back once the throne passes on. For everyone else, each chip bids at once and adds its number; the 8 highest bids get in, up to 8 more are drawn.' },
            { find: () => tourRole('bid-rail') },
            { find: () => tourRole('bid-area') },
            { find: () => document.querySelector('.mcfo-rail-toggle'),
              text: 'The ticket rail is folded: this arrow opens it. While a lane takes bids, each chip bids at once and adds its number; the 8 highest bids get in, up to 8 more are drawn by chance weighted by their bids.' },
          ],
          missing: 'The ticket chips sit at the bottom of the game while a lane takes bids: each chip bids at once and adds its number. The 8 highest bids get in, up to 8 more are drawn by chance weighted by their bids.' },
        { part: 'The game', place: 'below', title: 'Your marble, your Points',
          text: 'Your marble runs on its own. Buckets add or subtract Points, pink and cyan ones multiply, ÷ divides, the black ∞ sets them to zero, and eliminators pop the marble. Current Points is your balance; the result row shows the Prize and your Run Score.',
          at: [{ find: () => tourMetric('current-points') }],
          missing: 'Your marble runs on its own. Buckets add or subtract Points, pink and cyan ones multiply, ÷ divides, the black ∞ sets them to zero, and eliminators pop the marble. Current Points, in the header, is your balance.' },
        { part: 'The game', place: 'right', title: 'The King',
          text: 'The second contest: the King sits at the top behind a wall of blocks. ATTACK sends your marble in, and breaking blocks costs your Points. Reach the throne and the Crown is yours. The King earns Gold at every tile reveal and sets the toll.',
          at: [
            { when: tourIsKing, find: () => tourRole('king-tile-frame') || tourRole('king-pane'), title: 'The King — that is you',
              text: 'You sit at the top behind your wall of blocks; challengers send their marbles in with ATTACK and pay for every block they break with their Points. Whoever reaches the throne takes the Crown. Meanwhile you earn Gold at every tile reveal and set the toll.' },
            { find: () => tourRole('king-tile-frame') }, { find: () => tourRole('king-pane') },
          ],
          missing: 'The king tile shows the throne: the King sits at the top behind a wall of blocks, and ATTACK sends your marble in to break through — every block costs your Points.' },
        { part: 'The game', place: 'below', title: 'Gold and Diamonds',
          text: 'Gold comes from the throne, Daily Quests, achievements and gifts, and buys Shop items, King beverages and gifts. Diamonds are the premium currency: Rebellions, Shop items and gifts.',
          at: [{ find: () => tourMetric('gold') }, { find: () => tourMetric('diamonds') }],
          missing: 'Gold comes from the throne, Daily Quests, achievements and gifts; Diamonds are the premium currency for Rebellions, Shop items and gifts. Both stand in the header.' },
        { part: 'The game', place: 'above', title: 'Rebellion',
          text: 'Paid in Diamonds: protected entries over several tiles and a score boost around your marble. Look at tier and cost first, a Rebellion cannot be cancelled. Best left until the basic loop feels familiar.',
          at: [{ find: () => document.querySelector('.mcfo-rebellion') }, { find: () => tourByText('button', /^Rebellion$/i) }],
          missing: 'Rebellions are paid in Diamonds: protected entries over several tiles and a score boost around your marble. The Rebellion button sits by the ticket chips or in the footer; it cannot be cancelled once started.' },
        { part: 'The game', place: 'below', title: 'Tilesets',
          text: 'The set of tiles changes over the day. This shows what is on now and what comes next; Events lists more.',
          at: [{ find: () => tourRole('session-cell') }, { find: () => tourRole('tileset-indicator') }, { find: () => tourByText('button, a', /^Events\b/i) }],
          missing: 'The set of tiles changes over the day; the header and the Events page show what is on now and what comes next.' },
        { part: 'The game', place: 'left', title: 'Chat',
          text: 'Everyone in the arena, in one room. Signed in, you can write, throw tomatoes and more.',
          at: [
            { when: () => !document.querySelector('.mcf-chat[data-collapsed="true"]'), find: () => tourRole('chat-pane') },
            { find: () => document.querySelector('.mcfo-chatrail'), text: 'The chat is folded into this rail: click it to open it. Everyone in the arena, in one room; signed in, you can write, throw tomatoes and more.' },
            { find: () => tourRole('chat-collapse'), text: 'The chat is folded away: this opens it again. Everyone in the arena, in one room; signed in, you can write, throw tomatoes and more.' },
          ],
          missing: 'Your chat is not on this screen right now — in a window of its own, or folded away. Everyone in the arena talks there; signed in, you can write, throw tomatoes and more.' },
        { part: 'The app', title: 'Accounts in tabs',
          text: 'Every tab at the very top of the window is one account with its own login; "+" adds one, Ctrl+1 to 9 switch. With two or more there is Home: every account at a glance, with what is waiting to be claimed.' },
        { part: 'The app', title: 'Settings',
          text: 'The gear at the top right of the window (or Ctrl+,) opens the settings. Everything the app adds is switched and tuned there, and the search finds any switch: themes, the chat, the king tile, performance, sound and music, notifications, Discord.' },
        { part: 'The app', title: 'Windows of their own',
          text: 'Inventory, Shop, Leaderboards and the other windows open as real windows: move them to another screen. Prefer them inside the game? Settings › General.' },
        { part: 'The app', title: 'The HUD',
          text: 'F2 opens a small window that stays on top of everything, with what you want to keep an eye on: the King, a Royal Celebration, your tickets, rewards to claim. Build it the way you like in Settings › HUD.' },
        { part: 'The app', title: 'Notifications and more',
          text: 'Desktop notifications for the throne, celebrations, gifts, achievements and shop items for your quests, also in the background. Tabs recover by themselves after a crash, sleep or a lost connection. Have fun in the arena!' },
    ];

    // Where a step points right now: { el, title, text } — el null means the middle of the screen.
    function tourResolve(step) {
        for (const c of step.at || []) {
            if (c.when && !c.when()) continue;
            let el = null;
            try { el = c.find(); } catch (e) {}
            if (tourVisible(el)) return { el, title: c.title || step.title, text: c.text || step.text };
        }
        return { el: null, title: step.title, text: step.at ? (step.missing || step.text) : step.text };
    }

    function tourStyles() {
        if (document.getElementById(TOUR_CSS_ID)) return;
        const s = document.createElement('style');
        s.id = TOUR_CSS_ID;
        s.textContent = `
            .dcf-tour { position: fixed; inset: 0; z-index: 2147483000; font-family: inherit; }
            .dcf-tour__block { position: fixed; inset: 0; }
            /* Four shades around the hole: a box-shadow spread that size is simply not drawn. */
            .dcf-tour__shade { position: fixed; background: rgba(8, 5, 16, 0.8); pointer-events: none; }
            .dcf-tour__spot { position: fixed; border-radius: 12px; pointer-events: none;
                outline: 2px solid #ffd36e; outline-offset: 2px; box-shadow: 0 0 18px rgba(255, 211, 110, 0.35); }
            .dcf-tour__spot[data-none] { left: 50% !important; top: 50% !important; width: 0 !important; height: 0 !important; outline: 0; }
            .dcf-tour__arrow { position: fixed; width: 26px; height: 26px; margin: -13px 0 0 -13px; pointer-events: none; color: #ffd36e;
                filter: drop-shadow(0 0 6px rgba(255, 211, 110, 0.6)); animation: dcf-tour-bob 900ms ease-in-out infinite; }
            .dcf-tour__arrow[hidden] { display: none; }
            .dcf-tour__arrow svg { width: 100%; height: 100%; display: block; transform: rotate(var(--rot, 0deg)); }
            @keyframes dcf-tour-bob { 0%, 100% { translate: 0 0; } 50% { translate: var(--dx, 0) var(--dy, 0); } }
            .dcf-tour__card { position: fixed; width: min(380px, calc(100vw - 32px)); padding: 18px 20px 16px; border-radius: 16px;
                color: #ece4f7; background: linear-gradient(180deg, #241a3a, #140f20); border: 1px solid rgba(180, 138, 232, 0.32);
                box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65); transition: left 220ms ease, top 220ms ease; }
            .dcf-tour__card::before { content: ''; position: absolute; left: 16px; right: 16px; top: 0; height: 2px;
                background: linear-gradient(90deg, transparent, #ffd36e 30%, #b48ae8 70%, transparent); }
            .dcf-tour__kicker { display: flex; justify-content: space-between; color: #ffd36e; font-size: 10.5px; font-weight: 800;
                letter-spacing: 0.16em; text-transform: uppercase; }
            .dcf-tour__kicker span:last-child { color: #7d7194; letter-spacing: 0.05em; }
            .dcf-tour__title { margin: 6px 0 6px; font-size: 18px; font-weight: 800; }
            .dcf-tour__text { margin: 0; color: #cfc4e2; font-size: 13.5px; line-height: 1.5; }
            .dcf-tour__dots { display: flex; gap: 4px; margin: 14px 0 12px; }
            .dcf-tour__dots i { height: 3px; flex: 1; border-radius: 2px; background: rgba(180, 138, 232, 0.2); }
            .dcf-tour__dots i[data-done] { background: #b48ae8; }
            .dcf-tour__dots i[data-app] { background: rgba(255, 211, 110, 0.18); }
            .dcf-tour__dots i[data-app][data-done] { background: #ffd36e; }
            .dcf-tour__foot { display: flex; align-items: center; gap: 8px; }
            .dcf-tour__foot .grow { flex: 1; }
            .dcf-tour__btn { font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; padding: 8px 14px; border-radius: 9px;
                color: #ece4f7; background: transparent; border: 1px solid rgba(180, 138, 232, 0.35); }
            .dcf-tour__btn:hover { background: rgba(180, 138, 232, 0.12); }
            .dcf-tour__btn--main { border: 0; color: #1a1026; background: linear-gradient(180deg, #ffe08f, #f2b84b); }
            .dcf-tour__btn--main:hover { background: linear-gradient(180deg, #ffe7a6, #f5c25f); }
            .dcf-tour__skip { font: inherit; font-size: 12px; color: #8f84a6; background: none; border: 0; cursor: pointer; padding: 4px; }
            .dcf-tour__skip:hover { color: #ece4f7; }`;
        document.head.appendChild(s);
    }

    function tourEl(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    // Spotlight on the target, card beside it where there is room (asked side first), else centred.
    function tourPlace() {
        if (!tourState) return;
        const { spot, card, steps, i } = tourState;
        const step = steps[i];
        const el = tourState.target;
        const r = el && el.getBoundingClientRect();
        const W = innerWidth, H = innerHeight, cw = card.offsetWidth, ch = card.offsetHeight, gap = 40, pad = 6;
        const arrow = tourState.arrow;
        const shade = (k, x, y, w, h) => Object.assign(tourState.shades[k].style, { left: x + 'px', top: y + 'px', width: Math.max(0, w) + 'px', height: Math.max(0, h) + 'px' });
        if (!r || r.width < 4 || r.height < 4) {
            arrow.hidden = true;
            shade(0, 0, 0, W, H); shade(1, 0, 0, 0, 0); shade(2, 0, 0, 0, 0); shade(3, 0, 0, 0, 0);
            spot.setAttribute('data-none', '');
            card.style.left = Math.round((W - cw) / 2) + 'px';
            card.style.top = Math.round((H - ch) / 2) + 'px';
            return;
        }
        spot.removeAttribute('data-none');
        const x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad);
        spot.style.left = x + 'px'; spot.style.top = y + 'px';
        spot.style.width = Math.min(W - x - 4, r.width + pad * 2) + 'px';
        spot.style.height = Math.min(H - y - 4, r.height + pad * 2) + 'px';
        const sw = Math.min(W - x - 4, r.width + pad * 2), sh = Math.min(H - y - 4, r.height + pad * 2);
        shade(0, 0, 0, W, y);                     // above
        shade(1, 0, y + sh, W, H - y - sh);       // below
        shade(2, 0, y, x, sh);                    // left
        shade(3, x + sw, y, W - x - sw, sh);      // right
        const fits = {
            below: r.bottom + gap + ch < H, above: r.top - gap - ch > 0,
            right: r.right + gap + cw < W, left: r.left - gap - cw > 0,
        };
        const side = [step.place, 'below', 'above', 'right', 'left'].find(s => s && fits[s]);
        let left, top;
        if (side === 'below' || side === 'above') {
            left = r.left + r.width / 2 - cw / 2;
            top = side === 'below' ? r.bottom + gap : r.top - gap - ch;
        } else if (side === 'right' || side === 'left') {
            left = side === 'right' ? r.right + gap : r.left - gap - cw;
            top = r.top + r.height / 2 - ch / 2;
        } else { left = (W - cw) / 2; top = (H - ch) / 2; }
        left = Math.max(12, Math.min(W - cw - 12, left));
        top = Math.max(12, Math.min(H - ch - 12, top));
        card.style.left = Math.round(left) + 'px';
        card.style.top = Math.round(top) + 'px';
        // The arrow in the gap, pointing from the card at the target (the drawn arrow points right).
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const cx = clamp(r.left + r.width / 2, left + 24, left + cw - 24), cy = clamp(r.top + r.height / 2, top + 24, top + ch - 24);
        const at = {
            below: [cx, r.bottom + pad + (top - r.bottom - pad) / 2, -90, '0', '-5px'],
            above: [cx, r.top - pad - (r.top - pad - top - ch) / 2, 90, '0', '5px'],
            right: [r.right + pad + (left - r.right - pad) / 2, cy, 180, '-5px', '0'],
            left: [r.left - pad - (r.left - pad - left - cw) / 2, cy, 0, '5px', '0'],
        }[side];
        arrow.hidden = !at;
        if (at) {
            arrow.style.left = Math.round(at[0]) + 'px';
            arrow.style.top = Math.round(at[1]) + 'px';
            arrow.style.setProperty('--rot', at[2] + 'deg');
            arrow.style.setProperty('--dx', at[3]);
            arrow.style.setProperty('--dy', at[4]);
        }
    }

    function tourDraw() {
        const { card, steps, i } = tourState;
        const step = steps[i];
        const at = tourResolve(step);
        tourState.target = at.el;
        tourState.shown = at;
        const kicker = tourEl('div', 'dcf-tour__kicker');
        kicker.append(tourEl('span', null, step.part), tourEl('span', null, `${i + 1} / ${steps.length}`));
        const dots = tourEl('div', 'dcf-tour__dots');
        steps.forEach((s, k) => {
            const d = tourEl('i');
            if (k <= i) d.setAttribute('data-done', '');
            if (s.part === 'The app') d.setAttribute('data-app', '');
            dots.appendChild(d);
        });
        const foot = tourEl('div', 'dcf-tour__foot');
        const skip = tourEl('button', 'dcf-tour__skip', i === steps.length - 1 ? '' : 'End tour');
        skip.type = 'button';
        skip.addEventListener('click', tourEnd);
        const back = tourEl('button', 'dcf-tour__btn', 'Back');
        back.type = 'button';
        back.hidden = i === 0;
        back.addEventListener('click', () => tourGo(-1));
        const next = tourEl('button', 'dcf-tour__btn dcf-tour__btn--main', i === steps.length - 1 ? 'Let’s play' : 'Next');
        next.type = 'button';
        next.addEventListener('click', () => tourGo(1));
        foot.append(skip, tourEl('span', 'grow'), back, next);
        card.replaceChildren(kicker, tourEl('div', 'dcf-tour__title', at.title), tourEl('p', 'dcf-tour__text', at.text), dots, foot);
        tourPlace();
        next.focus({ preventScroll: true });
    }

    function tourGo(dir) {
        if (!tourState) return;
        const i = tourState.i + dir;
        if (i >= tourState.steps.length) { tourEnd(); return; }
        tourState.i = Math.max(0, i);
        tourDraw();
    }

    function tourEnd() {
        if (!tourState) return;
        cancelAnimationFrame(tourState.raf);
        document.removeEventListener('keydown', tourState.keyHandler, true);
        removeEventListener('resize', tourPlace);
        tourState.root.remove();
        tourState = null;
    }

    // part: 'app' starts at the app's steps.
    function startTour(part) {
        tourEnd();
        tourStyles();
        try { closeAppSettings(); } catch (e) {}
        const root = tourEl('div', 'dcf-tour');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', 'Guided tour');
        const block = tourEl('div', 'dcf-tour__block');   // nothing in the game reacts while the tour runs
        const spot = tourEl('div', 'dcf-tour__spot');
        const card = tourEl('div', 'dcf-tour__card');
        const arrow = tourEl('div', 'dcf-tour__arrow');
        arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 10.5h10.2l-3.6-3.6 2.1-2.1L20 12l-7.3 7.2-2.1-2.1 3.6-3.6H4z"/></svg>';
        const shades = [0, 1, 2, 3].map(() => tourEl('div', 'dcf-tour__shade'));
        root.append(block, ...shades, spot, arrow, card);
        document.body.appendChild(root);
        const steps = TOUR_STEPS;
        const keyHandler = e => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tourEnd(); }
            else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); tourGo(1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); tourGo(-1); }
        };
        document.addEventListener('keydown', keyHandler, true);
        addEventListener('resize', tourPlace);
        tourState = { root, spot, card, arrow, shades, steps, i: part === 'app' ? Math.max(0, steps.findIndex(s => s.part === 'The app')) : 0, raf: 0, keyHandler };
        tourDraw();
        // The game moves under the spotlight (lanes, windows); follow it a few times a second.
        let last = 0;
        const follow = t => {
            if (!tourState) return;
            if (t - last > 250) {
                last = t;
                // Folded, opened, moved, crowned in the meantime? Then the step finds its subject anew.
                const now = tourResolve(tourState.steps[tourState.i]);
                if (now.el !== tourState.target || now.text !== tourState.shown.text) tourDraw(); else tourPlace();
            }
            tourState.raf = requestAnimationFrame(follow);
        };
        tourState.raf = requestAnimationFrame(follow);
    }
    try { window.dcfStartTour = part => startTour(part); } catch (e) {}
