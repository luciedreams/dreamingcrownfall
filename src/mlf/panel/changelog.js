    // Newest first. The first entry is what What's new shows after a fresh install.
    const CHANGELOG = [
        { v: '0.2.0', date: '2026-10-09', items: [
            'Your choice of windows: Settings › General › "Every window on its own". Switched off, windows open inside the game as before, and ⧉ in a title bar takes out just that one. It works at once, also on the windows already open.',
            'Secret game features stay secret until you have found or unlocked them.',
            'Fixed: switching Enhanced chat (and other switches that others depend on) left the settings window blank.',
            'Fixed: on Linux with X11 (Mint, Ubuntu …), a maximized window cut off the bottom of the game.',
        ] },
        { v: '0.1.3', date: '2026-10-09', items: [
            'The Linux .deb (Debian, Ubuntu, Mint …) now updates itself like the Windows version and the AppImage: it downloads in the background, and "Restart now" installs it after asking for your password once.',
        ] },
        { v: '0.1.2', date: '2026-10-09', items: [
            'Updates show in the game: a small card in the bottom right corner with a progress bar while a new version downloads, then "Restart now" or "Later". The game stays usable the whole time.',
        ] },
        { v: '0.1.1', date: '2026-10-09', items: [
            'Check for updates: a button in Settings › About and in the tray menu. When an update is ready, "Restart and update" installs it right away instead of waiting until you quit.',
            'Autobid in a tab you are not looking at bids as fast as in the one in front of you. Before, a hidden tab could be up to a second late.',
        ] },
        { v: '0.1.0', date: '2026-10-08', items: [
            'DreamingCrownfall: Marble Crownfall as a desktop app, with everything from the MarbleLuceFall userscript (6.59.1) built in, no browser or extension needed.',
            'Several accounts in tabs, each with its own login. + adds one, × signs it out and removes it.',
            'Desktop notifications for every account: chat mentions, throne won or lost, Royal Celebrations, Rebellions, achievements, gifts and shop items for your open shop quests.',
            'Inventory, Dailies, Shop, Leaderboards and every other window open as real windows you can move anywhere, even to another screen. The chat stays in the game and pops out with ⧉.',
            'New settings: one panel with categories, a search over every switch, and pages for notifications (each event on its own switch) and Discord.',
            'Emoji in chat: :) becomes 🙂 as you type, a colon and a name (:fire) suggests emoji, and an emoji button with search, recent ones and skin tones.',
            'Discord, if you like: "Playing Marble Crownfall" on your profile, with your account and how long you have been King.',
            'Patch notes like this one, and the app can start with your computer, hidden in the tray.',
        ] },
    ];
