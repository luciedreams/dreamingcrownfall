// Rechtsklickmenü der Spielseiten (seit 0.7.0, Luces Liste vom 17.10.): der Hauptprozess entscheidet,
// was hineingehört, die Seite zeichnet es (preload.js, installContextMenu) und meldet nur die Nummer des
// angeklickten Eintrags zurück — was ein Eintrag tut (Text kopieren, Link öffnen), steht hier und
// kann von der Seite nicht verändert werden.
//   Eingabefeld     Cut · Copy · Paste · Select all
//   Markierter Text Copy
//   Spielername     Copy name · Twitch profile
//   Link            Open in browser · Copy link
//   sonst           Reload this tab · HUD · Settings

const { ipcMain, clipboard, shell, Menu } = require('electron');

const TWITCH_NAME = /^[A-Za-z0-9_]{4,25}$/;
const info = new Map();   // webContents-ID → { player } aus der Seite (kommt vor 'context-menu')
const shown = new Map();  // webContents-ID → zuletzt gezeigte Einträge

module.exports = function startContextMenu({ toggleHud, hudOpen, openSettings, sound = () => {} }) {
    ipcMain.on('dcf:ctx:info', (e, i) => { info.set(e.sender.id, i && typeof i === 'object' ? i : {}); e.returnValue = true; });
    ipcMain.on('dcf:ctx:act', (e, index) => {
        const it = shown.get(e.sender.id)?.[Number(index)];
        shown.delete(e.sender.id);
        if (it && !it.disabled && it.run) { sound('select'); it.run(e.sender); }
    });

    function build(wc, p) {
        const items = [];
        const sep = () => { if (items.length && items[items.length - 1].type !== 'sep') items.push({ type: 'sep' }); };
        const player = info.get(wc.id)?.player || null;
        info.delete(wc.id);
        const f = p.editFlags || {};
        if (p.isEditable) {
            items.push(
                { label: 'Cut', hint: 'Ctrl+X', disabled: !f.canCut, run: (w) => w.cut() },
                { label: 'Copy', hint: 'Ctrl+C', disabled: !f.canCopy, run: (w) => w.copy() },
                { label: 'Paste', hint: 'Ctrl+V', disabled: !f.canPaste, run: (w) => w.paste() },
                { label: 'Select all', hint: 'Ctrl+A', run: (w) => w.selectAll() },
            );
        } else if ((p.selectionText || '').trim()) {
            items.push({ label: 'Copy', hint: 'Ctrl+C', run: (w) => w.copy() });
        }
        if (player) {
            sep();
            items.push({ type: 'head', label: player });
            items.push({ label: 'Copy name', run: () => clipboard.writeText(player) });
            if (TWITCH_NAME.test(player)) items.push({ label: 'Twitch profile', hint: 'in your browser', run: () => shell.openExternal(`https://www.twitch.tv/${player}`) });
        }
        const link = p.linkURL || '';
        if (/^https?:\/\//i.test(link)) {
            sep();
            items.push({ label: 'Open link in browser', run: () => shell.openExternal(link) });
            items.push({ label: 'Copy link', run: () => clipboard.writeText(link) });
        }
        if (!items.length) {
            items.push(
                { label: 'Reload this tab', hint: 'F5', run: (w) => w.reload() },
                { label: hudOpen() ? 'Close the HUD' : 'Open the HUD', hint: 'F2', run: () => toggleHud() },
                { label: 'Settings', hint: 'Ctrl+,', run: () => openSettings() },
            );
        }
        return items;
    }

    return {
        // Menü eines Account-Rahmens der Leiste: im sichtbaren Spiel-Tab ganz oben an x zeichnen.
        // Steht Home oder Stats vorn (kein Menü-Zeichner), ein schlichtes System-Menü.
        showFrameMenu({ target, x, title, items }) {
            const list = [{ type: 'head', label: title }, ...items];
            if (target && !target.isDestroyed()) {
                shown.set(target.id, list);
                sound('open');
                target.send('dcf:ctx:show', { x, y: 2, items: list.map(({ run, ...rest }) => rest) });
                return;
            }
            Menu.buildFromTemplate(list.map((it) => (it.type === 'sep' ? { type: 'separator' } : it.type === 'head'
                ? { label: it.label, enabled: false } : { label: it.label, click: () => it.run() }))).popup();
        },
        // Für jede Spielseite (Tabs und ausgekoppelte Fenster), aus main.js wireGameContents.
        attach(wc) {
            wc.on('context-menu', (_e, p) => {
                const items = build(wc, p);
                if (!items.length) return;
                shown.set(wc.id, items);
                sound('open');
                wc.send('dcf:ctx:show', { x: p.x, y: p.y, items: items.map(({ run, ...rest }) => rest) });
            });
            wc.once('destroyed', () => { info.delete(wc.id); shown.delete(wc.id); });
        },
    };
};
