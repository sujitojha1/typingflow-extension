let nuggets = [];
let overlay = null;
let mode = 'none';
let typingIndex = 0;
let typingStartTime = 0;
let totalCharsTyped = 0;

function extractNuggets() {
  nuggets = [];
  const pTags = Array.from(document.querySelectorAll('p'));
  
  for (let p of pTags) {
    const text = p.innerText.trim();
    if (text.length > 50 && text.length < 1500) {
      let imgNode = p.closest('section, article, figure, .content, div')?.querySelector('img') || p.previousElementSibling?.querySelector('img');
      if (!imgNode && p.previousElementSibling?.tagName === 'IMG') {
        imgNode = p.previousElementSibling;
      }
      let imgSrc = imgNode ? imgNode.src : null;
      if (imgNode && (imgNode.width > 0 && imgNode.width < 50)) {
        imgSrc = null; // discard tiny icons if size is calculable
      }
      
      nuggets.push({ text: text, image: imgSrc });
      if (nuggets.length >= 8) break;
    }
  }

  if(nuggets.length === 0) {
    nuggets = [{ text: "No substantial content could be extracted from this page.", image: null }];
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
    let imgHtml = n.image ? `<img src="${n.image}" style="max-width:100%; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);" />` : '';
    let mockDots = `<div style="display:flex; gap: 6px; position:absolute; top: 12px; left: 15px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #ED655A;"></div>
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #E1C04C;"></div>
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #72BE47;"></div>
      </div>`;
    html += `<div class="tf-nugget-card tf-clickable-card" data-idx="${i}" style="cursor: pointer; padding-top: 35px;" title="Click to start typing this nugget">${mockDots}<span class="tf-nugget-idx">#${i+1}</span>${imgHtml}<div style="white-space:pre-wrap;">${n.text}</div></div>`;
  });
  html += `</div>`;
  overlay.innerHTML = html;

  document.getElementById('tf-close').addEventListener('click', removeOverlay);
  document.querySelectorAll('.tf-clickable-card').forEach(card => {
    card.addEventListener('click', (e) => {
      typingIndex = parseInt(e.currentTarget.getAttribute('data-idx'));
      mode = 'type';
      renderTypingChallenge();
    });
  });
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

  const nugget = nuggets[typingIndex];
  const text = nugget.text.replace(/\s+/g, ' '); // normalize spaces
  let nuggetStartTime = Date.now();
  
  let imgHtml = nugget.image ? `<div style="text-align:center; margin-bottom: 25px;"><img src="${nugget.image}" style="max-height: 200px; max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);" /></div>` : '';

  let html = `<button id="tf-close">✕</button>
    <div class="tf-typing-container">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
        <div style="display:flex; gap: 6px; align-items:center; margin-right: 25px;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #ED655A;"></div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #E1C04C;"></div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #72BE47;"></div>
        </div>
        <div style="display:flex; gap: 15px; flex: 1;">
          <button id="tf-prev-btn" style="background:none; border:none; color:#9A958E; font-size:12px; font-weight:600; cursor:${typingIndex === 0 ? 'not-allowed' : 'pointer'}; text-transform:uppercase; letter-spacing:1px; font-family:inherit; opacity: ${typingIndex === 0 ? 0.4 : 1};">⬅ Prev</button>
          <button id="tf-next-btn" style="background:none; border:none; color:#D97757; font-size:12px; font-weight:600; cursor:pointer; text-transform:uppercase; letter-spacing:1px; font-family:inherit;">Next ➔</button>
        </div>
        <div style="color: #9A958E; font-size: 13px; font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 500;">
          <span id="tf-live-wpm" style="display:inline-block; width:65px">0 WPM</span> • 
          <span id="tf-live-acc" style="display:inline-block; width:75px">100% ACC</span> • 
          <span id="tf-live-prog" style="color: #D97757;">0/${text.length}</span>
        </div>
      </div>
      <div class="tf-typing-header" style="margin-bottom: 30px;">Nugget ${typingIndex + 1} of ${nuggets.length}</div>
      ${imgHtml}
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
  document.getElementById('tf-next-btn').addEventListener('click', () => {
    typingIndex++;
    renderTypingChallenge();
  });
  document.getElementById('tf-prev-btn').addEventListener('click', () => {
    if (typingIndex > 0) {
      typingIndex--;
      renderTypingChallenge();
    }
  });

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
    let errors = 0;
    spans.forEach((span, i) => {
      span.className = 'tf-char';
      if (i < typed.length) {
        if (typed[i] === text[i]) {
          span.classList.add('correct');
        } else {
          span.classList.add('wrong');
          errors++;
          allCorrect = false;
        }
      } else if (i === typed.length) {
        span.classList.add('cursor');
      }
    });

    // Update live metrics
    const timeElapsedMins = (Date.now() - nuggetStartTime) / 60000;
    const wpm = timeElapsedMins > 0 ? Math.round((typed.length / 5) / timeElapsedMins) : 0;
    const acc = typed.length > 0 ? Math.round(((typed.length - errors) / typed.length) * 100) : 100;
    document.getElementById('tf-live-prog').innerText = `${typed.length}/${text.length}`;
    document.getElementById('tf-live-wpm').innerText = `${wpm} WPM`;
    document.getElementById('tf-live-acc').innerText = `${acc}% ACC`;

    if (typed.length === text.length && allCorrect) {
      setTimeout(() => {
        totalCharsTyped += text.length;
        
        // Save to global tracker
        chrome.storage.local.get(['lifetimeChars'], (res) => {
          let chars = (res.lifetimeChars || 0) + text.length;
          chrome.storage.local.set({lifetimeChars: chars});
        });

        typingIndex++;
        renderTypingChallenge();
      }, 400); // short delay to show the final green character
    }
  });
}

function saveAsHTML() {
  if (nuggets.length === 0) extractNuggets();
  const date = new Date().toLocaleDateString();
  const cardsHtml = nuggets.map((n, i) => {
    let imgHtml = n.image ? `<img src="${n.image}" style="max-width:100%; border-radius: 8px; margin-bottom: 20px;" />` : '';
    return `<div class="card"><div class="chip">#${i+1}</div>${imgHtml}<div style="white-space:pre-wrap;">${n.text}</div></div>`;
  }).join('');
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

  // Time tracker for this domain
  let activeSeconds = 0;
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      activeSeconds++;
      if (activeSeconds % 60 === 0) {
        const domain = window.location.hostname;
        chrome.storage.local.get([domain], (res) => {
          let mins = (res[domain] || 0) + 1;
          chrome.storage.local.set({[domain]: mins});
        });
      }
    }
  }, 1000);
}
