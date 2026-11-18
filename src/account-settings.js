// Einstellungen je Account sichern und in einen neuen Tab mitnehmen (seit 0.17.2).
//
// Die Einstellungen der Spiel-Ebene (mcf_overhaul_settings, Loadout-Leiste, Musik …) und die des
// Spiels selbst (Chat-Cosmetics, Ton …) liegen im localStorage der Spielseite, also in der Sitzung
// (Partition) des Account-Tabs. „Sign out and remove“ löscht diese Sitzung samt Speicher; wer sich
// danach neu anmeldet, z. B. damit das Spiel ein neues Twitch-Bild holt, stand wieder bei Null
// (CookingSum, 18.11.2026).
//
// Deshalb hebt die App den Seitenspeicher je Spieler-ID zusätzlich in <Profil>/account-settings/
// auf: bei jedem Laden des Tabs, alle 2 Minuten und direkt vor dem Entfernen. Jede Sicherung
// merkt sich, zu welchem Tab sie gehört. Meldet sich derselbe Account in einem ANDEREN Tab an (und
// sein alter Tab ist nicht mehr offen), wird die Sicherung dort eingespielt und der Tab einmal neu
// geladen. „Leer oder nicht“ taugt dafür nicht: ein frischer Tab schreibt sofort seine Standardwerte.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { runInPage } = require('./page-js.js');

const DIR = () => path.join(app.getPath('userData'), 'account-settings');
// Nur Zwischenspeicher, die sich von selbst neu füllen.
const SKIP = /^(dcf_tile_credits$|\/__mcfo-cache\/)/;
const MAX_VALUE = 256 * 1024;
const MAX_TOTAL = 2 * 1024 * 1024;
const EVERY_MS = 2 * 60 * 1000;

const fileOf = (pid) => path.join(DIR(), String(pid).replace(/[^\w.-]/g, '_') + '.json');
function readBackup(pid) {
    try { return JSON.parse(fs.readFileSync(fileOf(pid), 'utf8')); } catch { return null; }
}
function writeBackup(pid, data) {
    try {
        fs.mkdirSync(DIR(), { recursive: true });
        const f = fileOf(pid);
        fs.writeFileSync(f + '.tmp', JSON.stringify(data));
        fs.renameSync(f + '.tmp', f);
    } catch (e) { console.error(`[dcf] Einstellungen von ${pid} nicht gesichert: ${e.message}`); }
}
const onGame = (wc) => {
    try { const u = new URL(wc.getURL()); return u.protocol === 'https:' && u.hostname === 'marblecrownfall.com'; } catch { return false; }
};
const READ_JS = `(() => {
    const skip = ${SKIP}, out = {};
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k == null || skip.test(k)) continue;
        const v = localStorage.getItem(k);
        if (v == null || v.length > ${MAX_VALUE}) continue;
        total += k.length + v.length;
        if (total > ${MAX_TOTAL}) break;
        out[k] = v;
    }
    return out;
})()`;

module.exports = function startAccountSettings({ views }) {
    const saved = new Map();   // Tab -> zuletzt gesicherter Stand (JSON), um unnötiges Schreiben zu sparen
    const usable = (v) => v && v.playerId && !v.guest && !v.view.webContents.isDestroyed() && onGame(v.view.webContents);

    async function backup(v, ms) {
        if (!usable(v)) return;
        const pid = v.playerId;
        const data = await runInPage(v.view.webContents, READ_JS, ms);
        if (!data || typeof data !== 'object' || !Object.keys(data).length || v.playerId !== pid) return;
        const prev = readBackup(pid);
        if (prev && prev.partition !== v.acc.partition) return;   // gehört einem anderen Tab: das entscheidet check()
        const json = JSON.stringify(data);
        if (prev && saved.get(v) === json) return;
        saved.set(v, json);
        writeBackup(pid, { playerId: pid, name: v.name || '', partition: v.acc.partition, savedAt: new Date().toISOString(), storage: data });
    }

    // Der Tab kennt seinen Account (nach jedem Laden). Dieselbe Spieler-ID mit einer Sicherung aus einem
    // anderen, nicht mehr offenen Tab: Einstellungen übernehmen. Sonst nur sichern.
    async function check(v) {
        if (!usable(v)) return;
        const pid = v.playerId;
        const prev = readBackup(pid);
        if (prev && prev.partition !== v.acc.partition && prev.storage && typeof prev.storage === 'object') {
            // Ist der Account auch in seinem alten Tab noch offen, bleiben beide, wie sie sind.
            if (views.some((o) => o !== v && o.acc.partition === prev.partition)) return;
            const ok = await runInPage(v.view.webContents, `(() => {
                const s = ${JSON.stringify(prev.storage)};
                for (const k of Object.keys(s)) localStorage.setItem(k, s[k]);
                return true;
            })()`);
            if (ok !== true || v.playerId !== pid) return;
            writeBackup(pid, { ...prev, partition: v.acc.partition, restoredAt: new Date().toISOString() });
            saved.delete(v);
            console.log(`[dcf] Einstellungen von ${v.name || pid} in den neuen Tab übernommen (${Object.keys(prev.storage).length} Einträge vom ${prev.savedAt})`);
            v.view.webContents.reload();
            return;
        }
        await backup(v);
    }

    setInterval(() => { for (const v of views) backup(v).catch(() => {}); }, EVERY_MS);

    return {
        identity: (v) => { check(v).catch(() => {}); },
        // Vor „Sign out and remove“: den letzten Stand sichern, bevor die Sitzung gelöscht wird.
        beforeRemove: (v) => backup(v, 3000).catch(() => {}),
        forget: (v) => saved.delete(v),
    };
};
