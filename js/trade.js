// ================= BUY =================
function openBuy() {
  const town = towns[game.location];
  let html = "<b>Buy Goods</b>";
  for (const g in town.goods)
    html += "<div class='item' onclick=\"selectBuy('" + g + "')\">" + g + " — $" + getPrice(g) + "</div>";
  html += "<button onclick='closeModal()'>Close</button>";
  showModal(html);
}

function selectBuy(g) {
  let qty = 1;
  function renderBuy() {
    const p = getPrice(g);
    showModal(
      "<b>Buy " + g + "</b>" +
      "<div>Price: $" + p + " each | Total: $" + (p * qty) + "</div>" +
      "<div class='qty'>" +
      "<button onclick='changeBuyQty(-5)'>-5</button>" +
      "<button onclick='changeBuyQty(-1)'>-1</button>" +
      "<div>" + qty + "</div>" +
      "<button onclick='changeBuyQty(1)'>+1</button>" +
      "<button onclick='changeBuyQty(5)'>+5</button>" +
      "</div>" +
      "<button class='confirm' onclick='confirmBuy()'>Buy " + qty + " for $" + (p * qty) + "</button>" +
      "<button onclick='closeModal()'>Cancel</button>"
    );
  }
  window.changeBuyQty = function(v) { qty = Math.max(1, qty + v); renderBuy(); };
  window.confirmBuy = function() {
    const p = getPrice(g), cost = p * qty;
    if (currentInventory() + qty > game.capacity) { alert("Not enough space!"); return; }
    if (game.cash < cost) { alert("Not enough cash!"); return; }
    game.cash -= cost;
    game.inventory[g] = (game.inventory[g] || 0) + qty;
    game.stats.tradesMade++;
    const item = towns[game.location].goods[g];
    item.supply = Math.max(1, item.supply - qty);
    item.demand += Math.ceil(qty * 0.5);
    addLog("👤 You bought " + qty + " " + g + " for $" + cost + " in " + game.location, "trade");
    closeModal(); render();
  };
  renderBuy();
}

// ================= SELL =================
function openSell() {
  let html = "<b>Sell Goods</b>", any = false;
  for (const g in game.inventory) {
    if (game.inventory[g] <= 0) continue;
    any = true;
    const p = getPrice(g);
    if (p !== null) {
      html += "<div class='item' onclick=\"selectSell('" + g + "')\">" + g + " (" + game.inventory[g] + ") — $" + p + "</div>";
    } else {
      html += "<div class='item' style='opacity:0.5;cursor:default'>" + g + " (" + game.inventory[g] + ") — Not traded here</div>";
    }
  }
  if (!any) html += "<div class='item'>Inventory empty</div>";
  html += "<button onclick='closeModal()'>Close</button>";
  showModal(html);
}

function selectSell(g) {
  let qty = 1;
  const maxQty = game.inventory[g];
  function renderSell() {
    const p = getPrice(g);
    showModal(
      "<b>Sell " + g + "</b>" +
      "<div>Price: $" + p + " each | Earn: $" + (p * qty) + "</div>" +
      "<div class='qty'>" +
      "<button onclick='changeSellQty(-5)'>-5</button>" +
      "<button onclick='changeSellQty(-1)'>-1</button>" +
      "<div>" + qty + "</div>" +
      "<button onclick='changeSellQty(1)'>+1</button>" +
      "<button onclick='changeSellQty(5)'>+5</button>" +
      "</div>" +
      "<button class='confirm' onclick='confirmSell()'>Sell " + qty + " for $" + (p * qty) + "</button>" +
      "<button onclick='closeModal()'>Cancel</button>"
    );
  }
  window.changeSellQty = function(v) { qty = Math.max(1, Math.min(qty + v, maxQty)); renderSell(); };
  window.confirmSell = function() {
    const p = getPrice(g);
    if (p === null) return;
    const earned = p * qty;
    game.inventory[g] -= qty;
    game.cash += earned;
    game.stats.totalEarned += earned;
    game.stats.tradesMade++;
    if (game.inventory[g] <= 0) delete game.inventory[g];
    const item = towns[game.location].goods[g];
    if (item) {
      item.supply += qty;
      item.demand = Math.max(1, item.demand - Math.ceil(qty * 0.5));
    }
    addLog("👤 You sold " + qty + " " + g + " for $" + earned + " in " + game.location, "trade");
    closeModal(); render();
  };
  renderSell();
}
