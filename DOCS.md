# POWER LEVEL 999k ⚡ — Card Docs

Open `index.html` in a browser. Progress is saved in your browser's `localStorage` (key `power999.v1`), so it stays on this device.

## How XP works
- **1 level = 1000 XP.** Each card's bar shows progress toward its next level.
- **`+` / `−`** on a card gives or removes 100 XP (change `STEP_XP` in `script.js`). XP is clamped between 0 and the card's `maxXP`.
- **Checking a quest part** gives `maxXP / number of parts` XP; unchecking takes it back.
- The top bar shows total XP across all cards, with progress to the next global level.
- Leveling up triggers lightning, a screen flash and a banner.

## Card format

```json
{
  "id": "vim",
  "name": "Vim + Motions",
  "shortDesc": "Edit text at the speed of thought.",
  "maxXP": 8000,
  "color": "green",
  "icon": "vim",
  "parts": ["Install Vim", "Learn basic motions", "Configs", "File tree"]
}
```

| Field | Required | Description |
|---|---|---|
| `name` | yes | Card title. |
| `id` | no | Unique key for saving progress. Defaults to a slug of `name`. **Don't change it later** or the card loses its progress. |
| `shortDesc` | no | One-line description under the title. |
| `maxXP` | no (5000) | Max XP. It's rounded to a multiple of 1000, so `8000` means 8 levels. |
| `color` | no (`green`) | A preset name or any CSS hex color such as `#ff00aa`. Controls the neon glow, border and bar. |
| `icon` | no (⚡) | A [Simple Icons](https://simpleicons.org) slug, an image URL or path, or an emoji. See below. |
| `parts` | no | Checklist of strings. Each one becomes a checkbox. |

### Colors
Presets live in [tokens.css](tokens.css) as `--color-card-glow-*`:
`green`, `blue`, `red`, `yellow`, `orange`, `purple`, `magenta`, `cyan`, `lime`.
To add a preset, add a `--color-card-glow-<name>: #hex;` line to `tokens.css`. You can also use any hex directly.

### Icons
- **Bundled logo slug:** `"icon": "typescript"`. The logos for all default cards live in [icons.js](icons.js) (from [Simple Icons](https://simpleicons.org)) and work offline, tinted with the card color. To bundle another logo, add `"slug": "<svg path d>"` to `icons.js`. A slug that isn't bundled is loaded from `cdn.simpleicons.org` (needs internet). If that fails, the card shows ⚡.
- **Image:** `"icon": "https://…/logo.png"` or `"icon": "./logos/mine.svg"`.
- **Emoji:** `"icon": "🧠"`. Works offline. Use it for things that have no brand logo.
- **Your own image from the internet:** add `"iconUrl": "https://example.com/logo.png"` (`http(s)` only). The app tries it first. If you don't set it, or it fails to load, it falls back to `icon` and then to ⚡. Online images keep their own colors and are not tinted.

```json
{ "name": "Go", "icon": "go", "iconUrl": "https://go.dev/images/gophers/ladder.svg" }
```

### Sounds
All sounds are generated in the browser, so there are no audio files. You get blips for `+` / `−`, ticks for checkboxes, and a zap with a rising arpeggio on level-up (a longer fanfare when a card hits max). Use the **SOUND** toolbar button to mute. The choice is remembered.

## Adding your cards

The app ships with **no cards**. Your roadmap lives only on your device (browser storage), and the public repo never contains it.

1. Click **IMPORT JSON**.
2. Paste one card object or an array of cards (for example your `private/my-roadmap.json`).
3. Click **ADD**.
4. Hover a card and click ✕ to remove it.
5. Importing a card with an existing `id` replaces that card in place.

Keep your own roadmap file in `private/`. It is listed in `.gitignore`, so it is never committed or published.

### Example: array of cards
```json
[
  { "name": "Go", "shortDesc": "Simple, fast, concurrent.", "maxXP": 6000, "color": "cyan", "icon": "go",
    "parts": ["Install Go", "Tour of Go", "Goroutines & channels", "Build a REST service"] },
  { "name": "Cooking", "shortDesc": "Don't live on instant noodles.", "maxXP": 3000, "color": "#ff5a36", "icon": "🍳",
    "parts": ["Rice", "Pasta", "Omelette"] }
]
```

## Backup, restore, reset
- **EXPORT** downloads `power-level-backup.json` with your cards **and** progress.
- **IMPORT JSON** accepts that backup file's contents. It restores both the cards and the XP and checkboxes. Use it to move to a new device or browser.
- **RESET** wipes all XP and checkboxes. Your cards are kept.

## Install as an app (PWA)
When hosted over HTTPS (or `localhost`), the **INSTALL APP** button appears if your browser supports installing. After the first load the app also works offline. Bump `VERSION` in `sw.js` when you deploy changes, so installed copies update.
This doesn't work from `file://`. Use VS Code Live Preview or `python -m http.server`.

## Deploy to GitHub Pages
1. From this folder: `git init`, `git add .`, `git commit -m "init"`. `private/` is ignored automatically.
2. Create a GitHub repo, then `git remote add origin <url>` and `git push -u origin main`.
3. In the repo go to **Settings → Pages**, choose branch `main` and folder `/ (root)`, then save.
4. Open `https://<user>.github.io/<repo>/`.

Progress is stored per browser and per address. On a new device, import your `private/my-roadmap.json` or a backup.

## Tips
- Use 3–8 parts per card for good XP granularity.
- Keep `maxXP` between 3000 and 12000. The roadmap is open-ended, so add cards whenever you like.
- If the animations bother you, enable "reduce motion" in your OS. The lightning and shaking are disabled.
- I'm not planning to accept any PR's so just fork it if you want to change it to your liking.