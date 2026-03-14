import "dotenv/config";
import fs from "fs";
import path from "path";
import { setGlobalDispatcher, Agent } from "undici";
import { upsertAllegroReturn } from "../../modules/returns/returns.core.js";

setGlobalDispatcher(new Agent({ connect: { family: 4 } }));

const API_URL = process.env.ALLEGRO_API_URL || "https://api.allegro.pl";
const TOKEN_FILE = path.resolve(process.cwd(), process.env.ALLEGRO_TOKEN_FILE || ".allegro_token.json");
const ALLEGRO_ACCEPT = "application/vnd.allegro.beta.v1+json";
const ALLEGRO_LANG = process.env.ALLEGRO_ACCEPT_LANGUAGE || "pl-PL";

function readTokenFile() {
  if (!fs.existsSync(TOKEN_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")) || {}; }
  catch { return {}; }
}

function writeTokenFile(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function cliDateOrYesterday() {
  const arg = process.argv.find(a => a.startsWith("--date="));
  if (arg) return arg.split("=")[1];
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function rangeForDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m-1, d, 0, 0, 0)).toISOString(),
    end:   new Date(Date.UTC(y, m-1, d+1, 0, 0, 0)).toISOString(),
  };
}

async function refreshAccessToken(refreshToken) {
  const basic = Buffer.from(`${process.env.ALLEGRO_CLIENT_ID}:${process.env.ALLEGRO_CLIENT_SECRET}`).toString("base64");
  const resp = await fetch("https://allegro.pl/auth/oauth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status}`);
  return data;
}

async function getAccessToken() {
  const tokens = readTokenFile();
  if (tokens.access_token && tokens.expires_at && Date.now() < tokens.expires_at - 60000) return tokens.access_token;
  if (tokens.access_token && !tokens.expires_at) return tokens.access_token;
  if (!tokens.refresh_token) throw new Error(`Brak tokenów w ${TOKEN_FILE}`);
  const refreshed = await refreshAccessToken(tokens.refresh_token);
  const newTokens = { ...tokens, access_token: refreshed.access_token, refresh_token: refreshed.refresh_token || tokens.refresh_token, expires_at: Date.now() + Number(refreshed.expires_in || 0) * 1000 };
  writeTokenFile(newTokens);
  return newTokens.access_token;
}

async function allegroGet(url) {
  const accessToken = await getAccessToken();
  const headers = { Accept: ALLEGRO_ACCEPT, "Accept-Language": ALLEGRO_LANG, Authorization: `Bearer ${accessToken}` };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 30000);
      try {
        const resp = await fetch(url, { headers, signal: controller.signal });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(`Allegro GET ${resp.status}: ${JSON.stringify(data).slice(0, 400)}`);
        return data;
      } finally {
        clearTimeout(t);
      }
    } catch (e) {
      const code = e?.cause?.code || e?.code;
      const retryable = ["UND_ERR_CONNECT_TIMEOUT","UND_ERR_SOCKET","ECONNRESET","ETIMEDOUT","ENOTFOUND"].includes(code) || e?.name === "AbortError";
      if (!retryable || attempt === 3) throw e;
      await sleep(500 * attempt);
    }
  }
}

function pick(obj, keys) {
  for (const k of keys) { const v = obj?.[k]; if (v != null && v !== "") return v; }
  return null;
}

function mapDetail(detail) {
  const buyer = detail?.buyer || detail?.customer || {};
  const parcels = Array.isArray(detail?.parcels) ? detail.parcels : [];
  const firstParcel = parcels[0] || {};
  const itemsRaw = Array.isArray(detail?.items) ? detail.items : [];

  return {
    external_return_id: String(detail?.id ?? ""),
    order_number:       pick(detail?.order, ["id"]) || pick(detail, ["orderId","order_id"]) || null,
    customer_name:      pick(buyer, ["name"]) || [buyer?.firstName, buyer?.lastName].filter(Boolean).join(" ") || null,
    customer_email:     pick(buyer, ["email","buyerEmail"]) || null,
    customer_phone:     pick(buyer, ["phoneNumber","phone"]) || null,
    waybill:            pick(firstParcel, ["waybill","trackingNumber"]) || pick(detail, ["waybill"]) || null,
    carrier:            pick(firstParcel, ["carrierName","carrierId"]) || null,
    status_external:    pick(detail, ["status"]) || null,
    created_at_external: pick(detail, ["createdAt","created_at"]) || null,
    items: itemsRaw.map(it => ({
      product_name:    pick(it, ["name","offerName","productName"]) || null,
      quantity:        Number(pick(it, ["quantity"])) || 1,
      reason_type:     pick(it?.reason, ["id","type"]) || pick(it, ["reasonId","reason"]) || null,
      reason_comment:  pick(it, ["comment","note","reasonDescription"]) || null,
      price_amount:    it?.price?.amount != null ? Number(it.price.amount) : null,
      price_currency:  it?.price?.currency || "PLN",
    })),
  };
}

async function main() {
  const date = cliDateOrYesterday();
  const { start, end } = rangeForDate(date);
  const url = new URL(`${API_URL}/order/customer-returns`);
  url.searchParams.set("createdAt.gte", start);
  url.searchParams.set("createdAt.lte", end);
  url.searchParams.set("limit", "100");

  const list = await allegroGet(url.toString());
  const returnsList = list?.customerReturns || list?.customer_returns || [];

  console.log(`Allegro returns for ${date}: ${returnsList.length}`);

  let ok = 0, skipped = 0;

  for (const r of returnsList) {
    if (!r?.id) { skipped++; continue; }
    try {
      const detail = await allegroGet(`${API_URL}/order/customer-returns/${encodeURIComponent(r.id)}`);
      const mapped = mapDetail(detail);
      if (!mapped.external_return_id) { skipped++; continue; }
      await upsertAllegroReturn(mapped);
      console.log(`✅ ${mapped.external_return_id} → ${mapped.order_number || 'brak nr'}`);
      ok++;
    } catch (e) {
      console.error(`❌ ${r.id}:`, e.message);
      skipped++;
    }
  }

  console.log(`\nGotowe. Zapisano: ${ok}, pominięto: ${skipped}`);
  process.exit(0);
}

main().catch(e => {
  console.error("Sync error:", e?.message || e);
  process.exit(1);
});