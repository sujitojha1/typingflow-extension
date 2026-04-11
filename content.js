// TypingFlow – Content Script

var sessionActive = false;
var overlay = null;
var chunks = [];
var chunkIndex = 0;
var wrongCount = 0;
var totalTyped = 0;
var startTime = null;
var timerInterval = null;

// ─── Content Extraction ───────────────────────────────────────────────────────

function extractKeyContent() {
  const result = { title: '', chunks: [] };
  result.title =
    document.querySelector('h1')?.innerText?.trim() ||
    document.title?.trim() || 'Page';

  const contentRoot = findContentRoot();
  if (!contentRoot) return result;

  const headings = Array.from(contentRoot.querySelectorAll('h1,h2,h3,h4'));

  if (headings.length > 0) {
    headings.forEach((h) => {
      const headingText = h.innerText?.trim();
      if (!headingText || headingText.length < 3) return;
      const paras = getParagraphsAfter(h, contentRoot);
      pickKeySentences(paras, 2).forEach((s) =>
        result.chunks.push({ context: headingText, text: s })
      );
    });
  }

  if (result.chunks.length === 0) {
    const paras = Array.from(contentRoot.querySelectorAll('p'))
      .map((p) => p.innerText?.trim())
      .filter((t) => t && t.length > 60);
    pickKeySentences(paras, 12).forEach((s) =>
      result.chunks.push({ context: result.title, text: s })
    );
  }

  result.chunks = result.chunks.flatMap(splitChunk).slice(0, 25);
  return result;
}

function findContentRoot() {
  for (const sel of [
    'article','[role="main"]','main','.post-content','.article-content',
    '.entry-content','.content-body','#content','#main-content','.markdown-body',
  ]) {
    const el = document.querySelector(sel);
    if (el && el.innerText?.trim().length > 200) return el;
  }
  return scoredFallback();
}

function scoredFallback() {
  let best = null, bestScore = 0;
  document.querySelectorAll('div,section').forEach((el) => {
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
      const score = (pi === 0 && si === 0 ? 15 : 0) + (si === 0 ? 5 : 0) +
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
  let cur = '';
  words.forEach((w) => {
    if ((cur + ' ' + w).length > 95 && cur) {
      parts.push({ context, text: cur.trim() });
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  });
  if (cur) parts.push({ context, text: cur.trim() });
  return parts;
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

function buildOverlay(data) {
  const ov = document.createElement('div');
  ov.id = 'tf-overlay';
  ov.innerHTML = `
    <div class="tf-top">
      <div class="tf-header">
        <span class="tf-diamond">◆</span>
        <span class="tf-title">TYPINGFLOW</span>
        <div class="tf-progress-track"><div class="tf-progress-fill" id="tf-progress"></div></div>
        <span class="tf-counter" id="tf-counter">1/${data.chunks.length}</span>
        <div class="tf-live">
          <span id="tf-wpm">– WPM</span>
          <span id="tf-acc">– %</span>
        </div>
        <button class="tf-exit" id="tf-exit">✕</button>
      </div>
      <div class="tf-context" id="tf-context"></div>
      <div class="tf-target" id="tf-target"></div>
    </div>

    <div class="tf-divider"></div>

    <div class="tf-bottom">
      <span class="tf-prompt">›</span>
      <input
        id="tf-input"
        class="tf-input"
        type="text"
        autocomplete="off" autocorrect="off"
        autocapitalize="off" spellcheck="false"
        placeholder="start typing…"
      />
      <span class="tf-tab-hint">Tab = skip</span>
    </div>

    <div class="tf-complete" id="tf-complete" style="display:none">
      <div class="tf-complete-box">
        <div class="tf-c-diamond">◆</div>
        <div class="tf-c-title">Session Complete</div>
        <div class="tf-c-scores" id="tf-c-scores"></div>
        <button class="tf-c-btn" id="tf-c-btn">Close</button>
      </div>
    </div>
  `;
  return ov;
}

// ─── Chunk Render ─────────────────────────────────────────────────────────────

function loadChunk(index) {
  const chunk = chunks[index];
  const target = document.getElementById('tf-target');
  const input  = document.getElementById('tf-input');

  document.getElementById('tf-context').textContent = chunk.context;
  document.getElementById('tf-counter').textContent = `${index + 1}/${chunks.length}`;
  document.getElementById('tf-progress').style.width = `${(index / chunks.length) * 100}%`;

  target.innerHTML = '';
  Array.from(chunk.text).forEach((ch) => {
    const span = document.createElement('span');
    span.className = 'tf-ch tf-pending';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    target.appendChild(span);
  });
  // mark first char
  const first = target.querySelector('.tf-ch');
  if (first) first.classList.replace('tf-pending', 'tf-cursor');

  input.value = '';
  wrongCount = 0;
  totalTyped = 0;
  startTime = null;
  clearInterval(timerInterval);
  timerInterval = null;

  input.focus();
}

// ─── Typing Handler ───────────────────────────────────────────────────────────

function handleInput(e) {
  const input  = e.target;
  const typed  = input.value;
  const target = chunks[chunkIndex].text;
  const spans  = document.querySelectorAll('#tf-target .tf-ch');

  // Start timer on first keystroke
  if (!startTime && typed.length > 0) {
    startTime = Date.now();
    const timerStart = Date.now();
    timerInterval = setInterval(() => updateLiveStats(typed.length, wrongCount), 500);
  }

  // Update span states
  let errors = 0;
  spans.forEach((span, i) => {
    span.className = 'tf-ch';
    if (i < typed.length) {
      const ok = typed[i] === target[i];
      span.classList.add(ok ? 'tf-correct' : 'tf-wrong');
      if (!ok) errors++;
    } else if (i === typed.length) {
      span.classList.add('tf-cursor');
    } else {
      span.classList.add('tf-pending');
    }
  });

  wrongCount = errors;
  totalTyped = typed.length;
  updateLiveStats(typed.length, errors);

  // Prevent typing past end
  if (typed.length > target.length) {
    input.value = typed.slice(0, target.length);
    return;
  }

  // Complete when all correct
  if (typed.length === target.length && errors === 0) {
    onChunkDone();
  }
}

function updateLiveStats(typed, errors) {
  if (!startTime) return;
  const mins = (Date.now() - startTime) / 60000;
  const wpm = mins > 0 ? Math.round((typed - errors) / 5 / mins) : 0;
  const acc = typed > 0 ? Math.round(((typed - errors) / typed) * 100) : 100;
  document.getElementById('tf-wpm').textContent = `${wpm} WPM`;
  document.getElementById('tf-acc').textContent  = `${acc}%`;
}

var sessionWpms = [], sessionAccs = [];

function onChunkDone() {
  const input = document.getElementById('tf-input');
  input.disabled = true;

  // Capture stats
  if (startTime) {
    const mins = (Date.now() - startTime) / 60000;
    const words = chunks[chunkIndex].text.split(' ').length;
    sessionWpms.push(mins > 0 ? Math.round(words / mins) : 0);
    sessionAccs.push(totalTyped > 0
      ? Math.round(((totalTyped - wrongCount) / totalTyped) * 100)
      : 100);
  }

  clearInterval(timerInterval);

  // Flash green, then next
  document.getElementById('tf-target').classList.add('tf-done-flash');
  setTimeout(() => {
    document.getElementById('tf-target').classList.remove('tf-done-flash');
    input.disabled = false;
    chunkIndex++;
    if (chunkIndex < chunks.length) {
      loadChunk(chunkIndex);
    } else {
      showComplete();
    }
  }, 500);
}

function showComplete() {
  document.getElementById('tf-complete').style.display = 'flex';
  const avgWpm = Math.round(sessionWpms.reduce((a,b)=>a+b,0)/Math.max(1,sessionWpms.length));
  const avgAcc = Math.round(sessionAccs.reduce((a,b)=>a+b,0)/Math.max(1,sessionAccs.length));
  document.getElementById('tf-c-scores').innerHTML = `
    <div class="tf-c-card"><div class="tf-c-val">${avgWpm}</div><div class="tf-c-lbl">Avg WPM</div></div>
    <div class="tf-c-card"><div class="tf-c-val">${avgAcc}%</div><div class="tf-c-lbl">Accuracy</div></div>
    <div class="tf-c-card"><div class="tf-c-val">${chunkIndex}</div><div class="tf-c-lbl">Passages</div></div>
  `;
  document.getElementById('tf-c-btn').addEventListener('click', closeSession);
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

function handleKey(e) {
  if (!sessionActive) return;
  if (e.key === 'Escape') { e.preventDefault(); closeSession(); }
  if (e.key === 'Tab') {
    e.preventDefault();
    clearInterval(timerInterval);
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
    alert('TypingFlow: No readable content found on this page.');
    return;
  }

  chunks = data.chunks;
  chunkIndex = 0;
  sessionWpms = [];
  sessionAccs = [];
  sessionActive = true;

  overlay = buildOverlay(data);
  document.body.appendChild(overlay);

  document.getElementById('tf-exit').addEventListener('click', closeSession);
  const tfInput = document.getElementById('tf-input');
  tfInput.addEventListener('input', handleInput);
  tfInput.addEventListener('paste', (e) => e.preventDefault());
  tfInput.addEventListener('drop', (e) => e.preventDefault());
  document.addEventListener('keydown', handleKey);

  loadChunk(0);
}

function closeSession() {
  sessionActive = false;
  clearInterval(timerInterval);
  overlay?.remove();
  overlay = null;
  document.removeEventListener('keydown', handleKey);
}

if (!window.tfListenerAdded) {
  window.tfListenerAdded = true;
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'open')  openSession();
    if (msg.action === 'close') closeSession();
  });
}
