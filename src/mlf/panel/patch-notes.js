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

    // The app icon (the crown), inline so it needs no file: the page runs on marblecrownfall.com
    // and cannot load the app's own files. 128 px, sharp up to 64 px on a 2x screen.
    const PN_LOGO = '<img class="dcf-pn__logo" alt="" aria-hidden="true" draggable="false" src="data:image/png;base64,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">';

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

