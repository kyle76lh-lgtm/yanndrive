"use strict";

const $ = (id) => document.getElementById(id);
const ui = {
  clock: $("clock"), speed: $("speed"), speedBar: $("speedBar"), distance: $("distance"),
  duration: $("duration"), averageSpeed: $("averageSpeed"), acceleration: $("acceleration"),
  coordinates: $("coordinates"), accuracy: $("accuracy"), gpsStatus: $("gpsStatus"),
  statusDot: $("statusDot"), tripState: $("tripState"), tripDot: $("tripDot"),
  start: $("startButton"), stop: $("stopButton"), reset: $("resetButton"),
  demo: $("demoButton"), mode67: $("mode67Button"), celebration67: $("celebration67"),
  fireworks67: $("fireworks67"),
  fullscreen: $("fullscreenButton"), toast: $("toast"), driveView: $("driveView"),
  engineView: $("engineView"), infosView: $("infosView"), driveControls: $("driveControls"), refreshInfos: $("refreshInfos"),
  engineToggle: $("engineToggle"), engineVolume: $("engineVolume"), engineVolumeValue: $("engineVolumeValue"),
  engineRpm: $("engineRpm"), rpmBar: $("rpmBar"), engineGear: $("engineGear"),
  gearCard: $("gearCard"), shiftStatus: $("shiftStatus"), engineAudioStatus: $("engineAudioStatus"),
  engineSourceNote: $("engineSourceNote"),
  teslaPrice: $("teslaPrice"), teslaChange: $("teslaChange"), teslaStatus: $("teslaStatus"),
  spacexPrice: $("spacexPrice"), spacexChange: $("spacexChange"), spacexStatus: $("spacexStatus"),
  safranPrice: $("safranPrice"), safranChange: $("safranChange"), safranStatus: $("safranStatus"),
  nvidiaPrice: $("nvidiaPrice"), nvidiaChange: $("nvidiaChange"), nvidiaStatus: $("nvidiaStatus"),
  palantirPrice: $("palantirPrice"), palantirChange: $("palantirChange"), palantirStatus: $("palantirStatus"),
  nextHighTide: $("nextHighTide"), tideDetail: $("tideDetail"), tideStatus: $("tideStatus")
};

const state = {
  running: false, demo: false, watchId: null, demoTimer: null, tickTimer: null,
  startedAt: null, elapsedBeforeStart: 0, distanceM: 0, lastPosition: null,
  lastSpeedMps: 0, lastSpeedAt: null, speedHistory: [], displayedAcceleration: 0,
  currentSpeedKmh: 0,
  mode67: localStorage.getItem("yanndrive-mode-67") === "true", mode67Armed: true,
  celebrationTimer: null
};

let fireworksFrame = null;
let engine = null;

class V12Engine {
  constructor() {
    this.context = null;
    this.master = null;
    this.oscillators = [];
    this.sources = [];
    this.sampleGains = [];
    this.buffers = null;
    this.sampleMode = false;
    this.loading = false;
    this.running = false;
    this.gear = 0;
    this.rpm = 0;
    this.volume = Number(ui.engineVolume.value) / 100;
  }

  async start() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error("Web Audio indisponible");
    this.context = this.context || new AudioContext();
    await this.context.resume();
    const now = this.context.currentTime;
    this.master = this.context.createGain();
    this.master.gain.setValueAtTime(0, now);
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 5;
    const highpass = this.context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 48;
    const presence = this.context.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 1100;
    presence.Q.value = .8;
    presence.gain.value = 5.5;
    const brightness = this.context.createBiquadFilter();
    brightness.type = "highshelf";
    brightness.frequency.value = 1900;
    brightness.gain.value = 7;
    const lowpass = this.context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 7200;
    lowpass.Q.value = .5;
    this.master.connect(highpass).connect(presence).connect(brightness).connect(lowpass).connect(compressor).connect(this.context.destination);

    try {
      await this.startSamples();
      this.sampleMode = true;
    } catch (error) {
      console.warn("Boucles moteur indisponibles, synthèse de secours utilisée.", error);
      this.startSynth();
      this.sampleMode = false;
    }

    this.running = true;
    this.master.gain.linearRampToValueAtTime(this.volume, this.context.currentTime + .5);
    this.update(state.currentSpeedKmh, true);
  }

  async startSamples() {
    if (!this.buffers) {
      const paths = Array.from({ length: 6 }, (_, index) => `assets/engine/loop_${index}.wav?v=4`);
      const responses = await Promise.all(paths.map((path) => fetch(new URL(path, window.location.href))));
      if (responses.some((response) => !response.ok)) throw new Error("Un fichier WAV n’a pas été chargé");
      const bytes = await Promise.all(responses.map((response) => response.arrayBuffer()));
      this.buffers = await Promise.all(bytes.map((data) => this.context.decodeAudioData(data)));
    }
    this.sources = this.buffers.map((buffer) => {
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain).connect(this.master);
      source.start();
      this.sampleGains.push(gain);
      return source;
    });
  }

  startSynth() {

    const voices = [
      { type: "sawtooth", ratio: 1, gain: .22 },
      { type: "square", ratio: .5, gain: .08 },
      { type: "triangle", ratio: 2.01, gain: .07 },
      { type: "sawtooth", ratio: 1.008, gain: .09 }
    ];
    this.oscillators = voices.map((voice) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = voice.type;
      gain.gain.value = voice.gain;
      oscillator.connect(gain).connect(this.master);
      oscillator.start();
      return { oscillator, ratio: voice.ratio };
    });
  }

  stop() {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + .35);
    const voices = this.oscillators;
    const sources = this.sources;
    setTimeout(() => {
      voices.forEach(({ oscillator }) => { try { oscillator.stop(); } catch {} });
      sources.forEach((source) => { try { source.stop(); } catch {} });
    }, 400);
    this.oscillators = [];
    this.sources = [];
    this.sampleGains = [];
    this.running = false;
  }

  setVolume(value) {
    this.volume = value;
    if (this.running && this.master) this.master.gain.setTargetAtTime(value, this.context.currentTime, .08);
  }

  playShiftTransient() {
    if (!this.context || !this.master) return;
    const duration = .16;
    const sampleCount = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      const envelope = Math.exp(-i / (sampleCount * .16));
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = "bandpass";
    filter.frequency.value = 240;
    filter.Q.value = 1.2;
    gain.gain.value = Math.min(.16, this.volume * .5);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start();
  }

  update(speedKmh, immediate = false) {
    const thresholds = [0, 18, 34, 54, 78, 108, 145];
    let gear = speedKmh < 2 ? 1 : 6;
    for (let i = 1; i < thresholds.length; i++) {
      if (speedKmh < thresholds[i]) { gear = i; break; }
    }
    const low = thresholds[gear - 1];
    const high = thresholds[gear] || 190;
    const progress = Math.max(0, Math.min(1, (speedKmh - low) / (high - low)));
    const rpm = speedKmh < 2 ? 850 : 2200 + progress * 5200;
    const changed = this.gear && gear !== this.gear;
    this.gear = gear;
    this.rpm = rpm;

    if (this.running && this.context) {
      const now = this.context.currentTime;
      if (this.sampleMode) {
        const sampleRpms = [850, 2100, 3400, 4700, 6000, 7400];
        let upper = sampleRpms.findIndex((sampleRpm) => sampleRpm >= rpm);
        if (upper < 0) upper = sampleRpms.length - 1;
        const lower = Math.max(0, upper - 1);
        const span = sampleRpms[upper] - sampleRpms[lower] || 1;
        const blend = Math.max(0, Math.min(1, (rpm - sampleRpms[lower]) / span));
        this.sampleGains.forEach((gain, index) => {
          let level = 0;
          if (index === lower) level = Math.cos(blend * Math.PI / 2) * 1.35;
          if (index === upper) level = Math.sin(blend * Math.PI / 2) * 1.35;
          if (lower === upper && index === lower) level = 1.35;
          gain.gain.setTargetAtTime(level, now, immediate ? .01 : .08);
          const rate = Math.max(.82, Math.min(1.18, rpm / sampleRpms[index]));
          this.sources[index].playbackRate.setTargetAtTime(rate, now, immediate ? .01 : .1);
        });
      } else {
        const firingFrequency = Math.max(65, rpm / 60 * 6);
        this.oscillators.forEach(({ oscillator, ratio }) => oscillator.frequency.setTargetAtTime(firingFrequency * ratio, now, immediate ? .01 : .09));
      }
      if (changed && this.master) {
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(this.master.gain.value, now);
        this.master.gain.linearRampToValueAtTime(this.volume * .1, now + .07);
        this.master.gain.setValueAtTime(this.volume * .1, now + .14);
        this.master.gain.linearRampToValueAtTime(this.volume, now + .46);
        this.playShiftTransient();
      }
    }
    renderEngine(rpm, gear, changed);
  }
}

function renderEngine(rpm, gear, shifting = false) {
  ui.engineRpm.textContent = Math.round(rpm / 50) * 50;
  ui.rpmBar.style.width = `${Math.min(100, rpm / 80)}%`;
  ui.engineGear.textContent = gear || "N";
  if (shifting) {
    ui.shiftStatus.textContent = "PASSAGE DE RAPPORT";
    ui.gearCard.classList.remove("shifting");
    void ui.gearCard.offsetWidth;
    ui.gearCard.classList.add("shifting");
    setTimeout(() => { ui.shiftStatus.textContent = "BOÎTE AUTO 6"; }, 500);
  }
}

async function toggleEngine() {
  engine ||= new V12Engine();
  if (engine.loading) return;
  if (engine.running) {
    engine.stop();
    ui.engineToggle.classList.remove("active");
    ui.engineToggle.innerHTML = "<span>▶</span>DÉMARRER LE V12";
    ui.engineAudioStatus.textContent = "MOTEUR COUPÉ";
    ui.engineAudioStatus.classList.remove("running");
    ui.engineSourceNote.textContent = "Moteur arrêté — les boucles WAV seront réactivées au prochain démarrage.";
    renderEngine(0, 0);
    return;
  }
  try {
    engine.loading = true;
    ui.engineToggle.disabled = true;
    ui.engineToggle.innerHTML = "CHARGEMENT DU MOTEUR…";
    ui.engineAudioStatus.textContent = "PRÉCHAUFFAGE";
    await engine.start();
    ui.engineToggle.classList.add("active");
    ui.engineToggle.innerHTML = "<span>■</span>COUPER LE V12";
    ui.engineAudioStatus.textContent = engine.sampleMode ? "AUDIO WAV ACTIF" : "SECOURS SYNTHÉTIQUE";
    ui.engineAudioStatus.classList.add("running");
    ui.engineSourceNote.textContent = engine.sampleMode
      ? "✓ Six enregistrements WAV CC0 sont chargés et mélangés en temps réel."
      : "⚠ Les WAV n’ont pas pu être lus : le synthétiseur de secours est utilisé.";
  } catch {
    showToast("Le navigateur ne permet pas de démarrer le son.");
    ui.engineToggle.innerHTML = "<span>▶</span>DÉMARRER LE V12";
    ui.engineAudioStatus.textContent = "MOTEUR COUPÉ";
  } finally {
    engine.loading = false;
    ui.engineToggle.disabled = false;
  }
}

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
  ui.engineView.classList.toggle("active", name === "engine");
  ui.infosView.classList.toggle("active", name === "infos");
  ui.driveControls.hidden = name !== "drive";
  if (name === "infos" && !ui.infosView.dataset.loaded) loadInfos();
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
    const endpoint = "https://marine-api.open-meteo.com/v1/marine?latitude=49.4938&longitude=0.1077&minutely_15=sea_level_height_msl&forecast_days=3&timezone=Europe%2FParis&cell_selection=sea";
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("tide unavailable");
    const data = await response.json();
    const times = data.minutely_15?.time || [];
    const levels = data.minutely_15?.sea_level_height_msl || [];
    const now = Date.now();
    let peak = null;
    for (let i = 1; i < levels.length - 1; i++) {
      const date = new Date(times[i]);
      if (date.getTime() > now && levels[i] > levels[i - 1] && levels[i] >= levels[i + 1]) { peak = { date, level: levels[i] }; break; }
    }
    if (!peak) throw new Error("no peak");
    const today = new Date().toDateString() === peak.date.toDateString();
    const day = today ? "Aujourd’hui" : peak.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
    const time = peak.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    ui.nextHighTide.textContent = time;
    ui.tideDetail.textContent = `${day} · niveau modélisé ${formatDecimal(peak.level, 2)} m`;
    ui.tideStatus.textContent = "PRÉVISION";
    ui.tideStatus.className = "live-badge ok";
  } catch {
    ui.nextHighTide.textContent = "Indisponible";
    ui.tideDetail.textContent = "Consulter les horaires officiels du SHOM";
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

function setGpsStatus(label, type = "") {
  ui.gpsStatus.textContent = label;
  ui.statusDot.className = `status-dot ${type}`;
}

function renderSpeed(kmh, acceleration = 0) {
  const previousSpeed = state.currentSpeedKmh;
  state.currentSpeedKmh = Math.max(0, kmh);
  ui.speed.textContent = Math.round(state.currentSpeedKmh);
  ui.speedBar.style.width = `${Math.min(100, state.currentSpeedKmh / 1.8)}%`;
  ui.acceleration.textContent = formatDecimal(acceleration, 1);
  if (state.mode67 && state.mode67Armed && previousSpeed < 67 && state.currentSpeedKmh >= 67) celebrate67();
  if (state.currentSpeedKmh < 62) state.mode67Armed = true;
  if (engine?.running) engine.update(state.currentSpeedKmh);
}

function calculateAcceleration(speedMps, timestamp) {
  state.speedHistory.push({ speed: speedMps, time: timestamp });
  state.speedHistory = state.speedHistory.filter((sample) => timestamp - sample.time <= 12000).slice(-10);
  if (state.speedHistory.length < 2) return 0;

  const firstTime = state.speedHistory[0].time;
  const points = state.speedHistory.map((sample) => ({
    time: (sample.time - firstTime) / 1000,
    speed: sample.speed
  }));
  const duration = points[points.length - 1].time;
  if (duration < .8) return state.displayedAcceleration;

  const meanTime = points.reduce((sum, point) => sum + point.time, 0) / points.length;
  const meanSpeed = points.reduce((sum, point) => sum + point.speed, 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point.time - meanTime) ** 2, 0);
  if (denominator === 0) return 0;
  const slope = points.reduce((sum, point) => sum + (point.time - meanTime) * (point.speed - meanSpeed), 0) / denominator;
  const filtered = state.displayedAcceleration * .45 + slope * .55;
  state.displayedAcceleration = Math.abs(filtered) < .035 ? 0 : Math.max(-9.9, Math.min(9.9, filtered));
  return state.displayedAcceleration;
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
  ui.distance.textContent = formatDecimal(state.distanceM / 1000, 2);
  ui.averageSpeed.textContent = elapsed > 0 ? Math.round((state.distanceM / 1000) / (elapsed / 3600)) : "0";
}

function onPosition(position) {
  const c = position.coords;
  const now = position.timestamp || Date.now();
  const point = { latitude: c.latitude, longitude: c.longitude, timestamp: now, accuracy: c.accuracy };
  let speedMps = Number.isFinite(c.speed) && c.speed >= 0 ? c.speed : null;

  if (state.lastPosition) {
    const seconds = (now - state.lastPosition.timestamp) / 1000;
    const segment = haversine(state.lastPosition, point);
    if (speedMps === null && seconds > 0) speedMps = segment / seconds;
    if (state.running && seconds > 0 && seconds < 30 && segment < 500 && segment > Math.max(2, c.accuracy * .25)) state.distanceM += segment;
  }

  speedMps ??= 0;
  const acceleration = calculateAcceleration(speedMps, now);
  state.lastSpeedMps = speedMps;
  state.lastSpeedAt = now;
  state.lastPosition = point;

  renderSpeed(speedMps * 3.6, acceleration);
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
  state.speedHistory = [];
  state.displayedAcceleration = 0;
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
  state.lastPosition = null;
  state.speedHistory = [];
  state.displayedAcceleration = 0;
  ui.start.disabled = false;
  ui.stop.disabled = true;
  ui.tripState.textContent = "PRÊT";
  ui.tripDot.classList.remove("active");
  renderTrip();
  renderSpeed(0, 0);
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
      const previous = state.currentSpeedKmh / 3.6;
      const current = kmh / 3.6;
      if (state.running) state.distanceM += current * .8;
      renderSpeed(kmh, (current - previous) / .8);
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
    state.speedHistory = [];
    state.displayedAcceleration = 0;
    renderSpeed(0, 0);
    requestGps();
    showToast("Retour au GPS réel");
  }
}

ui.start.addEventListener("click", startTrip);
ui.stop.addEventListener("click", stopTrip);
ui.reset.addEventListener("click", resetTrip);
ui.demo.addEventListener("click", toggleDemo);
ui.mode67.addEventListener("click", toggleMode67);
ui.engineToggle.addEventListener("click", toggleEngine);
ui.engineVolume.addEventListener("input", () => {
  const value = Number(ui.engineVolume.value);
  ui.engineVolumeValue.textContent = `${value} %`;
  if (engine) engine.setVolume(value / 100);
});
document.querySelectorAll(".app-tab").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
ui.refreshInfos.addEventListener("click", loadInfos);
ui.fullscreen.addEventListener("click", async () => {
  try { document.fullscreenElement ? await document.exitFullscreen() : await document.documentElement.requestFullscreen(); }
  catch { showToast("Le plein écran n’est pas disponible ici."); }
});

setInterval(() => { ui.clock.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }, 1000);
state.tickTimer = setInterval(renderTrip, 1000);
ui.clock.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
ui.mode67.classList.toggle("active", state.mode67);
ui.mode67.setAttribute("aria-pressed", String(state.mode67));
requestGps();
