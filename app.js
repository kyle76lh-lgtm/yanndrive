"use strict";

const $ = (id) => document.getElementById(id);
const ui = {
  headerMaxSpeed: $("headerMaxSpeed"), speed: $("speed"), speedBar: $("speedBar"),
  duration: $("duration"), averageSpeed: $("averageSpeed"), maxSpeed: $("maxSpeed"),
  acceleration: $("acceleration"), maxAcceleration: $("maxAcceleration"), maxDeceleration: $("maxDeceleration"),
  tripCost: $("tripCost"), tripDistance: $("tripDistance"), tripEnergy: $("tripEnergy"),
  tripConsumption: $("tripConsumption"), tripCostStatus: $("tripCostStatus"),
  tripElectricityRate: $("tripElectricityRate"),
  coordinates: $("coordinates"), accuracy: $("accuracy"), gpsStatus: $("gpsStatus"),
  statusDot: $("statusDot"), tripState: $("tripState"), tripDot: $("tripDot"),
  start: $("startButton"), stop: $("stopButton"), reset: $("resetButton"),
  mode67: $("mode67Button"), celebration67: $("celebration67"),
  fireworks67: $("fireworks67"),
  fullscreen: $("fullscreenButton"), toast: $("toast"), driveView: $("driveView"),
  infosView: $("infosView"), bridgesView: $("bridgesView"), driveControls: $("driveControls"), refreshInfos: $("refreshInfos"),
  teslaPrice: $("teslaPrice"), teslaChange: $("teslaChange"), teslaStatus: $("teslaStatus"),
  spacexPrice: $("spacexPrice"), spacexChange: $("spacexChange"), spacexStatus: $("spacexStatus"),
  safranPrice: $("safranPrice"), safranChange: $("safranChange"), safranStatus: $("safranStatus"),
  nvidiaPrice: $("nvidiaPrice"), nvidiaChange: $("nvidiaChange"), nvidiaStatus: $("nvidiaStatus"),
  palantirPrice: $("palantirPrice"), palantirChange: $("palantirChange"), palantirStatus: $("palantirStatus"),
  netflixPrice: $("netflixPrice"), netflixChange: $("netflixChange"), netflixStatus: $("netflixStatus"),
  iwdaPrice: $("iwdaPrice"), iwdaChange: $("iwdaChange"), iwdaStatus: $("iwdaStatus"),
  nextHighTide: $("nextHighTide"), tideDetail: $("tideDetail"), tideStatus: $("tideStatus"),
  tidesView: $("tidesView"), refreshTides: $("refreshTides"), nextLowTide: $("nextLowTide"), lowTideDetail: $("lowTideDetail"), tideRows: $("tideRows"),
  bridgesList: $("bridgesList"), bridgesFreshness: $("bridgesFreshness"), refreshBridges: $("refreshBridges")
};

const electricityRateStorageKey = "lhdrive-electricity-rate-eur-kwh";
const isValidElectricityRate = (value) => Number.isFinite(value) && value >= 0 && value <= 10;
const savedElectricityRate = localStorage.getItem(electricityRateStorageKey);
const consumptionStorageKey = "lhdrive-consumption-kwh-100km";
const isValidConsumption = (value) => Number.isFinite(value) && value >= 1 && value <= 100;
const savedConsumption = Number(localStorage.getItem(consumptionStorageKey));

const state = {
  running: false, demo: false, watchId: null, demoTimer: null, tickTimer: null,
  startedAt: null, elapsedBeforeStart: 0, distanceM: 0, lastPosition: null, tripPosition: null, currentPosition: null,
  currentSpeedKmh: 0, maxSpeedKmh: 0, autoMaxSpeedKmh: 0, demoMaxSpeedKmh: 0,
  motionSample: null, accelerationMps2: null, maxAccelerationMps2: 0, maxDecelerationMps2: 0,
  consumptionKwh100Km: isValidConsumption(savedConsumption) ? savedConsumption : 18,
  electricityRate: savedElectricityRate !== null && savedElectricityRate.trim() !== "" && isValidElectricityRate(Number(savedElectricityRate)) ? Number(savedElectricityRate) : 0.134,
  tripStarted: false, tripHasDemo: false,
  mode67: localStorage.getItem("yanndrive-mode-67") === "true", mode67Armed: true,
  celebrationTimer: null, bridgeData: null
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

let activeAppTab = "bridges";
function switchTab(name) {
  activeAppTab = name;
  document.querySelectorAll(".app-tab").forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  ui.driveView.classList.toggle("active", name === "drive");
  ui.infosView.classList.toggle("active", name === "infos");
  $("cryptosView").classList.toggle("active", name === "cryptos");
  if (name === "cryptos") loadCryptos();
  ui.bridgesView.classList.toggle("active", name === "bridges");

  ui.tidesView.classList.toggle("active", name === "tides");
  if (name === "tides") loadTide();
  ui.driveControls.hidden = name !== "drive";
  if (name !== "drive") $("tripSummary").hidden = true;
  if (name === "infos" && !ui.infosView.dataset.loaded) loadInfos();
  if (name === "bridges") loadBridges();
}

let marketDataPromise = null;

async function fetchFresh(path, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const separator = path.includes("?") ? "&" : "?";
      const response = await fetch(`${path}${separator}fresh=${Date.now()}-${attempt}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError;
}

function getMarketData() {
  marketDataPromise ||= fetchFresh("data/markets.json").then((response) => response.json());
  return marketDataPromise;
}

async function loadQuote(symbol, priceElement, changeElement, statusElement, currency, digits = 2, period = "aujourd’hui") {
  statusElement.textContent = "CHARGEMENT";
  statusElement.className = "live-badge";
  try {
    const data = await getMarketData();
    const quote = data.quotes?.[symbol];
    const price = quote?.price;
    const previous = quote?.previousClose;
    if (!Number.isFinite(price)) throw new Error("invalid quote");
    const change = Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : null;
    priceElement.textContent = new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: digits }).format(price);
    changeElement.textContent = change === null ? `${symbol} · ${currency}` : `${change >= 0 ? "+" : ""}${formatDecimal(change, 2)} % ${period}`;
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

let cryptosLoading = false;
async function loadCryptos() {
  if (cryptosLoading) return;
  cryptosLoading = true;
  $("refreshCryptos").disabled = true;
  marketDataPromise = null;
  try {
    await Promise.all(["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE"].map((symbol) =>
      loadQuote(`${symbol}-USD`, $(`${symbol}Price`), $(`${symbol}Change`), $(`${symbol}Status`), "USD", symbol === "DOGE" ? 4 : 2, "depuis la clôture UTC")
    ));
  } finally {
    cryptosLoading = false;
    $("refreshCryptos").disabled = false;
  }
}

const parisParts = (time) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
}).formatToParts(new Date(time)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
const parisDay = (time) => {
  const parts = parisParts(time);
  return `${parts.year}-${parts.month}-${parts.day}`;
};
function parisTimestamp(day, time) {
  const wall = Date.parse(`${day}T${time}:00Z`);
  let timestamp = wall;
  for (let i = 0; i < 2; i++) {
    const p = parisParts(timestamp);
    const parisWall = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    timestamp += wall - parisWall;
  }
  return timestamp;
}
function parseTides(csv) {
  return csv.trim().split(/\r?\n/).slice(1).map((row) => {
    const [day, port, , type, time, height, coefficient] = row.split(";");
    if (port !== "Le Havre" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time) || !["Pleine mer", "Basse mer"].includes(type)) return null;
    return { day, type, time, height: height?.trim() ? Number(height.replace(",", ".")) : null,
      coefficient: coefficient?.trim() ? Number(coefficient) : null, timestamp: parisTimestamp(day, time) };
  }).filter(Boolean).sort((a, b) => a.timestamp - b.timestamp);
}
let tideData = null;
let tidesLoading = false;
const tideDayLabel = (tide) => new Date(tide.timestamp).toLocaleDateString("fr-FR", {
  timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long"
});
const tideHeight = (tide) => Number.isFinite(tide.height) ? `${formatDecimal(tide.height, 2)} m` : "—";
const tideCoefficient = (tide) => Number.isFinite(tide.coefficient) ? String(tide.coefficient) : "—";
function renderTides(tides, now = Date.now()) {
  renderTideVisuals(tides, now);
  const today = parisDay(now);
  const tomorrow = parisDay(Date.parse(`${today}T12:00:00Z`) + 86400000);
  for (const [type, timeElement, detailElement] of [
    ["Pleine mer", ui.nextHighTide, ui.tideDetail], ["Basse mer", ui.nextLowTide, ui.lowTideDetail]
  ]) {
    const next = tides.find((tide) => tide.type === type && tide.timestamp >= now);
    timeElement.textContent = next ? next.time.replace(":", "h") : "Indisponible";
    detailElement.textContent = next ? `${tideDayLabel(next)} · ${tideHeight(next)}${next.coefficient !== null ? ` · coeff. ${tideCoefficient(next)}` : ""}` : "Aucun horaire futur dans la table 2026";
  }
  ui.tideRows.replaceChildren();
  const days = tides.filter((tide) => tide.day === today || tide.day === tomorrow);
  for (const tide of days) {
    const row = document.createElement("tr");
    if (tide.timestamp < now) row.className = "tide-past";
    for (const text of [tideDayLabel(tide), tide.type, `${tide.time}${tide.timestamp < now ? " · passée" : ""}`, tideHeight(tide), tideCoefficient(tide)]) {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.append(cell);
    }
    ui.tideRows.append(row);
  }
  if (!days.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Aucun horaire disponible pour aujourd’hui et demain dans la table 2026.";
    row.append(cell);
    ui.tideRows.append(row);
  }
  ui.tideStatus.textContent = `Table Le Havre 2026 · heures de Paris, heure d’été/hiver comprise${days.length ? "" : " · période non couverte"}`;
}
function renderTideVisuals(tides, now) {
  const next = tides.find((tide) => tide.timestamp >= now);
  const previous = tides.filter((tide) => tide.timestamp < now).slice(-1)[0];
  $("tidePhase").textContent = previous && next ? (next.type === "Pleine mer" ? "La mer monte" : "La mer descend") : "Horaires indisponibles";
  if (next) {
    const minutes = Math.ceil((next.timestamp - now) / 60000);
    $("tideCountdown").textContent = `${next.type} dans ${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} · ${next.time.replace(":", "h")}`;
  } else $("tideCountdown").textContent = "Aucune prochaine marée dans la table 2026.";
  const timeline = $("tideTimeline");
  timeline.replaceChildren();
  const today = parisDay(now);
  const tomorrow = parisDay(Date.parse(`${today}T12:00:00Z`) + 86400000);
  for (const day of [today, tomorrow]) {
    const events = tides.filter((tide) => tide.day === day);
    const group = document.createElement("section");
    group.className = "tide-day";
    const heading = document.createElement("h3");
    heading.textContent = day === today ? "Aujourd’hui" : "Demain";
    group.append(heading);
    const cards = document.createElement("div");
    cards.className = "tide-events";
    for (const tide of events) {
      const card = document.createElement("article");
      card.className = `tide-event ${tide.type === "Pleine mer" ? "high" : "low"}${tide.timestamp < now ? " past" : ""}${tide === next ? " next" : ""}`;
      for (const [tag, text] of [["span", tide.type === "Pleine mer" ? "↗ PLEINE MER" : "↘ BASSE MER"], ["strong", tide.time.replace(":", "h")], ["p", tideHeight(tide)], ["small", tide.coefficient !== null ? `Coefficient ${tideCoefficient(tide)}` : "Coefficient —"], ["small", tide === next ? "PROCHAINE MARÉE" : tide.timestamp < now ? "PASSÉE" : "À VENIR"]]) {
        const item = document.createElement(tag);
        item.textContent = text;
        card.append(item);
      }
      cards.append(card);
    }
    if (!events.length) { const empty = document.createElement("p"); empty.textContent = "Aucun horaire disponible."; cards.append(empty); }
    group.append(cards);
    timeline.append(group);
  }
}
async function loadTide() {
  if (tidesLoading) return;
  tidesLoading = true;
  ui.refreshTides.disabled = true;
  ui.tideStatus.textContent = "Chargement des horaires…";
  try {
    if (!tideData) {
      const response = await fetchFresh("data/tides-le-havre-2026.csv");
      tideData = parseTides(await response.text());
      if (!tideData.length) { tideData = null; throw new Error("empty tide table"); }
    }
    renderTides(tideData);
  } catch {
    for (const element of [ui.nextHighTide, ui.nextLowTide]) element.textContent = "Indisponible";
    for (const element of [ui.tideDetail, ui.lowTideDetail]) element.textContent = "Réessayez avec Actualiser.";
    ui.tideRows.replaceChildren();
    ui.tideStatus.textContent = "Table des marées du Havre indisponible.";
    $("tidePhase").textContent = "Marées indisponibles";
    $("tideCountdown").textContent = "Réessayez avec Actualiser.";
    $("tideTimeline").replaceChildren();
  } finally {
    tidesLoading = false;
    ui.refreshTides.disabled = false;
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
    loadQuote("NFLX", ui.netflixPrice, ui.netflixChange, ui.netflixStatus, "USD"),
    loadQuote("IWDA.AS", ui.iwdaPrice, ui.iwdaChange, ui.iwdaStatus, "EUR"),
    loadQuote("GC=F", $("goldPrice"), $("goldChange"), $("goldStatus"), "USD")
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

function sortBridgesByDistance(bridges) {
  if (!state.currentPosition) return;
  const bridgesById = new Map(bridges.map((bridge) => [bridge.id, bridge]));
  const currentRows = [...ui.bridgesList.querySelectorAll("[data-bridge-id]")];
  const sortedRows = [...currentRows].sort((firstRow, secondRow) => {
    const first = bridgesById.get(firstRow.dataset.bridgeId);
    const second = bridgesById.get(secondRow.dataset.bridgeId);
    const firstDistance = Number.isFinite(first?.latitude) && Number.isFinite(first?.longitude)
      ? haversine(state.currentPosition, first)
      : Infinity;
    const secondDistance = Number.isFinite(second?.latitude) && Number.isFinite(second?.longitude)
      ? haversine(state.currentPosition, second)
      : Infinity;
    return firstDistance - secondDistance;
  });
  if (sortedRows.some((row, index) => row !== currentRows[index])) {
    sortedRows.forEach((row) => ui.bridgesList.append(row));
  }
}

function renderBridges(data) {
  const updatedAt = new Date(data.updated_at).getTime();
  const age = Number.isFinite(updatedAt) ? Date.now() - updatedAt : Infinity;
  const tooOld = data.stale || age > 10 * 60 * 1000;
  const bridges = new Map((data.bridges || []).map((bridge) => [bridge.id, bridge]));
  state.bridgeData = data.bridges || [];

  ui.bridgesList.querySelectorAll("[data-bridge-id]").forEach((row) => {
    const bridge = bridges.get(row.dataset.bridgeId);
    const status = tooOld ? "unknown" : bridge?.status || "unknown";
    row.className = `bridge-row ${status}`;
    row.querySelector(".bridge-status").textContent = bridgeStatusLabels[status];
  });
  sortBridgesByDistance(state.bridgeData);

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
  const maxKey = state.demo ? "demoMaxSpeedKmh" : "autoMaxSpeedKmh";
  state[maxKey] = Math.max(state[maxKey], state.currentSpeedKmh);
  ui.headerMaxSpeed.textContent = Math.round(state[maxKey]);
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

function renderTripSummary() {
  const elapsed = elapsedSeconds();
  const km = state.distanceM / 1000;
  const energy = km * state.consumptionKwh100Km / 100;
  $("summaryDistance").textContent = formatDecimal(km, 2);
  $("summaryDuration").textContent = formatTime(elapsed);
  $("summaryAverage").textContent = elapsed > 0 ? Math.round(km / (elapsed / 3600)) : "0";
  $("summaryMax").textContent = Math.round(state.maxSpeedKmh);
  $("summaryCost").textContent = formatDecimal(energy * state.electricityRate, 2) + " €";
  $("summaryEnergy").textContent = formatDecimal(energy, 2) + " kWh estimés";
  $("summaryContext").textContent = state.tripHasDemo
    ? "Mode démo · ce bilan contient une distance fictive."
    : state.distanceM === 0 ? "Aucune distance GPS enregistrée pour ce trajet."
    : "Trajet arrêté · les compteurs sont conservés.";
  $("summaryBadge").textContent = km >= 200 ? "🧭 Grand voyageur"
    : km >= 50 ? "🌍 Au-delà du quotidien"
    : km > 0 ? "✨ Explorateur du quotidien" : "🚗 Prêt pour la prochaine sortie";
}

function showTripSummary() {
  renderTripSummary();
  const summary = $("tripSummary");
  summary.hidden = false;
  summary.classList.remove("summary-appear");
  void summary.offsetWidth;
  summary.classList.add("summary-appear");
  summary.scrollIntoView({ behavior: "auto", block: "start" });
}

function renderTrip() {
  if (state.motionSample && Date.now() - state.motionSample.receivedAt > 5000) state.accelerationMps2 = null;
  if (!$("tripSummary").hidden) renderTripSummary();
  const elapsed = elapsedSeconds();
  ui.duration.textContent = formatTime(elapsed);
  ui.averageSpeed.textContent = elapsed > 0 ? Math.round((state.distanceM / 1000) / (elapsed / 3600)) : "0";
  ui.acceleration.textContent = state.accelerationMps2 === null ? "—" : formatDecimal(state.accelerationMps2, 2);
  ui.maxAcceleration.textContent = formatDecimal(state.maxAccelerationMps2, 2);
  ui.maxDeceleration.textContent = formatDecimal(state.maxDecelerationMps2, 2);
  const distanceKm = state.distanceM / 1000;
  const energyKwh = distanceKm * state.consumptionKwh100Km / 100;
  ui.tripDistance.textContent = `${formatDecimal(distanceKm, 2)} km`;
  ui.tripEnergy.textContent = `${formatDecimal(energyKwh, 2)} kWh estimés`;
  ui.tripCost.textContent = `${formatDecimal(energyKwh * state.electricityRate, 2)} €`;
  ui.tripCostStatus.textContent = !state.tripStarted ? "En attente du démarrage."
    : state.distanceM === 0 ? "Aucune distance enregistrée : estimation en attente."
    : state.tripHasDemo ? "Simulation démo : ce total contient une distance fictive."
    : state.running ? "Estimation en cours · distance GPS enregistrée uniquement."
    : "Trajet arrêté · estimation conservée. Démarrer reprend ce trajet.";
}

function saveTripConsumption(value) {
  state.consumptionKwh100Km = value;
  localStorage.setItem(consumptionStorageKey, String(value));
  renderTrip();
}

function updateTripConsumption() {
  const value = Number(ui.tripConsumption.value);
  if (!isValidConsumption(value)) {
    ui.tripConsumption.value = String(state.consumptionKwh100Km);
    showToast("Saisissez une consommation entre 1 et 100 kWh/100 km.");
    return;
  }
  ui.tripConsumption.value = String(value);
  saveTripConsumption(value);
}

function saveTripElectricityRate(value) {
  state.electricityRate = value;
  localStorage.setItem(electricityRateStorageKey, String(value));
  renderTrip();
}

function updateTripElectricityRate() {
  const value = Number(ui.tripElectricityRate.value);
  if (ui.tripElectricityRate.value.trim() === "" || !isValidElectricityRate(value)) {
    ui.tripElectricityRate.value = String(state.electricityRate);
    showToast("Saisissez un tarif entre 0 et 10 €/kWh.");
    return;
  }
  ui.tripElectricityRate.value = String(value);
  saveTripElectricityRate(value);
}

function updateAcceleration(speedMps, timestamp, source) {
  const previous = state.motionSample;
  const seconds = previous ? (timestamp - previous.timestamp) / 1000 : 0;
  state.accelerationMps2 = null;
  if (speedMps !== null && previous && previous.source === source && seconds >= .25 && seconds <= 5) {
    const acceleration = (speedMps - previous.speedMps) / seconds;
    // Une rupture de signal ne doit pas devenir un record d'accélération.
    if (Math.abs(acceleration) <= 12) {
      state.accelerationMps2 = acceleration;
      if (state.running) {
        state.maxAccelerationMps2 = Math.max(state.maxAccelerationMps2, acceleration);
        state.maxDecelerationMps2 = Math.max(state.maxDecelerationMps2, -acceleration);
      }
    }
  }
  state.motionSample = speedMps === null ? null : { speedMps, timestamp, source, receivedAt: Date.now() };
}

function clearMotionSamples() {
  state.lastPosition = null;
  state.tripPosition = null;
  state.motionSample = null;
  state.accelerationMps2 = null;
}

function onPosition(position) {
  if (state.demo) return;
  const c = position.coords;
  if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude) || Math.abs(c.latitude) > 90 || Math.abs(c.longitude) > 180) return;
  const positionTime = Number(position.timestamp);
  const now = Number.isFinite(positionTime) && positionTime > 0 ? positionTime : Date.now();
  if (state.lastPosition && now <= state.lastPosition.timestamp) return;
  const reportedSpeed = Number.isFinite(c.speed) && c.speed >= 0 && c.speed <= 80 ? c.speed : null;
  const point = { latitude: c.latitude, longitude: c.longitude, timestamp: now, accuracy: c.accuracy, reportedSpeed };
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

  }

  // Garder un point de référence du trajet : les petits déplacements s'accumulent
  // au lieu d'être perdus à chaque nouvelle mesure GPS.
  if (state.running) {
    const anchor = state.tripPosition;
    const previous = state.lastPosition;
    const interval = previous ? (now - previous.timestamp) / 1000 : 0;
    const speedDistanceAvailable = previous && interval > 0 && interval <= 15
      && reportedSpeed !== null && previous.reportedSpeed !== null
      && Math.max(reportedSpeed, previous.reportedSpeed) >= .5;
    if (speedDistanceAvailable) {
      // La vitesse GPS peut être actualisée alors que les coordonnées sont figées.
      // Une seule source par intervalle : intégration de vitesse OU coordonnées.
      state.distanceM += (reportedSpeed + previous.reportedSpeed) * .5 * interval;
      state.tripPosition = point;
    } else if (anchor) {
      const seconds = (now - anchor.timestamp) / 1000;
      const segment = haversine(anchor, point);
      const accuracy = Number.isFinite(c.accuracy) ? c.accuracy : 0;
      const threshold = Math.max(2, Math.min(25, accuracy * .25));
      if (seconds > 0) {
        if (seconds > 120 || segment / seconds > 80) {
          // Ne pas relier une longue interruption ou un saut GPS au trajet.
          state.tripPosition = point;
        } else if (segment >= threshold) {
          state.distanceM += segment;
          state.tripPosition = point;
        }
      }
    } else {
      state.tripPosition = point;
    }
  }

  // Le navigateur Tesla peut exposer coords.speed à 0 même lorsque la voiture roule.
  // Dans ce cas, la vitesse calculée entre deux positions GPS sert de secours.
  let speedMps = reportedSpeed;
  let speedSource = "gps";
  if (derivedSpeed !== null && (speedMps === null || speedMps < .3)) {
    speedMps = derivedSpeed;
    speedSource = "coordinates";
  }
  updateAcceleration(speedMps, now, speedSource);
  speedMps ??= 0;
  state.lastPosition = point;
  state.currentPosition = point;

  if (state.bridgeData) sortBridgesByDistance(state.bridgeData);

  renderSpeed(speedMps * 3.6);
  ui.coordinates.textContent = `Latitude ${c.latitude.toFixed(5)} · Longitude ${c.longitude.toFixed(5)}`;
  ui.accuracy.textContent = `${Math.round(c.accuracy)} m`;
  setGpsStatus(c.accuracy <= 30 ? "SIGNAL GPS BON" : "SIGNAL GPS FAIBLE", c.accuracy <= 30 ? "good" : "");
  renderTrip();
}

function onGpsError(error) {
  clearMotionSamples();
  renderTrip();
  const labels = { 1: "AUTORISATION GPS REFUSÉE", 2: "GPS INDISPONIBLE", 3: "GPS SANS RÉPONSE" };
  setGpsStatus(labels[error.code] || "ERREUR GPS", "bad");
  showToast("La géolocalisation doit être autorisée pour utiliser LHdrive.");
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
  $("tripSummary").hidden = true;
  state.running = true;
  state.tripStarted = true;
  state.startedAt = Date.now();
  clearMotionSamples();
  ui.start.disabled = true;
  ui.stop.disabled = false;
  ui.tripState.textContent = "TRAJET EN COURS";
  ui.tripDot.classList.add("active");
  renderTrip();
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
  showTripSummary();
}

function resetTrip() {
  $("tripSummary").hidden = true;
  state.running = false;
  state.startedAt = null;
  state.elapsedBeforeStart = 0;
  state.distanceM = 0;
  state.tripStarted = false;
  state.tripHasDemo = false;
  state.maxSpeedKmh = 0;
  state.maxAccelerationMps2 = 0;
  state.maxDecelerationMps2 = 0;
  clearMotionSamples();
  ui.start.disabled = false;
  ui.stop.disabled = true;
  ui.tripState.textContent = "PRÊT";
  ui.tripDot.classList.remove("active");
  renderTrip();
  renderSpeed(0);
  showToast("Trajet réinitialisé");
}

$("closeSummary").addEventListener("click", () => { $("tripSummary").hidden = true; });
function resetVmax() {
  state[state.demo ? "demoMaxSpeedKmh" : "autoMaxSpeedKmh"] = 0;
  ui.headerMaxSpeed.textContent = "0";
  showToast("Vmax remise à zéro");
}
$("resetVmax").addEventListener("click", resetVmax);
ui.start.addEventListener("click", startTrip);
ui.stop.addEventListener("click", stopTrip);
ui.reset.addEventListener("click", resetTrip);
ui.tripConsumption.addEventListener("change", updateTripConsumption);
ui.tripElectricityRate.addEventListener("change", updateTripElectricityRate);
ui.tripElectricityRate.addEventListener("input", () => {
  const value = Number(ui.tripElectricityRate.value);
  if (ui.tripElectricityRate.value.trim() !== "" && isValidElectricityRate(value)) saveTripElectricityRate(value);
});
ui.tripConsumption.addEventListener("input", () => {
  const value = Number(ui.tripConsumption.value);
  if (isValidConsumption(value)) saveTripConsumption(value);
});

ui.mode67.addEventListener("click", toggleMode67);
document.querySelectorAll(".app-tab").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
ui.refreshInfos.addEventListener("click", loadInfos);
$("refreshCryptos").addEventListener("click", loadCryptos);
setInterval(() => { if ($("cryptosView").classList.contains("active")) loadCryptos(); }, 300000);
ui.refreshTides.addEventListener("click", loadTide);
setInterval(() => { if (ui.tidesView.classList.contains("active")) loadTide(); }, 60000);
ui.refreshBridges.addEventListener("click", () => loadBridges(true));
ui.fullscreen.addEventListener("click", async () => {
  try { document.fullscreenElement ? await document.exitFullscreen() : await document.documentElement.requestFullscreen(); }
  catch { showToast("Le plein écran n’est pas disponible ici."); }
});

state.tickTimer = setInterval(renderTrip, 1000);
setInterval(() => { if (ui.bridgesView.classList.contains("active")) loadBridges(); }, 25000);
ui.mode67.classList.toggle("active", state.mode67);
ui.mode67.setAttribute("aria-pressed", String(state.mode67));
ui.tripConsumption.value = String(state.consumptionKwh100Km);
ui.tripElectricityRate.value = String(state.electricityRate);
renderTrip();
switchTab("bridges");
requestGps();

