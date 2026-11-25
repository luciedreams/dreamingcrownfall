    const clampNum = (v, lo, hi, def) => {
        const n = v === null || v === undefined || v === '' ? NaN : Math.round(Number(v));
        return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
    };
    settingDefaults.themeId = 'original';
    settings.themeId = THEMES.some(t => t.id === stored.themeId) ? stored.themeId : 'original';
    settingDefaults.themeHue = 305;
    settings.themeHue = clampNum(stored.themeHue, 0, 359, 305);
    settingDefaults.themeTint = 100;
    settings.themeTint = clampNum(stored.themeTint, 0, 200, 100);
    // Custom's accent had no slider of its own in 6.0 and followed the hue: whoever set a hue
    // then keeps that look until they move the new slider.
    settingDefaults.themeAccent = 305;
    settings.themeAccent = clampNum(stored.themeAccent, 0, 359, settings.themeHue);
    // Custom's background (6.2): a gradient from hue to accent, and one pattern. Both off by
    // default, so a Custom of 6.1 looks as it did. The ids match THEME_PATTERNS (section 3b).
    const THEME_PATTERN_IDS = ['none', 'glitter', 'stripes', 'hazard', 'scanlines', 'grid', 'blocks', 'bricks', 'dots', 'checker', 'pixels', 'triangles'];
    settingDefaults.themeGradient = false;
    settings.themeGradient = stored.themeGradient === true;
    settingDefaults.themePattern = 'none';
    settings.themePattern = THEME_PATTERN_IDS.includes(stored.themePattern) ? stored.themePattern : 'none';
    // Random theme (6.3): a new one on every page load, and if wanted every few minutes.
    const THEME_ROTATE_OPTIONS = [[0, 'Off'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min'], [60, '60 min']];
    settingDefaults.themeRandom = false;
    settings.themeRandom = stored.themeRandom === true;
    settingDefaults.themeRotate = 0;
    settings.themeRotate = THEME_ROTATE_OPTIONS.some(o => o[0] === Number(stored.themeRotate)) ? Number(stored.themeRotate) : 0;
    // Deluxe effects (6.5): full, subtle or off. Full unless chosen otherwise; the performance
    // levels hold it down on their own (section 3c, skinFxEffective).
    // Official theme (dev): one of the game's Visual Themes on tiles, King tile and page, for this
    // screen only (boot/official-theme.js, themes/official.js). null = none.
    settingDefaults.officialTheme = null;
    {
        const o = stored.officialTheme;
        settings.officialTheme = o && typeof o === 'object' && typeof o.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.id)
            && Number.isSafeInteger(o.revision) ? { id: o.id, name: String(o.name || o.id), rarity: String(o.rarity || ''), revision: o.revision } : null;
    }
    // Official fonts (dev): the game's player fonts per surface (playerFonts.js), for this screen only
    // (boot/lane-tap.js answers the game's font requests, themes/official-fonts.js is the page). {} = the game's own.
    settingDefaults.officialFonts = {};
    settings.officialFonts = {};
    if (stored.officialFonts && typeof stored.officialFonts === 'object')
        for (const [k, v] of Object.entries(stored.officialFonts))
            if (OFFICIAL_FONT_SURFACES.includes(k) && typeof v === 'string' && /^[a-z0-9-]{1,64}$/.test(v)) settings.officialFonts[k] = v;
    const THEME_FX_OPTIONS = [['full', 'Full'], ['subtle', 'Subtle'], ['off', 'Off']];
    settingDefaults.themeFx = 'full';
    settings.themeFx = THEME_FX_OPTIONS.some(o => o[0] === stored.themeFx) ? stored.themeFx : 'full';
    // See-through board frames (6.10): the bars the game paints above and below each tile and
    // around the king tile go, so the page background shows through. On unless switched off.
    settingDefaults.boardClear = true;
    settings.boardClear = stored.boardClear !== false;
    // On the throne (6.19): the beverage packages to pour, as "type|size|currency" — a list, not
    // a switch. Anything else found in storage is dropped rather than guessed at.
    settingDefaults.throneDrinkSet = [];
    settings.throneDrinkSet = Array.isArray(stored.throneDrinkSet)
        ? stored.throneDrinkSet.filter(k => /^(water|lava|milk|acid|bomb|mystery)\|(small|medium|large)\|(gold|diamonds)$/.test(k)) : [];
    // The music player (6.22, section 11e): off unless switched on, and until then the game plays
    // its music its own way. The tracks taken out of the rotation are kept as the paths the game's
    // own manifest gives them; anything else found in storage is dropped rather than guessed at.
    settingDefaults.musicPlayer = false;
    settings.musicPlayer = stored.musicPlayer === true;
    settingDefaults.musicShuffle = false;
    settings.musicShuffle = stored.musicShuffle === true;
    settingDefaults.musicVolume = 50;
    settings.musicVolume = Number.isFinite(Number(stored.musicVolume))
        ? Math.max(0, Math.min(100, Math.round(Number(stored.musicVolume)))) : 50;
    // The bar on the page (6.23): there whenever the player is, hidden with its own button or
    // here. Where it sits is kept with the windows, not here.
    settingDefaults.musicBar = true;
    settings.musicBar = stored.musicBar !== false;
    settingDefaults.musicExcluded = [];
    settings.musicExcluded = Array.isArray(stored.musicExcluded)
        ? stored.musicExcluded.filter(p => typeof p === 'string' && p.charAt(0) === '/') : [];

    // What a lever is set to right now: from the chosen level, or the Custom mix.
    function perfValue(key) {
        if (settings.perfLevel === 'custom') return settings[key];
        const level = PERF_LEVELS.find(l => l.id === settings.perfLevel);
        const lever = PERF_LEVERS.find(l => l.key === key);
        const v = level && level.set ? level.set[key] : undefined;
        return v !== undefined ? v : (lever && lever.type === 'choice' ? lever.def : false);
    }

    // Carried over from 3.7: whoever had the combined switch off gets both halves off.
    if (stored.kingName === undefined && stored.kingOverlay === false) settings.kingToll = false;
    // 6.28: our own name field gave way to the game's. Whoever had hidden it keeps the name hidden.
    if (stored.kcName === undefined && (stored.kingName === false || (stored.kingName === undefined && stored.kingOverlay === false)))
        settings.kcName = false;
    // 6.50: the switch Hide bidding indicators (6.47-6.49) became the choice Show / Standard size / Hide.
    if (stored.bidIndicatorMode === undefined && stored.hideBidIndicators === true) settings.bidIndicatorMode = 2;
    if (stored.hideDailies === undefined && stored.tidyFooter === false) {
        for (const b of FOOTER_BUTTONS) settings[b.key] = false;
    }

    // Plain start (app 0.3.0): a new installation begins with the game exactly as the website
    // shows it — every switch off — and each player turns on what they like. The app says so
    // (game.plain); it counts only where this page has stored nothing yet, so whoever has
    // settings keeps them. New account tabs of such an installation start plain as well.
    function gamePlain() {
        try { return !!(pageWindow.dcfApp && pageWindow.dcfApp.settings()['game.plain']); } catch (e) { return false; }
    }
    function plainValues() {
        const v = { boardClear: false };
        for (const item of ALL_ITEMS) v[item.key] = item.type === 'seg' ? item.def : false;
        return v;
    }
    // What "Reset" goes back to: plain for a plain installation, the full set otherwise.
    const startValues = () => Object.assign({}, settingDefaults, gamePlain() ? plainValues() : {});
    if (window.top === window.self && !Object.keys(stored).length && gamePlain()) {
        Object.assign(settings, plainValues());
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
    }

    function saveSettings() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
        setCosmeticsHidden();
    }
    // Which switch covers an item on the Cosmetics page: the main switch, or its group switch.
    const COS_COVER = {};
    for (const [g, parts] of Object.entries(COS_GROUPS)) {
        COS_COVER[COS_GROUP_KEYS[g]] = ['hideCosAll'];
        for (const p of parts) COS_COVER[COS_KEYS[p]] = ['hideCosAll', COS_GROUP_KEYS[g]];
    }
    COS_COVER.hideFonts = ['hideCosAll'];   // fonts (6.63): a group of one switch, covered by the main one
    const cosCovered = key => (COS_COVER[key] || []).some(k => settings[k]);
    // The game's own chat cosmetics control (chat header) does "all chat cosmetics" better than any
    // filter: already drawn lines turn plain too. Since MCF v1.0.4 it is a <select> with three modes,
    // full (animated), static (no motion) and off, remembered by the game in mcf.chat.cosmetics.mode.v1;
    // up to v1.0.3 it was an on/off button with aria-pressed. Set only when our wish changes, so a
    // choice of the player's own there is respected until the switch here is touched again; put back
    // (to the mode it had before) only if this script was the one that set it to off.
    let cosChatWish = null;
    function cosChatNative() {
        cosModeWrap();
        const want = !!(settings.hideCosAll || settings.hideCosChat);
        if (want === cosChatWish) return;
        const ctl = document.querySelector('[data-role="chat-cosmetics-toggle"], .mcf-chat__cosmetics-toggle');
        if (!ctl) return;   // the chat is not there yet: try again on the next round
        if (ctl.disabled) return;   // cosmetics unavailable right now: the game turns it on with its config
        let ours = null;
        try { ours = localStorage.getItem('mcfo_cos_chatnative'); } catch (e) {}
        if (ctl.tagName === 'SELECT') {
            const mode = ctl.value;
            if (want && mode !== 'off') {
                ctl.value = 'off';
                ctl.dispatchEvent(new Event('change', { bubbles: true }));
                try { localStorage.setItem('mcfo_cos_chatnative', mode); } catch (e) {}
            } else if (!want && mode === 'off' && ours) {
                ctl.value = ours === 'static' ? 'static' : 'full';   // '1' = set by a version before 6.62.2
                ctl.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else {
            const on = ctl.getAttribute('aria-pressed') === 'true';
            if (want && on) { ctl.click(); try { localStorage.setItem('mcfo_cos_chatnative', '1'); } catch (e) {} }
            else if (!want && !on && ours) ctl.click();
        }
        if (!want) try { localStorage.removeItem('mcfo_cos_chatnative'); } catch (e) {}
        cosChatWish = want;
        cosModeWrap();
    }
    // The select shows only a symbol (6.62.2): sparkles for Full, the same sparkles dimmed for Static,
    // struck through for Off. A select draws no ::before/::after, so it sits in a frame of ours,
    // .mcfo-cosmode, which carries the look (and the skins' button look) and the symbol; the select
    // itself lies invisible on top and still takes the click, so the game's own dropdown opens with
    // its readable options. The frame mirrors the mode in data-mode on every change.
    function cosModeWrap() {
        const ctl = document.querySelector('select[data-role="chat-cosmetics-toggle"]');
        if (!ctl) return;
        let frame = ctl.parentElement;
        if (!frame || !frame.classList.contains('mcfo-cosmode')) {
            frame = document.createElement('span');
            frame.className = 'mcfo-cosmode';
            ctl.before(frame);
            frame.appendChild(ctl);
        }
        if (!ctl.dataset.mcfoMode) {
            ctl.dataset.mcfoMode = '1';
            ctl.addEventListener('change', () => setTimeout(cosModeWrap, 0));
        }
        const names = { full: 'Full: animated styles', static: 'Static: styles without motion', off: 'Off: plain chat' };
        const mode = names[ctl.value] ? ctl.value : 'full';
        if (frame.dataset.mode !== mode) frame.dataset.mode = mode;
        const dis = ctl.disabled ? '1' : '';
        if ((frame.dataset.disabled || '') !== dis) { if (dis) frame.dataset.disabled = '1'; else delete frame.dataset.disabled; }
        const tip = ctl.disabled ? 'Chat cosmetics are unavailable' : `Chat cosmetics - ${names[mode]} (click to change)`;
        if (ctl.title !== tip) ctl.title = tip;
    }
    function setCosmeticsHidden() {
        cosHide = cosCompute(settings);
        if (Object.values(cosHide).some(Boolean)) wrapCosFetch();
        if (cosHide.indicatorSmall) installIndicatorScale();
        document.documentElement.setAttribute('data-mcfo-cos', Object.keys(cosHide).filter(p => cosHide[p]).join(' '));
        cosChatNative();
    }
    setCosmeticsHidden();
    setInterval(cosChatNative, 2000);

