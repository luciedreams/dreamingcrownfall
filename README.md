# MarbleLuceFall App

[Marble Crownfall](https://marblecrownfall.com) with [MarbleLuceFall](https://greasyfork.org/scripts/595115) built in, as a desktop app for Windows and Linux.

## What the app adds

- **Several accounts in tabs.** Every tab is its own login. Press **+** to add one, **×** to sign it out and remove it. All tabs keep running; the hidden ones just stop drawing.
- **Desktop notifications** for every account, only when you are not looking at that tab:
  someone mentions you in chat · one of your accounts takes or loses the throne · a Royal Celebration starts ·
  a Rebellion starts · an achievement unlocks · a gift arrives · the shop has an item for one of your open shop quests.
  Clicking a notification brings up the right tab.
- **Windows you can put anywhere.** Inventory, Dailies, Shop, Leaderboards, Settings and every other MarbleLuceFall window opens as a real window of its own: move it to another screen, resize it, Alt+Tab to it. Closing it closes the window. The chat stays in the game and gets a **⧉** button to pop it out.
- **No browser, no extension.** MarbleLuceFall is loaded by the app itself.

## Install

Download the newest file from [Releases](https://github.com/luciedreams/marblelucefall-app/releases/latest).

- **Windows:** `MarbleLuceFall-Setup-<version>.exe`. The installer is not signed yet, so Windows shows *"Windows protected your PC"* on the first start: click **More info → Run anyway**.
- **Linux:** `MarbleLuceFall-<version>.AppImage`. Make it executable (`chmod +x MarbleLuceFall-*.AppImage`) and start it.

The app updates itself from the releases (Windows installer and AppImage).

## MarbleLuceFall updates

The app and the script are updated separately. On every start, and every 30 minutes, the app looks for a newer MarbleLuceFall on Greasy Fork and keeps the last one it got, so it also starts offline. A new version is used from the next time a tab loads (F5). The tray menu has **Check for MLF update** to look right away.

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

`MLF_SCRIPT=/path/to/MarbleLuceFall.user.js npm start` runs a local copy of the script instead of the Greasy Fork one.
`MLF_PROFILE=/some/folder npm start` uses a separate profile (own sessions), e.g. for testing next to the normal app.

Releases are built by GitHub Actions for every `v*` tag.

## License

MIT — see [LICENSE](LICENSE).
