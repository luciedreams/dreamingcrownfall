// Anmelden wie in einem Spiel-Launcher (seit 0.7.0, Luces Wahl vom 17.10.): Twitch öffnet sich in
// einem kleinen eigenen Fenster ohne Systemrahmen — oben die App-Leiste (login-bar.html), darunter die
// Twitch-Seite in der Sitzung des Accounts, damit das Login-Cookie genau dort landet. Sobald Twitch
// zurück ins Spiel leitet, ist die Anmeldung durch: Fenster zu, onDone() lädt den Tab neu.

const path = require('path');
const { BaseWindow, WebContentsView, ipcMain, shell } = require('electron');

const BAR = 34;
const START = 'https://marblecrownfall.com/auth/twitch/start';
const isTwitch = (h) => h === 'twitch.tv' || h.endsWith('.twitch.tv');
const isGame = (h) => h === 'marblecrownfall.com' || h.endsWith('.marblecrownfall.com');

let current = null;   // { win, partition } — immer nur ein Login-Fenster

module.exports = function openLogin({ parent, partition, name, icon, onDone }) {
    if (current && !current.win.isDestroyed()) {
        if (current.partition === partition) { current.win.show(); current.win.focus(); return; }
        current.win.close();
    }
    const pb = parent.getBounds();
    const width = 500, height = 760;
    const win = new BaseWindow({
        width, height, minWidth: 380, minHeight: 520, frame: false, icon, title: 'Sign in with Twitch',
        x: Math.round(pb.x + (pb.width - width) / 2), y: Math.round(pb.y + Math.max(0, (pb.height - height) / 2)),
        backgroundColor: '#160f24', parent,
    });
    const bar = new WebContentsView({ webPreferences: { preload: path.join(__dirname, 'login-preload.js'), contextIsolation: true, sandbox: true } });
    const page = new WebContentsView({ webPreferences: { partition, contextIsolation: true, sandbox: true } });
    page.setBackgroundColor('#160f24');
    win.contentView.addChildView(page);
    win.contentView.addChildView(bar);
    const layout = () => {
        const { width: w, height: h } = win.getContentBounds();
        bar.setBounds({ x: 0, y: 0, width: w, height: BAR });
        page.setBounds({ x: 0, y: BAR, width: w, height: h - BAR });
    };
    layout();
    win.on('resize', layout);
    bar.webContents.loadFile(path.join(__dirname, 'login-bar.html'), { query: { name: name || '' } });
    current = { win, partition };

    let finished = false;
    const pwc = page.webContents;
    // Zurück auf der Spielseite (nicht mehr /auth/…) = angemeldet.
    pwc.on('did-navigate', (_e, url) => {
        let u;
        try { u = new URL(url); } catch { return; }
        if (isGame(u.hostname) && !u.pathname.startsWith('/auth/')) {
            finished = true;
            win.close();
        }
    });
    // Nur Twitch und das Spiel im Fenster; alles andere (Hilfe, Registrieren-Infos) im Browser.
    const inside = (url) => { try { const u = new URL(url); return u.protocol === 'https:' && (isTwitch(u.hostname) || isGame(u.hostname)); } catch { return false; } };
    pwc.on('will-navigate', (e, url) => { if (!inside(url)) { e.preventDefault(); shell.openExternal(url); } });
    pwc.setWindowOpenHandler(({ url }) => {
        if (inside(url)) { pwc.loadURL(url); return { action: 'deny' }; }
        shell.openExternal(url);
        return { action: 'deny' };
    });
    pwc.loadURL(START);

    const owns = (e) => e.sender === bar.webContents;
    const onMin = (e) => { if (owns(e)) win.minimize(); };
    const onClose = (e) => { if (owns(e)) win.close(); };
    const onBack = (e) => { if (owns(e) && pwc.navigationHistory.canGoBack()) pwc.navigationHistory.goBack(); };
    ipcMain.on('login:min', onMin);
    ipcMain.on('login:close', onClose);
    ipcMain.on('login:back', onBack);
    win.on('closed', () => {
        ipcMain.off('login:min', onMin);
        ipcMain.off('login:close', onClose);
        ipcMain.off('login:back', onBack);
        if (current?.win === win) current = null;
        try { bar.webContents.close(); page.webContents.close(); } catch {}
        onDone(finished);
    });
};
