    // =========================================================================================
    // 3c. OFFICIAL THEMES  (DreamingCrownfall dev, game v1.0.4)
    // =========================================================================================
    // The game's own Visual Themes as a third kind next to Basic and Deluxe (Settings › Appearance ›
    // Theme › Official themes), on normal tiles, the King tile and the page, for this screen only.
    // How they reach the game is in 0b (boot/official-theme.js); this part is the list and the pick.
    //
    // The list (id, name, rarity, revision, the theme's preview address and the miniature colours)
    // comes from the app (dcfApp.officialThemes, <profile>/official-themes.json); without it the
    // category is not there at all. The recipes themselves are loaded from the game, the way its
    // inventory loads them (visualThemes.js savePersonalVisualTheme: <themePreviewHref>/recipe.json).
    const OFFICIAL_RARITIES = ['cosmic', 'ethereal', 'mythic', 'legendary', 'epic', 'rare', 'common'];
    const OFFICIAL_RARITY_INK = { cosmic: '#b9a8ff', ethereal: '#e0d2de', mythic: '#d66a66', legendary: '#e1b16b',
                                  epic: '#a862e2', rare: '#5da4e1', common: '#4d8b51' };
    const OFFICIAL_REOPEN_KEY = 'dcf_official_theme_reopen';
    let officialListCache;
    function officialList() {
        if (officialListCache !== undefined) return officialListCache;
        let list = null;
        try { list = pageWindow.dcfApp && typeof pageWindow.dcfApp.officialThemes === 'function' ? pageWindow.dcfApp.officialThemes() : null; } catch (e) {}
        officialListCache = Array.isArray(list)
            ? list.filter(t => t && typeof t.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id) && Number.isSafeInteger(t.revision)
                && typeof t.href === 'string' && /^\/themes\/p\/[a-f0-9]{32}$/.test(t.href))
            : [];
        return officialListCache;
    }
    const officialRarityLabel = r => r ? r.charAt(0).toUpperCase() + r.slice(1) : '';

    // The game's own miniature (visualThemeMiniature.js, the picture of the shop tile), loaded once.
    let officialMiniMod = null;
    function officialMiniature(host, t) {
        if (!t.miniature) return;
        const draw = mod => { try { if (mod && mod.renderVisualThemeMiniature) mod.renderVisualThemeMiniature(host, t.miniature, t.name); } catch (e) {} };
        if (!officialMiniMod) {
            const tag = document.querySelector('script[src*="/immutable-assets/"]');
            const m = tag && tag.getAttribute('src').match(/\/immutable-assets\/([^/]+)\//);
            if (!m) return;
            officialMiniMod = import(`/immutable-assets/${m[1]}/visualThemeMiniature.js`).catch(() => null);
        }
        officialMiniMod.then(draw);
    }
    // The strip on the category tile: the seven tile floors of a theme, like the swatches of the others.
    function officialStrip(host, t) {
        host.classList.add('mcfo-theme__swatches');
        for (const tile of (t && t.miniature && t.miniature.tiles) || []) {
            const s = document.createElement('span');
            s.style.background = `linear-gradient(180deg, ${tile.floor} 55%, ${tile.defense} 55%)`;
            host.appendChild(s);
        }
    }

    // Picks a theme: the recipe from the game, into the game's slots, and a reload — the game reads
    // its themes once, when the page starts. What the game had before is kept once, for when the
    // official theme goes again.
    let officialBusy = false;
    async function officialPick(t, onError) {
        if (officialBusy) return;
        officialBusy = true;
        try {
            const res = await fetch(t.href + '/recipe.json', { credentials: 'same-origin', cache: 'no-store' });
            if (!res.ok) throw new Error('recipe ' + res.status);
            const recipe = await res.json();
            if (!recipe || recipe.version !== 1 || recipe.id !== t.id || !recipe.normalTiles || !recipe.mainPage) throw new Error('recipe_changed');
            if (localStorage.getItem(OFFICIAL_BACKUP_KEY) === null) localStorage.setItem(OFFICIAL_BACKUP_KEY, localStorage.getItem(OFFICIAL_PREFS_KEY) || '');
            let prefs = null;
            try { prefs = JSON.parse(localStorage.getItem(OFFICIAL_PREFS_KEY)); } catch (e) {}
            if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) prefs = {};
            const name = String(recipe.name || t.name);
            prefs.normalTiles = { id: recipe.id, name, version: recipe.version, normalTiles: recipe.normalTiles };
            prefs.mainPage = { id: recipe.id, name, version: recipe.version, mainPage: recipe.mainPage };
            localStorage.setItem(OFFICIAL_PREFS_KEY, JSON.stringify(prefs));
            settings.officialTheme = { id: t.id, name: t.name, rarity: t.rarity || '', revision: t.revision };
            // One look at a time: the page colours step back to the game's own, and Random would
            // swap the official theme away again.
            settings.themeId = 'original';
            settings.themeRandom = false;
            saveSettings();
            officialReload();
        } catch (e) {
            console.warn('[DreamingCrownfall] official theme could not be loaded:', e.message);
            officialBusy = false;
            if (onError) onError();
        }
    }
    // Back to Basic or Deluxe: the official theme goes, 0b gives the game its own back on the reload.
    function officialLeave() {
        if (!settings.officialTheme) return false;
        settings.officialTheme = null;
        saveSettings();
        officialReload();
        return true;
    }
    function officialReload() {
        try { sessionStorage.setItem(OFFICIAL_REOPEN_KEY, themeView || ''); } catch (e) {}
        location.reload();
    }
    // After that reload the settings open where they were, on the theme list.
    (function officialReopen() {
        let view = null;
        try { view = sessionStorage.getItem(OFFICIAL_REOPEN_KEY); sessionStorage.removeItem(OFFICIAL_REOPEN_KEY); } catch (e) {}
        if (view === null) return;
        const open = (tries) => {
            if (typeof pageWindow.dcfOpenSettings !== 'function' && typeof window.dcfOpenSettings !== 'function') {
                if (tries > 0) setTimeout(() => open(tries - 1), 500);
                return;
            }
            themeView = view || null;
            (window.dcfOpenSettings || pageWindow.dcfOpenSettings)('appearance');
        };
        setTimeout(() => open(20), 800);
    })();

    // The list page: one heading per rarity, rarest first like the inventory, the game's miniature on each tile.
    function officialGrid(card, redraw) {
        const list = officialList();
        for (const rarity of OFFICIAL_RARITIES) {
            const items = list.filter(t => t.rarity === rarity).sort((a, b) => a.name.localeCompare(b.name));
            if (!items.length) continue;
            const head = document.createElement('div');
            head.className = 'mcfo-theme__group';
            head.textContent = officialRarityLabel(rarity);
            card.appendChild(head);
            const grid = document.createElement('div');
            grid.className = 'mcfo-theme__grid';
            for (const t of items) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'mcfo-theme__pick mcfo-theme__pick--official';
                b.setAttribute('data-mcfo-official-id', t.id);
                b.setAttribute('aria-pressed', settings.officialTheme && settings.officialTheme.id === t.id ? 'true' : 'false');
                b.innerHTML = '<span class="mcfo-theme__mini"></span><span class="mcfo-theme__name"></span><span class="mcfo-theme__note"></span>';
                b.querySelector('.mcfo-theme__name').textContent = t.name;
                const note = b.querySelector('.mcfo-theme__note');
                note.textContent = officialRarityLabel(t.rarity);
                note.style.color = OFFICIAL_RARITY_INK[t.rarity] || '';
                officialMiniature(b.querySelector('.mcfo-theme__mini'), t);
                b.addEventListener('click', () => {
                    if (settings.officialTheme && settings.officialTheme.id === t.id) return;
                    b.setAttribute('data-loading', '');
                    note.textContent = 'Loading …';
                    officialPick(t, () => {
                        b.removeAttribute('data-loading');
                        note.textContent = 'Could not load this theme';
                    });
                });
                grid.appendChild(b);
            }
            card.appendChild(grid);
        }
        const hint = document.createElement('div');
        hint.className = 'mcfo-theme__hint mcfo-theme__official-hint';
        hint.textContent = 'The game’s own themes, on the tiles, the King tile and the page — only on this screen, nobody else sees them. '
                         + 'Picking one reloads the page once; the game reads its themes when it starts.';
        card.appendChild(hint);
        if (settings.officialTheme) {
            const off = document.createElement('button');
            off.type = 'button';
            off.className = 'mcfo-set__back mcfo-theme__official-off';
            off.textContent = 'Back to the game’s own look';
            off.addEventListener('click', () => { settings.themeId = 'original'; saveSettings(); officialLeave(); });
            card.appendChild(off);
        }
    }

    // ---- helpers for the parts of the page the game does not theme by itself ----
    const officialHexRgb = v => {
        const m = /^#([0-9a-f]{6})$/i.exec(String(v || '').trim());
        return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null;
    };
    // The page part of the theme as the game keeps it (0b wrote it), or null.
    function officialSiteSection() {
        if (!settings.officialTheme) return null;
        try {
            const p = JSON.parse(localStorage.getItem(OFFICIAL_PREFS_KEY));
            const m = p && p.mainPage;
            return m && m.id === settings.officialTheme.id && m.mainPage && typeof m.mainPage === 'object' ? m.mainPage : null;
        } catch (e) { return null; }
    }
    // Only pictures from where the game itself takes them (visualThemes.js artwork()).
    const officialAssetPath = v => typeof v === 'string' && (/^\/themes\/p\/[a-f0-9]{32}\/assets\/[a-f0-9]{32}\.(?:svg|webp)$/.test(v)
        || /^\/(?:assets|materials\/ui\/theme-previews\/v1)\/[a-z0-9/_-]+\.(?:svg|webp|png)$/i.test(v)) ? v : null;

    // The page's picture. The game shows a Site theme's artwork (or material) on its other pages —
    // inventory, shop, profiles — through siteThemePage.js, and on the game page only its colour.
    // Here the game page gets it too, with the game's own function and its own CSS
    // (siteNavigation.css: body::before, the scene motion); the shell, which the game paints in the
    // page colour, turns see-through, as the game does for its own track pages (.trackb-shell).
    // Nothing moves: the board, the bars and the windows stay where they are.
    function officialSiteBackground() {
        const sec = officialSiteSection();
        if (!sec || (!sec.backgroundArtwork && !sec.backgroundMaterial)) return;
        const tag = document.querySelector('script[src*="/immutable-assets/"]');
        const m = tag && tag.getAttribute('src').match(/\/immutable-assets\/([^/]+)\//);
        if (!m) return;
        const base = `/immutable-assets/${m[1]}/`;
        Promise.all([import(base + 'visualThemes.js'), import(base + 'siteThemeBackground.js')]).then(([vt, bg]) => {
            if (typeof vt.readSiteTheme !== 'function' || typeof bg.applySiteThemeBackground !== 'function') return;
            const theme = vt.readSiteTheme();
            if (!theme || theme.id !== settings.officialTheme.id) return;
            bg.applySiteThemeBackground(document.documentElement, theme);
            if (!document.getElementById('dcf-official-site-css')) {
                const st = document.createElement('style');
                st.id = 'dcf-official-site-css';
                st.textContent = `html:is([data-mcf-site-artwork], [data-mcf-site-material]) [data-role="shell"] { background: transparent !important; }`;
                (document.head || document.documentElement).appendChild(st);
            }
        }).catch(e => console.warn('[DreamingCrownfall] official theme: page background unavailable:', e.message));
    }

    // The King tile. The game swaps a King's theme in when the reign's first snapshot arrives and the
    // recipe has loaded (kingPane.js onSnapshot), but while the King tile runs its local simulation it
    // only redraws the moving parts (renderLaneRetainedDynamicFrame) — the floor and the backdrop stay
    // as they were drawn before the theme came. The same happens to every King's theme in the game.
    // With an official theme on, the tile is checked every two seconds: a floor still in the basic
    // colour, or a missing backdrop, makes the next frame a full one (the retained scene's lane key no
    // longer matches, kingPane.js retainedPresentation), which the game then draws in the theme.
    let officialKingRecipe = null;
    function officialKingWatch() {
        if (!officialKing) return;
        fetch(`/materials/ui/themes/v1/${officialKing.id}/revisions/${officialKing.revision}.json`, { credentials: 'same-origin' })
            .then(r => r.ok ? r.json() : null).then(j => { officialKingRecipe = j && j.kingTile ? j.kingTile : null; }).catch(() => {});
        let last = 0;
        setInterval(() => {
            const k = officialKingRecipe;
            const st = k && document.querySelector('[data-role="king-shared-renderer-stage"]');
            if (!st || document.hidden || Date.now() - last < 4000) return;
            const base = st.querySelector('[data-tile-surface="base"]');
            const art = st.querySelector('[data-tile-surface="king-artwork"]');
            const fill = base ? String(base.getAttribute('fill') || '').toLowerCase() : '';
            const stale = (k.backgroundArtwork && !art) || (fill === '#131b14' && String(k.floor || '').toLowerCase() !== '#131b14');
            const r = st.__m25Retained;
            if (!stale || !r || typeof r !== 'object' || typeof r.laneKey !== 'string') return;
            last = Date.now();
            r.laneKey = '__dcf_official_refresh';
        }, 2000);
    }
    if (settings.officialTheme && officialKing) {
        officialSiteBackground();
        officialKingWatch();
    }
