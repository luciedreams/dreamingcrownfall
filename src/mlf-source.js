// Woher die App MarbleLuceFall nimmt — unabhängig von App-Updates.
//
// Normalfall: die veröffentlichte Fassung von Greasy Fork (wie Tampermonkey), zwischengespeichert
// unter <userData>/mlf/, damit die App auch ohne Netz startet. Neue Versionen werden im
// Hintergrund geholt und gelten ab dem nächsten Laden eines Tabs.
// Entwicklung: MLF_SCRIPT=<pfad> hängt eine lokale Datei ein (wird bei jedem Abruf neu gelesen).

const fs = require('fs');
const path = require('path');

const SCRIPT_URL = 'https://update.greasyfork.org/scripts/595115/MarbleLuceFall.user.js';
const META_URL = 'https://update.greasyfork.org/scripts/595115/MarbleLuceFall.meta.js';
const CHECK_MS = 30 * 60 * 1000;

const versionOf = (code) => (String(code).match(/^\/\/ @version\s+(\S+)/m) || [])[1] || null;

// 6.59.1 > 6.59 > 6.58.2 — fehlende Stellen zählen als 0.
function newer(a, b) {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x !== y) return x > y;
    }
    return false;
}

async function fetchText(url, timeoutMs = 15000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
        const r = await fetch(`${url}?nc=${Date.now()}`, { signal: ctl.signal, cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.text();
    } finally { clearTimeout(t); }
}

module.exports = function createMlfSource({ userData, onUpdate }) {
    const dir = path.join(userData, 'mlf');
    const file = path.join(dir, 'MarbleLuceFall.user.js');
    const local = process.env.MLF_SCRIPT ? path.resolve(process.env.MLF_SCRIPT) : null;
    let current = null; // { code, version, source }

    function readCache() {
        try {
            const code = fs.readFileSync(file, 'utf8');
            const version = versionOf(code);
            if (version) return { code, version, source: 'greasyfork' };
        } catch {}
        return null;
    }

    function get() {
        if (local) {
            try {
                const code = fs.readFileSync(local, 'utf8');
                return { code, version: versionOf(code) || '?', source: 'lokal' };
            } catch (e) {
                console.error(`[mlf-app] MLF_SCRIPT nicht lesbar (${local}): ${e.message}`);
                return null;
            }
        }
        return current;
    }

    // Holt die neueste Fassung, wenn sie neuer ist als die gespeicherte. true = neu geladen.
    async function update() {
        if (local) return false;
        const meta = await fetchText(META_URL);
        const latest = versionOf(meta);
        if (!latest) throw new Error('keine @version in meta.js');
        if (current && !newer(latest, current.version)) return false;
        const code = await fetchText(SCRIPT_URL, 60000);
        const version = versionOf(code);
        if (!/==UserScript==/.test(code) || !version) throw new Error('Antwort ist kein Userscript');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file + '.tmp', code);
        fs.renameSync(file + '.tmp', file); // nie eine halbe Datei im Cache
        const before = current?.version || null;
        current = { code, version, source: 'greasyfork' };
        console.log(`[mlf-app] MarbleLuceFall ${version} von Greasy Fork geladen${before ? ` (vorher ${before})` : ''}`);
        if (before) onUpdate?.(version, before);
        return true;
    }

    // Start: Cache sofort benutzen; ohne Cache auf den ersten Abruf warten.
    async function init() {
        if (local) {
            const s = get();
            console.log(`[mlf-app] MarbleLuceFall ${s?.version || '?'} aus ${local} (lokal)`);
            return;
        }
        current = readCache();
        if (current) {
            console.log(`[mlf-app] MarbleLuceFall ${current.version} aus dem Zwischenspeicher`);
            update().catch((e) => console.warn(`[mlf-app] Update-Prüfung fehlgeschlagen: ${e.message}`));
        } else {
            try { await update(); }
            catch (e) { console.error(`[mlf-app] MarbleLuceFall nicht ladbar (${e.message}) — Spiel läuft ohne MLF`); }
        }
        setInterval(() => update().catch((e) => console.warn(`[mlf-app] Update-Prüfung fehlgeschlagen: ${e.message}`)), CHECK_MS);
    }

    return { init, get, update };
};
