    // =========================================================================================
    // ESC MENU — the pause menu of DreamingCrownfall
    // =========================================================================================
    // Esc with nothing left to close opens a narrow column in the middle of the board, the game
    // dimmed and blurred behind it, the way games show their game menu: Resume, the game's pages,
    // the app's own things, Quit. Esc, Resume or a click beside it closes it again.
    //
    // Who gets Esc first is decided in core/windows.js: an open window, an open menu, the game's
    // sound panel or help bubble and anything typed into a field all come before this menu.
    // Arrow keys move through the entries, Enter picks one (the game's own :focus-visible ring).
    const ESC_CSS_ID = 'dcf-esc-css';
    let escOpen = null;   // { root, keyHandler } while the menu is up

    const ESC_ICONS = {
        play: '<path d="M7 5v14l11-7Z"/>',
        daily: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
        trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
        medal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 11.5 6 3h4l2 5 2-5h4l-2.5 8.5"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
        scroll: '<path d="M8 3h11v15a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2h11v2a3 3 0 0 0 3 3"/><path d="M8 3a3 3 0 0 0-3 3v10M11 8h5M11 12h5"/>',
        refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
        power: '<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
    };
    const escIcon = name => ESC_ICONS[name]
        ? `<svg class="dcf-esc__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ESC_ICONS[name]}</svg>`
        : dcfIcon(name, 'dcf-esc__icon');

    function escStyles() {
        if (document.getElementById(ESC_CSS_ID)) return;
        const s = document.createElement('style');
        s.id = ESC_CSS_ID;
        s.textContent = `
            .dcf-esc {
                --esc-bg1: #241938; --esc-bg2: #140e20; --esc-line: rgba(180, 138, 232, 0.28);
                --esc-text: #ece4f7; --esc-muted: #a99cc0; --esc-dim: #7d7194; --esc-violet: #b48ae8; --esc-gold: #ffd36e;
                position: fixed; inset: 0; z-index: 2147482900;
                display: grid; place-items: center; padding: 24px;
                background: rgba(9, 6, 16, 0.62);
                backdrop-filter: blur(6px) saturate(0.85);
                font-family: inherit; color: var(--esc-text);
                animation: dcf-esc-fade 140ms ease-out;
            }
            html[data-mcfo-perf~="noblur"] .dcf-esc { backdrop-filter: none; background: rgba(9, 6, 16, 0.8); }
            .dcf-esc__col { display: flex; flex-direction: column; align-items: stretch; width: 280px; max-height: 100%; animation: dcf-esc-rise 180ms cubic-bezier(.2, .8, .2, 1); }
            .dcf-esc__card {
                position: relative; display: flex; flex-direction: column; min-height: 0;
                background: linear-gradient(180deg, var(--esc-bg1), var(--esc-bg2));
                border: 1px solid var(--esc-line); border-radius: 16px;
                box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06);
                overflow: hidden;
            }
            .dcf-esc__card::before {
                content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px;
                background: linear-gradient(90deg, transparent, var(--esc-gold) 30%, var(--esc-violet) 70%, transparent);
                opacity: 0.85;
            }
            .dcf-esc__head { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 20px 16px; border-bottom: 1px solid rgba(180, 138, 232, 0.14); }
            .dcf-esc__head .dcf-pn__logo { width: 56px; height: 56px; filter: drop-shadow(0 6px 16px rgba(180, 138, 232, 0.35)); }
            .dcf-esc__brand { text-align: center; font-size: 15px; line-height: 1.15; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
            .dcf-esc__brand b { display: block; color: var(--esc-gold); font-weight: 800; }
            .dcf-esc__list { flex: 1; min-height: 0; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 2px; scrollbar-width: thin; scrollbar-color: rgba(180, 138, 232, 0.4) transparent; }
            .dcf-esc__sep { height: 1px; margin: 8px 6px; background: rgba(180, 138, 232, 0.14); flex: none; }
            .dcf-esc__item {
                display: flex; align-items: center; gap: 12px; width: 100%; flex: none;
                padding: 9px 12px; border: 0; border-radius: 9px; background: transparent;
                font: inherit; font-size: 14.5px; font-weight: 600; color: var(--esc-text); text-align: left; cursor: pointer;
                transition: background 100ms, color 100ms;
            }
            .dcf-esc__item:hover, .dcf-esc__item:focus-visible { background: rgba(180, 138, 232, 0.14); outline: none; }
            .dcf-esc__item:focus-visible { box-shadow: inset 0 0 0 1px rgba(180, 138, 232, 0.55); }
            .dcf-esc__icon { width: 18px; height: 18px; flex: none; color: var(--esc-violet); }
            .dcf-esc__label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .dcf-esc__hint { flex: none; font-size: 11.5px; font-weight: 600; color: var(--esc-dim); }
            .dcf-esc__hint--good { color: #7fd99a; }
            .dcf-esc__hint--gold { color: var(--esc-gold); }
            .dcf-esc__item--main {
                justify-content: center; margin-bottom: 6px; padding: 11px 12px; color: #1a1026; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 800;
                background: linear-gradient(180deg, #ffe08f, #f2b84b);
                box-shadow: 0 6px 18px rgba(242, 184, 75, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.5);
            }
            .dcf-esc__item--main .dcf-esc__icon { color: #1a1026; width: 15px; height: 15px; }
            .dcf-esc__item--main .dcf-esc__label { flex: none; }
            .dcf-esc__item--main:hover, .dcf-esc__item--main:focus-visible { background: linear-gradient(180deg, #ffe7a6, #f5c25f); }
            .dcf-esc__item--quit .dcf-esc__icon { color: #e07a7a; }
            .dcf-esc__item--quit:hover, .dcf-esc__item--quit:focus-visible { background: rgba(224, 122, 122, 0.14); }
            .dcf-esc__item--ask { color: #ffb4b4; }
            .dcf-esc__foot { margin-top: 10px; text-align: center; font-size: 11.5px; color: var(--esc-dim); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }
            .dcf-esc__foot kbd { font: inherit; font-weight: 700; color: var(--esc-muted); padding: 0 5px; border: 1px solid rgba(180, 138, 232, 0.3); border-radius: 4px; }
            @keyframes dcf-esc-fade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes dcf-esc-rise { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
            @media (prefers-reduced-motion: reduce) { .dcf-esc, .dcf-esc__col { animation: none; } }`;
        (document.head || document.documentElement).appendChild(s);
    }

    function closeEscMenu() {
        if (!escOpen) return;
        document.removeEventListener('keydown', escOpen.keyHandler, true);
        escOpen.root.remove();
        escOpen = null;
    }

    function showEscMenu() {
        if (escOpen) return;
        escStyles();
        const api = dcfApi();
        let st = {};
        try { st = (api && api.menu && api.menu.state()) || {}; } catch (e) {}

        const root = pnEl('div', 'dcf-esc');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Game menu');
        const col = pnEl('div', 'dcf-esc__col');
        const card = pnEl('div', 'dcf-esc__card');
        const head = pnEl('div', 'dcf-esc__head');
        head.innerHTML = PN_LOGO + '<div class="dcf-esc__brand">Dreaming<b>Crownfall</b></div>';
        const list = pnEl('div', 'dcf-esc__list');

        // Every entry closes the menu first and then does its thing; the update check and Quit
        // stay open because they answer in the entry itself.
        const item = (icon, label, run, opts = {}) => {
            const b = pnEl('button', 'dcf-esc__item' + (opts.cls ? ' ' + opts.cls : ''));
            b.type = 'button';
            b.innerHTML = escIcon(icon);
            const l = pnEl('span', 'dcf-esc__label', label);
            const h = pnEl('span', 'dcf-esc__hint', opts.hint || '');
            b.append(l, h);
            b.addEventListener('click', () => { if (opts.stay) run(b, l, h); else { closeEscMenu(); run(); } });
            list.appendChild(b);
            return b;
        };
        const sep = () => list.appendChild(pnEl('div', 'dcf-esc__sep'));
        const page = key => () => { const p = PAGES[key]; if (p) openPage(p.path, p.title); };

        const resume = item('play', 'Resume', () => {}, { cls: 'dcf-esc__item--main' });
        item('box', 'Inventory', page('inventory-nav'));
        item('daily', 'Dailies', page('dailies-nav'));
        item('bag', 'Shop', page('shop-nav'));
        item('trophy', 'Leaderboards', page('leaderboards-nav'));
        item('medal', 'Achievements', page('achievements'));
        item('user', 'Profile', page('profile-nav'));
        sep();
        if (st.home && api) item('home', 'Home', () => api.menu.home());
        if (st.stats && api) item('chart', 'Stats', () => api.openStats(''));
        if (api && api.hud) item('hud', st.hud ? 'Hide the HUD' : 'Show the HUD', () => api.hud.toggle(), { hint: 'F2' });
        item('general', 'Settings', () => showAppSettings(), { hint: 'Ctrl+,' });
        item('scroll', 'Patch notes', () => showPatchNotes('changelog'));
        if (api && api.update) {
            // An update that is already waiting shows right away, without a click.
            const up = item('refresh', 'Check for updates', escUpdate, { stay: true });
            api.update.state().then(s => { if (s && /^(ready|available|downloading|installfailed)$/.test(s.status)) escUpdateShow(up, s); }, () => {});
        }
        sep();
        if (api && api.menu) {
            let asked = false;
            item('power', 'Quit', (b, l, h) => {
                if (asked) { api.menu.quit(); return; }
                asked = true;
                b.classList.add('dcf-esc__item--ask');
                l.textContent = 'Really quit?';
                h.textContent = 'click again';
            }, { cls: 'dcf-esc__item--quit', stay: true });
        }

        card.append(head, list);
        const foot = pnEl('div', 'dcf-esc__foot');
        foot.innerHTML = `v${SCRIPT_VERSION} · <kbd>Esc</kbd> to resume`;
        col.append(card, foot);
        root.appendChild(col);

        root.addEventListener('mousedown', e => { if (e.target === root) closeEscMenu(); });
        const keyHandler = e => {
            if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeEscMenu(); return; }
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
            e.stopPropagation(); e.preventDefault();
            const all = [...list.querySelectorAll('.dcf-esc__item')];
            const at = all.indexOf(document.activeElement);
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1
                : (at + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length;
            all[next].focus();
        };
        document.addEventListener('keydown', keyHandler, true);
        document.body.appendChild(root);
        escOpen = { root, keyHandler };
        resume.focus({ preventScroll: true });
    }

    // "Check for updates" answers in its own entry: Checking … → Up to date / the new version.
    // A downloaded update installs on the next click, one only offered on GitHub opens there.
    function escUpdateShow(b, s) {
        const l = b.querySelector('.dcf-esc__label'), h = b.querySelector('.dcf-esc__hint');
        const st = (s && s.status) || '';
        h.className = 'dcf-esc__hint';
        delete b.dataset.act;
        if (st === 'ready' || st === 'available' || st === 'installfailed') {
            l.textContent = st === 'ready' ? 'Restart to update' : 'Get the update';
            h.textContent = s.version ? 'v' + s.version : '';
            h.classList.add('dcf-esc__hint--gold');
            b.dataset.act = 'install';
        }
        else if (st === 'downloading') { l.textContent = 'Downloading update'; h.textContent = s.percent != null ? s.percent + ' %' : '…'; }
        else if (st === 'latest') { l.textContent = 'Up to date'; h.textContent = ''; h.classList.add('dcf-esc__hint--good'); }
        else if (st === 'error') { l.textContent = 'Update check failed'; h.textContent = 'retry'; }
        else if (st === 'dev') { l.textContent = 'Updates come via git'; h.textContent = 'dev'; }
        else { l.textContent = 'Check for updates'; h.textContent = ''; }
    }

    function escUpdate(b, l, h) {
        const api = dcfApi();
        if (!api || !api.update) return;
        if (b.dataset.act === 'install') { api.update.install(); closeEscMenu(); return; }
        if (b.dataset.busy) return;
        b.dataset.busy = '1';
        l.textContent = 'Checking …';
        h.textContent = '';
        api.update.check().then(s => escUpdateShow(b, s), () => escUpdateShow(b, { status: 'error' })).finally(() => { delete b.dataset.busy; });
    }
