import { escHtml } from "./helpers.js";

const HIGHLIGHT_RULES = {
  js: {
    keywords:
      /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|import|export|default|from|async|await|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|this|super|of|in)\b/g,
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(\d+\.?\d*)\b/g,
    funcs: /\b(\w+)\s*(?=\()/g,
  },
  py: {
    keywords:
      /\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|try|except|finally|raise|with|pass|break|continue|lambda|None|True|False|self|yield|async|await|global|nonlocal)\b/g,
    strings:
      /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
    comments: /(#[^\n]*)/g,
    numbers: /\b(\d+\.?\d*)\b/g,
    funcs: /\b(\w+)\s*(?=\()/g,
  },
  java: {
    keywords:
      /\b(public|private|protected|class|interface|extends|implements|return|if|else|for|while|do|switch|case|break|continue|new|import|package|static|final|void|int|long|double|float|boolean|String|null|true|false|try|catch|finally|throw|throws)\b/g,
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(\d+\.?\d*)\b/g,
    funcs: /\b(\w+)\s*(?=\()/g,
  },
  gxl: {
    keywords:
      /\b(if|else|endif|for|each|endfor|do|while|when|case|endcase|call|return|exit|commit|rollback|new|delete|defined|not|and|or|msg|error|parm|using|order|where|as|do|while|until|enddo|in|procedure|webpanel|transaction|dataprovider|sub|endsub|event|endevent|rules|source)\b/gi,
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(\d+\.?\d*)\b/g,
    funcs: /\b(\w+)\s*(?=\()/g,
    attribs: /&amp;(\w+)/g,
  },
};
HIGHLIGHT_RULES.ts = HIGHLIGHT_RULES.js;

export function syntaxHighlight(line, lang) {
  const rules = HIGHLIGHT_RULES[lang] || HIGHLIGHT_RULES.js;
  const placeholders = [];
  let safe = escHtml(line);

  // Gera um prefixo único e imprevisível para cada execução
  // Usa a API nativa de Crypto se disponível, ou fallback seguro
  const secretPrefix =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);

  function stash(html) {
    const k = `\x00_${secretPrefix}_${placeholders.length}_\x00`;
    placeholders.push(html);
    return k;
  }

  if (rules.comments) {
    safe = safe.replace(new RegExp(rules.comments.source, "g"), (m) =>
      stash(`<span class="sh-comment">${m}</span>`),
    );
  }
  if (rules.strings) {
    safe = safe.replace(new RegExp(rules.strings.source, "g"), (m) =>
      stash(`<span class="sh-string">${m}</span>`),
    );
  }
  if (rules.numbers) {
    safe = safe.replace(new RegExp(rules.numbers.source, "g"), (m) =>
      stash(`<span class="sh-number">${m}</span>`),
    );
  }
  if (rules.keywords) {
    safe = safe.replace(
      new RegExp(rules.keywords.source, rules.keywords.flags || "g"),
      (m) => stash(`<span class="sh-keyword">${m}</span>`),
    );
  }
  if (rules.funcs) {
    safe = safe.replace(new RegExp(rules.funcs.source, "g"), (m, fn) =>
      /^(if|for|while|switch|catch|return|class|new|import|const|let|var|def|elif|else|and|or|not|endif|endfor|when|each|call|commit|rollback|do|until|enddo|msg|error|parm|using|where|order|sub|endsub|event|endevent|rules|source|null|true|false|None|True|False|self|super|this|typeof|instanceof|in|of|from|as|async|await|yield|pass|break|continue|raise|with|global|nonlocal|throw|throws|public|private|protected|static|final|void|int|long|double|float|boolean|String|package|interface|extends|implements|new|delete|defined|through|webpanel|transaction|dataprovider|procedure)$/.test(
        fn,
      )
        ? stash(`<span class="sh-keyword">${m}</span>`)
        : stash(`<span class="sh-func">${m}</span>`),
    );
  }
  if (rules.attribs) {
    safe = safe.replace(new RegExp(rules.attribs.source, "g"), (m, varName) =>
      stash(
        `<span class="sh-attrib">&${varName != null ? varName : m.replace(/^&amp;/, "")}</span>`,
      ),
    );
  }

  // Devolve as strings html seguras para os lugares corretos
  placeholders.forEach((val, i) => {
    safe = safe.replace(`\x00_${secretPrefix}_${i}_\x00`, val);
  });

  return safe;
}

export function highlightCode(code, hlLines, cls) {
  return code
    .split("\n")
    .map((line) => {
      const isHl = hlLines?.some((h) =>
        line.includes(h.replace(/[←→].*/, "").trim()),
      );
      return isHl
        ? `<span class="code-hl-${cls}">${escHtml(line)}</span>`
        : escHtml(line);
    })
    .join("\n");
}

export function preprocessBlockComments(code) {
  const result = [];
  let inBlock = false;
  const lines = code.split("\n");

  for (const line of lines) {
    if (inBlock) {
      if (line.includes("*/")) inBlock = false;
      result.push(line);
    } else {
      const openIdx = line.indexOf("/*");
      if (openIdx !== -1 && !line.includes("*/", openIdx + 2)) {
        inBlock = true;
      }
      result.push(line);
    }
  }
  return result;
}
