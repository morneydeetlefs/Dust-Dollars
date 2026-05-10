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

function updateMapTransform() {
  mapInner.style.transform = "translate(" + game.offsetX + "px, " + game.offsetY + "px) scale(" + game.zoom + ")";
}

function renderMap() {
  mapInner.innerHTML = "";

  // Add background image centered at (0,0)
  const bg = document.createElement("img");
  bg.id = "map-bg";
  bg.src = "map.png";
  bg.style.cssText = "position:absolute; left:0; top:0; transform:translate(-50%,-50%); z-index:-1; pointer-events:none;";
  mapInner.appendChild(bg);

  updateMapTransform();

  const drawn = new Set();
  for (const t in towns) {
    const from = towns[t];
    for (const r in from.routes) {
      const key = [t, r].sort().join("-");
      if (drawn.has(key)) continue;
      drawn.add(key);
      const to = towns[r];
      if (!to) continue;
      const routeData = from.routes[r];
      const dx = to.x - from.x, dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Determine color based on hazard/reward
      let color = "#555";
      if (routeData.hazard > 0.1) color = "#f66";
      else if (routeData.reward > 0.1) color = "#6f6";

      const line = document.createElement("div");
      line.style.cssText = "position:absolute;width:" + len + "px;height:2px;background:" + color + ";" +
        "left:" + from.x + "px;top:" + from.y + "px;transform-origin:0 0;transform:rotate(" + ang + "deg);opacity:0.6;";
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
      "border-radius:6px;cursor:" + (mapEditor.mode === "move" ? "move" : "pointer") + ";font-size:12px;color:white;border:1px solid #555;z-index:5;" +
      "user-select:none;";

    node.onmousedown = (function(townName) {
      return function(e) {
        if (mapEditor.mode === "move") {
          e.stopPropagation();
          mapEditor.draggedTown = townName;
        }
      };
    })(t);

    node.onclick = (function(townName) {
      return function(e) {
        if (mapEditor.mode === "link" || mapEditor.mode === "unlink") {
          e.stopPropagation();
        }

        if (mapEditor.mode === "link") {
          if (!mapEditor.selected) {
            mapEditor.selected = townName;
            addLog("Link: selected " + townName + " — now click destination", "system");
          } else {
            const dist = parseInt(prompt("Distance in days from " + mapEditor.selected + " to " + townName + "?"));
            if (!isNaN(dist) && dist > 0) {
              const r = { dist: dist, hazard: 0, reward: 0 };
              towns[mapEditor.selected].routes[townName] = r;
              towns[townName].routes[mapEditor.selected] = r;
            }
            mapEditor.selected = null;
            render();
          }
        } else if (mapEditor.mode === "unlink") {
          if (!mapEditor.selected) {
            mapEditor.selected = townName;
            addLog("Unlink: selected " + townName + " — now click a connected town to remove link", "system");
          } else {
            if (towns[mapEditor.selected].routes[townName]) {
              delete towns[mapEditor.selected].routes[townName];
              delete towns[townName].routes[mapEditor.selected];
              addLog("Removed link between " + mapEditor.selected + " and " + townName, "system");
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

    // Add trader name tag
    const nameTag = document.createElement("div");
    nameTag.className = "trader-name-tag";
    nameTag.innerText = trader.name;
    nameTag.style.left = (town.x + 16) + "px";
    nameTag.style.top = (town.y - 36) + "px";
    nameTag.title = trader.name + " — $" + trader.cash + " (" + trader.state + ")";
    mapInner.appendChild(nameTag);
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
