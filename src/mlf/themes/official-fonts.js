    // =========================================================================================
    // 3d. OFFICIAL FONTS  (DreamingCrownfall dev, game v1.0.4)
    // =========================================================================================
    // Settings › Appearance › Fonts: the game's 24 player fonts on any of its 14 surfaces, laid out
    // like the game's own font page in the inventory (inventoryFontStyles.js): the surfaces on the
    // left in its two groups, the fonts with a specimen on the right. Only on this screen — how the
    // fonts reach the game is in lane-tap (0b). The list of fonts is the game's public manifest
    // (/assets/fonts/chat/v1/manifest.json); the specimens are drawn with the game's renderFontSpecimen.
    // Shown together with the official themes (same dev list), and per account like every setting.
    const OFFICIAL_FONT_GROUPS = [
        ['Only you', {
            scorezones: ['Scorezones', 'Scorezones and tile elements.'],
            tile_text: ['Tile text', 'Tile signs, headings and prompts.'],
            bid_buttons: ['Ticket buttons', 'Your ticket buttons.'],
            site_text: ['Site text', 'Site menus, page text and scoreboard headers.'],
        }],
        ['Visible to other players', {
            marble_name: ['Marble name', 'The name above your marble.'],
            marble_score: ['Marble score', 'Your marble’s live score.'],
            bid_amount: ['Bid indicators', 'The bid amount beside your marble.'],
            run_results: ['Run results', 'Your row in the scoreboard.'],
            king_tile: ['King tile', 'Defense Blocks while you’re King.'],
            king_stats: ['King stats', 'The King tile’s stats while you’re King.'],
            royal_name: ['Royal name', 'Your royal name and title while you’re King.'],
            chat_username: ['Chat username', 'Your name in chat.'],
            chat_message: ['Chat messages', 'The messages you send.'],
            profile_name: ['Profile name', 'Your profile and leaderboard name.'],
        }],
    ];
    const officialFontsAvailable = () => officialList().length > 0;
    let officialFontSurface = 'scorezones';
    let officialFontsReloadDue = false;   // a public surface changed: shows after a reload

    let officialFontManifest = null;
    function officialFontList() {
        return officialFontManifest || (officialFontManifest = fetch('/assets/fonts/chat/v1/manifest.json', { cache: 'force-cache' })
            .then(r => r.ok ? r.json() : null)
            .then(m => (m && Array.isArray(m.fonts) ? m.fonts : [])
                .filter(f => f && typeof f.id === 'string' && /^[a-z0-9-]{1,64}$/.test(f.id))
                .map(f => ({ id: f.id, name: String(f.itemName || f.upstreamFamily || f.id) })))
            .catch(() => { officialFontManifest = null; return []; }));
    }
    let officialFontMod = null;
    function officialFontModule() {
        if (officialFontMod) return officialFontMod;
        const tag = document.querySelector('script[src*="/immutable-assets/"]');
        const m = tag && tag.getAttribute('src').match(/\/immutable-assets\/([^/]+)\//);
        return officialFontMod = m ? import(`/immutable-assets/${m[1]}/playerFonts.js`).catch(() => null) : Promise.resolve(null);
    }

    // After a change: lane-tap's copy, the game's "Only you" fonts at once (it asks again and gets
    // the new answer), the rest with the next reload — the game keeps players' fonts for a minute.
    function officialFontsChanged(publicToo) {
        officialFonts = Object.assign({}, settings.officialFonts || {});
        wrapCosFetch();
        if (OFFICIAL_FONT_PUBLIC.some(k => officialFonts[k])) try { officialFontsWhoAmI(pageWindow.fetch); } catch (e) {}
        officialFontModule().then(mod => {
            if (!mod || typeof mod.applyViewerFonts !== 'function') return;
            fetch('/api/inventory/font-styles?view=preferences', { credentials: 'same-origin', cache: 'no-store' })
                .then(r => r.ok ? r.json() : {}).catch(() => ({}))
                .then(d => mod.applyViewerFonts(d && d.assignments));
        });
        if (publicToo) officialFontsReloadDue = true;
    }
    function officialFontSet(surfaces, id) {
        const next = Object.assign({}, settings.officialFonts || {});
        for (const k of surfaces) { if (id) next[k] = id; else delete next[k]; }
        settings.officialFonts = next;
        saveSettings();
        officialFontsChanged(surfaces.some(k => OFFICIAL_FONT_PUBLIC.includes(k)));
    }

    function officialFontsCard(redraw) {
        const card = document.createElement('div');
        card.className = 'mcfo-set__card dcf-fonts';
        const all = document.createElement('div');
        all.className = 'dcf-fonts__all';
        const allLabel = document.createElement('span');
        allLabel.textContent = 'Use one font everywhere';
        const allSel = document.createElement('select');
        allSel.className = 'dcf-fonts__select';
        all.append(allLabel, allSel);
        const cols = document.createElement('div');
        cols.className = 'dcf-fonts__cols';
        const side = document.createElement('div');
        side.className = 'dcf-fonts__side';
        const main = document.createElement('div');
        main.className = 'dcf-fonts__main';
        cols.append(side, main);
        card.append(all, cols);

        officialFontList().then(fonts => {
            const nameOf = id => (fonts.find(f => f.id === id) || {}).name || 'Default';
            // The "everywhere" choice shows a font only when every surface has it.
            const vals = OFFICIAL_FONT_SURFACES.map(k => settings.officialFonts[k] || '');
            const same = vals.every(v => v === vals[0]) ? vals[0] : null;
            allSel.innerHTML = '';
            for (const [v, t] of [['__mixed', 'Mixed'], ['', 'The game’s own'], ...fonts.map(f => [f.id, f.name])]) {
                if (v === '__mixed' && same !== null) continue;
                const o = document.createElement('option');
                o.value = v; o.textContent = t;
                allSel.appendChild(o);
            }
            allSel.value = same === null ? '__mixed' : same;
            allSel.onchange = () => {
                if (allSel.value === '__mixed') return;
                officialFontSet(OFFICIAL_FONT_SURFACES, allSel.value);
                redraw();
            };

            for (const [group, surfaces] of OFFICIAL_FONT_GROUPS) {
                const h = document.createElement('div');
                h.className = 'mcfo-theme__group';
                h.textContent = group;
                side.appendChild(h);
                for (const [id, [label]] of Object.entries(surfaces)) {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'dcf-fonts__surface';
                    b.setAttribute('aria-pressed', id === officialFontSurface ? 'true' : 'false');
                    b.innerHTML = '<span></span><small></small>';
                    b.firstChild.textContent = label;
                    b.lastChild.textContent = settings.officialFonts[id] ? nameOf(settings.officialFonts[id]) : 'Default';
                    b.addEventListener('click', () => { officialFontSurface = id; redraw(); });
                    side.appendChild(b);
                }
            }

            const isPublic = OFFICIAL_FONT_PUBLIC.includes(officialFontSurface);
            const [label, what] = OFFICIAL_FONT_GROUPS.map(g => g[1][officialFontSurface]).find(Boolean);
            const head = document.createElement('div');
            head.className = 'dcf-fonts__head';
            head.innerHTML = '<b></b><span></span>';
            head.firstChild.textContent = label;
            head.lastChild.textContent = what + (isPublic
                ? ' Only you see it here — other players keep seeing the font you chose in the game.'
                : ' Only you see it, as in the game.');
            main.appendChild(head);
            const grid = document.createElement('div');
            grid.className = 'dcf-fonts__grid';
            const cur = settings.officialFonts[officialFontSurface] || '';
            for (const f of [{ id: '', name: 'The game’s own' }, ...fonts]) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'dcf-fonts__pick';
                b.setAttribute('aria-pressed', f.id === cur ? 'true' : 'false');
                b.innerHTML = '<span class="dcf-fonts__sample"></span><span class="dcf-fonts__name"></span>';
                b.lastChild.textContent = f.name;
                const sample = b.firstChild;
                sample.textContent = 'MarbleMage · +1,250 pts';
                if (f.id) officialFontModule().then(mod => { if (mod && mod.renderFontSpecimen) mod.renderFontSpecimen(sample, f.id); });
                b.addEventListener('click', () => {
                    if (f.id === cur) return;
                    officialFontSet([officialFontSurface], f.id);
                    redraw();
                });
                grid.appendChild(b);
            }
            main.appendChild(grid);
            if (officialFontsReloadDue) {
                const note = document.createElement('div');
                note.className = 'dcf-fonts__reload';
                note.innerHTML = '<span>Fonts on your name, scores and chat show after the page reloads — the game keeps them for a while.</span>';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mcfo-set__back';
                btn.textContent = 'Reload now';
                btn.addEventListener('click', () => {
                    try { sessionStorage.setItem(OFFICIAL_FONTS_REOPEN_KEY, officialFontSurface); } catch (e) {}
                    location.reload();
                });
                note.appendChild(btn);
                main.appendChild(note);
            }
        });
        return card;
    }
    const OFFICIAL_FONTS_REOPEN_KEY = 'dcf_official_fonts_reopen';
    (function officialFontsReopen() {
        let surface = null;
        try { surface = sessionStorage.getItem(OFFICIAL_FONTS_REOPEN_KEY); sessionStorage.removeItem(OFFICIAL_FONTS_REOPEN_KEY); } catch (e) {}
        if (!surface) return;
        if (OFFICIAL_FONT_SURFACES.includes(surface)) officialFontSurface = surface;
        const open = tries => {
            const fn = window.dcfOpenSettings || pageWindow.dcfOpenSettings;
            if (typeof fn !== 'function') { if (tries > 0) setTimeout(() => open(tries - 1), 500); return; }
            fn('appearance');
            // Scrolled to the fonts, not left at the theme on top.
            setTimeout(() => document.querySelector('.dcf-fonts')?.scrollIntoView({ block: 'start' }), 300);
        };
        setTimeout(() => open(20), 800);
    })();
