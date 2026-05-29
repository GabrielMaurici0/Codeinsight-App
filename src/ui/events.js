import { setFiles } from "../core/state.js";
import { escHtml } from "../utils/helpers.js";

// ════════════════════════════════════════════
// 3. MANIPULAÇÃO DE ARQUIVOS
// ════════════════════════════════════════════

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
    const files = [...e.dataTransfer.files];
    if (files.length) handleFilesUpload(files);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFilesUpload([...fileInput.files]);
  });

  function handleFilesUpload(files) {
    // Altera o estado blindado de forma segura
    setFiles(files);
    const totalSize = files.reduce((s, f) => s + f.size, 0);

    const chip = document.getElementById("fileChip");
    chip.innerHTML = `
    <div class="chip">
      <span>📂</span>
      <span class="chip-name">${
        files.length === 1
          ? escHtml(files[0].name)
          : `${files.length} arquivos selecionados`
      }</span>
      <span class="chip-size">${(totalSize / 1024).toFixed(0)} KB</span>
    </div>`;
    chip.style.display = "block";
    document.getElementById("btnAnalyze").disabled = false;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.closeCodePreview();
  });
}
