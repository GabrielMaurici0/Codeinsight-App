// ════════════════════════════════════════════
// UI: Modal de Histórico de Análises
// ════════════════════════════════════════════

import { getAnalysisHistory, deleteHistoryRecord } from "../core/storage.js";
import { setReport, setFileContents } from "../core/state.js";
import { renderAll, _showFileChip } from "./render.js";
import { escHtml } from "../utils/helpers.js";

/** Abre o modal e carrega a lista de análises salvas */
export async function openHistoryModal() {
  const modal = document.getElementById("historyModal");
  const listContainer = document.getElementById("historyList");

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  listContainer.innerHTML =
    '<div style="text-align:center; padding:20px; color:var(--ink4)">Carregando histórico...</div>';

  try {
    const history = await getAnalysisHistory();

    if (history.length === 0) {
      listContainer.innerHTML =
        '<div class="cp-empty"><div class="cp-empty-icon">⏳</div><p>Nenhum histórico encontrado.</p></div>';
      return;
    }

    listContainer.innerHTML = history
      .map(
        (item) => `
      <div class="arch-rule" style="display:flex; justify-content:space-between; align-items:center;">
        <div style="flex:1; cursor:pointer;" onclick="loadHistoryItem(${item.id})">
          <div class="arch-rule-title" style="color:var(--blue)">
            ${escHtml(item.projectName)} ${item.isGXL ? '<span class="lang-badge lang-gxl" style="margin-left:8px">XPZ</span>' : ""}
          </div>
          <div class="arch-rule-desc">
            Nota: <strong>${item.score}</strong> · Issues: ${item.totalIssues} · Data: ${new Date(item.date).toLocaleString()}
          </div>
        </div>
        <button onclick="deleteHistoryItem(${item.id}, event)" style="background:transparent; border:none; color:var(--red); cursor:pointer; padding:8px; font-size:16px" title="Excluir">
          🗑️
        </button>
      </div>
    `,
      )
      .join("");

    // Armazenar temporariamente na memória global da janela para facilitar o carregamento
    window._tempHistoryMap = {};
    history.forEach((h) => (window._tempHistoryMap[h.id] = h));
  } catch (e) {
    listContainer.innerHTML =
      '<div style="color:var(--red); text-align:center; padding:20px">Erro ao carregar o histórico.</div>';
  }
}

export function closeHistoryModal() {
  document.getElementById("historyModal").style.display = "none";
  document.body.style.overflow = "";
}

/** Carrega os dados de um item do histórico de volta para a tela da aplicação */
export function loadHistoryItem(id) {
  const item = window._tempHistoryMap[id];
  if (!item) return;

  closeHistoryModal();

  // Esconde a hero section e mostra o resultado
  const hero = document.getElementById("heroSection");
  if (hero) hero.style.display = "none";
  document.getElementById("analysisResult").style.display = "block";

  // Restaura o estado
  setReport(item.reportData);
  setFileContents(item.fileContents);

  // Renderiza a interface
  renderAll(item.reportData);
  _showFileChip(item.projectName, "Carregado do Histórico", "var(--ink)", "⏳");
}

export async function deleteHistoryItem(id, event) {
  event.stopPropagation();
  if (confirm("Tem certeza que deseja excluir esta análise do histórico?")) {
    await deleteHistoryRecord(id);
    openHistoryModal(); // Recarrega a lista
  }
}

// Expõe para o DOM
window.openHistoryModal = openHistoryModal;
window.closeHistoryModal = closeHistoryModal;
window.loadHistoryItem = loadHistoryItem;
window.deleteHistoryItem = deleteHistoryItem;
