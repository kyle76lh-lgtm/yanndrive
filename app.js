"use strict";

const $ = (id) => document.getElementById(id);
const ui = {
  clock: $("clock"), speed: $("speed"), speedBar: $("speedBar"),
  duration: $("duration"), averageSpeed: $("averageSpeed"), maxSpeed: $("maxSpeed"),
  coordinates: $("coordinates"), accuracy: $("accuracy"), gpsStatus: $("gpsStatus"),
  statusDot: $("statusDot"), tripState: $("tripState"), tripDot: $("tripDot"),
  start: $("startButton"), stop: $("stopButton"), reset: $("resetButton"),
  demo: $("demoButton"), mode67: $("mode67Button"), celebration67: $("celebration67"),
  fireworks67: $("fireworks67"),
  fullscreen: $("fullscreenButton"), toast: $("toast"), driveView: $("driveView"),
  infosView: $("infosView"), bridgesView: $("bridgesView"), driveControls: $("driveControls"), refreshInfos: $("refreshInfos"),
  teslaPrice: $("teslaPrice"), teslaChange: $("teslaChange"), teslaStatus: $("teslaStatus"),
  spacexPrice: $("spacexPrice"), spacexChange: $("spacexChange"), spacexStatus: $("spacexStatus"),
  safranPrice: $("safranPrice"), safranChange: $("safranChange"), safranStatus: $("safranStatus"),
  nvidiaPrice: $("nvidiaPrice"), nvidiaChange: $("nvidiaChange"), nvidiaStatus: $("nvidiaStatus"),
  palantirPrice: $("palantirPrice"), palantirChange: $("palantirChange"), palantirStatus: $("palantirStatus"),
  nextHighTide: $("nextHighTide"), tideDetail: $("tideDetail"), tideStatus: $("tideStatus"),
  bridgesList: $("bridgesList"), bridgesFreshness: $("bridgesFreshness"), refreshBridges: $("refreshBridges")
};

const state = {
  running: false, demo: false, watchId: null, demoTimer: null, tickTimer: null,
  startedAt: null, elapsedBeforeStart: 0, distanceM: 0, lastPosition: null,
  currentSpeedKmh: 0, maxSpeedKmh: 0,
  mode67: localStorage.getItem("yanndrive-mode-67") === "true", mode67Armed: true,
  celebrationTimer: null
};

let fireworksFrame = null;

function startFireworks() {
  const canvas = ui.fireworks67;
  const ctx = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * ratio);
  canvas.height = Math.round(innerHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const colors = ["#ffdd57", "#52e28d", "#77bfff", "#ff9f76"];
  const particles = [];
  const bursts = reducedMotion ? 1 : 7;
  for (let burst = 0; burst < bursts; burst++) {
    const x = innerWidth * (.1 + Math.random() * .8);
    const y = innerHeight * (.12 + Math.random() * .48);
    const count = reducedMotion ? 14 : 34;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * .08;
      const force = 65 + Math.random() * 85;
      particles.push({
        x, y, previousX: x, previousY: y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        color: colors[burst % colors.length],
        delay: reducedMotion ? 0 : burst * .34,
        life: reducedMotion ? 1.8 : 2.35,
        maxLife: reducedMotion ? 1.8 : 2.35
      });
    }
  }

  let previousTime = performance.now();
  const draw = (time) => {
    const dt = Math.min((time - previousTime) / 1000, .034);
    previousTime = time;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let active = false;
    for (const p of particles) {
      if (p.delay > 0) { p.delay -= dt; active = true; continue; }
      if (p.life <= 0) continue;
      active = true;
      p.previousX = p.x;
      p.previousY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 34 * dt;
      p.vx *= .992;
      p.life -= dt;
      const alpha = Math.min(.95, Math.max(0, p.life / p.maxLife));
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * .055, p.y - p.vy * .055);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = `${p.color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.stroke();
    }
    if (active) fireworksFrame = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  };
  cancelAnimationFrame(fireworksFrame);
  fireworksFrame = requestAnimationFrame(draw);
}

function stopFireworks() {
  cancelAnimationFrame(fireworksFrame);
  fireworksFrame = null;
  const ctx = ui.fireworks67.getContext("2d");
  ctx.clearRect(0, 0, ui.fireworks67.width, ui.fireworks67.height);
}

const formatDecimal = (value, digits) => value.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};
const elapsedSeconds = () => (state.elapsedBeforeStart + (state.running && state.startedAt ? Date.now() - state.startedAt : 0)) / 1000;

function haversine(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => ui.toast.classList.remove("show"), 2600);
}

function switchTab(name) {
  document.querySelectorAll(".app-tab").forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  ui.driveView.classList.toggle("active", name === "drive");
  ui.infosView.classList.toggle("active", name === "infos");
  ui.bridgesView.classList.toggle("active", name === "bridges");
  ui.driveControls.hidden = name !== "drive";
  if (name === "infos" && !ui.infosView.dataset.loaded) loadInfos();
  if (name === "bridges") loadBridges();
}

let marketDataPromise = null;

function getMarketData() {
  marketDataPromise ||= fetch(`data/markets.json?v=${Date.now()}`, { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("market data unavailable");
    return response.json();
  });
  return marketDataPromise;
}

async function loadQuote(symbol, priceElement, changeElement, statusElement, currency) {
  statusElement.textContent = "CHARGEMENT";
  statusElement.className = "live-badge";
  try {
    const data = await getMarketData();
    const quote = data.quotes?.[symbol];
    const price = quote?.price;
    const previous = quote?.previousClose;
    if (!Number.isFinite(price)) throw new Error("invalid quote");
    const change = Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : null;
    priceElement.textContent = new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 2 }).format(price);
    changeElement.textContent = change === null ? `${symbol} · ${currency}` : `${change >= 0 ? "+" : ""}${formatDecimal(change, 2)} % aujourd’hui`;
    changeElement.className = `info-detail ${change === null ? "" : change >= 0 ? "positive" : "negative"}`;
    statusElement.textContent = "COURS CHARGÉ";
    statusElement.className = "live-badge ok";
  } catch {
    priceElement.textContent = "Indisponible";
    changeElement.textContent = `${symbol} · prochaine actualisation automatique`;
    statusElement.textContent = "HORS LIGNE";
    statusElement.className = "live-badge error";
  }
}

async function loadTide() {
  ui.tideStatus.textContent = "CHARGEMENT";
  ui.tideStatus.className = "live-badge";
  try {
    const response = await fetch("data/tides-le-havre-2026.csv?v=1");
    if (!response.ok) throw new Error("tide unavailable");
    const rows = (await response.text()).trim().split(/\r?\n/).slice(1);
    const now = Date.now();
    const nextHighTide = rows
      .map((row) => {
        const [date, port, , type, time, height, coefficient] = row.split(";");
        return { date: new Date(`${date}T${time}:00`), port, type, time, height: Number(height), coefficient };
      })
      .find((tide) => tide.port === "Le Havre" && tide.type === "Pleine mer" && tide.date.getTime() > now);
    if (!nextHighTide) throw new Error("no upcoming high tide in 2026 table");
    const today = new Date().toDateString() === nextHighTide.date.toDateString();
    const day = today ? "Aujourd’hui" : nextHighTide.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const coefficient = nextHighTide.coefficient ? ` · coeff. ${nextHighTide.coefficient}` : "";
    ui.nextHighTide.textContent = nextHighTide.time.replace(":", "h");
    ui.tideDetail.textContent = `${day} · ${formatDecimal(nextHighTide.height, 2)} m${coefficient}`;
    ui.tideStatus.textContent = "TABLE LE HAVRE";
    ui.tideStatus.className = "live-badge ok";
  } catch {
    ui.nextHighTide.textContent = "Indisponible";
    ui.tideDetail.textContent = "Table des marées du Havre indisponible";
    ui.tideStatus.textContent = "HORS LIGNE";
    ui.tideStatus.className = "live-badge error";
  }
}

async function loadInfos() {
  ui.infosView.dataset.loaded = "true";
  marketDataPromise = null;
  ui.refreshInfos.disabled = true;
  await Promise.all([
    loadQuote("SAF.PA", ui.safranPrice, ui.safranChange, ui.safranStatus, "EUR"),
    loadQuote("TSLA", ui.teslaPrice, ui.teslaChange, ui.teslaStatus, "USD"),
    loadQuote("SPCX", ui.spacexPrice, ui.spacexChange, ui.spacexStatus, "USD"),
    loadQuote("NVDA", ui.nvidiaPrice, ui.nvidiaChange, ui.nvidiaStatus, "USD"),
    loadQuote("PLTR", ui.palantirPrice, ui.palantirChange, ui.palantirStatus, "USD"),
    loadTide()
  ]);
  ui.refreshInfos.disabled = false;
}

const bridgeStatusLabels = {
  open: "OUVERT",
  closing: "FERMETURE IMMINENTE",
  opening: "BIENTÔT OUVERT",
  closed: "FERMÉ",
  unknown: "ÉTAT INCONNU"
};

function describeAge(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (seconds < 60) return `Actualisé il y a ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Actualisé il y a ${minutes} min`;
  return `Actualisé il y a ${Math.floor(minutes / 60)} h`;
}

function renderBridges(data) {
  const updatedAt = new Date(data.updated_at).getTime();
  const age = Number.isFinite(updatedAt) ? Date.now() - updatedAt : Infinity;
  const tooOld = data.stale || age > 10 * 60 * 1000;
  const bridges = new Map((data.bridges || []).map((bridge) => [bridge.id, bridge]));

  ui.bridgesList.querySelectorAll("[data-bridge-id]").forEach((row) => {
    const bridge = bridges.get(row.dataset.bridgeId);
    const status = tooOld ? "unknown" : bridge?.status || "unknown";
    row.className = `bridge-row ${status}`;
    row.querySelector(".bridge-status").textContent = bridgeStatusLabels[status];
  });

  ui.bridgesFreshness.className = `bridges-freshness ${tooOld ? "stale" : "fresh"}`;
  ui.bridgesFreshness.querySelector("strong").textContent = tooOld
    ? `DONNÉES ANCIENNES · ${describeAge(age)}`
    : `${describeAge(age)} · SOURCE HAROPA`;
}

let bridgesLoading = false;
async function loadBridges(manual = false) {
  if (bridgesLoading) return;
  bridgesLoading = true;
  ui.refreshBridges.disabled = true;
  if (manual) ui.refreshBridges.textContent = "↻ ACTUALISATION…";
  try {
    let response;
    try {
      response = await fetch("https://yanndrive-bridges.yanndrive-bridges-worker.workers.dev/api/bridges", { cache: "no-store" });
      if (!response.ok) throw new Error("worker unavailable");
    } catch {
      response = await fetch(`data/bridges.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("bridge data unavailable");
    }
    const data = await response.json();
    renderBridges(data);
    if (manual) {
      ui.refreshBridges.textContent = "✓ À JOUR";
      showToast("État des ponts actualisé");
    }
  } catch {
    ui.bridgesList.querySelectorAll("[data-bridge-id]").forEach((row) => {
      row.className = "bridge-row unknown";
      row.querySelector(".bridge-status").textContent = bridgeStatusLabels.unknown;
    });
    ui.bridgesFreshness.className = "bridges-freshness error";
    ui.bridgesFreshness.querySelector("strong").textContent = "DONNÉES HAROPA INDISPONIBLES";
  } finally {
    bridgesLoading = false;
    ui.refreshBridges.disabled = false;
    if (!manual) ui.refreshBridges.textContent = "↻ ACTUALISER";
    else setTimeout(() => { ui.refreshBridges.textContent = "↻ ACTUALISER"; }, 1500);
  }
}

function setGpsStatus(label, type = "") {
  ui.gpsStatus.textContent = label;
  ui.statusDot.className = `status-dot ${type}`;
}

function renderSpeed(kmh) {
  const previousSpeed = state.currentSpeedKmh;
  state.currentSpeedKmh = Math.max(0, kmh);
  ui.speed.textContent = Math.round(state.currentSpeedKmh);
  ui.speedBar.style.width = `${Math.min(100, state.currentSpeedKmh / 1.8)}%`;
  if (state.running) {
    state.maxSpeedKmh = Math.max(state.maxSpeedKmh, state.currentSpeedKmh);
  }
  ui.maxSpeed.textContent = Math.round(state.maxSpeedKmh);
  if (state.mode67 && state.mode67Armed && previousSpeed < 67 && state.currentSpeedKmh >= 67) celebrate67();
  if (state.currentSpeedKmh < 62) state.mode67Armed = true;
}

function celebrate67() {
  state.mode67Armed = false;
  clearTimeout(state.celebrationTimer);
  ui.celebration67.classList.add("show");
  ui.celebration67.setAttribute("aria-hidden", "false");
  startFireworks();
  state.celebrationTimer = setTimeout(() => {
    ui.celebration67.classList.remove("show");
    ui.celebration67.setAttribute("aria-hidden", "true");
    stopFireworks();
  }, 3000);
}

function toggleMode67() {
  state.mode67 = !state.mode67;
  state.mode67Armed = state.currentSpeedKmh < 67;
  ui.mode67.classList.toggle("active", state.mode67);
  ui.mode67.setAttribute("aria-pressed", String(state.mode67));
  localStorage.setItem("yanndrive-mode-67", String(state.mode67));
  showToast(`Mode 67 ${state.mode67 ? "activé" : "désactivé"}`);
}

function renderTrip() {
  const elapsed = elapsedSeconds();
  ui.duration.textContent = formatTime(elapsed);
  ui.averageSpeed.textContent = elapsed > 0 ? Math.round((state.distanceM / 1000) / (elapsed / 3600)) : "0";
}

function onPosition(position) {
  const c = position.coords;
  const positionTime = Number(position.timestamp);
  const now = Number.isFinite(positionTime) && positionTime > 0 ? positionTime : Date.now();
  const point = { latitude: c.latitude, longitude: c.longitude, timestamp: now, accuracy: c.accuracy };
  const reportedSpeed = Number.isFinite(c.speed) && c.speed >= 0 ? c.speed : null;
  let derivedSpeed = null;

  if (state.lastPosition) {
    const seconds = (now - state.lastPosition.timestamp) / 1000;
    const segment = haversine(state.lastPosition, point);
    const previousAccuracy = Number.isFinite(state.lastPosition.accuracy) ? state.lastPosition.accuracy : c.accuracy;
    const movementThreshold = Math.max(1, Math.max(previousAccuracy, c.accuracy) * .08);
    if (seconds >= .25 && seconds < 15 && segment >= movementThreshold) {
      const candidate = segment / seconds;
      if (candidate <= 80) derivedSpeed = candidate;
    }
    if (state.running && seconds > 0 && seconds < 30 && segment < 500 && segment > Math.max(2, c.accuracy * .25)) state.distanceM += segment;
  }

  // Le navigateur Tesla peut exposer coords.speed à 0 même lorsque la voiture roule.
  // Dans ce cas, la vitesse calculée entre deux positions GPS sert de secours.
  let speedMps = reportedSpeed;
  if (derivedSpeed !== null && (speedMps === null || speedMps < .3)) speedMps = derivedSpeed;
  speedMps ??= 0;
  state.lastPosition = point;

  renderSpeed(speedMps * 3.6);
  ui.coordinates.textContent = `Latitude ${c.latitude.toFixed(5)} · Longitude ${c.longitude.toFixed(5)}`;
  ui.accuracy.textContent = `${Math.round(c.accuracy)} m`;
  setGpsStatus(c.accuracy <= 30 ? "SIGNAL GPS BON" : "SIGNAL GPS FAIBLE", c.accuracy <= 30 ? "good" : "");
  renderTrip();
}

function onGpsError(error) {
  const labels = { 1: "AUTORISATION GPS REFUSÉE", 2: "GPS INDISPONIBLE", 3: "GPS SANS RÉPONSE" };
  setGpsStatus(labels[error.code] || "ERREUR GPS", "bad");
  showToast("La géolocalisation doit être autorisée pour utiliser YannDrive.");
}

function requestGps() {
  if (!navigator.geolocation) {
    setGpsStatus("GPS NON PRIS EN CHARGE", "bad");
    return;
  }
  setGpsStatus("RECHERCHE DU SIGNAL…");
  state.watchId = navigator.geolocation.watchPosition(onPosition, onGpsError, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
}

function startTrip() {
  if (state.running) return;
  state.running = true;
  state.startedAt = Date.now();
  state.lastPosition = null;
  ui.start.disabled = true;
  ui.stop.disabled = false;
  ui.tripState.textContent = "TRAJET EN COURS";
  ui.tripDot.classList.add("active");
  showToast("Trajet démarré");
}

function stopTrip() {
  if (!state.running) return;
  state.elapsedBeforeStart += Date.now() - state.startedAt;
  state.startedAt = null;
  state.running = false;
  ui.start.disabled = false;
  ui.stop.disabled = true;
  ui.tripState.textContent = "EN PAUSE";
  ui.tripDot.classList.remove("active");
  renderTrip();
}

function resetTrip() {
  state.running = false;
  state.startedAt = null;
  state.elapsedBeforeStart = 0;
  state.distanceM = 0;
  state.maxSpeedKmh = 0;
  state.lastPosition = null;
  ui.start.disabled = false;
  ui.stop.disabled = true;
  ui.tripState.textContent = "PRÊT";
  ui.tripDot.classList.remove("active");
  renderTrip();
  renderSpeed(0);
  showToast("Trajet réinitialisé");
}

function toggleDemo() {
  state.demo = !state.demo;
  ui.demo.classList.toggle("active", state.demo);
  if (state.demo) {
    if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
    let t = 0;
    state.demoTimer = setInterval(() => {
      t += .8;
      const kmh = Math.max(0, Math.min(118, 54 + 42 * Math.sin(t / 6) + 14 * Math.sin(t / 2.3)));
      const current = kmh / 3.6;
      if (state.running) state.distanceM += current * .8;
      renderSpeed(kmh);
      ui.coordinates.textContent = "Latitude 49.49437 · Longitude 0.10793";
      ui.accuracy.textContent = "6 m";
      setGpsStatus("MODE DÉMO", "good");
      renderTrip();
    }, 800);
    showToast("Mode démo activé");
  } else {
    clearInterval(state.demoTimer);
    state.demoTimer = null;
    state.lastPosition = null;
    renderSpeed(0);
    requestGps();
    showToast("Retour au GPS réel");
  }
}

ui.start.addEventListener("click", startTrip);
ui.stop.addEventListener("click", stopTrip);
ui.reset.addEventListener("click", resetTrip);
ui.demo.addEventListener("click", toggleDemo);
ui.mode67.addEventListener("click", toggleMode67);
document.querySelectorAll(".app-tab").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
ui.refreshInfos.addEventListener("click", loadInfos);
ui.refreshBridges.addEventListener("click", () => loadBridges(true));
ui.fullscreen.addEventListener("click", async () => {
  try { document.fullscreenElement ? await document.exitFullscreen() : await document.documentElement.requestFullscreen(); }
  catch { showToast("Le plein écran n’est pas disponible ici."); }
});

setInterval(() => { ui.clock.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }, 1000);
state.tickTimer = setInterval(renderTrip, 1000);
setInterval(() => { if (ui.bridgesView.classList.contains("active")) loadBridges(); }, 25000);
ui.clock.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
ui.mode67.classList.toggle("active", state.mode67);
ui.mode67.setAttribute("aria-pressed", String(state.mode67));
requestGps();
