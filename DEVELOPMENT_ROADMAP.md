# TypingFlow — Development Roadmap

---

## Phase 1: Foundation & Architecture
- [x] Manifest V3 with `activeTab`, `scripting`, `storage` permissions
- [x] Secure messaging layer between `popup.js` ↔ `content.js` with auto-injection fallback
- [x] Icon assets: 16 × 16, 32 × 32, 48 × 48, 128 × 128
- [x] `web_accessible_resources` wired for placeholder image injection

---

## Phase 2: Core Feature Engine — Three Commands

### `beautify_nuggets()`
- [x] DOM parser: `querySelectorAll('p')` filtered to 50–1500 char range, max 8 nuggets
- [x] Image extraction pipeline: paragraph-internal → preceding sibling `<figure>` / `.img` → placeholder fallback
- [x] Full-screen overlay (`#tf-master-overlay`) injected over active page
- [x] Nugget cards rendered with click-to-type deep-link
- [x] Popup state: Typing Flow + Save HTML unlock on success

### `typing_flow()`
- [x] Character-by-character `<span>` targets rendered per nugget
- [x] Invisible `<input>` capture with focus-lock (click anywhere refocuses)
- [x] Real-time validation: `.correct` (lit) / `.wrong` (red) / `.cursor` (orange underline)
- [x] Paste and drag-drop blocked to enforce active recall
- [x] Live metrics: WPM, Accuracy %, progress counter (`typed/total`)
- [x] Auto-advance to next nugget on perfect completion (400 ms grace delay)
- [x] Bidirectional navigation: `← prev` / `next →`
- [x] Completion screen: elapsed time, total chars, WPM

### `save_html()`
- [x] Nuggets serialised into standalone HTML with embedded terminal-style CSS
- [x] Blob Data URL → `<a download>` → `revokeObjectURL` (no server needed)

---

## Phase 3: Persistence & Analytics
- [x] `chrome.storage.local`: lifetime character count across sessions
- [x] Per-domain time-on-site tracker (1 s interval, increments at 60 s)
- [x] Popup metrics: `chars` + `time` read on open
- [x] Single-listener guard (`window.tfContentInitialized`) prevents duplicate registration

---

## Phase 4: UI — First Pass (Glassmorphism / Claude Dark)
- [x] Overlay: `rgba(42,41,38,0.95)` background, `backdrop-filter: blur(10px)`
- [x] Nugget cards with macOS traffic-light dots, lift-on-hover animation
- [x] Popup: glass container, `ui-sans-serif`, muted warm palette

---

## Phase 5: UI — Full Redesign (True Terminal / Claude Aesthetic)
- [x] Popup rebuilt: macOS-style title bar, `›` prompt, monospace throughout
- [x] Commands styled as terminal lines — `beautify_nuggets()`, `typing_flow()`, `save_html()`
- [x] Function names highlighted green (`.fn`), disabled state at 28% opacity via CSS `:disabled`
- [x] Popup CSS inlined into `popup.html` — **`popup.css` removed**
- [x] Overlay: near-black `#0d0c0b`, `Menlo / Monaco / ui-monospace` font stack
- [x] Terminal topbar (sticky, traffic-light dots) reused across all screens
- [x] Nugget cards: flat left-border accent, `translateX` slide on hover (not lift)
- [x] Typing screen: `nugget_N_of_M.txt` filename header, lowercase stats (`wpm`, `acc`)
- [x] Completion screen: `process exited with code 0` + `$ session --complete`
- [x] Saved HTML matches terminal palette and font
- [x] Content styles injected at runtime via `injectStyles()` — **`content.css` removed**

**Result: 6 source files → 4** (`manifest.json`, `popup.html`, `popup.js`, `content.js`)

---

## Phase 6: Code Quality & Security
- [x] `escapeHtml()` utility — neutralises `<`, `>`, `&`, `"` in all `innerHTML` contexts
- [x] Applied to nugget cards (`showBeautified`), char spans (`renderTypingChallenge`), saved HTML (`saveAsHTML`)
- [x] SVG `className` crash fixed: `typeof sibling.className === 'string'` guard before `.includes()`
- [x] State reset bug fixed: `typingStartTime` + `totalCharsTyped` now reset when clicking a card from Beautify view
- [x] `tabs[0]` guard added to all three button click handlers in `popup.js`
- [x] Unused `sender` parameter renamed to `_sender` in message listener
- [x] `chrome.runtime.getURL` optional chaining: `chrome.runtime?.getURL`

---

## Phase 7: Test Harness
- [x] `test_harness.html` rebuilt with terminal theme, self-contained mock Chrome API
- [x] Sample page: Wikipedia / Deep Learning article (10 paragraphs, 2 images, `<figure>` + `.thumb` structure)
- [x] **Unit tests** — `escapeHtml()`: 7 cases including XSS vectors
- [x] **Extraction tests** — `extractNuggets()`: array type, count bounds, length constraints, image association, placeholder fallback, SVG guard
- [x] **Nugget inspection table** — per-nugget preview, char count, image source type
- [x] **Interactive triggers** — one-click test for each command with DOM assertions post-render
- [x] Live summary: auto pass/fail counts, extraction stats, file manifest

---

## Test Results (last run — Wikipedia / Deep Learning)

| Metric | Value |
|--------|-------|
| Page | Wikipedia — Deep Learning (simulated) |
| Nuggets extracted | 8 / 8 max |
| With real image | 2 (CNN diagram, Neural network) |
| With placeholder | 6 |
| Avg text length | ~310 chars |
| Char range | 195 – 470 chars |
| Auto unit tests | 7 pass / 0 fail |
| Auto extraction tests | 12 pass / 0 fail |
| Interactive tests | 3 features (manual) |

---

## Phase 8: Open Items

- [ ] **Accessibility** — add `aria-label="Type the text above"` to `#tf-hidden-input`; add `role="dialog"` + `aria-modal="true"` to `#tf-master-overlay`
- [ ] **Performance** — skip `backdrop-filter: blur` on low-end hardware (detect via `navigator.hardwareConcurrency < 4`)
- [ ] **Edge cases** — handle pages with no `<p>` tags (SPAs, dashboards); fall back to `<li>`, `<div>` text nodes above threshold
- [ ] **Typing UX** — suppress live WPM display for first 10 characters (avoids misleading 500+ WPM readings at start)
- [ ] **Storage cleanup** — add TTL or cap on per-domain time entries to prevent unbounded `chrome.storage` growth
- [ ] **Chrome Web Store** — update store listing screenshots and description to reflect terminal redesign
- [ ] **Manifest icons** — regenerate `icon*.png` assets with terminal/monospace aesthetic to match new UI
