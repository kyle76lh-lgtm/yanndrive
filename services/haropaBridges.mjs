const HAROPA_BRIDGES_URL = "https://www.havre-port.com/map/getPonts";
const HAROPA_WAZE_URL = "https://www.havre-port.com/waze/incidents";

export const bridgeDefinitions = [
  { id: "pont_rouge", name: "Pont Rouge", haropaName: "pont rouge", wazeId: "PTRO" },
  { id: "pont_7", name: "Pont 7", haropaName: "pont 7", wazeId: "PT7" },
  { id: "pont_7_bis", name: "Pont 7 bis", haropaName: "pont 7 bis", wazeId: "PT7B" },
  { id: "pont_8", name: "Pont 8", haropaName: "pont 8", wazeId: "PT8" }
];

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

export function normalizePontsPayload(payload) {
  const records = Object.values(payload?.data || {});
  return bridgeDefinitions.map((definition) => {
    const record = records.find((item) => comparable(item?.nom) === definition.haropaName);
    return {
      id: definition.id,
      name: definition.name,
      status: record ? normalizeStatus(record.statut, record.statutText) : "unknown"
    };
  });
}

export function normalizeWazePayload(payload, now = Date.now()) {
  const incidents = payload?.incidents || [];
  return bridgeDefinitions.map((definition) => {
    const incident = incidents.find((item) => {
      const incidentId = String(item?.id || "").split("-")[0];
      const end = item?.endtime ? new Date(item.endtime).getTime() : Infinity;
      return incidentId === definition.wazeId && end > now;
    });
    return {
      id: definition.id,
      name: definition.name,
      status: incident ? normalizeStatus(null, incident.description) === "unknown" ? "closed" : normalizeStatus(null, incident.description) : "open"
    };
  });
}

async function fetchJson(url, timeoutMs = 10000) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "YannDrive bridge updater" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

export async function fetchHaropaBridges() {
  try {
    const payload = await fetchJson(HAROPA_BRIDGES_URL);
    const bridges = normalizePontsPayload(payload);
    if (bridges.every((bridge) => bridge.status === "unknown")) throw new Error("HAROPA bridge payload is empty or incompatible");
    return { bridges, endpoint: "ponts" };
  } catch (primaryError) {
    console.warn(`[HAROPA] API ponts indisponible: ${primaryError.message}; tentative Waze`);
    const payload = await fetchJson(HAROPA_WAZE_URL);
    return { bridges: normalizeWazePayload(payload), endpoint: "waze" };
  }
}

