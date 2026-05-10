// ================= PLAYER EVENTS =================
function playerRandomEvent(routeData) {
  const roll = Math.random();
  let d = game.eventChances.danger;
  let gd = game.eventChances.good;

  if (routeData) {
    d = Math.min(1, d + (routeData.hazard || 0));
    gd = Math.min(1, gd + (routeData.reward || 0));
  }

  if (roll < d) {
    if (routeData && routeData.payloads && routeData.payloads.hazard && routeData.payloads.hazard.length > 0) {
      processSpecificEvent(routeData.payloads.hazard, "hazard");
    } else {
      playerDangerEvent();
    }
  } else if (roll < d + gd) {
    if (routeData && routeData.payloads && routeData.payloads.reward && routeData.payloads.reward.length > 0) {
      processSpecificEvent(routeData.payloads.reward, "reward");
    } else {
      playerGoodEvent();
    }
  }

  if (turnState.phase === "ended") return;
  setButtonsEnabled(false);
}

function processSpecificEvent(payloads, type) {
  let report = type === "hazard" ? "⚠️ Route Hazard! " : "✨ Route Reward! ";

  payloads.forEach(p => {
    if (p.good === "cash") {
      if (type === "hazard") {
        const loss = Math.floor(game.cash * p.val);
        game.cash -= loss;
        report += "Lost $" + loss + ". ";
      } else {
        game.cash += p.val;
        report += "Gained $" + p.val + ". ";
      }
    } else {
      const g = p.good;
      if (type === "hazard") {
        if (game.inventory[g]) {
          const loss = Math.ceil(game.inventory[g] * p.val);
          game.inventory[g] -= loss;
          if (game.inventory[g] <= 0) delete game.inventory[g];
          report += "Lost " + loss + " " + g + ". ";
        }
      } else {
        const space = game.capacity - currentInventory();
        const gain = Math.min(p.val, space);
        if (gain > 0) {
          game.inventory[g] = (game.inventory[g] || 0) + gain;
          report += "Gained " + gain + " " + g + (gain < p.val ? " (no more room)" : "") + ". ";
        } else {
          report += "Found " + g + " but had no room. ";
        }
      }
    }
  });

  addLog(report, type === "hazard" ? "danger" : "good");
  alert(report);
  render();
}

function playerDangerEvent() {
  if (Math.random() < 0.5) {
    const loss = Math.floor(game.cash * 0.2);
    game.cash -= loss;
    addLog("⚔️ Bandits! You lost $" + loss, "danger");
    alert("⚔️ Bandits attacked! Lost $" + loss);
  } else {
    const goods = Object.keys(game.inventory).filter(function(g) { return game.inventory[g] > 0; });
    if (goods.length) {
      const g = goods[Math.floor(Math.random() * goods.length)];
      const lost = Math.ceil(game.inventory[g] * 0.5);
      game.inventory[g] -= lost;
      if (game.inventory[g] <= 0) delete game.inventory[g];
      addLog("🔫 Ambush! You lost " + lost + " " + g, "danger");
      alert("🔫 Ambushed! Lost " + lost + " " + g);
    } else {
      addLog("🔫 Ambushed — but you had nothing to steal", "danger");
      alert("Ambushed, but you had nothing worth taking.");
    }
  }
}

function playerGoodEvent() {
  if (Math.random() < 0.5) {
    const gain = 10 + Math.floor(Math.random() * 50);
    game.cash += gain;
    addLog("✨ Lucky find! You gained $" + gain, "good");
    alert("✨ You found valuables! +$" + gain);
  } else {
    const goods = Object.keys(towns[game.location].goods);
    if (goods.length) {
      const g = goods[Math.floor(Math.random() * goods.length)];
      const bonus = 3 + Math.floor(Math.random() * 5);
      game.inventory[g] = (game.inventory[g] || 0) + bonus;
      addLog("🎁 Windfall! You received " + bonus + " " + g, "good");
      alert("🎁 Windfall! Received " + bonus + " " + g);
    }
  }
}
