# TypingFlow – Focus Reader Chrome Extension

> Transform any webpage into a **distraction-free, Claude-themed typing session**. Extracts key content and animates it character-by-character so you actually read what matters.

---

## Demo

<!-- Add your demo video link here -->
🎬 **[Watch Demo Video](YOUR_VIDEO_LINK_HERE)**

---

## What It Does

- **Extracts key content** — headlines, body paragraphs, code blocks — stripping away ads, navbars, and clutter
- **Animates text** with a smooth typewriter effect in a full-screen Claude-themed overlay
- **Section navigation** — moves through H1/H2 sections one at a time so you stay focused
- **Adjustable speed** — from slow (meditative) to Turbo (skimming)
- **Keyboard-first** — full control without touching the mouse

---

## Screenshots

| Popup | Session |
|-------|---------|
| Clean popup with speed control | Full-screen Claude-dark reading mode |

---

## Installation

### 1. Generate icons
Open `generate_icons.html` in Chrome → click each canvas → save all 4 files into the `icons/` folder:
```
icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png
```

### 2. Load in Chrome
1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `typingflow-extension` folder

### 3. Use it
1. Navigate to any article, blog post, or docs page
2. Click the **◆** icon in your toolbar
3. Hit **Start Session**
4. Sit back and read

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Pause / Resume typing |
| `→` or `↓` | Next section |
| `←` or `↑` | Previous section |
| `R` | Restart current section |
| `Esc` | Exit session |

---

## Design

Inspired by **Claude's** warm dark palette:

| Token | Value |
|-------|-------|
| Background | `#1a1814` |
| Accent (Claude orange) | `#cc785c` |
| Text | `#d4cfc8` |
| Muted | `#4a4540` |
| Surface | `#12100e` |

---

## File Structure

```
typingflow-extension/
├── manifest.json          # Chrome Manifest V3
├── content.js             # Content extraction + typing engine
├── typing-session.css     # Full-screen overlay styles
├── popup.html             # Extension popup
├── popup.js               # Popup controller
├── generate_icons.html    # Icon generator (open once, save PNGs)
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## How Content Extraction Works

1. Tries semantic selectors: `article`, `main`, `[role="main"]`, `.post-content`, etc.
2. Falls back to a **text-density scoring algorithm** — finds the div with the most paragraph content and least link clutter
3. Walks the DOM collecting `h1–h4`, `p`, `li`, `pre`, `blockquote` elements
4. Filters noise (nav, footer, ads, sidebars)
5. Groups paragraphs under their nearest heading → **sections**
6. Caps at 20 sections for a focused session

---

## Works Great On

- Medium articles
- Dev.to / Hashnode posts
- Wikipedia pages
- GitHub READMEs
- News articles (NYT, The Verge, etc.)
- Documentation sites (MDN, Stripe Docs, etc.)

---

## Built With

- Chrome Extension Manifest V3
- Vanilla JS (zero dependencies)
- CSS animations + `backdrop-filter`
- Chrome Storage API

---

*Made with ◆ for the EAG3 course assignment.*
