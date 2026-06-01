// ════════════════════════════════════════════
// WORKER: Processamento Paralelo (Generic Engine)
// ════════════════════════════════════════════

import { analyzeFile, generateReport } from "../core/engine-generic.js";
import { setFileContents } from "../core/state.js";
import { detectLang } from "../utils/language.js";

self.onmessage = function (e) {
  const { type, payload } = e.data;
  if (type !== "START_GENERIC") return;

  const { files, projectName } = payload;

  try {
    self.postMessage({ type: "PROGRESS", pct: 45, step: 2 });

    // O worker tem sua própria instância de memória.
    // Precisamos popular o state.js local do worker para que o generateReport consiga ler os arquivos.
    const contentsMap = {};
    files.forEach((f) => {
      contentsMap[f.name] = f.content;
    });
    setFileContents(contentsMap);

    // Executa a análise pesada (Regex, contagem de linhas, complexidade)
    const analyzed = files.map((f) =>
      analyzeFile(f.name, f.content, detectLang(f.name)),
    );

    self.postMessage({ type: "PROGRESS", pct: 62, step: 3 });
    self.postMessage({ type: "PROGRESS", pct: 78, step: 4 });

    // Gera o relatório final e busca as duplicatas
    const report = generateReport(analyzed, projectName);

    self.postMessage({ type: "PROGRESS", pct: 90, step: 5 });

    // Devolve o relatório pronto para a Main Thread
    self.postMessage({ type: "DONE", report });
  } catch (error) {
    self.postMessage({ type: "ERROR", message: error.message });
  }
};
