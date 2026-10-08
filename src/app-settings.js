// Einstellungen, die der App gehören und nicht dem Spiel: Benachrichtigungen, Discord, Autostart.
// Gespeichert in <Profil>/app-settings.json. Die Settings-Oberfläche im Spiel liest und schreibt sie
// über die Brücke im Preload (window.dcfApp); hier wird jeder Schreibzugriff gegen SCHEMA geprüft,
// damit die Seite nichts anderes ändern kann als diese Schalter.

const fs = require('fs');
const path = require('path');
const { app, ipcMain, webContents } = require('electron');
const autostart = require('./autostart.js');

// Nur Ja/Nein-Schalter; Pfad = Schlüssel in der Datei.
const SCHEMA = {
    'notify.enabled': true,
    'notify.onlyWhenAway': true,
    'notify.mention': true,
    'notify.king': true,
    'notify.celebration': true,
    'notify.rebellion': true,
    'notify.achievement': true,
    'notify.gift': true,
    'notify.shopQuest': true,
    'discord.enabled': false,
    'discord.showAccount': true,
    'discord.showKing': true,
};

const file = () => path.join(app.getPath('userData'), 'app-settings.json');
let values = null;
const listeners = [];

function load() {
    let stored = {};
    try { stored = JSON.parse(fs.readFileSync(file(), 'utf8')) || {}; } catch {}
    values = {};
    for (const [k, def] of Object.entries(SCHEMA)) values[k] = typeof stored[k] === 'boolean' ? stored[k] : def;
}
function save() {
    try { fs.writeFileSync(file(), JSON.stringify(values, null, 2)); }
    catch (e) { console.error(`[dcf] app-settings.json nicht schreibbar: ${e.message}`); }
}

function snapshot() {
    return { ...values, 'app.autostart': autostart.enabled(), 'app.version': app.getVersion(), 'app.platform': process.platform };
}

function broadcast() {
    const s = snapshot();
    for (const wc of webContents.getAllWebContents()) {
        if (!wc.isDestroyed()) wc.send('dcf:settings:changed', s);
    }
    for (const cb of listeners) { try { cb(values); } catch (e) { console.error(`[dcf] Einstellungs-Horcher: ${e.message}`); } }
}

module.exports = {
    init() {
        load();
        ipcMain.on('dcf:settings:get', (e) => { e.returnValue = snapshot(); });
        ipcMain.on('dcf:settings:set', (_e, key, value) => {
            if (key === 'app.autostart' && typeof value === 'boolean') {
                try { autostart.set(value); } catch (err) { console.error(`[dcf] Autostart: ${err.message}`); }
                broadcast();
                return;
            }
            if (!(key in SCHEMA) || typeof value !== 'boolean' || values[key] === value) return;
            values[key] = value;
            save();
            broadcast();
        });
    },
    get: (key) => values[key],
    onChange: (cb) => listeners.push(cb),
    // Für das Tray-Menü, damit beide Stellen dasselbe zeigen.
    setAutostart(on) { autostart.set(on); broadcast(); },
};
