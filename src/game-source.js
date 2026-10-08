// Die Spiel-Ebene der App (src/mlf/, abgespalten von MarbleLuceFall 6.59.1): die Dateien aus
// order.txt in dieser Reihenfolge aneinandergehängt — sie teilen sich einen Gültigkeitsbereich,
// die Reihenfolge zählt. Version ist die der App.
// Beim Starten aus dem Projektordner wird bei jedem Abruf neu gelesen, damit F5 Änderungen zeigt.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DIR = path.join(__dirname, 'mlf');

function build() {
    const order = fs.readFileSync(path.join(DIR, 'order.txt'), 'utf8')
        .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    return order.map((f) => fs.readFileSync(path.join(DIR, f), 'utf8')).join('');
}

let cached = null;

module.exports = {
    get() {
        try {
            // process.defaultApp: aus dem Ordner gestartet (`electron .`). app.isPackaged taugt dafür nicht —
            // das System-Electron von Arch meldet auch dann true.
            if (!cached || process.defaultApp || !app.isPackaged) cached = { code: build(), version: app.getVersion() };
        } catch (e) {
            console.error(`[dcf] Spiel-Ebene nicht ladbar: ${e.message}`);
        }
        return cached;
    },
};
