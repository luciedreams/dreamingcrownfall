// Globale Tastenkürzel (wirken auch, wenn die App nicht vorne ist), Schalter 'shortcuts.global'.
// Standard aus: unter Wayland fragt der Desktop beim ersten Anmelden nach Erlaubnis (Portal),
// das soll niemand ungefragt beim ersten Start sehen. Kürzel innerhalb der App: main.js/handleKeys.

const { globalShortcut } = require('electron');

const KEYS = {
    toggle: 'CommandOrControl+Alt+M',  // Fenster zeigen/verstecken
    next: 'CommandOrControl+Alt+N',    // nächster Account
    chat: 'CommandOrControl+Alt+C',    // Chat fokussieren
};

module.exports = function startShortcuts({ setting, onSettingsChange, actions }) {
    let on = false;
    function apply() {
        const want = setting('shortcuts.global') === true;
        if (want === on) return;
        on = want;
        if (!want) { for (const k of Object.values(KEYS)) globalShortcut.unregister(k); return; }
        for (const [name, key] of Object.entries(KEYS)) {
            try {
                if (!globalShortcut.register(key, () => actions[name]())) console.error(`[dcf] Kürzel ${key} ist schon vergeben`);
            } catch (e) { console.error(`[dcf] Kürzel ${key}: ${e.message}`); }
        }
        console.log('[dcf] Globale Tastenkürzel an');
    }
    apply();
    onSettingsChange(apply);
    return { KEYS };
};
