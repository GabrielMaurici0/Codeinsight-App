import { escHtml } from "../utils/helpers.js";
import { openCodePreview } from "./modals.js";
import { getFileContents } from "../core/state.js";

export function renderHeatmap(files) {
  // Busca o contêiner explícito injetado no HTML
  const root = document.getElementById("heatmap-root");
  if (!root) {
    console.error(
      "Erro no Heatmap: O elemento 'heatmap-root' não foi encontrado no HTML.",
    );
    return;
  }

  // Limpa renderizações antigas para evitar duplicidade ao alternar ou refazer análises
  root.innerHTML = "";

  if (!files || files.length === 0) return;

  // Soma o total de linhas para calcular a proporção flexível dos blocos
  const totalLoc = files.reduce((acc, f) => acc + (f.lines_of_code || 1), 0);

  // Ordena os arquivos: do maior risco para o menor (os mais perigosos aparecem primeiro)
  const sortedFiles = [...files].sort((a, b) => b.risk_score - a.risk_score);

  const blocksHtml = sortedFiles
    .map((f) => {
      // Calcula o tamanho (Flex Basis) de 5% a 35% da tela dependendo do tamanho do arquivo
      const pct = (f.lines_of_code || 1) / totalLoc;
      const flexBasis = Math.max(5, Math.min(35, pct * 100));

      // Define a cor semântica do Design System com base no score de risco
      let bg = "var(--green)"; // Seguro
      if (f.risk_score >= 7)
        bg = "var(--red)"; // Crítico
      else if (f.risk_score >= 4)
        bg = "var(--orange)"; // Atenção
      else if (f.risk_score > 0) bg = "var(--blue)"; // Informativo

      return `
      <div class="heatmap-block" 
           data-file="${escHtml(f.name)}"
           style="flex: 1 1 ${flexBasis}%; background: ${bg};" 
           title="${escHtml(f.name)}\nRisco: ${f.risk_score} | Issues: ${f.issues?.length || 0} | Linhas: ${f.lines_of_code}">
        ${f.issues?.length > 0 ? f.issues.length : "✓"}
      </div>
    `;
    })
    .join("");

  // Constrói o componente respeitando a identidade visual do sistema
  root.innerHTML = `
    <div id="heatmapContainer" class="heatmap-wrapper">
      <div class="heatmap-header">
        <h3 style="margin:0; font-size:15px; color:var(--ink2);">🔥 Mapa de Calor (Riscos & Dimensões)</h3>
        <div style="display:flex; gap:16px;">
          <div class="heatmap-legend"><div class="heatmap-legend-color" style="background:var(--red);"></div> Crítico</div>
          <div class="heatmap-legend"><div class="heatmap-legend-color" style="background:var(--orange);"></div> Atenção</div>
          <div class="heatmap-legend"><div class="heatmap-legend-color" style="background:var(--green);"></div> Seguro</div>
        </div>
      </div>
      <div class="heatmap-grid">
        ${blocksHtml}
      </div>
      <div style="font-size:11px; color:var(--ink4); margin-top:12px; text-align:center;">
        A largura do bloco reflete as <strong>Linhas de Código (LOC)</strong>. O número dentro do bloco indica o <strong>Total de Issues</strong>. Clique em um bloco para inspecionar o arquivo.
      </div>
    </div>
  `;

  // Vincula o evento de clique na Grid (Delegação limpa) para disparar o Code Preview nativo
  document
    .getElementById("heatmapContainer")
    ?.querySelector(".heatmap-grid")
    ?.addEventListener("click", (e) => {
      const block = e.target.closest(".heatmap-block");
      if (!block) return;

      const fileName = block.dataset.file;
      const targetFile = files.find((f) => f.name === fileName);

      if (targetFile) {
        if (targetFile.lang === "gxl") {
          openCodePreview(
            targetFile.name,
            targetFile.raw_content || "",
            "gxl",
            targetFile.issues,
            {
              _source: targetFile._source,
              _events: targetFile._events,
              _rules: targetFile._rules,
              obj_type: targetFile.obj_type,
            },
          );
        } else {
          const content = getFileContents()[targetFile.name] || null;
          openCodePreview(
            targetFile.name,
            content,
            targetFile.lang,
            targetFile.issues,
          );
        }
      }
    });
}
