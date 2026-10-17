// Einstellungen, die der App gehören und nicht dem Spiel: Fenster, Benachrichtigungen, Discord, Autostart.
// Gespeichert in <Profil>/app-settings.json. Die Settings-Oberfläche im Spiel liest und schreibt sie
// über die Brücke im Preload (window.dcfApp); hier wird jeder Schreibzugriff gegen SCHEMA geprüft,
// damit die Seite nichts anderes ändern kann als diese Schalter.

const fs = require('fs');
const path = require('path');
const { app, ipcMain, webContents } = require('electron');
const autostart = require('./autostart.js');

// Ja/Nein-Schalter, dazu wenige Zahlen mit festem Bereich (RANGES); Pfad = Schlüssel in der Datei.
const SCHEMA = {
    'app.onboarded': false,   // Willkommen-Schritte erledigt (bestehende Installationen: main.js setzt es)
    'game.plain': false,      // Spiel-Ebene startet wie die Website (neue Installationen ab 0.3.0)
    'windows.popOut': true,
    'ui.transitions': true,   // Überblenden beim Wechsel zwischen Accounts, Home und Stats (overlay.js)
    'stability.recover': true,
    'shortcuts.global': false,
    'autostart.hidden': true,   // Autostart im Tray (sonst mit sichtbarem Fenster)
    'notify.enabled': true,
    'notify.onlyWhenAway': true,
    'notify.mention': true,
    'notify.king': true,
    'notify.celebration': true,
    'notify.rebellion': true,
    'notify.achievement': true,
    'notify.gift': true,
    'notify.shopQuest': true,
    // Unattended Viewing Mode des Spiels (v0.10.6b): Diamanten-Popup schließt selbst. Das Spiel merkt es
    // sich je Tab (localStorage der Partition) — hier EIN Wert für alle Accounts, jeder Tab gleicht ab.
    'notify.unattended': false,
    'notify.unattendedSeconds': 20,
    'discord.enabled': false,
    'discord.showAccount': true,
    'discord.showKing': true,
    // Öffentliche MarbleMind-Statistik: Tab „Stats“, „Today“ auf Home, Bausteine im HUD (stats.js). Opt-in.
    'stats.enabled': false,
};

const RANGES = { 'notify.unattendedSeconds': [10, 60] };
// Gleicher Typ wie der Vorgabewert; Zahlen nur ganz und im Bereich.
function valid(key, value) {
    if (!(key in SCHEMA) || typeof value !== typeof SCHEMA[key]) return false;
    if (typeof value !== 'number') return true;
    const [min, max] = RANGES[key] || [];
    return Number.isInteger(value) && value >= min && value <= max;
}

const file = () => path.join(app.getPath('userData'), 'app-settings.json');
let values = null;
const listeners = [];

function load() {
    let stored = {};
    try { stored = JSON.parse(fs.readFileSync(file(), 'utf8')) || {}; } catch {}
    values = {};
    for (const [k, def] of Object.entries(SCHEMA)) values[k] = valid(k, stored[k]) ? stored[k] : def;
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
                try { autostart.set(value, values['autostart.hidden'] !== false); } catch (err) { console.error(`[dcf] Autostart: ${err.message}`); }
                broadcast();
                return;
            }
            if (!valid(key, value) || values[key] === value) return;
            values[key] = value;
            save();
            // Tray oder sichtbar umgestellt: einen bestehenden Autostart-Eintrag gleich neu schreiben.
            if (key === 'autostart.hidden' && autostart.enabled()) {
                try { autostart.set(true, value); } catch (err) { console.error(`[dcf] Autostart: ${err.message}`); }
            }
            broadcast();
        });
    },
    get: (key) => values[key],
    // Für den Hauptprozess (Erststart): wie ein Schalter aus der Seite, gleiche Prüfung.
    set(key, value) {
        if (!valid(key, value) || values[key] === value) return;
        values[key] = value;
        save();
        broadcast();
    },
    onChange: (cb) => listeners.push(cb),
    // Für das Tray-Menü, damit beide Stellen dasselbe zeigen.
    setAutostart(on) { autostart.set(on, values['autostart.hidden'] !== false); broadcast(); },
};
