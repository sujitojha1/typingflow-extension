// TypingFlow – Content Script
// Extracts key page content and renders a Claude-themed typing session

let sessionActive = false;
let overlay = null;
let typingInterval = null;
let sections = [];
let currentSection = 0;
let currentCharIndex = 0;
let isPaused = false;
let typingSpeed = 30; // ms per character

// ─── Content Extraction ───────────────────────────────────────────────────────

function extractPageContent() {
  const result = { title: '', sections: [] };

  // Page title
  result.title =
    document.querySelector('h1')?.innerText?.trim() ||
    document.title?.trim() ||
    'Untitled Page';

  // Priority selectors for main content
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content-body',
    '.story-body',
    '#content',
    '#main-content',
    '.markdown-body',   // GitHub
    '.article__body',
    '.post-body',
    '.blog-post',
  ];

  let contentRoot = null;
  for (const sel of contentSelectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 200) {
      contentRoot = el;
      break;
    }
  }

  // Fallback: score divs by text density
  if (!contentRoot) {
    contentRoot = scoredFallback();
  }

  if (!contentRoot) return result;

  // Walk the content root and collect sections
  const blockEls = contentRoot.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,pre,code');
  let currentGroup = null;

  blockEls.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const text = el.innerText?.trim();
    if (!text || text.length < 20) return;

    // Skip nav-like noise
    if (isNoise(el)) return;

    if (['h1', 'h2', 'h3', 'h4'].includes(tag)) {
      currentGroup = { heading: text, paragraphs: [], type: 'section' };
      result.sections.push(currentGroup);
    } else {
      if (!currentGroup) {
        currentGroup = { heading: '', paragraphs: [], type: 'section' };
        result.sections.push(currentGroup);
      }
      const type = tag === 'pre' || tag === 'code' ? 'code' : 'text';
      currentGroup.paragraphs.push({ text, type });
    }
  });

  // Keep only sections with meaningful content
  result.sections = result.sections.filter(
    (s) => s.heading || s.paragraphs.length > 0
  );

  // Cap at 20 sections for readability
  result.sections = result.sections.slice(0, 20);

  return result;
}

function scoredFallback() {
  let best = null;
  let bestScore = 0;
  document.querySelectorAll('div, section').forEach((el) => {
    const text = el.innerText?.trim() || '';
    const pCount = el.querySelectorAll('p').length;
    const linkDensity =
      el.querySelectorAll('a').length / Math.max(1, el.querySelectorAll('*').length);
    const score = text.length * 0.5 + pCount * 30 - linkDensity * 200;
    if (score > bestScore && text.length > 300) {
      bestScore = score;
      best = el;
    }
  });
  return best;
}

function isNoise(el) {
  const noiseSelectors = ['nav', 'header', 'footer', '.nav', '.menu', '.ad', '.sidebar', '.comment'];
  return noiseSelectors.some((sel) => el.closest(sel));
}

// ─── Overlay Construction ─────────────────────────────────────────────────────

function buildOverlay(data) {
  const ov = document.createElement('div');
  ov.id = 'typingflow-overlay';
  ov.innerHTML = `
    <div class="tf-container">
      <!-- Header -->
      <div class="tf-header">
        <div class="tf-brand">
          <span class="tf-logo">◆</span>
          <span class="tf-brand-name">TypingFlow</span>
        </div>
        <div class="tf-progress-wrap">
          <div class="tf-progress-bar"><div class="tf-progress-fill" id="tf-progress"></div></div>
          <span class="tf-section-counter" id="tf-counter">1 / ${data.sections.length}</span>
        </div>
        <button class="tf-close" id="tf-close" title="Exit (Esc)">✕</button>
      </div>

      <!-- Main reading area -->
      <div class="tf-body" id="tf-body">
        <div class="tf-page-title" id="tf-page-title">${escHtml(data.title)}</div>
        <div class="tf-section-heading" id="tf-section-heading"></div>
        <div class="tf-text" id="tf-text"></div>
        <span class="tf-cursor" id="tf-cursor">▊</span>
      </div>

      <!-- Controls -->
      <div class="tf-controls">
        <button class="tf-btn" id="tf-prev" title="Previous (←)">← Prev</button>
        <button class="tf-btn tf-btn-primary" id="tf-pause" title="Pause/Resume (Space)">⏸ Pause</button>
        <button class="tf-btn" id="tf-next" title="Next (→)">Next →</button>
        <div class="tf-speed-wrap">
          <span class="tf-speed-label">Speed</span>
          <input type="range" id="tf-speed" min="5" max="120" value="30" class="tf-slider" />
          <span class="tf-speed-label" id="tf-speed-val">Fast</span>
        </div>
        <button class="tf-btn" id="tf-restart" title="Restart section (R)">↺ Restart</button>
      </div>
    </div>
  `;
  return ov;
}

// ─── Typing Engine ────────────────────────────────────────────────────────────

function buildSectionText(section) {
  let lines = [];
  section.paragraphs.forEach((p) => {
    lines.push({ text: p.text, type: p.type });
  });
  return lines;
}

function renderSection(index) {
  if (!sections.length) return;
  const section = sections[index];

  const headingEl = document.getElementById('tf-section-heading');
  const textEl = document.getElementById('tf-text');
  const counterEl = document.getElementById('tf-counter');
  const progressEl = document.getElementById('tf-progress');

  // Update header info
  headingEl.textContent = section.heading || '';
  textEl.innerHTML = '';
  currentCharIndex = 0;

  counterEl.textContent = `${index + 1} / ${sections.length}`;
  const pct = ((index + 1) / sections.length) * 100;
  progressEl.style.width = `${pct}%`;

  // Build the full text to type for this section
  const paragraphs = buildSectionText(section);
  startTyping(textEl, paragraphs);
}

function startTyping(container, paragraphs) {
  clearInterval(typingInterval);
  isPaused = false;
  document.getElementById('tf-pause').textContent = '⏸ Pause';

  let paraIndex = 0;
  let charIndex = 0;
  let currentEl = null;

  function nextPara() {
    if (paraIndex >= paragraphs.length) {
      // Section done — show "next" hint
      const hint = document.createElement('div');
      hint.className = 'tf-done-hint';
      hint.textContent = '→ Press Next or → to continue';
      container.appendChild(hint);
      clearInterval(typingInterval);
      return;
    }
    const p = paragraphs[paraIndex];
    currentEl = document.createElement(p.type === 'code' ? 'pre' : 'p');
    currentEl.className = p.type === 'code' ? 'tf-code' : 'tf-para';
    container.appendChild(currentEl);
    charIndex = 0;
  }

  nextPara();

  typingInterval = setInterval(() => {
    if (isPaused) return;
    if (paraIndex >= paragraphs.length) { clearInterval(typingInterval); return; }

    const p = paragraphs[paraIndex];
    if (charIndex < p.text.length) {
      currentEl.textContent += p.text[charIndex];
      charIndex++;
      // Scroll into view smoothly
      currentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      paraIndex++;
      charIndex = 0;
      nextPara();
    }
  }, typingSpeed);
}

// ─── Session Controls ─────────────────────────────────────────────────────────

function nextSection() {
  if (currentSection < sections.length - 1) {
    currentSection++;
    renderSection(currentSection);
  }
}

function prevSection() {
  if (currentSection > 0) {
    currentSection--;
    renderSection(currentSection);
  }
}

function togglePause() {
  isPaused = !isPaused;
  const btn = document.getElementById('tf-pause');
  btn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
}

function restartSection() {
  renderSection(currentSection);
}

// ─── Keyboard Handler ─────────────────────────────────────────────────────────

function handleKey(e) {
  if (!sessionActive) return;
  switch (e.key) {
    case 'Escape': closeSession(); break;
    case 'ArrowRight': case 'ArrowDown': nextSection(); break;
    case 'ArrowLeft': case 'ArrowUp': prevSection(); break;
    case ' ': e.preventDefault(); togglePause(); break;
    case 'r': case 'R': restartSection(); break;
  }
}

// ─── Open / Close ─────────────────────────────────────────────────────────────

function openSession() {
  if (sessionActive) return;
  sessionActive = true;

  const data = extractPageContent();
  sections = data.sections;
  currentSection = 0;

  if (!sections.length) {
    alert('TypingFlow: No readable content found on this page.');
    sessionActive = false;
    return;
  }

  overlay = buildOverlay(data);
  document.body.appendChild(overlay);

  // Wire controls
  document.getElementById('tf-close').addEventListener('click', closeSession);
  document.getElementById('tf-next').addEventListener('click', nextSection);
  document.getElementById('tf-prev').addEventListener('click', prevSection);
  document.getElementById('tf-pause').addEventListener('click', togglePause);
  document.getElementById('tf-restart').addEventListener('click', restartSection);

  const speedSlider = document.getElementById('tf-speed');
  const speedVal = document.getElementById('tf-speed-val');
  speedSlider.addEventListener('input', () => {
    const v = parseInt(speedSlider.value);
    typingSpeed = 125 - v; // invert so right = faster
    speedVal.textContent = v > 90 ? 'Turbo' : v > 50 ? 'Fast' : v > 20 ? 'Normal' : 'Slow';
  });

  document.addEventListener('keydown', handleKey);
  renderSection(0);
}

function closeSession() {
  sessionActive = false;
  clearInterval(typingInterval);
  if (overlay) { overlay.remove(); overlay = null; }
  document.removeEventListener('keydown', handleKey);
}

// ─── Message Bridge ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'open') openSession();
  if (msg.action === 'close') closeSession();
  if (msg.action === 'status') return { active: sessionActive };
});

function escHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
