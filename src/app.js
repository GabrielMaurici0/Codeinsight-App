import {
  getFiles,
  setFiles,
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
import { readZip } from "./utils/zip.js";
import { sleep } from "./utils/helpers.js";
import { detectLang } from "./utils/language.js";
import { getDemoFiles, getGXLDemoXML } from "./data/demo-data.js";
import { renderAll, _showFileChip } from "./ui/render.js";
import { showProgress, setProgress, hideProgress } from "./ui/progress.js";
import { initEvents } from "./ui/events.js";
import { updateThemeIcon } from "./ui/theme.js";
import "./ui/modals.js";
import "./ui/controls.js";
import "./style.css";

document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";
  updateThemeIcon(currentTheme);
});

window.resetToUpload = function () {
  document.getElementById("analysisResult").style.display = "none";
  document.getElementById("heroSection").style.display = "";
  document.getElementById("fileChip").style.display = "none";
  document.getElementById("btnAnalyze").disabled = true;
  resetState();
};

async function executePipeline(pipelineName, pipelineLogic) {
  try {
    showProgress();
    setProgress(10, 0);
    await sleep(250);

    const report = await pipelineLogic();

    if (report) {
      setReport(report);
      renderAll(report);
    }
  } catch (error) {
    console.error(
      `[Pipeline Error] Falha crítica na execução de '${pipelineName}':`,
      error,
    );
    alert(
      `Ocorreu um erro durante a análise. O arquivo pode estar corrompido ou em um formato não suportado.\n\nDetalhes no console.`,
    );
  } finally {
    hideProgress();
  }
}

window.runAnalysis = async function () {
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
};

window.loadDemo = async function () {
  setFiles([]);
  await executePipeline("loadDemo", async () => {
    const demoFiles = getDemoFiles();
    setProgress(30, 1);
    await sleep(200);

    const analyzed = demoFiles.map((f) =>
      analyzeFile(f.name, f.content, detectLang(f.name)),
    );
    setProgress(55, 2);
    await sleep(300);
    setProgress(70, 3);
    await sleep(250);
    setProgress(85, 4);
    await sleep(200);

    const report = generateReport(analyzed, "demo-project");
    setProgress(100, 6);
    await sleep(400);

    _showFileChip(`demo-project (${demoFiles.length} arquivos)`, "demo");

    const contentsMap = {};
    demoFiles.forEach((f) => {
      contentsMap[f.name] = f.content;
    });
    setFileContents(contentsMap);

    return report;
  });
};

window.loadDemoGXL = async function () {
  setFiles([]);
  await executePipeline("loadDemoGXL", async () => {
    const xml = getGXLDemoXML();
    setProgress(30, 1);
    await sleep(200);

    const { objects, tables } = parseGX(xml);
    setProgress(50, 2);
    await sleep(300);

    const analyzed = objects.map(computeGXMetrics);
    setProgress(68, 3);
    await sleep(250);

    const depMap = buildGXDepMap(analyzed);
    setProgress(82, 4);
    await sleep(200);

    const db = analyzeGXDB(tables);
    setProgress(94, 5);
    await sleep(200);

    const report = generateGXReport(
      analyzed,
      tables,
      depMap,
      db,
      "Demo — Sistema de Pedidos GeneXus",
    );
    setProgress(100, 6);
    await sleep(400);

    _showFileChip(
      "Demo GeneXus — Sistema de Pedidos",
      "demo",
      "var(--purple)",
      "⬡",
    );

    return report;
  });
};

async function processGXFlow(gxlFile) {
  setProgress(20, 1);
  await sleep(200);
  const buf = await gxlFile.arrayBuffer();
  let xmlContent = "";

  try {
    const { entries } = await readZip(buf);
    const xmlEntry =
      entries.find((e) => /\.(xml|gxl)$/i.test(e.name)) || entries[0];
    xmlContent = xmlEntry ? xmlEntry.text : "";
  } catch {
    xmlContent = new TextDecoder("utf-8").decode(buf);
    if (!xmlContent.includes("<")) {
      xmlContent = new TextDecoder("latin1").decode(buf);
    }
  }

  setProgress(40, 2);
  await sleep(300);
  const { objects, tables } = parseGX(xmlContent);

  setProgress(60, 3);
  await sleep(300);
  const analyzed = objects.map(computeGXMetrics);

  setProgress(75, 4);
  await sleep(200);
  const depMap = buildGXDepMap(analyzed);

  setProgress(88, 5);
  await sleep(200);
  const db = analyzeGXDB(tables);

  setProgress(96, 6);
  await sleep(200);
  const report = generateGXReport(analyzed, tables, depMap, db, gxlFile.name);

  setProgress(100, 6);
  await sleep(400);
  _showFileChip(
    gxlFile.name,
    `${(gxlFile.size / 1024).toFixed(0)} KB`,
    "var(--purple)",
    "⬡",
  );

  return report;
}

async function processGenericFlow(files) {
  setProgress(25, 1);
  await sleep(200);

  const fileContents = await Promise.all(files.map((f) => f.text()));
  const parsedFiles = files.map((f, i) => ({
    name: f.name,
    content: fileContents[i],
  }));

  const contentsMap = {};
  parsedFiles.forEach((f) => {
    contentsMap[f.name] = f.content;
  });
  setFileContents(contentsMap);

  setProgress(45, 2);
  await sleep(300);
  const analyzed = parsedFiles.map((f) =>
    analyzeFile(f.name, f.content, detectLang(f.name)),
  );

  setProgress(62, 3);
  await sleep(250);
  setProgress(78, 4);
  await sleep(250);

  const report = generateReport(analyzed, parsedFiles[0]?.name || "projeto");

  setProgress(90, 5);
  await sleep(200);
  setProgress(100, 6);
  await sleep(400);

  return report;
}
