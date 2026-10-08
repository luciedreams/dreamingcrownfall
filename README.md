# MarbleLuceFall App

[Marble Crownfall](https://marblecrownfall.com) as a desktop app for Windows and Linux, with its own in-game layer. That layer started out as the [MarbleLuceFall](https://greasyfork.org/scripts/595115) userscript (6.59.1) and is developed separately since — the app and the script are two projects with their own versions.

## What the app adds

- **Several accounts in tabs.** Every tab is its own login. Press **+** to add one, **×** to sign it out and remove it. All tabs keep running; the hidden ones just stop drawing.
- **Desktop notifications** for every account, only when you are not looking at that tab:
  someone mentions you in chat · one of your accounts takes or loses the throne · a Royal Celebration starts ·
  a Rebellion starts · an achievement unlocks · a gift arrives · the shop has an item for one of your open shop quests.
  Clicking a notification brings up the right tab.
- **Windows you can put anywhere.** Inventory, Dailies, Shop, Leaderboards, Settings and every other MarbleLuceFall window opens as a real window of its own: move it to another screen, resize it, Alt+Tab to it. Closing it closes the window. The chat stays in the game and gets a **⧉** button to pop it out.
- **No browser, no extension.** Everything is part of the app and updates with it.
- **Starts with your system if you like** (tray menu › *Start with system*), hidden in the tray, so notifications keep coming without opening the window.

## Install

Download the newest file from [Releases](https://github.com/luciedreams/marblelucefall-app/releases/latest).

- **Windows:** `MarbleLuceFall-Setup-<version>.exe`. The installer is not signed yet, so Windows shows *"Windows protected your PC"* on the first start: click **More info → Run anyway**.
- **Linux:** `MarbleLuceFall-<version>.AppImage`. Make it executable (`chmod +x MarbleLuceFall-*.AppImage`) and start it.

The app updates itself from the releases (Windows installer and AppImage).

## Add-ons

Every `.js` file in the `addons` folder of your profile is loaded when the app starts (Linux `~/.config/MarbleLuceFall/addons/`, Windows `%APPDATA%\MarbleLuceFall\addons\`). An add-on is a function that gets a small API: the accounts in your tabs and their sessions, desktop notifications and log lines (see `src/addons.js`). Add-ons run with the full rights of the app — only put files there that you wrote or trust. The app ships with none, and updates never touch the folder.

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

The app talks to `marblecrownfall.com` (the game), `twitch.tv` (sign-in, inside the app), `greasyfork.org` (MarbleLuceFall) and `github.com` (app updates). Links to anything else open in your normal browser. Logins stay on your computer, one separate session per tab.

## Build from source

```bash
npm ci
npm start              # run from the folder
npm run dist:linux     # AppImage in dist/
npm run dist:win       # Windows installer in dist/
```

The in-game layer lives in `src/mlf/`: the files listed in `src/mlf/order.txt`, joined in that order (they share one scope). When run from the folder, a reload (F5) picks up changes.
`MLF_PROFILE=/some/folder npm start` uses a separate profile (own sessions), e.g. for testing next to the normal app.

Releases are built by GitHub Actions for every `v*` tag.

## License

MIT — see [LICENSE](LICENSE).
