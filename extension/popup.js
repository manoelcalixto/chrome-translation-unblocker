"use strict";

const toggle = document.getElementById("enabled");
const statusText = document.getElementById("status");
const errorText = document.getElementById("error");
let enabled = true;

function showSetting(value) {
  enabled = value !== false;
  toggle.setAttribute("aria-checked", String(enabled));
}

async function updateStatus() {
  if (!enabled) {
    statusText.textContent = "Ajuste pausado em todos os sites. Recarregue a página para voltar à apresentação original.";
    return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error("No active tab");
    const page = await chrome.tabs.sendMessage(tab.id, { type: "liberar-traducao/status" }, { frameId: 0 });
    if (!page?.initialized || page.settingsError) throw new Error("Unavailable");
    if (!page.enabled) {
      statusText.textContent = "Ajuste pausado nesta página. Reabra o painel para atualizar.";
    } else if (page.adjustedElements + page.removedPageHints > 0) {
      statusText.textContent = "Conteúdo liberado. Agora use a tradução do Chrome.";
    } else {
      statusText.textContent = "Ajuste ativo. Novos conteúdos serão verificados automaticamente.";
    }
  } catch {
    statusText.textContent = "Abra um site e recarregue a página. Páginas internas do Chrome e sites com acesso restrito não permitem este ajuste.";
  }
}

toggle.addEventListener("click", async () => {
  toggle.disabled = true;
  errorText.hidden = true;
  try {
    const next = !enabled;
    await chrome.storage.local.set({ enabled: next });
    showSetting(next);
    await updateStatus();
  } catch {
    errorText.textContent = "Não foi possível salvar. Reabra a extensão e tente novamente.";
    errorText.hidden = false;
  } finally {
    toggle.disabled = false;
  }
});

async function initialize() {
  try {
    const saved = await chrome.storage.local.get({ enabled: true });
    showSetting(saved.enabled);
    await updateStatus();
    toggle.disabled = false;
  } catch {
    statusText.textContent = "Não foi possível carregar a configuração. Reabra a extensão.";
  }
}

void initialize();
