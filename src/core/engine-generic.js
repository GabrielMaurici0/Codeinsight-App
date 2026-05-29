import { getFileContents } from "./state.js";
import { detectLang } from "../utils/language.js";

// ════════════════════════════════════════════
// 1. DICIONÁRIO DE REGRAS (OCP - Open/Closed Principle)
// ════════════════════════════════════════════

const GENERIC_RULES = [
  {
    id: "BG001",
    langs: ["js", "ts"],
    category: "Bug",
    severity: "medium",
    title: "console.log() em código de produção",
    description:
      "Chamadas console.log() expõem informações internas e podem vazar dados sensíveis.",
    suggestion:
      "Use uma biblioteca de logging estruturado (Winston, Pino) com níveis configuráveis.",
    check: (line) => line.includes("console.log"),
  },
  {
    id: "BG002",
    langs: ["py"],
    category: "Bug",
    severity: "low",
    title: "print() em código de produção",
    description:
      "Chamada print() encontrada. Em produção use o módulo logging.",
    suggestion: "Substitua por logging.info(), logging.debug() etc.",
    check: (line) => /^\s*print\s*\(/.test(line),
  },
  {
    id: "SEC001",
    langs: ["all"],
    category: "Segurança",
    severity: "critical",
    title: "Possível SQL Injection",
    description: "Concatenação de variáveis em queries SQL sem parametrização.",
    suggestion:
      "Use queries parametrizadas (prepared statements). Nunca concatene input do usuário em SQL.",
    check: (line) => {
      const sqlPatterns = [
        /[`'"]\s*\+\s*\w+\s*\+\s*[`'"]/,
        /query\s*\(.*\+.*\)/,
        /execute\s*\(.*\+.*\)/,
        /f["'].*SELECT.*{/,
        /["'].*SELECT.*"\s*\+/,
        /\$\{.*\}.*WHERE/,
      ];
      return (
        sqlPatterns.some((p) => p.test(line)) &&
        /(select|insert|update|delete)/i.test(line)
      );
    },
  },
  {
    id: "SEC002",
    langs: ["js", "ts"],
    category: "Segurança",
    severity: "high",
    title: "Possível XSS via innerHTML",
    description:
      "Uso de innerHTML com dados não sanitizados pode permitir Cross-Site Scripting.",
    suggestion: "Use textContent, innerText ou sanitize inputs com DOMPurify.",
    check: (line) =>
      line.includes("innerHTML") &&
      (line.includes("+=") || line.includes("= ")),
  },
  {
    id: "SEC003",
    langs: ["all"],
    category: "Segurança",
    getSeverity: (isTest) => (isTest ? "info" : "critical"),
    title: "Segredos hardcoded",
    description:
      "Credenciais no código-fonte ficam expostas em repositórios, logs e histórico git.",
    suggestion:
      "Use variáveis de ambiente ou cofre de segredos (Vault, AWS Secrets Manager).",
    check: (line) => {
      const secretPatterns = [
        /password\s*=\s*["'][^"']{4,}/i,
        /api[_-]?key\s*=\s*["'][^"']{8,}/i,
        /secret\s*=\s*["'][^"']{6,}/i,
        /token\s*=\s*["'][^"']{8,}/i,
        /private[_-]?key\s*=\s*["'][^"']{8,}/i,
        /aws[_-]?secret/i,
      ];
      if (
        line.includes("process.env") ||
        line.includes("os.environ") ||
        line.includes("getenv")
      )
        return false;
      return secretPatterns.some((p) => p.test(line));
    },
    formatLine: (line) =>
      line.replace(/=\s*["'][^"']*["']/, '= "***REDACTED***"'),
  },
  {
    id: "SEC004",
    langs: ["js", "ts"],
    category: "Segurança",
    severity: "critical",
    title: "Uso de eval() — execução de código arbitrário",
    description:
      "eval() com input do usuário permite Remote Code Execution (RCE).",
    suggestion:
      "Nunca use eval(). Use JSON.parse() para dados ou refatore a lógica.",
    check: (line) => /\beval\s*\(/.test(line),
  },
  {
    id: "SEC005",
    langs: ["all"],
    category: "Segurança",
    severity: "critical",
    title: "Command Injection — shell com variáveis",
    description: "Execução de comandos shell com input não sanitizado.",
    suggestion:
      "Use APIs de alto nível que não invocam shell. Valide e escape todos os inputs.",
    check: (line) =>
      [
        /exec\s*\([^)]*\+/,
        /shell=True/,
        /os\.system\s*\(/,
        /subprocess\.call.*shell\s*=\s*True/,
        /child_process\.exec\s*\([^)]*\+/,
      ].some((p) => p.test(line)),
  },
  {
    id: "QA001",
    langs: ["all"],
    category: "Qualidade",
    severity: "low",
    title: "Comentários TODO/FIXME não resolvidos",
    description:
      "Comentário indicando trabalho incompleto ou dívida técnica explícita.",
    suggestion: "Crie tickets no issue tracker. Remova do código em produção.",
    check: (line, rawLine) => /\b(TODO|FIXME|HACK|XXX|BUG)\b/.test(rawLine),
  },
  {
    id: "BG003",
    langs: ["js", "ts"],
    category: "Bug",
    severity: "medium",
    title: "async sem await — possível promise não resolvida",
    description: "Funções async sem await retornam Promise desnecessariamente.",
    suggestion:
      "Remova async se não há operações assíncronas, ou adicione await.",
    check: (line, rawLine, content) =>
      /\basync\s+function|\basync\s+\(/.test(line) &&
      !content.includes("await"),
  },
  {
    id: "BG004",
    langs: ["all"],
    category: "Bug",
    severity: "medium",
    title: "Tratamento de exceção genérico",
    description: "Bloco catch/except genérico silencia erros críticos.",
    suggestion:
      "Capture exceções específicas. Sempre logue o erro. Nunca deixe blocos catch vazios.",
    check: (line) =>
      /catch\s*\(\s*e\s*\)\s*{?\s*}/.test(line) ||
      /except\s*:\s*$/.test(line) ||
      /except\s+Exception\s*:/.test(line),
  },
  {
    id: "SM004",
    langs: ["all"],
    category: "Code Smell",
    severity: "low",
    title: "Números mágicos no código",
    description: "Número literal sem nome semântico.",
    suggestion: "Extraia para constantes nomeadas (ex: const MAX_RETRIES = 3).",
    check: (line) => {
      if (
        line.includes("version") ||
        line.includes("port") ||
        line.includes("timeout")
      )
        return false;
      return /(?<![.\w])\b(?!0\b|1\b|2\b|100\b|0\.)\d{2,}\b(?!\s*[,;)\]}]|\s*ms|\s*px)/.test(
        line,
      );
    },
  },
];

// ════════════════════════════════════════════
// 2. ENGINE PRINCIPAL (Genérica)
// ════════════════════════════════════════════

export function analyzeFile(name, content, lang) {
  const lines = content.split("\n");
  const isTestFile =
    /\.(spec|test|_test)\./i.test(name) || name.includes("__tests__");

  let inBlockComment = false;
  const cleanLines = lines.map((l) => {
    let t = l.trim();
    if (inBlockComment) {
      if (t.includes("*/")) inBlockComment = false;
      return "";
    }
    if (t.startsWith("/*") && !t.includes("*/")) {
      inBlockComment = true;
      return "";
    }
    if (t.startsWith("//") || t.startsWith("#")) return "";
    return t;
  });

  const loc = cleanLines.filter((l) => l.length > 0).length || 1;
  const issuesMap = {};

  const ccKeywords = /\b(if|else if|elif|for|while|case|catch|&&|\|\||\?)\b/g;
  let cc = 1;
  let maxNesting = 0;
  let curNest = 0;

  cleanLines.forEach((l) => {
    if (!l) return;
    const m = l.match(ccKeywords);
    if (m) cc += m.length;

    curNest +=
      (l.match(/{|\bdo\b|\bthen\b/g) || []).length -
      (l.match(/}/g) || []).length;
    if (curNest > maxNesting) maxNesting = curNest;
  });

  const mi = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        171 -
          5.2 * Math.log(Math.max(cc, 1)) -
          0.23 * cc -
          16.2 * Math.log(Math.max(loc, 1)),
      ),
    ),
  );

  lines.forEach((rawLine, i) => {
    const cleanLine = cleanLines[i];
    if (!cleanLine && !rawLine.includes("TODO") && !rawLine.includes("FIXME"))
      return;

    GENERIC_RULES.forEach((rule) => {
      if (!rule.langs.includes("all") && !rule.langs.includes(lang)) return;

      const matched = rule.check(cleanLine, rawLine, content);
      if (matched) {
        if (!issuesMap[rule.id]) {
          issuesMap[rule.id] = {
            id: rule.id,
            category: rule.category,
            severity: rule.getSeverity
              ? rule.getSeverity(isTestFile)
              : rule.severity,
            title:
              isTestFile && rule.id === "SEC003"
                ? rule.title + " (Permitido em Testes)"
                : rule.title,
            description: rule.description,
            suggestion: rule.suggestion,
            file: name,
            lang,
            occurrences: 0,
            snippets: [],
          };
        }

        if (issuesMap[rule.id].snippets.length < 3) {
          issuesMap[rule.id].snippets.push({
            line: i + 1,
            code: rule.formatLine
              ? rule.formatLine(rawLine).trim()
              : rawLine.trim(),
            hit: true,
          });
        }
        issuesMap[rule.id].occurrences++;
      }
    });
  });

  const issues = Object.values(issuesMap);

  if (loc > 300) {
    issues.push({
      id: "SM001",
      category: "Code Smell",
      severity: loc > 600 ? "high" : "medium",
      title: "Arquivo muito longo",
      description: `O arquivo tem ${loc} linhas efetivas (Lim. 300).`,
      suggestion: "Divida em módulos menores com responsabilidades únicas.",
      file: name,
      lang,
      snippets: [
        { line: 1, code: `// ${loc} linhas — considere dividir este arquivo` },
      ],
      occurrences: 1,
    });
  }

  if (cc > 20) {
    issues.push({
      id: "SM002",
      category: "Code Smell",
      severity: cc > 40 ? "critical" : "high",
      title: "Complexidade ciclomática alta",
      description: `CC = ${cc} (Lim. 20). Código muito complexo.`,
      suggestion: "Extraia condições em funções menores.",
      file: name,
      lang,
      snippets: [],
      occurrences: 1,
    });
  }

  if (maxNesting > 5) {
    issues.push({
      id: "SM003",
      category: "Code Smell",
      severity: maxNesting > 8 ? "high" : "medium",
      title: `Aninhamento excessivo`,
      description: `Profundidade ${maxNesting} detectada.`,
      suggestion: "Use early returns e extraia funções internas.",
      file: name,
      lang,
      snippets: [],
      occurrences: 1,
    });
  }

  if (lang === "js" || lang === "ts") {
    const varDecl = [];
    cleanLines.forEach((l, i) => {
      const m = l.match(/\b(?:const|let|var)\s+(\w+)\s*=/);
      if (m) varDecl.push({ name: m[1], line: i + 1 });
    });
    const unused = varDecl
      .filter(
        (v) =>
          (content.match(new RegExp("\\b" + v.name + "\\b", "g")) || [])
            .length <= 1,
      )
      .slice(0, 3);
    if (unused.length > 0) {
      issues.push({
        id: "BG005",
        category: "Bug",
        severity: "low",
        title: "Variáveis possivelmente não utilizadas",
        description: `${unused.length} variable(eis) declarada(s) aparentemente sem uso: ${unused.map((v) => v.name).join(", ")}`,
        suggestion: "Remova variáveis não usadas.",
        file: name,
        lang,
        occurrences: unused.length,
        snippets: unused.map((v) => ({
          line: v.line,
          code: lines[v.line - 1].trim(),
          hit: true,
        })),
      });
    }
  }

  const riskScore = Math.min(
    10,
    Math.round(
      issues.filter((i) => i.severity === "critical").length * 3 +
        issues.filter((i) => i.severity === "high").length * 1.5 +
        (cc > 20 ? 2 : 0) +
        (loc > 400 ? 1 : 0),
    ),
  );

  return {
    name,
    lang,
    langGroup: lang === "ts" ? "js" : lang,
    lines_of_code: loc,
    complexity_score: cc,
    maintainability_index: mi,
    risk_score: riskScore,
    imports: cleanLines.filter((l) => /^\s*(import|require|from)\s/.test(l))
      .length,
    issues,
    calls: [],
    called_by: [],
  };
}

export function detectDuplicates(files) {
  const MIN_LINES = 6;
  function normalizeLine(l) {
    if (!l) return null;
    const t = l.trim();

    if (/^(\/\/|#|\/\*|\*|-->||<!--)/.test(t)) return null;
return t.replace(/["'`][^"'`]*["'`]/g, '""').replace(/\b\d+\b/g, "0").replace(/\s+/g, " ");
  }

  const fileLines = {};
  files.forEach(f => {
    const raw = getFileContents()[f.name] || f.raw_content || "";
    fileLines[f.name] = [];
    raw.split("\n").forEach((l, i) => {
      const norm = normalizeLine(l);
      if (norm) fileLines[f.name].push({ norm, raw: l, lineNum: i + 1 });
    });
  });

  const hashMap = {};
  files.forEach(f => {
    const nlines = fileLines[f.name];
    if (!nlines || nlines.length < MIN_LINES) return;
    for (let i = 0; i <= nlines.length - MIN_LINES; i++) {
      const window = nlines.slice(i, i + MIN_LINES);
      const key = window.map(l => l.norm).join("\n");
      if (!hashMap[key]) hashMap[key] = [];
      hashMap[key].push({ file: f.name, startLine: window[0].lineNum, endLine: window[window.length - 1].lineNum });
    }
  });

  const issuesByFile = {};
  Object.values(hashMap).forEach(occurrences => {
    if (occurrences.length < 2) return;
    const unique = [];
    const seen = new Set();
    occurrences.forEach(o => {
      const k = `${o.file}:${o.startLine}`;
      if (!seen.has(k)) { seen.add(k); unique.push(o); }
    });
    if (unique.length < 2) return;

    unique.forEach((occ, idx) => {
      const partners = unique.filter((_, j) => j !== idx);
      if (!issuesByFile[occ.file]) issuesByFile[occ.file] = [];
      partners.forEach(p => {
        issuesByFile[occ.file].push({ partnerFile: p.file, partnerLine: p.startLine, startLine: occ.startLine, endLine: occ.endLine });
      });
    });
  });

  files.forEach(f => {
    const clones = issuesByFile[f.name];
    if (!clones || !clones.length) return;

    const merged = [];
    clones.sort((a, b) => a.startLine - b.startLine).forEach(c => {
        const last = merged[merged.length - 1];
        if (last && c.startLine <= last.endLine + 1 && c.partnerFile === last.partnerFile) {
          last.endLine = Math.max(last.endLine, c.endLine);
        } else {
          merged.push({ ...c });
        }
      });

    const topClones = merged.slice(0, 5);
    const partners = [...new Set(topClones.map(c => c.partnerFile))];
    const totalLines = topClones.reduce((s, c) => s + (c.endLine - c.startLine + 1), 0);

    f.issues.push({
      id: "SM005", category: "Code Smell", severity: totalLines > 30 ? "high" : "medium",
      title: `Código duplicado — ${merged.length} bloco(s) clonado(s)`,
      description: `${merged.length} bloco(s) com ≥${MIN_LINES} linhas detectado(s). Duplicado em: ${partners.slice(0, 2).join(", ")}.`,
      suggestion: "Aplique o princípio DRY (Don't Repeat Yourself). Extraia o código repetido.",
      file: f.name, lang: f.lang, occurrences: merged.length,
      snippets: topClones.map(c => ({ line: c.startLine, code: `// Linhas ${c.startLine}–${c.endLine} em comum com ${c.partnerFile}`, hit: true }))
    });
  });
}

// ════════════════════════════════════════════
// 4. GERAÇÃO DO RELATÓRIO
// ════════════════════════════════════════════

export function generateReport(files, projectName) {
  detectDuplicates(files);

  const allIssues = files.flatMap((f) => f.issues);
  const m = {
    total_files: files.length,
    total_loc: files.reduce((s, f) => s + f.lines_of_code, 0),
    avg_complexity: files.length ? Math.round(files.reduce((s, f) => s + f.complexity_score, 0) / files.length) : 0,
    avg_maintainability: files.length ? Math.round(files.reduce((s, f) => s + f.maintainability_index, 0) / files.length) : 0,
    total_issues: allIssues.length,
    critical_issues: allIssues.filter(i => i.severity === "critical").length,
    high_issues: allIssues.filter(i => i.severity === "high").length,
    medium_issues: allIssues.filter(i => i.severity === "medium").length,
    low_issues: allIssues.filter(i => ["low", "info"].includes(i.severity)).length,
    security_issues: allIssues.filter(i => i.category === "Segurança").length,
    high_risk_files: files.filter(f => f.risk_score >= 7).length,
  };

  const THRESHOLDS = { min_score: 60, max_critical: 0, max_high_risk: 1 };

  const scoreComponents = {
    complexity: Math.max(0, 100 - (m.avg_complexity - 5) * 3),
    maintainability: m.avg_maintainability,
    security: Math.max(0, 100 - m.security_issues * 15),
    issues: Math.max(0, 100 - (m.total_issues / Math.max(m.total_files, 1)) * 8),
  };
  
  const score = Math.round(Math.min(100, Math.max(0, scoreComponents.complexity * 0.25 + scoreComponents.maintainability * 0.25 + scoreComponents.security * 0.3 + scoreComponents.issues * 0.2)) * 10) / 10;

  const gatePassed =
    score >= THRESHOLDS.min_score &&
    m.critical_issues <= THRESHOLDS.max_critical &&
    m.high_risk_files <= THRESHOLDS.max_high_risk;
  
  const archViolations = [
    { rule: "Controllers não acessam banco", violated: files.some(f => f.name.includes("Controller") && f.issues.some(i => i.id === "SEC001")), files: files.filter(f => f.name.includes("Controller") && f.issues.some(i => i.id === "SEC001")).map(f => f.name) },
    { rule: "Secrets nunca em código fonte", violated: allIssues.some(i => i.id === "SEC003"), files: [...new Set(allIssues.filter(i => i.id === "SEC003").map(i => i.file))] },
    { rule: "Complexidade ciclomática ≤ 20", violated: files.some(f => f.complexity_score > 20), files: files.filter(f => f.complexity_score > 20).map(f => f.name) },
    { rule: "Sem command injection (eval/shell)", violated: allIssues.some(i => i.id === "SEC004" || i.id === "SEC005"), files: [...new Set(allIssues.filter(i => i.id === "SEC004" || i.id === "SEC005").map(i => i.file))] }
  ];

  const depMap = {};
  files.forEach(f => { depMap[f.name] = { calls: [], called_by: [], is_hub: f.risk_score >= 7 && f.complexity_score >= 15 }; });

const cicd = {
    schema_version: "2.0",
    tool: "CodeInsight-Generic",
    timestamp: new Date().toISOString(),
    project: projectName,
    quality_gate: {
      passed: gatePassed,
      overall_score: score,
      thresholds: THRESHOLDS,
      actual: { score, critical: m.critical_issues, high_risk: m.high_risk_files }
    },
    metrics: m,
    // Padronizando o nome da chave para 'target' e 'type'
    issues: allIssues.map(i => ({ id: i.id, target: i.file, severity: i.severity, category: i.category, title: i.title })),
    top_risks: files
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 5)
      .map(f => ({ target: f.name, type: f.lang, risk: f.risk_score }))
  };

  return { projectName, score, metrics: m, files, allIssues, depMap: {}, archViolations: [], cicd };
}