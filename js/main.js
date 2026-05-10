// ================= STARTUP =================

async function loadWorld() {
  let data = null;
  try {
    const res = await fetch("world.json");
    if (!res.ok) throw new Error("No world.json");
    data = await res.json();
  } catch (e) {
    validateWorld();
    normaliseAllGoods();
    addLog("🌵 No world.json found — using defaults", "system");
    render();
    startRound();
    return;
  }

  // File loaded — resume game without re-running AI turns
  applySaveData(data);
  addLog("📂 Loaded world.json", "system");
  setButtonsEnabled(true);
  updateTurnUI();
}

loadWorld();
