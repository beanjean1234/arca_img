document.getElementById('actionBtn').addEventListener('click', () => {
  console.log('Action button clicked!');
  
  // Example: Change background color of the current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        document.body.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
      }
    });
  });

  // Visual feedback on button
  const btn = document.getElementById('actionBtn');
  const originalText = btn.innerText;
  btn.innerText = 'Executed!';
  btn.style.backgroundColor = '#10b981';
  
  setTimeout(() => {
    btn.innerText = originalText;
    btn.style.backgroundColor = '';
  }, 2000);
});
