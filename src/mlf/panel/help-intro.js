    // =========================================================================================
    // 11b. HOW TO, CHANGELOG, WHAT'S NEW
    // =========================================================================================
    // Three windows of text, built like the settings window. The changelog is written for
    // players, not about the code: what changed for them. What's new opens by itself once there
    // is a new version — on every load until "Don't show this again" is ticked, then not before
    // the next version. Versions skipped in between are shown together.
    //
    // The version comes from the userscript manager (GM_info), so it cannot drift from @version;
    // the fallback is for managers without GM_info and has to be kept in step by hand.
    const SCRIPT_VERSION = (typeof GM_info !== 'undefined' && GM_info && GM_info.script && GM_info.script.version) || '0.1.0';
    const HOWTO_KEY = '#howto', CHANGELOG_KEY = '#changelog', WHATSNEW_KEY = '#whatsnew';
    const WHATSNEW_SEEN = 'mlfapp_whatsnew_seen';   // the app version whose What's new was dismissed for good (app versions start at 0.1.0, so not MLF's key)

