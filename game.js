// ================= DOM REFERENCES =================
const header  = document.getElementById("header");
const main    = document.getElementById("main");
const map     = document.getElementById("map");
const mapInner= document.getElementById("map-inner");
const modal   = document.getElementById("modal");

// ================= SETTINGS =================
let settings = {
  stabilisationRate: 0.05,
  aiEnabled: true,
};

// ================= GAME STATE =================
let game = {
  day: 1,
  maxDays: 30,
  cash: 200,
  location: "Abilene",
  capacity: 20,
  eventsEnabled: true,
  eventChances: { danger: 0.25, good: 0.25 },
  inventory: { whiskey: 5 },
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  activityLog: [],
  stats: { tradesMade: 0, totalEarned: 0 },
};

// ================= TRADERS =================
let traders = [
  {
    id: "trader_1",
    name: "Rattlesnake Pete",
    cash: 150,
    startingCash: 150,
    location: "DodgeCity",
    inventory: {},
    state: "idle",
    travelDaysRemaining: 0,
    travelDestination: null,
    personality: {
      preferredGoods: ["whiskey", "rifles"],
      preferredTowns: ["Tombstone", "ElPaso"],
      aggression: 0.8,
      riskTolerance: 0.6,
    },
    stats: { totalEarned: 0, tradesMade: 0, eventsTriggered: 0 },
  },
];

// ================= TURN STATE =================
let turnState = {
  phase: "player",
  roundNumber: 1,
  roundOrder: [],
  playerIndex: 0,
};

// ================= MAP EDITOR =================
let mapEditor = { mode: null, selected: null };

// ================= TOWNS =================
let towns = {
  Abilene: {
    x: 100, y: 200,
    goods: {
      whiskey: { base: 10, baseSupply: 50, baseDemand: 70, supply: 50, demand: 70 },
      cattle:  { base: 8,  baseSupply: 80, baseDemand: 40, supply: 80, demand: 40 },
    },
    routes: { DodgeCity: 2, Tombstone: 4 },
  },
  DodgeCity: {
    x: 200, y: 120,
    goods: {
      cattle: { base: 6, baseSupply: 90, baseDemand: 50, supply: 90, demand: 50 },
      grain:  { base: 5, baseSupply: 70, baseDemand: 60, supply: 70, demand: 60 },
    },
    routes: { Abilene: 2, ElPaso: 3 },
  },
  Tombstone: {
    x: 320, y: 260,
    goods: {
      whiskey: { base: 15, baseSupply: 30, baseDemand: 90, supply: 30, demand: 90 },
      rifles:  { base: 40, baseSupply: 20, baseDemand: 80, supply: 20, demand: 80 },
    },
    routes: { Abilene: 4, ElPaso: 2 },
  },
  ElPaso: {
    x: 420, y: 150,
    goods: {
      gold: { base: 100, baseSupply: 10, baseDemand: 90, supply: 10, demand: 90 },
    },
    routes: { DodgeCity: 3, Tombstone: 2 },
  },
};

// ================= HELPERS =================
function normaliseGood(item) {
  if (item.baseSupply === undefined) item.baseSupply = item.supply ?? item.base ?? 50;
  if (item.baseDemand === undefined) item.baseDemand = item.demand ?? item.base ?? 50;
  if (item.supply    === undefined) item.supply    = item.baseSupply;
  if (item.demand    === undefined) item.demand    = item.baseDemand;
}

function normaliseAllGoods() {
  for (const t in towns)
    for (const g in towns[t].goods)
      normaliseGood(towns[t].goods[g]);
}

function getPrice(g, townName) {
  const loc = townName || game.location;
  const town = towns[loc];
  if (!town || !town.goods || !town.goods[g]) return null;
  const item = town.goods[g];
  return Math.max(1, Math.round(item.base * (item.demand / item.supply)));
}

function currentInventory() {
  return Object.values(game.inventory).reduce((a, b) => a + b, 0);
}

function allGoodsAcrossMap() {
  const set = new Set();
  for (const t in towns)
    for (const g in towns[t].goods)
      set.add(g);
  return [...set].sort();
}

function showModal(html) {
  modal.innerHTML = html;
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

// ================= ACTIVITY LOG =================
function addLog(text, type) {
  const logType = type || "trade";
  game.activityLog.push({ text: text, type: logType, round: turnState.roundNumber });
  if (game.activityLog.length > 200) game.activityLog.shift();
  renderActivityLog();
}

function renderActivityLog() {
  const el = document.getElementById("activity-log");
  if (!el) return;
  el.innerHTML = game.activityLog
    .map(function(e) { return '<div class="log-entry ' + e.type + '">' + e.text + "</div>"; })
    .join("");
  el.scrollTop = el.scrollHeight;
}

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

// ================= RENDER =================
function render() {
  renderMap();
  updateTurnUI();
  renderActivityLog();

  const town = towns[game.location];
  let market = "<div class='panel'><b>📍 " + game.location + " — Market</b><br>";
  for (const g in town.goods)
    market += g + ": $" + getPrice(g) + "<br>";
  market += "</div>";

  let inv = "<div class='panel'><b>💰 $" + game.cash + " &nbsp;|&nbsp; Inventory (" + currentInventory() + "/" + game.capacity + ")</b><br>";
  let hasInv = false;
  for (const g in game.inventory) {
    if (game.inventory[g] > 0) { inv += g + ": " + game.inventory[g] + "<br>"; hasInv = true; }
  }
  if (!hasInv) inv += "Empty<br>";
  inv += "</div>";

  main.innerHTML = market + inv;
}

function renderMap() {
  mapInner.innerHTML = "";
  mapInner.style.transform = "translate(" + game.offsetX + "px, " + game.offsetY + "px) scale(" + game.zoom + ")";

  const drawn = new Set();
  for (const t in towns) {
    const from = towns[t];
    for (const r in from.routes) {
      const key = [t, r].sort().join("-");
      if (drawn.has(key)) continue;
      drawn.add(key);
      const to = towns[r];
      if (!to) continue;
      const dx = to.x - from.x, dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      const line = document.createElement("div");
      line.style.cssText = "position:absolute;width:" + len + "px;height:2px;background:#555;" +
        "left:" + from.x + "px;top:" + from.y + "px;transform-origin:0 0;transform:rotate(" + ang + "deg);";
      mapInner.appendChild(line);
    }
  }

  for (const t in towns) {
    const town = towns[t];
    const node = document.createElement("div");
    node.innerText = t;
    node.style.cssText = "position:absolute;left:" + town.x + "px;top:" + town.y + "px;" +
      "transform:translate(-50%,-50%);padding:4px 6px;" +
      "background:" + (t === game.location ? "#6a5cff" : "#333") + ";" +
      "border-radius:6px;cursor:pointer;font-size:12px;color:white;border:1px solid #555;z-index:5;";
    node.onclick = (function(townName) {
      return function(e) {
        e.stopPropagation();
        if (mapEditor.mode === "link") {
          if (!mapEditor.selected) {
            mapEditor.selected = townName;
            addLog("Link: selected " + townName + " — now click destination", "system");
          } else {
            const dist = parseInt(prompt("Distance in days from " + mapEditor.selected + " to " + townName + "?"));
            if (!isNaN(dist) && dist > 0) {
              towns[mapEditor.selected].routes[townName] = dist;
              towns[townName].routes[mapEditor.selected] = dist;
            }
            mapEditor.selected = null;
            render();
          }
        } else {
          openTravelTo(townName);
        }
      };
    })(t);
    mapInner.appendChild(node);
  }

  traders.forEach(function(trader) {
    const town = towns[trader.location];
    if (!town) return;
    const dot = document.createElement("div");
    dot.className = "trader-dot" + (trader.state === "broke" ? " broke" : "");
    dot.innerText = trader.state === "travelling" ? "🚂" : "🤠";
    dot.style.left = (town.x + 16) + "px";
    dot.style.top  = (town.y - 16) + "px";
    dot.title = trader.name + " — $" + trader.cash + " (" + trader.state + ")";
    if (trader.state !== "broke") {
      dot.onclick = (function(tr) {
        return function(e) { e.stopPropagation(); showTraderInfo(tr); };
      })(trader);
    }
    mapInner.appendChild(dot);
  });

  map.onclick = function(e) {
    if (mapEditor.mode !== "addTown") return;
    const rect = mapInner.getBoundingClientRect();
    const x = (e.clientX - rect.left) / game.zoom;
    const y = (e.clientY - rect.top)  / game.zoom;
    const name = prompt("Town name?");
    if (!name || towns[name]) return;
    towns[name] = {
      x: x, y: y,
      goods: { whiskey: { base: 10, baseSupply: 50, baseDemand: 50, supply: 50, demand: 50 } },
      routes: {},
    };
    render();
  };
}

function showTraderInfo(trader) {
  const invList = Object.keys(trader.inventory)
    .filter(function(g) { return trader.inventory[g] > 0; })
    .map(function(g) { return g + ": " + trader.inventory[g]; }).join(", ") || "Empty";
  showModal(
    "<b>🤠 " + trader.name + "</b>" +
    "<div class='item'>Cash: $" + trader.cash + "</div>" +
    "<div class='item'>Location: " + trader.location + "</div>" +
    "<div class='item'>Status: " + trader.state + "</div>" +
    "<div class='item'>Inventory: " + invList + "</div>" +
    "<div class='item'>Trades made: " + trader.stats.tradesMade + "</div>" +
    "<button onclick='closeModal()'>Close</button>"
  );
}

// ================= PAN & ZOOM =================
let isDragging = false, lastX = 0, lastY = 0;

map.onmousedown = function(e) {
  if (mapEditor.mode) return;
  isDragging = true; lastX = e.clientX; lastY = e.clientY;
};
window.onmousemove = function(e) {
  if (!isDragging) return;
  game.offsetX += e.clientX - lastX;
  game.offsetY += e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  renderMap();
};
window.onmouseup = function() { isDragging = false; };
map.onwheel = function(e) {
  e.preventDefault();
  const newZoom = Math.min(Math.max(0.5, game.zoom - e.deltaY * 0.001), 3);
  const rect    = map.getBoundingClientRect();
  const mx      = e.clientX - rect.left, my = e.clientY - rect.top;
  const wx      = (mx - game.offsetX) / game.zoom, wy = (my - game.offsetY) / game.zoom;
  game.zoom     = newZoom;
  game.offsetX  = mx - wx * game.zoom;
  game.offsetY  = my - wy * game.zoom;
  renderMap();
};

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

// ================= TRAVEL =================
function openTravel() {
  const routes = towns[game.location].routes;
  let html = "<b>Travel</b>";
  for (const t in routes)
    html += "<div class='item' onclick=\"openTravelTo('" + t + "')\">" + t + " (" + routes[t] + " days)</div>";
  html += "<button onclick='closeModal()'>Cancel</button>";
  showModal(html);
}

function openTravelTo(target) {
  const routes = towns[game.location].routes;
  if (!routes[target]) return;
  const dist = routes[target];
  if (game.day + dist > game.maxDays) {
    showModal("<b>Too far!</b><div>Only " + (game.maxDays - game.day) + " days remaining.</div><button onclick='closeModal()'>Back</button>");
    return;
  }
  showModal(
    "<b>Travel to " + target + "</b>" +
    "<div>Distance: " + dist + " days</div>" +
    "<div style='color:#aaa;font-size:12px'>Travel advances the day counter.</div>" +
    "<button class='confirm' onclick=\"confirmTravel('" + target + "'," + dist + ")\">Depart</button>" +
    "<button onclick='closeModal()'>Cancel</button>"
  );
}

function confirmTravel(target, dist) {
  const prev = game.location;
  game.location = target;
  game.day += dist - 1; // endTurn adds the final +1
  for (let i = 0; i < dist; i++) {
    if (game.eventsEnabled) playerRandomEvent();
  }
  addLog("👤 You travelled from " + prev + " to " + target + " (" + dist + " days)", "trade");
  closeModal(); render();
}

// ================= PLAYER EVENTS =================
function playerRandomEvent() {
  const roll = Math.random();
  const d = game.eventChances.danger, gd = game.eventChances.good;
  if (roll < d) playerDangerEvent();
  else if (roll < d + gd) playerGoodEvent();
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

// ================= MARKET =================
function updateMarket() {
  for (const t in towns)
    for (const g in towns[t].goods) {
      const item = towns[t].goods[g];
      item.supply = Math.max(5, item.supply + Math.floor(Math.random() * 6 - 3));
      item.demand = Math.max(5, item.demand + Math.floor(Math.random() * 6 - 3));
    }
}

function runPriceStabilisation() {
  const rate = settings.stabilisationRate;
  for (const t in towns)
    for (const g in towns[t].goods) {
      const item = towns[t].goods[g];
      item.supply = Math.round(item.supply + (item.baseSupply - item.supply) * rate);
      item.demand = Math.round(item.demand + (item.baseDemand - item.demand) * rate);
    }
}

// ================= AI TRADER SYSTEM =================
function runAITurn(trader) {
  if (!settings.aiEnabled || trader.state === "broke" || trader.state === "travelling") return;

  const town = towns[trader.location];
  const availableGoods = Object.keys(town.goods);

  // Sell goods first if holding any
  for (const g in trader.inventory) {
    if (trader.inventory[g] <= 0) continue;
    const price = getPrice(g, trader.location);
    if (price === null) continue;
    const qty = Math.ceil(trader.inventory[g] * 0.5);
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
    break;
  }

  // Buy goods
  if (Math.random() < trader.personality.aggression && availableGoods.length > 0) {
    const good = pickPreferredGood(availableGoods, trader.personality.preferredGoods);
    if (good) {
      const price = getPrice(good, trader.location);
      if (price && trader.cash >= price) {
        const maxAmt = Math.max(1, Math.floor(trader.cash * trader.personality.aggression * 0.5 / price));
        const qty = Math.min(maxAmt, 8);
        trader.cash -= price * qty;
        trader.inventory[good] = (trader.inventory[good] || 0) + qty;
        trader.stats.tradesMade++;
        town.goods[good].supply = Math.max(1, town.goods[good].supply - qty);
        town.goods[good].demand += Math.ceil(qty * 0.5);
        addLog("🤠 " + trader.name + " bought " + qty + " " + good + " in " + trader.location, "ai");
      }
    }
  }

  // Travel decision
  if (Math.random() < 0.5) {
    const destinations = Object.keys(town.routes);
    if (destinations.length > 0) {
      const preferred = destinations.filter(function(d) { return trader.personality.preferredTowns.includes(d); });
      const pool = preferred.length > 0 ? preferred : destinations;
      const dest = pool[Math.floor(Math.random() * pool.length)];
      const dist = town.routes[dest];
      trader.state = "travelling";
      trader.travelDaysRemaining = dist;
      trader.travelDestination   = dest;
      addLog("🤠 " + trader.name + " set off for " + dest + " (" + dist + " days)", "ai");
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
            const g    = goods[Math.floor(Math.random() * goods.length)];
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
      trader.location         = trader.travelDestination;
      trader.travelDestination = null;
      trader.state            = "idle";
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

// ================= MARKET INTEL =================
function openMarket() {
  let html = "<b>📊 Market Intel</b>";
  for (const t in towns) {
    const dist = getDistance(game.location, t);
    html += "<div class='panel'><b>" + t + "</b>";
    html += t !== game.location ? " (" + dist + " days away)" : " (you are here)";
    html += "<br>";
    for (const g in towns[t].goods)
      html += g + ": $" + getPrice(g, t) + "<br>";
    html += "</div>";
  }
  html += "<button onclick='closeModal()'>Close</button>";
  showModal(html);
}

function getDistance(from, to) {
  if (from === to) return 0;
  const visited = new Set();
  const queue = [{ town: from, dist: 0 }];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.town === to) return cur.dist;
    if (visited.has(cur.town)) continue;
    visited.add(cur.town);
    const routes = towns[cur.town] ? towns[cur.town].routes : {};
    for (const next in routes)
      queue.push({ town: next, dist: cur.dist + routes[next] });
  }
  return "?";
}

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
  game.day = 1; game.cash = 200;
  game.inventory = { whiskey: 5 };
  game.location = "Abilene";
  game.activityLog = [];
  game.stats = { tradesMade: 0, totalEarned: 0 };
  traders.forEach(function(t) {
    t.cash = t.startingCash; t.inventory = {};
    t.state = "idle"; t.travelDaysRemaining = 0; t.travelDestination = null;
    t.stats = { totalEarned: 0, tradesMade: 0, eventsTriggered: 0 };
  });
  turnState.phase = "player"; turnState.roundNumber = 1;
  closeModal();
  startRound();
}

// ================= EDITOR =================
function openEditor() {
  showModal(
    "<b>⚙ Editor</b>" +
    "<div class='item' onclick='editorMapMenu()'>🗺️ Map Management</div>" +
    "<div class='item' onclick='editorGoodsMenu()'>📦 Goods Management</div>" +
    "<div class='item' onclick='editorGameSettingsMenu()'>⚙️ Game Settings</div>" +
    "<div class='item' onclick='editorTradersMenu()'>🤠 Traders</div>" +
    "<div class='item' onclick='importWorld()'>📂 Import world.json</div>" +
    "<div class='item' onclick='exportWorld()'>💾 Export world.json</div>" +
    "<button onclick='closeModal()'>Close</button>"
  );
}

// --- MAP EDITOR ---
function editorMapMenu() {
  showModal(
    "<b>🗺️ Map Management</b>" +
    "<div class='item' onclick=\"setMapMode('addTown')\">➕ Add Town (click map)</div>" +
    "<div class='item' onclick=\"setMapMode('link')\">🔗 Link Towns (click 2 towns)</div>" +
    "<div class='item' onclick='editorDeleteTown()'>❌ Delete Town</div>" +
    "<div class='item' onclick=\"setMapMode(null)\">🚫 Exit Map Edit Mode</div>" +
    "<button onclick='openEditor()'>Back</button>"
  );
}

function setMapMode(mode) {
  mapEditor.mode = mode; mapEditor.selected = null;
  if (!mode) { closeModal(); addLog("Exited map editor mode", "system"); }
  else addLog("Map editor: " + mode + " mode active — close this menu then interact with map", "system");
}

function editorDeleteTown() {
  let html = "<b>Delete Town</b>", found = false;
  for (const t in towns) {
    if (t === game.location) continue;
    html += "<div class='item' onclick=\"confirmDeleteTown('" + t + "')\">" + t + "</div>";
    found = true;
  }
  if (!found) html += "<div class='item'>No other towns</div>";
  html += "<button onclick='editorMapMenu()'>Back</button>";
  showModal(html);
}

function confirmDeleteTown(town) {
  showModal(
    "<b>Delete " + town + "?</b>" +
    "<div style='color:#f66'>Removes town and all its routes.</div>" +
    "<button class='confirm' onclick=\"deleteTown('" + town + "')\">DELETE</button>" +
    "<button onclick='editorDeleteTown()'>Cancel</button>"
  );
}

function deleteTown(town) {
  for (const t in towns) { if (towns[t].routes) delete towns[t].routes[town]; }
  delete towns[town];
  editorMapMenu(); render();
}

// --- GOODS EDITOR ---
function editorGoodsMenu() {
  showModal(
    "<b>📦 Goods Management</b>" +
    "<div class='item' onclick='editorEditTown()'>✏️ Edit Good Stats</div>" +
    "<div class='item' onclick='editorAddGood()'>➕ Add Good to Town</div>" +
    "<div class='item' onclick='editorDeleteGood()'>❌ Remove Good from Town</div>" +
    "<button onclick='openEditor()'>Back</button>"
  );
}

function editorEditTown() {
  let html = "<b>Select Town</b>";
  for (const t in towns)
    html += "<div class='item' onclick=\"editorSelectTown('" + t + "')\">" + t + "</div>";
  html += "<button onclick='editorGoodsMenu()'>Back</button>";
  showModal(html);
}

function editorSelectTown(town) {
  let html = "<b>" + town + " — Goods</b>";
  for (const g in towns[town].goods)
    html += "<div class='item' onclick=\"editorSelectGood('" + town + "','" + g + "')\">" + g + "</div>";
  html += "<button onclick='editorEditTown()'>Back</button>";
  showModal(html);
}

function editorSelectGood(town, good) {
  const item = towns[town].goods[good];
  showModal(
    "<b>" + town + " — " + good + "</b>" +
    "<div class='item' onclick=\"editorSetField('" + town + "','" + good + "','base')\">Base Price: " + item.base + "</div>" +
    "<div class='item' onclick=\"editorSetField('" + town + "','" + good + "','supply')\">Supply: " + item.supply + "</div>" +
    "<div class='item' onclick=\"editorSetField('" + town + "','" + good + "','demand')\">Demand: " + item.demand + "</div>" +
    "<div class='item' onclick=\"editorSetField('" + town + "','" + good + "','baseSupply')\">Base Supply: " + item.baseSupply + "</div>" +
    "<div class='item' onclick=\"editorSetField('" + town + "','" + good + "','baseDemand')\">Base Demand: " + item.baseDemand + "</div>" +
    "<button onclick=\"editorSelectTown('" + town + "')\">Back</button>"
  );
}

function editorSetField(town, good, field) {
  let value = towns[town].goods[good][field];
  function renderF() {
    showModal(
      "<b>" + town + " — " + good + " (" + field + ")</b>" +
      "<div class='qty'>" +
      "<button onclick='chgF(-10)'>-10</button>" +
      "<button onclick='chgF(-1)'>-1</button>" +
      "<div>" + value + "</div>" +
      "<button onclick='chgF(1)'>+1</button>" +
      "<button onclick='chgF(10)'>+10</button>" +
      "</div>" +
      "<button class='confirm' onclick='cfF()'>Save</button>" +
      "<button onclick=\"editorSelectGood('" + town + "','" + good + "')\">Back</button>"
    );
  }
  window.chgF = function(v) { value = Math.max(1, value + v); renderF(); };
  window.cfF  = function() { towns[town].goods[good][field] = value; editorSelectGood(town, good); render(); };
  renderF();
}

function editorAddGood() {
  let html = "<b>Select Town</b>";
  for (const t in towns)
    html += "<div class='item' onclick=\"editorAddGoodToTown('" + t + "')\">" + t + "</div>";
  html += "<button onclick='editorGoodsMenu()'>Back</button>";
  showModal(html);
}

function editorAddGoodToTown(town) {
  showModal(
    "<b>Add Good to " + town + "</b>" +
    "<input id='newGoodName' placeholder='Good name (e.g. cotton)'>" +
    "<button class='confirm' onclick=\"confirmAddGood('" + town + "')\">Add</button>" +
    "<button onclick='editorAddGood()'>Back</button>"
  );
}

function confirmAddGood(town) {
  const name = document.getElementById("newGoodName").value.trim();
  if (!name) return;
  towns[town].goods[name] = { base: 10, baseSupply: 50, baseDemand: 50, supply: 50, demand: 50 };
  closeModal(); render();
}

function editorDeleteGood() {
  let html = "<b>Select Town</b>";
  for (const t in towns)
    html += "<div class='item' onclick=\"editorDeleteGoodTown('" + t + "')\">" + t + "</div>";
  html += "<button onclick='editorGoodsMenu()'>Back</button>";
  showModal(html);
}

function editorDeleteGoodTown(town) {
  let html = "<b>" + town + " — Remove Good</b>";
  for (const g in towns[town].goods)
    html += "<div class='item' onclick=\"confirmDeleteGood('" + town + "','" + g + "')\">" + g + "</div>";
  html += "<button onclick='editorDeleteGood()'>Back</button>";
  showModal(html);
}

function confirmDeleteGood(town, good) {
  showModal(
    "<b>Remove " + good + " from " + town + "?</b>" +
    "<button class='confirm' onclick=\"deleteGood('" + town + "','" + good + "')\">DELETE</button>" +
    "<button onclick=\"editorDeleteGoodTown('" + town + "')\">Cancel</button>"
  );
}

function deleteGood(town, good) {
  delete towns[town].goods[good];
  delete game.inventory[good];
  traders.forEach(function(t) { delete t.inventory[good]; });
  closeModal(); render();
}

// --- GAME SETTINGS ---
function editorGameSettingsMenu() {
  showModal(
    "<b>⚙️ Game Settings</b>" +
    "<div class='item' onclick='editorSetMoney()'>💰 Set Player Cash ($" + game.cash + ")</div>" +
    "<div class='item' onclick='editorSetMaxDays()'>📅 Max Days (" + game.maxDays + ")</div>" +
    "<div class='item' onclick='editorSetCapacity()'>🎒 Carry Capacity (" + game.capacity + ")</div>" +
    "<div class='item' onclick='editorEventChances()'>🎲 Event Chances</div>" +
    "<div class='item' onclick='toggleEvents()'>🔔 Travel Events: " + (game.eventsEnabled ? "ON" : "OFF") + "</div>" +
    "<div class='item' onclick='editorStabilisationRate()'>📊 Market Stabilisation (" + (settings.stabilisationRate * 100).toFixed(0) + "%)</div>" +
    "<div class='item' onclick='toggleAI()'>🤖 AI Traders: " + (settings.aiEnabled ? "ON" : "OFF") + "</div>" +
    "<button onclick='openEditor()'>Back</button>"
  );
}

function toggleEvents()  { game.eventsEnabled  = !game.eventsEnabled;  editorGameSettingsMenu(); }
function toggleAI()      { settings.aiEnabled  = !settings.aiEnabled;  editorGameSettingsMenu(); }

function editorSetMoney() {
  let value = game.cash;
  function renderM() {
    showModal(
      "<b>Set Player Cash</b>" +
      "<div class='qty'>" +
      "<button onclick='chgM(-100)'>-100</button><button onclick='chgM(-10)'>-10</button>" +
      "<div>$" + value + "</div>" +
      "<button onclick='chgM(10)'>+10</button><button onclick='chgM(100)'>+100</button>" +
      "</div>" +
      "<button class='confirm' onclick='cfM()'>Save</button>" +
      "<button onclick='editorGameSettingsMenu()'>Back</button>"
    );
  }
  window.chgM = function(v) { value = Math.max(0, value + v); renderM(); };
  window.cfM  = function() { game.cash = value; editorGameSettingsMenu(); render(); };
  renderM();
}

function editorSetMaxDays() {
  let value = game.maxDays;
  function renderD() {
    showModal(
      "<b>Set Max Days</b>" +
      "<div class='qty'>" +
      "<button onclick='chgD(-10)'>-10</button><button onclick='chgD(-1)'>-1</button>" +
      "<div>" + value + "</div>" +
      "<button onclick='chgD(1)'>+1</button><button onclick='chgD(10)'>+10</button>" +
      "</div>" +
      "<button class='confirm' onclick='cfD()'>Save</button>" +
      "<button onclick='editorGameSettingsMenu()'>Back</button>"
    );
  }
  window.chgD = function(v) { value = Math.max(5, value + v); renderD(); };
  window.cfD  = function() { game.maxDays = value; editorGameSettingsMenu(); render(); };
  renderD();
}

function editorSetCapacity() {
  let value = game.capacity;
  function renderC() {
    showModal(
      "<b>Set Carry Capacity</b>" +
      "<div class='qty'>" +
      "<button onclick='chgC(-5)'>-5</button><button onclick='chgC(-1)'>-1</button>" +
      "<div>" + value + "</div>" +
      "<button onclick='chgC(1)'>+1</button><button onclick='chgC(5)'>+5</button>" +
      "</div>" +
      "<button class='confirm' onclick='cfC()'>Save</button>" +
      "<button onclick='editorGameSettingsMenu()'>Back</button>"
    );
  }
  window.chgC = function(v) { value = Math.max(1, value + v); renderC(); };
  window.cfC  = function() { game.capacity = value; editorGameSettingsMenu(); render(); };
  renderC();
}

function editorEventChances() {
  let danger = game.eventChances.danger, good = game.eventChances.good;
  function renderE() {
    showModal(
      "<b>Event Chances (per day travelled)</b>" +
      "<div>⚔️ Danger: " + (danger * 100).toFixed(0) + "%</div>" +
      "<div class='qty'><button onclick='chgDng(-0.05)'>-5%</button><button onclick='chgDng(0.05)'>+5%</button></div>" +
      "<div>✨ Good: " + (good * 100).toFixed(0) + "%</div>" +
      "<div class='qty'><button onclick='chgGd(-0.05)'>-5%</button><button onclick='chgGd(0.05)'>+5%</button></div>" +
      "<button class='confirm' onclick='cfE()'>Save</button>" +
      "<button onclick='editorGameSettingsMenu()'>Back</button>"
    );
  }
  window.chgDng = function(v) { danger = Math.max(0, Math.min(1, danger + v)); renderE(); };
  window.chgGd  = function(v) { good   = Math.max(0, Math.min(1, good + v));   renderE(); };
  window.cfE    = function() {
    if (danger + good > 1) { alert("Total cannot exceed 100%"); return; }
    game.eventChances.danger = danger; game.eventChances.good = good;
    editorGameSettingsMenu();
  };
  renderE();
}

function editorStabilisationRate() {
  let value = settings.stabilisationRate;
  function renderS() {
    showModal(
      "<b>Market Stabilisation Rate</b>" +
      "<div style='color:#aaa;font-size:12px'>How fast prices drift back to base values per round.</div>" +
      "<div>" + (value * 100).toFixed(0) + "% per round</div>" +
      "<div class='qty'><button onclick='chgS(-0.01)'>-1%</button><button onclick='chgS(0.01)'>+1%</button></div>" +
      "<button class='confirm' onclick='cfS()'>Save</button>" +
      "<button onclick='editorGameSettingsMenu()'>Back</button>"
    );
  }
  window.chgS = function(v) { value = Math.max(0.01, Math.min(0.20, +(value + v).toFixed(2))); renderS(); };
  window.cfS  = function() { settings.stabilisationRate = value; editorGameSettingsMenu(); };
  renderS();
}

// --- TRADERS EDITOR ---
function editorTradersMenu() {
  let html = "<b>🤠 Traders</b>";
  html += "<div class='item' onclick='editorAddTrader()'>➕ Add New Trader</div>";
  traders.forEach(function(t, i) {
    const badge = t.state === "broke" ? " 💀" : t.state === "travelling" ? " 🚂" : "";
    html += "<div class='item' onclick='editorEditTrader(" + i + ")'>" + t.name + badge + " — $" + t.cash + "</div>";
  });
  html += "<button onclick='openEditor()'>Back</button>";
  showModal(html);
}

function editorAddTrader() {
  traders.push({
    id: "trader_" + Date.now(),
    name: "New Trader",
    cash: 150, startingCash: 150,
    location: Object.keys(towns)[0] || "Abilene",
    inventory: {}, state: "idle",
    travelDaysRemaining: 0, travelDestination: null,
    personality: { preferredGoods: [], preferredTowns: [], aggression: 0.5, riskTolerance: 0.5 },
    stats: { totalEarned: 0, tradesMade: 0, eventsTriggered: 0 },
  });
  editorEditTrader(traders.length - 1);
}

function editorEditTrader(i) {
  const t = traders[i];
  showModal(
    "<b>Edit: " + t.name + "</b>" +
    "<div class='item' onclick='editorTraderName(" + i + ")'>✏️ Name: " + t.name + "</div>" +
    "<div class='item' onclick=\"editorTraderCash(" + i + ",'cash')\">💰 Cash: $" + t.cash + "</div>" +
    "<div class='item' onclick=\"editorTraderCash(" + i + ",'startingCash')\">🏁 Starting Cash: $" + t.startingCash + "</div>" +
    "<div class='item' onclick='editorTraderLocation(" + i + ")'>📍 Location: " + t.location + "</div>" +
    "<div class='item' onclick='editorTraderInventory(" + i + ")'>📦 Inventory</div>" +
    "<div class='item' onclick='editorTraderAggression(" + i + ")'>⚡ Aggression: " + t.personality.aggression.toFixed(2) + "</div>" +
    "<div class='item' onclick='editorTraderRisk(" + i + ")'>🎲 Risk Tolerance: " + t.personality.riskTolerance.toFixed(2) + "</div>" +
    "<div class='item' onclick='editorTraderPreferredGoods(" + i + ")'>📋 Preferred Goods</div>" +
    "<div class='item' onclick='editorTraderPreferredTowns(" + i + ")'>🗺️ Preferred Towns</div>" +
    "<div class='item' onclick='editorTraderState(" + i + ")'>🔄 Status: " + t.state + "</div>" +
    "<div class='item' style='color:#f66' onclick='confirmDeleteTrader(" + i + ")'>❌ Delete Trader</div>" +
    "<button onclick='editorTradersMenu()'>Back</button>"
  );
}

function editorTraderName(i) {
  showModal(
    "<b>Set Trader Name</b>" +
    "<input id='traderNameInput' value='" + traders[i].name + "'>" +
    "<button class='confirm' onclick='cfTraderName(" + i + ")'>Save</button>" +
    "<button onclick='editorEditTrader(" + i + ")'>Back</button>"
  );
}
function cfTraderName(i) {
  const val = document.getElementById("traderNameInput").value.trim();
  if (val) traders[i].name = val;
  editorEditTrader(i);
}

function editorTraderCash(i, field) {
  let value = traders[i][field];
  function renderTC() {
    showModal(
      "<b>" + (field === "cash" ? "Set Cash" : "Set Starting Cash") + "</b>" +
      "<div class='qty'>" +
      "<button onclick='chgTC(-100)'>-100</button><button onclick='chgTC(-10)'>-10</button>" +
      "<div>$" + value + "</div>" +
      "<button onclick='chgTC(10)'>+10</button><button onclick='chgTC(100)'>+100</button>" +
      "</div>" +
      "<button class='confirm' onclick='cfTC()'>Save</button>" +
      "<button onclick='editorEditTrader(" + i + ")'>Back</button>"
    );
  }
  window.chgTC = function(v) { value = Math.max(0, value + v); renderTC(); };
  window.cfTC  = function() { traders[i][field] = value; editorEditTrader(i); render(); };
  renderTC();
}

function editorTraderLocation(i) {
  let html = "<b>Set Location: " + traders[i].name + "</b>";
  for (const t in towns)
    html += "<div class='item' onclick=\"setTLoc(" + i + ",'" + t + "')\">" + t + (t === traders[i].location ? " ✓" : "") + "</div>";
  html += "<button onclick='editorEditTrader(" + i + ")'>Back</button>";
  showModal(html);
}
function setTLoc(i, loc) {
  traders[i].location = loc; traders[i].state = "idle";
  traders[i].travelDaysRemaining = 0; traders[i].travelDestination = null;
  editorEditTrader(i); render();
}

function editorTraderInventory(i) {
  const t = traders[i];
  const all = allGoodsAcrossMap();
  let html = "<b>" + t.name + " — Inventory</b>";
  all.forEach(function(g) {
    const qty = t.inventory[g] || 0;
    html += "<div class='item' onclick='editorTraderGoodQty(" + i + ",\"" + g + "\")'>" + g + ": " + qty + "</div>";
  });
  html += "<button onclick='editorEditTrader(" + i + ")'>Back</button>";
  showModal(html);
}

function editorTraderGoodQty(i, good) {
  let value = traders[i].inventory[good] || 0;
  function renderGQ() {
    showModal(
      "<b>" + traders[i].name + " — " + good + "</b>" +
      "<div class='qty'>" +
      "<button onclick='chgGQ(-5)'>-5</button><button onclick='chgGQ(-1)'>-1</button>" +
      "<div>" + value + "</div>" +
      "<button onclick='chgGQ(1)'>+1</button><button onclick='chgGQ(5)'>+5</button>" +
      "</div>" +
      "<button class='confirm' onclick='cfGQ()'>Save</button>" +
      "<button onclick='editorTraderInventory(" + i + ")'>Back</button>"
    );
  }
  window.chgGQ = function(v) { value = Math.max(0, value + v); renderGQ(); };
  window.cfGQ  = function() {
    if (value === 0) delete traders[i].inventory[good];
    else traders[i].inventory[good] = value;
    editorTraderInventory(i); render();
  };
  renderGQ();
}

function editorTraderAggression(i) {
  let value = traders[i].personality.aggression;
  function renderA() {
    showModal(
      "<b>" + traders[i].name + " — Aggression</b>" +
      "<div style='color:#aaa;font-size:12px'>Higher = buys more, acts bolder</div>" +
      "<div>" + value.toFixed(2) + "</div>" +
      "<div class='qty'><button onclick='chgA(-0.1)'>-0.1</button><button onclick='chgA(0.1)'>+0.1</button></div>" +
      "<button class='confirm' onclick='cfA()'>Save</button>" +
      "<button onclick='editorEditTrader(" + i + ")'>Back</button>"
    );
  }
  window.chgA = function(v) { value = Math.max(0, Math.min(1, +(value + v).toFixed(2))); renderA(); };
  window.cfA  = function() { traders[i].personality.aggression = value; editorEditTrader(i); };
  renderA();
}

function editorTraderRisk(i) {
  let value = traders[i].personality.riskTolerance;
  function renderR() {
    showModal(
      "<b>" + traders[i].name + " — Risk Tolerance</b>" +
      "<div style='color:#aaa;font-size:12px'>Higher = travels more freely</div>" +
      "<div>" + value.toFixed(2) + "</div>" +
      "<div class='qty'><button onclick='chgR(-0.1)'>-0.1</button><button onclick='chgR(0.1)'>+0.1</button></div>" +
      "<button class='confirm' onclick='cfR()'>Save</button>" +
      "<button onclick='editorEditTrader(" + i + ")'>Back</button>"
    );
  }
  window.chgR = function(v) { value = Math.max(0, Math.min(1, +(value + v).toFixed(2))); renderR(); };
  window.cfR  = function() { traders[i].personality.riskTolerance = value; editorEditTrader(i); };
  renderR();
}

function editorTraderPreferredGoods(i) {
  const all = allGoodsAcrossMap();
  const current = traders[i].personality.preferredGoods;
  let html = "<b>" + traders[i].name + " — Preferred Goods</b>" +
    "<div style='color:#aaa;font-size:12px;margin-bottom:8px'>Tap to toggle.</div>";
  all.forEach(function(g) {
    const checked = current.includes(g);
    html += "<div class='checklist-item' onclick='togglePrefGood(" + i + ",\"" + g + "\")'>" +
      "<span>" + (checked ? "☑" : "☐") + "</span> " + g + "</div>";
  });
  html += "<button onclick='editorEditTrader(" + i + ")'>Done</button>";
  showModal(html);
}
function togglePrefGood(i, g) {
  const arr = traders[i].personality.preferredGoods;
  const idx = arr.indexOf(g);
  if (idx === -1) arr.push(g); else arr.splice(idx, 1);
  editorTraderPreferredGoods(i);
}

function editorTraderPreferredTowns(i) {
  const current = traders[i].personality.preferredTowns;
  let html = "<b>" + traders[i].name + " — Preferred Towns</b>" +
    "<div style='color:#aaa;font-size:12px;margin-bottom:8px'>Tap to toggle.</div>";
  for (const t in towns) {
    const checked = current.includes(t);
    html += "<div class='checklist-item' onclick='togglePrefTown(" + i + ",\"" + t + "\")'>" +
      "<span>" + (checked ? "☑" : "☐") + "</span> " + t + "</div>";
  }
  html += "<button onclick='editorEditTrader(" + i + ")'>Done</button>";
  showModal(html);
}
function togglePrefTown(i, t) {
  const arr = traders[i].personality.preferredTowns;
  const idx = arr.indexOf(t);
  if (idx === -1) arr.push(t); else arr.splice(idx, 1);
  editorTraderPreferredTowns(i);
}

function editorTraderState(i) {
  let html = "<b>" + traders[i].name + " — Set Status</b>";
  ["idle", "broke"].forEach(function(s) {
    html += "<div class='item' onclick='setTState(" + i + ",\"" + s + "\")'>" + s + (traders[i].state === s ? " ✓" : "") + "</div>";
  });
  html += "<button onclick='editorEditTrader(" + i + ")'>Back</button>";
  showModal(html);
}
function setTState(i, state) {
  traders[i].state = state;
  if (state === "idle") { traders[i].travelDaysRemaining = 0; traders[i].travelDestination = null; }
  editorEditTrader(i); render();
}

function confirmDeleteTrader(i) {
  showModal(
    "<b>Delete " + traders[i].name + "?</b>" +
    "<button class='confirm' onclick='deleteTrader(" + i + ")'>DELETE</button>" +
    "<button onclick='editorEditTrader(" + i + ")'>Cancel</button>"
  );
}
function deleteTrader(i) { traders.splice(i, 1); editorTradersMenu(); render(); }

// ================= IMPORT / EXPORT =================
function exportWorld() {
  const data = {
    game:      JSON.parse(JSON.stringify(game)),
    towns:     JSON.parse(JSON.stringify(towns)),
    traders:   JSON.parse(JSON.stringify(traders)),
    settings:  JSON.parse(JSON.stringify(settings)),
    turnState: JSON.parse(JSON.stringify(turnState)),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "world.json";
  a.click();
}

function importWorld() {
  const input = document.createElement("input");
  input.type = "file"; input.accept = ".json";
  input.onchange = function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.towns)     towns    = data.towns;
        if (data.game)      Object.assign(game, data.game);
        if (data.traders)   traders  = data.traders;
        if (data.settings)  Object.assign(settings, data.settings);
        if (data.turnState) Object.assign(turnState, data.turnState);
        normaliseAllGoods();
        closeModal(); render();
        addLog("📂 World imported successfully", "system");
      } catch (err) { alert("Invalid JSON file."); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ================= STARTUP =================
async function loadWorld() {
  try {
    const res = await fetch("world.json");
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    if (data.towns)    towns   = data.towns;
    if (data.game)     Object.assign(game, data.game);
    if (data.traders)  traders = data.traders;
    if (data.settings) Object.assign(settings, data.settings);
    addLog("📂 Loaded world.json", "system");
  } catch (e) {
    addLog("🌵 No world.json found — using defaults", "system");
  }
  normaliseAllGoods();
  startRound();
}

loadWorld();