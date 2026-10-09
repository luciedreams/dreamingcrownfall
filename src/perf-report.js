// Performance-Bericht (Settings › About): 10 s CPU-Profil des Tabs über das DevTools-Protokoll,
// dazu Bildrate, Auslastung des Haupt-Threads und das System. Gedacht für den Entwickler des
// Spiels: zeigt, welche Funktionen des Spiels die Zeit brauchen. Zwei Dateien unter
// <Profil>/reports/: .txt zum Lesen, .cpuprofile zum Öffnen in den Chrome-DevTools (Performance).
// Entsteht nur auf Knopfdruck; nichts wird verschickt.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, ipcMain, shell } = require('electron');

const SECONDS = 10;
let busy = false;

// Im Seitenkontext: Abstände der Bilder messen. Endet auch, wenn der Tab versteckt ist (kein rAF).
const FRAMES_JS = (secs) => `new Promise((done) => {
    const ts = [], end = performance.now() + ${secs * 1000};
    const finish = () => done({ ts, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, hidden: document.hidden,
        scripts: [...document.scripts].map((s) => s.src).filter(Boolean) });
    const f = (t) => { ts.push(t); if (t < end) requestAnimationFrame(f); else finish(); };
    requestAnimationFrame(f);
    setTimeout(finish, ${secs * 1000 + 1500});
})`;

const pct = (part, whole) => (whole ? (part / whole * 100).toFixed(1) : '0.0').padStart(5) + ' %';
const shortSrc = (url) => url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');

function summarize({ profile, m0, m1, frames, secs }) {
    // Selbstzeit je Knoten, dann jedem Knoten seinen Verursacher geben: eingebaute Funktionen
    // (getBoundingClientRect, setAttribute …) haben keine Quelle und zählen für ihren Aufrufer.
    const self = {};
    profile.samples.forEach((id, i) => { self[id] = (self[id] || 0) + (profile.timeDeltas[i] || 0); });
    const node = Object.fromEntries(profile.nodes.map((n) => [n.id, n]));
    const parent = {};
    for (const n of profile.nodes) for (const c of n.children || []) parent[c] = n.id;
    const owner = (n) => {
        for (let x = n; x; x = node[parent[x.id]]) {
            const cf = x.callFrame;
            if (cf.url) return /^https:\/\/([a-z0-9-]+\.)*marblecrownfall\.com\//.test(cf.url) ? 'Game' : 'Other pages';
            // Die Spiel-Ebene läuft über new Function: Quelltext ohne URL.
            if (cf.lineNumber >= 0 && !cf.functionName.startsWith('(')) return 'DreamingCrownfall layer';
        }
        const f = n.callFrame.functionName;
        return { '(program)': 'Browser internals (style, layout, paint)', '(idle)': 'Idle', '(garbage collector)': 'Garbage collector' }[f] || f || 'Other';
    };
    let total = 0;
    const byOwner = {}, bySource = {}, byFn = {};
    for (const n of profile.nodes) {
        const us = self[n.id] || 0;
        if (!us) continue;
        total += us;
        const o = owner(n);
        byOwner[o] = (byOwner[o] || 0) + us;
        const cf = n.callFrame;
        if (cf.url) {
            const s = shortSrc(cf.url);
            bySource[s] = (bySource[s] || 0) + us;
        }
        if (o === 'Game') {
            const where = (c) => `${shortSrc(c.url).split('/').pop()}:${c.lineNumber + 1}`;
            let k = `${cf.functionName || '(anonymous)'}  ${cf.url ? where(cf) : ''}`;
            if (!cf.url) {
                // Eingebaut (getBoundingClientRect …): wer im Spiel hat es aufgerufen?
                let c = node[parent[n.id]];
                while (c && !c.callFrame.url) c = node[parent[c.id]];
                if (c) k += `← ${c.callFrame.functionName || '(anonymous)'} ${where(c.callFrame)}`;
            }
            byFn[k] = (byFn[k] || 0) + us;
        }
    }
    const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${pct(v, total)}  ${k}`);

    const d = frames.ts.slice(1).map((t, i) => t - frames.ts[i]).sort((a, b) => a - b);
    const q = (p) => (d.length ? d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1) : '–');
    const busyOf = (k) => pct((m1[k] || 0) - (m0[k] || 0), secs);
    const perSec = (k) => (((m1[k] || 0) - (m0[k] || 0)) / secs).toFixed(0);
    const build = (frames.scripts.map((s) => s.match(/immutable-assets\/([0-9a-f]+)\//)).find(Boolean) || [])[1] || 'unknown';
    const gpu = app.getGPUFeatureStatus();

    return [
        'DreamingCrownfall performance report',
        `Recorded   ${new Date().toISOString()} · ${secs} s`,
        `App        ${app.getVersion()} · Electron ${process.versions.electron} · Chromium ${process.versions.chrome}`,
        `System     ${process.platform} ${os.release()} · ${os.cpus()[0]?.model || 'CPU'} × ${os.cpus().length} · ${Math.round(os.totalmem() / 2 ** 30)} GB`,
        `GPU        compositing ${gpu.gpu_compositing}, rasterization ${gpu.rasterization}, webgl ${gpu.webgl}`,
        `Game       build ${build} · view ${frames.w}×${frames.h} @ ${frames.dpr}x${frames.hidden ? ' · TAB WAS HIDDEN (no frames drawn)' : ''}`,
        '',
        '== Frames',
        `${(d.length / secs).toFixed(1)} fps · frame time median ${q(0.5)} ms · p95 ${q(0.95)} ms · max ${q(1)} ms · ${d.filter((x) => x > 20).length} of ${d.length} frames over 20 ms`,
        '',
        '== Main thread',
        `busy ${busyOf('TaskDuration')} · script ${busyOf('ScriptDuration')} · layout ${busyOf('LayoutDuration')} · style ${busyOf('RecalcStyleDuration')}`,
        `${perSec('LayoutCount')} layouts/s · ${perSec('RecalcStyleCount')} style recalcs/s · ${m1.Nodes} DOM nodes · JS heap ${((m1.JSHeapUsedSize || 0) / 1e6).toFixed(0)} MB`,
        '',
        '== Who used the main thread',
        ...top(byOwner, 8),
        '',
        '== Scripts by self time',
        ...top(bySource, 15),
        '',
        '== Game functions by time (built-in calls with the game function that made them)',
        ...top(byFn, 30),
        '',
    ].join('\n');
}

async function record(wc) {
    const dbg = wc.debugger;
    try { dbg.attach('1.3'); }
    catch { throw new Error('The DevTools are open on this tab. Close them (F12) and try again.'); }
    const send = (m, p) => dbg.sendCommand(m, p);
    const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    try {
        await send('Performance.enable');
        await send('Profiler.enable');
        await send('Profiler.setSamplingInterval', { interval: 500 });
        const m0 = await metrics();
        await send('Profiler.start');
        const frames = await wc.executeJavaScript(FRAMES_JS(SECONDS));
        const { profile } = await send('Profiler.stop');
        const m1 = await metrics();

        const dir = path.join(app.getPath('userData'), 'reports');
        fs.mkdirSync(dir, { recursive: true });
        const t = new Date(), two = (x) => String(x).padStart(2, '0');
        const stamp = `${t.getFullYear()}-${two(t.getMonth() + 1)}-${two(t.getDate())}_${two(t.getHours())}-${two(t.getMinutes())}-${two(t.getSeconds())}`;
        const base = path.join(dir, `performance-${stamp}`);
        fs.writeFileSync(`${base}.txt`, summarize({ profile, m0, m1, frames, secs: SECONDS }));
        fs.writeFileSync(`${base}.cpuprofile`, JSON.stringify(profile));
        console.log(`[dcf] Performance-Bericht: ${base}.txt`);
        return `${base}.txt`;
    } finally {
        try { dbg.detach(); } catch {}
    }
}

module.exports = function initPerfReport() {
    ipcMain.handle('dcf:perf:report', async (e) => {
        if (busy) return { ok: false, why: 'A report is being recorded already.' };
        busy = true;
        try {
            const file = await record(e.sender);
            shell.showItemInFolder(file);
            return { ok: true, file };
        } catch (err) {
            console.error(`[dcf] Performance-Bericht: ${err.message}`);
            return { ok: false, why: err.message };
        } finally {
            busy = false;
        }
    });
};
