// TypingFlow – Popup Controller

let isActive = false;

const startBtn  = document.getElementById('start-btn');
const btnIcon   = document.getElementById('btn-icon');
const btnLabel  = document.getElementById('btn-label');
const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');
const speedSlider = document.getElementById('speed-slider');
const speedVal  = document.getElementById('speed-val');

// ── Restore saved speed ──────────────────────────────────────────────────────
chrome.storage.local.get(['typingSpeed'], (res) => {
  if (res.typingSpeed) {
    speedSlider.value = res.typingSpeed;
    updateSpeedLabel(res.typingSpeed);
  }
});

speedSlider.addEventListener('input', () => {
  const v = parseInt(speedSlider.value);
  updateSpeedLabel(v);
  chrome.storage.local.set({ typingSpeed: v });
  // Live-update running session
  sendToPage({ action: 'setSpeed', value: v });
});

function updateSpeedLabel(v) {
  speedVal.textContent = v > 90 ? 'Turbo' : v > 55 ? 'Fast' : v > 25 ? 'Normal' : 'Slow';
}

// ── Start / Stop ─────────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  isActive = !isActive;

  if (isActive) {
    sendToPage({ action: 'open', speed: parseInt(speedSlider.value) });
    setActiveUI();
  } else {
    sendToPage({ action: 'close' });
    setIdleUI();
  }
});

function setActiveUI() {
  btnIcon.textContent  = '■';
  btnLabel.textContent = 'Stop Session';
  startBtn.classList.add('stop');
  statusPill.classList.add('active');
  statusText.textContent = 'ON';
}

function setIdleUI() {
  btnIcon.textContent  = '▶';
  btnLabel.textContent = 'Start Session';
  startBtn.classList.remove('stop');
  statusPill.classList.remove('active');
  statusText.textContent = 'OFF';
}

// ── Send message to active tab ───────────────────────────────────────────────
function sendToPage(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, msg).catch(() => {
        // Content script not yet injected — use scripting API as fallback
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js'],
        }).then(() => {
          chrome.tabs.sendMessage(tabs[0].id, msg);
        });
      });
    }
  });
}
