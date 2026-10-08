// App-Schicht: läuft im Seitenkontext des Spiels (oberster Frame), nach MarbleLuceFall.
// Gehört zur App, nicht zu MLF — MLF bleibt unverändert und wird nur über sein Fenstergerüst
// erkannt: .mcfo-win > .mcfo-win__head / .mcfo-win__body.
//
// EIGENE FENSTER: Jedes MLF-Fenster öffnet sich direkt als Systemfenster (gleicher Tab, gleiche
// Sitzung — der Inhalt wandert nur in ein anderes Dokument, Skripte und Daten bleiben dieselben).
// Systemfenster schließen = Fenster schließen (über MLFs eigenen ✕, damit MLF Buch führt).
// Ausnahmen: der Chat bleibt im Spiel und bekommt ⧉ (draußen geschlossen kehrt er zurück);
// What's new und Changelog bleiben immer im Spiel.
// Spielseiten (iframes) laden beim Umzug einmal neu; MLF richtet sie über ihren load-Horcher ein.
(() => {
    if (window.top !== window.self || window.__dcfLayer) return;
    window.__dcfLayer = true;

    let nextId = 1, leaving = false;
    const popped = new Map(); // el -> { popup, finish }
    const titleOf = (el) => el.querySelector('.mcfo-win__title')?.textContent.trim() || '';
    // Der Chat ist das Fenster, in das die Spiel-Ebene die Chat-Spalte des Spiels hängt (9e CHAT POP-OUT).
    const isChat = (el) => !!el.querySelector('[data-role="desktop-chat-pane"]') || /^chat$/i.test(titleOf(el));
    // What's new und Changelog gehören zum Spiel wie in einem echten Game: sie bleiben im Fenster der App
    // (Luce, 08.10.: „Teil des Games“, nicht als eigenes Systemfenster).
    const staysInGame = (el) => /^what.s new$|^changelog$/i.test(titleOf(el));

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
            body > .mcfo-win.dcf-popped {
                position: fixed !important; inset: 0 !important;
                width: auto !important; height: auto !important; min-width: 0 !important; min-height: 0 !important;
                transform: none !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
            }
            body > .mcfo-win.dcf-popped > .mcfo-win__head,
            body > .mcfo-win.dcf-popped > .mcfo-win__grip,
            body > .mcfo-win.dcf-popped > .mcfo-win__edge { display: none !important; }`;
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
            `popup,width=${Math.round(r.width)},height=${Math.round(r.height)}`);
        if (!popup) return;
        const doc = popup.document;
        mirrorStyles(doc);
        doc.title = title;
        mirrorRoot(doc);

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
        function finish(putBack) {
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
            if (putBack && closeOnExit && !leaving) el.querySelector('[data-mcfo-win="close"]')?.click();
        }
        popup.addEventListener('pagehide', () => finish(true));
        const poll = setInterval(() => { if (popup.closed) finish(true); }, 500);
        popped.set(el, { popup, finish });
    }

    function setupWindow(el) {
        if (el.dataset.dcfSeen) return; // schon gesehen (auch nach der Rückkehr aus einem Popup)
        el.dataset.dcfSeen = '1';
        // Einen Takt warten: MLF hängt den Inhalt (beim Chat die Spalte) gleich nach dem Anlegen ein.
        setTimeout(() => {
            if (!el.isConnected || popped.has(el)) return;
            if (isChat(el)) addButton(el);
            else if (!staysInGame(el)) popOut(el, { closeOnExit: true });
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

    // Beim Verlassen der Seite (Neuladen, Navigation) alle Popouts schließen — ihr Inhalt
    // gehört zu dieser Seite und stirbt mit ihr.
    window.addEventListener('pagehide', () => { leaving = true; for (const { popup } of popped.values()) try { popup.close(); } catch (e) {} });
})();
