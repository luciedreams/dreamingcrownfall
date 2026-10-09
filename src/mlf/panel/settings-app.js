    // =========================================================================================
    // SETTINGS — DreamingCrownfall
    // =========================================================================================
    // One panel over the game, like the settings of a desktop app: categories down the left
    // (App, Game, About), a search over every switch on top, the controls on the right. The
    // controls themselves are the ones the old window used (settingItem, themeCard, soundCard,
    // performanceCard, ... via sectionContent) — only the frame and the order are new.
    //
    // App pages talk to the app through window.dcfApp (src/preload.js): notifications, Discord and
    // starting with the system belong to the app, not to the page.
    const DCF_SET_CSS_ID = 'dcf-set-css';
    const DCF_SET_PAGE_KEY = 'dcf_settings_page';
    let dcfSet = null;   // { root, page, query, keyHandler, content, search } while open

    const DCF_ICONS = {
        general: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
        bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
        discord: '<path d="M8 17c-2 1-4 1-5 0 0-5 1-9 3-11 1.5-1 3-1.3 4-1.3l.5 1c1-.2 2-.2 3 0l.5-1c1 0 2.5.3 4 1.3 2 2 3 6 3 11-1 1-3 1-5 0l-1-1.5"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/>',
        palette: '<path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.4 3.4A1.6 1.6 0 0 1 12 22Z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16.5" cy="10.5" r="1"/>',
        gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
        layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
        crown: '<path d="M3 18h18l-2-11-5 5-2-7-2 7-5-5-2 11Z"/>',
        chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
        sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z"/>',
        bag: '<path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
        box: '<path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
        sound: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h0"/>',
        hud: '<rect x="2" y="6" width="20" height="6" rx="2"/><path d="M6 9h.01M10 9h4M18 9h.01"/><path d="M5 16h14M8 19h8"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
        close: '<path d="M18 6 6 18M6 6l12 12"/>',
    };
    const dcfIcon = (name, cls = 'dcf-set__icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DCF_ICONS[name] || ''}</svg>`;

    // The order of the panel. A game page is made of parts: an existing section (by its title) or
    // one of the special cards. Every section of SETTINGS_SECTIONS appears exactly once.
    const DCF_NAV = [
        { group: 'App', pages: [
            { id: 'general', title: 'General', icon: 'general', blurb: 'How the app starts, its windows, shortcuts, stability and your accounts.', app: 'general' },
            { id: 'notifications', title: 'Notifications', icon: 'bell', blurb: 'Desktop notifications for every account, also while the window is in the background.', app: 'notifications' },
            { id: 'discord', title: 'Discord', icon: 'discord', blurb: 'Show on your Discord profile that you are playing.', app: 'discord' },
            { id: 'hud', title: 'HUD', icon: 'hud', blurb: 'A small always-on-top window with what you want to keep an eye on. F2 opens and closes it.', app: 'hud' },
        ]},
        { group: 'Game', pages: [
            { id: 'appearance', title: 'Appearance', icon: 'palette', blurb: 'Theme, colours and how windows look over the board.', parts: ['Theme', 'Windows'] },
            { id: 'performance', title: 'Performance', icon: 'gauge', blurb: 'Lighter drawing for slower machines, and the game\'s own graphics.', parts: ['Performance'] },
            { id: 'screen', title: 'Game screen', icon: 'layout', blurb: 'The header cards, the ticket rail and the footer.', parts: ['Header', 'Ticket rail', 'Footer'] },
            { id: 'king', title: 'King & throne', icon: 'crown', blurb: 'The king tile, and what happens while you sit on the throne.', parts: ['King tile', 'On the throne'] },
            { id: 'chat', title: 'Chat', icon: 'chat', blurb: 'Messages, emotes, buttons and the enhanced chat.', parts: ['Chat'] },
            { id: 'cosmetics', title: 'Cosmetics', icon: 'sparkle', blurb: 'Hide cosmetics of marbles, chat and King — only for you.', parts: ['Cosmetics'] },
            { id: 'shop', title: 'Shop & dailies', icon: 'bag', blurb: 'Quest hints, euro prices and your daily rewards.', parts: ['Shop and dailies'] },
            { id: 'collection', title: 'Inventory & achievements', icon: 'box', blurb: 'The new inventory and achievements pages.', parts: ['Inventory', 'Achievements'] },
            { id: 'sound', title: 'Sound & music', icon: 'sound', blurb: 'Sound effects and the music player.', parts: ['Sound'] },
        ]},
        { group: 'About', pages: [
            { id: 'about', title: 'About', icon: 'info', blurb: 'Version, what\'s new and starting over.', app: 'about' },
        ]},
    ];
    const DCF_PAGES = DCF_NAV.flatMap(g => g.pages);
    const dcfPageOfSection = title => DCF_PAGES.find(p => (p.parts || []).includes(title));

    // Settings that belong to the app (window.dcfApp), with what the search finds them by.
    const DCF_APP_ITEMS = [
        { page: 'general', part: 'windows', key: 'windows.popOut', label: 'Every window on its own', hint: 'Inventory, leaderboards, shop and the other windows open as windows of their own, to move anywhere, also onto another screen. Off: they open inside the game as before, and ⧉ in a window\'s title bar takes that one out. The chat always opens inside the game.' },
        { page: 'general', part: 'stability', key: 'stability.recover', label: 'Recover on its own', hint: 'A tab that hangs for 30 seconds or crashes reloads itself; a page that does not load tries again. After sleep or a lost internet connection every tab reloads once, so chat and tickets do not sit on a dead connection.' },
        { page: 'general', part: 'shortcuts', key: 'shortcuts.global', label: 'Shortcuts outside the app', hint: 'Work while you are in another program too: Ctrl+Alt+M shows or hides the window, Ctrl+Alt+N goes to your next account, Ctrl+Alt+C puts the cursor in the chat. On Linux with Wayland the desktop asks once whether the app may have them. Inside the app, F2 opens and closes the HUD, a slim always-on-top bar with the King, a Royal Celebration and your tickets.' },
        { page: 'general', key: 'app.autostart', label: 'Start with your computer', hint: 'Starts hidden in the tray when you log in, so notifications keep coming and your sessions stay fresh without opening the window.' },
        { page: 'notifications', key: 'notify.enabled', label: 'Desktop notifications', hint: 'All notifications of the app. Switch off to silence everything at once.' },
        { page: 'notifications', key: 'notify.onlyWhenAway', label: 'Only when you are not looking', hint: 'Nothing pops up for the account you have in front of you. Hidden tabs, another app in front or the window in the tray still notify.', needs: 'notify.enabled' },
        { page: 'notifications', key: 'notify.mention', label: 'Mentions in chat', hint: 'Someone writes the name of one of your accounts in the game chat.', needs: 'notify.enabled', event: true },
        { page: 'notifications', key: 'notify.king', label: 'Throne won or lost', hint: 'One of your accounts becomes King, or loses the crown.', needs: 'notify.enabled', event: true },
        { page: 'notifications', key: 'notify.celebration', label: 'Royal Celebration', hint: 'A Royal Celebration starts.', needs: 'notify.enabled', event: true },
        { page: 'notifications', key: 'notify.rebellion', label: 'Rebellion', hint: 'Somebody starts a Rebellion.', needs: 'notify.enabled', event: true },
        { page: 'notifications', key: 'notify.achievement', label: 'Achievements', hint: 'One of your accounts unlocks an achievement.', needs: 'notify.enabled', event: true },
        { page: 'notifications', key: 'notify.gift', label: 'Gifts', hint: 'Another player sends one of your accounts gold or diamonds.', needs: 'notify.enabled', event: true },
        { page: 'notifications', key: 'notify.shopQuest', label: 'Shop items for your quests', hint: 'The shop has an item that completes one of today\'s open shop quests, and the account does not own it yet.', needs: 'notify.enabled', event: true },
        { page: 'discord', key: 'discord.enabled', label: 'Show on Discord', hint: 'Opt-in. Your Discord profile shows "Playing Marble Crownfall" while the app runs. Needs the Discord app (or Vesktop) running on this computer.' },
        { page: 'discord', key: 'discord.showAccount', label: 'Show the account', hint: 'The name of the account in the tab you are looking at.', needs: 'discord.enabled' },
        { page: 'discord', key: 'discord.showKing', label: 'Show when you are King', hint: '"King for 12 min" while one of your accounts sits on the throne.', needs: 'discord.enabled' },
    ];

    function dcfSetStyles() {
        if (document.getElementById(DCF_SET_CSS_ID)) return;
        const s = document.createElement('style');
        s.id = DCF_SET_CSS_ID;
        s.textContent = `
            .dcf-set {
                --ds-bg1: #201634; --ds-bg2: #120d1c; --ds-side: rgba(10, 7, 18, 0.55); --ds-card: rgba(255, 255, 255, 0.035);
                --ds-line: rgba(180, 138, 232, 0.2); --ds-line2: rgba(180, 138, 232, 0.12);
                --ds-text: #ece4f7; --ds-muted: #a99cc0; --ds-dim: #7d7194; --ds-violet: #b48ae8; --ds-violet2: #8b5cf6; --ds-gold: #ffd36e;
                position: fixed; inset: 0; z-index: 2147482900; display: grid; place-items: center; padding: 20px;
                background: rgba(9, 6, 16, 0.66); backdrop-filter: blur(6px) saturate(0.85);
                font-family: inherit; color: var(--ds-text); animation: dcf-pn-fade 160ms ease-out;
            }
            html[data-mcfo-perf~="noblur"] .dcf-set { backdrop-filter: none; background: rgba(9, 6, 16, 0.82); }
            .dcf-set__panel {
                position: relative; display: grid; grid-template-columns: 250px 1fr;
                width: min(1180px, 100%); height: min(88vh, 900px);
                background: linear-gradient(180deg, var(--ds-bg1), var(--ds-bg2));
                border: 1px solid var(--ds-line); border-radius: 18px; overflow: clip;
                box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06);
                animation: dcf-pn-rise 200ms cubic-bezier(.2, .8, .2, 1);
            }
            .dcf-set__panel::before {
                content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; z-index: 2;
                background: linear-gradient(90deg, transparent, var(--ds-gold) 30%, var(--ds-violet) 70%, transparent); opacity: 0.85;
            }
            /* ---- left column ---- */
            .dcf-set__nav { display: flex; flex-direction: column; min-height: 0; background: var(--ds-side); border-right: 1px solid var(--ds-line2); }
            .dcf-set__brand { display: flex; align-items: center; gap: 12px; padding: 22px 20px 16px; }
            .dcf-set__brand .dcf-pn__logo { width: 38px; height: 38px; }
            .dcf-set__brand-name { font-size: 10.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ds-gold); }
            .dcf-set__brand-title { font-size: 20px; font-weight: 800; margin-top: 2px; }
            .dcf-set__groups { flex: 1; overflow: auto; padding: 4px 10px 12px; scrollbar-width: thin; }
            .dcf-set__group { margin: 14px 10px 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ds-dim); }
            .dcf-set__navbtn {
                display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 12px; margin: 1px 0;
                font: inherit; font-size: 14px; font-weight: 600; text-align: left; color: var(--ds-muted);
                background: transparent; border: 0; border-radius: 9px; cursor: pointer;
            }
            .dcf-set__navbtn:hover { background: rgba(180, 138, 232, 0.08); color: var(--ds-text); }
            .dcf-set__navbtn[aria-current="page"] { background: rgba(180, 138, 232, 0.18); color: var(--ds-text); box-shadow: inset 3px 0 0 var(--ds-gold); }
            .dcf-set__icon { width: 18px; height: 18px; flex: none; }
            .dcf-set__navfoot { padding: 12px 22px 18px; font-size: 12px; color: var(--ds-dim); border-top: 1px solid var(--ds-line2); }
            /* ---- right column ---- */
            .dcf-set__main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
            .dcf-set__top { display: flex; align-items: flex-start; gap: 16px; padding: 22px 26px 14px; border-bottom: 1px solid var(--ds-line2); }
            .dcf-set__heading { flex: 1; min-width: 0; }
            .dcf-set__title { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em; }
            .dcf-set__blurb { margin: 4px 0 0; font-size: 13.5px; color: var(--ds-muted); }
            .dcf-set__search { position: relative; width: 300px; flex: none; }
            .dcf-set__search .dcf-set__icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--ds-dim); pointer-events: none; }
            .dcf-set__search input {
                width: 100%; box-sizing: border-box; padding: 10px 12px 10px 38px; font: inherit; font-size: 14px; color: var(--ds-text);
                background: rgba(0, 0, 0, 0.28); border: 1px solid var(--ds-line); border-radius: 10px; outline: none;
            }
            .dcf-set__search input:focus { border-color: var(--ds-violet); box-shadow: 0 0 0 3px rgba(180, 138, 232, 0.18); }
            .dcf-set__close { flex: none; display: grid; place-items: center; width: 38px; height: 38px; color: var(--ds-muted); background: transparent; border: 1px solid var(--ds-line2); border-radius: 10px; cursor: pointer; }
            .dcf-set__close:hover { color: var(--ds-text); background: rgba(180, 138, 232, 0.12); }
            .dcf-set__content { flex: 1; overflow: auto; padding: 8px 26px 30px; scrollbar-width: thin; scrollbar-color: rgba(180, 138, 232, 0.4) transparent; }
            .dcf-set__part { margin-top: 18px; }
            .dcf-set__parthead { display: flex; align-items: baseline; gap: 12px; margin: 0 2px 8px; }
            .dcf-set__parttitle { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ds-gold); }
            .dcf-set__partblurb { flex: 1; font-size: 12.5px; color: var(--ds-dim); }
            .dcf-set__linkbtn { font: inherit; font-size: 12.5px; font-weight: 600; color: var(--ds-violet); background: none; border: 0; padding: 2px 4px; cursor: pointer; }
            .dcf-set__linkbtn:hover { color: var(--ds-text); text-decoration: underline; }
            .dcf-set__note { margin: 10px 2px 0; font-size: 12.5px; line-height: 1.5; color: var(--ds-muted); }
            .dcf-set__empty { margin: 40px auto; text-align: center; color: var(--ds-muted); font-size: 14px; }
            .dcf-set__resulthead { display: flex; align-items: center; gap: 10px; margin: 20px 2px 8px; }
            .dcf-set__resulthead .dcf-set__icon { color: var(--ds-violet); }
            .dcf-set__resulthead span { flex: 1; font-size: 13px; font-weight: 800; color: var(--ds-text); }
            .dcf-set__btn { font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; padding: 9px 15px; border-radius: 10px; color: var(--ds-text); background: transparent; border: 1px solid var(--ds-line); }
            .dcf-set__btn:hover { background: rgba(180, 138, 232, 0.12); border-color: rgba(180, 138, 232, 0.5); }
            .dcf-set__btn--main { border: 0; color: #1a1026; background: linear-gradient(180deg, #ffe08f, #f2b84b); }
            .dcf-set__btn--main:hover { background: linear-gradient(180deg, #ffe7a6, #f5c25f); }
            .dcf-set__btn:disabled { opacity: 0.5; cursor: default; }
            /* ---- HUD page ---- */
            .dcf-hudprev { display: flex; align-items: center; justify-content: center; min-height: 120px; padding: 24px; border-radius: 12px; overflow: auto;
                border: 1px solid var(--ds-line2); background: repeating-conic-gradient(#2b2339 0% 25%, #211a2d 0% 50%) 0 0 / 22px 22px; }
            .dcf-hudprev__bar { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
            .dcf-hudprev__bar .dcf-set__note { margin: 0; }
            .dcf-hudrow { position: relative; display: flex; align-items: center; gap: 10px; padding: 9px 14px 9px 16px; }
            .dcf-hudrow + .dcf-hudrow { border-top: 1px solid var(--ds-line2); }
            .dcf-hudrow__name { flex: 1; font-weight: 600; cursor: pointer; }
            .dcf-hudrow__sw { position: relative; display: inline-flex; cursor: pointer; }
            .dcf-hudrow[data-off] .dcf-hudrow__name { color: var(--ds-dim); }
            .dcf-hudrow__mv { font: inherit; width: 28px; height: 26px; border-radius: 7px; border: 1px solid var(--ds-line2); background: transparent; color: var(--ds-muted); cursor: pointer; }
            .dcf-hudrow__mv:hover:not(:disabled) { color: var(--ds-text); border-color: var(--ds-violet); }
            .dcf-hudrow__mv:disabled { opacity: 0.3; cursor: default; }
            .dcf-hudrow .mcfo-switch { margin-left: 6px; cursor: pointer; }
            .dcf-hudlook { display: grid; grid-template-columns: 110px 1fr; gap: 14px 16px; align-items: center; padding: 16px; }
            .dcf-hudlook > span { color: var(--ds-muted); font-weight: 600; }
            .dcf-seg { display: inline-flex; justify-self: start; border: 1px solid var(--ds-line); border-radius: 9px; overflow: hidden; }
            .dcf-seg button { font: inherit; font-size: 12.5px; font-weight: 700; padding: 7px 14px; border: 0; background: transparent; color: var(--ds-muted); cursor: pointer; }
            .dcf-seg button + button { border-left: 1px solid var(--ds-line2); }
            .dcf-seg button[aria-pressed="true"] { background: rgba(180, 138, 232, 0.24); color: var(--ds-text); }
            .dcf-hudlook__range { display: flex; align-items: center; gap: 12px; }
            .dcf-hudlook__range input { flex: 1; max-width: 320px; accent-color: #b48ae8; }
            .dcf-hudlook__range b { min-width: 44px; font-variant-numeric: tabular-nums; }
            .dcf-set__btn--danger { border-color: rgba(224, 122, 122, 0.4); color: #f2b3b3; }
            .dcf-set__btn--danger:hover { background: rgba(224, 122, 122, 0.12); }
            .dcf-set__btns { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
            /* ---- the shared controls in this frame ---- */
            /* The old settings container fills its window absolutely; here it flows in the page. */
            .dcf-set .mcfo-set { position: static; inset: auto; overflow: visible; padding: 0; color: var(--ds-text); font-size: 13.5px; }
            .dcf-set .mcfo-set__crumb, .dcf-set .mcfo-set__foot { display: none; }
            .dcf-set .mcfo-set__card { background: var(--ds-card); border: 1px solid var(--ds-line2); border-radius: 12px; overflow: hidden; }
            /* The hidden checkbox is absolute: without its own row as anchor it sat on the panel, and a
               redraw after a click scrolled the whole panel after it (blank window). clip above keeps
               the panel from scrolling at all; only the content does. */
            .dcf-set .mcfo-set__row { position: relative; padding: 13px 16px; }
            .dcf-set .mcfo-set__row:hover { background: rgba(180, 138, 232, 0.06); }
            .dcf-set .mcfo-set__item + .mcfo-set__item { border-top: 1px solid var(--ds-line2); }
            .dcf-set .mcfo-set__label { color: var(--ds-text); font-size: 14px; }
            .dcf-set .mcfo-set__hint { color: var(--ds-muted); font-size: 12.5px; line-height: 1.45; }
            .dcf-set .mcfo-set__sub-title, .dcf-set .mcfo-set__section { color: var(--ds-muted); font-size: 12px; font-weight: 700; margin: 16px 2px 8px; letter-spacing: 0.02em; }
            /* Fixed app look: the theme engine colours switches and segments through html[...] selectors,
               which outrank these — so the app's own colours are enforced. */
            .dcf-set .mcfo-switch__input:checked + .mcfo-switch { background: var(--ds-violet2) !important; box-shadow: inset 0 0 0 1px var(--ds-violet) !important; }
            .dcf-set .mcfo-switch__input:focus-visible + .mcfo-switch { outline-color: var(--ds-gold); }
            .dcf-set .mcfo-set__range { accent-color: var(--ds-violet2); }
            .dcf-set .mcfo-seg { border-color: var(--ds-line); }
            .dcf-set .mcfo-seg button + button { border-left-color: var(--ds-line); }
            .dcf-set .mcfo-seg button[aria-pressed="true"] { background: var(--ds-violet2) !important; color: #fff; }
            .dcf-set .mcfo-seg button:hover:not([aria-pressed="true"]) { background: rgba(180, 138, 232, 0.14); }
            /* Cards that are not a list of switches (theme, sound, performance) get the same inner margin. */
            .dcf-set .mcfo-set__card > :not(.mcfo-set__item):not(.mcfo-set__row):not(.mcfo-set__sub) { padding-left: 16px; padding-right: 16px; }
            .dcf-set .mcfo-set__card > :first-child:not(.mcfo-set__item):not(.mcfo-set__row) { padding-top: 14px; }
            .dcf-set .mcfo-set__card > :last-child:not(.mcfo-set__item):not(.mcfo-set__row) { padding-bottom: 14px; }
            .dcf-set mark { background: rgba(255, 211, 110, 0.28); color: inherit; border-radius: 3px; padding: 0 1px; }
            /* ---- Discord preview ---- */
            .dcf-set__rpc { display: flex; gap: 14px; align-items: center; margin-top: 14px; padding: 14px 16px; background: #2b2d31; border-radius: 10px; color: #dbdee1; max-width: 420px; }
            .dcf-set__rpc .dcf-pn__logo { width: 64px; height: 64px; filter: none; }
            .dcf-set__rpc b { color: #f2f3f5; }
            .dcf-set__rpc div div { font-size: 13px; line-height: 1.45; }
            .dcf-set__rpc .dcf-set__rpc-head { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: #b5bac1; text-transform: uppercase; margin-bottom: 4px; }
            @media (max-width: 820px) {
                .dcf-set__panel { grid-template-columns: 1fr; grid-template-rows: auto 1fr; height: 94vh; }
                .dcf-set__nav { border-right: 0; border-bottom: 1px solid var(--ds-line2); }
                .dcf-set__brand, .dcf-set__navfoot { display: none; }
                .dcf-set__groups { display: flex; gap: 4px; overflow-x: auto; padding: 10px; }
                .dcf-set__group { display: none; }
                .dcf-set__navbtn { width: auto; white-space: nowrap; }
                .dcf-set__top { flex-wrap: wrap; }
                .dcf-set__search { width: 100%; order: 3; }
            }`;
        (document.head || document.documentElement).appendChild(s);
    }

    const dcfEl = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const dcfApi = () => (typeof window.dcfApp === 'object' && window.dcfApp) || null;

    // A switch for an app setting, in the same markup as settingItem so it looks the same.
    function dcfAppSwitch(item, state) {
        const wrap = dcfEl('div', 'mcfo-set__item');
        const row = dcfEl('label', 'mcfo-set__row');
        row.innerHTML = '<span class="mcfo-set__text"><span class="mcfo-set__label"></span><span class="mcfo-set__hint"></span></span>'
                      + '<input type="checkbox" class="mcfo-switch__input"><span class="mcfo-switch" aria-hidden="true"></span>';
        row.querySelector('.mcfo-set__label').textContent = item.label;
        row.querySelector('.mcfo-set__hint').textContent = item.hint || '';
        const input = row.querySelector('input');
        input.checked = !!state[item.key];
        const off = item.needs && !state[item.needs];
        if (off) { wrap.setAttribute('data-off', ''); input.disabled = true; }
        input.addEventListener('change', () => { const api = dcfApi(); if (api) api.set(item.key, input.checked); });
        wrap.appendChild(row);
        return wrap;
    }

    function dcfPart(title, blurb, resetKeys) {
        const part = dcfEl('div', 'dcf-set__part');
        const head = dcfEl('div', 'dcf-set__parthead');
        head.append(dcfEl('span', 'dcf-set__parttitle', title), dcfEl('span', 'dcf-set__partblurb', blurb || ''));
        if (resetKeys) {
            const r = dcfEl('button', 'dcf-set__linkbtn', 'Reset');
            r.type = 'button';
            r.title = 'Back to the defaults of this part';
            r.addEventListener('click', resetKeys);
            head.appendChild(r);
        }
        part.appendChild(head);
        return part;
    }

    // ---- app pages ----------------------------------------------------------------------------
    function dcfAppPage(box, page) {
        const api = dcfApi();
        if (!api) { box.appendChild(dcfEl('p', 'dcf-set__empty', 'These settings are only there in the DreamingCrownfall app.')); return; }
        const state = api.settings();
        const items = DCF_APP_ITEMS.filter(i => i.page === page.id);
        if (page.id === 'general') {
            for (const [title, group] of [['Start', undefined], ['Windows', 'windows'], ['Shortcuts', 'shortcuts'], ['Stability', 'stability']]) {
                const part = dcfPart(title);
                const card = dcfEl('div', 'mcfo-set__card');
                for (const i of items.filter(x => x.part === group)) card.appendChild(dcfAppSwitch(i, state));
                part.appendChild(card);
                box.appendChild(part);
            }
            const acc = dcfPart('Accounts');
            acc.appendChild(dcfEl('p', 'dcf-set__note', 'Every tab at the top of the window is one account with its own login. "+" adds a tab, "×" on a tab signs that account out and removes it. Ctrl+1 to 9 switch between them.'));
            box.appendChild(acc);
        } else if (page.id === 'notifications') {
            const main = dcfPart('Notifications');
            const c1 = dcfEl('div', 'mcfo-set__card');
            for (const i of items.filter(x => !x.event)) c1.appendChild(dcfAppSwitch(i, state));
            main.appendChild(c1);
            box.appendChild(main);
            const ev = dcfPart('What to tell you');
            const c2 = dcfEl('div', 'mcfo-set__card');
            for (const i of items.filter(x => x.event)) c2.appendChild(dcfAppSwitch(i, state));
            ev.appendChild(c2);
            const btns = dcfEl('div', 'dcf-set__btns');
            const test = dcfEl('button', 'dcf-set__btn', 'Send a test notification');
            test.type = 'button';
            test.addEventListener('click', () => api.testNotification && api.testNotification());
            btns.appendChild(test);
            ev.appendChild(btns);
            box.appendChild(ev);
        } else if (page.id === 'hud') {
            dcfHudPage(box, api);
        } else if (page.id === 'discord') {
            const part = dcfPart('Rich Presence');
            const card = dcfEl('div', 'mcfo-set__card');
            for (const i of items) card.appendChild(dcfAppSwitch(i, state));
            part.appendChild(card);
            // How it looks for the others — built from the switches above.
            const prev = dcfEl('div', 'dcf-set__rpc');
            prev.insertAdjacentHTML('afterbegin', PN_LOGO);
            const txt = dcfEl('div');
            txt.appendChild(dcfEl('div', 'dcf-set__rpc-head', 'Playing a game'));
            txt.appendChild(Object.assign(dcfEl('div'), { innerHTML: '<b>Marble Crownfall</b>' }));
            if (state['discord.showAccount']) txt.appendChild(dcfEl('div', null, 'as ' + (dcfMyName() || 'your account')));
            if (state['discord.showKing']) txt.appendChild(dcfEl('div', null, '👑 King for 12 min (only while you are)'));
            txt.appendChild(dcfEl('div', null, '00:42 elapsed'));
            prev.appendChild(txt);
            if (!state['discord.enabled']) prev.style.opacity = '0.45';
            part.appendChild(dcfEl('div', 'dcf-set__note', state['discord.enabled'] ? 'This is how your Discord profile looks to others:' : 'Off. Switched on, your Discord profile would look like this:'));
            part.appendChild(prev);
            box.appendChild(part);
        } else if (page.id === 'about') {
            const part = dcfPart('DreamingCrownfall');
            part.appendChild(dcfEl('p', 'dcf-set__note', `Version ${SCRIPT_VERSION} · Marble Crownfall as a desktop app. Its in-game layer started out as the MarbleLuceFall userscript (6.59.1) and is developed on its own since.`));
            const btns = dcfEl('div', 'dcf-set__btns');
            const mk = (label, run, cls) => { const b = dcfEl('button', 'dcf-set__btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.addEventListener('click', run); return b; };
            btns.append(mk('What\'s new', () => { closeAppSettings(); showWhatsNew(); }),
                        mk('Changelog', () => { closeAppSettings(); showChangelog(); }),
                        mk('How to', () => { closeAppSettings(); showHowTo(); }),
                        mk('Take the tour', () => { closeAppSettings(); startTour(); }));
            part.appendChild(btns);
            box.appendChild(part);
            box.appendChild(dcfUpdatePart());
            box.appendChild(dcfPerfPart(mk));
            const reset = dcfPart('Start over');
            reset.appendChild(dcfEl('p', 'dcf-set__note', 'Every in-game setting back to its default: theme, switches, sliders. Your accounts, loadouts and the app settings stay.'));
            const rb = dcfEl('div', 'dcf-set__btns');
            const ask = mk('Reset all in-game settings', () => {
                if (ask.dataset.sure) {
                    Object.assign(settings, startValues());
                    saveSettings(); apply(); dcfRender();
                    return;
                }
                ask.dataset.sure = '1';
                ask.textContent = 'Click again to reset everything';
                setTimeout(() => { if (ask.isConnected) { delete ask.dataset.sure; ask.textContent = 'Reset all in-game settings'; } }, 4000);
            }, 'dcf-set__btn--danger');
            rb.appendChild(ask);
            reset.appendChild(rb);
            box.appendChild(reset);
        }
    }

    // ---- updates (app) ----------------------------------------------------------------------
    // The state comes from the app (src/updater.js) and follows it live while the page is open.
    const DCF_UPDATE_TEXT = {
        dev: () => 'Running from the project folder — updates come with git, nothing to install here.',
        idle: () => 'Not checked yet.',
        checking: () => 'Looking for a new version …',
        latest: () => 'You have the newest version.',
        downloading: u => `Version ${u.version} is downloading${u.percent ? ` (${u.percent} %)` : ''} …`,
        ready: u => u.needsPassword ? `Version ${u.version} is ready. Installing it asks for your password:`
                                    : `Version ${u.version} is ready. It is installed when you quit the app — or right now:`,
        available: u => `Version ${u.version} is out. This kind of install cannot update itself: download the new file from the release page.`,
        error: u => 'Could not check: ' + (u.error || 'unknown error'),
    };
    // ---- HUD (app, src/hud*.js) ----------------------------------------------------------------
    // The drawing comes from the app itself (src/hud-render.js, the same file the HUD window loads),
    // so preview and HUD can never look different. Every change goes to the app at once: the open
    // HUD follows while you click.
    let dcfHudLib = null;
    function dcfHudRenderer(api) {
        if (dcfHudLib) return dcfHudLib;
        try {
            const src = api.hud.renderer();
            dcfHudLib = new Function(src + '\nreturn { hudCss, renderHud, HUD_ITEMS };')();
            const st = document.createElement('style');
            st.textContent = dcfHudLib.hudCss();
            document.head.appendChild(st);
        } catch (e) { dcfHudLib = null; }
        return dcfHudLib;
    }
    // Real values where there are some; examples where not, so every switched-on piece shows.
    function dcfHudSample(d) {
        d = d || {};
        const per = d.perAccount && d.perAccount.length ? d.perAccount : [{ name: dcfMyName() || 'You', tickets: 1240, earning: true }, { name: 'Alt', tickets: 980, earning: false }];
        return {
            king: d.king || { name: 'cookingsumEP', since: Date.now() - 14 * 60000, mine: false },
            rc: d.rc || { multiplier: 2, state: 'active' },
            tickets: d.tickets != null ? d.tickets : per.reduce((n, a) => n + (a.tickets || 0), 0),
            perAccount: per,
            earning: d.earning && d.earning.total ? d.earning : { n: per.filter(a => a.earning).length, total: per.length },
            gold: d.gold != null ? d.gold : 12803, diamonds: d.diamonds != null ? d.diamonds : 455, claim: d.claim != null ? d.claim : 2,
        };
    }
    function dcfHudPage(box, api) {
        if (!api.hud) { box.appendChild(dcfEl('p', 'dcf-set__empty', 'The HUD needs a newer version of the app.')); return; }
        const lib = dcfHudRenderer(api);
        let { cfg, open } = api.hud.get();
        let data = null;
        const save = () => { api.hud.set(cfg); drawPreview(); };

        // Preview
        const prevPart = dcfPart('Preview', 'Shown with your real values; a Royal Celebration only appears while one runs.');
        const stage = dcfEl('div', 'dcf-hudprev');
        const hud = dcfEl('div');
        stage.appendChild(hud);
        const bar = dcfEl('div', 'dcf-hudprev__bar');
        const openBtn = dcfEl('button', 'dcf-set__btn dcf-set__btn--main');
        openBtn.type = 'button';
        openBtn.addEventListener('click', () => api.hud.toggle());
        bar.append(openBtn, dcfEl('p', 'dcf-set__note', 'F2 opens and closes it while the app is in front. Drag it anywhere by the HUD itself.'));
        prevPart.append(stage, bar);
        box.appendChild(prevPart);
        const drawOpen = () => { openBtn.textContent = open ? 'Close the HUD' : 'Open the HUD'; };
        function drawPreview() { if (lib) lib.renderHud(hud, cfg, dcfHudSample(data)); else hud.textContent = 'Preview unavailable.'; }
        drawOpen();
        drawPreview();
        api.hud.data().then(d => { data = d; if (hud.isConnected) drawPreview(); }).catch(() => {});

        // What it shows: switch + order
        const itemsPart = dcfPart('What it shows', 'Switch pieces on and off; the arrows set the order.', () => {
            api.hud.set(Object.assign({}, cfg, { items: [] })); dcfRender();   // the app fills in the defaults
        });
        const card = dcfEl('div', 'mcfo-set__card');
        const drawItems = () => {
            card.replaceChildren();
            cfg.items.forEach((it, i) => {
                // A div, not a label: a click anywhere in a label goes to its FIRST control, and
                // that was the ↑ button — every click on the switch moved the row instead.
                const row = dcfEl('div', 'dcf-hudrow');
                if (!it.on) row.setAttribute('data-off', '');
                const name = dcfEl('label', 'dcf-hudrow__name', (lib && lib.HUD_ITEMS[it.id]) || it.id);
                name.htmlFor = 'dcf-hud-item-' + it.id;
                const mv = (dir, label) => {
                    const b = dcfEl('button', 'dcf-hudrow__mv', label);
                    b.type = 'button';
                    b.title = dir < 0 ? 'Move up' : 'Move down';
                    b.disabled = dir < 0 ? i === 0 : i === cfg.items.length - 1;
                    b.addEventListener('click', e => {
                        e.preventDefault();
                        const items = cfg.items.slice();
                        [items[i], items[i + dir]] = [items[i + dir], items[i]];
                        cfg = Object.assign({}, cfg, { items });
                        save(); drawItems();
                    });
                    return b;
                };
                const input = dcfEl('input', 'mcfo-switch__input');
                input.type = 'checkbox';
                input.id = 'dcf-hud-item-' + it.id;
                input.checked = it.on;
                input.addEventListener('change', () => {
                    cfg = Object.assign({}, cfg, { items: cfg.items.map(x => x.id === it.id ? { id: x.id, on: input.checked } : x) });
                    save(); drawItems();
                });
                const sw = dcfEl('label', 'dcf-hudrow__sw');
                sw.append(input, Object.assign(dcfEl('span', 'mcfo-switch'), { ariaHidden: 'true' }));
                row.append(name, mv(-1, '↑'), mv(1, '↓'), sw);
                card.appendChild(row);
            });
        };
        drawItems();
        itemsPart.appendChild(card);
        box.appendChild(itemsPart);

        // Look
        const lookPart = dcfPart('Look', '', () => {
            api.hud.set(Object.assign({}, cfg, { layout: null, size: null, style: null, opacity: null })); dcfRender();
        });
        const look = dcfEl('div', 'mcfo-set__card dcf-hudlook');
        const seg = (key, options) => {
            const s = dcfEl('div', 'dcf-seg');
            const draw = () => { for (const b of s.children) b.setAttribute('aria-pressed', String(b.dataset.v === cfg[key])); };
            for (const [v, label] of options) {
                const b = dcfEl('button', null, label);
                b.type = 'button';
                b.dataset.v = v;
                b.addEventListener('click', () => { cfg = Object.assign({}, cfg, { [key]: v }); save(); draw(); });
                s.appendChild(b);
            }
            draw();
            return s;
        };
        const range = dcfEl('div', 'dcf-hudlook__range');
        const slider = dcfEl('input');
        slider.type = 'range'; slider.min = '30'; slider.max = '100'; slider.step = '1'; slider.value = String(cfg.opacity);
        const val = dcfEl('b', null, cfg.opacity + ' %');
        slider.addEventListener('input', () => { cfg = Object.assign({}, cfg, { opacity: Number(slider.value) }); val.textContent = slider.value + ' %'; save(); });
        range.append(slider, val);
        look.append(
            dcfEl('span', null, 'Layout'), seg('layout', [['bar', 'Bar'], ['column', 'Column']]),
            dcfEl('span', null, 'Size'), seg('size', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]),
            dcfEl('span', null, 'Style'), seg('style', [['app', 'App'], ['dark', 'Dark'], ['glass', 'Glass']]),
            dcfEl('span', null, 'Background'), range,
        );
        lookPart.appendChild(look);
        box.appendChild(lookPart);

        // Opened or closed elsewhere (F2, tray): follow.
        if (!dcfHudPage.listening && api.hud.onChange) {
            dcfHudPage.listening = true;
            api.hud.onChange(s => { if (dcfSet && dcfSet.page === 'hud' && !dcfSet.query) dcfRender(); });
        }
    }

    // ---- performance report (app, src/perf-report.js) ------------------------------------------
    // The settings close first: their blurred backdrop would be measured, not the game.
    function dcfPerfPart(mk) {
        const part = dcfPart('Performance report');
        const api = dcfApi();
        part.appendChild(dcfEl('p', 'dcf-set__note', 'Records 10 seconds of the game in this tab: frame rate, how busy it keeps your computer and which parts of the game take the time. Saved as a text file in your profile, nothing is sent anywhere. Handy for the game\'s developer when it runs slowly.'));
        const btns = dcfEl('div', 'dcf-set__btns');
        const b = mk('Record a performance report', async () => {
            if (!api || !api.perfReport) return;
            closeAppSettings();
            notice('Recording the performance report: 10 seconds, just let the game run …');
            const r = await api.perfReport().catch(e => ({ ok: false, why: String(e && e.message || e) }));
            if (r && r.ok) notice('Performance report saved. Its folder is open now.');
            else notice(escapeHtml(`No performance report. ${r && r.why || 'Something went wrong'}`), 'error');
        });
        if (!api || !api.perfReport) b.disabled = true;
        btns.appendChild(b);
        part.appendChild(btns);
        return part;
    }

    function dcfUpdatePart() {
        const part = dcfPart('Updates');
        const api = dcfApi();
        const note = dcfEl('p', 'dcf-set__note', '…');
        const btns = dcfEl('div', 'dcf-set__btns');
        const check = dcfEl('button', 'dcf-set__btn', 'Check for updates');
        check.type = 'button';
        const act = dcfEl('button', 'dcf-set__btn dcf-set__btn--main');
        act.type = 'button';
        act.hidden = true;
        btns.append(check, act);
        part.append(note, btns);
        if (!api || !api.update) { note.textContent = 'Updates are handled by the DreamingCrownfall app.'; check.hidden = true; return part; }
        const show = u => {
            if (!u) return;
            const when = u.checkedAt ? ' Last checked ' + new Date(u.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.' : '';
            note.textContent = (DCF_UPDATE_TEXT[u.status] || DCF_UPDATE_TEXT.idle)(u) + (['latest', 'error'].includes(u.status) ? when : '');
            check.hidden = u.status === 'dev';
            check.disabled = u.status === 'checking' || u.status === 'downloading';
            act.hidden = !(u.status === 'ready' || u.status === 'available');
            act.textContent = u.status === 'ready' ? 'Restart and update' : 'Open the release page';
        };
        check.addEventListener('click', () => { check.disabled = true; note.textContent = DCF_UPDATE_TEXT.checking(); api.update.check().then(show); });
        act.addEventListener('click', () => api.update.install());
        api.update.state().then(show);
        if (!dcfUpdatePart.listening) { dcfUpdatePart.listening = true; api.update.onChange(u => { dcfUpdatePart.last = u; if (dcfUpdatePart.show) dcfUpdatePart.show(u); }); }
        dcfUpdatePart.show = show;
        return part;
    }

    function dcfMyName() {
        try { const el = role('profile-entry'); return el ? (el.textContent || '').replace(/\s+/g, ' ').trim().split(' · ')[0].slice(0, 40) : ''; } catch (e) { return ''; }
    }

    // ---- game pages ---------------------------------------------------------------------------
    function dcfGamePage(box, page) {
        for (const title of page.parts) {
            const section = SETTINGS_SECTIONS.find(s => s.title === title);
            if (!section) continue;
            const reset = () => {
                if (section.render === 'sound') { soundOff(); musicPause(); settings.musicExcluded = []; music.queue = []; }
                for (const k of sectionKeys(section)) settings[k] = settingDefaults[k];
                saveSettings(); apply(); dcfRender();
            };
            const part = dcfPart(page.parts.length > 1 ? section.title : 'Settings', page.parts.length > 1 ? section.blurb : '', reset);
            const inner = dcfEl('div', 'mcfo-set');
            sectionContent(inner, dcfRender, section);
            part.appendChild(inner);
            box.appendChild(part);
        }
    }

    // ---- search -------------------------------------------------------------------------------
    // Every word has to appear somewhere in label, hint, sub-controls or the page it is on.
    function dcfSearch(box, query) {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const hit = text => { const t = text.toLowerCase(); return words.every(w => t.includes(w)); };
        const groups = [];
        const api = dcfApi();
        const appState = api ? api.settings() : null;
        for (const page of DCF_PAGES) {
            const rows = [];
            if (page.app && appState) {
                for (const i of DCF_APP_ITEMS.filter(x => x.page === page.id)) {
                    if (hit([i.label, i.hint, page.title].join(' '))) rows.push(dcfAppSwitch(i, appState));
                }
            }
            if (page.id === 'about' && hit(['tour guide help how to play explain introduction', page.title].join(' '))) {
                const card = dcfEl('div', 'mcfo-set__card');
                const row = dcfEl('button', 'mcfo-set__row');
                row.type = 'button';
                row.style.cssText = 'width:100%;font:inherit;text-align:left;background:none;border:0;color:inherit;cursor:pointer';
                row.innerHTML = '<span class="mcfo-set__text"><span class="mcfo-set__label">Take the tour</span><span class="mcfo-set__hint">How the game works and what the app adds, step by step. Any time you like.</span></span><span aria-hidden="true">›</span>';
                row.addEventListener('click', () => startTour());
                card.appendChild(row);
                rows.push(card);
            }
            if (page.id === 'hud' && hit([page.title, page.blurb, 'overlay always on top bar column opacity tickets king'].join(' '))) rows.push(dcfOpenRow(page, page.title, page.blurb));
            for (const title of page.parts || []) {
                const section = SETTINGS_SECTIONS.find(s => s.title === title);
                if (!section) continue;
                if (section.render) {
                    if (hit([section.title, section.blurb, page.title, page.blurb].join(' '))) rows.push(dcfOpenRow(page, section.title, section.blurb));
                    continue;
                }
                for (const item of sectionItems(section)) {
                    const subs = itemSubs(item).map(x => x.label || '').join(' ');
                    if (hit([item.label, item.hint || '', subs, section.title, page.title].join(' '))) {
                        const card = dcfEl('div', 'mcfo-set__card');
                        card.appendChild(settingItem(item));
                        rows.push(card);
                    }
                }
            }
            if (!rows.length && hit([page.title, page.blurb].join(' '))) rows.push(dcfOpenRow(page, page.title, page.blurb));
            if (rows.length) groups.push({ page, rows });
        }
        if (!groups.length) { box.appendChild(dcfEl('p', 'dcf-set__empty', `Nothing found for "${query}".`)); return; }
        for (const { page, rows } of groups) {
            const head = dcfEl('div', 'dcf-set__resulthead');
            head.insertAdjacentHTML('afterbegin', dcfIcon(page.icon));
            head.appendChild(dcfEl('span', null, page.title));
            const open = dcfEl('button', 'dcf-set__linkbtn', 'Open page ›');
            open.type = 'button';
            open.addEventListener('click', () => dcfGo(page.id));
            head.appendChild(open);
            box.appendChild(head);
            for (const r of rows) { r.style.marginTop = '8px'; box.appendChild(r); }
        }
        dcfMark(box, words);
    }
    function dcfOpenRow(page, label, hint) {
        const card = dcfEl('div', 'mcfo-set__card');
        const row = dcfEl('button', 'mcfo-set__row');
        row.type = 'button';
        row.style.cssText = 'width:100%;font:inherit;text-align:left;background:none;border:0;color:inherit;cursor:pointer';
        row.innerHTML = '<span class="mcfo-set__text"><span class="mcfo-set__label"></span><span class="mcfo-set__hint"></span></span><span aria-hidden="true">›</span>';
        row.querySelector('.mcfo-set__label').textContent = label;
        row.querySelector('.mcfo-set__hint').textContent = hint || '';
        row.addEventListener('click', () => dcfGo(page.id));
        card.appendChild(row);
        return card;
    }
    // Marks the found words in labels and hints.
    function dcfMark(box, words) {
        const re = new RegExp('(' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
        for (const el of box.querySelectorAll('.mcfo-set__label, .mcfo-set__hint')) {
            const t = el.textContent;
            if (!re.test(t)) continue;
            re.lastIndex = 0;
            el.replaceChildren(...t.split(re).map((part, i) => i % 2 ? Object.assign(document.createElement('mark'), { textContent: part }) : document.createTextNode(part)));
        }
    }

    // ---- frame --------------------------------------------------------------------------------
    function dcfGo(pageId) {
        if (!dcfSet) return;
        dcfSet.page = pageId;
        dcfSet.query = '';
        dcfSet.search.value = '';
        try { localStorage.setItem(DCF_SET_PAGE_KEY, pageId); } catch (e) {}
        dcfRender(true);
    }

    function dcfRender(top) {
        if (!dcfSet) return;
        const page = DCF_PAGES.find(p => p.id === dcfSet.page) || DCF_PAGES[0];
        for (const b of dcfSet.root.querySelectorAll('.dcf-set__navbtn')) {
            if (b.dataset.page === page.id && !dcfSet.query) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        }
        dcfSet.title.textContent = dcfSet.query ? 'Search' : page.title;
        dcfSet.blurb.textContent = dcfSet.query ? 'Every setting that matches. Switches work right here.' : page.blurb;
        const box = dcfEl('div');
        if (dcfSet.query) dcfSearch(box, dcfSet.query);
        else if (page.app) dcfAppPage(box, page);
        else dcfGamePage(box, page);
        const keep = top ? 0 : dcfSet.content.scrollTop;
        dcfSet.content.replaceChildren(box);
        dcfSet.content.scrollTop = keep;
    }

    function closeAppSettings() {
        if (!dcfSet) return;
        document.removeEventListener('keydown', dcfSet.keyHandler, true);
        dcfSet.root.remove();
        dcfSet = null;
        settingsRedraw = null;
    }

    // For the app's tray menu (Check for updates): open the settings on a page.
    try { window.dcfOpenSettings = page => showAppSettings({ page: String(page || '') }); } catch (e) {}

    // opts: { page } a page id, { section, label } the page of an old section and a switch to ring.
    function showAppSettings(opts = {}) {
        dcfSetStyles();
        pnStyles();   // the logo and the shared keyframes
        let pageId = opts.page || (opts.section && (dcfPageOfSection(opts.section) || {}).id) || null;
        if (!pageId) { try { pageId = localStorage.getItem(DCF_SET_PAGE_KEY); } catch (e) {} }
        if (!DCF_PAGES.some(p => p.id === pageId)) pageId = 'general';

        if (!dcfSet) {
            const root = dcfEl('div', 'dcf-set');
            root.setAttribute('role', 'dialog');
            root.setAttribute('aria-modal', 'true');
            root.setAttribute('aria-label', 'Settings');
            const panel = dcfEl('div', 'dcf-set__panel');
            root.appendChild(panel);

            const nav = dcfEl('nav', 'dcf-set__nav');
            const brand = dcfEl('div', 'dcf-set__brand');
            brand.insertAdjacentHTML('afterbegin', PN_LOGO);
            const bt = dcfEl('div');
            bt.append(dcfEl('div', 'dcf-set__brand-name', 'DreamingCrownfall'), dcfEl('div', 'dcf-set__brand-title', 'Settings'));
            brand.appendChild(bt);
            const groups = dcfEl('div', 'dcf-set__groups');
            for (const g of DCF_NAV) {
                groups.appendChild(dcfEl('div', 'dcf-set__group', g.group));
                for (const p of g.pages) {
                    const b = dcfEl('button', 'dcf-set__navbtn');
                    b.type = 'button';
                    b.dataset.page = p.id;
                    b.innerHTML = dcfIcon(p.icon) + '<span></span>';
                    b.lastChild.textContent = p.title;
                    b.addEventListener('click', () => dcfGo(p.id));
                    groups.appendChild(b);
                }
            }
            nav.append(brand, groups, dcfEl('div', 'dcf-set__navfoot', 'Version ' + SCRIPT_VERSION + ' · changes apply at once'));

            const main = dcfEl('section', 'dcf-set__main');
            const topbar = dcfEl('header', 'dcf-set__top');
            const heading = dcfEl('div', 'dcf-set__heading');
            const title = dcfEl('h2', 'dcf-set__title');
            const blurb = dcfEl('p', 'dcf-set__blurb');
            heading.append(title, blurb);
            const searchWrap = dcfEl('label', 'dcf-set__search');
            searchWrap.insertAdjacentHTML('afterbegin', dcfIcon('search'));
            const search = dcfEl('input');
            search.type = 'search';
            search.placeholder = 'Search all settings…';
            search.setAttribute('aria-label', 'Search all settings');
            searchWrap.appendChild(search);
            const close = dcfEl('button', 'dcf-set__close');
            close.type = 'button';
            close.title = 'Close (Esc)';
            close.innerHTML = dcfIcon('close');
            close.addEventListener('click', closeAppSettings);
            topbar.append(heading, searchWrap, close);
            const content = dcfEl('div', 'dcf-set__content');
            main.append(topbar, content);
            panel.append(nav, main);

            let typing = 0;
            search.addEventListener('input', () => {
                clearTimeout(typing);
                typing = setTimeout(() => { if (!dcfSet) return; dcfSet.query = search.value.trim(); dcfRender(true); }, 120);
            });
            root.addEventListener('mousedown', e => { if (e.target === root) closeAppSettings(); });
            const keyHandler = e => {
                if (e.key !== 'Escape') return;
                e.stopPropagation(); e.preventDefault();
                if (dcfSet && dcfSet.query) { search.value = ''; dcfSet.query = ''; dcfRender(true); return; }
                closeAppSettings();
            };
            document.addEventListener('keydown', keyHandler, true);
            document.body.appendChild(root);
            dcfSet = { root, page: pageId, query: '', keyHandler, content, search, title, blurb };
            const api = dcfApi();
            if (api && api.onChange && !showAppSettings.listening) {
                showAppSettings.listening = true;
                api.onChange(() => { if (dcfSet) { const p = DCF_PAGES.find(x => x.id === dcfSet.page); if (dcfSet.query || (p && p.app)) dcfRender(); } });
            }
        }
        settingsRedraw = () => dcfRender();
        dcfSet.page = pageId;
        dcfSet.query = '';
        dcfSet.search.value = '';
        dcfRender(true);

        if (opts.label) {
            const hit = [...dcfSet.content.querySelectorAll('.mcfo-set__label, .mcfo-set__sublabel')].find(x => x.textContent.trim() === opts.label);
            const item = hit && (hit.closest('.mcfo-set__item') || hit.closest('.mcfo-set__row'));
            if (item) {
                item.scrollIntoView({ block: 'center' });
                item.classList.add('mcfo-set__item--found');
                requestAnimationFrame(() => item.classList.add('mcfo-set__item--fade'));
                setTimeout(() => item.classList.remove('mcfo-set__item--found', 'mcfo-set__item--fade'), 3000);
            }
        }
    }

