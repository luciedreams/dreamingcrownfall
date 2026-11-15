    // =========================================================================================
    // TILE CREDITS (DCF 0.16.0)
    // =========================================================================================
    // Who made the tile, in the upper corner opposite the game's own tile name: "Design by:" and
    // the name below it, drawn exactly like the game draws the name and the rarity (same font,
    // size, colour and outline, read off the game's label on every change), and shown and hidden
    // with it (the game hides both during the roulette and the scoreboard).
    //
    // The names come from the game's own credits page (/credits/, section Tile Contributors):
    // per person a list of tiles with a role (Design, Idea, Building, Design & building). Read
    // once and kept for 12 hours, so a tile credited there later shows up by itself.
    // Settings › Game screen › Lanes › Tile credits.
    const TC_CACHE_KEY = 'dcf_tile_credits';
    const TC_MAX_AGE = 12 * 3600 * 1000;
    const TC_RETRY = 10 * 60 * 1000;
    const TC_LINE = 19;   // the game puts the rarity 19 units under the name (renderLaneFrame.js)
    // Copied from the game's name label, so ours follows it in every look (scripted surfaces outline it).
    const TC_STYLE_ATTRS = ['font-size', 'font-family', 'font-weight', 'fill', 'stroke', 'stroke-width',
        'paint-order', 'stroke-linejoin', 'dominant-baseline', 'display'];

    let tcMap = null, tcLoading = false, tcFailedAt = 0;

    function tcKey(name) { return String(name || '').trim().toLowerCase().replace(/\s+/g, ' '); }

    // "Pachinko (Circle Jackpot)" on the page is the tile Pachinko in the game: the bracket is filed too.
    function tcParse(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const map = {};
        for (const card of doc.querySelectorAll('.tile-credit-gallery .tile-credit')) {
            const who = (card.querySelector('summary strong, h3')?.textContent || '').trim();
            if (!who) continue;
            for (const li of card.querySelectorAll('.tile-credit__tiles li')) {
                const tile = (li.querySelector('span:not(.tile-credit__role)')?.textContent || '').trim();
                const role = (li.querySelector('.tile-credit__role')?.textContent || '').trim();
                if (!tile) continue;
                const names = [tile];
                const bare = tile.replace(/\s*\([^)]*\)\s*$/, '').trim();
                if (bare && bare !== tile) names.push(bare);
                for (const n of names) (map[tcKey(n)] = map[tcKey(n)] || []).push({ who, role });
            }
        }
        return map;
    }

    function tcLoad() {
        if (tcMap === null) {
            try {
                const c = JSON.parse(localStorage.getItem(TC_CACHE_KEY) || 'null');
                if (c && c.map && typeof c.map === 'object') { tcMap = c.map; if (Date.now() - c.at < TC_MAX_AGE) return; }
            } catch (e) { /* no cache: fetch below */ }
        }
        if (tcLoading || Date.now() - tcFailedAt < TC_RETRY) return;
        tcLoading = true;
        fetch('/credits/', { credentials: 'omit', cache: 'no-cache' })
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
            .then(html => {
                const map = tcParse(html);
                if (!Object.keys(map).length) throw new Error('no tile credits on the page');
                tcMap = map;
                try { localStorage.setItem(TC_CACHE_KEY, JSON.stringify({ at: Date.now(), map })); } catch (e) { /* storage full: keep it in memory */ }
            })
            .catch(e => { tcFailedAt = Date.now(); console.warn('[dcf] tile credits:', e && e.message); })
            .finally(() => { tcLoading = false; });
    }

    // Design wins: a tile designed by one and built by another names the designer. A tile only
    // credited as an idea says so, the same for building alone.
    function tcCaption(list) {
        if (!list || !list.length) return null;
        const pick = re => [...new Set(list.filter(c => re.test(c.role)).map(c => c.who))];
        for (const [re, head] of [[/design/i, 'Design by:'], [/idea/i, 'Idea by:'], [/build/i, 'Built by:']]) {
            const who = pick(re);
            if (who.length) return { head, who: who.join(' & ') };
        }
        return { head: 'Design by:', who: [...new Set(list.map(c => c.who))].join(' & ') };
    }

    // The game's label carries the tile's own name ("Upward Slope v3", not the family "Slopes"), the same
    // name the credits page uses — and it is exactly the tile on screen, also while the next one is drawn.
    function tcLookup(label) {
        return tcMap ? tcCaption(tcMap[tcKey(label.textContent)]) : null;
    }

    function tcSet(el, attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            if (v === null || v === undefined) { if (el.hasAttribute(k)) el.removeAttribute(k); }
            else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v);
        }
    }

    // One tile: our two lines live in the game's label group, next to its name and rarity.
    function tcPaint(label) {
        const group = label.parentNode, svg = label.ownerSVGElement;
        if (!group || !svg) return;
        let pair = label.__dcfTc;
        const cap = settings.tileCredits !== false && label.textContent ? tcLookup(label) : null;
        if (!cap) {
            if (pair) for (const t of pair) t.setAttribute('display', 'none');
            return;
        }
        if (!pair || pair[0].parentNode !== group) {
            pair = label.__dcfTc = [0, 1].map(i => {
                const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                t.setAttribute('data-dcf-tile-credit', i ? 'name' : 'head');
                t.setAttribute('pointer-events', 'none');
                t.setAttribute('letter-spacing', '0.02em');
                group.appendChild(t);
                return t;
            });
        }
        // The game's tile: x and width from its clip, shifted by the authored world's translate.
        const clip = svg.querySelector('g[data-layer="lane-authored-world"] clipPath rect');
        const shift = /translate\(\s*([-\d.]+)/.exec(svg.querySelector('g[data-layer="lane-authored-world"]')?.getAttribute('transform') || '');
        const tileX = shift ? Number(shift[1]) : 0, tileW = clip ? Number(clip.getAttribute('width')) : NaN;
        const x = Number(label.getAttribute('x')), y = Number(label.getAttribute('y'));
        if (!(tileW > 0) || !Number.isFinite(x) || !Number.isFinite(y)) { for (const t of pair) t.setAttribute('display', 'none'); return; }
        // Mirrored across the middle of the tile: the same inset from the other edge.
        const mx = 2 * tileX + tileW - x;
        const anchor = label.getAttribute('text-anchor') === 'end' ? 'start' : 'end';
        const style = {};
        for (const a of TC_STYLE_ATTRS) style[a] = label.getAttribute(a);
        pair.forEach((t, i) => {
            tcSet(t, { ...style, x: mx, y: y + i * TC_LINE, 'text-anchor': anchor });
            const text = i ? cap.who : cap.head;
            if (t.textContent !== text) t.textContent = text;
        });
        tcDodge(svg, label, pair, { mx, y, anchor, tileX, tileW });
    }

    // The corner opposite the name is the game's to use: some tiles put their toll booth there (Pachinko,
    // the Claw Zone of the factory tiles), and on which side it sits depends on the tile and the lane. Only
    // when the booth really covers the credits do they move — beside it, towards the middle of the tile,
    // or below it if there is no room beside it. The bidding bubbles of the rail do not count (Luce).
    const TC_GAP = 8;
    const TC_TOLL = '[data-has-toll="true"], [data-toll-glyph], [data-toll-text]';
    function tcBoxes(svg, els) {
        const ctm = svg.getScreenCTM();
        if (!ctm) return [];
        const inv = ctm.inverse(), out = [];
        for (const e of els) {
            const r = e.getBoundingClientRect();
            if (!r.width && !r.height) continue;
            const a = new DOMPoint(r.left, r.top).matrixTransform(inv), b = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
            out.push({ l: Math.min(a.x, b.x), t: Math.min(a.y, b.y), r: Math.max(a.x, b.x), b: Math.max(a.y, b.y) });
        }
        return out;
    }
    const tcHit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
    function tcDodge(svg, label, pair, at) {
        if (pair[0].getAttribute('display') === 'none') return;
        const tolls = tcBoxes(svg, svg.querySelectorAll(TC_TOLL)).map(o => ({ l: o.l - TC_GAP, t: o.t - TC_GAP, r: o.r + TC_GAP, b: o.b + TC_GAP }));
        if (!tolls.length) return;
        const own = tcBoxes(svg, pair);
        if (own.length < 2) return;
        // Our block where it stands now (the corner): its size, and how far its edges are from x and y.
        const box = { l: Math.min(own[0].l, own[1].l), t: own[0].t, r: Math.max(own[0].r, own[1].r), b: own[1].b };
        const w = box.r - box.l, h = box.b - box.t, top = box.t - at.y;
        const hits = tolls.filter(o => tcHit(box, o));
        if (!hits.length) return;
        const keep = [...tolls, ...tcBoxes(svg, [label, label.parentNode.querySelector('[data-tile-rarity-label]')].filter(Boolean))];
        const inside = c => c.l >= at.tileX + 4 && c.r <= at.tileX + at.tileW - 4 && c.t >= 0;
        const place = (x, y) => {
            const l = at.anchor === 'end' ? x - w : x;
            return { x, y, l, r: l + w, t: y + top, b: y + top + h };
        };
        const cands = [];
        for (const o of hits) {
            // Beside the booth, on the side of the middle of the tile.
            cands.push(place(at.anchor === 'end' ? o.l : o.r, at.y));
            // Below it, in the corner's own column.
            cands.push(place(at.mx, o.b - top));
        }
        const fit = cands.find(c => inside(c) && !keep.some(o => tcHit(c, o)));
        if (!fit) return;
        pair.forEach((t, i) => tcSet(t, { x: Math.round(fit.x), y: Math.round(fit.y + i * TC_LINE) }));
    }

    // The game creates a label per lane and changes it in place; it is watched from the first sighting on,
    // and a slow beat finds new ones (a lane built anew) and picks up the credits once they have loaded.
    const tcWatched = new WeakSet();
    function tcScan() {
        if (settings.tileCredits !== false) tcLoad();
        for (const label of document.querySelectorAll('[data-lane-stage-active-lane-key] text[data-tile-family-id]')) {
            if (!tcWatched.has(label)) {
                tcWatched.add(label);
                new MutationObserver(() => tcPaint(label)).observe(label, { attributes: true, childList: true, characterData: true, subtree: true });
            }
            tcPaint(label);
        }
    }
    setInterval(tcScan, 1000);
