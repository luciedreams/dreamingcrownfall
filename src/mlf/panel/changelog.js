    // Newest first. The first entry is what What's new shows after a fresh install.
    const CHANGELOG = [
        { v: '0.3.3', date: '2026-10-09', items: [
            'Starting with your computer: choose whether the app waits in the tray or opens its window right away (Settings › General › Start in the tray).',
            'The tour fits however you have set the app up: it finds each thing where it is right now — moved by a setting, folded into a rail, in a window of its own — and says so when something is not on screen. While you are King it explains the throne and the toll instead of the ticket chips.',
        ] },
        { v: '0.3.2', date: '2026-10-09', items: [
            'Fixed: F2 closes the HUD again. On Linux with Wayland the HUD took the keyboard when it opened, so the second F2 went nowhere; now the game keeps it.',
            'Fixed: on KDE with Wayland the HUD really stays on top. Before, a click into the game window put it behind, and F2 needed two presses to bring it back.',
        ] },
        { v: '0.3.1', date: '2026-10-09', items: [
            'Fixed: in Settings › HUD, clicking a switch under "What it shows" moved the row up instead of switching it.',
            'Fixed: the Background slider in Settings › HUD slides smoothly; before, the page redrew under the mouse while dragging.',
        ] },
        { v: '0.3.0', date: '2026-10-09', items: [
            'Home: with two or more accounts, a tab on the far left shows all of them at a glance — tickets and whether they are earning, points, gold, diamonds, daily quests, what is waiting to be claimed, and who is King.',
            'The HUD: F2 opens a small window that stays on top of everything. Build it your way in Settings › HUD — pick what it shows and in which order, bar or column, size, style and how see-through it is, with a live preview.',
            'A guided tour of the game and the app, step by step with a spotlight on the game. Start it any time: Settings › About, the settings search ("tour"), the tray menu or the Tour button here.',
            'New installations start exactly like the website; a few welcome steps let you keep it plain or switch everything on. The gear at the top right of the tab bar (or Ctrl+,) always opens the settings.',
            'Tabs recover on their own: a tab that hangs or crashes reloads itself, and after sleep or a lost connection every tab reloads once (Settings › General).',
            'Frame rate cap "Auto" (Settings › Performance): as smooth as your computer keeps up with, in steps that stay on your screen\'s beat, so the picture runs evenly instead of stuttering.',
            'Performance report (Settings › About): records 10 seconds of the game and saves what took the time — something to send to the game\'s developer when it runs slowly.',
            'Shortcuts that work outside the app too, if you switch them on: Ctrl+Alt+M shows or hides the window, Ctrl+Alt+N goes to the next account, Ctrl+Alt+C puts the cursor in the chat.',
            'Media keys steer the music player, and the window remembers its size.',
        ] },
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
