import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fetchHaropaBridges } from "../services/haropaBridges.mjs";

const outputPath = new URL("../data/bridges.json", import.meta.url);
const attemptedAt = new Date().toISOString();

let previousData = null;
try {
  previousData = JSON.parse(await readFile(outputPath, "utf8"));
} catch {}

let output;
try {
  const { bridges, endpoint } = await fetchHaropaBridges();
  output = {
    updated_at: attemptedAt,
    source: "HAROPA",
    source_endpoint: endpoint,
    stale: false,
    bridges
  };
  console.log(`[HAROPA] ${bridges.map((bridge) => `${bridge.name}=${bridge.status}`).join(", ")}`);
} catch (error) {
  console.error(`[HAROPA] récupération impossible: ${error.message}`);
  output = previousData?.bridges ? {
    ...previousData,
    stale: true,
    last_attempt_at: attemptedAt,
    error: "HAROPA data temporarily unavailable"
  } : {
    updated_at: attemptedAt,
    source: "HAROPA",
    stale: true,
    last_attempt_at: attemptedAt,
    error: "HAROPA data unavailable",
    bridges: []
  };
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

