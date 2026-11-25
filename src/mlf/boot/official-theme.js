    // =========================================================================================
    // 0b. OFFICIAL THEMES, BEFORE THE GAME STARTS  (DreamingCrownfall dev, game v1.0.4)
    // =========================================================================================
    // The game's Visual Themes cover three surfaces (visualThemes.js, VISUAL_THEME_SLOTS):
    //   normalTiles, mainPage  kept by the browser alone, in localStorage 'mcf.visual-theme-preferences.v1'
    //                          together with the recipe section itself; app.js reads them once at boot
    //                          (readPageVisualThemes), so a change shows after a reload.
    //   kingTile               the King's own choice, sent with every King snapshot as king.visualTheme
    //                          { id, revision }; kingPane.js loads that recipe from
    //                          /materials/ui/themes/v1/<id>/revisions/<n>.json.
    // An official theme picked in Settings › Appearance › Theme writes the first two the way the
    // game's inventory would, and swaps the King's reference in the snapshots for its own (lane-tap,
    // cosReviver). Everything stays on this screen: nothing is sent to the server.
    //
    // Here, at document-start, two things are put straight before the game reads them:
    //   - an official theme switched off elsewhere (another theme picked, settings reset) gives the
    //     game back what it had before, from the copy taken when the official theme came on;
    //   - a theme equipped in the game's own inventory meanwhile wins: the official one steps aside.
    const OFFICIAL_PREFS_KEY = 'mcf.visual-theme-preferences.v1';
    const OFFICIAL_BACKUP_KEY = 'dcf_official_theme_backup';
    let officialKing = null;   // { id, revision } while an official theme is on; read by lane-tap
    (function officialThemeBoot() {
        let st = null;
        try { st = JSON.parse(localStorage.getItem('mcf_overhaul_settings')) || null; } catch (e) {}
        const off = st && st.officialTheme;
        let prefs = null;
        try { prefs = JSON.parse(localStorage.getItem(OFFICIAL_PREFS_KEY)); } catch (e) {}
        let backup = null;
        try { backup = localStorage.getItem(OFFICIAL_BACKUP_KEY); } catch (e) {}
        const valid = off && typeof off.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(off.id) && Number.isSafeInteger(off.revision);
        if (valid) {
            const ours = prefs && prefs.normalTiles && prefs.normalTiles.id === off.id && prefs.mainPage && prefs.mainPage.id === off.id;
            if (ours) { officialKing = { id: off.id, revision: off.revision }; return; }
            // Something else is in the game's slots: the player equipped a theme in the inventory.
            // That choice stands; the official theme and the old copy go.
            try {
                delete st.officialTheme;
                localStorage.setItem('mcf_overhaul_settings', JSON.stringify(st));
                localStorage.removeItem(OFFICIAL_BACKUP_KEY);
            } catch (e) {}
            return;
        }
        if (backup !== null) {
            try {
                if (backup === '') localStorage.removeItem(OFFICIAL_PREFS_KEY);
                else localStorage.setItem(OFFICIAL_PREFS_KEY, backup);
                localStorage.removeItem(OFFICIAL_BACKUP_KEY);
            } catch (e) {}
        }
    })();
