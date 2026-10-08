# DreamingCrownfall

[Marble Crownfall](https://marblecrownfall.com) as a desktop app for Windows and Linux. Its in-game layer started out as the [MarbleLuceFall](https://greasyfork.org/scripts/595115) userscript (6.59.1) and is developed separately since — DreamingCrownfall and MarbleLuceFall are two projects with their own versions.

## What the app adds

- **Several accounts in tabs.** Every tab is its own login. Press **+** to add one, **×** to sign it out and remove it. All tabs keep running; the hidden ones just stop drawing.
- **Desktop notifications** for every account, only when you are not looking at that tab:
  someone mentions you in chat · one of your accounts takes or loses the throne · a Royal Celebration starts ·
  a Rebellion starts · an achievement unlocks · a gift arrives · the shop has an item for one of your open shop quests.
  Clicking a notification brings up the right tab.
- **Windows you can put anywhere.** Inventory, Dailies, Shop, Leaderboards, Settings and every other window opens as a real window of its own: move it to another screen, resize it, Alt+Tab to it. Closing it closes the window. The chat stays in the game and gets a **⧉** button to pop it out.
- **Emoji in chat.** `:)` becomes 🙂 as you type, `:fire` suggests 🔥, and an emoji button opens every emoji with search, recent ones and skin tones. What is sent is plain Unicode, so everybody sees it.
- **Discord Rich Presence, opt-in.** "Playing Marble Crownfall", with the account you are looking at and "👑 King for 12 min" while one of yours sits on the throne (Settings › Discord; each part can be switched off).
- **Settings that are easy to find.** One panel with categories and a search over every switch.
- **No browser, no extension.** Everything is part of the app and updates with it.
- **Starts with your system if you like** (tray menu › *Start with system*), hidden in the tray, so notifications keep coming without opening the window.

## Install

Download the newest file from [Releases](https://github.com/luciedreams/dreamingcrownfall/releases/latest).

- **Windows:** `DreamingCrownfall-Setup-<version>.exe`. The installer is not signed yet, so Windows shows *"Windows protected your PC"* on the first start: click **More info → Run anyway**.
- **Linux:** `DreamingCrownfall-<version>.deb` for Debian, Ubuntu, Mint and friends, or `DreamingCrownfall-<version>.AppImage` for everything else (make it executable with `chmod +x DreamingCrownfall-*.AppImage` and start it).

All three update themselves from the releases. The .deb asks for your password when you click "Restart now" to install an update. They look on every start and every six hours; **Settings › About › Check for updates** (or the tray menu) looks right away.

## Add-ons

Every `.js` file in the `addons` folder of your profile is loaded when the app starts (Linux `~/.config/DreamingCrownfall/addons/`, Windows `%APPDATA%\DreamingCrownfall\addons\`). An add-on is a function that gets a small API: the accounts in your tabs and their sessions, desktop notifications and log lines (see `src/addons.js`). Add-ons run with the full rights of the app — only put files there that you wrote or trust. The app ships with none, and updates never touch the folder.

## Keys

| | |
|---|---|
| Ctrl+1 … 9 | switch to account tab |
| Ctrl+Tab / Ctrl+Shift+Tab | next / previous tab |
| F5, Ctrl+R | reload tab (Shift: without cache) |
| F11 | full screen |
| Ctrl+Plus / Minus / 0 | zoom |
| F12 | developer tools |
| Middle click on a tab | reload that tab |

## Privacy and network

The app talks to `marblecrownfall.com` (the game), `twitch.tv` (sign-in, inside the app) and `github.com` (app updates). With Discord switched on it also talks to the Discord app on your own computer (a local connection). Two optional extras fetch public data without any login: Twitch emotes in chat (list from `emotes.adamcy.pl`, pictures from Twitch's `static-cdn.jtvnw.net`, off by default) and euro prices in the shop (exchange rate from `api.frankfurter.dev`). Links to anything else open in your normal browser. Logins stay on your computer, one separate session per tab.

## Build from source

```bash
npm ci
npm start              # run from the folder
npm run dist:linux     # AppImage in dist/
npm run dist:win       # Windows installer in dist/
```

The in-game layer lives in `src/mlf/`: the files listed in `src/mlf/order.txt`, joined in that order (they share one scope). When run from the folder, a reload (F5) picks up changes.
`DCF_PROFILE=/some/folder npm start` uses a separate profile (own sessions), e.g. for testing next to the normal app.

Releases are built by GitHub Actions for every `v*` tag.

## License

MIT — see [LICENSE](LICENSE).
