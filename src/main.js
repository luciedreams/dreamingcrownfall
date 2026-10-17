// DreamingCrownfall: Marble Crownfall als Desktop-App (hervorgegangen aus MarbleLuceFall), mehrere Accounts in Tabs,
// Systembenachrichtigungen und MLF-Fenstern als eigene Systemfenster.
//
// Jeder Tab ist ein Account mit eigener Sitzung (Partition, wie ein Browser-Container) und läuft
// durchgehend; sichtbar ist immer nur einer, die anderen zeichnen nicht (das Spiel pausiert bei
// document.hidden nur die Grafik, Socket und Tickets laufen weiter).
// Die Spiel-Ebene (src/mlf/, abgespalten von MarbleLuceFall 6.59.1, game-source.js) läuft wie mit
// Tampermonkey vor den Seitenskripten in jedem Frame (preload.js); App-Funktionen im Seitenkontext
// stehen in app-layer.js.

const { app, BaseWindow, WebContentsView, Tray, Menu, ipcMain, session, shell, nativeImage, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const gameSource = require('./game-source.js');
const startNotifier = require('./notify.js');
const startUpdater = require('./updater.js');
const loadAddons = require('./addons.js');
const autostart = require('./autostart.js');
const appSettings = require('./app-settings.js');
const startDiscord = require('./discord.js');
const startVitals = require('./vitals.js');
const initPerfReport = require('./perf-report.js');
const createHome = require('./home.js');
const windowState = require('./window-state.js');
const startShortcuts = require('./shortcuts.js');
const createHud = require('./hud.js');
const createStats = require('./stats.js');
const startTabStatus = require('./tab-status.js');

const START_URL = 'https://marblecrownfall.com/';
const TAB_BAR_HEIGHT = 62;   // Account-Rahmen (Unit-Frames) seit 0.7.0, vorher 36 px Tabs
const ICON = path.join(__dirname, 'assets', 'icon.png');
const TRAY_ICON = path.join(__dirname, 'assets', 'tray.png');

// Testprofil (eigene Sitzungen, eigene Einzelinstanz): DCF_PROFILE=<ordner> electron .
if (process.env.DCF_PROFILE) app.setPath('userData', path.resolve(process.env.DCF_PROFILE));
app.setName('DreamingCrownfall');
// Sichtbarer Name: die Testumgebung (dcf-test, DCF_PROFILE) heißt in Titeln und im Tray „Dev Edition“,
// damit sie neben der installierten App nicht zu verwechseln ist. app.setName bleibt — daran hängt der
// Schlüssel, mit dem die Logins im Profil verschlüsselt sind.
const EDITION = process.env.DCF_EDITION ?? (process.env.DCF_PROFILE ? 'Dev Edition' : '');
const APP_TITLE = EDITION ? `DreamingCrownfall ${EDITION}` : 'DreamingCrownfall';

// App-Log: was die App auf die Konsole schreibt, auch nach <Profil>/logs/app.log (ab 1 MB eine
// Generation app.old.log). Aus dem Menü gestartet sieht sonst niemand die Konsole — so lässt sich
// z. B. ein gescheitertes Update auf einem anderen Rechner nachlesen (Settings › About).
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
(() => {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
        const file = path.join(LOG_DIR, 'app.log');
        try { if (fs.statSync(file).size > 1024 * 1024) fs.renameSync(file, path.join(LOG_DIR, 'app.old.log')); } catch {}
        const out = fs.createWriteStream(file, { flags: 'a' });
        out.write(`\n=== ${new Date().toISOString()} DreamingCrownfall ${app.getVersion()} (${process.platform}) ===\n`);
        for (const k of ['log', 'warn', 'error']) {
            const orig = console[k].bind(console);
            console[k] = (...a) => {
                orig(...a);
                try { out.write(`${new Date().toISOString().slice(11, 19)} ${a.map((x) => (typeof x === 'string' ? x : (x && x.stack) || JSON.stringify(x))).join(' ')}\n`); } catch {}
            };
        }
    } catch {}
})();
ipcMain.on('dcf:logs:open', () => shell.openPath(LOG_DIR));
// Globale Tastenkürzel unter Wayland gehen nur über das Desktop-Portal (shortcuts.js).
app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal');
// Ohne App-Kennung zeigt Windows keine Benachrichtigungen (muss zur appId im package.json passen).
if (process.platform === 'win32') app.setAppUserModelId('io.github.luciedreams.dreamingcrownfall');

// Hosts, die in der App bleiben dürfen; alles andere geht in den System-Browser.
const isGame = (h) => h === 'marblecrownfall.com' || h.endsWith('.marblecrownfall.com');
const isTwitchLogin = (h) => h === 'twitch.tv' || h.endsWith('.twitch.tv');
const staysInApp = (url) => {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && (isGame(u.hostname) || isTwitchLogin(u.hostname));
    } catch { return false; }
};

// ---- Accounts (Datei accounts.json im Profil) -------------------------------------------------
// Ein Account ist nur eine Partition; Name und Bild kommen live vom Login (/api/auth/me).

const ACCOUNTS_FILE = () => path.join(app.getPath('userData'), 'accounts.json');
const newPartition = () => `persist:acc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function loadAccounts() {
    try {
        const j = JSON.parse(fs.readFileSync(ACCOUNTS_FILE(), 'utf8'));
        const list = (j.accounts || []).filter((a) => a && /^persist:[\w-]+$/.test(a.partition));
        if (list.length) return list;
    } catch {}
    // Erster Start. Sitzungen aus dem Prototyp (persist:mcf…) übernehmen, damit Logins bleiben.
    const old = ['mcf', 'mcf-alt', 'mcf-alt2']
        .filter((p) => fs.existsSync(path.join(app.getPath('userData'), 'Partitions', p)))
        .map((p) => ({ partition: `persist:${p}` }));
    return old.length ? old : [{ partition: newPartition() }];
}
function saveAccounts() {
    try {
        fs.writeFileSync(ACCOUNTS_FILE(), JSON.stringify({ accounts: views.map((v) => ({ partition: v.acc.partition })) }, null, 2));
    } catch (e) { console.error(`[dcf] accounts.json nicht schreibbar: ${e.message}`); }
}

// Sitzungsordner entfernter Tabs (persist:acc-…) beim Start wegräumen. clearStorageData leert sie
// beim Entfernen schon, der Ordner selbst ist erst frei, wenn die Sitzung nicht mehr läuft.
function removeOrphanSessions() {
    const dir = path.join(app.getPath('userData'), 'Partitions');
    const keep = new Set(views.map((v) => v.acc.partition.replace(/^persist:/, '')));
    let names = [];
    try { names = fs.readdirSync(dir); } catch { return; }
    for (const n of names) {
        if (!/^acc-[a-z0-9]+$/.test(n) || keep.has(n)) continue;
        try { fs.rmSync(path.join(dir, n), { recursive: true, force: true }); } catch {}
    }
}

const webPrefs = (acc) => ({
    partition: acc.partition,
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: true, // Preload auch in den Overlay-iframes (Inventar, Achievements)
});

let win = null, tabBar = null, tray = null, notifier = null, addons = null, updater = null, vitals = null;
let active = 0;
const HOME = -1;      // active === HOME: der Home-Tab (Übersicht, erst ab zwei Accounts)
const STATS = -2;     // active === STATS: die öffentliche MarbleMind-Seite (stats.js, nur mit Schalter)
// active < 0 = kein Spiel-Tab vorn (Home oder Stats) — wer ein Spiel braucht, nimmt lastGame.
let lastGame = 0;     // zuletzt gewählter Spiel-Tab (für Discord, Settings aus dem Tray)
let home = null, hud = null, stats = null, tabStatus = null;
const views = []; // je Account: { acc, view, name, guest, playerId, avatar }

// ---- App-Schicht und MLF an den Preload ------------------------------------------------------

let appLayer = null;
function loadAppLayer() {
    try { appLayer = fs.readFileSync(path.join(__dirname, 'app-layer.js'), 'utf8'); }
    catch (e) { appLayer = null; console.error(`[dcf] app-layer.js nicht lesbar: ${e.message}`); }
}

// preload.js holt sich den Code synchron, damit er vor dem ersten Seitenskript läuft.
ipcMain.on('mlf:script', (e) => {
    const s = gameSource.get();
    e.returnValue = { code: s?.code || null, version: s?.version || null, layer: appLayer };
});

// ---- Tab-Leiste -------------------------------------------------------------------------------

const label = (v) => v.name || `Account ${views.indexOf(v) + 1}`;

function tabState() {
    const king = notifier?.kingNow() || null;
    return {
        active,
        home: !!home?.available(),
        stats: !!stats?.enabled(),
        maximized: !!win?.isMaximized(),
        tabs: views.map((v) => ({
            name: label(v), guest: v.guest, avatar: v.avatar || '', loading: v.view.webContents.isLoading(),
            king: !!(king && v.playerId && v.playerId === king.playerId),
            ...(tabStatus && !v.guest ? tabStatus.of(v) : {}),
        })),
    };
}
function pushTabs() {
    if (tabBar && !tabBar.webContents.isDestroyed()) tabBar.webContents.send('tabs:state', tabState());
    const cur = views[active];
    if (win) win.setTitle(active === HOME ? `${APP_TITLE} – Home` : active === STATS ? `${APP_TITLE} – Stats` : cur ? `${APP_TITLE} – ${label(cur)}` : APP_TITLE);
    home?.push();
}

// statsTab: Unterseite der Stats-Seite (aus Home/HUD), sonst bleibt sie, wo sie war.
function select(i, statsTab) {
    if (i === HOME && !home?.available()) i = lastGame;
    if (i === STATS && !stats?.enabled()) i = lastGame;
    if (i >= 0 && !views[i]) i = Math.min(Math.max(0, i), views.length - 1);
    if (i >= 0 && !views[i]) return;
    active = i;
    if (i >= 0) lastGame = i;
    views.forEach((v, j) => v.view.setVisible(j === i || v.warming));
    home?.setVisible(i === HOME);
    if (i === STATS) stats.show(statsTab); else stats?.view()?.setVisible(false);
    const front = i === HOME ? home.view : i === STATS ? stats.view() : views[i].view;
    if (i === STATS) front.setVisible(true);
    // Der gewählte Tab nach oben: Tabs, die noch anlaufen (warmUp), liegen sichtbar darunter.
    win.contentView.addChildView(front);
    layout();
    front.webContents.focus();
    pushTabs();
}
const activeContents = () => (active === HOME ? home?.view.webContents : active === STATS ? stats?.view()?.webContents : views[active]?.view.webContents);

function layout() {
    if (!win) return;
    const { width, height } = win.getContentBounds();
    const full = win.isFullScreen();
    const top = full ? 0 : TAB_BAR_HEIGHT;
    tabBar.setVisible(!full);
    tabBar.setBounds({ x: 0, y: 0, width, height: TAB_BAR_HEIGHT });
    for (const v of views) v.view.setBounds({ x: 0, y: top, width, height: height - top });
    home?.view.setBounds({ x: 0, y: top, width, height: height - top });
    stats?.view()?.setBounds({ x: 0, y: top, width, height: height - top });
}

ipcMain.on('tabs:select', (_e, i) => select(i));
ipcMain.on('tabs:reload', (_e, i) => (i === STATS ? stats?.view()?.webContents : views[i]?.view.webContents)?.reload());
ipcMain.on('tabs:add', () => { addAccount({ partition: newPartition() }, true); saveAccounts(); });
ipcMain.on('tabs:remove', (_e, i) => removeAccount(i));
// Zahnrad in der Tab-Leiste: immer erreichbar, auch wenn die Spiel-Ebene „wie die Website“ aussieht.
ipcMain.on('tabs:settings', () => showSettingsPage(''));
// Settings › Stats › „Open the Stats tab“ (Spiel-Ebene).
ipcMain.on('dcf:stats:open', (_e, tab) => select(STATS, tab || undefined));
ipcMain.handle('tabs:state', () => tabState());
// Fensterknöpfe der eigenen Leiste (kein Systemrahmen).
ipcMain.on('win:minimize', () => win?.minimize());
ipcMain.on('win:maximize', () => { if (!win) return; if (win.isMaximized()) win.unmaximize(); else win.maximize(); });
ipcMain.on('win:close', () => win?.close());
ipcMain.on('dcf:notify:test', () => notifier?.test());
// Willkommen-Schritte: nur ein Tab zeigt sie (der erste, der fragt, behält sie auch nach dem Neuladen).
let welcomeOwner = null;
ipcMain.on('dcf:welcome:claim', (e) => {
    if (welcomeOwner == null || welcomeOwner === e.sender.id) { welcomeOwner = e.sender.id; e.returnValue = true; } else e.returnValue = false;
});
// Aus den Willkommen-Schritten: weiteren Account-Tab anlegen, ohne hinzuwechseln.
ipcMain.on('dcf:account:add', () => { addAccount({ partition: newPartition() }, false); saveAccounts(); });
// Bildwiederholrate des Bildschirms, auf dem das Fenster steht (Auto-Bildrate der Spiel-Ebene).
ipcMain.on('dcf:display:hz', (e) => {
    let hz = 60;
    try { hz = screen.getDisplayMatching(win.getBounds()).displayFrequency || 60; } catch {}
    e.returnValue = hz;
});

// Wer ist in diesem Tab eingeloggt? Fragt das Spiel selbst (Seitenkontext = Cookie der Partition).
async function refreshIdentity(v) {
    try {
        const me = await v.view.webContents.executeJavaScript(
            "fetch('/api/auth/me', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => null)");
        if (me) {
            const pid = me.isGuest ? null : (me.playerId || null);
            if (pid !== v.playerId) notifier?.resetAccount(v); // anderer Account → neuer Wasserstand
            v.playerId = pid;
            v.guest = !!me.isGuest;
            v.name = me.isGuest ? null : me.displayName;
            v.avatar = me.isGuest ? '' : (me.profileImageUrl || me.avatarUrl || '');
            addons?.identityChanged(v);
        }
    } catch {}
    pushTabs();
}

// ---- Tastatur ---------------------------------------------------------------------------------

function handleKeys(e, input, wc) {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta;
    const k = input.key;
    let done = true;
    if (ctrl && /^[1-9]$/.test(k)) select(Number(k) - 1);
    else if (ctrl && k === 'Tab') select(active < 0 ? (input.shift ? views.length - 1 : 0) : (active + (input.shift ? views.length - 1 : 1)) % views.length);
    else if (k === 'F5' || (ctrl && k.toLowerCase() === 'r')) input.shift ? wc.reloadIgnoringCache() : wc.reload();
    else if (k === 'F12' || (ctrl && input.shift && k.toLowerCase() === 'i')) wc.toggleDevTools();
    else if (k === 'F11') { win.setFullScreen(!win.isFullScreen()); }
    else if (k === 'F2' && !ctrl && !input.alt) hud?.toggle();
    else if (ctrl && k === ',') showSettingsPage('');
    else if (ctrl && (k === '+' || k === '=')) wc.setZoomLevel(wc.getZoomLevel() + 0.5);
    else if (ctrl && k === '-') wc.setZoomLevel(wc.getZoomLevel() - 0.5);
    else if (ctrl && k === '0') wc.setZoomLevel(0);
    else done = false;
    if (done) e.preventDefault();
}

// ---- Spiel-Inhalte ----------------------------------------------------------------------------

function wireGameContents(wc, v) {
    wc.setWindowOpenHandler(({ url, frameName }) => {
        // MLF-Fenster als Systemfenster: leeres Fenster derselben Seite, das die App-Schicht befüllt.
        if (url === 'about:blank' && /^mlfpop-/.test(frameName)) {
            // Mit Preload wie die Tabs: die Seite im Fenster (Inventar, Achievements …) lädt beim Umzug
            // neu, und ohne Preload kam dort die Spiel-Ebene nicht hinein — neues Inventar und neue
            // Achievements blieben aus (Luce, 09.10.). Das about:blank-Fenster selbst lässt der Preload in Ruhe.
            return { action: 'allow', overrideBrowserWindowOptions: {
                autoHideMenuBar: true, icon: ICON, backgroundColor: '#0b121a',
                webPreferences: webPrefs(v.acc),
            } };
        }
        if (staysInApp(url)) {
            return { action: 'allow', overrideBrowserWindowOptions: {
                autoHideMenuBar: true, icon: ICON, webPreferences: webPrefs(v.acc),
            } };
        }
        shell.openExternal(url);
        return { action: 'deny' };
    });
    wc.on('will-navigate', (e, url) => {
        if (!staysInApp(url)) { e.preventDefault(); shell.openExternal(url); }
    });
    wc.on('did-create-window', (child, { frameName }) => {
        wireGameContents(child.webContents, v);
        if (/^mlfpop-/.test(frameName || '')) {
            // Fenstertitel = MLF-Titel + Account, damit drei Inventare nicht verwechselt werden.
            child.on('page-title-updated', (e, t) => { e.preventDefault(); child.setTitle(`${t} – ${label(v)}${EDITION ? ` · ${EDITION}` : ''}`); });
            child.webContents.on('before-input-event', (e, input) => {
                if (input.type === 'keyDown' && (input.key === 'F12' || ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i'))) {
                    child.webContents.toggleDevTools(); e.preventDefault();
                }
            });
        }
    });
}

function setupSession(acc) {
    const ses = session.fromPartition(acc.partition);
    if (ses.__mlfReady) return;
    ses.__mlfReady = true;
    // Ohne „Electron/…“ im User-Agent, sonst lehnt Twitch den Login als eingebetteten Browser ab.
    ses.setUserAgent(ses.getUserAgent().replace(/ (Electron|DreamingCrownfall|dreamingcrownfall)\/\S+/gi, ''));
    // Nur die Spielseite darf Benachrichtigungen zeigen (landen als System-Benachrichtigung).
    ses.setPermissionRequestHandler((wc, permission, cb, details) => {
        let host = '';
        try { host = new URL(details.requestingUrl).hostname; } catch {}
        cb(isGame(host) && ['notifications', 'clipboard-sanitized-write', 'fullscreen'].includes(permission));
    });
}

function addAccount(acc, focus = false) {
    setupSession(acc);
    const view = new WebContentsView({ webPreferences: webPrefs(acc) });
    view.setBackgroundColor('#14101c');
    const v = { acc, view, name: null, guest: true, playerId: null, avatar: '' };
    views.push(v);
    const wc = view.webContents;
    wireGameContents(wc, v);
    wc.on('before-input-event', (e, input) => handleKeys(e, input, wc));
    wc.on('did-start-loading', pushTabs);
    wc.on('did-stop-loading', () => { refreshIdentity(v); setTimeout(() => tabStatus?.refresh(), 3000); });
    vitals?.watch(v);
    win.contentView.addChildView(view);
    wc.loadURL(START_URL);
    warmUp(v);
    layout();
    if (focus) select(views.length - 1); else pushTabs();
    return v;
}

// Ein Tab, der nie sichtbar war, hat im Renderer 0×0 Pixel. Das Spiel wählt dann beim Laden das
// Layout „mobile-landscape“ und blendet die ganze Fußleiste (Tickets, Gebote) aus; der Weg zurück
// nach „desktop“ beim ersten Zeigen stellt sie nicht wieder her — die Alt-Tabs standen ohne Footer
// da, bis man neu lud (Luce, 17.10.). Deshalb läuft jeder neue Tab sichtbar UNTER dem aktiven an,
// bis die Spielseite ihr Layout gewählt hat; danach behält er seine Größe auch versteckt.
function warmUp(v) {
    v.warming = true;
    const wc = v.view.webContents;
    const started = Date.now();
    const done = () => {
        if (!v.warming) return;
        v.warming = false;
        if (views[active] !== v && !wc.isDestroyed()) v.view.setVisible(false);
    };
    const poll = async () => {
        if (!v.warming || wc.isDestroyed()) return;
        let mode = null;
        try { mode = await wc.executeJavaScript("document.querySelector('[data-role=shell]')?.dataset.layoutMode || null"); } catch {}
        if (mode || Date.now() - started > 20000) done();
        else setTimeout(poll, 500);
    };
    wc.once('dom-ready', poll);
}

// Tab entfernen = Account abmelden und seine Sitzung löschen (Cookies, Speicher). Der letzte Tab bleibt.
async function removeAccount(i) {
    const v = views[i];
    if (!v || views.length < 2) return;
    views.splice(i, 1);
    notifier?.resetAccount(v);
    home?.forget(v);
    tabStatus?.forget(v);
    win.contentView.removeChildView(v.view);
    v.view.webContents.close();
    try { await session.fromPartition(v.acc.partition).clearStorageData(); } catch {}
    saveAccounts();
    if (lastGame >= i) lastGame = Math.max(0, lastGame - 1);
    select(active < 0 ? active : Math.min(active >= i ? Math.max(0, active - 1) : active, views.length - 1));
}

// ---- Fenster ----------------------------------------------------------------------------------

function createWindow() {
    const ws = windowState.load({ width: 1600, height: 1000 + TAB_BAR_HEIGHT });
    win = new BaseWindow({
        width: ws.width, height: ws.height, ...(ws.x != null ? { x: ws.x, y: ws.y } : {}),
        title: APP_TITLE,
        icon: ICON,
        backgroundColor: '#14101c',
        show: !autostart.startHidden, // Autostart: erst im Tray, Fenster über „Show“
        // Ohne Systemrahmen (seit 0.7.0): die Account-Leiste ist die Fensterleiste — ziehen zum
        // Verschieben, eigene Knöpfe für Minimieren/Maximieren/Schließen (tabs.html).
        frame: false,
        minWidth: 900, minHeight: 600,
    });
    if (ws.maximized) win.maximize();
    windowState.track(win);
    win.setMenu(null);

    tabBar = new WebContentsView({ webPreferences: {
        preload: path.join(__dirname, 'tabs-preload.js'), contextIsolation: true, sandbox: true,
    } });
    tabBar.setBackgroundColor('#14101c');
    tabBar.webContents.loadFile(path.join(__dirname, 'tabs.html'));
    tabBar.webContents.on('before-input-event', (e, input) => { const wc = activeContents(); if (wc) handleKeys(e, input, wc); });
    win.contentView.addChildView(tabBar);

    stats = createStats({
        win, setting: appSettings.get, onSettingsChange: appSettings.onChange,
        onChange: () => { home?.push(); hud?.update(); },
        wire: (wc) => wc.on('before-input-event', (e, input) => handleKeys(e, input, wc)),
    });
    // Stats ein-/ausgeschaltet: Tab-Leiste nachziehen; wer gerade auf Stats steht, geht zurück ins Spiel.
    appSettings.onChange(() => { if (active === STATS && !stats.enabled()) select(lastGame); else pushTabs(); });
    tabStatus = startTabStatus({ views, onChange: pushTabs });
    let shownKing = null;
    setInterval(() => { const k = notifier?.kingNow()?.playerId || null; if (k !== shownKing) { shownKing = k; pushTabs(); } }, 5000);
    home = createHome({ win, views, label, stats, kingNow: () => notifier?.kingNow() || null, onSelect: (i, tab) => select(i, tab) });
    home.view.webContents.on('before-input-event', (e, input) => handleKeys(e, input, home.view.webContents));
    for (const acc of loadAccounts()) addAccount(acc);
    saveAccounts();
    removeOrphanSessions();

    // Unter X11 (Mint/.deb) kommt Maximieren ohne 'resize' oder mit alten Maßen an → die Views
    // blieben alt groß, unten abgeschnitten. Deshalb alle Fenster-Ereignisse plus ein Nachlauf.
    let settle = 0;
    const relayout = () => { layout(); clearTimeout(settle); settle = setTimeout(layout, 150); };
    for (const ev of ['resize', 'maximize', 'unmaximize', 'restore', 'enter-full-screen', 'leave-full-screen']) win.on(ev, relayout);
    // Maximieren-Knopf der Leiste zeigt den Zustand (□ bzw. ❐).
    for (const ev of ['maximize', 'unmaximize']) win.on(ev, pushTabs);
    // Hauptfenster zu = App beenden. 'window-all-closed' allein reicht nicht: das HUD und
    // ausgekoppelte Fenster sind auch Fenster und hielten die App sonst am Leben.
    win.on('closed', () => app.quit());
    select(0);
}

// Settings im aktiven Tab öffnen, auf einer bestimmten Seite (Tray › Check for updates).
function showSettingsPage(page) {
    win.show(); win.focus();
    if (active < 0) select(lastGame);
    const wc = views[active]?.view.webContents;
    if (wc) wc.executeJavaScript(`window.dcfOpenSettings && window.dcfOpenSettings(${JSON.stringify(page)})`).catch(() => {});
}

function createTray() {
    tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
    tray.setToolTip(APP_TITLE);
    tray.on('click', () => { win.show(); win.focus(); });
    buildTrayMenu();
}
// Neu gebaut, wenn sich ein Häkchen von außen ändert (HUD per F2).
function buildTrayMenu() {
    if (!tray) return;
    const show = () => { win.show(); win.focus(); };
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Show', click: show },
        { label: 'HUD (F2)', type: 'checkbox', checked: !!hud?.isOpen(), click: () => hud?.toggle() },
        { label: 'Take the tour', click: () => { win.show(); win.focus(); if (active < 0) select(lastGame);
            views[active]?.view.webContents.executeJavaScript('window.dcfStartTour && window.dcfStartTour()').catch(() => {}); } },
        { label: 'Reload all tabs', click: () => { loadAppLayer(); views.forEach((v) => v.view.webContents.reloadIgnoringCache()); } },
        { label: 'Check for updates', click: () => { showSettingsPage('about'); updater?.check(); } },
        { label: 'Test notification', click: () => notifier?.test() },
        { label: 'Start with system', type: 'checkbox', checked: autostart.enabled(),
          click: (item) => { try { appSettings.setAutostart(item.checked); } catch (e) { console.error(`[dcf] Autostart: ${e.message}`); } } },
        { label: 'DevTools (current tab)', click: () => activeContents()?.openDevTools({ mode: 'detach' }) },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
    ]));
}

// Ziele der globalen Tastenkürzel.
const shortcutActions = {
    toggle() { if (win.isVisible() && win.isFocused()) win.hide(); else { win.show(); win.focus(); } },
    next() { win.show(); win.focus(); select(active < 0 ? 0 : (active + 1) % views.length); },
    chat() {
        win.show(); win.focus();
        if (active < 0) select(lastGame);
        views[active]?.view.webContents.executeJavaScript(`(() => { const c = [...document.querySelectorAll('.mcf-chat__form [data-role="chat-input"], .mcf-chat__form textarea.mcfo-chatgrow')].find((e) => e.offsetParent); if (c) c.focus(); })()`).catch(() => {});
    },
};

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

    app.whenReady().then(async () => {
        console.log(`[dcf] DreamingCrownfall ${app.getVersion()}`);
        // Neue Installation = noch keine accounts.json: Willkommen-Schritte, Spiel-Ebene startet
        // wie die Website. Bestehende Installationen bekommen beides nicht (nichts ändert sich).
        const fresh = !fs.existsSync(ACCOUNTS_FILE());
        appSettings.init();
        try { autostart.refresh(appSettings.get('autostart.hidden') !== false); } catch (e) { console.error(`[dcf] Autostart: ${e.message}`); }
        if (fresh) appSettings.set('game.plain', true);
        else if (!appSettings.get('app.onboarded')) appSettings.set('app.onboarded', true);
        initPerfReport();
        vitals = startVitals({ views, setting: appSettings.get, label });
        loadAppLayer();
        createWindow();
        hud = createHud({ views, stats, icon: ICON, kingNow: () => notifier?.kingNow() || null, onToggle: () => buildTrayMenu(),
            openStats: (tab) => { win.show(); win.focus(); select(STATS, tab); },
            refocus: () => { win.focus(); activeContents()?.focus(); } });
        createTray();
        startShortcuts({ setting: appSettings.get, onSettingsChange: appSettings.onChange, actions: shortcutActions });
        updater = startUpdater({ icon: ICON });
        addons = loadAddons({ views, icon: ICON });
        const watching = () => win && win.isVisible() && !win.isMinimized() && win.isFocused();
        notifier = startNotifier({
            views, icon: ICON, setting: appSettings.get,
            isFocused: watching,
            isWatching: (i) => watching() && active === i,
            focusTab: (i) => { win.show(); win.focus(); if (i != null && i >= 0) select(i); },
        });
        startDiscord({
            setting: appSettings.get,
            onSettingsChange: appSettings.onChange,
            activeAccount: () => { const v = views[active < 0 ? lastGame : active]; return v && !v.guest ? v.name : null; },
            kingOfMine: () => notifier.kingOfMine(),
            startedAt: Date.now(),
        });
    });

    app.on('window-all-closed', () => app.quit());
}
