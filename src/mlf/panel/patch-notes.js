    // =========================================================================================
    // PATCH NOTES — What's new and the changelog as part of the game (DreamingCrownfall)
    // =========================================================================================
    // Not a window: a borderless card in the middle of the game, the board dimmed and blurred
    // behind it, the way games show their patch notes after an update. One look for every theme —
    // DreamingCrownfall's own violet and gold, like the app icon.
    //
    // What's new marks this version as seen the moment it shows (as before: once read is enough).
    // Continue, Esc or a click beside the card closes it. "Full changelog" switches the same card
    // to every version; How to opens the tour.
    const PN_CSS_ID = 'dcf-pn-css';
    let pnOpen = null;           // { root, keyHandler } while a card is up

    function pnStyles() {
        if (document.getElementById(PN_CSS_ID)) return;
        const s = document.createElement('style');
        s.id = PN_CSS_ID;
        s.textContent = `
            .dcf-pn {
                --pn-bg1: #241938; --pn-bg2: #140e20; --pn-line: rgba(180, 138, 232, 0.28);
                --pn-text: #ece4f7; --pn-muted: #a99cc0; --pn-violet: #b48ae8; --pn-gold: #ffd36e;
                position: fixed; inset: 0; z-index: 2147483000;
                display: grid; place-items: center; padding: 24px;
                background: rgba(9, 6, 16, 0.66);
                backdrop-filter: blur(6px) saturate(0.85);
                font-family: inherit; color: var(--pn-text);
                animation: dcf-pn-fade 160ms ease-out;
            }
            html[data-mcfo-perf~="noblur"] .dcf-pn { backdrop-filter: none; background: rgba(9, 6, 16, 0.8); }
            .dcf-pn__card {
                position: relative; display: flex; flex-direction: column;
                width: min(640px, 100%); max-height: min(78vh, 760px);
                background: linear-gradient(180deg, var(--pn-bg1), var(--pn-bg2));
                border: 1px solid var(--pn-line); border-radius: 18px;
                box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06);
                overflow: hidden;
                animation: dcf-pn-rise 200ms cubic-bezier(.2, .8, .2, 1);
            }
            .dcf-pn__card::before {
                content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px;
                background: linear-gradient(90deg, transparent, var(--pn-gold) 30%, var(--pn-violet) 70%, transparent);
                opacity: 0.85;
            }
            .dcf-pn__head { display: flex; align-items: center; gap: 16px; padding: 26px 28px 18px; }
            .dcf-pn__logo { width: 52px; height: 52px; flex: none; filter: drop-shadow(0 6px 16px rgba(180, 138, 232, 0.35)); }
            .dcf-pn__titles { flex: 1; min-width: 0; }
            .dcf-pn__brand {
                font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
                color: var(--pn-gold);
            }
            .dcf-pn__title { margin: 4px 0 0; font-size: 28px; line-height: 1.1; font-weight: 800; letter-spacing: -0.01em; }
            .dcf-pn__ver {
                flex: none; padding: 6px 12px; border-radius: 999px; font-size: 13px; font-weight: 700;
                color: var(--pn-text); background: rgba(180, 138, 232, 0.16); border: 1px solid var(--pn-line);
            }
            .dcf-pn__body {
                flex: 1; overflow: auto; padding: 4px 28px 8px;
                scrollbar-width: thin; scrollbar-color: rgba(180, 138, 232, 0.4) transparent;
            }
            .dcf-pn__intro { margin: 0 0 14px; color: var(--pn-muted); font-size: 14px; line-height: 1.5; }
            .dcf-pn__rel { padding: 16px 0 18px; border-top: 1px solid rgba(180, 138, 232, 0.14); }
            .dcf-pn__rel:first-of-type { border-top: 0; padding-top: 4px; }
            .dcf-pn__relhead { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
            .dcf-pn__relver { font-size: 16px; font-weight: 800; }
            .dcf-pn__reldate { font-size: 12px; color: var(--pn-muted); }
            .dcf-pn__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
            .dcf-pn__list li { position: relative; padding-left: 22px; font-size: 14.5px; line-height: 1.55; color: var(--pn-text); }
            .dcf-pn__list li::before {
                content: ''; position: absolute; left: 4px; top: 0.62em; width: 7px; height: 7px; border-radius: 2px;
                background: var(--pn-gold); transform: rotate(45deg); box-shadow: 0 0 8px rgba(255, 211, 110, 0.45);
            }
            .dcf-pn__foot {
                display: flex; align-items: center; gap: 10px; padding: 16px 28px 22px;
                border-top: 1px solid rgba(180, 138, 232, 0.14); background: rgba(10, 7, 18, 0.35);
            }
            .dcf-pn__spacer { flex: 1; }
            .dcf-pn__btn {
                font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
                padding: 10px 16px; border-radius: 10px; color: var(--pn-text);
                background: transparent; border: 1px solid var(--pn-line);
                transition: background 120ms, border-color 120ms, transform 120ms;
            }
            .dcf-pn__btn:hover { background: rgba(180, 138, 232, 0.12); border-color: rgba(180, 138, 232, 0.5); }
            .dcf-pn__btn--main {
                padding: 11px 26px; border: 0; color: #1a1026; letter-spacing: 0.04em; text-transform: uppercase;
                background: linear-gradient(180deg, #ffe08f, #f2b84b);
                box-shadow: 0 6px 18px rgba(242, 184, 75, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.5);
            }
            .dcf-pn__btn--main:hover { background: linear-gradient(180deg, #ffe7a6, #f5c25f); transform: translateY(-1px); }
            .dcf-pn__btn:focus-visible { outline: 2px solid var(--pn-violet); outline-offset: 2px; }
            @keyframes dcf-pn-fade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes dcf-pn-rise { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
            @media (prefers-reduced-motion: reduce) { .dcf-pn, .dcf-pn__card { animation: none; } }
            @media (max-width: 560px) {
                .dcf-pn__head, .dcf-pn__body, .dcf-pn__foot { padding-left: 18px; padding-right: 18px; }
                .dcf-pn__title { font-size: 22px; }
            }`;
        (document.head || document.documentElement).appendChild(s);
    }

    // The marble from the app icon, inline so it needs no file.
    const PN_LOGO = '<svg class="dcf-pn__logo" viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="dcf-pn-m" cx="38%" cy="32%" r="70%">'
        + '<stop offset="0" stop-color="#f3e8ff"/><stop offset=".35" stop-color="#b48ae8"/><stop offset="1" stop-color="#4b2a7a"/></radialGradient></defs>'
        + '<circle cx="32" cy="32" r="29" fill="url(#dcf-pn-m)"/><path d="M14 38c8-6 18 4 36-6" stroke="#ffd36e" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".9"/>'
        + '<ellipse cx="23" cy="20" rx="7" ry="4.5" fill="#fff" opacity=".55" transform="rotate(-30 23 20)"/></svg>';

    function pnEl(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function pnRelease(entry) {
        const sec = pnEl('section', 'dcf-pn__rel');
        const head = pnEl('div', 'dcf-pn__relhead');
        head.append(pnEl('span', 'dcf-pn__relver', 'Version ' + entry.v), pnEl('span', 'dcf-pn__reldate', niceDate(entry.date)));
        const ul = pnEl('ul', 'dcf-pn__list');
        for (const item of entry.items) ul.appendChild(pnEl('li', null, item));
        sec.append(head, ul);
        return sec;
    }

    function closePatchNotes() {
        if (!pnOpen) return;
        document.removeEventListener('keydown', pnOpen.keyHandler, true);
        pnOpen.root.remove();
        pnOpen = null;
    }

    // mode: 'whatsnew' (what came since the version last seen) or 'changelog' (everything).
    function showPatchNotes(mode) {
        pnStyles();
        closePatchNotes();
        const root = pnEl('div', 'dcf-pn');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        const card = pnEl('div', 'dcf-pn__card');
        root.appendChild(card);

        const render = (view) => {
            const seen = readSeen();
            const news = seen ? CHANGELOG.filter(e => cmpVersion(e.v, seen) > 0 && cmpVersion(e.v, SCRIPT_VERSION) <= 0) : [];
            const list = view === 'changelog' ? CHANGELOG : (news.length ? news : [CHANGELOG[0]]);

            const head = pnEl('header', 'dcf-pn__head');
            head.insertAdjacentHTML('afterbegin', PN_LOGO);
            const titles = pnEl('div', 'dcf-pn__titles');
            const title = pnEl('h2', 'dcf-pn__title', view === 'changelog' ? 'Changelog' : 'What’s new');
            title.id = 'dcf-pn-title';
            titles.append(pnEl('div', 'dcf-pn__brand', 'DreamingCrownfall'), title);
            head.append(titles, pnEl('span', 'dcf-pn__ver', 'v' + SCRIPT_VERSION));
            root.setAttribute('aria-labelledby', title.id);

            const body = pnEl('div', 'dcf-pn__body');
            if (view !== 'changelog' && list.length > 1) body.appendChild(pnEl('p', 'dcf-pn__intro', `New since version ${seen}:`));
            for (const entry of list) body.appendChild(pnRelease(entry));

            const foot = pnEl('footer', 'dcf-pn__foot');
            const toggle = pnEl('button', 'dcf-pn__btn', view === 'changelog' ? 'What’s new' : 'Full changelog');
            toggle.type = 'button';
            toggle.addEventListener('click', () => render(view === 'changelog' ? 'whatsnew' : 'changelog'));
            const howto = pnEl('button', 'dcf-pn__btn', 'How to');
            howto.type = 'button';
            howto.addEventListener('click', () => { closePatchNotes(); showHowTo(); });
            const go = pnEl('button', 'dcf-pn__btn dcf-pn__btn--main', 'Continue');
            go.type = 'button';
            go.addEventListener('click', closePatchNotes);
            const tour = pnEl('button', 'dcf-pn__btn', 'Tour');
            tour.type = 'button';
            tour.title = 'How the game works, and what the app adds';
            tour.addEventListener('click', () => { closePatchNotes(); startTour(); });
            foot.append(toggle, howto, tour, pnEl('span', 'dcf-pn__spacer'), go);

            card.replaceChildren(head, body, foot);
            go.focus({ preventScroll: true });
        };
        render(mode);

        if (mode === 'whatsnew') { try { localStorage.setItem(WHATSNEW_SEEN, SCRIPT_VERSION); } catch (e) {} }

        root.addEventListener('mousedown', e => { if (e.target === root) closePatchNotes(); });
        const keyHandler = e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closePatchNotes(); } };
        document.addEventListener('keydown', keyHandler, true);
        document.body.appendChild(root);
        pnOpen = { root, keyHandler };
    }

