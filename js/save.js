// ================= IMPORT / EXPORT =================

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createSaveData() {
  const gameData = deepClone(game);
  gameData.activityLog = []; // strip runtime log
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    game: gameData,
    towns: deepClone(towns),
    traders: deepClone(traders),
    settings: deepClone(settings),
    turnState: deepClone(turnState),
  };
}

function validateWorld() {
  // ---------- GAME ----------
  if (!game.inventory) game.inventory = {};
  if (!game.stats) game.stats = { tradesMade: 0, totalEarned: 0 };
  if (!Array.isArray(game.activityLog)) game.activityLog = [];
  if (!towns[game.location]) game.location = Object.keys(towns)[0];

  // ---------- SETTINGS ----------
  if (settings.aiEnabled === undefined) settings.aiEnabled = true;
  if (settings.stabilisationRate === undefined) settings.stabilisationRate = 0.05;
  if (settings.riskAversionFactor === undefined) settings.riskAversionFactor = 10;

  // ---------- TURN STATE ----------
  if (!turnState) {
    turnState = { phase: "player", roundNumber: 1, roundOrder: [], playerIndex: 0 };
  }

  // ---------- TOWNS ----------
  for (const townName in towns) {
    const town = towns[townName];
    if (!town.goods) town.goods = {};
    if (!town.routes) town.routes = {};

    // remove invalid routes
    for (const route in town.routes) {
      if (!towns[route]) delete town.routes[route];
    }

    // normalise goods
    for (const good in town.goods) normaliseGood(town.goods[good]);

    // normalise routes
    for (const target in town.routes) {
      if (typeof town.routes[target] === "number") {
        town.routes[target] = { dist: town.routes[target], hazard: 0, reward: 0 };
      }
      if (!town.routes[target].hazard) town.routes[target].hazard = 0;
      if (!town.routes[target].reward) town.routes[target].reward = 0;
    }
  }

  // ---------- TRADERS ----------
  traders.forEach(function(trader, index) {
    if (!trader.id)   trader.id   = "trader_" + index;
    if (!trader.name) trader.name = "Trader";
    if (trader.cash === undefined) trader.cash = 100;
    if (trader.startingCash === undefined) trader.startingCash = trader.cash;
    if (!trader.inventory) trader.inventory = {};
    if (!trader.stats) trader.stats = { totalEarned: 0, tradesMade: 0, eventsTriggered: 0 };
    if (!trader.personality) trader.personality = { preferredGoods: [], preferredTowns: [], aggression: 0.5, riskTolerance: 0.5 };
    if (!trader.purchaseRecords) trader.purchaseRecords = {};

    // invalid town fallback
    if (!towns[trader.location]) trader.location = Object.keys(towns)[0];

    // invalid travelling state fix
    if (trader.state === "travelling" && (!trader.travelDestination || !towns[trader.travelDestination])) {
      trader.state = "idle";
      trader.travelDestination = null;
      trader.travelDaysRemaining = 0;
    }

    if (!["idle", "travelling", "broke"].includes(trader.state)) trader.state = "idle";

    // clean purchase records
    for (const good in trader.purchaseRecords) {
      if (!trader.inventory[good] || trader.inventory[good] <= 0) {
        delete trader.purchaseRecords[good];
      }
    }
  });

  // ---------- CLEAN PLAYER INVENTORY ----------
  for (const good in game.inventory) {
    const existsSomewhere = Object.values(towns).some(t => t.goods[good]);
    if (!existsSomewhere) delete game.inventory[good];
  }

  // ---------- CLEAN TRADER INVENTORIES ----------
  traders.forEach(function(trader) {
    for (const good in trader.inventory) {
      const existsSomewhere = Object.values(towns).some(t => t.goods[good]);
      if (!existsSomewhere) delete trader.inventory[good];
    }
  });
}

function applySaveData(data) {
  if (!data || typeof data !== "object") throw new Error("Invalid save data");

  Object.keys(game).forEach(k => delete game[k]);
  Object.assign(game, deepClone(data.game || {}));

  Object.keys(settings).forEach(k => delete settings[k]);
  Object.assign(settings, deepClone(data.settings || {}));

  Object.keys(turnState).forEach(k => delete turnState[k]);
  Object.assign(turnState, deepClone(data.turnState || {}));

  Object.keys(towns).forEach(k => delete towns[k]);
  Object.entries(data.towns || {}).forEach(([k, v]) => { towns[k] = deepClone(v); });

  traders.length = 0;
  (data.traders || []).forEach(t => traders.push(deepClone(t)));

  validateWorld();
  normaliseAllGoods();
  render();
  renderMap();
  renderActivityLog();
  updateTurnUI();
}

function exportWorld() {
  try {
    const saveData = createSaveData();
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "world.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    addLog("💾 World exported successfully", "system");
  } catch (err) {
    console.error(err);
    alert("Export failed.");
  }
}

function importWorld() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        applySaveData(data);
        resetGame();
        addLog("📂 World imported successfully", "system");
      } catch (err) {
        console.error(err);
        alert("Invalid or corrupted save file.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
