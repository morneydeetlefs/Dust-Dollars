// ================= EDITOR =================
let mapEditor = { mode: null, selected: null, draggedTown: null };

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

// ================= MAP EDITOR =================
function editorMapMenu() {
  showModal(
    "<b>🗺️ Map Management</b>" +
    "<div class='item' onclick=\"setMapMode('move')\">🖱️ Move Towns (drag towns)</div>" +
    "<div class='item' onclick=\"setMapMode('addTown')\">➕ Add Town (click map)</div>" +
    "<div class='item' onclick=\"setMapMode('link')\">🔗 Link Towns (click 2 towns)</div>" +
    "<div class='item' onclick='editorRouteProps()'>🛠️ Route Hazards/Rewards</div>" +
    "<div class='item' onclick='editorDeleteLink()'>✂️ Remove Link</div>" +
    "<div class='item' onclick='editorDeleteTown()'>❌ Delete Town</div>" +
    "<div class='item' onclick=\"setMapMode(null)\">🚫 Exit Map Edit Mode</div>" +
    "<button onclick='openEditor()'>Back</button>"
  );
}

function editorRouteProps() {
  let html = "<b>Select Start Town</b>";
  for (const t in towns) {
    if (Object.keys(towns[t].routes).length > 0) {
      html += "<div class='item' onclick=\"editorRoutePropsDest('" + t + "')\">" + t + "</div>";
    }
  }
  html += "<button onclick='editorMapMenu()'>Back</button>";
  showModal(html);
}

function editorRoutePropsDest(start) {
  let html = "<b>Select Route from " + start + "</b>";
  for (const dest in towns[start].routes) {
    html += "<div class='item' onclick=\"editorEditRoute('" + start + "','" + dest + "')\">To " + dest + "</div>";
  }
  html += "<button onclick='editorRouteProps()'>Back</button>";
  showModal(html);
}

function editorEditRoute(s, d) {
  const r = towns[s].routes[d];
  showModal(
    "<b>Route: " + s + " ↔ " + d + "</b>" +
    "<div class='item' onclick=\"editorSetRouteVal('" + s + "','" + d + "','dist')\">Distance: " + r.dist + " days</div>" +
    "<div class='item' onclick=\"editorSetRouteVal('" + s + "','" + d + "','hazard')\">Hazard Chance Bonus: +" + (r.hazard * 100).toFixed(0) + "%</div>" +
    "<div class='item' onclick=\"editorSetRouteVal('" + s + "','" + d + "','reward')\">Reward Chance Bonus: +" + (r.reward * 100).toFixed(0) + "%</div>" +
    "<div class='item' onclick=\"editorRoutePayload('" + s + "','" + d + "','hazard')\">⚠️ Hazard Specifics</div>" +
    "<div class='item' onclick=\"editorRoutePayload('" + s + "','" + d + "','reward')\">✨ Reward Specifics</div>" +
    "<button onclick=\"editorRoutePropsDest('" + s + "')\">Back</button>"
  );
}

function editorRoutePayload(s, d, type) {
  const r = towns[s].routes[d];
  if (!r.payloads) r.payloads = { hazard: [], reward: [] };
  const list = r.payloads[type];

  let html = "<b>" + (type === "hazard" ? "⚠️ Hazard" : "✨ Reward") + " Contents</b><br>";
  html += "<div style='font-size:10px; color:#aaa; margin-bottom:5px;'>Hazards use % (0.1 = 10%), Rewards use qty.</div>";

  list.forEach((p, i) => {
    html += "<div class='item' style='display:flex; justify-content:space-between;'>" +
            "<span>" + p.good + ": " + (type === "hazard" ? (p.val * 100).toFixed(0) + "%" : p.val) + "</span>" +
            "<span style='color:#f66; cursor:pointer;' onclick='removeRoutePayload(\""+s+"\",\""+d+"\",\""+type+"\","+i+")'>[X]</span></div>";
  });

  html += "<button onclick='addRoutePayloadPrompt(\""+s+"\",\""+d+"\",\""+type+"\")'>+ Add Item</button>";
  html += "<button onclick='editorEditRoute(\""+s+"\",\""+d+"\")'>Back</button>";
  showModal(html);
}

window.removeRoutePayload = function(s, d, type, i) {
  towns[s].routes[d].payloads[type].splice(i, 1);
  towns[d].routes[s].payloads[type] = [...towns[s].routes[d].payloads[type]];
  editorRoutePayload(s, d, type);
};

window.addRoutePayloadPrompt = function(s, d, type) {
  const good = prompt("Good name (e.g. whiskey, gold, rifles, cash)?");
  if (!good) return;
  const val = parseFloat(prompt(type === "hazard" ? "Percentage to lose (e.g. 0.5 for 50%)?" : "Quantity to gain?"));
  if (isNaN(val)) return;

  if (!towns[s].routes[d].payloads) towns[s].routes[d].payloads = { hazard: [], reward: [] };
  towns[s].routes[d].payloads[type].push({ good: good.toLowerCase(), val: val });
  towns[d].routes[s].payloads[type] = [...towns[s].routes[d].payloads[type]];
  editorRoutePayload(s, d, type);
};

function editorSetRouteVal(s, d, field) {
  let val = towns[s].routes[d][field];
  const step = field === "dist" ? 1 : 0.05;
  function renderR() {
    showModal(
      "<b>Set " + field + "</b>" +
      "<div class='qty'>" +
      "<button onclick='chgR(-" + (step*5) + ")'>--" + (step*5) + "</button>" +
      "<button onclick='chgR(-" + step + ")'>-" + step + "</button>" +
      "<div>" + (field === "dist" ? val : (val * 100).toFixed(0) + "%") + "</div>" +
      "<button onclick='chgR(" + step + ")'>+" + step + "</button>" +
      "<button onclick='chgR(" + (step*5) + ")'>++" + (step*5) + "</button>" +
      "</div>" +
      "<button class='confirm' onclick='cfR()'>Save</button>" +
      "<button onclick=\"editorEditRoute('" + s + "','" + d + "')\">Back</button>"
    );
  }
  window.chgR = function(v) {
    val = Math.max(0, +(val + v).toFixed(2));
    if (field === "dist") val = Math.max(1, Math.round(val));
    renderR();
  };
  window.cfR = function() {
    towns[s].routes[d][field] = val;
    towns[d].routes[s][field] = val;
    editorEditRoute(s, d);
    renderMap();
  };
  renderR();
}

function editorDeleteLink() {
  setMapMode("unlink");
  addLog("Unlink mode: Click a town to see its routes, then click a destination to remove that link.", "system");
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

// ================= GOODS EDITOR =================
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

// ================= GAME SETTINGS EDITOR =================
function editorGameSettingsMenu() {
  showModal(
    "<b>⚙️ Game Settings</b>" +
    "<div class='item' onclick='editorSetMoney()'>💰 Set Player Cash ($" + game.cash + ")</div>" +
    "<div class='item' onclick='editorSetMaxDays()'>📅 Max Days (" + game.maxDays + ")</div>" +
    "<div class='item' onclick='editorSetCapacity()'>🎒 Carry Capacity (" + game.capacity + ")</div>" +
    "<div class='item' onclick='editorEventChances()'>🎲 Event Chances</div>" +
    "<div class='item' onclick='toggleEvents()'>🔔 Travel Events: " + (game.eventsEnabled ? "ON" : "OFF") + "</div>" +
    "<div class='item' onclick='editorStabilisationRate()'>📊 Market Stabilisation (" + (settings.stabilisationRate * 100).toFixed(0) + "%)</div>" +
    "<div class='item' onclick='editorRiskAversionFactor()'>🎯 Risk Aversion Factor: " + settings.riskAversionFactor + "x</div>" +
    "<div class='item' onclick='toggleAI()'>🤖 AI Traders: " + (settings.aiEnabled ? "ON" : "OFF") + "</div>" +
    "<button onclick='openEditor()'>Back</button>"
  );
}

function toggleEvents()  { game.eventsEnabled  = !game.eventsEnabled;  editorGameSettingsMenu(); }
function toggleAI()      { settings.aiEnabled  = !settings.aiEnabled;  editorGameSettingsMenu(); }

function editorRiskAversionFactor() {
  let value = settings.riskAversionFactor;
  function renderRAF() {
    showModal(
      "<b>Risk Aversion Factor</b>" +
      "<div style='color:#aaa;font-size:12px'>Higher = traders more willing to travel and take risks.<br>1 = normal, 10 = 10x more aggressive (default).</div>" +
      "<div>Current: " + value + "x</div>" +
      "<div class='qty'>" +
      "<button onclick='chgRAF(-10)'>-10</button>" +
      "<button onclick='chgRAF(-1)'>-1</button>" +
      "<div>" + value + "</div>" +
      "<button onclick='chgRAF(1)'>+1</button>" +
      "<button onclick='chgRAF(10)'>+10</button>" +
      "</div>" +
      "<button class='confirm' onclick='cfRAF()'>Save</button>" +
      "<button onclick='editorGameSettingsMenu()'>Back</button>"
    );
  }
  window.chgRAF = function(v) { value = Math.max(1, Math.min(100, value + v)); renderRAF(); };
  window.cfRAF  = function() { settings.riskAversionFactor = value; editorGameSettingsMenu(); addLog("⚙️ Risk aversion factor set to " + value + "x", "system"); };
  renderRAF();
}

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

// ================= TRADERS EDITOR =================
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
    purchaseRecords: {},
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
  function renderRisk() {
    showModal(
      "<b>" + traders[i].name + " — Risk Tolerance</b>" +
      "<div style='color:#aaa;font-size:12px'>Higher = travels more freely</div>" +
      "<div>" + value.toFixed(2) + "</div>" +
      "<div class='qty'><button onclick='chgRisk(-0.1)'>-0.1</button><button onclick='chgRisk(0.1)'>+0.1</button></div>" +
      "<button class='confirm' onclick='cfRisk()'>Save</button>" +
      "<button onclick='editorEditTrader(" + i + ")'>Back</button>"
    );
  }
  window.chgRisk = function(v) { value = Math.max(0, Math.min(1, +(value + v).toFixed(2))); renderRisk(); };
  window.cfRisk  = function() { traders[i].personality.riskTolerance = value; editorEditTrader(i); };
  renderRisk();
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
