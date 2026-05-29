// ════════════════════════════════════════════
// UI: Gerenciamento de Modais
// ════════════════════════════════════════════

import { escHtml } from "../utils/helpers.js";
import {
  syntaxHighlight,
  highlightCode,
  preprocessBlockComments,
} from "../utils/highlighter.js";
import { ISSUE_KB } from "../data/issue-kb.js";
import { renderSnippet } from "./render.js"; // Precisamos exportar isso lá do render.js!

// ── CODE PREVIEW MODAL ──

export function openCodePreview(
  name,
  content,
  lang,
  issues = [],
  gxMeta = null,
) {
  const modal = document.getElementById("codePreviewModal");

  // Filename & lang badge
  document.getElementById("cpFileName").textContent = name;
  const langIcons = {
    js: "JS",
    ts: "TS",
    py: "PY",
    java: "JV",
    go: "GO",
    cs: "C#",
    cpp: "C++",
    c: "C",
    php: "PHP",
    rb: "RB",
    rs: "RS",
    gxl: "GX",
    unknown: "?",
  };
  const badge = document.getElementById("cpLangBadge");
  badge.textContent = langIcons[lang] || lang.toUpperCase();
  badge.className = "cp-lang-badge lang-" + lang;

  // Issues summary pills
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  (issues || []).forEach((i) => {
    if (sevCounts[i.severity] !== undefined) sevCounts[i.severity]++;
  });

  const issuesSummary = [
    sevCounts.critical > 0
      ? `<span class="cp-issue-pill sev-critical">${sevCounts.critical} crítico${sevCounts.critical > 1 ? "s" : ""}</span>`
      : "",
    sevCounts.high > 0
      ? `<span class="cp-issue-pill sev-high">${sevCounts.high} alto${sevCounts.high > 1 ? "s" : ""}</span>`
      : "",
    sevCounts.medium > 0
      ? `<span class="cp-issue-pill sev-medium">${sevCounts.medium} médio${sevCounts.medium > 1 ? "s" : ""}</span>`
      : "",
    sevCounts.low > 0
      ? `<span class="cp-issue-pill sev-low">${sevCounts.low} baixo${sevCounts.low > 1 ? "s" : ""}</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  document.getElementById("cpIssuesSummary").innerHTML =
    issuesSummary || '<span class="cp-no-issues">✓ Sem issues</span>';

  const body = document.getElementById("cpBody");
  const tabsEl = document.getElementById("cpSectionTabs");

  // Empty state
  if (!content && !gxMeta) {
    tabsEl.style.display = "none";
    body.innerHTML = `<div class="cp-empty">
      <div class="cp-empty-icon">📂</div>
      <p>O conteúdo deste arquivo não está disponível.<br>
      <span style="font-size:12px;color:var(--ink4)">Apenas arquivos carregados diretamente têm pré-visualização.</span></p>
    </div>`;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    return;
  }

  // GX Object
  const GX_TAB_TYPES = ["transaction", "procedure", "webpanel"];
  const isGXTabbed =
    gxMeta &&
    lang === "gxl" &&
    GX_TAB_TYPES.includes((gxMeta.obj_type || "").toLowerCase());

  if (gxMeta && lang === "gxl") {
    const sections = [];
    const sourceCode = gxMeta._source || "";
    if (sourceCode && (gxMeta.obj_type || "").toLowerCase() !== "webpanel")
      sections.push({
        id: "source",
        icon: "⌨",
        label: "Source",
        code: sourceCode,
      });

    const allEvents = (gxMeta._events || []).join("\n\n");
    if (allEvents.trim())
      sections.push({
        id: "events",
        icon: "⚡",
        label: "Events",
        code: allEvents,
      });

    const allRules = (gxMeta._rules || []).join("\n\n");
    if (allRules.trim())
      sections.push({
        id: "rules",
        icon: "📋",
        label: "Rules",
        code: allRules,
      });

    if (!sections.length) {
      const raw = content || gxMeta.raw_content || "";
      if (raw)
        sections.push({ id: "raw", icon: "📄", label: "Código", code: raw });
    }

    if (!sections.length) {
      tabsEl.style.display = "none";
      body.innerHTML = `<div class="cp-empty"><div class="cp-empty-icon">🔍</div><p>Nenhum código fonte disponível para este objeto GeneXus.</p></div>`;
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      return;
    }

    if (isGXTabbed && sections.length > 1) {
      tabsEl.style.display = "flex";
      tabsEl.innerHTML = sections
        .map(
          (sec, idx) => `
        <button class="cp-section-tab${idx === 0 ? " active" : ""}" onclick="cpSwitchTab('${sec.id}', this)" data-cp-tab="${sec.id}">
          <span class="cp-tab-icon">${sec.icon}</span>${escHtml(sec.label)}
        </button>`,
        )
        .join("");
    } else {
      tabsEl.style.display = "none";
    }

    body.innerHTML = sections
      .map(
        (sec, idx) => `
      <div class="cp-section-panel${idx === 0 ? " active" : ""}" id="cp-panel-${sec.id}">
        ${renderCodeBlock(sec.code, lang, issues)}
      </div>`,
      )
      .join("");
  } else {
    // Arquivo normal
    tabsEl.style.display = "none";
    body.innerHTML = renderCodeBlock(content || "", lang, issues);
  }

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

export function cpSwitchTab(tabId, btn) {
  btn
    .closest(".cp-section-tabs")
    .querySelectorAll(".cp-section-tab")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document
    .querySelectorAll(".cp-section-panel")
    .forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById("cp-panel-" + tabId);
  if (panel) panel.classList.add("active");
}

export function renderCodeBlock(code, lang, issues = []) {
  if (!code?.trim())
    return `<div class="cp-empty">Sem código disponível.</div>`;

  const issueLines = new Set();
  const issueAtLine = {};
  (issues || []).forEach((iss) => {
    (iss.snippets || []).forEach((s) => {
      if (s.line) {
        issueLines.add(s.line);
        (issueAtLine[s.line] = issueAtLine[s.line] || []).push(iss);
      }
      if (s.lines) {
        s.lines
          .filter((l) => l.hit)
          .forEach((l) => {
            issueLines.add(l.n);
            (issueAtLine[l.n] = issueAtLine[l.n] || []).push(iss);
          });
      }
    });
  });

  const lines = preprocessBlockComments(code);
  let inBlockComment = false;

  const rows = lines
    .map((line, i) => {
      const num = i + 1;
      const hasIssue = issueLines.has(num);
      const lineIssues = issueAtLine[num] || [];
      const sevClass = hasIssue
        ? lineIssues.some((x) => x.severity === "critical")
          ? "cp-line-critical"
          : lineIssues.some((x) => x.severity === "high")
            ? "cp-line-high"
            : lineIssues.some((x) => x.severity === "medium")
              ? "cp-line-medium"
              : "cp-line-low"
        : "";
      const tooltip = hasIssue
        ? ` title="${escHtml(lineIssues.map((x) => x.title).join(", "))}"`
        : "";
      const marker = hasIssue
        ? `<span class="cp-issue-marker">${lineIssues.some((x) => x.severity === "critical") ? "⛔" : lineIssues.some((x) => x.severity === "high") ? "🔴" : "⚠"}</span>`
        : '<span class="cp-issue-marker"></span>';

      let highlighted;
      if (inBlockComment) {
        highlighted = `<span class="sh-comment">${escHtml(line)}</span>`;
        if (line.includes("*/")) inBlockComment = false;
      } else {
        const openIdx = line.indexOf("/*");
        if (openIdx !== -1 && !line.includes("*/", openIdx + 2)) {
          inBlockComment = true;
        }
        highlighted = syntaxHighlight(line, lang);
      }

      return `<div class="cp-line ${sevClass}"${tooltip}>
      <span class="cp-line-num">${num}</span>${marker}<span class="cp-line-code">${highlighted}</span></div>`;
    })
    .join("");

  return `<div class="cp-code-block"><div class="cp-code-inner">${rows}</div></div>`;
}

export function closeCodePreview() {
  document.getElementById("codePreviewModal").style.display = "none";
  document.body.style.overflow = "";
}

// ── ISSUE MODAL ──

export function openIssueModal(iss) {
  const kb = ISSUE_KB[iss.id] || null;
  const sevMap = {
    critical: "sev-critical",
    high: "sev-high",
    medium: "sev-medium",
    low: "sev-low",
    info: "sev-info",
  };
  const sevLbl = {
    critical: "⛔ CRÍTICO",
    high: "🔴 ALTO",
    medium: "⚠ MÉDIO",
    low: "ℹ BAIXO",
    info: "ℹ INFO",
  };

  document.getElementById("modalId").textContent = iss.id || "—";
  document.getElementById("modalTitle").textContent = iss.title || "";
  document.getElementById("modalMeta").innerHTML = `
    <span class="issue-sev ${sevMap[iss.severity] || "sev-info"}">${sevLbl[iss.severity] || iss.severity}</span>
    <span class="issue-obj-path">◻ ${escHtml(iss.file || "")}</span>
    ${iss.occurrences > 1 ? `<span style="font-size:10px;color:#72727e;font-family:var(--mono)">${iss.occurrences}× encontrado</span>` : ""}
    <span style="font-size:10px;color:#72727e;font-family:var(--mono)">${iss.category || ""}</span>`;

  let body = "";
  if (kb) {
    body += `<div><div class="modal-section-title">💡 O que é este issue</div><div class="modal-explain">${kb.what}</div></div>`;
    if (kb.impact?.length) {
      body += `<div><div class="modal-section-title">⚠️ Por que isso importa</div><div class="modal-impact-list">
          ${kb.impact.map((i) => `<div class="modal-impact-item"><span>›</span><span>${i}</span></div>`).join("")}
        </div></div>`;
    }
    if (kb.bad && kb.good) {
      body += `<div><div class="modal-section-title">📋 Exemplo de código</div><div class="code-compare">
          <div class="code-block-wrap"><div class="code-block-label bad">❌ Vulnerável / Problemático</div>
            <div class="code-block-body">${highlightCode(kb.bad, kb.badLines, "bad")}</div></div>
          <div class="code-block-wrap"><div class="code-block-label good">✅ Correto / Seguro</div>
            <div class="code-block-body">${highlightCode(kb.good, kb.goodLines, "good")}</div></div>
        </div></div>`;
    }
  } else {
    body += `<div><div class="modal-section-title">ℹ️ Informações</div><div class="modal-explain">${escHtml(iss.description || "")}</div></div>`;
    if (iss.suggestion)
      body += `<div><div class="modal-section-title">✅ Sugestão de Correção</div><div class="modal-explain" style="color:#16a34a">${escHtml(iss.suggestion)}</div></div>`;
    if ((iss.snippets || []).length > 0)
      body += `<div><div class="modal-section-title">📍 Ocorrência(s) no código</div>${iss.snippets.map((s) => renderSnippet(s)).join("")}</div>`;
  }

  document.getElementById("modalBody").innerHTML = body;
  document.getElementById("issueModal").style.display = "flex";
  document.body.style.overflow = "hidden";
}

export function closeModal() {
  document.getElementById("issueModal").style.display = "none";
  document.body.style.overflow = "";
}

// Globaliza as funções para uso inline no HTML (onclick="")
window.openIssueModal = openIssueModal;
window.closeModal = closeModal;
window.cpSwitchTab = cpSwitchTab;
window.closeCodePreview = closeCodePreview;
window.openCodePreview = openCodePreview; // Faltava essa exposição no original!

// Event Listener para a tecla ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCodePreview();
    closeModal();
  }
});
