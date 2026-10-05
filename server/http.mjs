// Übersetzt Web-Anfragen in Aufrufe der Spiellogik. Wird sowohl von den
// Netlify Functions als auch vom lokalen Testserver verwendet.

import { timingSafeEqual } from "node:crypto";
import { dreheRad, protokollSchluesselLesen, vergebeneAnzahl } from "./gluecksrad.mjs";
import { kampagnenStatus } from "./config.mjs";

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** POST /api/spin  –  Body: { "teilnahmeId": "...", "signatur": "..." (optional) } */
export async function spinAnfrage(request, { konfig, speicher, optionen }) {
  if (request.method !== "POST") return json(405, { ok: false, code: "NUR_POST" });

  let daten;
  try {
    daten = await request.json();
  } catch {
    return json(400, { ok: false, code: "UNGUELTIGE_TEILNAHME" });
  }

  try {
    const { status, body } = await dreheRad(
      konfig,
      speicher,
      { teilnahmeId: daten?.teilnahmeId, signatur: daten?.signatur },
      optionen
    );
    return json(status, body);
  } catch (e) {
    console.error(JSON.stringify({ ereignis: "fehler", meldung: String(e?.stack ?? e) }));
    return json(500, { ok: false, code: "FEHLER" });
  }
}

function schluesselPasst(gegeben, erwartet) {
  if (!gegeben || !erwartet) return false;
  const a = Buffer.from(String(gegeben));
  const b = Buffer.from(String(erwartet));
  return a.length === b.length && timingSafeEqual(a, b);
}

const csvFeld = (v) => {
  const s = String(v ?? "");
  // Verhindert, dass Excel Inhalte als Formel ausführt
  const sicher = /^[=+\-@]/.test(s) ? "'" + s : s;
  return /[";\n]/.test(sicher) ? `"${sicher.replace(/"/g, '""')}"` : sicher;
};

/**
 * GET /api/admin?schluessel=…&ansicht=status   -> Übersicht (Kontingente, Anzahl Drehs)
 * GET /api/admin?schluessel=…&ansicht=csv      -> Protokoll aller Drehs als CSV (für Excel)
 */
export async function adminAnfrage(request, { konfig, speicher, adminSchluessel }) {
  if (!adminSchluessel) {
    return json(403, { ok: false, meldung: "Admin-Bereich ist nicht eingerichtet (Umgebungsvariable ADMIN_SCHLUESSEL fehlt)." });
  }
  const url = new URL(request.url);
  if (!schluesselPasst(url.searchParams.get("schluessel"), adminSchluessel)) {
    return json(401, { ok: false, meldung: "Falscher oder fehlender Admin-Schlüssel." });
  }

  const protokoll = (await speicher.schluessel("log/")).map(protokollSchluesselLesen);
  const labels = Object.fromEntries(konfig.segmente.map((s) => [s.id, s.label]));

  if (url.searchParams.get("ansicht") === "csv") {
    const zeilen = [["Zeitpunkt (UTC)", "Teilnahme-ID", "Ergebnis", "Segment-ID", "Gewinn"]];
    for (const e of protokoll) zeilen.push([e.zeitpunkt, e.teilnahmeId, e.typ, e.segmentId, labels[e.segmentId] ?? ""]);
    // Semikolon + BOM: öffnet sich in deutschem Excel direkt korrekt
    const csv = "﻿" + zeilen.map((z) => z.map(csvFeld).join(";")).join("\r\n") + "\r\n";
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="gluecksrad-${konfig.kampagne.id}-protokoll.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  const proTyp = { niete: 0, sofortgewinn: 0, grossgewinn: 0 };
  for (const e of protokoll) proTyp[e.typ] = (proTyp[e.typ] ?? 0) + 1;

  const gewinne = [];
  for (const s of konfig.segmente) {
    if (s.typ === "niete") continue;
    const vergeben = await vergebeneAnzahl(speicher, s.id);
    gewinne.push({ id: s.id, label: s.label, typ: s.typ, kontingent: s.kontingent, vergeben, uebrig: Math.max(0, s.kontingent - vergeben) });
  }

  return json(200, {
    ok: true,
    kampagne: konfig.kampagne.id,
    status: kampagnenStatus(konfig),
    drehsGesamt: protokoll.length,
    drehsNachErgebnis: proTyp,
    gewinne,
    letzterDreh: protokoll.at(-1)?.zeitpunkt ?? null,
  });
}
