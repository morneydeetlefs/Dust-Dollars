// ================= LEADERBOARD =================
function calcNetWorth(cash, inventory, location) {
  let inv = 0;
  for (const g in inventory)
    inv += (getPrice(g, location) || 0) * (inventory[g] || 0);
  return cash + inv;
}

function showLeaderboard() {
  const rows = [];
  const playerInvVal = calcNetWorth(game.cash, game.inventory, game.location) - game.cash;
  rows.push({ name: "You", cash: game.cash, invVal: playerInvVal, trades: game.stats.tradesMade, isPlayer: true });
  traders.forEach(function(t) {
    const invVal = calcNetWorth(t.cash, t.inventory, t.location) - t.cash;
    rows.push({ name: t.name, cash: t.cash, invVal: invVal, trades: t.stats.tradesMade, isPlayer: false });
  });
  rows.sort(function(a, b) { return (b.cash + b.invVal) - (a.cash + a.invVal); });

  const medals = ["🥇", "🥈", "🥉"];
  let html = "<b>🏆 Final Standings — Day " + game.day + "</b>";
  rows.forEach(function(r, i) {
    const style = r.isPlayer ? "color:#6a5cff;" : "";
    html += "<div class='item' style='" + style + "'>" +
      (medals[i] || (i + 1 + ".")) + " <b>" + r.name + "</b><br>" +
      "Cash: $" + r.cash + " | Goods: $" + r.invVal + "<br>" +
      "<b>Total: $" + (r.cash + r.invVal) + "</b> &nbsp;|&nbsp; Trades: " + r.trades +
      "</div>";
  });
  html += "<button class='confirm' onclick='resetGame()'>New Game</button>";
  showModal(html);
}

// ================= RESET =================
function resetGame() {
  game.day = 1;
  game.cash = 200;
  game.inventory = { whiskey: 5 };
  game.location = towns["Abilene"] ? "Abilene" : Object.keys(towns)[0];
  game.activityLog = [];
  game.stats = { tradesMade: 0, totalEarned: 0 };
  game.eventsEnabled = true;
  game.eventChances = { danger: 0.25, good: 0.25 };
  game.capacity = 20;
  game.zoom = 1;
  game.offsetX = 0;
  game.offsetY = 0;

  settings = {
    stabilisationRate: 0.05,
    aiEnabled: true,
    riskAversionFactor: 10,
  };

  turnState = {
    phase: "player",
    roundNumber: 1,
    roundOrder: [],
    playerIndex: 0,
  };

  traders.forEach(function(t) {
    t.cash = t.startingCash || 150;
    t.inventory = {};
    t.state = "idle";
    t.travelDaysRemaining = 0;
    t.travelDestination = null;
    t.stats = { totalEarned: 0, tradesMade: 0, eventsTriggered: 0 };
  });

  mapEditor = { mode: null, selected: null, draggedTown: null };

  closeModal();
  addLog("🌵 New game started – all values reset", "system");
  render();
  renderMap();
  startRound();
}
