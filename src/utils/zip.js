// ════════════════════════════════════════════
// UTILS: Descompressão de ZIP / XPZ
// ════════════════════════════════════════════

/**
 * Lê um arquivo XPZ/ZIP em memória e retorna suas entradas.
 * Suporta compressão DEFLATE-RAW usando a API nativa DecompressionStream do navegador.
 *
 * @param {ArrayBuffer} buffer - O buffer binário do arquivo ZIP/XPZ
 * @returns {Promise<{entries: Array<{name: string, text: string}>}>}
 */
export async function readZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const dec = new TextDecoder("utf-8");
  const entries = [];
  let i = 0;

  while (i < bytes.length - 4) {
    // Verifica a assinatura local file header do ZIP (0x04034b50)
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x03 &&
      bytes[i + 3] === 0x04
    ) {
      const compression = bytes[i + 8] | (bytes[i + 9] << 8);
      const compSize =
        bytes[i + 18] |
        (bytes[i + 19] << 8) |
        (bytes[i + 20] << 16) |
        (bytes[i + 21] << 24);
      const fnLen = bytes[i + 26] | (bytes[i + 27] << 8);
      const exLen = bytes[i + 28] | (bytes[i + 29] << 8);
      const name = dec.decode(bytes.slice(i + 30, i + 30 + fnLen));
      const dataStart = i + 30 + fnLen + exLen;
      const compData = bytes.slice(dataStart, dataStart + compSize);
      let text = "";

      if (compression === 0) {
        // Sem compressão (Store)
        text = dec.decode(compData);
      } else if (compression === 8) {
        // Compressão Deflate
        try {
          const ds = new DecompressionStream("deflate-raw");
          const writer = ds.writable.getWriter();
          const reader = ds.readable.getReader();
          writer.write(compData);
          writer.close();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          const total = chunks.reduce((s, c) => s + c.length, 0);
          const merged = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) {
            merged.set(c, off);
            off += c.length;
          }
          text = new TextDecoder("utf-8").decode(merged);
        } catch {
          // Fallback para Latin-1 caso o UTF-8 falhe (comum em exports antigos do GX)
          text = new TextDecoder("latin1").decode(compData);
        }
      } else {
        text = new TextDecoder("latin1").decode(compData);
      }

      entries.push({ name, text });
      i = dataStart + compSize;
    } else {
      i++;
    }
  }

  if (!entries.length) throw new Error("not zip");
  return { entries };
}
