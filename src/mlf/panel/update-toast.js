    // =========================================================================================
    // UPDATE TOAST — DreamingCrownfall
    // =========================================================================================
    // A small borderless card in the bottom right corner while an app update comes in: the
    // download with a progress bar, then "ready" with Restart now / Later. Installs that cannot
    // update themselves (.deb) get "is out" with a Download button instead. The game stays usable;
    // nothing dims. Later hides the card until the next start (the update then installs on quit).
    // The state comes from the app (src/updater.js) through window.dcfApp.update.
    let dcfToast = null;              // the card element while shown
    const dcfToastHidden = new Set(); // "status|version" dismissed with Later in this session

    function dcfToastStyles() {
        if (document.getElementById('dcf-toast-css')) return;
        const s = document.createElement('style');
        s.id = 'dcf-toast-css';
        s.textContent = `
            .dcf-toast {
                position: fixed; right: 16px; bottom: var(--dcf-toast-bottom, 90px); z-index: 2147482700;
                width: 300px; padding: 14px 16px 14px; box-sizing: border-box; font-family: inherit; color: #ece4f7;
                background: linear-gradient(180deg, #241938, #160f22); border: 1px solid rgba(180, 138, 232, 0.3); border-radius: 14px;
                box-shadow: 0 16px 44px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06); overflow: hidden;
                animation: dcf-toast-in 220ms cubic-bezier(.2, .8, .2, 1);
            }
            .dcf-toast::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, #ffd36e 30%, #b48ae8 70%, transparent); }
            .dcf-toast__head { display: flex; align-items: center; gap: 10px; }
            .dcf-toast__head .dcf-pn__logo { width: 30px; height: 30px; }
            .dcf-toast__kicker { font-size: 10.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #ffd36e; }
            .dcf-toast__title { font-size: 14px; font-weight: 800; margin-top: 1px; }
            .dcf-toast__text { margin: 8px 0 0; font-size: 12.5px; line-height: 1.45; color: #a99cc0; }
            .dcf-toast__bar { height: 6px; margin-top: 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
            .dcf-toast__fill { height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, #8b5cf6, #ffd36e); transition: width 300ms ease; }
            .dcf-toast__btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
            .dcf-toast__btn { font: inherit; font-size: 12.5px; font-weight: 700; padding: 7px 12px; border-radius: 9px; cursor: pointer; color: #ece4f7; background: transparent; border: 1px solid rgba(180, 138, 232, 0.3); }
            .dcf-toast__btn:hover { background: rgba(180, 138, 232, 0.12); }
            .dcf-toast__btn--main { border: 0; color: #1a1026; text-transform: uppercase; letter-spacing: 0.04em; background: linear-gradient(180deg, #ffe08f, #f2b84b); }
            .dcf-toast__btn--main:hover { background: linear-gradient(180deg, #ffe7a6, #f5c25f); }
            @keyframes dcf-toast-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
            @media (prefers-reduced-motion: reduce) { .dcf-toast { animation: none; } .dcf-toast__fill { transition: none; } }`;
        (document.head || document.documentElement).appendChild(s);
    }

    function dcfToastClose() { if (dcfToast) { dcfToast.remove(); dcfToast = null; } }

    function dcfToastShow(u) {
        const show = u && (u.status === 'downloading' || u.status === 'ready' || u.status === 'available' || u.status === 'installfailed');
        if (!show || dcfToastHidden.has(u.status + '|' + u.version) || (u.status === 'downloading' && dcfToastHidden.has('ready|' + u.version))) {
            dcfToastClose();
            return;
        }
        dcfToastStyles();
        pnStyles();   // the logo
        if (!dcfToast) {
            dcfToast = document.createElement('div');
            dcfToast.className = 'dcf-toast';
            dcfToast.setAttribute('role', 'status');
            document.body.appendChild(dcfToast);
        }
        // Above the game's footer, whatever its height.
        const footer = role('action-region');
        const above = footer ? Math.round(innerHeight - footer.getBoundingClientRect().top) : 70;
        dcfToast.style.setProperty('--dcf-toast-bottom', (above + 12) + 'px');

        const kicker = u.status === 'downloading' ? 'Update' : u.status === 'ready' ? 'Update ready' : u.status === 'installfailed' ? 'Update not installed' : 'New version';
        const title = 'DreamingCrownfall ' + u.version;
        const text = u.status === 'downloading' ? `Downloading … ${u.percent || 0} %`
                   : u.status === 'ready' ? (u.needsPassword ? 'Restart now to install it — Linux asks for your password once.'
                                                              : 'Restart now to update, or later: it installs when you quit the app.')
                   : u.status === 'installfailed' ? 'The password prompt did not come up. Open the package in your system\'s installer instead; it asks for the password itself.'
                   : 'This install cannot update itself. Download the new version from the release page.';
        dcfToast.innerHTML = '<div class="dcf-toast__head">' + PN_LOGO + '<div><div class="dcf-toast__kicker"></div><div class="dcf-toast__title"></div></div></div>'
            + '<p class="dcf-toast__text"></p>';
        dcfToast.querySelector('.dcf-toast__kicker').textContent = kicker;
        dcfToast.querySelector('.dcf-toast__title').textContent = title;
        dcfToast.querySelector('.dcf-toast__text').textContent = text;
        if (u.status === 'downloading') {
            const bar = document.createElement('div');
            bar.className = 'dcf-toast__bar';
            bar.innerHTML = '<div class="dcf-toast__fill"></div>';
            bar.firstChild.style.width = Math.max(2, Math.min(100, u.percent || 0)) + '%';
            dcfToast.appendChild(bar);
        } else {
            const btns = document.createElement('div');
            btns.className = 'dcf-toast__btns';
            const later = document.createElement('button');
            later.type = 'button';
            later.className = 'dcf-toast__btn';
            later.textContent = 'Later';
            later.addEventListener('click', () => { dcfToastHidden.add(u.status + '|' + u.version); dcfToastClose(); });
            const go = document.createElement('button');
            go.type = 'button';
            go.className = 'dcf-toast__btn dcf-toast__btn--main';
            go.textContent = u.status === 'ready' ? 'Restart now' : u.status === 'installfailed' ? 'Open installer' : 'Download';
            go.addEventListener('click', () => { const api = window.dcfApp; if (api && api.update) api.update.install(); if (u.status !== 'ready') dcfToastClose(); });
            btns.append(later, go);
            dcfToast.appendChild(btns);
        }
    }

    // Only in the top frame, and only in the app.
    if (window.top === window.self) {
        const start = () => {
            const api = window.dcfApp;
            if (!api || !api.update) return;
            api.update.onChange(dcfToastShow);
            api.update.state().then(dcfToastShow).catch(() => {});
        };
        if (document.body) setTimeout(start, 1500); else document.addEventListener('DOMContentLoaded', () => setTimeout(start, 1500), { once: true });
    }

