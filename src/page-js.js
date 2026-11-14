// Code im Seitenkontext eines Spiel-Tabs ausführen, auch solange die Seite noch „lädt“.
//
// wc.executeJavaScript wartet, bis das load-Ereignis da ist. Hängen Spiel-APIs, belegen sie alle sechs
// HTTP/1.1-Verbindungen der Partition, Bilder bleiben in der Schlange und das load-Ereignis kommt nie
// (gemessen 14.11.2026). Dann blieben Ladebildschirm, Account-Rahmen (Quests/Earning „…“), HUD, Home und
// Benachrichtigungen stehen, obwohl das Spiel längst lief. wc.mainFrame.executeJavaScript antwortet sofort.
// Die Grenze von 30 s fängt Abrufe auf, die der Server gar nicht beantwortet.

const TIMEOUT_MS = 30000;

// Gibt es eine Seite, in der man etwas ausführen kann? (Nicht: ist sie fertig geladen.)
function pageUp(wc) {
    try { return !!wc && !wc.isDestroyed() && !!wc.mainFrame && !!wc.getURL(); } catch { return false; }
}

function runInPage(wc, js, ms = TIMEOUT_MS) {
    if (!pageUp(wc)) return Promise.resolve(null);
    let timer;
    let run;
    try { run = wc.mainFrame.executeJavaScript(js, false).catch(() => null); } catch { return Promise.resolve(null); }
    return Promise.race([run, new Promise((r) => { timer = setTimeout(() => r(null), ms); })])
        .finally(() => clearTimeout(timer));
}

// Neue Werte über die alten legen; null heißt „diesmal nicht bekommen“ und lässt den alten Wert stehen
// (ein 5xx von /api/dailies löschte sonst den Quest-Stand im Rahmen).
function keepKnown(prev, next) {
    const out = { ...(prev || {}) };
    for (const [k, val] of Object.entries(next || {})) if (val != null || !(k in out)) out[k] = val;
    return out;
}

module.exports = { pageUp, runInPage, keepKnown };
