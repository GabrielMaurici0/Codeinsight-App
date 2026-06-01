import { closeModal, closeCodePreview, cpSwitchTab } from "./ui/modals.js";
import { closeHistoryModal } from "./ui/history.js";
import {
  getFiles,
  setFiles,
  getFileContents,
  setFileContents,
  setReport,
  resetState,
} from "./core/state.js";
import { analyzeFile, generateReport } from "./core/engine-generic.js";
import {
  parseGX,
  computeGXMetrics,
  buildGXDepMap,
  analyzeGXDB,
  generateGXReport,
} from "./core/engine-gx.js";
import { sleep } from "./utils/helpers.js";
import { detectLang } from "./utils/language.js";
import { getDemoFiles, getGXLDemoXML } from "./data/demo-data.js";
import { renderAll, _showFileChip } from "./ui/render.js";
import { showProgress, setProgress, hideProgress } from "./ui/progress.js";
import { initEvents } from "./ui/events.js";
import { updateThemeIcon, toggleTheme } from "./ui/theme.js";
import { saveAnalysisToHistory } from "./core/storage.js";
import { initRuleCatalog } from "./ui/rules-catalog.js";
import "./ui/modals.js";
import { openHistoryModal } from "./ui/history.js";
import "./style.css";
import { renderHeatmap } from "./ui/heatmap.js";
import { readZip } from "./utils/zip.js"; // Importado para ler o pacote retornado pelo GitHub
import {
  showTab,
  setSevFilter,
  filterIssues,
  downloadJson,
  downloadSarif,
} from "./ui/controls.js";

document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";
  updateThemeIcon(currentTheme);
  initRuleCatalog();

  document
    .getElementById("btnHistory")
    ?.addEventListener("click", openHistoryModal);
  document
    .getElementById("themeToggle")
    ?.addEventListener("click", toggleTheme);
  document.getElementById("btnAnalyze")?.addEventListener("click", runAnalysis);
  document.getElementById("btnDemoGXL")?.addEventListener("click", loadDemoGXL);
  document.getElementById("btnDemoCode")?.addEventListener("click", loadDemo);
  document
    .getElementById("btnGithubImport")
    ?.addEventListener("click", loadFromGithub); // Vincula o botão do GitHub
  document
    .getElementById("btnPrintPdf")
    ?.addEventListener("click", () => window.print());

  document
    .getElementById("btnNewAnalysis")
    ?.addEventListener("click", resetToUpload);
  
  document
    .getElementById("btnNewAnalysis")
    ?.addEventListener("click", resetToUpload);

  // ── DELEGAÇÃO DE EVENTOS: ABAS E FILTROS ──
  document.getElementById("mainTabNav")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (btn && btn.dataset.tab) {
      showTab(btn.dataset.tab, btn);
    }
  });

  document.querySelector(".summary-pills")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (btn && btn.dataset.sev) {
      setSevFilter(btn.dataset.sev, btn);
    }
  });

  document
    .getElementById("searchInput")
    ?.addEventListener("input", filterIssues);
  document
    .getElementById("btnDownloadJson")
    ?.addEventListener("click", downloadJson);
  document
    .getElementById("btnDownloadSarif")
    ?.addEventListener("click", downloadSarif);
  
  document
    .getElementById("btnCloseIssueModal")
    ?.addEventListener("click", closeModal);
  document
    .getElementById("btnCloseCodePreviewModal")
    ?.addEventListener("click", closeCodePreview);
  document
    .getElementById("btnCloseHistoryModal")
    ?.addEventListener("click", closeHistoryModal);

  document.getElementById("historyModal")?.addEventListener("click", (e) => {
    if (e.target.id === "historyModal") closeHistoryModal();
  });

  document.getElementById("cpSectionTabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cp-section-tab");
    if (btn && btn.dataset.cpTab) {
      cpSwitchTab(btn.dataset.cpTab, btn);
    }
  });
});

function resetToUpload() {
  document.getElementById("analysisResult").style.display = "none";
  document.getElementById("heroSection").style.display = "";
  document.getElementById("fileChip").style.display = "none";
  document.getElementById("btnAnalyze").disabled = true;
  const input = document.getElementById("githubUrlInput");
  if (input) input.value = ""; // Limpa a URL antiga
  resetState();
}

async function executePipeline(pipelineName, pipelineLogic) {
  try {
    showProgress();
    setProgress(10, 0);
    await new Promise((r) => setTimeout(r, 10));

    const report = await pipelineLogic();

    if (report) {
      setReport(report);
      renderAll(report);
      renderHeatmap(report.files);

      try {
        await saveAnalysisToHistory(report, getFileContents());
      } catch (e) {
        console.error("Falha ao salvar no histórico:", e);
      }
    }
  } catch (error) {
    console.error(`[Pipeline Error] Falha em '${pipelineName}':`, error);
    showErrorToast(error.message || "Ocorreu um erro durante a análise.");
  } finally {
    hideProgress();
  }
}

async function runAnalysis() {
  const currentFiles = getFiles();
  if (!currentFiles || !currentFiles.length) return;

  const gxlFile = currentFiles.find((f) => /\.(gxl|xpz|xml)$/i.test(f.name));

  await executePipeline("runAnalysis", async () => {
    if (gxlFile) {
      return await processGXFlow(gxlFile);
    } else {
      return await processGenericFlow(currentFiles);
    }
  });
}

/**
 * ── FUNÇÃO ARQUITETURAL REUTILIZÁVEL DO WEB WORKER ──
 * Centraliza o envio e tracking da análise genérica em lote via Worker paralelo
 */
function runGenericWorkerPipeline(parsedFiles, projectName) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./workers/analyzer.worker.js", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = function (e) {
      const { type, pct, step, report, message } = e.data;

      if (type === "PROGRESS") {
        setProgress(pct, step);
      } else if (type === "DONE") {
        setProgress(100, 6);
        worker.terminate();
        resolve(report);
      } else if (type === "ERROR") {
        worker.terminate();
        reject(new Error(message));
      }
    };

    worker.onerror = function (err) {
      worker.terminate();
      reject(err);
    };

    worker.postMessage({
      type: "START_GENERIC",
      payload: { files: parsedFiles, projectName },
    });
  });
}

async function loadFromGithub() {
  const urlInput = document.getElementById("githubUrlInput");
  const url = urlInput?.value.trim();

  if (!url) {
    showErrorToast("Por favor, insira uma URL válida do GitHub.");
    return;
  }

  // Captura o Dono e o Nome do Repositório via Expressão Regular
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) {
    showErrorToast(
      "Formato inválido! Use: https://github.com/dono/repositorio",
    );
    return;
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, ""); // Remove sufixo se colado do link de clone

  await executePipeline("loadFromGithub", async () => {
    setProgress(20, 0); // Etapa: Lendo arquivos (Iniciando stream de download)

    // ── ROTA UNIVERSAL DE ZIPBALL CONVERTIDA PARA O CODETABS ──
    // Usar o endpoint /zipball/ garante que o GitHub monte o pacote dinamicamente,
    // mesmo se o repositório só tiver o arquivo README.md ou branches customizadas.
    const targetUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;
    const apiUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        "Não foi possível acessar o repositório. Verifique se a URL está correta e se o projeto é público.",
      );
    }

    setProgress(45, 1); // Etapa: Detectando linguagens (Descompactando estrutura de bytes)
    const buf = await response.arrayBuffer();
    const { entries } = await readZip(buf);

    // Mapeia e sanitiza caminhos do Zipball do GitHub (remove a pasta raiz temporária gerada pela API)
    const parsedFiles = entries
      .map((e) => {
        const parts = e.name.split("/");
        parts.shift(); // Remove a pasta hash temporária que o GitHub coloca no topo do zip
        return { name: parts.join("/"), content: e.text };
      })
      .filter((f) => {
        if (!f.name || !f.content?.trim()) return false;
        // Reaplica a ignore list para economizar memória do Web Worker
        const isTrash =
          /\.(jpg|jpeg|png|gif|svg|ico|webp|mp4|mp3|wav|ogg|pdf|docx|xlsx|ttf|woff|woff2|eot)$/i.test(
            f.name,
          );
        const isDepFolder =
          /(^|\/)(node_modules|\.git|\.vscode|\.idea|dist|build|coverage)(\/|$)/i.test(
            f.name,
          );
        return !isTrash && !isDepFolder;
      });

    if (parsedFiles.length === 0) {
      throw new Error(
        "Este repositório está vazio ou não contém arquivos de código-fonte analisáveis.",
      );
    }

    // Inicializa o mapa global de conteúdos para suportar a visualização de código perfeitamente
    const contentsMap = {};
    parsedFiles.forEach((f) => {
      contentsMap[f.name] = f.content;
    });
    setFileContents(contentsMap);

    _showFileChip(`${owner}/${repo}`, "GitHub Code", "var(--blue)", "📦");

    // Envia os dados limpos para o Web Worker paralelo
    return await runGenericWorkerPipeline(parsedFiles, repo);
  });
}

async function loadDemo() {
  setFiles([]);
  await executePipeline("loadDemo", async () => {
    const demoFiles = getDemoFiles();
    setProgress(30, 1);
    await new Promise((r) => setTimeout(r, 10));

    const analyzed = demoFiles.map((f) =>
      analyzeFile(f.name, f.content, detectLang(f.name)),
    );
    setProgress(70, 3);

    const report = generateReport(analyzed, "demo-project");
    setProgress(100, 6);

    _showFileChip(`demo-project (${demoFiles.length} arquivos)`, "demo");

    const contentsMap = {};
    demoFiles.forEach((f) => { contentsMap[f.name] = f.content; });
    setFileContents(contentsMap);

    return report;
  });
}

async function loadDemoGXL() {
  setFiles([]);
  await executePipeline("loadDemoGXL", async () => {
    const xml = getGXLDemoXML();
    setProgress(30, 1);
    await new Promise((r) => setTimeout(r, 10));

    const { objects, tables } = parseGX(xml);
    setProgress(50, 2);

    const analyzed = objects.map(computeGXMetrics);
    setProgress(68, 3);

    const depMap = buildGXDepMap(analyzed);
    setProgress(82, 4);

    const db = analyzeGXDB(tables);
    setProgress(94, 5);

    const report = generateGXReport(analyzed, tables, depMap, db, "Demo — Sistema de Pedidos GeneXus");
    setProgress(100, 6);

    _showFileChip("Demo GeneXus — Sistema de Pedidos", "demo", "var(--purple)", "⬡");

    return report;
  });
}

async function processGXFlow(gxlFile) {
  setProgress(20, 1);
  await new Promise((r) => setTimeout(r, 10));

  const buf = await gxlFile.arrayBuffer();

  const xmlContent = await new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./workers/zip.worker.js", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = function (e) {
      if (e.data.type === "DONE") {
        worker.terminate();
        resolve(e.data.xmlContent);
      }
    };

    worker.onerror = function (err) {
      worker.terminate();
      reject(err);
    };

    worker.postMessage({ type: "EXTRACT_GX", payload: { buffer: buf } }, [buf]);
  });

  setProgress(40, 2);
  const { objects, tables } = parseGX(xmlContent);

  setProgress(60, 3);
  const analyzed = objects.map(computeGXMetrics);

  setProgress(75, 4);
  const depMap = buildGXDepMap(analyzed);

  setProgress(88, 5);
  const db = analyzeGXDB(tables);

  setProgress(96, 6);
  const report = generateGXReport(analyzed, tables, depMap, db, gxlFile.name);

  setProgress(100, 6);
  _showFileChip(gxlFile.name, `${(gxlFile.size / 1024).toFixed(0)} KB`, "var(--purple)", "⬡");

  return report;
}

async function processGenericFlow(files) {
  setProgress(25, 1);

  const fileContents = await Promise.all(files.map((f) => f.text()));
  const parsedFiles = files.map((f, i) => ({
    name: f.name,
    content: fileContents[i],
  }));

  const contentsMap = {};
  parsedFiles.forEach((f) => { contentsMap[f.name] = f.content; });
  setFileContents(contentsMap);

  // Redireciona para a nossa nova rotina unificada do Worker
  return await runGenericWorkerPipeline(parsedFiles, parsedFiles[0]?.name || "projeto");
}

function showErrorToast(message) {
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.right = "24px";
  toast.style.backgroundColor = "var(--red-bg)";
  toast.style.color = "var(--red)";
  toast.style.border = "1.5px solid var(--red-bd)";
  toast.style.padding = "16px 20px";
  toast.style.borderRadius = "var(--radius)";
  toast.style.boxShadow = "var(--shadow-lg)";
  toast.style.zIndex = "9999";
  toast.style.fontFamily = "var(--font)";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "600";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "10px";
  toast.style.animation = "slideUp 0.3s ease";

  toast.innerHTML = `<span style="font-size: 18px;">⚠️</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}