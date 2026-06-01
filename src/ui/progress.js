export function showProgress() {
  const hero = document.getElementById("heroSection");
  if (hero) hero.style.display = "none";

  const analysisResult = document.getElementById("analysisResult");
  if (analysisResult) analysisResult.style.display = "none";

  const progressOverlay = document.getElementById("progressOverlay");
  if (progressOverlay) progressOverlay.style.display = "flex";
}

export function setProgress(pct, stepIdx) {
  const bar = document.getElementById("pbar");
  if (bar) bar.style.width = pct + "%";

  for (let i = 0; i <= 6; i++) {
    const el = document.getElementById("ps" + i);
    if (!el) continue;
    el.className =
      "ps" + (i < stepIdx ? " done" : i === stepIdx ? " active" : "");
  }
}

export function hideProgress() {
  const progressOverlay = document.getElementById("progressOverlay");
  if (progressOverlay) progressOverlay.style.display = "none";
}
