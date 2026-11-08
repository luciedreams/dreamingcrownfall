    // =========================================================================================
    // 8d. GEMSTONES (game v1.0.1) — Ruby, Sapphire, Emerald, Topaz
    // =========================================================================================
    // Four new currencies "for future crafting". The game hands them out already (daily quests,
    // +1 Ruby for a top-three finish, a Topaz for every 100 tickets) but shows them only on the
    // profile page, and its wallet (/api/gemstones: { balances, ticketRemainder }) still answered
    // 404 on 08.11.2026. Until it is live the all-time leaderboards <gem>_earned_total stand in:
    // their currentPlayerEntry is this account's own count, and with nothing to spend gemstones
    // on yet, earned is the balance.
    //
    // Fetched here, in the page (the account's own cookie), every two minutes, and kept in
    // window.__dcfGems — the resource bar draws it (layout/game-layout.js), and Home, the HUD and
    // the account frames in the tab bar read it from there instead of fetching it a second time.
    const GEMS = [
        { key: 'ruby',     name: 'Rubies' },
        { key: 'sapphire', name: 'Sapphires' },
        { key: 'emerald',  name: 'Emeralds' },
        { key: 'topaz',    name: 'Topaz' },
    ];
    const GEM_MS = 2 * 60 * 1000, GEM_RETRY_MS = 30 * 1000;
    const gemIcon = key => `/assets/widgets/metric-icons/${key}.svg`;
    let gemNext = 0, gemBusy = false;
    window.__dcfGems = null;   // { values: { ruby, sapphire, emerald, topaz }, ticketRemainder, source: 'wallet' | 'earned', at }

    async function gemFetch() {
        const j = p => fetch(p, { credentials: 'same-origin', headers: { accept: 'application/json' } })
            .then(r => (r.ok ? r.json() : null)).catch(() => null);
        const w = await j('/api/gemstones');
        if (w && w.balances && typeof w.balances === 'object') {
            const values = {};
            for (const g of GEMS) values[g.key] = Math.max(0, Math.trunc(Number(w.balances[g.key]) || 0));
            const rest = Number(w.ticketRemainder);
            return { values, ticketRemainder: Number.isFinite(rest) ? rest : null, source: 'wallet', at: Date.now() };
        }
        const boards = await Promise.all(GEMS.map(g =>
            j(`/api/leaderboards?windowType=all_time&statKey=${g.key}_earned_total`)));
        // Every board must have answered: one missing would show as a false zero.
        if (!boards.every(b => b && 'currentPlayerEntry' in b)) return null;
        const values = {};
        GEMS.forEach((g, i) => { values[g.key] = Math.max(0, Math.trunc(Number(boards[i].currentPlayerEntry?.value) || 0)); });
        return { values, ticketRemainder: null, source: 'earned', at: Date.now() };
    }

    // On the beat of apply(). A failed fetch keeps the last good values and tries again sooner.
    function gemTick() {
        if (gemBusy || Date.now() < gemNext) return;
        if (signedOut()) { window.__dcfGems = null; gemNext = Date.now() + GEM_RETRY_MS; return; }
        gemBusy = true;
        gemFetch().then(d => {
            if (d) window.__dcfGems = d;
            gemNext = Date.now() + (d ? GEM_MS : GEM_RETRY_MS);
        }).finally(() => { gemBusy = false; });
    }
    // After claiming daily rewards the numbers change at once — fetch again on the next beat.
    function gemSoon() { gemNext = 0; }

    function gemTitle(d) {
        if (!d) return 'Gemstones';
        const parts = GEMS.map(g => `${number(d.values[g.key])} ${g.name}`).join(' · ');
        const rest = d.ticketRemainder != null ? `\n${number(d.ticketRemainder)} / 100 tickets toward the next Topaz` : '';
        const src = d.source === 'earned' ? '\nEarned so far — the game\'s gemstone wallet is not live yet.' : '';
        return `Gemstones: ${parts}${rest}${src}\nCollected now for future crafting.`;
    }
