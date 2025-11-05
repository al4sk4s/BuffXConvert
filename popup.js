const slider = document.getElementById("valor");
const valueDisplay = document.getElementById("valueDisplay");
const saveButton = document.getElementById("save");

// Carrega valor (usa local como recomendado)
chrome.storage.local.get({ taxaConversao: 0.84 }, (data) => {
  slider.value = data.taxaConversao;
  valueDisplay.textContent = data.taxaConversao;
});

slider.addEventListener("input", () => {
  valueDisplay.textContent = slider.value;
});

saveButton.addEventListener("click", () => {
  const valor = parseFloat(slider.value);

  // Salva no storage.local e verifica o resultado
  chrome.storage.local.set({ taxaConversao: valor }, () => {
    if (chrome.runtime.lastError) {
      console.error("Erro ao salvar taxa:", chrome.runtime.lastError);
      alert("Erro ao salvar configuração. Veja console.");
      return;
    }

    // Confirma lendo de volta — útil para debug e garantia
    chrome.storage.local.get("taxaConversao", (res) => {
      console.log("Valor salvo confirmado:", res.taxaConversao);

      // Recarrega a aba ativa após confirmação
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.reload(tabs[0].id, () => {
            // Fecha o popup
            window.close();
          });
        } else {
          window.close();
        }
      });
    });
  });
});
