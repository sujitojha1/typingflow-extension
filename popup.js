// TypingFlow – Popup Controller

let isActive = false;

const startBtn  = document.getElementById('start-btn');
const btnIcon   = document.getElementById('btn-icon');
const btnLabel  = document.getElementById('btn-label');
const pill      = document.getElementById('pill');
const pillText  = document.getElementById('pill-text');

startBtn.addEventListener('click', () => {
  isActive = !isActive;

  if (isActive) {
    sendToPage({ action: 'open' });
    btnIcon.textContent  = '■';
    btnLabel.textContent = 'Stop Session';
    startBtn.classList.add('off');
    pill.classList.add('on');
    pillText.textContent = 'ON';
  } else {
    sendToPage({ action: 'close' });
    btnIcon.textContent  = '▶';
    btnLabel.textContent = 'Start Typing Session';
    startBtn.classList.remove('off');
    pill.classList.remove('on');
    pillText.textContent = 'OFF';
  }
});

function sendToPage(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, msg).catch(() => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js'],
      }).then(() => {
        return chrome.scripting.insertCSS({
          target: { tabId: tabs[0].id },
          files: ['typing-session.css'],
        });
      }).then(() => chrome.tabs.sendMessage(tabs[0].id, msg));
    });
  });
}
