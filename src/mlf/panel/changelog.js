    // Newest first. The first entry is what What's new shows after a fresh install.
    const CHANGELOG = [
        { v: '0.13.1', date: '2026-10-30', items: [
            'Combo Breaker in the new design: the countdown to the automatic combo break now sits at the bottom of the tile, right above the left bucket, next to the values you watch before going right. The Left / Right buttons no longer cover it.',
            'If another tile ever shows a status line where the Left / Right buttons sit, they move just below it.',
        ] },
        { v: '0.13.0', date: '2026-10-26', items: [
            'A new scoreboard at the end of a run. It covers the whole tile in your theme\'s colours and lists every player, not only the first eight: what each one bid, how and when their marble went out, the prize and the run score. Point at a row for more: the share of the pot, the prize per ticket bid and the points before and after.',
            'Your own accounts are marked on it, every account signed in to the app.',
            'Prefer the game\'s own scoreboard? Settings › Game screen › Scoreboard with everyone switches it back.',
            'The numbers on the King\'s wall no longer drift off their blocks after the board is resized or refitted.',
        ] },
        { v: '0.12.3', date: '2026-10-26', items: [
            'Plan in the upcoming tilesets list works again: it opens the Rebellion window on Schedule for that tileset. Before, the click only closed the list.',
            'In the new design the flying tickets come out of the tickets in the top bar, where your balance is, instead of an empty spot where the old ticket card used to be.',
        ] },
        { v: '0.12.2', date: '2026-10-25', items: [
            'The minimised chat stays fully visible instead of fading out. It covers nothing down there anyway.',
            'While the chat is minimised, its arrow counts the messages that come in and lights up, so you can see at a glance that something was written. Open the chat and the count goes away.',
        ] },
        { v: '0.12.1', date: '2026-10-25', items: [
            'The Stay / Exit and Left / Right buttons now sit at the top of your lane, under the tile\'s name. At the bottom they covered the buckets, so in Chicken Out you could not see how many points each one gives. As King in Pinball they stay at the foot of the King tile.',
        ] },
        { v: '0.12.0', date: '2026-10-25', items: [
            'The new tiles you play in yourself now work in the new design. In Chicken Out you choose Stay or Exit for your next respawn, in Spider Rush Left or Right, and as King you steer the flippers in Pinball Pursuit. The game puts these buttons into its own footer, which the new design hides, so you could not see them before.',
            'The buttons now sit at the foot of the lane your marble plays in. For Pinball, when you are King, they sit at the foot of the King tile.',
            'Your choice is easy to see: it lights up in your theme\'s colour with a tick, and the other option is dimmed. While the game is still confirming it, the button has a dashed edge.',
            'Use the arrow keys to steer. A and D stay your drinks and no longer reach the tile.',
            'The floating chat can be minimised to its input line: the new – button in its header. The arrow at the left of the input line brings the whole chat back. The app remembers this like the chat\'s place and size.',
        ] },
        { v: '0.11.2', date: '2026-10-24', items: [
            'The account frames, the HUD and Home showed Not earning for every account in some layouts, even while the game said Active: Earning Tickets. They now read the game\'s own session line and show the real state.',
        ] },
        { v: '0.11.1', date: '2026-10-24', items: [
            'The account frames in the tab bar now show each account\'s points (gold star) instead of its tickets. Hover a frame for the exact points; the tickets are listed there too, and the Earning bar stays as it was.',
        ] },
        { v: '0.11.0', date: '2026-10-23', items: [
            'Drinks, Rebellions and Royal Celebrations without the mouse: the hotbar key opens the menu as before, then a number key picks the option. In a drink menu 1\u20136 go through Small, Medium and Large in Gold and Diamonds; in the Rebellion and Royal Celebration menus 1\u20138 are the tiers. Each option shows its number in the corner.',
            'The safety check stays: a Rebellion or Royal Celebration tier only starts on the second press of the same number within four seconds, just like the second click. Holding a key down does not count as pressing it twice.',
            'While one of these menus is open, 1, 5 and 0 pick an option instead of bidding.',
        ] },
        { v: '0.10.0', date: '2026-10-21', items: [
            'Your chat, your place. The new design lets you choose where the chat sits: floating see-through in the bottom left, floating in the bottom right, or docked on the right in its own column like before (not see-through, and it folds away again). Switch with the new button in the chat\'s header or in Settings \u203a General \u203a Layout.',
            'The floating chat is much taller now — half the window instead of a few lines. Drag its top or inner edge (or the corner between them) to make it as big as you like; double-click an edge for the standard size. The size is the same on all your accounts.',
            'Free windows are back if you want them: switch off Windows as side panels (Settings \u203a General \u203a Layout) and inventory, shop, dailies and the rest open as windows again that you can move, resize and minimise. Minimised windows wait in a small taskbar under the bar at the top.',
            'The hotbar moves aside when the chat would cover it, on either side.',
        ] },
        { v: '0.9.1', date: '2026-10-18', items: [
            'Planned Rebellions now start on time when that account\'s tab is in the background. Before, the plan could wait until you switched to the tab — the browser slows hidden tabs down to once a minute. The app now lifts that for the tab from a minute before the slot until it ends.',
        ] },
        { v: '0.9.0', date: '2026-10-17', items: [
            'The new design now does everything the classic one does. More (M) in the hotbar opens every bid chip you have unlocked beyond \u00d710 — 25, 100, 500, 1K and the bigger ones like 10K or 100K. It stays open, so you can bid again right away.',
            'Daily rewards waiting? The Dailies button at the top shows how many in gold, and a click claims them all at once. J still opens the Dailies page.',
            'Quest dots are back in the new design: on Rebellion, Royal Celebrations and the drinks when an open quest needs them (the tooltip says which), and on the Shop button while an offer for one of your shop quests is up.',
            'The game menu (Esc) has Player gifts and the Music player now. Season, episode and the game\'s build show in the tooltip of the tileset at the top.',
            '"Claim dailies by themselves" is now called Auto-claim dailies (Settings \u203a Shop & dailies).',
        ] },
        { v: '0.8.0', date: '2026-10-17', items: [
            'Planned Rebellions. The Rebellion window has two views now: Now, as before, and Schedule — pick one of the coming tilesets, then a tier (two clicks, like buying). When that tileset starts, the app presses the game\'s own Start for you and asks the game whether the Rebellion really runs; nothing is spent before. One plan per tileset slot, another tier replaces it.',
            'You can also plan from the list of upcoming tilesets (\u2694 Plan on every coming slot), and the tileset in the top bar shows the next plan (\u2694x25 00:00) — a click opens it.',
            'Planned Rebellions show on the account frame at the top (\u2694 x25 \u00b7 00:00) and as a small clock on the Rebellion button. Cancel them any time before they start: Cancel plan in Schedule, or Cancel in the list of plans, which you now see in both views.',
            'A notification tells you when a planned Rebellion started, failed (with the game\'s reason) or was missed because the app was not running. It can be switched off in Settings \u203a Notifications \u203a Planned Rebellion.',
            'The app has to be running when the tileset starts. A plan for an account whose tab is in the background may start up to about a minute late.',
        ] },
        { v: '0.7.1', date: '2026-10-17', items: [
            'Welcome to the new design now waits until you have closed the patch notes. Right after the update it came up on top of them, and its tour could not show anything while they were still open.',
        ] },
        { v: '0.7.0', date: '2026-10-17', items: [
            'A new design: the board as a game instead of a website. Your tickets, points, gold and diamonds sit in a bar at the top, with buttons for your inventory, profile, achievements, dailies, shop and leaderboards. Every action of the footer is in a hotbar at the bottom, with keys: 1, 5 and 0 bid, U unbids, B opens Autobid, R Rebellion, F attacks (as King: Royal Celebrations), Q W E A S D are the drinks, I P Y J O L open your pages. The chat floats in the corner and fades while it is quiet, lanes and King are one arena, and everything takes the colours of your theme. A short tour shows it the first time; Settings › General › Layout switches back to the classic layout at any time.',
            'In the new design your pages open as panels at the sides, like the frames in a game: inventory, profile and achievements on the left, shop, dailies and leaderboards on the right. Drag their inner edge to make them wider; the same key or button closes them. In the shop the offers come first, and switching between the shops is instant once each has loaded.',
            'While you are King the toll field and the Royal Celebrations sit in the hotbar, and the toll goes up to the 20 the game allows (the game\'s own buttons stopped at 17). While "Attack when free" runs, what it is doing (waiting in tile, lava, attacking …) shows at the bottom of the King tile; a click cancels it.',
            'The app feels like a game client: no window frame — the bar of account frames (portrait, VIP level, tickets, daily quests) is the title bar —, smooth fades between accounts, Home and Stats, a loading screen instead of a half-built page, its own right-click menu, its own tooltips, thin scrollbars in the app\'s colours, no accidental zoom or text selection, and windows that pop out have the app\'s own bar.',
            'Esc opens a game menu with your pages, Home, Stats, the wiki, HUD, settings, patch notes, the update check and Quit. F1 lists every shortcut.',
            'The community wiki (marblecrownfall.wikioasis.org) is part of the app: the book button top right, or the game menu.',
            'Maintenance and lost connections get a screen of their own. The app checks every 10 seconds and brings every tab back by itself as soon as the game answers again.',
            'Signing in works like a game launcher: a new account shows "Add an account", and Twitch opens in a small window of its own.',
            'While the app is in front, notifications show as toasts at the top of the game instead of on the desktop; a click goes to that account. The taskbar icon shows how many rewards are waiting to be claimed.',
            'The app picks up where you left it: the account in front, the HUD and your open windows come back after a restart. Optional soft interface sounds (Settings › General).',
            'Diamond purchases open Stripe straight in your browser; the tab no longer hangs on its loading screen afterwards.',
        ] },
        { v: '0.6.1', date: '2026-10-17', items: [
            'The footer with your tickets and bids no longer goes missing on your other accounts\' tabs. Tabs in the background loaded at zero size, the game took them for a phone and hid the footer, and switching over did not bring it back until you reloaded.',
        ] },
        { v: '0.6.0', date: '2026-10-14', items: [
            'Settings › Notifications › On the board: the game\'s Unattended Viewing Mode (game v0.10.6b), for all your accounts at once. While it is on, the diamond reward pop-up no longer covers the board - a short line says what came in and goes after 10 to 60 seconds. Review rewards brings the summary of the account in front back. The game hid the switch behind its sound button, which the settings gear replaces, so it could not be reached before.',
        ] },
        { v: '0.5.2', date: '2026-10-13', items: [
            'Default Tolls can be changed again in the new inventory and through loadouts. Since game v0.10.6a every change has to name the current state of the list, and without it the game answered "Reload inventory before change your Default Tolls".',
        ] },
        { v: '0.5.1', date: '2026-10-13', items: [
            'Bomb and Mystery beverages (game v0.10.6a) beside the attack button: Water, Lava and Bomb on the left, Milk, Acid and Mystery on the right, each with its sizes and both prices like the others. They also count for the quest dots and for the beverages poured on the throne.',
            'With names shown, the buttons switch to their symbols by themselves when a name would be cut - six buttons leave less room than four.',
        ] },
        { v: '0.5.0', date: '2026-10-13', items: [
            'Royal Crests (game v0.10.6a) in the inventory: their own page under King with previews, details, Equip, Random and the pool, and a Royal Crest slot in the Overview. Before, the inventory did not show them at all.',
            'Loadouts save and put on your Royal Crest too, pool included.',
            'Settings \u203a Cosmetics: Hide the Royal Crest - the game\'s plain shield instead of the King\'s crest in a Royal Celebration.',
            'Default Tolls say how they work since the game update: your choices apply from your next reign on, and picking a toll that is used elsewhere swaps the two.',
        ] },
        { v: '0.4.2', date: '2026-10-13', items: [
            'Linux: an Arch package for Arch, CachyOS, Manjaro and friends — straight from pacman: add the app\'s repository to /etc/pacman.conf once (see the README), then "sudo pacman -Sy dreamingcrownfall", and every "pacman -Syu" brings new versions. It installs the app with a fixed menu entry, so a pin in the taskbar survives updates — with the AppImage every update has a new file name and the pin pointed to nothing. The app still updates itself as well (it asks for your password on "Restart now").',
            'Fixed: "Start with your computer" kept pointing to the AppImage of the version it was switched on with — after an update the app no longer started with the computer. It now follows the app on every start.',
            'Sharper app icon in the start menu and taskbar on Linux (every size instead of one big picture).',
        ] },
        { v: '0.4.1', date: '2026-10-13', items: [
            'A new app icon: the crown — in the taskbar, the tray, the installer and inside the app (settings, patch notes, welcome). Your Discord profile shows it too.',
        ] },
        { v: '0.4.0', date: '2026-10-13', items: [
            'HUD: gold, diamonds and points per account, and points across all accounts (Settings › HUD). Values per account now stand under each other in the bar as well, so the bar stays short with several accounts.',
            'Home: a daily quest table under the account cards — one row per quest with its difficulty, one column per account with its progress, "Ready to claim" or "Claimed". Click a name or a cell to go to that account.',
            'Fixed: closing the main window quits the app. The HUD and popped-out windows used to stay open on their own.',
        ] },
        { v: '0.3.4', date: '2026-10-09', items: [
            'Fixed: the new inventory and the new achievements page work in the app (Settings › Inventory & achievements). They had always shown the game\'s own pages, in windows of their own and inside the game alike.',
            'Linux .deb: when installing an update fails because the password prompt does not come up, the app now offers to open the downloaded package in your system\'s installer, which asks for the password itself. The message no longer says "Could not check".',
            'The app keeps a log of what it does (Settings › About › Open the log folder), handy when something goes wrong on another computer.',
        ] },
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
