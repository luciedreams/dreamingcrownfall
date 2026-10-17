// Läuft in jedem Frame vor den Seitenskripten (wie @run-at document-start) und führt
// MarbleLuceFall im Seitenkontext aus — dort, wo Tampermonkey es mit unsafeWindow hinstellt.
// Bereitgestellt werden genau die drei Dinge, die das Skript vom Manager erwartet:
// GM_addStyle, unsafeWindow, GM_info. Danach die App-Schicht (nur oberster Frame).

const { contextBridge, ipcRenderer } = require('electron');

const host = location.hostname;

// Ausgekoppeltes Fenster (about:blank, von der App-Schicht befüllt): nur die Fensterknöpfe seiner
// eigenen Leiste (seit 0.7.0 ohne Systemrahmen). Die App-Schicht im Spiel-Tab ruft sie über popup.dcfWin.
if (location.href === 'about:blank' && /^mlfpop-/.test(window.name)) {
    contextBridge.exposeInMainWorld('dcfWin', {
        info: () => ipcRenderer.sendSync('dcf:popwin:info'),
        minimize: () => ipcRenderer.send('dcf:popwin:min'),
        maximize: () => ipcRenderer.send('dcf:popwin:max'),
        close: () => ipcRenderer.send('dcf:popwin:close'),
        onMaximized: (cb) => { if (typeof cb === 'function') ipcRenderer.on('dcf:popwin:max', (_e, m) => { try { cb(!!m); } catch (err) {} }); },
    });
    // Diamanten-Shop im ausgekoppelten Fenster: die Stripe-Übergabe (windows.js) fragt window.top.dcfApp.
    contextBridge.exposeInMainWorld('dcfApp', { openCheckout: (url) => ipcRenderer.send('dcf:open:checkout', String(url || '')) });
}
if (host === 'marblecrownfall.com' || host.endsWith('.marblecrownfall.com')) {
    // Kein Zoomen aus Versehen: Touchpad-Pinch und Strg+Mausrad kommen als wheel mit ctrlKey an.
    // Bewusst zoomen geht weiter mit Strg+Plus/Minus/0 (main.js handleKeys).
    window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false, capture: true });
    // Seiten in Fenstern und Panels (iframes): Scrollbalken in App-Farben statt Chromium-Grau. Den
    // obersten Frame bedient main.js (insertCSS, APP_FEEL_CSS) — insertCSS erreicht keine iframes.
    if (window.top !== window.self) {
        const addBars = () => {
            const st = document.createElement('style');
            st.textContent = 'html { scrollbar-color: rgba(180, 138, 232, 0.45) transparent; scrollbar-width: thin; }';
            (document.head || document.documentElement).appendChild(st);
        };
        if (document.documentElement) addBars();
        else new MutationObserver((_, o) => { if (document.documentElement) { o.disconnect(); addBars(); } }).observe(document, { childList: true });
    }
    installContextMenu(ipcRenderer);
    // Brücke zu den App-Einstellungen (Benachrichtigungen, Discord, Autostart) — nur im obersten Frame,
    // und die App nimmt nur die Schalter an, die sie kennt (app-settings.js).
    if (window.top === window.self) {
        const changeHandlers = [];
        ipcRenderer.on('dcf:settings:changed', (_e, s) => { for (const cb of changeHandlers) { try { cb(s); } catch (err) {} } });
        contextBridge.exposeInMainWorld('dcfApp', {
            settings: () => ipcRenderer.sendSync('dcf:settings:get'),
            set: (key, value) => ipcRenderer.send('dcf:settings:set', String(key), typeof value === 'number' ? value : value === true),
            onChange: (cb) => { if (typeof cb === 'function') changeHandlers.push(cb); },
            testNotification: () => ipcRenderer.send('dcf:notify:test'),
            perfReport: () => ipcRenderer.invoke('dcf:perf:report'),
            openLogs: () => ipcRenderer.send('dcf:logs:open'),
            addAccount: () => ipcRenderer.send('dcf:account:add'),
            welcomeClaim: () => ipcRenderer.sendSync('dcf:welcome:claim'),
            displayHz: () => ipcRenderer.sendSync('dcf:display:hz'),
            openStats: (tab) => ipcRenderer.send('dcf:stats:open', typeof tab === 'string' ? tab : ''),
            menu: { open: () => ipcRenderer.send('dcf:menu:open') },
            introClaim: () => ipcRenderer.sendSync('dcf:intro:claim'),
            openCheckout: (url) => ipcRenderer.send('dcf:open:checkout', String(url || '')),
            sound: (kind) => ipcRenderer.send('dcf:sound', String(kind || '')),
            hud: {
                get: () => ipcRenderer.sendSync('dcf:hud:get'),
                set: (cfg) => ipcRenderer.send('dcf:hud:set', JSON.parse(JSON.stringify(cfg || {}))),
                toggle: () => ipcRenderer.send('dcf:hud:toggle'),
                data: () => ipcRenderer.invoke('dcf:hud:data'),
                renderer: () => ipcRenderer.sendSync('dcf:hud:renderer'),
                onChange: (cb) => { if (typeof cb === 'function') ipcRenderer.on('dcf:hud:changed', (_e, s) => { try { cb(s); } catch (err) {} }); },
            },
            update: {
                state: () => ipcRenderer.invoke('dcf:update:state'),
                check: () => ipcRenderer.invoke('dcf:update:check'),
                install: () => ipcRenderer.send('dcf:update:install'),
                onChange: (cb) => { if (typeof cb === 'function') ipcRenderer.on('dcf:update:state', (_e, s) => { try { cb(s); } catch (err) {} }); },
            },
        });
    }

    const script = ipcRenderer.sendSync('mlf:script');
    if (script && (script.code || script.layer)) {
        contextBridge.executeInMainWorld({
            func: (code, version, layer) => {
                if (code) {
                    const GM_addStyle = (css) => {
                        const s = document.createElement('style');
                        s.textContent = css;
                        const parent = document.head || document.documentElement;
                        if (parent) parent.appendChild(s);
                        else new MutationObserver((_, o) => {
                            if (document.documentElement) { (document.head || document.documentElement).appendChild(s); o.disconnect(); }
                        }).observe(document, { childList: true });
                        return s;
                    };
                    const GM_info = { script: { name: 'DreamingCrownfall', version }, scriptHandler: 'dreamingcrownfall' };
                    // Merker für windows.js: in diesem Dokument lief die Spiel-Ebene (siehe dort, Frame-Neuladen).
                    try { window.__dcfGameLayer = true; } catch (e) {}
                    try {
                        new Function('GM_addStyle', 'unsafeWindow', 'GM_info', code)(GM_addStyle, window, GM_info);
                    } catch (e) {
                        console.error('[dcf] Spiel-Ebene abgestürzt:', e);
                    }
                }
                if (layer && window.top === window.self) {
                    try { new Function(layer)(); } catch (e) { console.error('[dcf] App-Schicht abgestürzt:', e); }
                }
            },
            args: [script.code, script.version, script.layer],
        });
    }
}

// ---- Rechtsklickmenü (seit 0.7.0) -----------------------------------------------------------------
// Zeichnet das Menü im App-Look, das der Hauptprozess zusammenstellt (context-menu.js), und meldet
// vorher, ob unter dem Zeiger ein Spielername steht. Isolierte Welt, gleiches DOM; das Menü sitzt in
// einem Shadow-Root, damit weder das Spiel-CSS noch Themes es verändern. (Hier und nicht als eigene
// Datei: der Preload läuft in der Sandbox und darf nichts nachladen.)
const NAME_SELECTOR = '.mcf-chat__sender, [data-role*="player-name"], [data-role*="entrant-name"], [class*="player-name"], [class*="playerName"]';
const NAME_RE = /^[\p{L}\p{N}_][\p{L}\p{N}_.\- ]{1,30}$/u;

// Spielername unter dem Zeiger: Chat-Absender, Namensfelder, SVG-Beschriftungen in den Bahnen,
// Ergebniszeilen „#1 Name“.
function playerNameAt(target) {
    if (!(target instanceof Element)) return null;
    let el = target.closest(NAME_SELECTOR) || target.closest('.mcf-chat__meta')?.querySelector('.mcf-chat__sender') || null;
    if (!el && target.closest('[data-role="lane-stage"]') && target.tagName.toLowerCase() === 'text') el = target;
    let text = (el ? el.textContent : '').trim();
    if (!el) {
        // Ergebnislisten: kurze Zeile „#1 Name“ direkt unter dem Zeiger.
        const t = (target.textContent || '').trim();
        if (/^#\d+\s+\S/.test(t) && t.length < 40) text = t;
    }
    text = text.replace(/^#\d+\s+/, '').replace(/\s*·.*$/, '').trim();
    return text && NAME_RE.test(text) && !/^guest\b/i.test(text) ? text : null;
}

const CSS = `
    :host { all: initial; }
    .m { position: fixed; z-index: 2147483647; min-width: 200px; max-width: 320px; padding: 6px; border-radius: 12px;
         background: linear-gradient(180deg, rgba(36, 26, 58, 0.98), rgba(20, 15, 32, 0.98));
         border: 1px solid rgba(180, 138, 232, 0.35); box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.3);
         font: 600 13px/1.2 system-ui, sans-serif; color: #ece4f7; user-select: none;
         opacity: 0; transform: translateY(-3px); transition: opacity 90ms ease-out, transform 90ms ease-out; }
    .m.on { opacity: 1; transform: none; }
    .m::before { content: ''; position: absolute; left: 12px; right: 12px; top: 0; height: 2px; border-radius: 2px;
         background: linear-gradient(90deg, transparent, #ffd36e 30%, #b48ae8 70%, transparent); opacity: 0.85; }
    .i { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px;
         background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
    .i:hover:not(:disabled), .i.k { background: rgba(139, 92, 246, 0.22); }
    .i:disabled { color: #6f6486; cursor: default; }
    .i .l { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .i .s { color: #8f84a6; font-size: 11.5px; font-weight: 500; }
    .h { padding: 6px 10px 4px; color: #ffd36e; font-size: 10.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
         white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sep { height: 1px; margin: 5px 6px; background: rgba(180, 138, 232, 0.18); }`;

function installContextMenu(ipcRenderer) {
    // Vor dem Menü des Hauptprozesses: was unter dem Zeiger liegt (Spielername).
    window.addEventListener('contextmenu', (e) => {
        // Synchron: muss sicher vor Electrons 'context-menu' im Hauptprozess ankommen (asynchron kam sie zu spät).
        ipcRenderer.sendSync('dcf:ctx:info', { player: playerNameAt(e.target) });
    }, true);

    let host = null, root = null, menu = null, items = [], focus = -1;
    function close() {
        if (!menu) return;
        const m = menu;
        menu = null;
        m.classList.remove('on');
        setTimeout(() => m.remove(), 100);
    }
    function ensureHost() {
        if (host && host.isConnected) return;
        host = document.createElement('dcf-context-menu');
        root = host.attachShadow({ mode: 'closed' });
        const st = document.createElement('style');
        st.textContent = CSS;
        root.append(st);
        (document.body || document.documentElement).append(host);
    }
    function pick(i) {
        const it = items[i];
        if (!it || it.disabled || it.type) return;
        close();
        ipcRenderer.send('dcf:ctx:act', i);
    }
    function mark(i) {
        focus = i;
        menu?.querySelectorAll('.i').forEach((b) => b.classList.toggle('k', Number(b.dataset.i) === i));
    }

    ipcRenderer.on('dcf:ctx:show', (_e, m) => {
        close();
        ensureHost();
        items = m.items || [];
        focus = -1;
        const box = document.createElement('div');
        box.className = 'm';
        items.forEach((it, i) => {
            if (it.type === 'sep') { box.append(Object.assign(document.createElement('div'), { className: 'sep' })); return; }
            if (it.type === 'head') { box.append(Object.assign(document.createElement('div'), { className: 'h', textContent: it.label })); return; }
            const b = document.createElement('button');
            b.className = 'i';
            b.type = 'button';
            b.dataset.i = String(i);
            b.disabled = !!it.disabled;
            b.append(Object.assign(document.createElement('span'), { className: 'l', textContent: it.label }));
            if (it.hint) b.append(Object.assign(document.createElement('span'), { className: 's', textContent: it.hint }));
            b.addEventListener('click', () => pick(i));
            b.addEventListener('mouseenter', () => mark(i));
            box.append(b);
        });
        root.append(box);
        menu = box;
        // Am Zeiger, aber immer ganz im Fenster.
        const r = box.getBoundingClientRect();
        box.style.left = Math.max(6, Math.min(m.x, innerWidth - r.width - 6)) + 'px';
        box.style.top = Math.max(6, Math.min(m.y, innerHeight - r.height - 6)) + 'px';
        requestAnimationFrame(() => box.classList.add('on'));
    });

    // Schließen: Klick daneben, Esc, Scrollen, Fenster verlässt den Fokus. Pfeiltasten + Enter bedienen es.
    window.addEventListener('pointerdown', (e) => { if (menu && !e.composedPath().includes(host)) close(); }, true);
    window.addEventListener('blur', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', (e) => {
        if (!menu) return;
        const usable = items.map((it, i) => (!it.type && !it.disabled ? i : -1)).filter((i) => i >= 0);
        if (e.key === 'Escape') { close(); e.preventDefault(); e.stopPropagation(); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const at = usable.indexOf(focus);
            const next = e.key === 'ArrowDown' ? usable[(at + 1) % usable.length] : usable[(at - 1 + usable.length) % usable.length];
            mark(next); e.preventDefault(); e.stopPropagation();
        } else if (e.key === 'Enter' && focus >= 0) { pick(focus); e.preventDefault(); e.stopPropagation(); }
    }, true);
}

