// ==UserScript==
// @name         Buff.163 Price ×0.84 + Copiar (correção por sell_order)v2
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Para cada <tr> dentro de tbody.list_tb_csgo cujo id começa com "sell_order", extrai sell_min_price decodificando corretamente, calcula valor*0.84, insere texto e botão de copiar. Garante valor individual por linha.
// @match        https://buff.163.com/goods/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let rmb_value = NaN;

    const url = "https://wise.com/gateway/v4/comparisons?sourceCurrency=CNY&targetCurrency=BRL&sendAmount=1000";

    GM_xmlhttpRequest({
        method: "GET",
        url: url,
        headers: {
            "Accept": "application/json"
        },
        onload: function(response) {
            try {
                const json = JSON.parse(response.responseText);
                const rate = json.providers?.[0]?.quotes?.[0]?.rate;

                if (rate !== undefined) {
                    console.log("Taxa de conversão (rate):", rate);
                    // Você pode usar essa variável 'rate' como quiser aqui
                    // Exemplo: salvar em localStorage ou exibir na tela
                    // localStorage.setItem("wise_conversion_rate", rate);
                    rmb_value = rate;
                } else {
                    console.error("Rate não encontrado no JSON.");
                }
            } catch (e) {
                console.error("Erro ao analisar o JSON:", e);
            }
        },
        onerror: function(error) {
            console.error("Erro na requisição:", error);
        }
    });

    /**
     * Processa uma linha <tr> de venda:
     * - Extrai preço via atributo data-goods-info decodificando HTML entities em JSON válido
     * - Se falhar, faz fallback extraindo do <strong class="f_Strong">
     * - Calcula preço * 0.84 e insere texto + botão de copiar dentro de <td class="t_Left">
     * - Marca a linha como processada, evitando duplicação
     */
    function processRow(row) {
        // Evita reprocessar a mesma linha
        if (row.dataset.processedPrice084) {
            return;
        }

        let price = NaN;
        const dataGoodsAttr = row.getAttribute('data-goods-info');

        if (dataGoodsAttr) {
            try {
                // Decodifica HTML entities para obter JSON válido
                const txtArea = document.createElement('textarea');
                txtArea.innerHTML = dataGoodsAttr;
                const decodedJson = txtArea.value;
                // Opcional: debug no console; comente se preferir
                // console.log('Processando row id=', row.id, 'decodedJson=', decodedJson);
                const goodsInfo = JSON.parse(decodedJson);
                if (goodsInfo && goodsInfo.price !== undefined) {
                    const p = parseFloat(goodsInfo.price);
                    if (!isNaN(p)) {
                        price = p;
                    }
                }
            } catch (e) {
                console.warn('Tampermonkey: falha ao parsear JSON de data-goods-info (decodificado):', e);
                // Segue para fallback se price continuar NaN
            }
        }

        // Fallback: extrair do texto exibido em <strong class="f_Strong">
        if (isNaN(price)) {
            const strongElem = row.querySelector('td.t_Left strong.f_Strong');
            if (strongElem) {
                const txt = strongElem.innerText || strongElem.textContent;
                const numeric = txt.replace(/[^\d.]/g, '');
                const p2 = parseFloat(numeric);
                if (!isNaN(p2)) {
                    price = p2;
                    // console.log('Fallback strong para row id=', row.id, 'price=', price);
                }
            }
        }

        if (isNaN(price)) {
            // Não conseguiu extrair preço; aborta esta linha
            console.warn('Tampermonkey: não conseguiu extrair preço para row id=', row.id);
            return;
        }

        // Calcula e formata com duas casas
        const sellingConvertion = (price * 0.84).toFixed(2).replace('.', ',');
        const convertion = (price * rmb_value).toFixed(2).replace(".", ",");
        const less15Off = ((price * rmb_value) - (((price * rmb_value)/100)*15)).toFixed(2).replace('.', ',');
        const less10Off = ((price * rmb_value) - (((price * rmb_value)/100)*10)).toFixed(2).replace('.', ',');

        // Seleciona a célula onde será inserido
        const cell = row.querySelector('td.t_Left');
        if (!cell) {
            return;
        }

        // Cria contêiner inline para texto + botão
        const wrapper = document.createElement('span');
        wrapper.style.display = 'inline-block';
        wrapper.style.marginLeft = '8px';
        wrapper.style.verticalAlign = 'middle';

        // Texto com o valor calculado
        const span = document.createElement('span');
        var price2 = String(price).replace(".", ",")
        span.textContent = `¥${price2} → R$${convertion} | (*.84) R$${sellingConvertion} | (15%↓) R$${less15Off} | (10%↓) R$${less10Off}`;
        wrapper.appendChild(span);

        // Botão Copiar
        const btn = document.createElement('button');
        btn.textContent = '📋 Preço de Revenda';
        btn.style.marginLeft = '6px';
        btn.style.cursor = 'pointer';
        btn.style.padding = '2px 6px';
        btn.style.fontSize = '0.9em';
        btn.addEventListener('click', function() {
            navigator.clipboard.writeText(sellingConvertion)
                .then(() => {
                    const original = btn.textContent;
                    btn.textContent = 'Copiado!';
                    setTimeout(() => {
                        btn.textContent = original;
                    }, 1000);
                })
                .catch(err => {
                    console.error('Tampermonkey: falha ao copiar para clipboard:', err);
                });
        });
        wrapper.appendChild(btn);

        // Botão Copiar
        const btn2 = document.createElement('button');
        btn2.textContent = '📋 Preço 15% OFF';
        btn2.style.marginLeft = '6px';
        btn2.style.cursor = 'pointer';
        btn2.style.padding = '2px 6px';
        btn2.style.fontSize = '0.9em';
        btn2.addEventListener('click', function() {
            navigator.clipboard.writeText(less15Off)
                .then(() => {
                    const original2 = btn2.textContent;
                    btn2.textContent = 'Copiado!';
                    setTimeout(() => {
                        btn2.textContent = original2;
                    }, 1000);
                })
                .catch(err => {
                    console.error('Tampermonkey: falha ao copiar para clipboard:', err);
                });
        });
        wrapper.appendChild(btn2);

        // Botão Copiar
        const btn3 = document.createElement('button');
        btn3.textContent = '📋 Preço 10% OFF';
        btn3.style.marginLeft = '6px';
        btn3.style.cursor = 'pointer';
        btn3.style.padding = '2px 6px';
        btn3.style.fontSize = '0.9em';
        btn3.addEventListener('click', function() {
            navigator.clipboard.writeText(less10Off)
                .then(() => {
                    const original3 = btn3.textContent;
                    btn3.textContent = 'Copiado!';
                    setTimeout(() => {
                        btn3.textContent = original3;
                    }, 1000);
                })
                .catch(err => {
                    console.error('Tampermonkey: falha ao copiar para clipboard:', err);
                });
        });
        wrapper.appendChild(btn3);

        cell.appendChild(wrapper);
        row.dataset.processedPrice084 = 'true';
    }

    /**
     * Processa todas as linhas existentes no momento:
     * Seleciona <tr> dentro de <tbody class="list_tb_csgo"> cujo id começa com "sell_order"
     */
    function processAllRows() {
        const rows = document.querySelectorAll('tbody.list_tb_csgo tr[id^="sell_order"]');
        rows.forEach(processRow);
    }

    /**
     * Observa alterações no DOM para capturar novas linhas inseridas dinamicamente
     */
    function observeNewRows() {
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    // Se for <tr id^="sell_order"> dentro de tbody.list_tb_csgo
                    if (node.matches && node.matches('tbody.list_tb_csgo tr[id^="sell_order"]')) {
                        processRow(node);
                    } else {
                        // Verifica descendentes
                        const desc = node.querySelectorAll && node.querySelectorAll('tbody.list_tb_csgo tr[id^="sell_order"]');
                        if (desc && desc.length) {
                            desc.forEach(processRow);
                        }
                    }
                }
            }
        });
        // Observa body inteiro. Se souber um container específico e estável, pode ajustar aqui para otimizar.
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Ao carregar a página, processa o que já existe e começa a observar
    window.addEventListener('load', () => {
        processAllRows();
        observeNewRows();
    });
    // Caso o script seja injetado após a página já estar “ready”
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        processAllRows();
        observeNewRows();
    }
})();
