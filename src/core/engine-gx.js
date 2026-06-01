import { escHtml } from "../utils/helpers.js";

// ════════════════════════════════════════════
// 1. ENGINE GX — Parser XML
// ════════════════════════════════════════════

function gxTxt(el, ...path) {
  let cur = el;
  for (const p of path) {
    cur = cur && cur.querySelector(p);
  }
  return cur ? (cur.textContent || "").trim() : "";
}

function gxGetSource(el) {
  const result = [...el.querySelectorAll("Source")]
    .map((s) => s.textContent || "")
    .join("\n");
  return result;
}

function gxGetRules(el) {
  const result = [...el.querySelectorAll("Rules")]
    .map((r) => r.textContent || "")
    .filter(Boolean);
  return result;
}

function gxGetEvents(el) {
  const cleanCDATA = (t) => t.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
  const r = [];
  el.querySelectorAll("Events, Event").forEach((e) => {
    const t = cleanCDATA(e.textContent || "");
    if (t.trim()) r.push(t);
  });
  return r;
}

function gxGetVars(el) {
  return [...el.querySelectorAll("Variable,Var")]
    .map((v) => ({
      name:
        gxTxt(v, "Name") ||
        v.getAttribute("Name") ||
        v.getAttribute("name") ||
        "",
      type: gxTxt(v, "Type") || v.getAttribute("Type") || "",
    }))
    .filter((v) => v.name);
}

function gxExtractCalls(content) {
  const calls = new Set();
  [
    /Call\s*\(\s*["']?(\w+)/gi,
    /udp\s*\(\s*["']?(\w+)/gi,
    /Do\s+["']?(\w+)/gi,
  ].forEach((re) => {
    let m;
    while ((m = re.exec(content)) !== null) calls.add(m[1]);
  });
  return [...calls];
}

export function parseGX(xml) {
  const parser = new DOMParser();
  let doc;
  try {
    doc = parser.parseFromString(xml, "text/xml");
  } catch {
    return { objects: [], tables: [] };
  }
  if (doc.querySelector("parsererror")) console.warn("GX XML parse warning");

  const objects = [],
    tables = [];
  const root = doc.documentElement;

  const TBL_LIKE = new Set(["transaction"]);

  function parseObjEl(typeEl, objType) {
    const info = typeEl.querySelector("Info");
    const name = info
      ? gxTxt(info, "Name")
      : gxTxt(typeEl, "Name") || typeEl.getAttribute("Name") || "";
    if (!name || objType === "folder") return;

    const description = info
      ? gxTxt(info, "Description")
      : gxTxt(typeEl, "Description") ||
        typeEl.getAttribute("Description") ||
        "";
    const folder = info ? gxTxt(info, "Folder") : "";
    const source = gxGetSource(typeEl);
    const rules = gxGetRules(typeEl);
    const events = gxGetEvents(typeEl);

    const variables = gxGetVars(typeEl);
    const raw =
      [source, ...events, ...rules].join("\n") || typeEl.textContent || "";

    const obj = {
      name,
      obj_type: objType,
      folder,
      description,
      raw_content: raw,
      _source: source,
      _events: events,
      _rules: rules,
      rules,
      events,
      variables,
      calls_to: gxExtractCalls(raw + rules.join(" ") + events.join(" ")),
      called_by: [],
      lines_of_code: [source, ...events, ...rules]
        .filter(Boolean)
        .join("\n")
        .split("\n")
        .filter((l) => l.trim().length > 0).length,
      lang: "gxl",
      langGroup: "gxl",
      complexity_score: 0,
      maintainability_index: 0,
      risk_score: 0,
      issues: [],
    };
    objects.push(obj);

    if (TBL_LIKE.has(objType)) {
      const attrs = [...typeEl.querySelectorAll("Attribute")]
        .map((a) => ({
          name: gxTxt(a, "Name") || a.getAttribute("Name") || "",
          data_type: gxTxt(a, "Type") || a.getAttribute("Type") || "Character",
          size:
            parseInt(gxTxt(a, "Size") || a.getAttribute("Size") || "0") || 0,
          is_key:
            (
              gxTxt(a, "IsKey") ||
              a.getAttribute("IsKey") ||
              ""
            ).toLowerCase() === "true",
          nullable:
            (
              gxTxt(a, "Nullable") ||
              a.getAttribute("Nullable") ||
              "true"
            ).toLowerCase() !== "false",
        }))
        .filter((a) => a.name);
      const indexes = [...typeEl.querySelectorAll("Index")]
        .map((ix) => ix.getAttribute("Name") || gxTxt(ix, "Name") || "")
        .filter(Boolean);
      tables.push({
        name,
        description,
        attributes: attrs,
        indexes,
        primary_key: attrs.filter((a) => a.is_key).map((a) => a.name),
      });
    }
  }

  const gxObjects =
    root.tagName === "ExportFile"
      ? [...root.children].filter((c) => c.tagName === "GXObject")
      : [...doc.querySelectorAll("GXObject")];

  if (gxObjects.length > 0) {
    gxObjects.forEach((gxObj) => {
      const typeEl = [...gxObj.children][0];
      if (!typeEl) return;
      parseObjEl(typeEl, typeEl.tagName.toLowerCase());
    });
  }

  if (objects.length === 0) {
    const OBJ_TAGS = [
      "Procedure",
      "WebPanel",
      "DataProvider",
      "WorkPanel",
      "Report",
      "WebComponent",
      "Transaction",
      "WebService",
      "ExternalObject",
    ];
    OBJ_TAGS.forEach((tag) => {
      doc.querySelectorAll(tag).forEach((el) => {
        if (el.closest("GXObject")) return;
        parseObjEl(el, tag.toLowerCase());
      });
    });
  }

  if (objects.length === 0) {
    [
      "Procedure",
      "WebPanel",
      "Transaction",
      "DataProvider",
      "WorkPanel",
    ].forEach((tag) => {
      doc.querySelectorAll(tag).forEach((el) => {
        const name = el.getAttribute("Name") || el.getAttribute("name") || "";
        if (!name) return;
        const raw = el.textContent || "";
        objects.push({
          name,
          obj_type: tag.toLowerCase(),
          folder: "",
          description: el.getAttribute("Description") || "",
          raw_content: raw,
          _source: "",
          _events: gxGetEvents(el),
          _rules: gxGetRules(el),
          rules: gxGetRules(el),
          events: gxGetEvents(el),
          variables: gxGetVars(el),
          calls_to: gxExtractCalls(raw),
          called_by: [],
          lines_of_code: raw.split("\n").filter((l) => l.trim()).length || 1,
          lang: "gxl",
          langGroup: "gxl",
          complexity_score: 0,
          maintainability_index: 0,
          risk_score: 0,
          issues: [],
        });
      });
    });
  }

  const filteredObjects = objects.filter(gxShouldListObject);
  return { objects: filteredObjects, tables };
}

function gxShouldListObject(obj) {
  const type = (obj.obj_type || "").toLowerCase();

  if (type === "structuredatatype" || type === "sdt") return false;
  if (type === "table") return false;

  if (type === "transaction") {
    const isUseful = (str) =>
      str
        .split("\n")
        .some(
          (l) =>
            l.trim() &&
            !l.trim().startsWith("//") &&
            !l.trim().startsWith("/*"),
        );

    const hasRules = (obj._rules || []).some(isUseful);
    const hasEvents = (obj._events || []).some(isUseful);
    return hasRules || hasEvents;
  }

  return true;
}

// ════════════════════════════════════════════
// 2. ENGINE GX — Regras de más práticas
// ════════════════════════════════════════════

export const GX_RULES = [
  {
    re: /for\s+each[\s\S]*?for\s+each/gi,
    id: "GX_PERF001",
    sev: "high",
    title: "FOR EACH Aninhado",
    cat: "Performance",
    desc: "Loops aninhados podem causar gargalos (N+1 queries) se não houver relação direta de chave ou índices adequados.",
    suggestion:
      "Verifique se é possível obter os dados implicitamente pela Tabela Estendida do GeneXus, ou garanta que os atributos da cláusula Where interna estejam indexados.",
  },
  {
    re: /commit[\s\S]{0,300}commit/gi,
    id: "GX_PERF003",
    sev: "critical",
    title: "COMMIT dentro de Loop",
    cat: "Performance",
    desc: "A instrução Commit() dentro de um laço de repetição reabre a transação a cada iteração, multiplicando drasticamente o tempo de I/O no banco de dados.",
    suggestion:
      "Mova o comando Commit() para fora do For Each / Do While, executando-o apenas ao final do processamento em lote.",
  },
  {
    re: /for\s+each(?![\s\S]*?\border\b[\s\S]{0,200}endfor)/gi,
    id: "GX_PERF004",
    sev: "warning",
    title: "FOR EACH sem cláusula Order",
    cat: "Performance",
    desc: "Sem a cláusula Order explícita, o otimizador do banco de dados decidirá a ordem de retorno, o que pode gerar inconsistências em relatórios ou em paginações.",
    suggestion:
      "Defina a cláusula Order utilizando atributos que componham índices na tabela base navegada.",
  },
  {
    re: /\bwhere\s+&\w+/gi,
    id: "GX_SEC001",
    sev: "critical",
    title: "SQL Injection via Macro Substitution",
    cat: "Segurança",
    desc: "O uso de variáveis dinâmicas inteiras na cláusula Where (Macro Substitution) desabilita a parametrização nativa do GeneXus, permitindo injeção de SQL.",
    suggestion:
      "Evite macro substitution em Where. Prefira condições explícitas (ex: Where Atributo = &Variavel) que utilizam prepared statements com segurança.",
  },
  {
    re: /\.caption\s*=\s*&\w+/gi,
    id: "GX_SEC002",
    sev: "high",
    title: "Possível XSS em TextBlock",
    cat: "Segurança",
    desc: "A atribuição de variáveis diretamente a um Caption de TextBlock (caso a propriedade Format seja HTML) pode permitir Cross-Site Scripting (XSS).",
    suggestion:
      "Garanta que a propriedade Format do controle seja 'Text' ou envolva a variável com a função HTMLEncode(&Var) se precisar renderizar HTML seguro.",
  },
  {
    re: /&\w*password\w*\s*=\s*["'][^"']+["']/gi,
    id: "GX_SEC003",
    sev: "high",
    title: "Credencial Hardcoded",
    cat: "Segurança",
    desc: "Atribuição de senha fixa diretamente no código-fonte. Risco grave de exposição em repositórios, exports (.xpz) e logs.",
    suggestion:
      "Mova credenciais para uma tabela de configuração criptografada no banco ou parâmetros dinâmicos de inicialização.",
  },
  {
    re: /\bnowait\b/gi,
    id: "GX_PAD0001",
    sev: "warning",
    title: "Uso de NoWait",
    cat: "Concorrência",
    desc: "O uso do modificador NoWait em mensagens não bloqueia a tela, fazendo com que alertas críticos sejam ignorados ou desapareçam rapidamente da UI.",
    suggestion:
      "Em alertas essenciais, remova o 'nowait' para garantir que o usuário leia e confirme a mensagem antes do código prosseguir.",
  },
  {
    re: /submit\s*\(/gi,
    id: "GX_CONC002",
    sev: "warning",
    title: "Execução Assíncrona via Submit",
    cat: "Concorrência",
    desc: "O comando Submit envia a execução para background. O chamador não aguarda a conclusão e não há garantia de estado ao avançar o código.",
    suggestion:
      "Se a lógica subsequente depende do resultado processado, altere para uma instrução Call() tradicional.",
  },
];

// ════════════════════════════════════════════
// 3. ENGINE GX — Métricas e análise de objetos
// ════════════════════════════════════════════

export function computeGXMetrics(obj) {
  const content = obj.raw_content || "";

  const ccKw = [
    "\\bif\\b",
    "\\bfor\\s+each\\b",
    "\\bdo\\s+while\\b",
    "\\bdo\\s+case\\b",
    "\\bwhen\\b",
    "\\band\\b",
    "\\bor\\b",
    "\\bcatch\\b",
  ];
  let cc = 1;
  ccKw.forEach((p) => {
    cc += (content.match(new RegExp(p, "gi")) || []).length;
  });
  obj.complexity_score = Math.min(cc, 100);

  const loc = Math.max(obj.lines_of_code, 1);
  const ops = (content.match(/[+\-*/=<>!&|]/g) || []).length;
  const operands = (content.match(/\b\w+\b/g) || []).length;
  const hv = Math.max(
    (ops + operands) * Math.log2(Math.max(ops + operands, 2)),
    1,
  );
  const mi = 171 - 5.2 * Math.log(hv) - 0.23 * cc - 16.2 * Math.log(loc);
  obj.maintainability_index =
    Math.round(Math.max(0, Math.min(100, (mi / 171) * 100)) * 10) / 10;

  obj.issues = [];
  const seen = new Set();

  const sections = [];
  let lineOffset = 0;
  if (obj._source) {
    const sl = (obj._source || "").split("\n");
    sections.push({ name: "Source", lines: sl, offset: lineOffset });
    lineOffset += sl.length;
  }
  (obj._events || []).forEach((ev) => {
    const el = ev.split("\n");
    sections.push({ name: "Events", lines: el, offset: lineOffset });
    lineOffset += el.length;
  });
  (obj._rules || []).forEach((r) => {
    const rl = r.split("\n");
    sections.push({ name: "Rules", lines: rl, offset: lineOffset });
    lineOffset += rl.length;
  });

GX_RULES.forEach((bp) => {
  const flags = (bp.re.flags || "").replace(/g/g, "") + "g";
  const re = new RegExp(bp.re.source, flags);
  const snippets = [];
  let m;

  while ((m = re.exec(content)) !== null) {
    const before = content.slice(0, m.index);
    const globalLine = before.split("\n").length - 1;
    let sectionName = "Código",
      localLine = globalLine;

    for (const sec of sections) {
      if (
        globalLine >= sec.offset &&
        globalLine < sec.offset + sec.lines.length
      ) {
        sectionName = sec.name;
        localLine = globalLine - sec.offset;
        break;
      }
    }

    const lineNum = localLine + 1;
    const dk = bp.id + "|" + sectionName + "|" + lineNum;
    if (seen.has(dk)) continue;
    seen.add(dk);

    const secLines =
      sections.find((s) => s.name === sectionName)?.lines ||
      content.split("\n");
    const ctxStart = Math.max(0, localLine - 2);
    const ctxEnd = Math.min(secLines.length - 1, localLine + 2);

    snippets.push({
      lineNum,
      sectionName,
      lines: secLines.slice(ctxStart, ctxEnd + 1).map((t, i) => ({
        n: ctxStart + i + 1,
        txt: t,
        hit: ctxStart + i + 1 === lineNum,
      })),
    });
    if (snippets.length >= 3) break;
  }

  if (snippets.length > 0) {
    obj.issues.push({
      id: bp.id,
      type: "gx_rule",
      severity: bp.sev,
      title: bp.title,
      description: bp.desc,
      suggestion: bp.suggestion,
      category: bp.cat,
      occurrences: snippets.length,
      object_name: obj.name,
      object_type: obj.obj_type,
      file: obj.name + "(" + obj.obj_type + ")",
      lang: "gxl",
      snippets,
    });
  }
});

  if (obj.lines_of_code > 500 && obj.obj_type != "structuredatatype")
    obj.issues.push({
      id: "ARCH001",
      type: "gx_rule",
      severity: "high",
      title: "God Object",
      object_name: obj.name,
      object_type: obj.obj_type,
      snippets: [],
      description: `${obj.lines_of_code} linhas — excede 500 recomendado.`,
      suggestion: "Decomponha em procedures menores.",
      category: "Arquitetura",
      file: obj.name + "(" + obj.obj_type + ")",
      lang: "gxl",
    });

  if (obj.complexity_score > 20)
    obj.issues.push({
      id: "ARCH002",
      type: "gx_rule",
      severity: "high",
      title: "Alta Complexidade Ciclomática",
      object_name: obj.name,
      object_type: obj.obj_type,
      snippets: [],
      description: `CC=${obj.complexity_score} excede limite de 20.`,
      suggestion: "Aplique Extract Procedure.",
      category: "Arquitetura",
      file: obj.name + "(" + obj.obj_type + ")",
      lang: "gxl",
    });

  if (
    !obj.rules.join("").trim() &&
    !obj.events.join("").trim() &&
    !obj._source &&
    obj.obj_type != "table"
  )
    obj.issues.push({
      id: "ARCH003",
      type: "gx_rule",
      severity: "low",
      title: "Possível código morto",
      object_name: obj.name,
      object_type: obj.obj_type,
      snippets: [],
      description: "Objeto sem rules, events ou source.",
      suggestion: "Verifique se o objeto está referenciado. Se não, remova.",
      category: "Arquitetura",
      file: obj.name + "(" + obj.obj_type + ")",
      lang: "gxl",
    });

  let risk = 0;
  risk += Math.min(obj.complexity_score / 10, 3);
  risk += Math.min(obj.calls_to.length * 0.3, 2);
  risk += Math.min(obj.issues.length * 0.3, 2);
  if (obj.lines_of_code > 500) risk += 1;
  obj.risk_score = Math.round(Math.min(risk, 10) * 10) / 10;

  return obj;
}

export function buildGXDepMap(objects) {
  const map = {},
    byName = {};
  objects.forEach((o) => {
    byName[o.name.toLowerCase()] = o;
  });
  objects.forEach((o) => {
    o.calls_to.forEach((c) => {
      const t = byName[c.toLowerCase()];
      if (t && !t.called_by.includes(o.name)) t.called_by.push(o.name);
    });
  });
  objects.forEach((o) => {
    map[o.name] = {
      calls: o.calls_to,
      called_by: o.called_by,
      coupling: o.calls_to.length + o.called_by.length,
      is_hub: o.calls_to.length + o.called_by.length > 8,
      is_leaf: o.calls_to.length === 0,
    };
  });
  return map;
}

export function analyzeGXDB(tables) {
  const issues = [];
  let score = 100;
  tables.forEach((t) => {
    if (!t.primary_key.length) {
      issues.push({
        table: t.name,
        issue: "Sem chave primária definida",
        severity: "critical",
      });
      score -= 5;
    }
    if (t.attributes.length > 50) {
      issues.push({
        table: t.name,
        issue: `${t.attributes.length} atributos — verificar normalização`,
        severity: "medium",
      });
      score -= 2;
    }
    if (t.attributes.length > 8 && !t.indexes.length) {
      issues.push({
        table: t.name,
        issue: "Sem índices definidos",
        severity: "medium",
      });
      score -= 2;
    }
  });
  return {
    tables,
    issues,
    normalization_score: Math.max(0, score),
    tables_without_pk: tables.filter((t) => !t.primary_key.length).length,
    tables_without_indexes: tables.filter((t) => !t.indexes.length).length,
  };
}

// ════════════════════════════════════════════
// 4. ENGINE GX — Geração do relatório e CI/CD
// ════════════════════════════════════════════

export function generateGXReport(objects, tables, depMap, db, projectName) {
  const listedObjects = objects;
  const allIssues = listedObjects.flatMap((o) => o.issues);

  const m = {
    total_files: listedObjects.length,
    total_objects: listedObjects.length,
    total_loc: listedObjects.reduce((s, o) => s + o.lines_of_code, 0),
    avg_complexity: listedObjects.length
      ? Math.round(
          listedObjects.reduce((s, o) => s + o.complexity_score, 0) /
            listedObjects.length,
        )
      : 0,
    avg_maintainability: listedObjects.length
      ? Math.round(
          listedObjects.reduce((s, o) => s + o.maintainability_index, 0) /
            listedObjects.length,
        )
      : 0,
    total_issues: allIssues.length,
    critical_issues: allIssues.filter((i) => i.severity === "critical").length,
    high_issues: allIssues.filter((i) => i.severity === "high").length,
    medium_issues: allIssues.filter((i) =>
      ["medium", "warning"].includes(i.severity),
    ).length,
    low_issues: allIssues.filter((i) => ["low", "info"].includes(i.severity))
      .length,
    security_issues: allIssues.filter((i) => i.category === "Segurança").length,
    high_risk_files: listedObjects.filter((o) => o.risk_score >= 7).length,
    hub_objects: listedObjects.filter((o) => (depMap[o.name] || {}).is_hub)
      .length,
    db_score: db.normalization_score,
    isGXL: true,
    total_tables: tables.length,
  };

  const THRESHOLDS = { min_score: 60, max_critical: 0, max_high_risk: 2 };

  const s = {
    complexity: Math.max(0, 100 - (m.avg_complexity - 1) * 4),
    maintainability: m.avg_maintainability,
    issues: Math.max(
      0,
      100 - (m.total_issues / Math.max(m.total_objects, 1)) * 15,
    ),
    coupling: Math.max(0, 100 - m.hub_objects * 10),
    database: db.normalization_score,
  };

  const score =
    Math.round(
      Math.min(
        100,
        Math.max(
          0,
          s.complexity * 0.25 +
            s.maintainability * 0.25 +
            s.issues * 0.2 +
            s.coupling * 0.15 +
            s.database * 0.15,
        ),
      ) * 10,
    ) / 10;

  const gatePassed =
    score >= THRESHOLDS.min_score &&
    m.critical_issues <= THRESHOLDS.max_critical &&
    m.high_risk_files <= THRESHOLDS.max_high_risk;

  const problematic = listedObjects
    .map((o) => ({
      ...o,
      composite:
        o.risk_score * 3 +
        o.complexity_score * 0.5 +
        o.issues.length * 2 +
        (100 - o.maintainability_index) * 0.1,
    }))
    .sort((a, b) => b.composite - a.composite)
    .slice(0, 10);

  const cicd = {
    schema_version: "2.0",
    tool: "CodeInsight-GXL",
    timestamp: new Date().toISOString(),
    project: projectName,
    quality_gate: {
      passed: gatePassed,
      overall_score: score,
      thresholds: THRESHOLDS,
      actual: {
        score,
        critical: m.critical_issues,
        high_risk: m.high_risk_files,
      },
    },
    metrics: m,
    issues: allIssues.map((i) => ({
      id: i.id,
      target: i.file,
      severity: i.severity,
      category: i.category,
      title: i.title,
    })),
    top_risks: listedObjects
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 5)
      .map((o) => ({ target: o.name, type: o.obj_type, risk: o.risk_score })),
  };

  return {
    projectName,
    score,
    metrics: m,
    files: listedObjects,
    objects: listedObjects,
    tables,
    depMap,
    db,
    allIssues,
    problematic,
    cicd,
    isGXL: true,
    archViolations: buildGXArchViolations(listedObjects, allIssues),
  };
}

function buildGXArchViolations(objects, allIssues) {
  return [
    {
      rule: "Web Panels não acessam banco via For Each diretamente",
      violated: objects.some(
        (o) => o.obj_type === "webpanel" && /for\s+each/i.test(o.raw_content),
      ),
      files: objects
        .filter(
          (o) => o.obj_type === "webpanel" && /for\s+each/i.test(o.raw_content),
        )
        .map((o) => o.name),
    },
    {
      rule: "Nenhuma credencial hardcoded no código",
      violated: allIssues.some((i) => i.id === "SEC003"),
      files: [
        ...new Set(
          allIssues.filter((i) => i.id === "SEC003").map((i) => i.object_name),
        ),
      ],
    },
    {
      rule: "Complexidade ciclomática ≤ 20 por objeto",
      violated: objects.some((o) => o.complexity_score > 20),
      files: objects.filter((o) => o.complexity_score > 20).map((o) => o.name),
    },
    {
      rule: "Sem COMMIT dentro de loops",
      violated: allIssues.some((i) => i.id === "PERF003"),
      files: [
        ...new Set(
          allIssues.filter((i) => i.id === "PERF003").map((i) => i.object_name),
        ),
      ],
    },
  ];
}
