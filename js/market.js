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
      queue.push({ town: next, dist: cur.dist + (routes[next].dist || 0) });
  }
  return "?";
}
