chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "fetch") {
    fetch(msg.url, { headers: msg.headers || {} })
      .then(res => res.text())
      .then(text => sendResponse({ text }))
      .catch(err => sendResponse({ error: err.toString() }));
    return true; // mantém o canal aberto enquanto a resposta é carregada
  }
});
