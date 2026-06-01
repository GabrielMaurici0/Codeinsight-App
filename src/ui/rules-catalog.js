import { GENERIC_RULES } from "../core/engine-generic.js";
import { GX_RULES } from "../core/engine-gx.js";
import { escHtml } from "../utils/helpers.js";

export function initRuleCatalog() {
  let containerGeneric = document.getElementById("catalogGeneric");
  let containerGx = document.getElementById("catalogGx");

  // Injeta o layout dinamicamente caso a aba esteja vazia
  if (!containerGeneric || !containerGx) {
    const catalogTab =
      document.getElementById("tab-catalog") ||
      document.querySelector('[id*="catalog"]');

    if (catalogTab) {
      catalogTab.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 32px; padding: 16px 0;">
          <div>
            <h3 style="margin-bottom: 16px; color: var(--blue);">🔹 Regras: Motor Genérico</h3>
            <div id="catalogGeneric"></div>
          </div>
          <div>
            <h3 style="margin-bottom: 16px; color: var(--purple);">⬡ Regras: Motor GeneXus</h3>
            <div id="catalogGx"></div>
          </div>
        </div>
      `;
      containerGeneric = document.getElementById("catalogGeneric");
      containerGx = document.getElementById("catalogGx");
    } else {
      return;
    }
  }

  containerGeneric.innerHTML = renderCatalogGroup(GENERIC_RULES);
  containerGx.innerHTML = renderCatalogGroup(GX_RULES);
}

function renderCatalogGroup(rules) {
  if (!rules || rules.length === 0)
    return "<p style='color:var(--ink4)'>Nenhuma regra definida.</p>";

  return rules
    .map(
      (rule) => `
      <div class="arch-rule" style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span class="sev-badge sev-${rule.severity || rule.sev}">${rule.severity || rule.sev}</span>
          <span style="font-size:11px; font-weight:600; color:var(--ink4); background:var(--bg); padding:2px 6px; border-radius:4px; border:1px solid var(--border)">${rule.id}</span>
        </div>
        
        <div class="arch-rule-title">${escHtml(rule.title)}</div>
        <div class="arch-rule-desc" style="margin-bottom:8px">${escHtml(rule.description || rule.desc)}</div>
        
        ${
          rule.suggestion
            ? `<div style="font-size:12px; color:var(--blue); background:#eef6ff; padding:8px; border-radius:6px; border-left:3px solid var(--blue)">
                 <strong>💡 Sugestão:</strong> ${escHtml(rule.suggestion)}
               </div>`
            : ""
        }
      </div>
    `,
    )
    .join("");
}
