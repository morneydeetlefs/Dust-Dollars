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
