// Discord Rich Presence (opt-in, Settings › Discord): „Spielt Marble Crownfall“ mit dem Account des
// sichtbaren Tabs und „👑 King for N min“, solange einer der eigenen Accounts King ist.
//
// Rohes IPC-Protokoll wie in mpv_discord.py: Rahmen = op (int32 LE) + Länge (int32 LE) + JSON;
// op 0 Handshake {v:1, client_id}, op 1 SET_ACTIVITY. Linux: $XDG_RUNTIME_DIR/discord-ipc-N
// (Discord, Vesktop/arRPC), dazu Flatpak/Snap-Orte; Windows: \\?\pipe\discord-ipc-N.
// Gesendet wird nur bei einer Änderung; ein geschlossener Socket wird nach 15 s neu versucht.

const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Client-ID der Discord-App „Marble Crownfall“ (Developer Portal). Öffentlich, kein Geheimnis.
const CLIENT_ID = process.env.DCF_DISCORD_CLIENT_ID || '1557866078636482580';
const TICK_MS = 15 * 1000;
const RETRY_MS = 15 * 1000;

function socketPaths() {
    if (process.env.DCF_DISCORD_IPC) return [process.env.DCF_DISCORD_IPC]; // Test gegen einen nachgebauten Socket
    if (process.platform === 'win32') return [...Array(10).keys()].map((i) => `\\\\?\\pipe\\discord-ipc-${i}`);
    const dirs = [process.env.XDG_RUNTIME_DIR, process.env.TMPDIR, process.env.TMP, process.env.TEMP, '/tmp'].filter(Boolean);
    const out = [];
    for (const d of dirs) {
        for (const sub of ['', 'app/com.discordapp.Discord', 'snap.discord', 'app/dev.vencord.Vesktop']) {
            for (let i = 0; i < 10; i++) out.push(path.join(d, sub, `discord-ipc-${i}`));
        }
    }
    return out.filter((p) => { try { return fs.statSync(p).isSocket(); } catch { return false; } });
}

function frame(op, data) {
    const json = Buffer.from(JSON.stringify(data), 'utf8');
    const head = Buffer.alloc(8);
    head.writeInt32LE(op, 0);
    head.writeInt32LE(json.length, 4);
    return Buffer.concat([head, json]);
}

module.exports = function startDiscord({ setting, onSettingsChange, activeAccount, kingOfMine, startedAt }) {
    if (!CLIENT_ID) { console.log('[dcf] Discord: keine Client-ID eingetragen — Rich Presence aus'); return { configured: false }; }
    let sock = null, ready = false, connecting = false, lastSent = null, retryAt = 0;

    function close() {
        if (sock) { try { sock.destroy(); } catch {} }
        sock = null; ready = false; connecting = false; lastSent = null;
    }

    function connect() {
        if (connecting || sock || Date.now() < retryAt) return;
        const paths = socketPaths();
        if (!paths.length) { retryAt = Date.now() + RETRY_MS; return; }
        connecting = true;
        const tryNext = (i) => {
            if (i >= paths.length) { connecting = false; retryAt = Date.now() + RETRY_MS; return; }
            const s = net.createConnection(paths[i]);
            s.once('error', () => { s.destroy(); tryNext(i + 1); });
            s.once('connect', () => {
                s.removeAllListeners('error');
                sock = s; connecting = false;
                s.on('error', () => {});
                s.on('close', () => { if (sock === s) { close(); retryAt = Date.now() + RETRY_MS; } });
                let buf = Buffer.alloc(0);
                s.on('data', (chunk) => {
                    buf = Buffer.concat([buf, chunk]);
                    while (buf.length >= 8) {
                        const len = buf.readInt32LE(4);
                        if (buf.length < 8 + len) break;
                        let msg = null;
                        try { msg = JSON.parse(buf.slice(8, 8 + len).toString('utf8')); } catch {}
                        buf = buf.slice(8 + len);
                        if (msg && msg.evt === 'READY') { ready = true; console.log('[dcf] Discord verbunden'); update(); }
                        else if (msg && msg.evt === 'ERROR') console.warn(`[dcf] Discord: ${msg.data && msg.data.message}`);
                    }
                });
                s.write(frame(0, { v: 1, client_id: CLIENT_ID }));
            });
        };
        tryNext(0);
    }

    function activity() {
        const acc = setting('discord.showAccount') ? activeAccount() : null;
        const king = setting('discord.showKing') ? kingOfMine() : null;
        const a = {
            type: 0,
            timestamps: { start: Math.floor(startedAt / 1000) },
            assets: { large_image: 'logo', large_text: 'DreamingCrownfall' },
            buttons: [{ label: 'Play Marble Crownfall', url: 'https://marblecrownfall.com/' }],
        };
        if (acc) a.details = `as ${acc}`.slice(0, 128);
        if (king) {
            const min = Math.max(1, Math.round((Date.now() - king.since) / 60000));
            a.state = `👑 ${king.name ? king.name + ' is ' : ''}King for ${min} min`.slice(0, 128);
        }
        return a;
    }

    function send(act) {
        if (!sock || !ready) return;
        const key = JSON.stringify(act);
        if (key === lastSent) return;
        lastSent = key;
        sock.write(frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: act }, nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}` }));
    }

    function update() {
        if (!setting('discord.enabled')) {
            if (sock && ready) send(null);
            if (sock) setTimeout(close, 300); // erst die leere Anzeige raus, dann zu
            return;
        }
        if (!sock) return connect();
        send(activity());
    }

    onSettingsChange(() => update());
    setInterval(update, TICK_MS);
    update();
    return { configured: true, update };
};
