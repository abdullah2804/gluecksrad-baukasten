// npm start  –  lokaler Testmodus. Startet die komplette Seite inkl. /api/spin
// auf http://localhost:8888 – ohne Netlify, ohne Internet-Konto.
// Gespielte Drehs werden im Ordner ".lokale-daten" gespeichert (zurücksetzen: npm run zuruecksetzen).

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { oeffentlicheKonfiguration } from "../server/config.mjs";
import { DateiSpeicher } from "../server/speicher.mjs";
import { adminAnfrage, spinAnfrage } from "../server/http.mjs";
import { konfigLesenUndPruefen, meldungenAusgeben, WURZEL } from "./werkzeug.mjs";

const PORT = Number(process.env.PORT) || 8888;
const ADMIN_SCHLUESSEL = "test";

const TYPEN = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".mp3": "audio/mpeg",
};

// Konfiguration bei JEDER Anfrage neu lesen -> Änderungen sind nach "Seite neu laden" sofort sichtbar.
let letzteMeldung = "";
function konfigLaden() {
  const ergebnis = konfigLesenUndPruefen();
  const meldung = JSON.stringify([ergebnis.fehler, ergebnis.warnungen]);
  if (meldung !== letzteMeldung) {
    letzteMeldung = meldung;
    console.log(`\n[${new Date().toLocaleTimeString("de-DE")}] Konfiguration geladen:`);
    meldungenAusgeben(ergebnis);
    if (ergebnis.fehler.length === 0) console.log("  ✅ Keine Fehler.");
  }
  return ergebnis;
}

async function dateiSenden(res, basis, relativ) {
  const pfad = normalize(join(basis, relativ));
  if (!pfad.startsWith(basis + sep) && pfad !== basis) return false; // kein Zugriff außerhalb
  try {
    const info = await stat(pfad);
    if (!info.isFile()) return false;
    res.writeHead(200, { "content-type": TYPEN[extname(pfad).toLowerCase()] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(await readFile(pfad));
    return true;
  } catch {
    return false;
  }
}

async function webAntwortSenden(res, antwort) {
  res.writeHead(antwort.status, Object.fromEntries(antwort.headers));
  res.end(Buffer.from(await antwort.arrayBuffer()));
}

async function alsWebAnfrage(req) {
  const teile = [];
  for await (const t of req) teile.push(t);
  const body = teile.length ? Buffer.concat(teile) : undefined;
  return new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pfad = decodeURIComponent(url.pathname);

    if (pfad === "/api/spin" || pfad === "/api/admin") {
      const { konfig, fehler } = konfigLaden();
      if (fehler.length) return webAntwortSenden(res, Response.json({ ok: false, code: "FEHLER" }, { status: 500 }));
      const speicher = new DateiSpeicher(join(WURZEL, ".lokale-daten", konfig.kampagne.id));
      const anfrage = await alsWebAnfrage(req);
      const antwort =
        pfad === "/api/spin"
          ? await spinAnfrage(anfrage, { konfig, speicher, optionen: { testmodus: true } })
          : await adminAnfrage(anfrage, { konfig, speicher, adminSchluessel: ADMIN_SCHLUESSEL });
      return webAntwortSenden(res, antwort);
    }

    if (pfad === "/kampagne.json") {
      const { konfig, fehler } = konfigLaden();
      if (fehler.length) {
        res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ konfigurationsfehler: fehler }));
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      // Lokal ist der Testmodus immer an (Demo-Formular, Vorschau)
      return res.end(JSON.stringify(oeffentlicheKonfiguration(konfig, { testmodus: true })));
    }

    if (pfad.startsWith("/assets/") && (await dateiSenden(res, join(WURZEL, "assets"), pfad.slice("/assets/".length)))) return;
    if (await dateiSenden(res, join(WURZEL, "app"), pfad === "/" ? "index.html" : pfad.slice(1))) return;

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Nicht gefunden");
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end("Interner Fehler");
  }
});

server.listen(PORT, () => {
  konfigLaden();
  console.log(`
  🎡  Glücksrad-Testmodus läuft!

     Seite öffnen:        http://localhost:${PORT}
     Ergebnis-Vorschau:   http://localhost:${PORT}/?vorschau=grossgewinn   (oder niete / sofortgewinn)
     Admin-Übersicht:     http://localhost:${PORT}/api/admin?schluessel=${ADMIN_SCHLUESSEL}
     Protokoll (Excel):   http://localhost:${PORT}/api/admin?schluessel=${ADMIN_SCHLUESSEL}&ansicht=csv

     Beenden: Strg + C
`);
});
