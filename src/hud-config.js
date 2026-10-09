// Wie das HUD aussieht und was es zeigt — jede Person stellt es sich selbst zusammen
// (Settings › HUD). Gespeichert in <Profil>/hud.json; jeder Schreibzugriff aus der Seite wird
// hier gegen die festen Bausteine und Werte geprüft.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Reihenfolge = Standard-Reihenfolge; on = Standard an.
const ITEMS = [
    { id: 'king', on: true },        // King + Thron-Zeit
    { id: 'rc', on: true },          // Royal Celebration
    { id: 'tickets', on: true },     // Tickets aller Accounts
    { id: 'ticketsPer', on: false }, // Tickets je Account
    { id: 'earning', on: false },    // wie viele Accounts gerade Tickets verdienen
    { id: 'money', on: false },      // Gold und Diamanten aller Accounts
    { id: 'claim', on: true },       // Abholbares (Quest-Belohnungen + Daily Items)
    { id: 'clock', on: false },      // Uhr
];
const CHOICES = { layout: ['bar', 'column'], size: ['s', 'm', 'l'], style: ['app', 'dark', 'glass'] };
const DEFAULTS = { items: ITEMS.map(({ id, on }) => ({ id, on })), layout: 'bar', size: 'm', style: 'app', opacity: 92 };

const file = () => path.join(app.getPath('userData'), 'hud.json');
let cfg = null;

function clean(c) {
    const out = { ...DEFAULTS, items: [] };
    const known = new Set(ITEMS.map((i) => i.id));
    const seen = new Set();
    for (const it of Array.isArray(c?.items) ? c.items : []) {
        if (!it || !known.has(it.id) || seen.has(it.id)) continue;
        seen.add(it.id);
        out.items.push({ id: it.id, on: it.on === true });
    }
    // Neue Bausteine späterer Versionen hinten anhängen, mit ihrem Standard.
    for (const it of ITEMS) if (!seen.has(it.id)) out.items.push({ id: it.id, on: it.on });
    for (const [k, list] of Object.entries(CHOICES)) out[k] = list.includes(c?.[k]) ? c[k] : DEFAULTS[k];
    const o = Math.round(Number(c?.opacity));
    out.opacity = o >= 30 && o <= 100 ? o : DEFAULTS.opacity;
    return out;
}

function get() {
    if (!cfg) {
        let stored = null;
        try { stored = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch {}
        cfg = clean(stored);
    }
    return cfg;
}
function set(c) {
    cfg = clean(c);
    try { fs.writeFileSync(file(), JSON.stringify(cfg, null, 2)); } catch (e) { console.error(`[dcf] hud.json nicht schreibbar: ${e.message}`); }
    return cfg;
}
const enabled = (id) => get().items.some((i) => i.id === id && i.on);

module.exports = { get, set, enabled, DEFAULTS };
