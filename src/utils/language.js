export function detectLang(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    js: "js",
    jsx: "js",
    mjs: "js",
    cjs: "js",
    ts: "ts",
    tsx: "ts",
    py: "py",
    pyw: "py",
    java: "java",
    go: "go",
    cs: "cs",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    c: "c",
    php: "php",
    rb: "rb",
    rs: "rs",
    vue: "js",
    svelte: "js",
  };
  return map[ext] || "unknown";
}
export function langLabel(lang) {
  const m = {
    js: "JavaScript",
    ts: "TypeScript",
    py: "Python",
    java: "Java",
    go: "Go",
    cs: "C#",
    cpp: "C++",
    c: "C",
    php: "PHP",
    rb: "Ruby",
    rs: "Rust",
    unknown: "Unknown",
  };
  return m[lang] || lang;
}
