    // =========================================================================================
    // SCOREBOARD WITH EVERYONE (DCF 0.13.0)
    // =========================================================================================
    // The game's board at the end of a run shows eight rows: avatar, name, prize, run score. The
    // server sends more (kept per lane by boot/lane-tap.js): places 9-16, the bid, how and when each
    // marble went out, its share of the pot, the points before and after the payout. This board
    // shows all of it over the whole tile, in the theme's colours, and marks every account signed
    // in to this app — so each player sees their own accounts marked, and only those.
    //
    // It lives exactly as long as the game's board: shown while the game's group says
    // data-scoreboard-visible="true", sliding in with the game's panel, its numbers counting up with
    // data-scoreboard-addup-progress. The game's board stays where it is, only hidden, and comes back
    // whenever this one has nothing for the run (or Settings › Game screen › Scoreboard with everyone is off).
    // Drawn as HTML next to the lane's SVG, placed and scaled onto the tile on every frame while it is up
    // (sbPlace), so all sizes below are in the tile's own units (640 x 1080).
    const SB_TICKS_PER_S = 60;
    const SB_PANEL_TRAVEL = 650;   // the game slides its panel in from 620 + 30 below (renderLaneFrame.js)
    const SB_REASONS = {
        marble_popped:          ['\u{1F4A5}', 'Popped'],
        deathball_contact:      ['⚫', 'Deathball'],
        scripted_eliminated:    ['✖', 'Eliminated'],
        scripted_survived:      ['✔', 'Survived'],
        out_of_range_killbox:   ['↧', 'Fell out'],
        tile_emergency_timeout: ['⏱', 'Time ran out'],
    };
    const sbBoards = new Map();   // laneKey -> { el, key, root, group, rows: [{ el, img, row, prize, run }] }

    // Every account signed in to this app (main process), asked every 30 s; outside the app the
    // account of this page.
    let sbOwn = new Set(), sbOwnAt = 0;
    function sbOwnPlayers() {
        if (Date.now() - sbOwnAt > 30000) {
            sbOwnAt = Date.now();
            const app = typeof window.dcfApp === 'object' && window.dcfApp;
            const ask = app && typeof app.ownPlayers === 'function' ? app.ownPlayers()
                : fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.json())
                    .then(me => (me && !me.isGuest && me.playerId ? [me.playerId] : []));
            Promise.resolve(ask).then(list => { if (Array.isArray(list)) sbOwn = new Set(list.map(String)); }).catch(() => {});
        }
        return sbOwn;
    }

    // Avatars the way the game finds them (bots, fallbacks, the pictures seen during the run): its own
    // resolver, imported from the same URL, is the same module instance with the same cache.
    let sbAvatarMod = null, sbAvatarModUrl = '';
    function sbAvatar(row) {
        if (!sbAvatarMod && !sbAvatarModUrl) {
            const res = performance.getEntriesByType('resource').find(r => /\/prodViewer\/railAvatarResolver\.js(\?|$)/.test(r.name));
            const app = [...document.querySelectorAll('script[type="module"][src]')].find(s => /\/immutable-assets\/[^/]+\/app\.js(\?|$)/.test(s.src));
            sbAvatarModUrl = (res && res.name) || (app && app.src.replace(/app\.js(\?.*)?$/, 'prodViewer/railAvatarResolver.js')) || '-';
            if (sbAvatarModUrl !== '-') import(sbAvatarModUrl).then(m => { sbAvatarMod = m; }).catch(() => {});
        }
        try {
            if (sbAvatarMod && typeof sbAvatarMod.resolveAuthoritativeMarbleFaceUrl === 'function')
                return sbAvatarMod.resolveAuthoritativeMarbleFaceUrl(row, { source: 'scoreboard-row-fallback' }) || '';
        } catch (e) {}
        return row.profileImageUrl || row.avatarUrl || '';
    }

    // The lane a board group belongs to. The King tile's SVG carries no lane key: its results are
    // the newest of a King lane.
    function sbLaneKey(stage) {
        const k = stage.getAttribute('data-lane-stage-active-lane-key');
        if (k) return k;
        if (!stage.hasAttribute('data-king-shared-renderer')) return '';
        let best = '', at = 0;
        for (const [key, v] of laneScoreboard) if (/(^|:)king\b/i.test(key) && v.at > at) { best = key; at = v.at; }
        return best;
    }

    // Places 1-16 in order; whoever ran without a place (an older server, or more than 16) at the end.
    function sbRows(data) {
        const sb = data.scoreboard;
        const rows = [...sb.placements, ...(Array.isArray(sb.placementsBeyondTop8) ? sb.placementsBeyondTop8 : [])]
            .filter(r => r && typeof r === 'object')
            .sort((a, b) => (Number(a.placement) || 99) - (Number(b.placement) || 99));
        const seen = new Set(rows.map(r => r.marbleId));
        const map = (data.entrants && data.entrants.participantMarbleMap) || {};
        for (const e of Object.values(map)) if (e && e.marbleId && !seen.has(e.marbleId)) { seen.add(e.marbleId); rows.push({ ...e, placement: null }); }
        return rows;
    }

    const sbNum = n => Number(n || 0).toLocaleString();
    const sbOrd = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
    const sbSecs = tick => (Number(tick) / SB_TICKS_PER_S).toFixed(1);
    function sbDelta(row) {
        if (row.runScoreDelta != null && row.runScoreDelta !== '') return Math.trunc(Number(row.runScoreDelta)) || 0;
        if (row.runStartScore != null && row.postPrizeScore != null) return Math.trunc(row.postPrizeScore - row.runStartScore);
        return null;
    }
    function sbTip(row, total) {
        const lines = [`${row.placement ? '#' + row.placement + ' ' : ''}${row.displayName || row.playerName || row.userId || '?'}`];
        const bid = Number(row.totalBid ?? row.effectiveBidTickets ?? row.spendTickets);
        if (Number.isFinite(bid)) lines.push(`Bid: ${sbNum(bid)} ticket${bid === 1 ? '' : 's'}`);
        const why = SB_REASONS[row.eliminationReason];
        if (row.eliminationReason) {
            let t = `Out: ${why ? why[1] : row.eliminationReason}`;
            if (Number.isFinite(Number(row.eliminationTick))) t += ` after ${sbSecs(row.eliminationTick)} s`;
            if (row.eliminationOrder) t += ` (${sbOrd(Number(row.eliminationOrder))} of ${total} out)`;
            lines.push(t);
        }
        if (row.payout != null) {
            let t = `Prize: +${sbNum(row.payout)}`;
            if (Number(row.splitPercent) > 0) t += ` (${Number(row.splitPercent)} % of the pot)`;
            lines.push(t);
            if (bid > 0 && row.payout > 0) lines.push(`Prize per ticket bid: ×${(row.payout / bid).toLocaleString(undefined, { maximumFractionDigits: 1 })}`);
        }
        if (row.finalScore != null) lines.push(`Score on the tile: ${sbNum(row.finalScore)}`);
        if (row.runStartScore != null && row.postPrizeScore != null) {
            const d = sbDelta(row);
            lines.push(`Points: ${sbNum(row.runStartScore)} → ${sbNum(row.postPrizeScore)}${d != null ? ` (${d > 0 ? '+' : ''}${sbNum(d)})` : ''}`);
        }
        if (!row.placement) lines.push('Ran, without a place in the results.');
        return lines.join('\n');
    }

    function sbBuild(board, data, tileH) {
        sbStyles();
        const rows = sbRows(data);
        const own = sbOwnPlayers();
        const p = glPalette();
        const root = document.createElement('div');
        root.className = 'dcf-sb';
        for (const k of ['panel', 'line', 'text', 'accent']) root.style.setProperty('--sb-' + k, p[k].join(', '));
        // Rows fill the tile down to 16 players, and never grow past the game's own height.
        const rowH = Math.max(40, Math.min(70, Math.floor((tileH - 118) / Math.max(rows.length, 8))));
        root.style.setProperty('--sb-row', rowH + 'px');
        const tile = data.truth || data.tile || {};
        const pot = rows.reduce((n, r) => n + (Number(r.payout) || 0), 0);
        const head = document.createElement('div');
        head.className = 'dcf-sb__head';
        head.innerHTML = '<b>Results</b><span class="dcf-sb__tile"></span><span class="dcf-sb__meta"></span>';
        head.children[1].textContent = [tile.tileId, tile.rarityName].filter(Boolean).join(' · ');
        if (tile.rarityTintHex) head.children[1].style.setProperty('--sb-tint', tile.rarityTintHex);
        head.children[2].textContent = `${rows.length} player${rows.length === 1 ? '' : 's'} · pot ${sbNum(pot)}`;
        const cols = document.createElement('div');
        cols.className = 'dcf-sb__row dcf-sb__cols';
        cols.innerHTML = '<span>#</span><span></span><span>Player</span><span>Bid</span><span>Out</span><span>Prize</span><span>Run</span>';
        root.append(head, cols);
        board.rows = rows.map((row, i) => {
            const el = document.createElement('div');
            el.className = 'dcf-sb__row';
            if (own.has(String(row.playerId || row.userId || ''))) el.setAttribute('data-own', '');
            if (!row.placement) el.setAttribute('data-noplace', '');
            if (row.placement && row.placement <= 3) el.setAttribute('data-top', String(row.placement));
            el.title = sbTip(row, rows.length);
            const why = SB_REASONS[row.eliminationReason];
            const bid = Number(row.totalBid ?? row.effectiveBidTickets ?? row.spendTickets);
            el.innerHTML = '<span class="dcf-sb__place"></span><img class="dcf-sb__av" alt="" draggable="false">'
                + '<span class="dcf-sb__name"></span><span class="dcf-sb__bid"></span><span class="dcf-sb__out"><i></i><small></small></span>'
                + '<span class="dcf-sb__prize"></span><span class="dcf-sb__run"></span>';
            const c = el.children;
            c[0].textContent = row.placement ? String(row.placement) : '–';
            c[2].textContent = row.displayName || row.playerName || row.userId || '?';
            c[3].textContent = Number.isFinite(bid) ? sbNum(bid) : '–';
            c[4].firstChild.textContent = why ? why[0] : (row.eliminationReason ? '?' : '');
            c[4].lastChild.textContent = Number.isFinite(Number(row.eliminationTick)) && row.eliminationReason ? sbSecs(row.eliminationTick) + 's' : '';
            const delta = sbDelta(row);
            c[6].setAttribute('data-tone', delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero');
            el.style.setProperty('--sb-i', String(i));
            root.appendChild(el);
            const payout = Math.max(0, Number(row.payout) || 0);
            if (!payout) c[5].setAttribute('data-zero', '');
            return { el, img: c[1], row, prize: c[5], run: c[6], payout, delta };
        });
        board.el.replaceChildren(root);
        board.root = root;
        board.shownT = -1;
    }

    // The game's own (hidden) board has the right pictures for places 1-8: it takes them from the run's
    // marbles, which the result rows alone do not carry (the resolver then falls back to a placeholder).
    function sbGameAvatars(g) {
        const out = new Map();
        for (const row of g.querySelectorAll('[data-scoreboard-rows] > *')) {
            const name = [...row.querySelectorAll('text')].map(t => t.textContent || '').find(t => /^#\d+ /.test(t));
            const img = row.querySelector('image');
            const href = img && (img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href'));
            if (name && href) out.set(parseInt(name.slice(1), 10), href);
        }
        return out;
    }
    // Places 9-16 the game never draws on its board. Their pictures are on the marbles while the run is on:
    // each face is clipped by "tile-marble-clip-" + the marble id made safe (safeNodeId in renderLaneFrame.js).
    // Collected every 2 s, the newest 300 kept.
    const sbSafeId = id => String(id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const sbMarbleFaces = new Map();
    let sbFacesAt = 0;
    function sbCollectFaces() {
        if (Date.now() - sbFacesAt < 2000) return;
        sbFacesAt = Date.now();
        for (const img of document.querySelectorAll('[data-layer="lane-marbles"] image[clip-path^="url(#tile-marble-clip-"]')) {
            const id = /tile-marble-clip-([^)]+)\)/.exec(img.getAttribute('clip-path'))?.[1];
            const href = img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            if (!id || !href || /\/avatars\/fallback\//.test(href) || sbMarbleFaces.get(id) === href) continue;
            sbMarbleFaces.delete(id);
            sbMarbleFaces.set(id, href);
            if (sbMarbleFaces.size > 300) sbMarbleFaces.delete(sbMarbleFaces.keys().next().value);
        }
    }

    function sbAvatars(board) {
        const game = sbGameAvatars(board.group);
        for (const r of board.rows) {
            const src = (r.row.placement && game.get(Number(r.row.placement))) || sbMarbleFaces.get(sbSafeId(r.row.marbleId)) || sbAvatar(r.row);
            if (src && r.img.getAttribute('src') !== src) r.img.setAttribute('src', src);
        }
    }

    function sbDraw(board, t) {
        for (const r of board.rows) {
            const pay = Math.trunc(r.payout * t);
            const prize = r.payout ? '+' + sbNum(pay) : '0';
            if (r.prize.textContent !== prize) r.prize.textContent = prize;
            const d = r.delta == null ? null : Math.trunc(r.delta * t);
            const run = d == null ? '–' : (d > 0 ? '+' : d < 0 ? '−' : '') + sbNum(Math.abs(d));
            if (r.run.textContent !== run) r.run.textContent = run;
        }
    }

    function sbDrop(key) {
        const board = sbBoards.get(key);
        if (!board) return;
        board.el.remove();
        if (board.group) board.group.style.removeProperty('visibility');
        sbBoards.delete(key);
    }

    // Where the tile is, in the coordinates of the box the board is placed in. The SVG maps its units to the
    // screen (getScreenCTM, which knows viewBox and aspect ratio); a scaled ancestor (the board refit) is taken
    // out again with the ratio of layout width to drawn width.
    function sbPlace(board, rect, tileX, tileW, tileH) {
        const m = rect.getScreenCTM(), op = board.el.offsetParent;
        if (!m || !op) return false;
        const pr = op.getBoundingClientRect(), k = op.offsetWidth && pr.width ? op.offsetWidth / pr.width : 1;
        const x = (m.a * tileX + m.e - pr.left) * k - op.clientLeft, y = (m.f - pr.top) * k - op.clientTop;
        const scale = m.a * k;
        const css = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(5)})`;
        if (board.el.style.transform !== css) board.el.style.transform = css;
        const w = tileW + 'px', h = tileH + 'px';
        if (board.el.style.width !== w) board.el.style.width = w;
        if (board.el.style.height !== h) board.el.style.height = h;
        return true;
    }

    let sbRaf = 0;
    function sbTick() {
        const on = settings.fullScoreboard !== false;
        if (on) sbCollectFaces();
        const live = new Set();
        for (const g of document.querySelectorAll('[data-layer="lane-scoreboard"]')) {
            const stage = g.parentNode, host = stage && stage.parentElement;
            if (!host || g.getAttribute('data-scoreboard-visible') !== 'true') continue;
            const key = sbLaneKey(stage);
            const data = on && key && laneScoreboard.get(key);
            const rect = g.querySelector('rect[data-scoreboard-surface="panel"]');
            const tileX = rect ? Number(rect.getAttribute('x')) : NaN, tileW = rect ? Number(rect.getAttribute('width')) : NaN;
            const tileH = rect ? Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')) : NaN;
            // Only the results of this run: they keep coming with every frame while the game shows them,
            // so anything not seen for half a minute belongs to an earlier run.
            if (!data || !(tileW > 0 && tileH > 0) || Date.now() - data.at > 30 * 1000) continue;
            let board = sbBoards.get(key);
            if (!board) {
                board = { el: document.createElement('div'), key: '', rows: [] };
                board.el.className = 'dcf-sb-host';
                sbBoards.set(key, board);
            }
            board.group = g;
            // Next to the lane's SVG, never inside it: HTML in an SVG (foreignObject) that fades and moves made
            // Chromium draw the whole board in the wrong place, small in a corner, for single frames (Luce, 0.13.0).
            if (board.el.parentNode !== host) { sbStyles(); host.appendChild(board.el); }
            if (!sbPlace(board, rect, tileX, tileW, tileH)) continue;
            live.add(key);
            const own = [...sbOwnPlayers()].sort().join(',');
            const buildKey = `${data.runId}|${data.rows}|${tileW}x${tileH}|${own}`;
            if (board.key !== buildKey) { board.key = buildKey; sbBuild(board, data, tileH); }
            if (g.style.visibility !== 'hidden') g.style.visibility = 'hidden';
            // In and out with the game's panel; numbers with the game's count-up.
            const tr = /translate\(\s*[-\d.]+[\s,]+([-\d.]+)/.exec(g.querySelector('[data-scoreboard-panel]')?.getAttribute('transform') || '');
            const slide = tr ? Math.max(0, Math.min(1, 1 - Number(tr[1]) / SB_PANEL_TRAVEL)) : 1;
            const op = slide.toFixed(2), ty = `translateY(${Math.round((1 - slide) * 60)}px)`;
            if (board.root.style.opacity !== op) board.root.style.opacity = op;
            if (board.root.style.transform !== ty) board.root.style.transform = ty;
            const t = Math.max(0, Math.min(1, Number(g.getAttribute('data-scoreboard-addup-progress')) || 0));
            if (t !== board.shownT) { board.shownT = t; sbDraw(board, t); }
            // Pictures every half second: the game's may still be loading when the board comes up.
            if (!(Date.now() - (board.avAt || 0) < 500)) { board.avAt = Date.now(); sbAvatars(board); }
        }
        for (const key of [...sbBoards.keys()]) if (!live.has(key)) sbDrop(key);
        // While a board is up, every frame (the slide and the count-up); otherwise the beat below is enough.
        if (live.size && !sbRaf) sbRaf = requestAnimationFrame(() => { sbRaf = 0; sbTick(); });
    }
    setInterval(() => { if (!sbRaf) sbTick(); }, 150);

    function sbStyles() {
        if (document.getElementById('dcf-sb-css')) return;
        const s = document.createElement('style');
        s.id = 'dcf-sb-css';
        s.textContent = `
            .dcf-sb-host { position: absolute; left: 0; top: 0; z-index: 3; transform-origin: 0 0; pointer-events: auto; }
            .dcf-sb { box-sizing: border-box; width: 100%; height: 100%; padding: 16px 14px; display: flex; flex-direction: column; gap: 4px;
                background: linear-gradient(180deg, rgba(var(--sb-panel), .93), rgba(var(--sb-panel), .88));
                border: 2px solid rgba(var(--sb-line), .45); border-radius: 14px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05);
                font: 600 19px/1.15 system-ui, sans-serif; color: rgb(var(--sb-text)); user-select: none; overflow: hidden; }
            .dcf-sb__head { display: flex; align-items: baseline; gap: 12px; padding: 2px 6px 8px; border-bottom: 1px solid rgba(var(--sb-line), .3); white-space: nowrap; }
            .dcf-sb__head b { font-size: 24px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: rgb(var(--sb-accent)); }
            .dcf-sb__tile { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: 17px; color: var(--sb-tint, rgb(var(--sb-text))); filter: brightness(1.35); }
            .dcf-sb__meta { margin-left: auto; font-size: 15px; opacity: .7; font-variant-numeric: tabular-nums; }
            .dcf-sb__row { display: grid; grid-template-columns: 28px 42px minmax(0, 1fr) 56px 82px 84px 128px; align-items: center; gap: 7px;
                height: var(--sb-row); padding: 0 8px 0 6px; border-radius: 9px; border-left: 4px solid transparent; font-variant-numeric: tabular-nums; }
            .dcf-sb__row:not(.dcf-sb__cols):nth-child(odd) { background: rgba(var(--sb-text), .035); }
            .dcf-sb__cols { height: 28px; font-size: 14px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; opacity: .6; }
            .dcf-sb__cols > :nth-child(n+4), .dcf-sb__row > :nth-child(n+4) { text-align: right; }
            .dcf-sb__cols > :nth-child(5), .dcf-sb__out { text-align: center !important; }
            .dcf-sb__row[data-own] { background: rgba(var(--sb-accent), .2) !important; border-left-color: rgb(var(--sb-accent)); box-shadow: inset 0 0 0 1px rgba(var(--sb-accent), .35); }
            .dcf-sb__row[data-own] .dcf-sb__name { color: rgb(var(--sb-accent)); }
            .dcf-sb__row[data-noplace] { opacity: .6; }
            .dcf-sb__place { text-align: center; font-weight: 800; opacity: .75; }
            .dcf-sb__row[data-top] .dcf-sb__place { opacity: 1; color: rgb(var(--sb-accent)); }
            .dcf-sb__av { width: min(40px, calc(var(--sb-row) - 10px)); height: min(40px, calc(var(--sb-row) - 10px)); border-radius: 50%; object-fit: cover;
                justify-self: center; background: rgba(var(--sb-text), .1); box-shadow: 0 0 0 2px rgba(var(--sb-line), .45); }
            .dcf-sb__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
            .dcf-sb__bid { opacity: .8; }
            .dcf-sb__out { display: flex; align-items: baseline; justify-content: center; gap: 4px; white-space: nowrap; }
            .dcf-sb__out i { font-style: normal; font-size: 17px; }
            .dcf-sb__out small { font-size: 15px; opacity: .7; }
            .dcf-sb__prize { font-weight: 800; color: rgb(var(--sb-accent)); }
            .dcf-sb__prize[data-zero] { color: inherit; opacity: .45; }
            .dcf-sb__run { font-weight: 800; }
            .dcf-sb__run[data-tone="up"] { color: #7fd99a; }
            .dcf-sb__run[data-tone="down"] { color: #ff8a7a; }
            .dcf-sb__run[data-tone="zero"] { opacity: .55; }
        `;
        (document.head || document.documentElement).appendChild(s);
    }
