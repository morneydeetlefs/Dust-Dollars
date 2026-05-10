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
