// ════════════════════════════════════════════
// 14. TEMA CLARO / ESCURO
// ════════════════════════════════════════════

export function toggleTheme() {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
}

export function updateThemeIcon(theme) {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  if (theme === "dark") {
    // Ícone de Sol (indica que clicar vai mudar para o modo claro)
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
      <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>`;
  } else {
    // Ícone de Lua (indica que clicar vai mudar para o modo escuro)
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>`;
  }
}

window.toggleTheme = toggleTheme;