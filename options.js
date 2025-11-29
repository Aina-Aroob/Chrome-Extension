// options.js
function renderList(list) {
  const root = document.getElementById('whitelist');
  root.innerHTML = '';
  (list || []).forEach(domain => {
    const li = document.createElement('li');
    li.textContent = domain + ' ';
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'removeFromWhitelist', domain }, (resp) => {
        loadList();
      });
    });
    li.appendChild(btn);
    root.appendChild(li);
  });
}

function loadList() {
  chrome.runtime.sendMessage({ action: 'getWhitelist' }, (resp) => {
    renderList(resp.whitelist || []);
  });
}

document.getElementById('addBtn').addEventListener('click', () => {
  const input = document.getElementById('domainInput');
  const domain = input.value.trim();
  if (!domain) return;
  chrome.runtime.sendMessage({ action: 'addToWhitelist', domain }, (resp) => {
    input.value = '';
    loadList();
  });
});

loadList();
