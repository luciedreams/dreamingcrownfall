    // =========================================================================================
    // DREAMINGCROWNFALL: WELCOME STEPS (app 0.3.0)
    // =========================================================================================
    // Once, on a new installation (the app sets app.onboarded = false only there): welcome,
    // signing in, more accounts, and how to start — plain like the website (the default) or with
    // everything switched on — then the tour or straight into the game. Signing in with Twitch
    // reloads the page, so the step is kept and the steps pick up where they were. Only one tab
    // shows them (the app hands the turn to the first one that asks).
    const WEL_STEP_KEY = 'dcf_welcome_step';
    const WEL_CSS_ID = 'dcf-wel-css';
    let welState = null;

    function welStyles() {
        if (document.getElementById(WEL_CSS_ID)) return;
        const s = document.createElement('style');
        s.id = WEL_CSS_ID;
        s.textContent = `
            .dcf-wel { position: fixed; inset: 0; z-index: 2147482950; display: grid; place-items: center; padding: 20px;
                background: rgba(9, 6, 16, 0.72); backdrop-filter: blur(6px); font-family: inherit; color: #ece4f7; }
            .dcf-wel__card { position: relative; width: min(560px, 100%); border-radius: 18px; overflow: hidden;
                background: linear-gradient(180deg, #201634, #120d1c); border: 1px solid rgba(180, 138, 232, 0.25);
                box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7); animation: dcf-pn-rise 220ms cubic-bezier(.2, .8, .2, 1); }
            .dcf-wel__card::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px;
                background: linear-gradient(90deg, transparent, #ffd36e 30%, #b48ae8 70%, transparent); }
            .dcf-wel__body { padding: 28px 30px 8px; }
            .dcf-wel__head { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
            .dcf-wel__head .dcf-pn__logo { width: 52px; height: 52px; flex: none; }
            .dcf-wel__kicker { color: #ffd36e; font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
            .dcf-wel__title { margin: 2px 0 0; font-size: 24px; font-weight: 800; }
            .dcf-wel p { margin: 0 0 12px; color: #cfc4e2; font-size: 14px; line-height: 1.55; }
            .dcf-wel__status { display: flex; align-items: center; gap: 10px; margin: 6px 0 14px; padding: 12px 14px; border-radius: 12px;
                background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(180, 138, 232, 0.16); font-weight: 600; }
            .dcf-wel__status::before { content: ''; width: 9px; height: 9px; border-radius: 50%; background: #e0a050; flex: none; }
            .dcf-wel__status[data-ok]::before { background: #7fd99a; box-shadow: 0 0 6px #7fd99a; }
            .dcf-wel__choices { display: grid; gap: 10px; margin: 4px 0 14px; }
            .dcf-wel__choice { display: flex; gap: 12px; align-items: flex-start; padding: 13px 14px; border-radius: 12px; cursor: pointer;
                border: 1px solid rgba(180, 138, 232, 0.18); background: rgba(255, 255, 255, 0.03); text-align: left; font: inherit; color: inherit; }
            .dcf-wel__choice[aria-pressed="true"] { border-color: #ffd36e; background: rgba(255, 211, 110, 0.07); }
            .dcf-wel__choice b { display: block; margin-bottom: 3px; }
            .dcf-wel__choice span { color: #a99cc0; font-size: 13px; line-height: 1.45; }
            .dcf-wel__radio { width: 16px; height: 16px; margin-top: 2px; border-radius: 50%; border: 2px solid #7d7194; flex: none; }
            .dcf-wel__choice[aria-pressed="true"] .dcf-wel__radio { border-color: #ffd36e; box-shadow: inset 0 0 0 3px #1a1328, inset 0 0 0 8px #ffd36e; }
            .dcf-wel__switches { border-radius: 12px; border: 1px solid rgba(180, 138, 232, 0.14); overflow: hidden; margin-bottom: 8px; }
            .dcf-wel__sw { position: relative; display: flex; align-items: center; gap: 12px; padding: 11px 14px; cursor: pointer; }
            .dcf-wel__sw + .dcf-wel__sw { border-top: 1px solid rgba(180, 138, 232, 0.12); }
            .dcf-wel__sw > span:first-child { flex: 1; font-weight: 600; font-size: 13.5px; }
            .dcf-wel .mcfo-switch__input:checked + .mcfo-switch { background: #8b5cf6 !important; box-shadow: inset 0 0 0 1px #b48ae8 !important; }
            .dcf-wel__foot { display: flex; align-items: center; gap: 10px; padding: 14px 30px 22px; }
            .dcf-wel__dots { display: flex; gap: 6px; margin-right: auto; }
            .dcf-wel__dots i { width: 8px; height: 8px; border-radius: 50%; background: rgba(180, 138, 232, 0.25); }
            .dcf-wel__dots i[data-on] { background: #ffd36e; }
            .dcf-wel__btn { font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; padding: 9px 16px; border-radius: 10px;
                color: #ece4f7; background: transparent; border: 1px solid rgba(180, 138, 232, 0.35); }
            .dcf-wel__btn:hover { background: rgba(180, 138, 232, 0.12); }
            .dcf-wel__btn--main { border: 0; color: #1a1026; background: linear-gradient(180deg, #ffe08f, #f2b84b); }
            .dcf-wel__btn--main:hover { background: linear-gradient(180deg, #ffe7a6, #f5c25f); }
            .dcf-wel__skip { font: inherit; font-size: 12.5px; color: #8f84a6; background: none; border: 0; cursor: pointer; }
            .dcf-wel__skip:hover { color: #ece4f7; }`;
        document.head.appendChild(s);
    }

    function welEl(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function welFinish(then) {
        const api = pageWindow.dcfApp;
        try { api && api.set('app.onboarded', true); } catch (e) {}
        try { localStorage.removeItem(WEL_STEP_KEY); localStorage.setItem(WHATSNEW_SEEN, SCRIPT_VERSION); } catch (e) {}
        if (welState) { clearInterval(welState.timer); welState.root.remove(); welState = null; }
        if (then === 'tour') setTimeout(() => startTour(), 200);
    }

    function welSwitch(api, key, label) {
        const row = welEl('label', 'dcf-wel__sw');
        const input = welEl('input', 'mcfo-switch__input');
        input.type = 'checkbox';
        input.checked = !!api.settings()[key];
        input.addEventListener('change', () => api.set(key, input.checked));
        row.append(welEl('span', null, label), input, welEl('span', 'mcfo-switch'));
        return row;
    }

    function welDraw() {
        const { card, step } = welState;
        const api = pageWindow.dcfApp;
        try { localStorage.setItem(WEL_STEP_KEY, String(step)); } catch (e) {}
        clearInterval(welState.timer);
        const body = welEl('div', 'dcf-wel__body');
        const head = welEl('div', 'dcf-wel__head');
        head.insertAdjacentHTML('afterbegin', PN_LOGO);
        const titles = welEl('div');
        const STEPS = ['Welcome', 'Sign in', 'Accounts', 'Your start'];
        titles.append(welEl('div', 'dcf-wel__kicker', `DreamingCrownfall · ${STEPS[step]}`), welEl('div', 'dcf-wel__title'));
        head.appendChild(titles);
        body.appendChild(head);
        const title = titles.lastChild;
        const foot = welEl('div', 'dcf-wel__foot');
        const dots = welEl('div', 'dcf-wel__dots');
        STEPS.forEach((_, k) => { const d = welEl('i'); if (k === step) d.setAttribute('data-on', ''); dots.appendChild(d); });
        foot.appendChild(dots);
        const btn = (label, cls, run) => { const b = welEl('button', cls, label); b.type = 'button'; b.addEventListener('click', run); return b; };
        const next = () => { welState.step++; welDraw(); };
        const back = () => { welState.step--; welDraw(); };

        if (step === 0) {
            title.textContent = 'Welcome!';
            body.append(welEl('p', null, 'Marble Crownfall as a desktop app: several accounts in tabs, notifications, a HUD and a lot more you can switch on.'),
                welEl('p', null, 'It starts out exactly like the website. Nothing is changed until you want it — four short steps, then the game is yours.'));
            foot.append(btn('Skip', 'dcf-wel__skip', () => welFinish()), btn('Let’s start', 'dcf-wel__btn dcf-wel__btn--main', next));
        } else if (step === 1) {
            title.textContent = 'Sign in with Twitch';
            body.appendChild(welEl('p', null, 'Guests can watch. To bid, earn tickets and play with your own name, sign in with Twitch. The login stays in this app, in this tab.'));
            const status = welEl('div', 'dcf-wel__status');
            const draw = () => {
                const name = accountName();
                status.toggleAttribute('data-ok', !!name);
                status.textContent = name ? `Signed in as ${name}` : 'Not signed in yet';
            };
            draw();
            welState.timer = setInterval(draw, 1000);
            body.appendChild(status);
            const login = btn('Log in with Twitch', 'dcf-wel__btn', () => { const c = document.querySelector('[data-role="profile-entry"]'); if (c) c.click(); });
            if (!accountName()) body.appendChild(login);
            foot.append(btn('Back', 'dcf-wel__btn', back), btn('Next', 'dcf-wel__btn dcf-wel__btn--main', next));
        } else if (step === 2) {
            title.textContent = 'More than one account?';
            body.append(welEl('p', null, 'Every tab at the very top of the window is one account with its own login. "+" adds one, × signs one out, Ctrl+1 to 9 switch between them.'),
                welEl('p', null, 'With two or more you get Home: every account at a glance, with tickets, gold and what is waiting to be claimed.'));
            if (api && api.addAccount) {
                const add = btn('+ Add another account', 'dcf-wel__btn', () => { api.addAccount(); add.textContent = 'Added — sign it in in its tab later'; add.disabled = true; });
                body.appendChild(add);
            }
            foot.append(btn('Back', 'dcf-wel__btn', back), btn('Next', 'dcf-wel__btn dcf-wel__btn--main', next));
        } else {
            title.textContent = 'How do you want to start?';
            const choices = welEl('div', 'dcf-wel__choices');
            const plain = !!api.settings()['game.plain'];
            const choice = (on, head, text, run) => {
                const c = welEl('button', 'dcf-wel__choice');
                c.type = 'button';
                c.setAttribute('aria-pressed', String(on));
                const t = welEl('div');
                t.append(welEl('b', null, head), welEl('span', null, text));
                c.append(welEl('span', 'dcf-wel__radio'), t);
                c.addEventListener('click', () => { run(); welDraw(); });
                return c;
            };
            choices.append(
                choice(plain, 'Plain, like the website', 'The game as it is. Switch on what you like in Settings, one thing at a time.', () => {
                    Object.assign(settings, settingDefaults, plainValues()); saveSettings(); apply(); api.set('game.plain', true);
                }),
                choice(!plain, 'Everything switched on', 'Themes, the new inventory and achievements, the enhanced header, chat extras and more — all of it on, ready to tune.', () => {
                    Object.assign(settings, settingDefaults); saveSettings(); apply(); api.set('game.plain', false);
                }),
            );
            const sw = welEl('div', 'dcf-wel__switches');
            sw.append(welSwitch(api, 'notify.enabled', 'Desktop notifications'),
                welSwitch(api, 'windows.popOut', 'Windows of the game as windows of their own'),
                welSwitch(api, 'app.autostart', 'Start with your computer'));
            body.append(choices, sw, welEl('p', null, 'All of it can be changed later in Settings. A short tour shows how the game works and what the app adds.'));
            foot.append(btn('Back', 'dcf-wel__btn', back), btn('Start playing', 'dcf-wel__btn', () => welFinish()),
                btn('Take the tour', 'dcf-wel__btn dcf-wel__btn--main', () => welFinish('tour')));
        }
        card.replaceChildren(body, foot);
        const main = foot.querySelector('.dcf-wel__btn--main');
        if (main) main.focus({ preventScroll: true });
    }

    function showWelcome() {
        if (welState) return;
        welStyles();
        pnStyles();
        const root = welEl('div', 'dcf-wel');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Welcome');
        const card = welEl('div', 'dcf-wel__card');
        root.appendChild(card);
        document.body.appendChild(root);
        let step = 0;
        try { step = Math.max(0, Math.min(3, Number(localStorage.getItem(WEL_STEP_KEY)) || 0)); } catch (e) {}
        welState = { root, card, step, timer: 0 };
        welDraw();
    }

    // At start-up instead of What's new: the welcome steps on a new installation (one tab only).
    function startupCards() {
        const api = window.top === window.self ? pageWindow.dcfApp : null;
        let fresh = false;
        try { fresh = !!api && api.settings()['app.onboarded'] === false && api.welcomeClaim(); } catch (e) {}
        if (fresh) showWelcome(); else maybeShowWhatsNew();
    }
