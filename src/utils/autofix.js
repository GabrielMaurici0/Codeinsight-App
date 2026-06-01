// ════════════════════════════════════════════
// UTILS: Motor de Correção Automatizada (Auto-Fix)
// ════════════════════════════════════════════

/**
 * Analisa a linha defeituosa do usuário e gera uma sugestão cirúrgica de correção.
 * @param {string} ruleId - ID do problema detectado
 * @param {string} userCode - Código original extraído do snippet
 */
export function generateAutoFix(ruleId, userCode) {
  if (!userCode || typeof userCode !== "string") return null;

  let fixedCode = userCode.trim();
  let explanation = "";

  switch (ruleId) {
    case "SEC001": // SQL Injection Genérico
      if (userCode.includes("+")) {
        const parts = userCode.split("+");
        fixedCode = `${parts[0]}? \`; // 💡 Passe [${parts[parts.length - 1].trim()}] no array de parâmetros do execute()`;
        explanation =
          "Substituiu a concatenação direta de string por um marcador parametrizado (?) seguro.";
      } else if (userCode.includes("${")) {
        fixedCode =
          userCode.replace(/\$\{[^}]+\}/g, "?") +
          " // 💡 Passe as variáveis no array de parâmetros do execute()";
        explanation =
          "Removeu a interpolação dinâmica substituindo-a por prepared statements nativos.";
      } else {
        return null;
      }
      break;

    case "SEC002": // XSS via innerHTML
      fixedCode = userCode.replace(/\.innerHTML\s*=/, ".textContent =");
      explanation =
        "Alterou a propriedade perigosa .innerHTML para .textContent, forçando o navegador a tratar o dado como texto puro e neutralizando scripts maliciosos.";
      break;

    case "SEC003": // Secrets Hardcoded
      fixedCode = userCode.replace(
        /=\s*(["'`])[^"']+\1/,
        "= process.env.SECRET_VARIABLE; // 💡 Adicione a chave real ao seu arquivo .env",
      );
      explanation =
        "Extraiu a credencial exposta no código-fonte e substituiu pela leitura segura via variável de ambiente.";
      break;

    case "BG001": // console.log
      fixedCode = userCode.replace(/console\.log/, "logger.debug");
      explanation =
        "Substituiu a saída de terminal console.log por um mecanismo de logging estruturado adequado para produção.";
      break;

    case "GX_SEC001": // GeneXus SQL Injection via Macro
      fixedCode =
        "/* Correção GeneXus recomendada: */\nFor Each Cliente\n  Where CliNome = &InputUsuario // ⬡ Parâmetro nativo seguro ( Prepared Statement )";
      explanation =
        "Removeu a Macro Substitution da cláusula Where, aplicando uma parametrização direta que o compilador GeneXus isola nativamente.";
      break;

    case "GX_SEC002": // GeneXus XSS TextBlock
      if (userCode.includes("=")) {
        const parts = userCode.split("=");
        fixedCode = `${parts[0].trim()}.Caption = HTMLEncode(${parts[1].trim().replace(/;$/, "")})`;
        explanation =
          "Envolveu a variável de entrada com a função HTMLEncode() para higienizar caracteres especiais de HTML antes da renderização.";
      } else {
        return null;
      }
      break;

    default:
      return null; // Caso não haja mapeamento de correção direta para a regra
  }

  return { fixedCode, explanation };
}
