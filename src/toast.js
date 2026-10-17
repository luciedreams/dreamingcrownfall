// Toasts im Spiel (seit 0.7.0, Luces Wahl vom 17.10.: oben mittig, und nur solange die App vorn ist —
// sonst wie bisher die System-Benachrichtigung, notify.js). Gezeichnet in der Ansicht, die gerade vorn
// steht (Spiel-Tab, Home, Stats, Wiki), in einer eigenen isolierten Welt mit Shadow-Root. Farben aus
// dem Spiel-Layout (--gl-*), ohne es die der App. Mehrere stapeln sich nach unten, jeder geht nach
// 6 s; ein Klick springt zum Account, um den es geht (onClick).

const WORLD = 1719;

function PAGE() {
    if (window.__dcfToast) return;
    const CSS = `
        :host { all: initial; }
        .stack { position: fixed; top: 60px; left: 50%; transform: translateX(-50%); z-index: 2147483600; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
        .t { pointer-events: auto; display: flex; align-items: center; gap: 12px; min-width: 280px; max-width: 520px; padding: 10px 16px 10px 10px; box-sizing: border-box; cursor: pointer;
             border-radius: 14px; background: linear-gradient(180deg, rgba(var(--gl-panel, 36, 26, 58), .97), rgba(var(--gl-panel, 22, 15, 36), .97));
             border: 1px solid rgba(var(--gl-accent, 255, 211, 110), .55); box-shadow: 0 0 24px rgba(var(--gl-accent, 255, 211, 110), .2), 0 12px 30px rgba(0, 0, 0, .5);
             font: 600 13px/1.3 system-ui, sans-serif; color: rgb(var(--gl-text, 236, 228, 247)); user-select: none;
             opacity: 0; transform: translateY(-8px); transition: opacity .2s ease-out, transform .2s ease-out; }
        .t.on { opacity: 1; transform: none; }
        .t.off { opacity: 0; transform: translateY(-6px); transition-duration: .3s; }
        .ic { width: 38px; height: 38px; flex: none; border-radius: 10px; display: grid; place-items: center; font-size: 20px;
              background: radial-gradient(circle at 50% 30%, rgba(var(--gl-accent, 255, 211, 110), .9), rgba(var(--gl-accent, 255, 211, 110), .35)); }
        .tx { min-width: 0; }
        .k { display: block; color: rgb(var(--gl-accent, 255, 211, 110)); font-size: 10.5px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 2px; }
        .h { display: block; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .b { display: block; opacity: .75; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (prefers-reduced-motion: reduce) { .t, .t.off { transition: none; } }`;
    let host = null, stack = null;
    function ensure() {
        if (host && host.isConnected) return;
        host = document.createElement('dcf-toasts');
        const sh = host.attachShadow({ mode: 'closed' });
        const st = document.createElement('style');
        st.textContent = CSS;
        stack = document.createElement('div');
        stack.className = 'stack';
        sh.append(st, stack);
        (document.body || document.documentElement).appendChild(host);
    }
    const el = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
    window.__dcfToast = {
        // t: { icon, kicker, title, body } → Promise: 'click' oder null (abgelaufen)
        show(t) {
            ensure();
            return new Promise((resolve) => {
                const box = el('div', 't');
                const tx = el('span', 'tx');
                tx.append(el('span', 'k', t.kicker || ''), el('span', 'h', t.title || ''));
                if (t.body) tx.append(el('span', 'b', t.body));
                box.append(el('span', 'ic', t.icon || '🔔'), tx);
                while (stack.children.length >= 4) stack.firstElementChild.remove();
                stack.append(box);
                requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('on')));
                let done = false;
                const finish = (how) => {
                    if (done) return;
                    done = true;
                    box.classList.add('off');
                    setTimeout(() => box.remove(), 320);
                    resolve(how);
                };
                box.addEventListener('click', () => finish('click'));
                // Unter der Maus bleibt er stehen, danach geht er.
                let timer = setTimeout(() => finish(null), 6000);
                box.addEventListener('mouseenter', () => clearTimeout(timer));
                box.addEventListener('mouseleave', () => { timer = setTimeout(() => finish(null), 2500); });
            });
        },
    };
}
const PAGE_CODE = `(${PAGE.toString()})()`;

// Aus dem Titel der Benachrichtigung („🏅 dreaminglucie: Long Live …“) Symbol und Text, dazu das Stichwort je Art.
const KICKER = { achievement: 'Achievement unlocked', gift: 'Gift', king: 'Throne', celebration: 'Royal Celebration',
    rebellion: 'Rebellion', mention: 'Mention', shopQuest: 'Shop quest' };
function parts(kind, title) {
    const m = /^(\p{Extended_Pictographic}(?:️)?)\s*(.*)$/u.exec(String(title || ''));
    return { icon: m ? m[1] : '🔔', title: m ? m[2] : String(title || ''), kicker: KICKER[kind] || 'DreamingCrownfall' };
}

module.exports = function createToasts({ front }) {
    return {
        // false, wenn nichts da ist, worin er erscheinen kann (dann bleibt es bei der System-Benachrichtigung).
        show({ kind, title, body }, onClick) {
            const wc = front();
            if (!wc || wc.isDestroyed()) return false;
            const t = { ...parts(kind, title), body: body || '' };
            wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: PAGE_CODE }])
                .then(() => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: `__dcfToast.show(${JSON.stringify(t)})` }]))
                .then((how) => { if (how === 'click' && onClick) onClick(); })
                .catch(() => {});
            return true;
        },
    };
};
