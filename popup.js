document.addEventListener('DOMContentLoaded', () => {
  const btnBeautify = document.getElementById('btn-beautify');
  const btnType = document.getElementById('btn-type');
  const btnSave = document.getElementById('btn-save');

  // Ping the content script to see if nuggets already exist
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, (resp) => {
      // If we receive a response and nuggets exist, enable the secondary buttons
      if (resp && resp.hasNuggets) {
        enableButtons();
      }
    });
  });

  function enableButtons() {
    btnType.classList.remove('disabled');
    btnType.disabled = false;
    btnSave.classList.remove('disabled');
    btnSave.disabled = false;
  }

  // Button 1: Beautify
  btnBeautify.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "beautify"}, (resp) => {
        if (resp && resp.success) {
          enableButtons();
        }
      });
    });
  });

  // Button 2: Typing Flow
  btnType.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "type"});
    });
  });

  // Button 3: Save HTML
  btnSave.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "save"});
    });
  });
});
