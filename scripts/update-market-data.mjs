import { mkdir, readFile, writeFile } from "node:fs/promises";

const symbols = ["SAF.PA", "TSLA", "SPCX", "NVDA", "PLTR"];
const outputPath = new URL("../data/markets.json", import.meta.url);

let previousData = { quotes: {} };
try {
  previousData = JSON.parse(await readFile(outputPath, "utf8"));
} catch {}

const quotes = { ...previousData.quotes };
for (const symbol of symbols) {
  const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const response = await fetch(endpoint, { headers: { "User-Agent": "YannDrive market updater" } });
  if (!response.ok) {
    console.warn(`${symbol}: HTTP ${response.status}, ancienne valeur conservée`);
    continue;
  }
  const result = (await response.json()).chart?.result?.[0];
  const meta = result?.meta;
  if (!Number.isFinite(meta?.regularMarketPrice)) {
    console.warn(`${symbol}: cours invalide, ancienne valeur conservée`);
    continue;
  }
  quotes[symbol] = {
    price: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose,
    currency: meta.currency,
    marketTime: meta.regularMarketTime
  };
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), source: "Yahoo Finance", quotes }, null, 2)}\n`);
