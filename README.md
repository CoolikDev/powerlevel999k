# POWER LEVEL 999k ⚡

A neon, anime-style skill roadmap tracker. Each skill is a glowing card with a level bar, quest checkboxes, sounds and lightning when you level up. It's plain HTML, CSS and JS with no build step and no backend. Your progress stays in your browser.

## Features
- Cards defined by simple JSON, with a name, description, max XP, color, icon and quest checklist
- 1 level = 1000 XP, with `+` / `−` buttons (100 XP per click) and quest checkboxes
- Level-up lightning, screen flash, banner and synthesized sounds, with a mute toggle
- Bundled brand logos (offline), or your own image through `iconUrl`
- Installable as an app (PWA), works offline, and backup/restore through JSON
- No cards ship with the app. You import your own

## Run locally
Serve the folder over HTTP (the service worker needs it):

```
python -m http.server 8000
```

Then open <http://localhost:8000>. You can also use VS Code Live Preview. Opening `index.html` directly also works, but without install and offline support.

## Use
1. Click **IMPORT JSON** and paste your cards. See [DOCS.md](DOCS.md) for the format.
2. Level up with `+` and the checkboxes.
3. Use **EXPORT** regularly to back up your cards and progress.

## Deploy (GitHub Pages)
Push this folder as the repo root, then go to **Settings → Pages**, choose branch `main` and folder `/ (root)`. Keep your personal roadmap in `private/`. It is git-ignored.

## Docs and credits
- [DOCS.md](DOCS.md): card format, icons, sounds, backup, PWA and deploy details
- [CREDITS.md](CREDITS.md): third-party assets and licenses
- [LICENSE](LICENSE): MIT
