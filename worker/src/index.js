const HAROPA_BRIDGES_URL = "https://www.havre-port.com/map/getPonts";
const HAROPA_WAZE_URL = "https://www.havre-port.com/waze/incidents";
const FRESH_SECONDS = 25;
const STALE_SECONDS = 300;

const bridgeDefinitions = [
  { id: "pont_rouge", name: "Pont Rouge", haropaName: "pont rouge", wazeId: "PTRO" },
  { id: "pont_7", name: "Pont 7", haropaName: "pont 7", wazeId: "PT7" },
  { id: "pont_7_bis", name: "Pont 7 bis", haropaName: "pont 7 bis", wazeId: "PT7B" },
  { id: "pont_8", name: "Pont 8", haropaName: "pont 8", wazeId: "PT8" },
  { id: "quinette_amont", name: "Pont Quinette amont", haropaName: "pont amont quinette", wazeId: "QUIAMPT" },
  { id: "quinette_aval", name: "Pont Quinette aval", haropaName: "pont aval quinette", wazeId: "QUIAVPT" }
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function comparable(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function normalizeStatus(status, text = "") {
  const label = comparable(text);
  if (status === 0 || label.includes("ouvert aux vehicules") && !label.includes("bientot")) return "open";
  if (status === 2 || label.includes("fermeture imminente")) return "closing";
  if (status === 11 || label.includes("bientot ouvert")) return "opening";
  if (status === 1 || status === 3 || label.includes("ferme")) return "closed";
  return "unknown";
}

function normalizePonts(payload) {
  const records = Object.values(payload?.data || {});
  return bridgeDefinitions.map((definition) => {
    const record = records.find((item) => comparable(item?.nom) === definition.haropaName);
    return { id: definition.id, name: definition.name, status: record ? normalizeStatus(record.statut, record.statutText) : "unknown" };
  });
}

function normalizeWaze(payload) {
  const now = Date.now();
  return bridgeDefinitions.map((definition) => {
    const incident = (payload?.incidents || []).find((item) => {
      const incidentId = String(item?.id || "").split("-")[0];
      const end = item?.endtime ? new Date(item.endtime).getTime() : Infinity;
      return incidentId === definition.wazeId && end > now;
    });
    const normalized = incident ? normalizeStatus(null, incident.description) : "open";
    return { id: definition.id, name: definition.name, status: incident && normalized === "unknown" ? "closed" : normalized };
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "YannDrive bridge worker" },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`HAROPA HTTP ${response.status}`);
  return response.json();
}

async function fetchHaropa() {
  try {
    const bridges = normalizePonts(await fetchJson(HAROPA_BRIDGES_URL));
    if (bridges.every((bridge) => bridge.status === "unknown")) throw new Error("HAROPA payload incompatible");
    return { endpoint: "ponts", bridges };
  } catch (error) {
    console.warn("HAROPA ponts failed, using Waze", error.message);
    return { endpoint: "waze", bridges: normalizeWaze(await fetchJson(HAROPA_WAZE_URL)) };
  }
}

function responseFrom(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function readCache(cache, key) {
  const response = await cache.match(key);
  return response ? response.json() : null;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    const url = new URL(request.url);
    if (request.method !== "GET" || !["/", "/api/bridges"].includes(url.pathname)) {
      return responseFrom({ error: "Not found" }, 404);
    }

    const cache = caches.default;
    const freshKey = new Request(`${url.origin}/internal/bridges-fresh`);
    const staleKey = new Request(`${url.origin}/internal/bridges-stale`);
    const fresh = await readCache(cache, freshKey);
    if (fresh) return responseFrom({ ...fresh, cache: "hit" });

    try {
      const { endpoint, bridges } = await fetchHaropa();
      const data = { updated_at: new Date().toISOString(), source: "HAROPA", source_endpoint: endpoint, stale: false, cache: "miss", bridges };
      const serialized = JSON.stringify(data);
      ctx.waitUntil(Promise.all([
        cache.put(freshKey, new Response(serialized, { headers: { "Cache-Control": `max-age=${FRESH_SECONDS}`, "Content-Type": "application/json" } })),
        cache.put(staleKey, new Response(serialized, { headers: { "Cache-Control": `max-age=${STALE_SECONDS}`, "Content-Type": "application/json" } }))
      ]));
      return responseFrom(data);
    } catch (error) {
      console.error("HAROPA unavailable", error.message);
      const stale = await readCache(cache, staleKey);
      if (stale) return responseFrom({ ...stale, stale: true, cache: "stale", error: "HAROPA temporarily unavailable" });
      return responseFrom({ updated_at: new Date().toISOString(), source: "HAROPA", stale: true, cache: "none", error: "HAROPA unavailable", bridges: [] }, 503);
    }
  }
};
