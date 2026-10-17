// Server-Wächter (seit 0.7.0): Ist ein Account-Tab nicht ins Spiel gekommen — keine Verbindung, Server
// antwortet mit 5xx (Wartung, Neustart nach einem Spiel-Update) oder die Seite bleibt hängen —, fragt
// die App alle 10 s bei /api/version nach. Antwortet das Spiel wieder, lädt sie jeden betroffenen Tab
// neu; vorher zeigte sie nach 20 s einfach die halbe Seite (leere blaue Tabs nach Wartungen) und
// versprach auf der Fehlerseite einen Neuversuch, den es nicht gab.
//
// Die Art des Ausfalls steht in v.failed.kind und bestimmt den Bildschirm (overlay.html):
//   maintenance  Server da, aber 5xx           → „Server maintenance“
//   offline      kein Netz / Name nicht auflösbar → „You're offline“
//   unreachable  sonst                          → „Can't reach Marble Crownfall“

const { net } = require('electron');

const PROBE_URL = 'https://marblecrownfall.com/api/version';
const EVERY_MS = 10000;
// Netzfehler, die auf die eigene Verbindung zeigen (net_error_list.h).
const OFFLINE_CODES = new Set([-106, -105, -137, -21, -100, -109]);

const kindOfLoadError = (code) => (OFFLINE_CODES.has(code) ? 'offline' : 'unreachable');
const kindOfStatus = (status) => (status >= 500 ? 'maintenance' : 'unreachable');

module.exports = function createServerWatch({ views, onBack, onTick }) {
    let timer = null, nextAt = 0, checking = false;

    async function probe() {
        try {
            const r = await net.fetch(PROBE_URL, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
            return { ok: r.ok, status: r.status };
        } catch {
            return { ok: false, status: 0 };
        }
    }

    function schedule() {
        clearTimeout(timer);
        timer = null;
        if (!views.some((v) => v.failed)) { nextAt = 0; return; }
        nextAt = Date.now() + EVERY_MS;
        timer = setTimeout(tick, EVERY_MS);
        onTick();
    }

    async function tick() {
        clearTimeout(timer);
        timer = null;
        if (checking) return;
        checking = true;
        nextAt = 0;
        onTick();
        const r = await probe();
        checking = false;
        if (r.ok) {
            const down = views.filter((v) => v.failed);
            if (down.length) console.log(`[dcf] Spiel antwortet wieder — ${down.length} Tab(s) neu laden`);
            onBack(down);
            nextAt = 0;
            onTick();
            return;
        }
        // Weiter unten: Art nachführen (aus „nicht erreichbar“ wird z. B. „Wartung“, sobald der Server 503 sagt).
        const kind = r.status ? kindOfStatus(r.status) : null;
        for (const v of views) if (v.failed && kind && v.failed.kind !== 'offline') v.failed.kind = kind;
        schedule();
    }

    return {
        kindOfLoadError,
        kindOfStatus,
        probe,
        // Ein Tab ist ausgefallen: Nachfragen anwerfen, falls nicht schon unterwegs.
        kick() { if (!timer && !checking) schedule(); },
        // „Try again now“
        now() { tick(); },
        state: () => ({ retryAt: nextAt, checking }),
    };
};
