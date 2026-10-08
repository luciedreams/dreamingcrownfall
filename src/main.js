// MarbleLuceFall-App: Marble Crownfall mit MarbleLuceFall, mehreren Accounts in Tabs,
// Systembenachrichtigungen und MLF-Fenstern als eigene Systemfenster.
//
// Jeder Tab ist ein Account mit eigener Sitzung (Partition, wie ein Browser-Container) und läuft
// durchgehend; sichtbar ist immer nur einer, die anderen zeichnen nicht (das Spiel pausiert bei
// document.hidden nur die Grafik, Socket und Tickets laufen weiter).
// MarbleLuceFall kommt von Greasy Fork (mlf-source.js) und läuft wie mit Tampermonkey vor den
// Seitenskripten in jedem Frame (preload.js); die eigenen Funktionen der App stehen in app-layer.js.

const { app, BaseWindow, WebContentsView, Tray, Menu, ipcMain, session, shell, nativeImage, Notification } = require('electron');
const fs = require('fs');
const path = require('path');
const createMlfSource = require('./mlf-source.js');
const startNotifier = require('./notify.js');
const startUpdater = require('./updater.js');

const START_URL = 'https://marblecrownfall.com/';
const TAB_BAR_HEIGHT = 36;
const ICON = path.join(__dirname, 'assets', 'icon.png');
const TRAY_ICON = path.join(__dirname, 'assets', 'tray.png');

// Testprofil (eigene Sitzungen, eigene Einzelinstanz): MLF_PROFILE=<ordner> electron .
if (process.env.MLF_PROFILE) app.setPath('userData', path.resolve(process.env.MLF_PROFILE));
app.setName('MarbleLuceFall');
// Ohne App-Kennung zeigt Windows keine Benachrichtigungen (muss zur appId im package.json passen).
if (process.platform === 'win32') app.setAppUserModelId('io.github.luciedreams.marblelucefall');

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
    } catch (e) { console.error(`[mlf-app] accounts.json nicht schreibbar: ${e.message}`); }
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

let win = null, tabBar = null, tray = null, notifier = null, mlf = null;
let active = 0;
const views = []; // je Account: { acc, view, name, guest, playerId, avatar }

// ---- App-Schicht und MLF an den Preload ------------------------------------------------------

let appLayer = null;
function loadAppLayer() {
    try { appLayer = fs.readFileSync(path.join(__dirname, 'app-layer.js'), 'utf8'); }
    catch (e) { appLayer = null; console.error(`[mlf-app] app-layer.js nicht lesbar: ${e.message}`); }
}

// preload.js holt sich den Code synchron, damit er vor dem ersten Seitenskript läuft.
ipcMain.on('mlf:script', (e) => {
    const s = mlf?.get();
    e.returnValue = { code: s?.code || null, version: s?.version || null, layer: appLayer };
});

// ---- Tab-Leiste -------------------------------------------------------------------------------

const label = (v) => v.name || `Account ${views.indexOf(v) + 1}`;

function tabState() {
    return {
        active,
        tabs: views.map((v) => ({ name: label(v), guest: v.guest, avatar: v.avatar || '', loading: v.view.webContents.isLoading() })),
    };
}
function pushTabs() {
    if (tabBar && !tabBar.webContents.isDestroyed()) tabBar.webContents.send('tabs:state', tabState());
    const cur = views[active];
    if (win && cur) win.setTitle(`MarbleLuceFall – ${label(cur)}`);
}

function select(i) {
    if (!views[i]) return;
    active = i;
    views.forEach((v, j) => v.view.setVisible(j === i));
    layout();
    views[i].view.webContents.focus();
    pushTabs();
}

function layout() {
    if (!win) return;
    const { width, height } = win.getContentBounds();
    const full = win.isFullScreen();
    const top = full ? 0 : TAB_BAR_HEIGHT;
    tabBar.setVisible(!full);
    tabBar.setBounds({ x: 0, y: 0, width, height: TAB_BAR_HEIGHT });
    for (const v of views) v.view.setBounds({ x: 0, y: top, width, height: height - top });
}

ipcMain.on('tabs:select', (_e, i) => select(i));
ipcMain.on('tabs:reload', (_e, i) => views[i]?.view.webContents.reload());
ipcMain.on('tabs:add', () => { addAccount({ partition: newPartition() }, true); saveAccounts(); });
ipcMain.on('tabs:remove', (_e, i) => removeAccount(i));
ipcMain.handle('tabs:state', () => tabState());

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
    else if (ctrl && k === 'Tab') select((active + (input.shift ? views.length - 1 : 1)) % views.length);
    else if (k === 'F5' || (ctrl && k.toLowerCase() === 'r')) input.shift ? wc.reloadIgnoringCache() : wc.reload();
    else if (k === 'F12' || (ctrl && input.shift && k.toLowerCase() === 'i')) wc.toggleDevTools();
    else if (k === 'F11') { win.setFullScreen(!win.isFullScreen()); }
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
            return { action: 'allow', overrideBrowserWindowOptions: {
                autoHideMenuBar: true, icon: ICON, backgroundColor: '#0b121a',
                webPreferences: { partition: v.acc.partition, contextIsolation: true, sandbox: true },
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
            child.on('page-title-updated', (e, t) => { e.preventDefault(); child.setTitle(`${t} – ${label(v)}`); });
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
    ses.setUserAgent(ses.getUserAgent().replace(/ (Electron|MarbleLuceFall|mlf-app|marblelucefall-app)\/\S+/gi, ''));
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
    wc.on('did-stop-loading', () => refreshIdentity(v));
    win.contentView.addChildView(view);
    view.setVisible(false);
    wc.loadURL(START_URL);
    layout();
    if (focus) select(views.length - 1); else pushTabs();
    return v;
}

// Tab entfernen = Account abmelden und seine Sitzung löschen (Cookies, Speicher). Der letzte Tab bleibt.
async function removeAccount(i) {
    const v = views[i];
    if (!v || views.length < 2) return;
    views.splice(i, 1);
    notifier?.resetAccount(v);
    win.contentView.removeChildView(v.view);
    v.view.webContents.close();
    try { await session.fromPartition(v.acc.partition).clearStorageData(); } catch {}
    saveAccounts();
    select(Math.min(active >= i ? Math.max(0, active - 1) : active, views.length - 1));
}

// ---- Fenster ----------------------------------------------------------------------------------

function createWindow() {
    win = new BaseWindow({
        width: 1600, height: 1000 + TAB_BAR_HEIGHT,
        title: 'MarbleLuceFall',
        icon: ICON,
        backgroundColor: '#14101c',
    });
    win.setMenu(null);

    tabBar = new WebContentsView({ webPreferences: {
        preload: path.join(__dirname, 'tabs-preload.js'), contextIsolation: true, sandbox: true,
    } });
    tabBar.setBackgroundColor('#14101c');
    tabBar.webContents.loadFile(path.join(__dirname, 'tabs.html'));
    tabBar.webContents.on('before-input-event', (e, input) => { if (views[active]) handleKeys(e, input, views[active].view.webContents); });
    win.contentView.addChildView(tabBar);

    for (const acc of loadAccounts()) addAccount(acc);
    saveAccounts();
    removeOrphanSessions();

    win.on('resize', layout);
    win.on('enter-full-screen', layout);
    win.on('leave-full-screen', layout);
    select(0);
}

function createTray() {
    tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
    tray.setToolTip('MarbleLuceFall');
    const show = () => { win.show(); win.focus(); };
    tray.on('click', show);
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Anzeigen', click: show },
        { label: 'Alle Tabs neu laden', click: () => { loadAppLayer(); views.forEach((v) => v.view.webContents.reloadIgnoringCache()); } },
        { label: 'Nach MLF-Update suchen', click: () => mlf.update().catch((e) => console.warn(`[mlf-app] ${e.message}`)) },
        { label: 'Test-Benachrichtigung', click: () => notifier?.test() },
        { label: 'DevTools (aktiver Tab)', click: () => views[active].view.webContents.openDevTools({ mode: 'detach' }) },
        { type: 'separator' },
        { label: 'Beenden', click: () => app.quit() },
    ]));
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

    app.whenReady().then(async () => {
        mlf = createMlfSource({
            userData: app.getPath('userData'),
            onUpdate: (version, before) => {
                if (!Notification.isSupported()) return;
                new Notification({ title: `MarbleLuceFall ${version} ist da`, icon: ICON,
                    body: `Vorher ${before}. Gilt ab dem nächsten Neuladen eines Tabs (F5).` }).show();
            },
        });
        await mlf.init();
        loadAppLayer();
        createWindow();
        createTray();
        startUpdater({ icon: ICON });
        const watching = () => win && win.isVisible() && !win.isMinimized() && win.isFocused();
        notifier = startNotifier({
            views, icon: ICON,
            isFocused: watching,
            isWatching: (i) => watching() && active === i,
            focusTab: (i) => { win.show(); win.focus(); if (i != null && i >= 0) select(i); },
        });
    });

    app.on('window-all-closed', () => app.quit());
}
