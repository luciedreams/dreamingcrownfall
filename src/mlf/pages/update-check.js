    // =========================================================================================
    // 12c. UPDATE CHECK — app edition
    // =========================================================================================
    // In the userscript this asks Greasy Fork for new versions and offers "update to ...". The
    // app is updated by its own updater (GitHub releases), so here it stays quiet. The names
    // stay because the footer (core/footer.js), the account menu (core/menus.js) and apply()
    // call them.
    let updateLatest = null;

    function updateAvailable() { return false; }

    function showUpdate() {
        document.documentElement.removeAttribute('data-mcfo-update');
        buildFooterMeta();
    }

    function installUpdate() {}

    function startUpdateCheck() {}

