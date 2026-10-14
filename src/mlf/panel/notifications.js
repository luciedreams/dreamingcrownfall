    // =========================================================================================
    // 11g. NOTIFICATIONS: THE GAME'S UNATTENDED VIEWING (MLF 6.62, app version)
    // =========================================================================================
    // Game build v0.10.6b added "Unattended Viewing Mode" (unattendedViewing.js): while it is on,
    // the diamond reward pop-up no longer covers the board. A short line bottom left says what
    // came in and goes after 10 to 60 seconds; the rewards are credited anyway, and the summary
    // since the last OK waits behind "Review rewards". The game put the switch into the panel
    // behind its sound button, which the gear hides.
    //
    // The game keeps the choice per page (localStorage mcf.unattendedViewing.v1), and every
    // account tab has its own storage. In the app the choice is ONE app setting for all accounts
    // (notify.unattended, notify.unattendedSeconds); every tab compares its game against it and
    // works the game's hidden controls where they differ — a click on
    // [data-role="unattended-toggle"], a change event on [data-role="unattended-seconds"], exactly
    // the path the game's own panel takes. Review rewards stays per tab: each account has its own
    // summary. Guests and signed-out tabs are left alone, the game ignores the controls there.
    const unattendedEl = r => soundEl('unattended-' + r);

    function unattendedState() {
        const toggle = unattendedEl('toggle');
        if (!toggle) return null;
        const box = toggle.closest('[data-role="unattended-controls"]');
        const review = unattendedEl('review-rewards');
        return {
            signedIn: !!box && !box.hidden,
            on: toggle.getAttribute('aria-pressed') === 'true',
            seconds: Number((unattendedEl('seconds') || {}).value) || 20,
            pending: !!review && !review.disabled,
        };
    }

    function unattendedSeconds(value) {
        const input = unattendedEl('seconds');
        if (!input || Number(input.value) === Number(value)) return;
        input.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function unattendedWanted() {
        const api = typeof window.dcfApp === 'object' && window.dcfApp;
        if (!api) return null;
        const s = api.settings();
        return { on: s['notify.unattended'] === true, seconds: Number(s['notify.unattendedSeconds']) || 20 };
    }

    // Brings this tab's game in line with the app setting. Cheap enough for a timer: two lookups
    // and nothing written while they agree. The timer catches the controls appearing after the
    // game has drawn its panel, and a sign-in that unhides them.
    function unattendedSync() {
        const want = unattendedWanted();
        const u = unattendedState();
        if (!want || !u || !u.signedIn) return;
        if (u.seconds !== want.seconds) unattendedSeconds(want.seconds);
        if (u.on !== want.on) unattendedEl('toggle').click();
    }
    if (typeof window.dcfApp === 'object' && window.dcfApp) {
        if (window.dcfApp.onChange) window.dcfApp.onChange(() => unattendedSync());
        setInterval(unattendedSync, 3000);
    }

    // The game redraws its controls when a reward summary starts or stops waiting. One observer
    // per open page follows that, so "Review rewards" lights up while the page is open.
    let unattendedWatch = null;
    function watchUnattended(card, redraw) {
        if (unattendedWatch) unattendedWatch.disconnect();
        const box = unattendedEl('toggle') && unattendedEl('toggle').closest('[data-role="unattended-controls"]');
        if (!box) return;
        let queued = false;
        unattendedWatch = new MutationObserver(() => {
            if (!card.isConnected) { unattendedWatch.disconnect(); unattendedWatch = null; return; }
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => { queued = false; if (card.isConnected) redraw(); });
        });
        unattendedWatch.observe(box, { attributes: true, childList: true, subtree: true, characterData: true });
    }

    // A button only while there is something to review. A disabled .mcfo-set__reset is hidden on
    // purpose (the reset buttons of the sliders vanish at their default), so the other states are
    // a line of text instead.
    function unattendedReviewControl(why) {
        if (why) {
            const t = document.createElement('span');
            t.className = 'mcfo-set__hint';
            t.textContent = why;
            return t;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mcfo-set__reset';
        btn.textContent = 'Review rewards (pending)';
        btn.addEventListener('click', () => { const b = unattendedEl('review-rewards'); if (b && !b.disabled) b.click(); });
        return btn;
    }

    // Card for Settings › Notifications: the switch and the duration are app settings (all
    // accounts), the review button belongs to the account of this tab.
    function notificationsCard(redraw) {
        const card = document.createElement('div');
        card.className = 'mcfo-set__card';
        const api = window.dcfApp;
        const want = unattendedWanted() || { on: false, seconds: 20 };
        const u = unattendedState();

        const wrap = document.createElement('div');
        wrap.className = 'mcfo-set__item';
        const row = document.createElement('label');
        row.className = 'mcfo-set__row';
        row.innerHTML = '<span class="mcfo-set__text"><span class="mcfo-set__label"></span>'
                      + '<span class="mcfo-set__hint"></span></span>'
                      + '<input type="checkbox" class="mcfo-switch__input">'
                      + '<span class="mcfo-switch" aria-hidden="true"></span>';
        row.querySelector('.mcfo-set__label').textContent = 'Unattended viewing';
        row.querySelector('.mcfo-set__hint').textContent = 'For long viewing sessions or a stream, on every account. The diamond '
            + 'reward pop-up no longer covers the board: a short line bottom left says what came in and goes after the time below. '
            + 'The rewards are credited anyway; the summary since your last OK waits under Review rewards.';
        const input = row.querySelector('input');
        input.checked = want.on;
        input.addEventListener('change', () => { api.set('notify.unattended', input.checked); unattendedSync(); });
        wrap.appendChild(row);

        const time = document.createElement('div');
        time.className = 'mcfo-set__sub';
        time.innerHTML = '<span class="mcfo-set__sublabel">Notice duration</span>'
                       + '<input type="range" class="mcfo-set__range" min="10" max="60" step="1">'
                       + '<span class="mcfo-set__val"></span>';
        const range = time.querySelector('input');
        const val = time.querySelector('.mcfo-set__val');
        range.value = want.seconds;
        val.textContent = want.seconds + ' s';
        range.addEventListener('input', () => { val.textContent = range.value + ' s'; });
        range.addEventListener('change', () => { api.set('notify.unattendedSeconds', Number(range.value)); unattendedSync(); });
        time.toggleAttribute('data-off', !want.on);

        const review = document.createElement('div');
        review.className = 'mcfo-set__sub';
        review.innerHTML = '<span class="mcfo-set__sublabel">This account</span>';
        review.appendChild(unattendedReviewControl(!u ? 'Not loaded yet' : !u.signedIn ? 'Not signed in with Twitch'
            : u.pending ? '' : 'Nothing to review'));

        wrap.append(time, review);
        card.appendChild(wrap);
        watchUnattended(card, redraw);
        return card;
    }
