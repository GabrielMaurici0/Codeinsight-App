// ════════════════════════════════════════════
// CORE: Persistência de Dados (IndexedDB)
// ════════════════════════════════════════════

const DB_NAME = "CodeInsightDB";
const STORE_NAME = "analysis_history";
const DB_VERSION = 1;

/** Inicializa e retorna a conexão com o IndexedDB */
function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Usamos o timestamp como chave primária
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Salva o relatório e os conteúdos dos arquivos no banco */
export async function saveAnalysisToHistory(report, fileContents) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Estrutura do registro salvo
    const record = {
      id: Date.now(), // ID único baseado no tempo
      date: new Date().toISOString(),
      projectName: report.projectName,
      score: report.score,
      totalIssues: report.metrics.total_issues,
      isGXL: report.isGXL,
      reportData: report,
      fileContents: fileContents, // Necessário para o Code Preview funcionar depois
    };

    const request = store.add(record);
    request.onsuccess = () => resolve(record.id);
    request.onerror = () => reject(request.error);
  });
}

/** Busca todo o histórico salvo, ordenado do mais recente para o mais antigo */
export async function getAnalysisHistory() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Ordena do mais novo para o mais velho
      const results = request.result.sort((a, b) => b.id - a.id);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Exclui um registro específico do histórico */
export async function deleteHistoryRecord(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
