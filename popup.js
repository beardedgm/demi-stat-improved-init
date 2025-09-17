document.getElementById('extractBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['content.js']
    });
  });
});

const copyBtn = document.getElementById('copyBtn');
const outputPre = document.getElementById('output');

copyBtn.addEventListener('click', () => {
  const jsonText = outputPre.textContent;
  navigator.clipboard.writeText(jsonText).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = 'Copy JSON';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "displayStats") {
    if (request.data) {
      outputPre.textContent = JSON.stringify(request.data, null, 2);
      copyBtn.style.display = 'block'; // Show the copy button
    } else {
      outputPre.textContent = "Could not find character stats on this page.";
      copyBtn.style.display = 'none'; // Hide the copy button
    }
  }
});