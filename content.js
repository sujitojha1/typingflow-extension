let nuggets = [];
let overlay = null;
let mode = 'none';
let typingIndex = 0;
let typingStartTime = 0;
let totalCharsTyped = 0;

function extractNuggets() {
  const pTags = Array.from(document.querySelectorAll('p'))
    .map(p => p.innerText.trim())
    .filter(text => text.length > 50 && text.length < 350);

  // Take the best paragraphs as nuggets
  nuggets = pTags.slice(0, 8);
  if(nuggets.length === 0) {
    nuggets = ["No substantial content could be extracted from this page."];
  }
  return nuggets;
}

function createOverlay() {
  if (overlay) document.body.removeChild(overlay);
  overlay = document.createElement('div');
  overlay.id = 'tf-master-overlay';
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden'; // prevent background scrolling
}

function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  document.body.style.overflow = '';
  mode = 'none';
}

function showBeautified() {
  createOverlay();
  mode = 'beautify';
  let html = `<button id="tf-close">✕</button>`;
  html += `
    <div class="tf-inner-wrapper">
      <h1 class="tf-h1">Content Nuggets</h1>
      <p class="tf-subtitle">Distilled pieces of information from this page</p>
  `;
  nuggets.forEach((n, i) => {
    html += `<div class="tf-nugget-card"><span class="tf-nugget-idx">#${i+1}</span>${n}</div>`;
  });
  html += `</div>`;
  overlay.innerHTML = html;

  document.getElementById('tf-close').addEventListener('click', removeOverlay);
}

function showTyping() {
  if(nuggets.length === 0) extractNuggets();
  createOverlay();
  mode = 'type';
  typingIndex = 0;
  typingStartTime = Date.now();
  totalCharsTyped = 0;
  renderTypingChallenge();
}

function renderTypingChallenge() {
  if (typingIndex >= nuggets.length) {
    const elapsedSec = Math.floor((Date.now() - typingStartTime) / 1000);
    const wpm = elapsedSec > 0 ? Math.round((totalCharsTyped / 5) / (elapsedSec / 60)) : 0;
    overlay.innerHTML = `
      <button id="tf-close">✕</button>
      <div class="tf-inner-wrapper" style="text-align:center; transform: translateY(30vh);">
        <h1 class="tf-h1" style="font-size: 40px; margin-bottom: 5px;">Typing Complete!</h1>
        <p style="color: #9A958E; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">You've actively engaged with all the nuggets.</p>
        
        <div class="tf-stats">
          <div class="tf-stat-box">
             <div class="tf-stat-val">${elapsedSec}s</div>
             <div class="tf-stat-label">Time Spent</div>
          </div>
          <div class="tf-stat-box">
             <div class="tf-stat-val">${totalCharsTyped}</div>
             <div class="tf-stat-label">Characters</div>
          </div>
          <div class="tf-stat-box">
             <div class="tf-stat-val">${wpm}</div>
             <div class="tf-stat-label">WPM</div>
          </div>
        </div>

        <button id="tf-done-btn" class="tf-action-btn">DONE</button>
      </div>`;
    document.getElementById('tf-close').addEventListener('click', removeOverlay);
    document.getElementById('tf-done-btn').addEventListener('click', removeOverlay);
    return;
  }

  const text = nuggets[typingIndex].replace(/\\s+/g, ' '); // normalize spaces
  let html = `<button id="tf-close">✕</button>
    <div class="tf-typing-container">
      <div class="tf-typing-header">Nugget ${typingIndex + 1} of ${nuggets.length}</div>
      <div id="tf-target" class="tf-target">`;
  
  for(let i=0; i<text.length; i++) {
    html += `<span class="tf-char">${text[i] === ' ' ? '&nbsp;' : text[i]}</span>`;
  }
  html += `</div>
      <input type="text" id="tf-hidden-input" class="tf-input-hidden" autocomplete="off" spellcheck="false" />
    </div>`;

  overlay.innerHTML = html;

  const targetDiv = document.getElementById('tf-target');
  const input = document.getElementById('tf-hidden-input');
  
  targetDiv.querySelectorAll('.tf-char')[0]?.classList.add('cursor');
  
  // Bring focus to invisible input constantly
  setTimeout(() => input.focus(), 100);
  document.getElementById('tf-master-overlay').addEventListener('click', () => input.focus());

  document.getElementById('tf-close').addEventListener('click', removeOverlay);

  // Prevent pasting to artificially bypass
  input.addEventListener('paste', e => e.preventDefault());
  input.addEventListener('drop', e => e.preventDefault());

  input.addEventListener('input', (e) => {
    const typed = e.target.value;
    const spans = targetDiv.querySelectorAll('.tf-char');
    
    if (typed.length > text.length) {
      input.value = typed.slice(0, text.length);
      return;
    }

    let allCorrect = true;
    spans.forEach((span, i) => {
      span.className = 'tf-char';
      if (i < typed.length) {
        if (typed[i] === text[i]) {
          span.classList.add('correct');
        } else {
          span.classList.add('wrong');
          allCorrect = false;
        }
      } else if (i === typed.length) {
        span.classList.add('cursor');
      }
    });

    if (typed.length === text.length && allCorrect) {
      setTimeout(() => {
        totalCharsTyped += text.length;
        typingIndex++;
        renderTypingChallenge();
      }, 400); // short delay to show the final green character
    }
  });
}

function saveAsHTML() {
  if (nuggets.length === 0) extractNuggets();
  const date = new Date().toLocaleDateString();
  const cardsHtml = nuggets.map((n, i) => '<div class="card"><div class="chip">#' + (i+1) + '</div><div>' + n + '</div></div>').join('');
  let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TypingFlow Saved Nuggets</title>
  <style>
    body { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; background: #2A2926; color: #ECEBDE; padding: 60px 20px; line-height: 1.6; min-height: 100vh; margin: 0; }
    .container { max-width: 760px; margin: auto; }
    .card { background: #32302E; padding: 30px 40px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-size: 18px; }
    h1 { color: #ECEBDE; font-size: 32px; margin-bottom: 5px; font-family: ui-sans-serif, system-ui, sans-serif;}
    .meta { color: #9A958E; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; font-family: ui-sans-serif, system-ui, sans-serif;}
    .chip { display: inline-block; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; font-weight: 600; color: #D97757; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Distilled Nuggets</h1>
    <div class="meta">Extracted on ${date}</div>
    ${cardsHtml}
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TypingFlow_Nuggets_${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Single listener addition pattern for content script
if (!window.tfContentInitialized) {
  window.tfContentInitialized = true;
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ hasNuggets: nuggets.length > 0 });
    } else if (request.action === 'beautify') {
      if(nuggets.length === 0) extractNuggets();
      showBeautified();
      sendResponse({ success: true });
    } else if (request.action === 'type') {
      showTyping();
      sendResponse({ success: true });
    } else if (request.action === 'save') {
      saveAsHTML();
      sendResponse({ success: true });
    }
  });
}
