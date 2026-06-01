// ════════════════════════════════════════════
// UTILS: Conversor de Relatório para SARIF v2.1.0
// ════════════════════════════════════════════

export function buildSarif(report) {
  // Mapeamento de severidades internas para níveis do SARIF
  const severityMap = {
    critical: "error",
    high: "error",
    medium: "warning",
    warning: "warning",
    low: "note",
    info: "note",
  };

  // 1. Extrair regras únicas detectadas para popular o driver
  const uniqueRulesMap = {};
  report.allIssues.forEach((issue) => {
    if (!uniqueRulesMap[issue.id]) {
      uniqueRulesMap[issue.id] = {
        id: issue.id,
        shortDescription: { text: issue.title },
        fullDescription: { text: issue.description || issue.title },
        defaultConfiguration: {
          level: severityMap[issue.severity] || "note",
        },
        properties: {
          category: issue.category,
        },
      };
    }
  });

  const rules = Object.values(uniqueRulesMap);

  // 2. Mapear os issues para o formato de "results"
  const results = report.allIssues.map((issue) => {
    // Pega a primeira ocorrência (linha) ou joga para a linha 1 como fallback
    let lineNum = 1;
    if (issue.snippets && issue.snippets.length > 0) {
      const snip = issue.snippets[0];
      lineNum =
        snip.line ||
        snip.lineNum ||
        (snip.lines && snip.lines[0] ? snip.lines[0].n : 1);
    }

    return {
      ruleId: issue.id,
      level: severityMap[issue.severity] || "note",
      message: {
        text:
          issue.title +
          (issue.suggestion ? `\nSugestão: ${issue.suggestion}` : ""),
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: issue.file || "unknown-file",
            },
            region: {
              startLine: Math.max(1, lineNum),
            },
          },
        },
      ],
    };
  });

  // 3. Montar o Schema final SARIF 2.1.0
  return {
    version: "2.1.0",
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "CodeInsight",
            semanticVersion: "1.0.0",
            informationUri: "https://github.com/codeinsight",
            rules: rules,
          },
        },
        results: results,
      },
    ],
  };
}
