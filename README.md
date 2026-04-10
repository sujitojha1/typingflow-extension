# TypingFlow – Type to Remember

> A Chrome extension that extracts **key sentences** from any webpage and makes you **type them** — turning passive reading into active recall.

Research-backed: the **generation effect** shows you retain information far better when you actively produce it rather than just read it.

---

## Demo

<!-- Add your demo video link here -->
🎬 **[Watch Demo Video](YOUR_VIDEO_LINK_HERE)**

---

## How It Works

1. **Extract** — Scans the page for main content (articles, docs, blog posts), pulls out the most important sentences from each section
2. **Present** — Shows one passage at a time in a full-screen Claude-themed overlay
3. **You type** — Type the passage exactly; characters turn **green** (correct) or **red** (wrong) in real-time
4. **Track** — WPM, accuracy, and session stats at the end

The content never scrolls automatically — _you_ drive every character.

---

## Screenshots

| Popup | Typing Session | Session Complete |
|-------|---------------|-----------------|
| Clean popup | Live character feedback | Stats summary |

---

## Installation

### Step 1 — Generate icons
Open `generate_icons.html` in Chrome → click each canvas square → save all 4 files into `icons/`:
```
icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png
```

### Step 2 — Load in Chrome
1. Go to `chrome://extensions`
2. Enable **Developer Mode** (toggle, top right)
3. Click **Load unpacked**
4. Select the `typingflow-extension/` folder

### Step 3 — Use It
1. Open any article, Wikipedia page, MDN doc, blog post
2. Click **◆** in the toolbar
3. Hit **Start Typing Session**
4. Type every word — don't just skim

---

## Keyboard Controls

| Key | Action |
|-----|--------|
| Type normally | Fills the passage character by character |
| `Backspace` | Correct a mistake |
| `Tab` | Skip current passage |
| `Esc` | Exit session |

---

## What Gets Extracted

The extension scores and selects the **most information-dense sentences**:
- Prefers **first sentences** of paragraphs (topic sentences)
- Prefers **longer, factual sentences** over fluff
- Skips navigation, ads, footers, and call-to-action text
- Groups content by heading (H1–H4) so you work through sections
- Splits passages longer than ~90 characters at word boundaries

Works great on: Wikipedia, MDN, Dev.to, Medium, Hacker News articles, technical docs, Substack posts.

---

## Design Language

Inspired by **Claude's** warm dark palette:

| Element | Color |
|---------|-------|
| Background | `#1a1814` |
| Accent (Claude orange) | `#cc785c` |
| Correct char | `#7a9e7e` (green) |
| Wrong char | `#c87171` (red) |
| Dim / pending | `#3d3830` |
| Input border focus | `#cc785c66` |

---

## File Structure

```
typingflow-extension/
├── manifest.json          # Chrome Manifest V3
├── content.js             # Content extraction + typing engine
├── typing-session.css     # Full-screen overlay styles
├── popup.html             # Extension popup UI
├── popup.js               # Popup controller
├── generate_icons.html    # One-time icon generator
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Why Typing Helps

- **Generation Effect** (Slamecka & Graf, 1978) — self-generated material is recalled significantly better than read material
- **Active recall** forces your brain to retrieve, not just recognise
- **Deliberate errors** (red characters) trigger correction and deeper encoding
- Even slow, careful typing beats re-reading for long-term retention

---

*Made with ◆ for the EAG3 course assignment.*
