// ================= TRAVEL =================
function openTravel() {
  const routes = towns[game.location].routes;
  let html = "<b>Travel</b>";
  for (const t in routes) {
    const r = routes[t];
    let info = "";
    if (r.hazard > 0) info = " <span style='color:#f66'>(Dangerous)</span>";
    if (r.reward > 0) info = " <span style='color:#6f6'>(Prosperous)</span>";
    html += "<div class='item' onclick=\"openTravelTo('" + t + "')\">" + t + " (" + r.dist + " days)" + info + "</div>";
  }
  html += "<button onclick='closeModal()'>Cancel</button>";
  showModal(html);
}

function openTravelTo(target) {
  const routes = towns[game.location].routes;
  if (!routes[target]) return;
  const dist = routes[target].dist;
  if (game.day + dist > game.maxDays) {
    showModal("<b>Too far!</b><div>Only " + (game.maxDays - game.day) + " days remaining.</div><button onclick='closeModal()'>Back</button>");
    return;
  }
  showModal(
    "<b>Travel to " + target + "</b>" +
    "<div>Distance: " + dist + " days</div>" +
    "<div style='color:#aaa;font-size:12px'>Travel advances the day counter.</div>" +
    "<button class='confirm' id='departBtn'>Depart</button>" +
    "<button onclick='closeModal()'>Cancel</button>"
  );
  // Prevent double-click
  document.getElementById("departBtn")?.addEventListener("click", function() {
    confirmTravel(target, dist);
  }, { once: true });
}

function confirmTravel(target, dist) {
  closeModal();

  const route = towns[game.location].routes[target];
  const origin = game.location;

  setButtonsEnabled(false);
  addLog("🚂 You depart from " + origin + " to " + target + " (" + dist + " days)", "system");

  for (let day = 1; day <= dist; day++) {
    if (day === dist) {
      game.location = target;
    }

    if (game.eventsEnabled) {
      playerRandomEvent(route);
    }

    game.day++;

    if (settings.aiEnabled) {
      const activeTraders = traders.filter(t => t.state !== "broke");
      for (const trader of activeTraders) {
        if (trader.state !== "travelling") {
          runAITurn(trader);
        }
      }
      processTravellingTraders();
    }

    if (game.day > game.maxDays) {
      addLog("🏁 Time's up! Game over.", "system");
      showLeaderboard();
      return;
    }
  }

  setButtonsEnabled(true);
  render();
  addLog("👤 You arrived in " + target + " after " + dist + " days", "trade");
}
