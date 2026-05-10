// ================= TURN SYSTEM =================
function buildRoundOrder() {
  const participants = ["player"].concat(
    traders.filter(function(t) { return t.state !== "broke"; }).map(function(t) { return t.id; })
  );
  for (let i = participants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = participants[i]; participants[i] = participants[j]; participants[j] = tmp;
  }
  turnState.roundOrder = participants;
  turnState.playerIndex = participants.indexOf("player");
}

function startRound() {
  if (settings.aiEnabled) {
    buildRoundOrder();
  } else {
    turnState.roundOrder = ["player"];
    turnState.playerIndex = 0;
  }

  addLog("─── Round " + turnState.roundNumber + " ───", "system");

  if (settings.aiEnabled) {
    for (let i = 0; i < turnState.playerIndex; i++) {
      const tid = turnState.roundOrder[i];
      const trader = traders.find(function(t) { return t.id === tid; });
      if (trader) runAITurn(trader);
    }
  }

  turnState.phase = "player";
  setButtonsEnabled(true);
  updateTurnUI();
  render();
}

function endTurn() {
  if (turnState.phase === "ended") return;
  setButtonsEnabled(false);

  if (settings.aiEnabled) {
    for (let i = turnState.playerIndex + 1; i < turnState.roundOrder.length; i++) {
      const tid = turnState.roundOrder[i];
      const trader = traders.find(function(t) { return t.id === tid; });
      if (trader) runAITurn(trader);
    }
  }

  processTravellingTraders();
  runPriceStabilisation();
  updateMarket();

  game.day++;
  turnState.roundNumber++;

  if (game.day > game.maxDays) {
    turnState.phase = "ended";
    render();
    showLeaderboard();
    return;
  }

  startRound();
}

function setButtonsEnabled(enabled) {
  const ids = ["btn-buy", "btn-sell", "btn-travel", "btn-market", "btn-endturn"];
  ids.forEach(function(id) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  });
  const edBtn = document.getElementById("btn-editor");
  if (edBtn) edBtn.disabled = false;
}

function updateTurnUI() {
  const indicator = document.getElementById("turn-indicator");
  const dayCounter = document.getElementById("day-counter");
  if (indicator) {
    indicator.textContent = turnState.phase === "player" ? "👤 Your Turn" : "⏳ Processing...";
  }
  if (dayCounter) {
    dayCounter.textContent = "Day " + game.day + "/" + game.maxDays;
  }
}
