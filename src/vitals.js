// Stabilität: Tabs erholen sich selbst.
// - Wachhund: antwortet ein Tab 30 s nicht (eigener Herzschlag alle 5 s — Electrons 'unresponsive'
//   kommt nur bei unbeantworteten Eingaben, ein still hängender Hintergrund-Tab fiele nie auf)
//   oder stürzt sein Prozess ab, lädt er neu. Höchstens 3 Neustarts je Tab in 10 min, sonst bleibt er stehen (Absturzschleife).
// - Seite nicht ladbar (kein Netz beim Start, Server weg): neuer Versuch nach 10 s, 30 s, 60 s, …
// - Nach Standby (länger als 1 min) und nach einem Netzausfall (länger als 20 s) laden alle Tabs
//   einmal neu, damit Chat, Tickets und Socket nicht auf einer toten Verbindung sitzen bleiben.
// Alles hängt am App-Schalter 'stability.recover' (Settings › General).

const { powerMonitor, net } = require('electron');

const HANG_MS = 30 * 1000;
const CRASH_WINDOW_MS = 10 * 60 * 1000;
const CRASH_MAX = 3;
const RETRY_MS = [10, 30, 60, 120, 300].map((s) => s * 1000);
const SLEEP_MIN_MS = 60 * 1000;
const OFFLINE_MIN_MS = 20 * 1000;

module.exports = function startVitals({ views, setting, label }) {
    const on = () => setting('stability.recover') !== false;
    const name = (v) => (label ? label(v) : 'Tab');

    function reloadAll(why) {
        if (!on()) return;
        console.log(`[dcf] ${why}: alle Tabs neu laden`);
        for (const v of views) {
            const wc = v.view.webContents;
            if (!wc.isDestroyed()) wc.reload();
        }
    }

    function watch(v) {
        const wc = v.view.webContents;
        if (wc.__dcfVitals) return;
        wc.__dcfVitals = true;
        let retry = null, failures = 0;
        const restarts = [];

        // Neustart mit Bremse gegen Absturzschleifen.
        function restart(why) {
            if (!on() || wc.isDestroyed()) return;
            const now = Date.now();
            while (restarts.length && now - restarts[0] > CRASH_WINDOW_MS) restarts.shift();
            if (restarts.length >= CRASH_MAX) {
                console.error(`[dcf] ${name(v)}: ${why} — schon ${CRASH_MAX}× in 10 min neu gestartet, ich lasse ihn stehen`);
                return;
            }
            restarts.push(now);
            console.log(`[dcf] ${name(v)}: ${why} → neu laden`);
            wc.reload();
        }

        // Herzschlag: ein hängender Renderer beantwortet executeJavaScript nie.
        let asked = 0;
        const beat = setInterval(() => {
            if (!on() || wc.isDestroyed() || wc.isLoading() || wc.isCrashed()) { asked = 0; return; }
            if (asked) {
                if (Date.now() - asked > HANG_MS) {
                    // Ein hängender Prozess reagiert weder auf reload() noch auf forcefullyCrashRenderer()
                    // (gemessen: lief weiter, Tab blieb beim Laden stehen). Also hart beenden —
                    // 'render-process-gone' unten lädt dann neu und zählt es als Neustart.
                    asked = 0;
                    console.log(`[dcf] ${name(v)}: antwortet seit 30 s nicht → Prozess beenden`);
                    try { process.kill(wc.getOSProcessId(), 'SIGKILL'); } catch (e) { console.error(`[dcf] ${name(v)}: beenden ging nicht: ${e.message}`); }
                }
                return;
            }
            const t = asked = Date.now();
            wc.executeJavaScript('1').then(() => { if (asked === t) asked = 0; }, () => {});
        }, 5000);
        wc.on('render-process-gone', (_e, d) => {
            asked = 0;
            if (d.reason === 'clean-exit') return;
            restart(`Prozess weg (${d.reason}, Code ${d.exitCode})`);
        });
        wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
            // -3 = abgebrochen (eigene Navigation, Neuladen): kein Fehler.
            if (!isMainFrame || code === -3 || !on()) return;
            const wait = RETRY_MS[Math.min(failures, RETRY_MS.length - 1)];
            failures++;
            console.log(`[dcf] ${name(v)}: Laden fehlgeschlagen (${desc}) → neuer Versuch in ${wait / 1000} s`);
            clearTimeout(retry);
            retry = setTimeout(() => { if (!wc.isDestroyed()) wc.loadURL(url); }, wait);
        });
        wc.on('did-finish-load', () => { failures = 0; clearTimeout(retry); });
        wc.once('destroyed', () => { clearInterval(beat); clearTimeout(retry); });
    }

    // Standby: die Zeit zwischen suspend und resume zählt. Kurz warten, bis Netz und DNS wieder da sind.
    let suspendedAt = 0;
    powerMonitor.on('suspend', () => { suspendedAt = Date.now(); });
    powerMonitor.on('resume', () => {
        const slept = suspendedAt ? Date.now() - suspendedAt : Infinity;
        suspendedAt = 0;
        if (slept < SLEEP_MIN_MS) return;
        setTimeout(() => reloadAll(Number.isFinite(slept) ? `nach Standby (${Math.round(slept / 60000)} min)` : 'nach Standby'), 5000);
    });

    // Netzausfall: alle 5 s nachsehen; zurück nach mehr als 20 s offline → neu laden.
    let offlineSince = 0;
    setInterval(() => {
        const online = net.isOnline();
        if (!online && !offlineSince) offlineSince = Date.now();
        if (online && offlineSince) {
            const gone = Date.now() - offlineSince;
            offlineSince = 0;
            if (gone >= OFFLINE_MIN_MS) setTimeout(() => reloadAll(`Netz zurück nach ${Math.round(gone / 1000)} s`), 3000);
        }
    }, 5000).unref?.();

    for (const v of views) watch(v);
    return { watch };
};
