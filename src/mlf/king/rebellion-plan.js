    // =========================================================================================
    // 9a2. PLANNED REBELLIONS (app 0.8)
    // =========================================================================================
    // A Rebellion planned for a coming tileset slot: "x25 when Risky Business starts at 14:00".
    // Chosen in the Rebellion popup (Now | Schedule) or from the list of upcoming tilesets.
    //
    // NOTHING IS BOUGHT BY THIS SCRIPT, here either. When the slot has begun, the plan presses the
    // game's own Start for the tier, found and checked exactly as a click in the popup does it
    // (verifiedStartButton, 9a): same block by cost, same multiplier, button enabled. The game's
    // purchaseRebellionTier then makes all of its own checks.
    //
    // The plans live in localStorage, and every account tab has its own storage — a plan belongs
    // to the account whose tab it was made in. They are kept by the slot (tileset + server start
    // time), and are bound again to the schedule on every refresh, so a slot that moves takes its
    // plan along. Rules:
    //   1. Only inside the slot: from its start until its end. Later is "missed" — the Rebellion
    //      would run in the wrong tileset.
    //   2. The game's panel is what fetches the status (room ready, a Rebellion already running),
    //      so it is opened invisibly while a plan is due, and reopened now and then to fetch it
    //      again. Closed again when nothing is due.
    //   3. Every press is written down BEFORE it is made, and the verdict is the server's
    //      (/api/rebellions/me, read only) — the game's own "Rebellion started." is gone again within
    //      a moment. Another press only after an explicit error from the game, or when the server
    //      still knows no Rebellion half a minute later. At most PLAN_TRIES presses.
    //   4. If the app was not running during the slot, the plan says so afterwards ("missed").
    //      The outcome goes out as a notification through the app (notify.rebellionPlan).
    const PLAN_KEY = 'mcfo_reb_plans';
    const PLAN_KEEP_MS = 12 * 60 * 60 * 1000;   // finished plans stay listed this long
    const PLAN_REWAKE_MS = 20000;
    const PLAN_ANSWER_MS = 15000;
    const PLAN_RECHECK_MS = 30000;
    const PLAN_TRIES = 3;
    const PLAN_REFRESH_MS = 10 * 60 * 1000;
    const plan = { busy: false, woke: 0, opened: false };

    function planLoad() {
        try {
            const list = JSON.parse(localStorage.getItem(PLAN_KEY) || '[]');
            return Array.isArray(list) ? list.filter(p => p && p.id && p.tilesetId && Number.isFinite(p.start)) : [];
        } catch (e) { return []; }
    }
    function planSave(list) {
        try { localStorage.setItem(PLAN_KEY, JSON.stringify(list)); } catch (e) {}
    }
    function planPatch(id, patch) {
        const list = planLoad();
        const p = list.find(x => x.id === id);
        if (p) { Object.assign(p, patch); planSave(list); }
        return p || null;
    }
    // The server's clock (the schedule is in it); the tileset card keeps the difference.
    const planNow = () => Date.now() + (nextEv.skew || 0);
    const planTier = cost => REB_TIERS.find(t => t.cost === cost) || null;
    const planClock = ms => new Date(ms - (nextEv.skew || 0)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const planPending = (list, start, id) => list.find(p => p.state === 'planned' && p.start === start && (!id || p.tilesetId === id));

    // The upcoming slots, from the tileset card's schedule (one request for both).
    function planSlots() {
        if (!nextEv.busy && Date.now() - nextEv.at > PLAN_REFRESH_MS) loadNextEvents();
        const now = planNow();
        return nextEv.rows.filter(r => r.raw > now).slice(0, 8);
    }

    // A slot that moved takes its plan along: the same tileset, the start nearest to the old one,
    // within three hours.
    function planRebind(list) {
        if (!nextEv.rows.length || Date.now() - nextEv.at > PLAN_REFRESH_MS) return false;
        let changed = false;
        for (const p of list) {
            if (p.state !== 'planned' || p.start <= planNow()) continue;
            if (nextEv.rows.some(r => r.id === p.tilesetId && r.raw === p.start)) continue;
            const near = nextEv.rows.filter(r => r.id === p.tilesetId && Math.abs(r.raw - p.start) < 3 * 3600 * 1000)
                .sort((a, b) => Math.abs(a.raw - p.start) - Math.abs(b.raw - p.start))[0];
            if (near && !planPending(list, near.raw, near.id)) {
                Object.assign(p, { start: near.raw, end: near.end });
                changed = true;
            }
        }
        return changed;
    }

    function planNotify(p, title, body) {
        console.log('[DreamingCrownfall] planned rebellion:', title, '—', body);
        try { window.dcfApp?.notify?.(title, body); } catch (e) {}
    }
    const planLabel = p => `x${(planTier(p.cost) || {}).mult || '?'} · ${tilesetName(p.tilesetId)} ${planClock(p.start)}`;

    function planFinish(p, state, note) {
        planPatch(p.id, { state, note, doneAt: Date.now(), seen: state === 'done' });
        const title = { done: '⚔ Rebellion started', failed: '⚔ Planned Rebellion failed', missed: '⚔ Planned Rebellion missed' }[state];
        planNotify(p, title, `${planLabel(p)} — ${note}`);
    }

    // On the 1.5 s beat (apply).
    function rebPlanTick() {
        let list = planLoad();
        if (!list.length) { planSleep(); planMarks(list); return; }
        const now = planNow();
        let changed = false;
        const kept = list.filter(p => p.state === 'planned' || Date.now() - (p.doneAt || 0) < PLAN_KEEP_MS);
        if (kept.length !== list.length) { list = kept; changed = true; }
        if (planRebind(list)) changed = true;
        if (changed) planSave(list);
        for (const p of list) {
            if (p.state !== 'planned' || now < p.end) continue;
            planFinish(p, 'missed', p.seenAt ? (p.reason || 'the game never offered this tier') : 'DreamingCrownfall was not running');
        }
        list = planLoad();
        planMarks(list);
        const due = list.find(p => p.state === 'planned' && now >= p.start && now < p.end);
        if (!due) { planSleep(); return; }
        if (plan.busy) return;
        plan.busy = true;
        planRun(due)
            .catch(e => console.warn('[DreamingCrownfall] planned rebellion failed:', e && e.message))
            .finally(() => { plan.busy = false; });
    }

    async function planRun(p) {
        if (!p.seenAt) p = planPatch(p.id, { seenAt: Date.now() }) || p;
        const tier = planTier(p.cost);
        if (!tier) { planFinish(p, 'failed', 'unknown tier'); return; }
        // A press whose answer was not seen (reload, app closed, no verdict): the server decides.
        // Pressing again is only allowed once it says, half a minute on, that nothing runs (rule 3).
        if (p.awaiting) {
            const has = await planServerRebellion();
            if (has === true) { planFinish(p, 'done', 'started'); return; }
            if (has === null || Date.now() - p.pressedAt < PLAN_RECHECK_MS) return;
            p = planPatch(p.id, { awaiting: false }) || p;
        }
        // While you are King the game's panel shows Royal Celebrations; a Rebellion has to wait.
        if (isRoyalMode()) { planReason(p, 'you are King'); return; }
        planWake();
        const button = verifiedStartButton(tier);
        if (!button) {
            const panel = nativeRebellionPanel();
            const why = (nativeTier(tier.cost)?.querySelector('[data-role="rebellion-tier-start"]')?.title || '').trim()
                     || (panel?.querySelector('[data-role="rebellion-message"]')?.textContent || '').trim()
                     || 'waiting for the game';
            planReason(p, why.replace(/\.$/, ''));
            return;
        }
        if ((p.tries || 0) >= PLAN_TRIES) { planFinish(p, 'failed', p.reason || 'no answer from the game'); return; }
        if (p.pressedAt && Date.now() - p.pressedAt < 8000) return;   // never two presses closer than this
        // Written down before the press (rule 3).
        p = planPatch(p.id, { tries: (p.tries || 0) + 1, pressedAt: Date.now(), awaiting: true }) || p;
        keepMenuOnce = true;
        setTimeout(() => { keepMenuOnce = false; }, 0);
        button.click();
        const answer = await planAnswer();
        if (answer.error) {
            // The game said no: nothing was spent, another press is allowed.
            planPatch(p.id, { awaiting: false, reason: answer.error });
            if ((p.tries || 0) >= PLAN_TRIES) planFinish(p, 'failed', answer.error);
            return;
        }
        // The game's "Rebellion started." is overwritten by its own status refresh within a moment,
        // so the verdict is the server's: is a Rebellion running now?
        for (let n = 0; n < 5; n++) {
            if (await planServerRebellion()) { planFinish(p, 'done', 'started'); return; }
            await new Promise(r => setTimeout(r, 2000));
        }
        planReason(p, 'no answer yet, asking the server');   // awaiting stays: the next beats ask again
    }

    function planReason(p, reason) {
        if (p.reason !== reason) planPatch(p.id, { reason });
    }

    // The same read the game makes when its panel opens. true: a Rebellion runs; false: none;
    // null: no answer.
    async function planServerRebellion() {
        try {
            const r = await fetch('/api/rebellions/me', { headers: { Accept: 'application/json' }, cache: 'no-store', credentials: 'include' });
            const body = await r.json().catch(() => null);
            if (!r.ok || body?.ok !== true) return null;
            return !!(body.rebellion && typeof body.rebellion === 'object');
        } catch (e) { return null; }
    }

    // An explicit "no" from the game, in its error colour (9a). Anything else is left to the server.
    async function planAnswer() {
        const until = Date.now() + PLAN_ANSWER_MS;
        while (Date.now() < until) {
            const msg = nativeRebellionPanel()?.querySelector('[data-role="rebellion-message"]');
            const text = (msg?.textContent || '').trim();
            if (/243,\s*164|#f3a4a4/i.test(msg?.style.color || '') && !/^Starting/i.test(text)) return { error: text.replace(/\.$/, '') };
            if (!/^Starting/i.test(text)) return {};
            await new Promise(r => setTimeout(r, 250));
        }
        return {};
    }

    // The game's panel, open and invisible while a plan is due (rule 2).
    function planWake() {
        // The popup is open: it keeps the panel open and fresh itself.
        if (document.documentElement.hasAttribute('data-mcfo-rebpop')) return;
        const panel = nativeRebellionPanel();
        const open = panel && panel.hidden !== true;
        // Opened by the player (without the popup): theirs to look at, not hidden or reopened.
        if (open && !plan.opened) return;
        if (open && Date.now() - plan.woke < PLAN_REWAKE_MS) return;
        document.documentElement.setAttribute('data-mcfo-rebplan', '1');
        if (open) {
            keepMenuOnce = true;
            setTimeout(() => { keepMenuOnce = false; }, 0);
            panel.querySelector('[data-role="rebellion-panel-close"]')?.click();
        }
        plan.woke = Date.now();
        plan.opened = true;
        wakeNativeRebellion();
    }
    function planSleep() {
        if (!plan.opened) return;
        plan.opened = false;
        if (!document.documentElement.hasAttribute('data-mcfo-rebpop')) {
            const panel = nativeRebellionPanel();
            if (panel && panel.hidden !== true) {
                keepMenuOnce = true;
                setTimeout(() => { keepMenuOnce = false; }, 0);
                panel.querySelector('[data-role="rebellion-panel-close"]')?.click();
            }
        }
        document.documentElement.removeAttribute('data-mcfo-rebplan');
    }

    // ---- marks: Rebellion buttons, tileset card, game layout --------------------------------------
    function planMarkText(list) {
        if (list.some(p => !p.seen && (p.state === 'failed' || p.state === 'missed'))) return '!';
        const n = list.filter(p => p.state === 'planned').length;
        return n ? String(n) : '';
    }
    function planMarks(list) {
        const mark = planMarkText(list);
        const buttons = [document.querySelector('.mcfo-rebellion'), glBuilt && glBuilt.buttons.get('rebel')];
        for (const b of buttons) {
            if (!b) continue;
            if ((b.getAttribute('data-mcfo-plan') || '') !== mark) {
                if (mark) b.setAttribute('data-mcfo-plan', mark); else b.removeAttribute('data-mcfo-plan');
            }
        }
        // "Next: Risky Business (14:00) ⚔x25" on the tileset card.
        const line = document.querySelector('.mcfo-nextev');
        if (line) {
            const m = planFirstMark(list);
            let el = line.querySelector('.mcfo-nextev__plan');
            if (!m) { if (el) el.remove(); }
            else {
                if (!el) {
                    el = document.createElement('span');
                    el.className = 'mcfo-nextev__plan';
                    line.appendChild(el);
                }
                if (el.textContent !== m.text) el.textContent = m.text;
                el.setAttribute('data-mcfo-slot', String(m.slot));
                el.title = m.title;
            }
        }
    }
    // The earliest open plan: "⚔x25" when it is for the slot named as next, else with its time.
    function planFirstMark(list) {
        const p = list.filter(x => x.state === 'planned').sort((a, b) => a.start - b.start)[0];
        if (!p) return null;
        const now = planNow();
        const next = nextEv.rows.find(r => r.raw > now);
        const mult = (planTier(p.cost) || {}).mult;
        const when = p.start <= now ? ' now' : next && next.raw === p.start ? '' : ' ' + planClock(p.start);
        return { text: `\u2694x${mult}${when}`, slot: p.start,
                 title: `Planned Rebellion: x${mult} for ${tilesetName(p.tilesetId)} at ${planClock(p.start)} — click to change` };
    }
    // The same mark for the game layout's tileset chip (glTick), as HTML.
    function planNextMarkHtml() {
        const m = planFirstMark(planLoad());
        const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        return m ? ` <span class="mcfo-nextev__plan" data-mcfo-slot="${m.slot}" title="${esc(m.title)}">${esc(m.text)}</span>` : '';
    }
    // A click on a mark opens the popup on Schedule with that slot. Caught on the way down, before
    // the tileset card's own click (which opens the upcoming tilesets) can take it.
    document.addEventListener('click', e => {
        const el = e.target instanceof Element && e.target.closest('.mcfo-nextev__plan');
        if (!el) return;
        e.preventDefault();
        e.stopPropagation();
        showRebellionPopup(el, { mode: 'plan', slot: Number(el.getAttribute('data-mcfo-slot')) || 0 });
    }, true);

    // ---- the popup's Schedule view (9a calls these) -------------------------------------------------
    function buildPlanView(menu) {
        const box = document.createElement('div');
        box.className = 'mcfo-reb__plan';
        box.innerHTML = '<div class="mcfo-reb__slots"></div><div class="mcfo-reb__planline"><div class="mcfo-reb__planmsg"></div>'
                      + '<button type="button" class="mcfo-reb__plancancel" hidden>Cancel plan</button></div>';
        menu.querySelector('.mcfo-reb__grid').before(box);
        // Cancels the plan of the slot picked above — the list below has a Cancel for every plan.
        box.querySelector('.mcfo-reb__plancancel').addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            planCancel(planLoad().filter(p => p.state === 'planned' && p.start === menu._mcfoSlot).map(p => p.id), menu);
        });
        const list = document.createElement('div');
        list.className = 'mcfo-reb__plans';
        menu.appendChild(list);
    }

    function setPopupMode(menu, mode) {
        menu._mcfoMode = mode;
        menu.setAttribute('data-mcfo-mode', mode);
        for (const b of menu.querySelectorAll('.mcfo-reb__mode')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
        for (const b of menu.querySelectorAll('.mcfo-reb__tier[data-mcfo-armed="1"]')) disarm(b);
        if (mode === 'plan') {
            // Opening the Schedule counts as having seen a failed or missed plan.
            const list = planLoad();
            if (list.some(p => !p.seen)) { for (const p of list) p.seen = true; planSave(list); }
            if (!menu._mcfoSlot) menu._mcfoSlot = (planSlots()[0] || {}).raw || 0;
        }
        syncRebellionPopup(menu);
        placePanel(openMenu ? openMenu.anchor : menu, menu);
    }

    function syncPlanView(menu) {
        const list = planLoad();
        const slots = planSlots();
        if (menu._mcfoSlot && !slots.some(r => r.raw === menu._mcfoSlot)) menu._mcfoSlot = (slots[0] || {}).raw || 0;
        const chosen = slots.find(r => r.raw === menu._mcfoSlot) || null;

        // Slots: one button each, the planned tier beside the time.
        const box = menu.querySelector('.mcfo-reb__slots');
        const key = slots.map(r => r.raw + ':' + ((planPending(list, r.raw, r.id) || {}).cost || 0)).join(',') + '|' + menu._mcfoSlot;
        if (box._mcfoKey !== key) {
            box._mcfoKey = key;
            box.textContent = '';
            if (!slots.length) {
                const empty = document.createElement('div');
                empty.className = 'mcfo-reb__planmsg';
                empty.textContent = nextEv.at ? 'Nothing scheduled in the next 12 hours.' : 'Loading the schedule …';
                box.appendChild(empty);
            }
            for (const r of slots) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'mcfo-reb__slot';
                b.setAttribute('aria-pressed', String(r.raw === menu._mcfoSlot));
                const p = planPending(list, r.raw, r.id);
                b.innerHTML = '<span class="mcfo-reb__slotname"></span><span class="mcfo-reb__slottime"></span><span class="mcfo-reb__slotplan"></span>';
                b.children[0].textContent = tilesetName(r.id);
                b.children[1].textContent = planClock(r.raw);
                b.children[2].textContent = p ? `⚔x${(planTier(p.cost) || {}).mult}` : '';
                b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); menu._mcfoSlot = r.raw; syncRebellionPopup(menu); });
                box.appendChild(b);
            }
        }

        const msg = menu.querySelector('.mcfo-reb__planline > .mcfo-reb__planmsg');
        const planned = chosen && planPending(list, chosen.raw, chosen.id);
        const text = !chosen ? 'Pick a tileset first.'
                   : planned ? `Planned: x${planTier(planned.cost).mult} for ${tilesetName(chosen.id)} at ${planClock(chosen.raw)}. Another tier changes it.`
                   : `Pick a tier for ${tilesetName(chosen.id)} at ${planClock(chosen.raw)}. Nothing is spent before it starts — and DreamingCrownfall has to be running then.`;
        if (msg.textContent !== text) msg.textContent = text;
        const cancel = menu.querySelector('.mcfo-reb__plancancel');
        if (cancel.hidden !== !planned) cancel.hidden = !planned;

        // Tiers: all eight, enabled once a slot is picked; the confirm step plans instead of buying.
        for (const b of menu.querySelectorAll('.mcfo-reb__tier')) {
            const tier = REB_TIERS.find(t => String(t.cost) === b.getAttribute('data-mcfo-cost'));
            const quest = questMarkFor('reb', tier.mult).length > 0;
            if (b.hasAttribute('data-mcfo-quest') !== quest) b.toggleAttribute('data-mcfo-quest', quest);
            b.disabled = !chosen;
            b.title = chosen ? '' : 'Pick a tileset first';
            const armed = b.getAttribute('data-mcfo-armed') === '1';
            const isPlanned = !!planned && planned.cost === tier.cost;
            if (b.hasAttribute('data-mcfo-planned') !== isPlanned) b.toggleAttribute('data-mcfo-planned', isPlanned);
            const mult  = armed ? 'Plan?' : `x${tier.mult}`;
            const tiles = armed ? `${number(tier.cost)} diamonds` : isPlanned ? 'planned' : `${tier.mult} tiles`;
            const cost  = armed ? 'click again' : `${number(tier.cost)} diamonds`;
            const [m1, m2, m3] = b.children;
            if (m1.textContent !== mult)  m1.textContent = mult;
            if (m2.textContent !== tiles) m2.textContent = tiles;
            if (m3.textContent !== cost)  m3.textContent = cost;
        }

        drawPlanList(menu, list);
    }

    function drawPlanList(menu, list) {
        const box = menu.querySelector('.mcfo-reb__plans');
        const rows = list.slice().sort((a, b) => a.start - b.start);
        const key = JSON.stringify(rows.map(p => [p.id, p.state, p.cost, p.start, p.reason, p.note]));
        if (box._mcfoKey === key) return;
        box._mcfoKey = key;
        box.textContent = '';
        box.hidden = !rows.length;
        for (const p of rows) {
            const row = document.createElement('div');
            row.className = 'mcfo-reb__planrow';
            row.setAttribute('data-state', p.state);
            const icon = { planned: '⏰', done: '✔', failed: '✖', missed: '⌛' }[p.state] || '•';
            const state = p.state === 'planned'
                ? (p.start <= planNow() ? `due — ${p.reason || 'starting'}` : 'planned')
                : `${p.state}${p.note ? ': ' + p.note : ''}`;
            row.innerHTML = '<span class="mcfo-reb__planicon"></span><span class="mcfo-reb__planwhat"></span><span class="mcfo-reb__planstate"></span><button type="button" class="mcfo-reb__planx"></button>';
            row.children[0].textContent = icon;
            row.children[1].textContent = planLabel(p);
            row.children[2].textContent = state;
            const x = row.children[3];
            x.textContent = p.state === 'planned' ? 'Cancel' : '×';
            x.title = p.state === 'planned' ? 'Cancel this plan' : 'Remove from the list';
            x.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                planCancel([p.id], menu);
            });
            box.appendChild(row);
        }
    }

    // Cancelling or removing works up to the press itself: a plan whose slot is due is taken out
    // of the list before the next beat looks at it (a press already made cannot be undone).
    function planCancel(ids, menu) {
        planSave(planLoad().filter(q => !ids.includes(q.id)));
        syncRebellionPopup(menu);
        planMarks(planLoad());
    }

    function planTierClicked(tier, b, menu) {
        if (b.disabled) return;
        if (b.getAttribute('data-mcfo-armed') !== '1') {
            for (const other of menu.querySelectorAll('.mcfo-reb__tier[data-mcfo-armed="1"]')) disarm(other);
            b.setAttribute('data-mcfo-armed', '1');
            b._mcfoDisarm = setTimeout(() => { disarm(b); syncRebellionPopup(menu); }, REB_CONFIRM_MS);
            syncRebellionPopup(menu);
            return;
        }
        disarm(b);
        const slot = planSlots().find(r => r.raw === menu._mcfoSlot);
        if (!slot) { syncRebellionPopup(menu); return; }
        // One plan per slot: a second tier replaces the first.
        const list = planLoad().filter(p => !(p.state === 'planned' && p.start === slot.raw));
        list.push({ id: Math.random().toString(36).slice(2, 10), tilesetId: slot.id, start: slot.raw, end: slot.end,
                    cost: tier.cost, state: 'planned', createdAt: Date.now() });
        planSave(list);
        syncRebellionPopup(menu);
        planMarks(list);
    }
