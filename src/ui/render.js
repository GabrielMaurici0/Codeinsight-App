import {getActiveFilter, getActiveSev, setDisplayedIssues, getDisplayedIssues, getFileContents, setAllIssues} from "../core/state.js";
import { escHtml } from "../utils/helpers.js";
import { langLabel } from "../utils/language.js";
import { ISSUE_KB } from "../data/issue-kb.js";
import { openIssueModal, openCodePreview } from "./modals.js";

// ════════════════════════════════════════════
// 12. RENDERIZAÇÃO
// ════════════════════════════════════════════

/** Renderiza todos os painéis após uma análise completa */
export function renderAll(r) {
  const hero = document.getElementById("heroSection");
  if (hero) hero.style.display = "none";
  document.getElementById("analysisResult").style.display = "block";

  const isGXL = !!r.isGXL;
  document.getElementById("tab-db-btn").style.display = isGXL ? "" : "none";

  // Sempre inicia na aba Issues independente do tipo de arquivo
  document
    .querySelectorAll(".tab-btn")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => (p.style.display = "none"));

  const issuesBtn = document.querySelector('.tab-btn[data-tab="issues"]');
  if (issuesBtn) issuesBtn.classList.add("active");
  const issuesPanel = document.getElementById("tab-issues");
  if (issuesPanel) issuesPanel.style.display = "block";

  renderScore(r);
  renderFilters(r);
  renderMetrics(r);
  setAllIssues(r.allIssues);
  renderIssues(r.allIssues);
  renderFiles(r.files, r.depMap, r.isGXL ? r.objects : null);
  renderSecurity(r);
  renderArch(r);
  renderDeps(r.files, r.depMap);
  renderReport(r);
  renderJSON(r);

  if (isGXL) {
    renderGXDB(r.db);
  }
}

export function _showFileChip(name, size, iconColor, icon) {
  const chip = document.getElementById("fileChip");
  chip.innerHTML = `
    <div class="chip">
      <span>${icon}</span>
      <span class="chip-name">${escHtml(name)}</span>
      <span class="chip-size">${escHtml(size)}</span>
    </div>`;
  chip.style.display = "block";
}

// ── Score ──
function renderScore(r) {
  const arc = document.getElementById("scoreArc");
  // novo viewBox 60×60, r=24, circunferência = 2π×24 ≈ 150.8
  const circ = 2 * Math.PI * 24;

  setTimeout(() => {
    arc.style.strokeDashoffset = circ - (r.score / 100) * circ;
    arc.style.stroke =
      r.score >= 75
        ? "var(--green)"
        : r.score >= 60
          ? "var(--yellow)"
          : r.score >= 40
            ? "var(--orange)"
            : "var(--red)";
  }, 120);

  document.getElementById("scoreNum").textContent = r.score;

  const grades = [
    [90, "A", "Excelente"],
    [75, "B", "Bom"],
    [60, "C", "Aceitável"],
    [40, "D", "Crítico"],
    [0, "F", "Inaceitável"],
  ];
  const [, grade, label] = grades.find(([t]) => r.score >= t) || [
    0,
    "F",
    "Inaceitável",
  ];
  const gradeColors = {
    A: "#16a34a",
    B: "#16a34a",
    C: "#d97706",
    D: "#ea580c",
    F: "#dc2626",
  };

  document.getElementById("scoreGrade").textContent = `Nota ${grade}`;
  document.getElementById("scoreGrade").style.color = gradeColors[grade];
  document.getElementById("scoreLabel").textContent = label;
}

// ── Filtros (contagens na sidebar) ──
function renderFilters(r) {
  const sev = { critical: 0, high: 0, medium: 0 };
  (r.allIssues || []).forEach((i) => {
    if (i.severity === "critical") sev.critical++;
    else if (i.severity === "high") sev.high++;
    else if (["medium", "warning"].includes(i.severity)) sev.medium++;
  });

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set("fcs-critical", sev.critical);
  set("fcs-high", sev.high);
  set("fcs-medium", sev.medium);
  set("tab-issues-count", (r.allIssues || []).length);
  set("tab-files-count", r.isGXL ? (r.objects?.length ?? 0) : r.files.length);
  set("tab-security-count", r.metrics?.security_issues ?? 0);
  set("tab-deps-count", r.files.length);
  if (r.isGXL) {
    set("tab-db-count", (r.tables || []).length);
  }
}

// ── Cards de métricas ──
function renderMetrics(r) {
  const m = r.metrics;
  const cards = r.isGXL
    ? [
        {
          val: m.total_objects,
          label: "Objetos GX",
          icon: "⬡",
          color: "purple",
          sub: `${m.total_loc?.toLocaleString()} linhas de código`,
        },
        {
          val: m.critical_issues,
          label: "Issues Críticos",
          icon: "⛔",
          color: "red",
          sub: `${m.total_issues} issues no total`,
        },
        {
          val: m.security_issues,
          label: "Vulnerabilidades",
          icon: "🔒",
          color: "orange",
          sub: "SQL Inj · XSS · Secrets",
        },
        {
          val: m.avg_complexity,
          label: "CC Médio",
          icon: "↯",
          color: "purple",
          sub: `${m.high_risk_files} objeto(s) de alto risco`,
        },
        {
          val: m.avg_maintainability,
          label: "Manutenibilidade",
          icon: "🔧",
          color: "green",
          sub: "índice 0–100",
        },
        {
          val: m.db_score,
          label: "DB Score",
          icon: "⊞",
          color: "blue",
          sub: `${m.total_tables} Transactions`,
        },
      ]
    : [
        {
          val: m.total_files,
          label: "Arquivos Analisados",
          icon: "📂",
          color: "blue",
          sub: `${m.total_loc?.toLocaleString()} linhas de código`,
        },
        {
          val: m.critical_issues,
          label: "Issues Críticos",
          icon: "⛔",
          color: "red",
          sub: `${m.total_issues} issues no total`,
        },
        {
          val: m.security_issues,
          label: "Vulnerabilidades",
          icon: "🔒",
          color: "orange",
          sub: "SQL Inj · XSS · Secrets · CMD Inj",
        },
        {
          val: m.avg_complexity,
          label: "CC Médio",
          icon: "↯",
          color: "purple",
          sub: `${m.high_risk_files} arquivo(s) de alto risco`,
        },
        {
          val: m.avg_maintainability,
          label: "Manutenibilidade",
          icon: "🔧",
          color: "green",
          sub: "índice 0–100 (100 = ideal)",
        },
        {
          val: m.medium_issues,
          label: "Issues Médios",
          icon: "⚠",
          color: "yellow",
          sub: `${m.low_issues} issues baixa prioridade`,
        },
      ];

  document.getElementById("metricGrid").innerHTML = cards
    .map(
      (c) => `
    <div class="metric-card ${c.color}">
      <span class="mc-icon">${c.icon}</span>
      <div class="mc-val">${c.val}</div>
      <div class="mc-label">${c.label}</div>
      <div class="mc-sub">${c.sub}</div>
    </div>`,
    )
    .join("");
}

// ── Snippet de código (bloco de evidência no card de issue) ──
export function renderSnippet(s) {
  // Formato GXL: { lineNum, sectionName, lines: [{n, txt, hit}] }
  if (s.lines && Array.isArray(s.lines)) {
    return `
      <div class="evidence-block">
        <div class="evidence-header">📍 ${escHtml(s.sectionName || "Código")} · linha ${s.lineNum}</div>
        <div class="evidence-lines">
          ${s.lines
            .map(
              (l) => `
            <div class="evidence-line${l.hit ? " hit" : ""}">
              <span class="line-num">${l.n}</span>
              <span class="line-code">${escHtml(l.txt)}</span>
            </div>`,
            )
            .join("")}
        </div>
      </div>`;
  }
  // Formato padrão: { line, code, hit }
  return `
    <div class="evidence-block">
      <div class="evidence-header">📍 Linha ${s.line}</div>
      <div class="evidence-lines">
        <div class="evidence-line${s.hit ? " hit" : ""}">
          <span class="line-num">${s.line}</span>
          <span class="line-code">${escHtml(s.code)}</span>
        </div>
      </div>
    </div>`;
}

// ── Issues ──
export function renderIssues(issues) {
  let filtered = issues;
  const activeFilter = getActiveFilter();
  const activeSev = getActiveSev();

  if (activeFilter !== "all") {
    filtered = filtered.filter(
      (i) =>
        i.lang === activeFilter ||
        (activeFilter === "js" && ["js", "ts"].includes(i.lang)),
    );
  }
  if (activeSev) {
    filtered = filtered.filter(
      (i) =>
        i.severity === activeSev ||
        (activeSev === "medium" && i.severity === "warning"),
    );
  }
  displayIssues(filtered);
}

export function displayIssues(issues) {
  setDisplayedIssues(issues);
  const sevMap = {
    critical: "sev-critical",
    high: "sev-high",
    medium: "sev-medium",
    low: "sev-low",
    info: "sev-info",
  };
  const sevLbl = {
    critical: "Crítico",
    high: "Alto",
    medium: "Médio",
    low: "Baixo",
    info: "Info",
  };

  document.getElementById("issueList").innerHTML = issues.length
    ? issues
        .map(
          (iss, idx) => `
      <div class="issue-card ${sevMap[iss.severity] || "sev-info"}" data-issue-index="${idx}" style="animation-delay:${Math.min(idx * 0.03, 0.4)}s">
        <div class="issue-card-inner">
          <div class="issue-top">
            <span class="sev-badge ${sevMap[iss.severity] || "sev-info"}">${sevLbl[iss.severity] || iss.severity}</span>
            <span class="issue-id">${iss.id}</span>
            <span class="issue-title">${escHtml(iss.title)}</span>
          </div>
          <span class="issue-file">◻ ${escHtml(iss.file)}</span>
          <div class="issue-desc">${escHtml(iss.description.slice(0, 180))}${iss.description.length > 180 ? "…" : ""}</div>
          ${(iss.snippets || []).slice(0, 1).map(renderSnippet).join("")}
          <div class="issue-bottom">
            <span class="issue-cat">${escHtml(iss.category)}</span>
            ${iss.occurrences > 1 ? `<span class="issue-occ">${iss.occurrences}×</span>` : ""}
            <span class="issue-hint">Ver detalhes →</span>
          </div>
        </div>
      </div>`,
        )
        .join("")
    : '<div style="padding:48px;text-align:center;color:#a8a8b4;font-size:15px">Nenhum issue encontrado com este filtro.</div>';

  document.querySelectorAll(".issue-card[data-issue-index]").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.getAttribute("data-issue-index"));
      // CORREÇÃO: getter
      const iss = getDisplayedIssues()[idx];
      if (iss) openIssueModal(iss);
    });
  });
}

// ── Tabela de arquivos ──
function renderFiles(files, depMap, gxObjects) {
  const isGXL = !!gxObjects;
  const colorCC = (v) =>
    v > 20 ? "var(--red)" : v > 10 ? "var(--yellow)" : "var(--green)";
  const colorMI = (v) =>
    v > 65 ? "var(--green)" : v > 40 ? "var(--yellow)" : "var(--red)";
  const colorRisk = (v) =>
    v > 7 ? "var(--red)" : v > 4 ? "var(--orange)" : "var(--green)";
  const typeClass = (t) => "type-" + t.replace(/[^a-z]/g, "");

  // Mostrar/ocultar coluna Pasta e badge GeneXus
  const pastaHeaders = document.querySelectorAll(".col-pasta");
  pastaHeaders.forEach((th) => (th.style.display = isGXL ? "" : "none"));
  const badge = document.getElementById("filesTabBadge");
  if (badge) badge.style.display = isGXL ? "" : "none";

  if (isGXL) {
    // ── Modo GeneXus: renderiza objetos GX ──
    document.getElementById("objTableBody").innerHTML = gxObjects
      .map((o, idx) => {
        const hub = (depMap[o.name] || {}).is_hub;
        return `<tr class="file-row gxobj-row" data-idx="${idx}" data-mode="gx" style="cursor:pointer" title="Clique para visualizar o código">
        <td class="obj-name">${escHtml(o.name)}${hub ? '<span class="dep-hub-badge" style="margin-left:5px">HUB</span>' : ""}</td>
        <td><span class="lang-badge ${typeClass(o.obj_type)}">${o.obj_type}</span></td>
        <td class="col-pasta" style="color:#72727e;font-size:10px">${escHtml(o.folder || "—")}</td>
        <td><div class="bar-wrap">
          <div class="bar-bg"><div class="bar-fill" style="width:${Math.min((o.complexity_score / 30) * 100, 100)}%;background:${colorCC(o.complexity_score)}"></div></div>
          <span class="bar-val" style="color:${colorCC(o.complexity_score)}">${o.complexity_score}</span>
        </div></td>
        <td><div class="bar-wrap">
          <div class="bar-bg"><div class="bar-fill" style="width:${o.maintainability_index}%;background:${colorMI(o.maintainability_index)}"></div></div>
          <span class="bar-val" style="color:${colorMI(o.maintainability_index)}">${o.maintainability_index}</span>
        </div></td>
        <td style="color:${colorRisk(o.risk_score)}">${o.risk_score}/10</td>
        <td>${o.lines_of_code}</td>
        <td style="color:${o.issues.length > 3 ? "#dc2626" : o.issues.length > 0 ? "#d97706" : "#16a34a"}">${o.issues.length}</td>
      </tr>`;
      })
      .join("");

    document.querySelectorAll("#objTableBody .gxobj-row").forEach((row) => {
      row.addEventListener("click", () => {
        const idx = parseInt(row.getAttribute("data-idx"));
        const o = gxObjects[idx];
        openCodePreview(o.name, o.raw_content || "", "gxl", o.issues, {
          _source: o._source,
          _events: o._events,
          _rules: o._rules,
          obj_type: o.obj_type,
        });
      });
      row.addEventListener(
        "mouseenter",
        () => (row.style.background = "rgba(255,255,255,0.04)"),
      );
      row.addEventListener("mouseleave", () => (row.style.background = ""));
    });
  } else {
    // ── Modo arquivo genérico ──
    document.getElementById("objTableBody").innerHTML = files
      .map((f, idx) => {
        const hub = (depMap[f.name] || {}).is_hub;
        return `<tr class="file-row" data-idx="${idx}" data-mode="file" style="cursor:pointer" title="Clique para visualizar o código">
        <td class="obj-name">${escHtml(f.name)}${hub ? '<span class="dep-hub-badge" style="margin-left:5px">HUB</span>' : ""}</td>
        <td><span class="lang-badge lang-${f.lang}">${langLabel(f.lang)}</span></td>
        <td><div class="bar-wrap">
          <div class="bar-bg"><div class="bar-fill" style="width:${Math.min((f.complexity_score / 30) * 100, 100)}%;background:${colorCC(f.complexity_score)}"></div></div>
          <span class="bar-val" style="color:${colorCC(f.complexity_score)}">${f.complexity_score}</span>
        </div></td>
        <td><div class="bar-wrap">
          <div class="bar-bg"><div class="bar-fill" style="width:${f.maintainability_index}%;background:${colorMI(f.maintainability_index)}"></div></div>
          <span class="bar-val" style="color:${colorMI(f.maintainability_index)}">${f.maintainability_index}</span>
        </div></td>
        <td style="color:${colorRisk(f.risk_score)}">${f.risk_score}/10</td>
        <td>${f.lines_of_code}</td>
        <td style="color:${f.issues.length > 3 ? "#dc2626" : f.issues.length > 0 ? "#d97706" : "#16a34a"}">${f.issues.length}</td>
      </tr>`;
      })
      .join("");

  document.querySelectorAll("#objTableBody .file-row").forEach((row) => {
    row.addEventListener("click", () => {
      const idx = parseInt(row.getAttribute("data-idx"));
      const f = files[idx];
      // CORREÇÃO: getter do file contents
      const content = getFileContents()[f.name] || null;
      openCodePreview(f.name, content, f.lang, f.issues);
    });
  row.addEventListener(
    "mouseenter",
    () => (row.style.background = "rgba(255,255,255,0.04)"),
  );
  row.addEventListener("mouseleave", () => (row.style.background = ""));
});
  }
}

// ── Segurança ──
function renderSecurity(r) {
  const secIssues = r.allIssues.filter((i) => i.category === "Segurança");
  const vuln = [
    {
      id: "SEC001",
      name: "SQL Injection",
      risk: "critical",
      desc: "Queries SQL construídas com concatenação permitem que atacantes alterem queries arbitrariamente.",
    },
    {
      id: "SEC002",
      name: "Cross-Site Scripting (XSS)",
      risk: "high",
      desc: "Injeção de HTML/JS via innerHTML permite execução de scripts no contexto do usuário.",
    },
    {
      id: "SEC003",
      name: "Hardcoded Secrets",
      risk: "critical",
      desc: "Credenciais embutidas ficam expostas em repositórios, histórico git e logs.",
    },
    {
      id: "SEC004",
      name: "Remote Code Execution (eval)",
      risk: "critical",
      desc: "eval() com dados externos permite execução de código arbitrário.",
    },
    {
      id: "SEC005",
      name: "Command Injection",
      risk: "critical",
      desc: "Execução de shell com input não validado permite comandos arbitrários no servidor.",
    },
  ];
  const foundIds = new Set(secIssues.map((i) => i.id));
  const affected = vuln.filter((v) => foundIds.has(v.id));
  const clean = vuln.filter((v) => !foundIds.has(v.id));
  let html = "";

  if (affected.length > 0) {
    html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><span style="font-size:17px;font-weight:800;color:#dc2626">⛔ Vulnerabilidades Detectadas</span></div>`;
    html += `<div class="vuln-grid">${affected
      .map((v) => {
        const iss = secIssues.filter((i) => i.id === v.id);
        return `<div class="vuln-card ${v.risk === "critical" ? "" : "medium"}">
        <div class="vuln-name">${v.name}</div>
        <div class="vuln-cve">[${v.id}] ${v.risk.toUpperCase()}</div>
        <div class="vuln-desc">${v.desc}</div>
        ${
          iss.length
            ? `<div class="vuln-fix">📍 ${iss.length} ocorrência(s): ${[
                ...new Set(iss.map((i) => i.file)),
              ]
                .slice(0, 2)
                .map((f) => f.split("/").pop())
                .join(", ")}</div>`
            : ""
        }
      </div>`;
      })
      .join("")}</div>`;
  }

  if (clean.length > 0) {
    html += `<div style="display:flex;align-items:center;gap:10px;margin:20px 0 14px"><span style="font-size:17px;font-weight:800;color:#16a34a">✅ Verificações Passadas</span></div>`;
    html += `<div class="vuln-grid">${clean
      .map(
        (v) => `
      <div class="dep-card" style="border-color:rgba(52,211,153,.2)">
        <div class="dep-name" style="color:#16a34a">✓ ${v.name}</div>
        <div style="font-size:10px;color:#72727e;margin-top:4px;font-family:var(--mono)">Nenhum padrão vulnerável detectado</div>
      </div>`,
      )
      .join("")}</div>`;
  }

  document.getElementById("securityContent").innerHTML = html;
}

// ── Arquitetura ──
function renderArch(r) {
  const violated = r.archViolations.filter((v) => v.violated);
  const ok = r.archViolations.filter((v) => !v.violated);
  let html = "";

  if (violated.length > 0) {
    html += `<div style="margin-bottom:14px"><div class="quality-gate fail">
      <div class="qg-icon">❌</div>
      <div><div class="qg-title" style="color:#dc2626">${violated.length} regra(s) violada(s)</div>
      <div class="qg-sub">${ok.length} de ${r.archViolations.length} regras passaram</div></div>
    </div></div>`;
    violated.forEach((v) => {
      html += `<div class="arch-rule violated">
        <div class="arch-rule-title">❌ ${v.rule}</div>
        ${
          v.files.length
            ? `<div class="arch-rule-desc">Afetados: ${v.files
                .slice(0, 3)
                .map((f) => f.split("/").pop())
                .join(", ")}</div>`
            : ""
        }
      </div>`;
    });
  } else {
    html += `<div class="quality-gate pass">
      <div class="qg-icon">✅</div>
      <div><div class="qg-title" style="color:#16a34a">Todas as regras de arquitetura passaram</div>
      <div class="qg-sub">Nenhuma violação detectada</div></div>
    </div>`;
  }

  ok.forEach((v) => {
    html += `<div class="arch-rule ok"><div class="arch-rule-title">✓ ${v.rule}</div></div>`;
  });
  document.getElementById("archContent").innerHTML = html;
}

// ── Dependências ──
function renderDeps(files, depMap) {
  document.getElementById("depGrid").innerHTML = files
    .map((f) => {
      const d = depMap[f.name] || {};
      return `<div class="dep-card${d.is_hub ? " hub" : ""}">
      <div class="dep-name">${escHtml(f.name.split("/").pop())}${d.is_hub ? '<span class="dep-hub-badge">RISCO</span>' : ""}</div>
      <span class="lang-badge lang-${f.lang}">${langLabel(f.lang)}</span>
      <div class="dep-arrows">
        <span>LOC: ${f.lines_of_code}</span>
        <span>CC: ${f.complexity_score}</span>
        <span style="color:${f.risk_score > 6 ? "#dc2626" : "#16a34a"}">Risco: ${f.risk_score}/10</span>
      </div>
      <div style="margin-top:6px;font-size:10px;color:#72727e;font-family:var(--mono)">${f.issues.length} issue(s) · MI: ${f.maintainability_index}</div>
    </div>`;
    })
    .join("");
}

// ── Banco de dados GX ──
function renderGXDB(db) {
  if (!db?.tables?.length) {
    document.getElementById("dbContent").innerHTML =
      '<div style="color:#72727e;padding:40px;text-align:center;font-family:var(--mono)">Nenhuma Transaction encontrada no arquivo GXL.</div>';
    return;
  }

  let html = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">
    <div class="metric-card blue"  style="padding:12px"><div class="mc-val" style="font-size:20px">${db.tables.length}</div><div class="mc-label">Tabelas (Transactions)</div></div>
    <div class="metric-card ${db.tables_without_pk > 0 ? "red" : "green"}" style="padding:12px"><div class="mc-val" style="font-size:20px">${db.tables_without_pk}</div><div class="mc-label">Sem Chave Primária</div></div>
    <div class="metric-card ${db.normalization_score < 80 ? "yellow" : "green"}" style="padding:12px"><div class="mc-val" style="font-size:20px">${db.normalization_score}</div><div class="mc-label">Score Normalização</div></div>
  </div>`;

  if (db.issues?.length) {
    html += `<div class="quality-gate fail" style="margin-bottom:14px">
      <div class="qg-icon">⚠️</div>
      <div><div class="qg-title" style="color:#d97706">Problemas estruturais detectados</div>
      <div class="qg-sub">${db.issues.map((i) => `${i.table}: ${i.issue}`).join(" · ")}</div></div>
    </div>`;
  }

  html += db.tables
    .map(
      (t) => `
    <div class="db-card">
      <div class="db-head">
        <div class="db-head-name">⊞ ${escHtml(t.name)}</div>
        <span class="db-head-meta">${t.attributes.length} atributos</span>
        ${t.primary_key.length ? '<span class="lang-badge type-transaction">PK ✓</span>' : '<span class="lang-badge" style="background:rgba(244,63,94,.12);color:#dc2626">SEM PK</span>'}
        ${t.indexes.length ? `<span class="db-head-meta">${t.indexes.length} índice(s)</span>` : '<span class="db-head-meta" style="color:#d97706">sem índice</span>'}
      </div>
      <div class="db-body">
        ${t.attributes
          .slice(0, 15)
          .map(
            (a) => `
          <div class="attr-row">
            <span class="attr-key">${a.is_key ? "🔑" : ""}</span>
            <span class="attr-name">${escHtml(a.name)}</span>
            <span class="attr-type">${escHtml(a.data_type)}${a.size ? `(${a.size})` : ""}</span>
            ${a.is_key ? '<span class="attr-badge">PK</span>' : ""}
            ${!a.nullable ? '<span class="attr-badge" style="background:rgba(108,142,245,.1);color:#2563eb">NOT NULL</span>' : ""}
          </div>`,
          )
          .join("")}
        ${t.attributes.length > 15 ? `<div style="font-size:10px;color:#72727e;padding:7px 0;font-family:var(--mono)">... e mais ${t.attributes.length - 15} atributos</div>` : ""}
      </div>
    </div>`,
    )
    .join("");

  document.getElementById("dbContent").innerHTML = html;
}

// ── Relatório ──
function renderReport(r) {
  const m = r.metrics;
  const passed = r.cicd.quality_gate.passed;
  const isGXL = !!r.isGXL;

  const gxRecs = [
    "📌 Nunca armazene credenciais no código GeneXus — use tabela ConfigSistema criptografada",
    "📌 Use Quote(&Var) em todos os Where dinâmicos para evitar SQL Injection",
    "📌 Use HTMLEncode() em toda saída de variáveis em Web Panels",
    "📌 Mova Commit() para fora de loops — um commit por transação",
    "📌 Defina cláusula Order em todo For Each para resultado determinístico",
    "📌 Substitua udp() por Call(Procedure) com parm() explícito",
    "📌 Documente todos os objetos com Description significativa",
  ];
  const codeRecs = [
    "📌 Nunca armazene credenciais no código — use variáveis de ambiente ou cofre de segredos",
    "📌 Use queries parametrizadas para toda interação com banco de dados",
    "📌 Implemente logging estruturado em vez de console.log/print",
    "📌 Adicione análise estática ao CI/CD para bloquear merges com issues críticos",
    "📌 Reduza complexidade ciclomática extraindo funções e usando early returns",
    "📌 Substitua blocos catch vazios por logging adequado de exceções",
  ];

  const fileList = isGXL ? r.objects : r.files;
  const sections = [
    {
      icon: "✅",
      title: "Pontos Fortes",
      color: "#16a34a",
      items: [
        m.avg_complexity <= 10 &&
          `✅ Complexidade média adequada (CC=${m.avg_complexity})`,
        m.avg_maintainability >= 65 &&
          `✅ Índice de manutenibilidade bom (MI=${m.avg_maintainability})`,
        m.security_issues === 0 &&
          "✅ Nenhuma vulnerabilidade de segurança detectada",
        m.critical_issues === 0 && "✅ Nenhum issue crítico encontrado",
        m.high_risk_files === 0 &&
          `✅ Nenhum ${isGXL ? "objeto" : "arquivo"} de alto risco`,
        isGXL &&
          m.db_score >= 80 &&
          `✅ Banco bem normalizado (score: ${m.db_score})`,
      ].filter(Boolean),
    },
    {
      icon: "🔴",
      title: "Pontos Críticos",
      color: "#dc2626",
      items: [
        m.critical_issues > 0 &&
          `🔴 ${m.critical_issues} issue(s) crítico(s) requerem atenção imediata`,
        m.security_issues > 0 &&
          `🔴 ${m.security_issues} vulnerabilidade(s) detectada(s)`,
        m.avg_complexity > 20 &&
          `🔴 Complexidade média alta: ${m.avg_complexity}`,
        m.avg_maintainability < 40 &&
          "🔴 Índice de manutenibilidade muito baixo",
        m.high_risk_files > 2 &&
          `🔴 ${m.high_risk_files} ${isGXL ? "objeto(s)" : "arquivo(s)"} de alto risco`,
      ].filter(Boolean),
    },
    {
      icon: "💡",
      title: "Recomendações",
      color: "#d97706",
      items: isGXL ? gxRecs : codeRecs,
    },
    {
      icon: "🔧",
      title: "Prioridade de Correção",
      color: "#7c3aed",
      items: [...fileList]
        .sort((a, b) => b.risk_score - a.risk_score)
        .slice(0, 5)
        .map(
          (f, i) =>
            `🔧 PRIORIDADE ${i + 1} — ${f.name} (Risco: ${f.risk_score}/10 · CC: ${f.complexity_score} · ${f.issues.length} issues)`,
        ),
    },
  ];

  document.getElementById("reportContent").innerHTML = `
    <div class="quality-gate ${passed ? "pass" : "fail"}" style="margin-bottom:18px">
      <div class="qg-icon">${passed ? "✅" : "❌"}</div>
      <div>
        <div class="qg-title" style="color:${passed ? "#16a34a" : "#dc2626"}">${passed ? "QUALITY GATE APROVADO" : "QUALITY GATE REPROVADO"}</div>
        <div class="qg-sub">Score: ${r.score}/100 (mínimo: 60) · Críticos: ${m.critical_issues} · Alto risco: ${m.high_risk_files}${isGXL ? " · DB: " + m.db_score : ""}</div>
      </div>
    </div>
    ${sections
      .map(
        (s) => `
    <div class="report-section">
      <div class="report-section-title">${s.icon} ${s.title}</div>
      ${(s.items.length ? s.items : ["Nenhum item identificado."])
        .map(
          (item) => `
        <div class="report-item">
          <span style="color:${s.color};margin-top:1px;flex-shrink:0">-></span>
          <span>${escHtml(String(item))}</span>
        </div>`,
        )
        .join("")}
    </div>`,
      )
      .join("")}`;
}

// ── JSON CI/CD ──
function renderJSON(r) {
  const json = JSON.stringify(r.cicd, null, 2);
  document.getElementById("jsonOutput").innerHTML = json
    .replace(/("[\w_]+"):/g, '<span class="json-key">$1</span>:')
    .replace(/: (".*?")/g, ': <span class="json-str">$1</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="json-num">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
    .replace(/: (null)/g, ': <span class="json-null">$1</span>');
}

// ════════════════════════════════════════════
// 13. HANDLERS DE UI
// ════════════════════════════════════════════

// ── Pré-visualização de código ──

/**
 * Abre o modal de pré-visualização de código para um arquivo ou objeto GX.
 * @param {string} name       - Nome do arquivo / objeto
 * @param {string|null} content - Conteúdo bruto do código
 * @param {string} lang       - Linguagem (js, py, gxl…)
 * @param {Array}  issues     - Issues detectados (para destacar linhas)
 * @param {Object} gxMeta     - Metadados GX (_source, _events, _rules, obj_type)
 */
