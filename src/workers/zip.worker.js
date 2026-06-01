// ════════════════════════════════════════════
// WORKER: Descompressão Assíncrona de XPZ/ZIP
// ════════════════════════════════════════════

import { readZip } from "../utils/zip.js";

self.onmessage = async function (e) {
  const { type, payload } = e.data;

  if (type === "EXTRACT_GX") {
    const buf = payload.buffer;
    let xmlContent = "";

    try {
      // Tenta descompactar como ZIP/XPZ
      const { entries } = await readZip(buf);
      const xmlEntry =
        entries.find((entry) => /\.(xml|gxl)$/i.test(entry.name)) || entries[0];
      xmlContent = xmlEntry ? xmlEntry.text : "";
    } catch {
      // Fallback: Se falhar (não for ZIP), tenta ler como texto plano (arquivo .xml cru)
      xmlContent = new TextDecoder("utf-8").decode(buf);
      if (!xmlContent.includes("<")) {
        xmlContent = new TextDecoder("latin1").decode(buf);
      }
    }

    // Devolve o conteúdo pronto para a thread principal
    self.postMessage({ type: "DONE", xmlContent });
  }
};
