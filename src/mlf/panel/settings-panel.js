    // =========================================================================================
    // 11. SETTINGS PANEL
    // =========================================================================================
    // The settings live in a window like everything else — same shell, own content instead of a
    // frame. Its key is not a path, so it can never collide with a page.
    const SETTINGS_KEY = '#settings';

    // DreamingCrownfall: the settings are a full panel over the game (panel/settings-app.js). A
    // page asked for beforehand through settingsView (e.g. the music bar asks for Sound) is opened.
    function showSettings() {
        const section = settingsView;
        settingsView = null;
        showAppSettings(section ? { section } : {});
    }
