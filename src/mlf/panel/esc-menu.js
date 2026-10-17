    // =========================================================================================
    // ESC MENU — what the app's game menu asks of this page
    // =========================================================================================
    // The menu itself belongs to the app (src/esc-menu.js): it looks the same over the game, Home
    // and Stats. Entries that need the game layer come back here: the game's pages open as windows
    // like from the footer, the patch notes as their card.
    try {
        window.dcfEscAct = id => {
            id = String(id || '');
            if (id.startsWith('page:')) { const p = PAGES[id.slice(5)]; if (p) openPage(p.path, p.title); }
            else if (id === 'patchnotes') showPatchNotes('changelog');
        };
    } catch (e) {}
