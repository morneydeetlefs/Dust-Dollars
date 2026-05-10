// ================= PAN & ZOOM =================
let isDragging = false, lastX = 0, lastY = 0, pinchDist = 0;

map.onmousedown = function(e) {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  e.preventDefault();
};

map.ontouchstart = function(e) {
  if (e.touches.length === 1) {
    isDragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    e.preventDefault();
  } else if (e.touches.length === 2) {
    pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                           e.touches[0].clientY - e.touches[1].clientY);
    e.preventDefault();
  }
};

window.onmousemove = function(e) {
  // Town dragging takes priority
  if (mapEditor.draggedTown) {
    const rect = mapInner.getBoundingClientRect();
    const town = towns[mapEditor.draggedTown];
    town.x = (e.clientX - rect.left) / game.zoom;
    town.y = (e.clientY - rect.top) / game.zoom;
    renderMap();
    return;
  }

  if (!isDragging) return;

  game.offsetX += e.clientX - lastX;
  game.offsetY += e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  updateMapTransform();
};

window.ontouchmove = function(e) {
  // Town dragging takes priority
  if (mapEditor.draggedTown) {
    const rect = mapInner.getBoundingClientRect();
    const town = towns[mapEditor.draggedTown];
    town.x = (e.touches[0].clientX - rect.left) / game.zoom;
    town.y = (e.touches[0].clientY - rect.top) / game.zoom;
    renderMap();
    return;
  }

  if (!isDragging) return;

  if (e.touches.length === 1) {
    game.offsetX += e.touches[0].clientX - lastX;
    game.offsetY += e.touches[0].clientY - lastY;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    updateMapTransform();
  } else if (e.touches.length === 2) {
    const newPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                                    e.touches[0].clientY - e.touches[1].clientY);
    const scale = newPinchDist / pinchDist;
    const newZoom = Math.min(Math.max(0.5, game.zoom * scale), 3);

    const rect = map.getBoundingClientRect();
    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const mx = cx - rect.left, my = cy - rect.top;
    const wx = (mx - game.offsetX) / game.zoom, wy = (my - game.offsetY) / game.zoom;

    game.zoom = newZoom;
    game.offsetX = mx - wx * game.zoom;
    game.offsetY = my - wy * game.zoom;

    pinchDist = newPinchDist;
    updateMapTransform();
  }
};

window.onmouseup = function() {
  isDragging = false;
  mapEditor.draggedTown = null;
};

window.ontouchend = function(e) {
  if (e.touches.length === 0) {
    isDragging = false;
    mapEditor.draggedTown = null;
    pinchDist = 0;
  }
};

map.onwheel = function(e) {
  e.preventDefault();
  const newZoom = Math.min(Math.max(0.5, game.zoom - e.deltaY * 0.001), 3);
  const rect = map.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const wx = (mx - game.offsetX) / game.zoom, wy = (my - game.offsetY) / game.zoom;
  game.zoom = newZoom;
  game.offsetX = mx - wx * game.zoom;
  game.offsetY = my - wy * game.zoom;
  updateMapTransform();
};
