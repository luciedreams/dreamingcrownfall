# DreamingCrownfall

[Marble Crownfall](https://marblecrownfall.com) as a desktop app for Windows and Linux. Its in-game layer started out as the [MarbleLuceFall](https://greasyfork.org/scripts/595115) userscript (6.59.1) and is developed separately since — DreamingCrownfall and MarbleLuceFall are two projects with their own versions.

## What the app adds

- **A game, not a website.** The board as a game client: a resource bar at the top with your pages, a hotbar with keys at the bottom (bid, unbid, Autobid, Rebellion, attack, drinks; as King the toll field and Royal Celebrations), the chat floating in the corner, lanes and King as one arena, pages as side panels — all in the colours of your theme. Settings › General › Layout switches back to the classic layout.
- **Feels like a game client.** No window frame (the account frames are the title bar), smooth fades, loading and maintenance screens that bring tabs back on their own, a game menu on **Esc**, every shortcut on **F1**, its own right-click menu and tooltips, optional interface sounds, and it picks up where you left it.
- **The community wiki inside the app** — the book button top right.
- **Several accounts in tabs.** Every tab is its own login. Press **+** to add one, **×** to sign it out and remove it. All tabs keep running; the hidden ones just stop drawing.
- **Desktop notifications** for every account, only when you are not looking at that tab:
  someone mentions you in chat · one of your accounts takes or loses the throne · a Royal Celebration starts ·
  a Rebellion starts · an achievement unlocks · a gift arrives · the shop has an item for one of your open shop quests.
  Clicking a notification brings up the right tab. While the app is in front they show as toasts in the game instead. The taskbar icon shows how many rewards are waiting.
- **Starts like the website.** A new installation shows the game exactly as marblecrownfall.com does; a few welcome steps (sign in, more accounts, how to start) let you keep it plain or switch everything on, and Settings — the gear top right in the tab bar, or Ctrl+, — has every switch to build it your way.
- **A guided tour**: how the game works (bidding, the run, Points, the King, Gold, Diamonds, Rebellions) and what the app adds, step by step with a spotlight on the game. Settings › About › *Take the tour*.
- **Home: all your accounts at a glance** (from two accounts on). Tickets and whether they are earning, points, gold and diamonds, daily quests and what is waiting to be claimed, who is King — one card per account, totals on top, and a table of today's quests with every account's progress side by side. It only asks the game while you look at it.
- **Live numbers of the whole game, opt-in.** Settings › Stats adds a **Stats** tab next to Home with the public statistics page of [MarbleMind](https://marblemind.fun/public) (rotation, tile guide, shops, freezes, King, attacks, rebellions …), "Today in the game" on Home (runs, players per run, reigns, attacks, rebellions, chat messages, frozen runs and droughts — the same numbers as on that page) and eight more HUD pieces. Clicking a number opens the matching page in the Stats tab.
- **Windows you can put anywhere** (classic layout). Inventory, Dailies, Shop, Leaderboards, Settings and every other window opens as a real window of its own: move it to another screen, resize it, Alt+Tab to it. Closing it closes the window. The chat stays in the game and gets a **⧉** button to pop it out. Prefer them inside the game? Settings › General › *Every window on its own* off, and **⧉** takes out just the one you want.
- **Emoji in chat.** `:)` becomes 🙂 as you type, `:fire` suggests 🔥, and an emoji button opens every emoji with search, recent ones and skin tones. What is sent is plain Unicode, so everybody sees it.
- **Discord Rich Presence, opt-in.** "Playing Marble Crownfall", with the account you are looking at and "👑 King for 12 min" while one of yours sits on the throne (Settings › Discord; each part can be switched off).
- **Settings that are easy to find.** One panel with categories and a search over every switch.
- **A HUD you design yourself.** F2 opens a small always-on-top window: King and throne time, a running Royal Celebration, tickets (in total or per account), who is earning, gold, diamonds and points (in total or per account), rewards to claim, a clock, and with Settings › Stats the numbers of the day — pick the pieces and their order, bar or column, size, style and how see-through it is (Settings › HUD, with a live preview).
- **Shortcuts outside the app, if you like:** Ctrl+Alt+M shows or hides the window, Ctrl+Alt+N goes to the next account, Ctrl+Alt+C puts the cursor in the chat (Settings › General; off until you switch them on).
- **Media keys** steer the music player, and the desktop's media controls show the track.
- **Remembers its window**: size, maximized, and where the system allows it, the position.
- **Recovers on its own.** A tab that hangs or crashes reloads itself, and after sleep or a lost internet connection every tab reloads once, so chat and tickets keep going (Settings › General › *Recover on its own*).
- **Performance report.** Settings › About records 10 seconds of the game: frame rate, how busy it keeps your computer and which parts of the game take the time — something to send to the game's developer when it runs slowly.
- **No browser, no extension.** Everything is part of the app and updates with it.
- **Starts with your system if you like** (tray menu › *Start with system*), hidden in the tray, so notifications keep coming without opening the window.

## Install

Download the newest file from [Releases](https://github.com/luciedreams/dreamingcrownfall/releases/latest).

- **Windows:** `DreamingCrownfall-Setup-<version>.exe`. The installer is not signed yet, so Windows shows *"Windows protected your PC"* on the first start: click **More info → Run anyway**.
- **Linux:** `DreamingCrownfall-<version>.deb` for Debian, Ubuntu, Mint and friends, `DreamingCrownfall-<version>.pacman` for Arch, CachyOS, Manjaro and friends (`sudo pacman -U DreamingCrownfall-*.pacman`), or `DreamingCrownfall-<version>.AppImage` for everything else (make it executable with `chmod +x DreamingCrownfall-*.AppImage` and start it). The .deb and the .pacman install the app with a fixed menu entry, so a pin in the taskbar survives updates; an AppImage gets a new file name with every update.

**Arch, CachyOS, Manjaro — with pacman:** add the app's package repository once, at the end of `/etc/pacman.conf`:

```
[dreamingcrownfall]
SigLevel = Optional TrustAll
Server = https://github.com/luciedreams/dreamingcrownfall/releases/download/arch
```

Then `sudo pacman -Sy dreamingcrownfall` installs it, and every `sudo pacman -Syu` brings new versions along with the rest of the system. (The packages are not signed; pacman takes them because you added the repository yourself.)

All of them update themselves from the releases. The .deb and the .pacman ask for your password when you click "Restart now" to install an update. They look on every start and every six hours; **Settings › About › Check for updates** (or the tray menu) looks right away.

## Add-ons

Every `.js` file in the `addons` folder of your profile is loaded when the app starts (Linux `~/.config/DreamingCrownfall/addons/`, Windows `%APPDATA%\DreamingCrownfall\addons\`). An add-on is a function that gets a small API: the accounts in your tabs and their sessions, desktop notifications and log lines (see `src/addons.js`). Add-ons run with the full rights of the app — only put files there that you wrote or trust. The app ships with none, and updates never touch the folder.

## Keys

| | |
|---|---|
| Esc | game menu |
| F1 | all shortcuts |
| F2 | HUD |
| 1 / 5 / 0, U, B, R, F, Q W E A S D | game layout: bid, unbid, Autobid, Rebellion, attack (King: Royal Celebrations), drinks |
| I P Y J O L | game layout: inventory, profile, achievements, dailies, shop, leaderboards |
| Ctrl+1 … 9 | switch to account tab |
| Ctrl+Tab / Ctrl+Shift+Tab | next / previous tab |
| F5, Ctrl+R | reload tab (Shift: without cache) |
| F11 | full screen |
| Ctrl+Plus / Minus / 0 | zoom |
| F12 | developer tools |
| Middle click on a tab | reload that tab |

## Privacy and network

The app talks to `marblecrownfall.com` (the game; while a tab cannot reach it, also `/api/version` every 10 seconds to notice when it is back), `twitch.tv` (sign-in, inside the app), `marblecrownfall.wikioasis.org` (the community wiki, only when you open it; its own session) and `github.com` (app updates). Diamond purchases open Stripe in your normal browser. With Discord switched on it also talks to the Discord app on your own computer (a local connection). Two optional extras fetch public data without any login: Twitch emotes in chat (list from `emotes.adamcy.pl`, pictures from Twitch's `static-cdn.jtvnw.net`, off by default) euro prices in the shop (exchange rate from `api.frankfurter.dev`), and with Settings › Stats (off by default) the public statistics of `marblemind.fun` — the page `/public` in the Stats tab and its numbers (`/api/public/…`) for Home and the HUD, loaded only while one of them shows them; no cookies, nothing about you or your accounts is sent. Links to anything else open in your normal browser. Logins stay on your computer, one separate session per tab. A performance report is only made when you click for it and stays in the `reports` folder of your profile; nothing is sent.

## Build from source

```bash
npm ci
npm start              # run from the folder
npm run dist:linux     # AppImage, .deb and .pacman in dist/
npm run dist:win       # Windows installer in dist/
```

The in-game layer lives in `src/mlf/`: the files listed in `src/mlf/order.txt`, joined in that order (they share one scope). When run from the folder, a reload (F5) picks up changes.
`DCF_PROFILE=/some/folder npm start` uses a separate profile (own sessions), e.g. for testing next to the normal app.

Releases are built by GitHub Actions for every `v*` tag.

## License

MIT — see [LICENSE](LICENSE).
