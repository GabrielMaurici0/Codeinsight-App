// ════════════════════════════════════════════
// UI: Controles de Interface (Abas, Filtros, Ações)
// ════════════════════════════════════════════

import {
  getActiveSev,
  setActiveSev,
  getReport,
  getAllIssues,
} from "../core/state.js";
import { renderIssues, displayIssues } from "./render.js";

// ── Abas ──
export function showTab(name, el) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => (p.style.display = "none"));
  el.classList.add("active");
  document.getElementById("tab-" + name).style.display = "block";
}

// ── Filtro de severidade (sidebar) ──
export function setSevFilter(val, el) {
  if (getActiveSev() === val) {
    setActiveSev(null);
    el.classList.remove("active");
  } else {
    document
      .querySelectorAll(".pill")
      .forEach((e) => e.classList.remove("active"));
    setActiveSev(val);
    el.classList.add("active");
  }
  const report = getReport();
  if (report) renderIssues(report.allIssues);
}

// ── Busca de Issues ──
export function filterIssues() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  // CORREÇÃO: Usando o getter getAllIssues()
  const issuesList = getAllIssues() || [];
  const filtered = issuesList.filter(
    (i) =>
      (i.title || "").toLowerCase().includes(q) ||
      (i.description || "").toLowerCase().includes(q) ||
      (i.id || "").toLowerCase().includes(q) ||
      (i.category || "").toLowerCase().includes(q) ||
      (i.file || "").toLowerCase().includes(q),
  );
  displayIssues(filtered);
}

// ── Download JSON ──
export function downloadJson() {
  // CORREÇÃO: Pegando o report via getter
  const report = getReport();
  if (!report) return;

  const blob = new Blob([JSON.stringify(report.cicd, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "codeinsight-report.json";
  a.click();
}

window.showTab = showTab;
window.setSevFilter = setSevFilter;
window.filterIssues = filterIssues;
window.downloadJson = downloadJson;
