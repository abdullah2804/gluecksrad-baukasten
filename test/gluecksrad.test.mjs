// Automatische Tests: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { oeffentlicheKonfiguration, pruefeKonfiguration } from "../server/config.mjs";
import { dreheRad, protokollSchluessel, protokollSchluesselLesen } from "../server/gluecksrad.mjs";
import { ArbeitsspeicherSpeicher, DateiSpeicher } from "../server/speicher.mjs";
import { adminAnfrage, spinAnfrage } from "../server/http.mjs";

const demo = JSON.parse(readFileSync(new URL("../config/campaign.json", import.meta.url), "utf8"));
const IM_ZEITRAUM = new Date("2026-10-05T12:00:00Z");
const still = () => {};

function konfigMit(segmente, kampagne = {}) {
  const k = structuredClone(demo);
  k.kampagne = { ...k.kampagne, ...kampagne };
  if (segmente) k.segmente = segmente;
  return k;
}

const opt = (extra = {}) => ({ jetzt: IM_ZEITRAUM, protokoll: still, ...extra });

test("Demo-Konfiguration ist gültig", () => {
  const { fehler } = pruefeKonfiguration(demo);
  assert.deepEqual(fehler, []);
});

test("Konfigurationsfehler werden verständlich gemeldet", () => {
  const k = konfigMit([
    { id: "a", label: "A", typ: "sofortgewinn", gewicht: 1, kontingent: 5, farbe: "#fff" },
    { id: "a", label: "B", typ: "jackpot", gewicht: -1, kontingent: "viele", farbe: "rot" },
  ]);
  const { fehler } = pruefeKonfiguration(k);
  const alles = fehler.join("\n");
  assert.match(alles, /doppelt/);
  assert.match(alles, /"typ" muss/);
  assert.match(alles, /"gewicht" muss/);
  assert.match(alles, /"farbe" muss/);
  assert.match(alles, /mindestens ein Segment vom Typ "niete"/);
});

test("Öffentliche Konfiguration verrät keine Gewichte und Kontingente", () => {
  const oeffentlich = JSON.stringify(oeffentlicheKonfiguration(demo));
  assert.doesNotMatch(oeffentlich, /gewicht|kontingent|idMuster/);
});

test("Pro Teilnahme-ID ist nur ein Dreh möglich", async () => {
  const speicher = new ArbeitsspeicherSpeicher();
  const erster = await dreheRad(demo, speicher, { teilnahmeId: "ABC-123" }, opt());
  assert.equal(erster.status, 200);
  assert.equal(erster.body.ok, true);

  const zweiter = await dreheRad(demo, speicher, { teilnahmeId: "ABC-123" }, opt());
  assert.equal(zweiter.status, 409);
  assert.equal(zweiter.body.code, "BEREITS_GESPIELT");
  assert.deepEqual(zweiter.body.vorherigesErgebnis, erster.body.ergebnis);
});

test("Gleichzeitige Drehs mit derselben ID: nur einer gewinnt", async () => {
  const speicher = new ArbeitsspeicherSpeicher();
  const antworten = await Promise.all(
    Array.from({ length: 20 }, () => dreheRad(demo, speicher, { teilnahmeId: "GLEICH-1" }, opt()))
  );
  assert.equal(antworten.filter((a) => a.status === 200).length, 1);
  assert.equal(antworten.filter((a) => a.status === 409).length, 19);
});

test("Kontingente werden auch bei vielen gleichzeitigen Drehs nie überschritten", async () => {
  const k = konfigMit([
    { id: "preis", label: "Preis", typ: "sofortgewinn", gewicht: 1000, kontingent: 3, farbe: "#ff0000" },
    { id: "haupt", label: "Haupt", typ: "grossgewinn", gewicht: 1000, kontingent: 1, farbe: "#00ff00" },
    { id: "niete", label: "Niete", typ: "niete", gewicht: 1, kontingent: null, farbe: "#0000ff" },
  ]);
  const speicher = new ArbeitsspeicherSpeicher();
  const antworten = await Promise.all(
    Array.from({ length: 200 }, (_, i) => dreheRad(k, speicher, { teilnahmeId: `T-${i}x` }, opt()))
  );
  const typen = antworten.map((a) => a.body.ergebnis.typ);
  assert.equal(typen.filter((t) => t === "sofortgewinn").length, 3);
  assert.equal(typen.filter((t) => t === "grossgewinn").length, 1);
  assert.equal(typen.filter((t) => t === "niete").length, 196);
});

test("Kontingent 0 wird nie gezogen", async () => {
  const k = konfigMit([
    { id: "leer", label: "Leer", typ: "grossgewinn", gewicht: 1000, kontingent: 0, farbe: "#ff0000" },
    { id: "niete", label: "Niete", typ: "niete", gewicht: 1, kontingent: null, farbe: "#0000ff" },
  ]);
  const speicher = new ArbeitsspeicherSpeicher();
  for (let i = 0; i < 20; i++) {
    const a = await dreheRad(k, speicher, { teilnahmeId: `T-${i}x` }, opt());
    assert.equal(a.body.ergebnis.typ, "niete");
  }
});

test("Ergebnis-Index zeigt auf das gezogene Segment", async () => {
  const speicher = new ArbeitsspeicherSpeicher();
  for (let i = 0; i < 50; i++) {
    const { body } = await dreheRad(demo, speicher, { teilnahmeId: `IDX-${i}` }, opt());
    const s = demo.segmente[body.ergebnis.segmentIndex];
    assert.equal(s.id, body.ergebnis.segmentId);
    assert.equal(s.typ, body.ergebnis.typ);
  }
});

test("Außerhalb des Kampagnenzeitraums wird abgelehnt", async () => {
  const speicher = new ArbeitsspeicherSpeicher();
  const vorher = await dreheRad(demo, speicher, { teilnahmeId: "ZEIT-1" }, opt({ jetzt: new Date("2020-01-01") }));
  assert.equal(vorher.body.code, "VOR_START");
  const nachher = await dreheRad(demo, speicher, { teilnahmeId: "ZEIT-1" }, opt({ jetzt: new Date("2030-01-01") }));
  assert.equal(nachher.body.code, "BEENDET");
});

test("Ungültige Teilnahme-IDs werden abgelehnt", async () => {
  const speicher = new ArbeitsspeicherSpeicher();
  for (const id of [undefined, "", "a", "mit leerzeichen", "x".repeat(65), 12345, { id: 1 }]) {
    const a = await dreheRad(demo, speicher, { teilnahmeId: id }, opt());
    assert.equal(a.body.code, "UNGUELTIGE_TEILNAHME", `ID ${JSON.stringify(id)}`);
  }
});

test("Demo-IDs nur im Testmodus", async () => {
  const speicher = new ArbeitsspeicherSpeicher();
  const live = await dreheRad(demo, speicher, { teilnahmeId: "DEMO-1234" }, opt({ testmodus: false }));
  assert.equal(live.body.code, "UNGUELTIGE_TEILNAHME");
  const test = await dreheRad(demo, speicher, { teilnahmeId: "DEMO-1234" }, opt({ testmodus: true }));
  assert.equal(test.body.ok, true);
});

test("Mit Signatur-Schlüssel werden nur korrekt signierte IDs akzeptiert", async () => {
  const speicher = new ArbeitsspeicherSpeicher();
  const geheim = "streng-geheim";
  const id = "PLATTFORM-42";
  const signatur = createHmac("sha256", geheim).update(id).digest("hex");
  const o = opt({ signaturSchluessel: geheim });

  assert.equal((await dreheRad(demo, speicher, { teilnahmeId: id }, o)).body.code, "UNGUELTIGE_TEILNAHME");
  assert.equal((await dreheRad(demo, speicher, { teilnahmeId: id, signatur: "ab".repeat(32) }, o)).body.code, "UNGUELTIGE_TEILNAHME");
  assert.equal((await dreheRad(demo, speicher, { teilnahmeId: id, signatur }, o)).body.ok, true);
});

test("Jeder Dreh wird protokolliert", async () => {
  const speicher = new ArbeitsspeicherSpeicher();
  const logs = [];
  await dreheRad(demo, speicher, { teilnahmeId: "LOG-1" }, opt({ protokoll: (e) => logs.push(e) }));
  await dreheRad(demo, speicher, { teilnahmeId: "LOG-1" }, opt({ protokoll: (e) => logs.push(e) }));
  assert.equal(logs[0].ereignis, "dreh");
  assert.equal(logs[0].teilnahmeId, "LOG-1");
  assert.ok(logs[0].zeitpunkt);
  assert.ok(logs[0].typ);
  assert.equal(logs[1].ereignis, "abgelehnt");
  const keys = await speicher.schluessel("log/");
  assert.equal(keys.length, 1);
});

test("Protokoll-Schlüssel lassen sich zurücklesen", () => {
  const e = { zeitpunkt: "2026-10-05T12:34:56.789Z", typ: "sofortgewinn", segmentId: "gutschein-5", teilnahmeId: "Äbc_-123" };
  assert.deepEqual(protokollSchluesselLesen(protokollSchluessel(e)), e);
});

test("Datei-Speicher (lokaler Testmodus) hält Kontingente bei Gleichzeitigkeit ein", async () => {
  const ordner = mkdtempSync(join(tmpdir(), "gluecksrad-"));
  try {
    const k = konfigMit([
      { id: "preis", label: "Preis", typ: "sofortgewinn", gewicht: 1000, kontingent: 2, farbe: "#ff0000" },
      { id: "niete", label: "Niete", typ: "niete", gewicht: 1, kontingent: null, farbe: "#0000ff" },
    ]);
    const speicher = new DateiSpeicher(ordner);
    const antworten = await Promise.all(
      Array.from({ length: 30 }, (_, i) => dreheRad(k, speicher, { teilnahmeId: `F-${i}x` }, opt()))
    );
    assert.equal(antworten.filter((a) => a.body.ergebnis.typ === "sofortgewinn").length, 2);
    const doppelt = await dreheRad(k, speicher, { teilnahmeId: "F-0x" }, opt());
    assert.equal(doppelt.status, 409);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test("HTTP: /api/spin und /api/admin", async () => {
  const speicher = new ArbeitsspeicherSpeicher();
  const deps = { konfig: demo, speicher, optionen: opt() };

  const get = await spinAnfrage(new Request("http://x/api/spin"), deps);
  assert.equal(get.status, 405);

  const kaputt = await spinAnfrage(new Request("http://x/api/spin", { method: "POST", body: "{kein json" }), deps);
  assert.equal(kaputt.status, 400);

  const ok = await spinAnfrage(
    new Request("http://x/api/spin", { method: "POST", body: JSON.stringify({ teilnahmeId: "HTTP-1" }) }),
    deps
  );
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).ok, true);

  const adminDeps = { konfig: demo, speicher, adminSchluessel: "geheim" };
  assert.equal((await adminAnfrage(new Request("http://x/api/admin"), adminDeps)).status, 401);
  assert.equal((await adminAnfrage(new Request("http://x/api/admin?schluessel=geheim"), { ...adminDeps, adminSchluessel: "" })).status, 403);

  const status = await (await adminAnfrage(new Request("http://x/api/admin?schluessel=geheim"), adminDeps)).json();
  assert.equal(status.drehsGesamt, 1);

  const csv = await (await adminAnfrage(new Request("http://x/api/admin?schluessel=geheim&ansicht=csv"), adminDeps)).text();
  assert.match(csv, /HTTP-1/);
  assert.equal(csv.trim().split("\r\n").length, 2);
});
