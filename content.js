(() => {
  'use strict';

  let rmb_value = NaN;
  const url = "https://wise.com/gateway/v4/comparisons?sourceCurrency=CNY&targetCurrency=BRL&sendAmount=1000";

  // 🚀 Substitui GM_xmlhttpRequest por chamada ao background.js
  chrome.runtime.sendMessage(
    { type: "fetch", url, headers: { Accept: "application/json" } },
    (response) => {
      if (response.error) {
        console.error("Erro na requisição:", response.error);
        return;
      }
      try {
        const json = JSON.parse(response.text);
        const rate = json.providers?.[0]?.quotes?.[0]?.rate;
        if (rate !== undefined) {
          console.log("Taxa de conversão (rate):", rate);
          rmb_value = rate;
        } else {
          console.error("Rate não encontrado no JSON.");
        }
      } catch (e) {
        console.error("Erro ao analisar o JSON:", e);
      }
    }
  );

    let taxa = 0.84;
    let percent = 10;

    chrome.storage.local.get("taxaConversao", (data) => {
        taxa = data.taxaConversao ?? 0.84;

        console.log("Taxa de conversão atual:", taxa);
    });

    chrome.storage.local.get("secPercent", (data) => {
        percent = data.secPercent ?? 10;

        console.log("Porcentagem atual%:", percent);
    });


  function processRow(row) {
    if (row.dataset.processedPrice084) return;

    let price = NaN;
    const dataGoodsAttr = row.getAttribute('data-goods-info');

    if (dataGoodsAttr) {
      try {
        const txtArea = document.createElement('textarea');
        txtArea.innerHTML = dataGoodsAttr;
        const decodedJson = txtArea.value;
        const goodsInfo = JSON.parse(decodedJson);
        if (goodsInfo && goodsInfo.price !== undefined) {
          const p = parseFloat(goodsInfo.price);
          if (!isNaN(p)) price = p;
        }
      } catch (e) {
        console.warn('Falha ao parsear JSON de data-goods-info:', e);
      }
    }

    if (isNaN(price)) {
      const strongElem = row.querySelector('td.t_Left strong.f_Strong');
      if (strongElem) {
        const txt = strongElem.innerText || strongElem.textContent;
        const numeric = txt.replace(/[^\d.]/g, '');
        const p2 = parseFloat(numeric);
        if (!isNaN(p2)) price = p2;
      }
    }

    if (isNaN(price)) {
      console.warn('Não conseguiu extrair preço para row id=', row.id);
      return;
    }

    const sellingConvertion = (price * taxa).toFixed(2).replace('.', ',');
    const convertion = (price * rmb_value).toFixed(2).replace('.', ',');
    const less15Off = ((price * rmb_value) - ((price * rmb_value) * 0.15)).toFixed(2).replace('.', ',');
    const less10Off = ((price * rmb_value) - ((price * rmb_value) * (percent/100))).toFixed(2).replace('.', ',');

    const cell = row.querySelector('td.t_Left');
    if (!cell) return;

    const wrapper = document.createElement('span');
    wrapper.style.display = 'inline-block';
    wrapper.style.marginLeft = '8px';
    wrapper.style.verticalAlign = 'middle';

    const span = document.createElement('span');
    const price2 = String(price).replace(".", ",");
    span.textContent = `¥${price2} → R$${convertion} | (*${taxa}) R$${sellingConvertion} | (15%↓) R$${less15Off} | (${percent}%↓) R$${less10Off}`;
    wrapper.appendChild(span);

    function createCopyButton(label, value) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.marginLeft = '6px';
      btn.style.cursor = 'pointer';
      btn.style.padding = '2px 6px';
      btn.style.fontSize = '0.9em';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(value)
          .then(() => {
            const original = btn.textContent;
            btn.textContent = 'Copiado!';
            setTimeout(() => btn.textContent = original, 1000);
          })
          .catch(err => console.error('Falha ao copiar:', err));
      });
      return btn;
    }

    wrapper.appendChild(createCopyButton('📋 Preço de Revenda', sellingConvertion));
    wrapper.appendChild(createCopyButton('📋 Preço 15% OFF', less15Off));
    wrapper.appendChild(createCopyButton(`📋 Preço ${percent}% OFF`, less10Off));

    cell.appendChild(wrapper);
    row.dataset.processedPrice084 = 'true';
  }

  function processAllRows() {
    const rows = document.querySelectorAll('tbody.list_tb_csgo tr[id^="sell_order"]');
    rows.forEach(processRow);
  }

  function observeNewRows() {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches && node.matches('tbody.list_tb_csgo tr[id^="sell_order"]')) {
            processRow(node);
          } else {
            const desc = node.querySelectorAll && node.querySelectorAll('tbody.list_tb_csgo tr[id^="sell_order"]');
            if (desc && desc.length) desc.forEach(processRow);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('load', () => {
    processAllRows();
    observeNewRows();
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    processAllRows();
    observeNewRows();
  }
})();
