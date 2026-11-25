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
