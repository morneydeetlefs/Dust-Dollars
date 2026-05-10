// ================= AI TRADER SYSTEM =================

function calculateTravelRiskReward(trader, fromTown, toTown, dist, routeData) {
  // Uses riskTolerance * 150 — highly willing to travel
  const maxWillingDays = Math.max(1, Math.floor(trader.personality.riskTolerance * 150));

  if (dist > maxWillingDays && trader.personality.riskTolerance < 0.7) {
    return { willing: false, reason: `distance ${dist} exceeds max willing ${maxWillingDays} days` };
  }

  const routeHazard = routeData?.hazard || 0;
  const hazardThreshold = trader.personality.riskTolerance * 10;
  if (routeHazard > hazardThreshold) {
    return { willing: false, reason: `route hazard ${(routeHazard*100).toFixed(0)}% exceeds risk tolerance ${(hazardThreshold*100).toFixed(0)}%` };
  }

  return { willing: true, reason: null };
}

function runAITurn(trader) {
  if (!settings.aiEnabled || trader.state === "broke") return;
  if (trader.state === "travelling") {
    processTravellingTraders();
    return;
  }

  const town = towns[trader.location];
  if (!town) return;

  const availableGoods = Object.keys(town.goods);

  // ---------- SELL GOODS (sell 95% of inventory) ----------
  for (const g in trader.inventory) {
    if (trader.inventory[g] <= 0) continue;
    const price = getPrice(g, trader.location);
    if (price === null) {
      addLog("  " + trader.name + ": Cannot sell " + g + " in " + trader.location + " (not traded here)", "ai");
      continue;
    }
    const qty = Math.min(Math.ceil(trader.inventory[g] * 0.95), trader.inventory[g]);
    if (qty === 0) continue;

    const earned = price * qty;
    trader.cash += earned;
    trader.stats.totalEarned += earned;
    trader.stats.tradesMade++;
    trader.inventory[g] -= qty;
    if (trader.inventory[g] <= 0) delete trader.inventory[g];
    if (town.goods[g]) {
      town.goods[g].supply += qty;
      town.goods[g].demand = Math.max(1, town.goods[g].demand - Math.ceil(qty * 0.5));
    }
    addLog("🤠 " + trader.name + " sold " + qty + " " + g + " for $" + earned + " in " + trader.location, "ai");
  }

  // ---------- BUY GOODS ----------
  if (Math.random() < trader.personality.aggression) {
    const good = pickPreferredGood(availableGoods, trader.personality.preferredGoods);
    if (good) {
      const price = getPrice(good, trader.location);
      if (price && trader.cash >= price) {
        let maxAmt = Math.max(1, Math.floor(trader.cash * trader.personality.aggression * 2 / price));

        const maxCapacity = 40;
        const currentInv = Object.values(trader.inventory).reduce((a,b) => a+b, 0);
        const availableSpace = maxCapacity - currentInv;
        maxAmt = Math.min(maxAmt, availableSpace);

        const qty = Math.min(Math.ceil(maxAmt * trader.personality.aggression), maxAmt);

        if (qty > 0) {
          trader.cash -= price * qty;
          trader.inventory[good] = (trader.inventory[good] || 0) + qty;
          trader.stats.tradesMade++;
          town.goods[good].supply = Math.max(1, town.goods[good].supply - qty);
          town.goods[good].demand += Math.ceil(qty * 0.5);
          addLog("🤠 " + trader.name + " bought " + qty + " " + good + " for $" + (price * qty) + " in " + trader.location, "ai");
        }
      }
    }
  }

  // ---------- TRAVEL DECISION (profit-seeking + frequent travel) ----------
  const destinations = Object.keys(town.routes);
  if (destinations.length > 0) {
    let bestDestination = null;
    let bestProfit = 0;

    for (const dest of destinations) {
      const routeData = town.routes[dest];
      const dist = typeof routeData === "number" ? routeData : routeData.dist;
      const destTown = towns[dest];
      if (!destTown) continue;

      const travelCheck = calculateTravelRiskReward(trader, game.location, dest, dist, routeData);
      if (!travelCheck.willing) continue;

      for (const good in town.goods) {
        const buyPrice = getPrice(good, trader.location);
        const sellPrice = getPrice(good, dest);
        if (buyPrice && sellPrice && sellPrice > buyPrice) {
          const profitMargin = (sellPrice - buyPrice) / buyPrice;
          if (profitMargin > 0.02) {
            const weight = profitMargin * (trader.personality.aggression + 0.5);
            if (weight > bestProfit) {
              bestProfit = weight;
              bestDestination = dest;
            }
          }
        }
      }
    }

    if (bestDestination && bestProfit > 0.03) {
      const routeData = town.routes[bestDestination];
      const dist = typeof routeData === "number" ? routeData : routeData.dist;
      trader.state = "travelling";
      trader.travelDaysRemaining = dist;
      trader.travelDestination = bestDestination;
      addLog("🤠 " + trader.name + " travels to " + bestDestination + " for profitable trading (profit factor: " + bestProfit.toFixed(2) + ")", "ai");
    } else if (Math.random() < Math.min(0.95, trader.personality.aggression * 1.5)) {
      const viableDestinations = destinations.filter(dest => {
        const routeData = town.routes[dest];
        const dist = typeof routeData === "number" ? routeData : routeData.dist;
        const travelCheck = calculateTravelRiskReward(trader, game.location, dest, dist, routeData);
        return travelCheck.willing;
      });

      if (viableDestinations.length > 0) {
        const dest = viableDestinations[Math.floor(Math.random() * viableDestinations.length)];
        const routeData = town.routes[dest];
        const dist = typeof routeData === "number" ? routeData : routeData.dist;
        trader.state = "travelling";
        trader.travelDaysRemaining = dist;
        trader.travelDestination = dest;
        addLog("🤠 " + trader.name + " set off for " + dest + " (" + dist + " days) – seeking opportunities", "ai");
      }
    }
  }

  checkTraderBroke(trader);
}

function pickPreferredGood(available, preferred) {
  const match = preferred.find(function(g) { return available.includes(g); });
  return match || available[Math.floor(Math.random() * available.length)];
}

function processTravellingTraders() {
  traders.forEach(function(trader) {
    if (trader.state !== "travelling") return;
    trader.travelDaysRemaining--;

    if (game.eventsEnabled) {
      const roll = Math.random();
      if (roll < game.eventChances.danger) {
        trader.stats.eventsTriggered++;
        if (Math.random() < 0.5) {
          const loss = Math.floor(trader.cash * 0.2);
          trader.cash -= loss;
          addLog("⚔️ " + trader.name + " was robbed! Lost $" + loss, "danger");
        } else {
          const goods = Object.keys(trader.inventory).filter(function(g) { return trader.inventory[g] > 0; });
          if (goods.length) {
            const g = goods[Math.floor(Math.random() * goods.length)];
            const lost = Math.ceil(trader.inventory[g] * 0.5);
            trader.inventory[g] -= lost;
            if (trader.inventory[g] <= 0) delete trader.inventory[g];
            addLog("🔫 " + trader.name + " was ambushed! Lost " + lost + " " + g, "danger");
          }
        }
      } else if (roll < game.eventChances.danger + game.eventChances.good) {
        trader.stats.eventsTriggered++;
        const gain = 10 + Math.floor(Math.random() * 30);
        trader.cash += gain;
        addLog("✨ " + trader.name + " found $" + gain + " on the trail", "good");
      }
    }

    if (trader.travelDaysRemaining <= 0) {
      trader.location = trader.travelDestination;
      trader.travelDestination = null;
      trader.state = "idle";
      addLog("🤠 " + trader.name + " arrived in " + trader.location, "ai");
    }
    checkTraderBroke(trader);
  });
}

function checkTraderBroke(trader) {
  if (trader.cash > 0) return;
  const hasSellable = Object.keys(trader.inventory).some(function(g) {
    return trader.inventory[g] > 0 && getPrice(g, trader.location) !== null;
  });
  if (!hasSellable) {
    trader.state = "broke";
    addLog("💀 " + trader.name + " went broke and is out of the game", "danger");
  }
}
