// App-Schicht: läuft im Seitenkontext des Spiels (oberster Frame), nach MarbleLuceFall.
// Gehört zur App, nicht zu MLF — MLF bleibt unverändert und wird nur über sein Fenstergerüst
// erkannt: .mcfo-win > .mcfo-win__head / .mcfo-win__body.
//
// EIGENE FENSTER: Jedes MLF-Fenster öffnet sich direkt als Systemfenster (gleicher Tab, gleiche
// Sitzung — der Inhalt wandert nur in ein anderes Dokument, Skripte und Daten bleiben dieselben).
// Systemfenster schließen = Fenster schließen (über MLFs eigenen ✕, damit MLF Buch führt).
// Ausnahme Chat: bleibt im Spiel und bekommt ⧉; draußen geschlossen kehrt er ins Spiel zurück.
// Schalter „Every window on its own" (windows.popOut, 0.1.4) aus: alle Fenster wie der Chat —
// im Spiel mit ⧉. Umschalten wirkt sofort auf die offenen Fenster.
// (What's new und Changelog sind keine Fenster mehr, sondern Patch-Notes-Karten im Spiel.)
// Spielseiten (iframes) laden beim Umzug einmal neu; MLF richtet sie über ihren load-Horcher ein.
(() => {
    if (window.top !== window.self || window.__dcfLayer) return;
    window.__dcfLayer = true;

    let nextId = 1, leaving = false;
    const popped = new Map(); // el -> { popup, finish }
    const titleOf = (el) => el.querySelector('.mcfo-win__title')?.textContent.trim() || '';
    // Der Chat ist das Fenster, in das die Spiel-Ebene die Chat-Spalte des Spiels hängt (9e CHAT POP-OUT).
    const isChat = (el) => !!el.querySelector('[data-role="desktop-chat-pane"]') || /^chat$/i.test(titleOf(el));
    const popOutAll = () => { try { return window.dcfApp?.settings()['windows.popOut'] !== false; } catch (e) { return true; } };
    let separate = popOutAll();

    // Alles, was das Aussehen bestimmt, ins Popup spiegeln: Stylesheets (Spiel + MLF) und die
    // Attribute/Variablen auf <html>, an denen MLFs Themes und Schalter hängen.
    function mirrorStyles(doc) {
        const title = doc.title;
        doc.head.replaceChildren();
        doc.title = title; // <title> überlebt das Neuspiegeln
        const base = doc.createElement('base');
        base.href = location.href;
        doc.head.appendChild(base);
        for (const n of document.querySelectorAll('style, link[rel="stylesheet"]')) doc.head.appendChild(doc.importNode(n, true));
        const own = doc.createElement('style');
        own.textContent = `
            html, body { margin: 0; height: 100%; overflow: hidden; background: #0b121a; }
            /* :not(#dcf-x) hebt die Regel über die Themes (Lego färbt den Fensterrand rot, Luce 17.10.):
               im eigenen Fenster gibt es keinen Rand, keinen Schatten, keine runden Ecken. */
            html:not(#dcf-x) body > .mcfo-win.dcf-popped {
                position: fixed !important; inset: 32px 0 0 0 !important; outline: 0 !important;
                width: auto !important; height: auto !important; min-width: 0 !important; min-height: 0 !important;
                transform: none !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
            }
            html:not(#dcf-x) body > .mcfo-win.dcf-popped > .mcfo-win__head,
            html:not(#dcf-x) body > .mcfo-win.dcf-popped > .mcfo-win__grip,
            html:not(#dcf-x) body > .mcfo-win.dcf-popped > .mcfo-win__edge { display: none !important; }
            /* Eigene Fensterleiste (seit 0.7.0, kein Systemrahmen): wie die Account-Leiste des Hauptfensters. */
            .dcf-wbar {
                position: fixed; left: 0; right: 0; top: 0; height: 32px; z-index: 2147483000; box-sizing: border-box;
                display: flex; align-items: center; gap: 10px; padding-left: 10px;
                background: linear-gradient(180deg, #1d1431, #110c1b); border-bottom: 1px solid rgba(180, 138, 232, 0.22);
                font: 600 12.5px/1 system-ui, sans-serif; color: #ece4f7; user-select: none; -webkit-app-region: drag;
            }
            .dcf-wbar img { -webkit-user-drag: none; }
            .dcf-wbar__logo { width: 20px; height: 20px; flex: none; }
            .dcf-wbar__title { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .dcf-wbar__sp { flex: 1; }
            .dcf-wbar__acc { display: flex; align-items: center; gap: 6px; min-width: 0; color: #a99cc0; font-size: 11.5px; white-space: nowrap; }
            .dcf-wbar__acc img, .dcf-wbar__ini { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #6b5a8a; object-fit: cover; flex: none; box-sizing: border-box; }
            .dcf-wbar__ini { display: grid; place-items: center; font-size: 10px; font-weight: 800; color: #b48ae8; background: #1a1228; }
            .dcf-wbar__btns { display: flex; align-self: stretch; margin-left: 4px; -webkit-app-region: no-drag; }
            .dcf-wbar__btn { width: 42px; border: 0; padding: 0; background: none; color: #a99cc0; display: grid; place-items: center; cursor: default; }
            .dcf-wbar__btn svg { width: 13px; height: 13px; }
            .dcf-wbar__btn:hover { background: rgba(255, 255, 255, 0.07); color: #ece4f7; }
            .dcf-wbar__btn--close:hover { background: #c4314b; color: #fff; }
            .dcf-wbar__btn:focus:not(:focus-visible) { outline: none; }`;
        doc.head.appendChild(own);
    }
    function mirrorRoot(doc) {
        const src = document.documentElement, dst = doc.documentElement;
        for (const a of [...dst.attributes]) if (!src.hasAttribute(a.name)) dst.removeAttribute(a.name);
        for (const a of src.attributes) dst.setAttribute(a.name, a.value);
        doc.body.className = document.body.className;
    }

    // closeOnExit: Systemfenster zu = MLF-Fenster zu. Sonst (Chat) zurück an die alte Stelle.
    function popOut(el, { closeOnExit = false } = {}) {
        if (popped.has(el)) { popped.get(el).popup.focus(); return; }
        const title = el.querySelector('.mcfo-win__title')?.textContent || 'DreamingCrownfall';
        const r = el.getBoundingClientRect();
        const popup = window.open('about:blank', `mlfpop-${nextId++}`,
            `popup,width=${Math.round(r.width)},height=${Math.round(r.height) + 32}`);
        if (!popup) return;
        const doc = popup.document;
        mirrorStyles(doc);
        doc.title = title;
        mirrorRoot(doc);

        addBar(popup, title);

        const mark = document.createComment('dcf popout');
        el.parentNode.insertBefore(mark, el);
        const inline = el.getAttribute('style');
        el.classList.add('dcf-popped');
        doc.body.appendChild(el);

        // Später nachgeladene Stylesheets und Schalterwechsel mitnehmen.
        let restyle = 0;
        const headObs = new MutationObserver(() => { clearTimeout(restyle); restyle = setTimeout(() => mirrorStyles(doc), 50); });
        headObs.observe(document.head, { childList: true, subtree: true, characterData: true });
        const rootObs = new MutationObserver(() => mirrorRoot(doc));
        rootObs.observe(document.documentElement, { attributes: true });
        // Schließt MLF das Fenster selbst (z. B. Esc im Spiel), geht das Systemfenster mit.
        const bodyObs = new MutationObserver(() => { if (el.parentNode !== doc.body) finish(false); });
        bodyObs.observe(doc.body, { childList: true });
        // Holt MLF ein offenes Fenster nach vorn (erneuter Klick auf Inventar o. ä.), das Systemfenster mit.
        const raiseObs = new MutationObserver(() => { if (!el.hidden) try { popup.focus(); } catch (e) {} });
        raiseObs.observe(el, { attributes: true, attributeFilter: ['style', 'hidden'] });

        let done = false;
        // stay: zurück ins Spiel und offen lassen (Schalter umgelegt), statt MLFs ✕ zu klicken.
        function finish(putBack, stay = false) {
            if (done) return;
            done = true;
            clearInterval(poll);
            headObs.disconnect(); rootObs.disconnect(); bodyObs.disconnect(); raiseObs.disconnect();
            el.classList.remove('dcf-popped');
            if (putBack && mark.parentNode) {
                if (inline != null) el.setAttribute('style', inline); else el.removeAttribute('style');
                mark.parentNode.insertBefore(el, mark);
            }
            mark.remove();
            popped.delete(el);
            if (!popup.closed) try { popup.close(); } catch (e) {}
            // Beim Neuladen der Seite nichts schließen — sonst merkt sich MLF das als „zu“.
            if (putBack && closeOnExit && !leaving && !window.__dcfQuitting && !stay) el.querySelector('[data-mcfo-win="close"]')?.click();
            if (stay) addButton(el);
        }
        popup.addEventListener('pagehide', () => finish(true));
        const poll = setInterval(() => { if (popup.closed) finish(true); }, 500);
        popped.set(el, { popup, finish, closeOnExit });
    }

    // Leiste des ausgekoppelten Fensters: Krone, Titel, Account, – □ ✕ (Knöpfe über popup.dcfWin, preload.js).
    const SVG = (inner, w = 1.4) => `<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="${w}">${inner}</svg>`;
    const MAX = SVG('<rect x="2.5" y="2.5" width="9" height="9"/>', 1.3);
    const RESTORE = SVG('<rect x="2" y="4.5" width="7.5" height="7.5"/><path d="M4.5 4.5V2h7.5v7.5H9.5"/>', 1.3);
    function addBar(popup, title) {
        const doc = popup.document, api = popup.dcfWin;
        let info = {};
        try { info = (api && api.info()) || {}; } catch (e) {}
        const bar = doc.createElement('div');
        bar.className = 'dcf-wbar';
        const logo = doc.createElement('img');
        logo.className = 'dcf-wbar__logo';
        logo.alt = '';
        if (info.icon) logo.src = info.icon;
        const t = doc.createElement('span');
        t.className = 'dcf-wbar__title';
        t.textContent = title;
        const sp = doc.createElement('span');
        sp.className = 'dcf-wbar__sp';
        const acc = doc.createElement('span');
        acc.className = 'dcf-wbar__acc';
        if (info.name) {
            let pic;
            if (info.avatar) { pic = doc.createElement('img'); pic.src = info.avatar; pic.alt = ''; }
            else { pic = doc.createElement('span'); pic.className = 'dcf-wbar__ini'; pic.textContent = info.name.slice(0, 1).toUpperCase(); }
            acc.append(pic, info.name);
        }
        const btns = doc.createElement('span');
        btns.className = 'dcf-wbar__btns';
        const btn = (cls, label, html, run) => {
            const b = doc.createElement('button');
            b.type = 'button';
            b.className = 'dcf-wbar__btn' + cls;
            b.title = label;
            b.innerHTML = html;
            b.addEventListener('click', run);
            btns.appendChild(b);
            return b;
        };
        btn('', 'Minimize', SVG('<path d="M2 7h10"/>'), () => api && api.minimize());
        const max = btn('', 'Maximize', MAX, () => api && api.maximize());
        btn(' dcf-wbar__btn--close', 'Close', SVG('<path d="M3 3l8 8M11 3l-8 8"/>'), () => (api ? api.close() : popup.close()));
        const setMax = (m) => { max.title = m ? 'Restore' : 'Maximize'; max.innerHTML = m ? RESTORE : MAX; };
        setMax(!!info.maximized);
        try { api && api.onMaximized(setMax); } catch (e) {}
        bar.addEventListener('dblclick', (e) => { if (!e.target.closest('.dcf-wbar__btns') && api) api.maximize(); });
        bar.append(logo, t, sp, acc, btns);
        doc.body.appendChild(bar);
    }

    function setupWindow(el) {
        if (el.dataset.dcfSeen) return; // schon gesehen (auch nach der Rückkehr aus einem Popup)
        el.dataset.dcfSeen = '1';
        // Einen Takt warten: MLF hängt den Inhalt (beim Chat die Spalte) gleich nach dem Anlegen ein.
        setTimeout(() => {
            if (!el.isConnected || popped.has(el)) return;
            if (isChat(el) || !separate) addButton(el);
            else popOut(el, { closeOnExit: true });
        }, 0);
    }

    function addButton(el) {
        const head = el.querySelector(':scope > .mcfo-win__head');
        if (!head || head.querySelector('[data-dcf="pop"]')) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mcfo-win__btn';
        b.dataset.dcf = 'pop';
        b.title = 'Pop out into its own window';
        b.textContent = '⧉';
        b.addEventListener('click', (e) => { e.stopPropagation(); popOut(el); });
        b.addEventListener('pointerdown', (e) => e.stopPropagation()); // kein Ziehen über den Knopf
        const first = head.querySelector('.mcfo-win__btn');
        head.insertBefore(b, first || null);
    }

    const scan = (root) => {
        if (root.nodeType !== 1) return;
        if (root.matches('.mcfo-win')) setupWindow(root);
        root.querySelectorAll?.('.mcfo-win').forEach(setupWindow);
    };
    const start = () => {
        scan(document.body);
        new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach(scan); })
            .observe(document.body, { childList: true, subtree: true });
    };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });

    // Schalter umgelegt: an → offene Fenster (außer Chat) hinaus, aus → automatisch ausgelagerte zurück.
    try {
        window.dcfApp?.onChange(() => {
            const now = popOutAll();
            if (now === separate) return;
            separate = now;
            if (separate) {
                for (const el of document.querySelectorAll('.mcfo-win')) {
                    if (popped.has(el) || isChat(el) || el.hidden) continue;
                    el.querySelector(':scope > .mcfo-win__head [data-dcf="pop"]')?.remove();
                    popOut(el, { closeOnExit: true });
                }
            } else {
                for (const [, p] of [...popped]) if (p.closeOnExit) p.finish(true, true);
            }
        });
    } catch (e) {}

    // Beim Verlassen der Seite (Neuladen, Navigation) alle Popouts schließen — ihr Inhalt
    // gehört zu dieser Seite und stirbt mit ihr.
    window.addEventListener('pagehide', () => { leaving = true; for (const { popup } of popped.values()) try { popup.close(); } catch (e) {} });
})();
