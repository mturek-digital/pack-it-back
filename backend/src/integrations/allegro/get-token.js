import "dotenv/config";
import fs from "fs";
import path from "path";
import readline from "readline";

const TOKEN_FILE = path.resolve(process.cwd(), ".allegro_token.json");

const clientId = process.env.ALLEGRO_CLIENT_ID;
const clientSecret = process.env.ALLEGRO_CLIENT_SECRET;
const redirectUri = process.env.ALLEGRO_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  console.error("Brak ALLEGRO_CLIENT_ID / ALLEGRO_CLIENT_SECRET / ALLEGRO_REDIRECT_URI w .env");
  process.exit(1);
}

const authUrl =
  `https://allegro.pl/auth/oauth/authorize` +
  `?response_type=code` +
  `&client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}`;

console.log("1️⃣  Otwórz TEN URL w przeglądarce i zaloguj się do Allegro:\n");
console.log(authUrl);
console.log("\n2️⃣  Po przekierowaniu skopiuj parametr ?code=XXXX i wklej go tutaj.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("CODE: ", async (code) => {
  rl.close();

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const resp = await fetch("https://allegro.pl/auth/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code.trim(),
      redirect_uri: redirectUri,
    }).toString(),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    console.error("❌ Token error:", resp.status, data);
    process.exit(1);
  }

  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
  };

  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
  console.log(`✅ Token zapisany do ${TOKEN_FILE}`);
});