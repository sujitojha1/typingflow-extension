// TypingFlow – Content Script
// Extracts key sentences from the page and presents them for the USER to type.
// Typing forces active recall, dramatically improving retention.

let sessionActive = false;
let overlay = null;
let chunks = [];          // { context, text } objects
let chunkIndex = 0;
let charIndex = 0;
let wrongCount = 0;
let totalTyped = 0;
let startTime = null;
let timerInterval = null;
let sessionStats = { wpm: [], accuracy: [], completed: 0 };

// ─── Content Extraction ───────────────────────────────────────────────────────

function extractKeyContent() {
  const result = { title: '', chunks: [] };

  result.title =
    document.querySelector('h1')?.innerText?.trim() ||
    document.title?.trim() ||
    'Page';

  // Find content root
  const contentRoot = findContentRoot();
  if (!contentRoot) return result;

  // Get all headings to define sections
  const headings = Array.from(contentRoot.querySelectorAll('h1,h2,h3,h4'));

  if (headings.length > 0) {
    headings.forEach((heading) => {
      const headingText = heading.innerText?.trim();
      if (!headingText || headingText.length < 3) return;

      const paras = getParagraphsAfter(heading, contentRoot);
      const sentences = pickKeySentences(paras, 2); // top 2 per section

      sentences.forEach((s) => {
        result.chunks.push({ context: headingText, text: s });
      });
    });
  }

  // Fallback — no headings, extract from all paragraphs
  if (result.chunks.length === 0) {
    const paras = Array.from(contentRoot.querySelectorAll('p'))
      .map((p) => p.innerText?.trim())
      .filter((t) => t && t.length > 60);
    const sentences = pickKeySentences(paras, 12);
    sentences.forEach((s) => result.chunks.push({ context: result.title, text: s }));
  }

  // Split long chunks at word boundaries (~90 chars)
  result.chunks = result.chunks.flatMap((c) => splitChunk(c));

  // Cap at 25 chunks for a focused session
  result.chunks = result.chunks.slice(0, 25);

  return result;
}

function findContentRoot() {
  const selectors = [
    'article', '[role="main"]', 'main', '.post-content', '.article-content',
    '.entry-content', '.content-body', '.story-body', '#content',
    '#main-content', '.markdown-body', '.article__body', '.post-body',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText?.trim().length > 200) return el;
  }
  return scoredFallback();
}

function scoredFallback() {
  let best = null, bestScore = 0;
  document.querySelectorAll('div, section').forEach((el) => {
    const text = el.innerText?.trim() || '';
    const pCount = el.querySelectorAll('p').length;
    const linkDensity = el.querySelectorAll('a').length /
      Math.max(1, el.querySelectorAll('*').length);
    const score = text.length * 0.5 + pCount * 30 - linkDensity * 200;
    if (score > bestScore && text.length > 300) { bestScore = score; best = el; }
  });
  return best;
}

function getParagraphsAfter(heading, root) {
  const texts = [];
  let el = heading.nextElementSibling;
  while (el && !['H1','H2','H3','H4'].includes(el.tagName)) {
    const t = el.innerText?.trim();
    if (t && ['P','LI','BLOCKQUOTE'].includes(el.tagName)) texts.push(t);
    el = el.nextElementSibling;
  }
  return texts;
}

function pickKeySentences(paragraphs, max) {
  const all = [];
  paragraphs.forEach((para, pi) => {
    const parts = para.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [para];
    parts.forEach((s, si) => {
      const text = s.trim().replace(/\s+/g, ' ');
      if (text.length < 35 || text.length > 400) return;
      if (/^(click|sign up|subscribe|follow|read more|learn more)/i.test(text)) return;
      // Score: prefer first sentence of first paragraph, prefer longer sentences
      const score = (pi === 0 && si === 0 ? 15 : 0) +
                    (si === 0 ? 5 : 0) +
                    Math.min(text.length, 120) / 8;
      all.push({ text, score });
    });
  });
  all.sort((a, b) => b.score - a.score);
  return all.slice(0, max).map((x) => x.text);
}

function splitChunk({ context, text }) {
  if (text.length <= 100) return [{ context, text }];
  const words = text.split(' ');
  const parts = [];
  let current = '';
  words.forEach((w) => {
    if ((current + ' ' + w).length > 95 && current) {
      parts.push({ context, text: current.trim() });
      current = w;
    } else {
      current = current ? current + ' ' + w : w;
    }
  });
  if (current) parts.push({ context, text: current.trim() });
  return parts;
}

// ─── Overlay HTML ─────────────────────────────────────────────────────────────

function buildOverlay(data) {
  const ov = document.createElement('div');
  ov.id = 'tf-overlay';
  ov.setAttribute('tabindex', '0');
  ov.innerHTML = `
    <div class="tf-wrap">

      <!-- Header -->
      <div class="tf-header">
        <div class="tf-brand">
          <span class="tf-diamond">◆</span>
          <span class="tf-name">TypingFlow</span>
        </div>
        <div class="tf-meta">
          <span class="tf-badge" id="tf-wpm">-- WPM</span>
          <span class="tf-badge" id="tf-acc">-- %</span>
          <span class="tf-badge" id="tf-timer">0:00</span>
        </div>
        <button class="tf-exit" id="tf-exit" title="Exit (Esc)">✕</button>
      </div>

      <!-- Progress bar -->
      <div class="tf-progress-track">
        <div class="tf-progress-fill" id="tf-progress"></div>
      </div>

      <!-- Context label -->
      <div class="tf-context" id="tf-context"></div>

      <!-- Target text display (character spans) -->
      <div class="tf-target" id="tf-target"></div>

      <!-- Stats row below target -->
      <div class="tf-stats-row">
        <span class="tf-chunk-counter" id="tf-counter">1 / ${data.chunks.length}</span>
        <span class="tf-errors" id="tf-errors">Errors: 0</span>
      </div>

      <!-- Hidden input to capture typing -->
      <input
        type="text"
        id="tf-input"
        class="tf-input"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Click here and start typing..."
      />

      <!-- Instructions -->
      <div class="tf-hint" id="tf-hint">
        Click the input box above and type the highlighted text exactly.
        <span class="tf-key">Tab</span> to skip · <span class="tf-key">Esc</span> to exit
      </div>

    </div>

    <!-- Session complete screen -->
    <div class="tf-complete" id="tf-complete" style="display:none">
      <div class="tf-complete-inner">
        <div class="tf-complete-diamond">◆</div>
        <div class="tf-complete-title">Session Complete</div>
        <div class="tf-complete-sub">You typed ${data.chunks.length} key passages</div>
        <div class="tf-score-grid" id="tf-score-grid"></div>
        <button class="tf-done-btn" id="tf-done-btn">Done</button>
      </div>
    </div>
  `;
  return ov;
}

// ─── Typing Engine ────────────────────────────────────────────────────────────

function loadChunk(index) {
  const chunk = chunks[index];
  const targetEl = document.getElementById('tf-target');
  const contextEl = document.getElementById('tf-context');
  const counterEl = document.getElementById('tf-counter');
  const progressEl = document.getElementById('tf-progress');
  const errorsEl = document.getElementById('tf-errors');
  const inputEl = document.getElementById('tf-input');

  contextEl.textContent = chunk.context;
  counterEl.textContent = `${index + 1} / ${chunks.length}`;
  progressEl.style.width = `${(index / chunks.length) * 100}%`;
  errorsEl.textContent = 'Errors: 0';

  // Build character spans
  targetEl.innerHTML = '';
  Array.from(chunk.text).forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'tf-char tf-pending';
    span.textContent = ch === ' ' ? '\u00A0' : ch; // non-breaking space
    span.dataset.index = i;
    span.dataset.char = ch;
    targetEl.appendChild(span);
  });

  // Mark first char as current
  const first = targetEl.querySelector('.tf-char');
  if (first) first.classList.replace('tf-pending', 'tf-current');

  charIndex = 0;
  wrongCount = 0;
  totalTyped = 0;
  startTime = null;

  inputEl.value = '';
  inputEl.focus();
}

function handleInput(e) {
  const inputEl = e.target;
  const typed = inputEl.value;
  const chunk = chunks[chunkIndex];
  const target = chunk.text;

  // Start timer on first keystroke
  if (!startTime && typed.length > 0) {
    startTime = Date.now();
    startTimer();
  }

  // Rebuild state from typed string (handles paste, backspace, etc.)
  const spans = document.querySelectorAll('#tf-target .tf-char');
  spans.forEach((span, i) => {
    span.className = 'tf-char';
    if (i < typed.length) {
      const typedChar = typed[i];
      const expectedChar = target[i];
      span.classList.add(typedChar === expectedChar ? 'tf-correct' : 'tf-wrong');
    } else if (i === typed.length) {
      span.classList.add('tf-current');
    } else {
      span.classList.add('tf-pending');
    }
  });

  // Scroll current char into view
  const currentSpan = document.querySelector('#tf-target .tf-current');
  if (currentSpan) currentSpan.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  // Count errors (wrong chars in current typed string)
  const errors = Array.from(typed).filter((ch, i) => ch !== target[i]).length;
  document.getElementById('tf-errors').textContent = `Errors: ${errors}`;
  wrongCount = errors;
  totalTyped = typed.length;

  updateLiveStats(typed.length, errors);

  // Check if complete (typed all chars, all correct)
  if (typed.length === target.length) {
    const allCorrect = Array.from(typed).every((ch, i) => ch === target[i]);
    if (allCorrect) {
      onChunkComplete();
    }
    // Don't allow typing beyond target length
    if (typed.length >= target.length) {
      inputEl.value = typed.slice(0, target.length);
    }
  }
}

function onChunkComplete() {
  const elapsed = startTime ? (Date.now() - startTime) / 1000 / 60 : 0;
  const wordCount = chunks[chunkIndex].text.split(' ').length;
  const wpm = elapsed > 0 ? Math.round(wordCount / elapsed) : 0;
  const accuracy = totalTyped > 0
    ? Math.round(((totalTyped - wrongCount) / totalTyped) * 100)
    : 100;

  sessionStats.wpm.push(wpm);
  sessionStats.accuracy.push(accuracy);
  sessionStats.completed++;

  clearInterval(timerInterval);
  timerInterval = null;

  // Flash complete
  document.getElementById('tf-target').classList.add('tf-chunk-done');

  setTimeout(() => {
    document.getElementById('tf-target').classList.remove('tf-chunk-done');
    chunkIndex++;
    if (chunkIndex < chunks.length) {
      document.getElementById('tf-progress').style.width =
        `${(chunkIndex / chunks.length) * 100}%`;
      loadChunk(chunkIndex);
    } else {
      showComplete();
    }
  }, 600);
}

function updateLiveStats(typed, errors) {
  if (!startTime) return;
  const elapsed = (Date.now() - startTime) / 1000 / 60;
  const words = (typed - errors) / 5;
  const wpm = elapsed > 0 ? Math.round(words / elapsed) : 0;
  const acc = typed > 0 ? Math.round(((typed - errors) / typed) * 100) : 100;
  document.getElementById('tf-wpm').textContent = `${wpm} WPM`;
  document.getElementById('tf-acc').textContent = `${acc}%`;
}

function startTimer() {
  const timerEl = document.getElementById('tf-timer');
  const start = Date.now();
  timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - start) / 1000);
    const m = Math.floor(s / 60);
    timerEl.textContent = `${m}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);
}

function showComplete() {
  document.querySelector('.tf-wrap').style.display = 'none';
  const complete = document.getElementById('tf-complete');
  complete.style.display = 'flex';

  const avgWpm = Math.round(sessionStats.wpm.reduce((a,b) => a+b, 0) / sessionStats.wpm.length) || 0;
  const avgAcc = Math.round(sessionStats.accuracy.reduce((a,b) => a+b, 0) / sessionStats.accuracy.length) || 0;

  document.getElementById('tf-score-grid').innerHTML = `
    <div class="tf-score-card">
      <div class="tf-score-val">${avgWpm}</div>
      <div class="tf-score-label">Avg WPM</div>
    </div>
    <div class="tf-score-card">
      <div class="tf-score-val">${avgAcc}%</div>
      <div class="tf-score-label">Accuracy</div>
    </div>
    <div class="tf-score-card">
      <div class="tf-score-val">${sessionStats.completed}</div>
      <div class="tf-score-label">Passages</div>
    </div>
  `;

  document.getElementById('tf-done-btn').addEventListener('click', closeSession);
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

function handleKey(e) {
  if (!sessionActive) return;
  if (e.key === 'Escape') { e.preventDefault(); closeSession(); }
  if (e.key === 'Tab') {
    e.preventDefault();
    // Skip current chunk
    clearInterval(timerInterval); timerInterval = null;
    chunkIndex++;
    if (chunkIndex < chunks.length) loadChunk(chunkIndex);
    else showComplete();
  }
}

// ─── Open / Close ─────────────────────────────────────────────────────────────

function openSession() {
  if (sessionActive) return;

  const data = extractKeyContent();
  if (!data.chunks.length) {
    alert('TypingFlow: Could not find enough readable content on this page.');
    return;
  }

  chunks = data.chunks;
  chunkIndex = 0;
  sessionStats = { wpm: [], accuracy: [], completed: 0 };
  sessionActive = true;

  overlay = buildOverlay(data);
  document.body.appendChild(overlay);

  document.getElementById('tf-exit').addEventListener('click', closeSession);
  document.getElementById('tf-input').addEventListener('input', handleInput);
  document.addEventListener('keydown', handleKey);

  loadChunk(0);
  document.getElementById('tf-input').focus();
}

function closeSession() {
  sessionActive = false;
  clearInterval(timerInterval);
  timerInterval = null;
  if (overlay) { overlay.remove(); overlay = null; }
  document.removeEventListener('keydown', handleKey);
}

// ─── Message Bridge ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'open') openSession();
  if (msg.action === 'close') closeSession();
});
