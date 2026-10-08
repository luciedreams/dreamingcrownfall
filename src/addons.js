// Lokale Add-ons: jede .js-Datei in <Profil>/addons/ wird beim Start geladen und als Funktion mit
// der Add-on-Schnittstelle aufgerufen. Add-ons laufen im Hauptprozess mit vollen Rechten — sie
// sind für eigene Erweiterungen gedacht, die man selbst dort ablegt, nicht zum Verteilen.
// App-Updates lassen den Ordner unangetastet.
//
// Schnittstelle (api):
//   api.version                → App-Version
//   api.accounts()             → [{ partition, playerId, name, guest, session }] je Tab
//   api.onIdentity(cb)         → cb(account) wenn ein Tab (neu) weiß, wer eingeloggt ist
//   api.notify(title, body)    → Systembenachrichtigung
//   api.log(...) / api.warn(…) → Zeile im App-Log, mit Add-on-Namen davor

const fs = require('fs');
const path = require('path');
const { app, session, Notification } = require('electron');

module.exports = function loadAddons({ views, icon }) {
    const dir = path.join(app.getPath('userData'), 'addons');
    const identityHandlers = [];
    const account = (v) => ({
        partition: v.acc.partition, playerId: v.playerId, name: v.name, guest: v.guest,
        session: session.fromPartition(v.acc.partition),
    });

    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort(); } catch { /* kein Ordner = keine Add-ons */ }
    const loaded = [];
    for (const f of files) {
        const name = f.replace(/\.js$/, '');
        const api = {
            version: app.getVersion(),
            dir,
            accounts: () => views.map(account),
            onIdentity: (cb) => identityHandlers.push({ name, cb }),
            notify: (title, body) => { if (Notification.isSupported()) new Notification({ title, body, icon }).show(); },
            log: (...a) => console.log(`[addon:${name}]`, ...a),
            warn: (...a) => console.warn(`[addon:${name}]`, ...a),
        };
        try {
            const mod = require(path.join(dir, f));
            (typeof mod === 'function' ? mod : mod.default)(api);
            loaded.push(name);
        } catch (e) {
            console.error(`[mlf-app] Add-on ${f} nicht geladen: ${e.message}`);
        }
    }
    if (loaded.length) console.log(`[mlf-app] Add-ons: ${loaded.join(', ')}`);

    return {
        loaded,
        // Aus main.js, sobald refreshIdentity einen Tab kennt.
        identityChanged(v) {
            for (const { name, cb } of identityHandlers) {
                try { cb(account(v)); } catch (e) { console.error(`[addon:${name}] onIdentity: ${e.message}`); }
            }
        },
    };
};
