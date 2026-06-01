import { setFiles } from "../core/state.js";
import { escHtml } from "../utils/helpers.js";

// ════════════════════════════════════════════
// 3. MANIPULAÇÃO DE ARQUIVOS & IGNORE LIST
// ════════════════════════════════════════════

// Padrões de pastas e arquivos que devem ser ignorados na análise para poupar memória
const IGNORE_PATTERNS = [
  /(^|\/|\\)node_modules(\/|\\|$)/i,
  /(^|\/|\\)\.git(\/|\\|$)/i,
  /(^|\/|\\)\.vscode(\/|\\|$)/i,
  /(^|\/|\\)\.idea(\/|\\|$)/i,
  /(^|\/|\\)dist(\/|\\|$)/i,
  /(^|\/|\\)build(\/|\\|$)/i,
  /(^|\/|\\)coverage(\/|\\|$)/i,
  /\.min\.(js|css)$/i, // Ignora arquivos minificados
  /\.map$/i, // Ignora sourcemaps
  // Ignora binários e mídias que não contêm código-fonte analisável
  /\.(jpg|jpeg|png|gif|svg|ico|webp|mp4|mp3|wav|ogg|pdf|docx|xlsx|ttf|woff|woff2|eot)$/i,
];

export function initEvents() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("drag-over");
  });

  dropzone.addEventListener("dragleave", () =>
    dropzone.classList.remove("drag-over"),
  );

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");

    // Suporte para upload de pastas inteiras via DataTransfer
    const files = [];
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === "file") {
          const file = e.dataTransfer.items[i].getAsFile();
          if (file) files.push(file);
        }
      }
    } else {
      files.push(...e.dataTransfer.files);
    }

    if (files.length) handleFilesUpload(files);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFilesUpload([...fileInput.files]);
  });

  function handleFilesUpload(rawFiles) {
    // ── O FILTRO DE INTELIGÊNCIA (Ignore List) ──
    const validFiles = rawFiles.filter((f) => {
      // webkitRelativePath contém o caminho da pasta (ex: meu-projeto/node_modules/teste.js)
      const path = f.webkitRelativePath || f.name;

      // Permite que arquivos de exportação e pacotes passem direto pelo filtro de mídia
      if (/\.(gxl|xpz|xml|zip)$/i.test(path)) return true;

      // Testa se o caminho do arquivo bate com algum padrão da nossa lista negra
      return !IGNORE_PATTERNS.some((regex) => regex.test(path));
    });

    if (validFiles.length === 0) {
      alert(
        "Nenhum arquivo válido para análise foi encontrado.\n\nPastas como 'node_modules', 'dist' e arquivos de mídia são ignorados automaticamente pela ferramenta.",
      );
      return;
    }

    // Altera o estado blindado de forma segura usando apenas os arquivos validados
    setFiles(validFiles);
    const totalSize = validFiles.reduce((s, f) => s + f.size, 0);

    const chip = document.getElementById("fileChip");
    chip.innerHTML = `
    <div class="chip">
      <span>📂</span>
      <span class="chip-name">${
        validFiles.length === 1
          ? escHtml(validFiles[0].name)
          : `${validFiles.length} arquivos selecionados`
      }</span>
      <span class="chip-size">${(totalSize / 1024).toFixed(0)} KB</span>
    </div>`;

    // Se filtramos alguns arquivos, mostramos um aviso visual discreto
    if (validFiles.length < rawFiles.length) {
      chip.innerHTML += `<div style="font-size:11px; color:var(--ink4); margin-top:4px; text-align:center;">${rawFiles.length - validFiles.length} arquivo(s) irrelevante(s) ignorado(s)</div>`;
    }

    chip.style.display = "block";
    document.getElementById("btnAnalyze").disabled = false;
  }

  // Atalho global de teclado
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && window.closeCodePreview) {
      window.closeCodePreview();
    }
  });
}
