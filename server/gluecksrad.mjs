// Die eigentliche Spiellogik: Wer bekommt was?
// Läuft ausschließlich auf dem Server – der Browser bekommt nur das Ergebnis.

import { randomBytes } from "node:crypto";
import { kampagnenStatus } from "./config.mjs";
import { pruefeTeilnahmeId, teilnahmeBeiPlattformBestaetigen, teilnahmeSchluessel } from "./teilnahme.mjs";

/** Kryptografisch sicherer Zufall im Bereich [0, 1). */
export function sichererZufall() {
  const b = randomBytes(7);
  // 53 Bit Zufall -> gleichmäßig verteilte Kommazahl
  const hoch = (b[0] & 0x1f) * 2 ** 48;
  const rest = b[1] * 2 ** 40 + b[2] * 2 ** 32 + b.readUInt32BE(3);
  return (hoch + rest) / 2 ** 53;
}

const kontingentSchluessel = (segmentId) => `kontingent/${segmentId}`;

/** Wählt gewichtet ein Element aus `liste` (Elemente haben `.gewicht`). */
export function gewichtetWaehlen(liste, zufall) {
  const summe = liste.reduce((s, e) => s + e.gewicht, 0);
  if (summe <= 0) return liste[Math.floor(zufall() * liste.length)];
  let r = zufall() * summe;
  for (const e of liste) {
    r -= e.gewicht;
    if (r < 0) return e;
  }
  return liste[liste.length - 1];
}

/** Bereits vergebene Anzahl eines Gewinns. */
export async function vergebeneAnzahl(speicher, segmentId) {
  return (await speicher.lesen(kontingentSchluessel(segmentId)))?.vergeben ?? 0;
}

/**
 * Versucht, einen Gewinn aus dem Kontingent zu nehmen.
 * true = Gewinn gehört dieser Teilnahme; false = Kontingent ist erschöpft.
 * Bei gleichzeitigen Anfragen wird so lange neu versucht, bis es eindeutig ist.
 */
export async function kontingentBelegen(speicher, segment) {
  const key = kontingentSchluessel(segment.id);
  for (let versuch = 0; versuch < 25; versuch++) {
    const eintrag = await speicher.lesenMitVersion(key);
    if (!eintrag) {
      if (segment.kontingent < 1) return false;
      if (await speicher.anlegen(key, { vergeben: 1 })) return true;
    } else {
      if (eintrag.wert.vergeben >= segment.kontingent) return false;
      if (await speicher.ersetzen(key, { vergeben: eintrag.wert.vergeben + 1 }, eintrag.version)) return true;
    }
    // Jemand war schneller -> kurz warten und erneut versuchen
    await new Promise((r) => setTimeout(r, 5 + Math.random() * 20 * (versuch + 1)));
  }
  throw new Error(`Kontingent für "${segment.id}" konnte nach mehreren Versuchen nicht gebucht werden.`);
}

/**
 * Zieht ein Segment unter Berücksichtigung von Gewichten und Kontingenten.
 * Ist ein gezogener Gewinn aufgebraucht, wird er aus der Ziehung genommen und neu gezogen.
 */
export async function segmentZiehen(konfig, speicher, zufall = sichererZufall) {
  const alle = konfig.segmente.map((s, index) => ({ ...s, index }));
  let kandidaten = alle.filter((s) => s.gewicht > 0);

  // Erschöpfte Gewinne gleich vorab aussortieren
  const vergeben = await Promise.all(
    kandidaten.map((s) => (s.typ === "niete" ? 0 : vergebeneAnzahl(speicher, s.id)))
  );
  kandidaten = kandidaten.filter((s, i) => s.typ === "niete" || vergeben[i] < s.kontingent);

  while (kandidaten.length > 0) {
    const gewaehlt = gewichtetWaehlen(kandidaten, zufall);
    if (gewaehlt.typ === "niete") return gewaehlt;
    if (await kontingentBelegen(speicher, gewaehlt)) return gewaehlt;
    kandidaten = kandidaten.filter((s) => s.id !== gewaehlt.id);
  }

  // Sicherheitsnetz (z. B. alle Nieten mit Gewicht 0): eine Niete zufällig wählen
  const nieten = alle.filter((s) => s.typ === "niete");
  return nieten[Math.floor(zufall() * nieten.length)];
}

/** Zeitstempel ohne Doppelpunkte, damit er in Speicher-Schlüsseln sortierbar bleibt. */
const kompakteZeit = (d) => d.toISOString().replace(/[-:.]/g, "");
const base64url = (s) => Buffer.from(s, "utf8").toString("base64url");

export function protokollSchluessel(eintrag) {
  return `log/${kompakteZeit(new Date(eintrag.zeitpunkt))}/${eintrag.typ}/${eintrag.segmentId}/${base64url(eintrag.teilnahmeId)}`;
}

export function protokollSchluesselLesen(key) {
  const [, zeit, typ, segmentId, id] = key.split("/");
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\d{3})Z$/.exec(zeit);
  return {
    zeitpunkt: m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z` : zeit,
    typ,
    segmentId,
    teilnahmeId: Buffer.from(id, "base64url").toString("utf8"),
  };
}

/**
 * Ein Dreh. Gibt { status, body } zurück (HTTP-Statuscode und JSON-Antwort).
 *
 * optionen:
 *   testmodus            – Demo-IDs ("DEMO-…") erlauben
 *   signaturSchluessel   – optionaler Schlüssel zur Prüfung signierter IDs
 *   jetzt                – Zeitpunkt (für Tests)
 *   zufall               – Zufallsfunktion (für Tests)
 *   protokoll            – Funktion für Log-Ausgaben (Standard: console.log)
 */
export async function dreheRad(konfig, speicher, { teilnahmeId, signatur }, optionen = {}) {
  const jetzt = optionen.jetzt ?? new Date();
  const zufall = optionen.zufall ?? sichererZufall;
  const protokoll = optionen.protokoll ?? ((e) => console.log(JSON.stringify(e)));

  const status = kampagnenStatus(konfig, jetzt);
  if (status === "vorher") return fehlerAntwort(403, "VOR_START");
  if (status === "beendet") return fehlerAntwort(403, "BEENDET");

  if (!pruefeTeilnahmeId(teilnahmeId, signatur, konfig, optionen)) {
    protokoll({ ereignis: "abgelehnt", grund: "UNGUELTIGE_TEILNAHME", zeitpunkt: jetzt.toISOString() });
    return fehlerAntwort(400, "UNGUELTIGE_TEILNAHME");
  }
  if (!teilnahmeId.startsWith("DEMO-") && !(await teilnahmeBeiPlattformBestaetigen(teilnahmeId))) {
    protokoll({ ereignis: "abgelehnt", grund: "PLATTFORM_UNBEKANNT", teilnahmeId, zeitpunkt: jetzt.toISOString() });
    return fehlerAntwort(400, "UNGUELTIGE_TEILNAHME");
  }

  // Schritt 1: Teilnahme "reservieren". Klappt nur ein einziges Mal pro ID.
  const tKey = teilnahmeSchluessel(teilnahmeId);
  const neu = await speicher.anlegen(tKey, { teilnahmeId, status: "laeuft", zeitpunkt: jetzt.toISOString() });
  if (!neu) {
    const vorher = await speicher.lesen(tKey);
    protokoll({ ereignis: "abgelehnt", grund: "BEREITS_GESPIELT", teilnahmeId, zeitpunkt: jetzt.toISOString() });
    return {
      status: 409,
      body: { ok: false, code: "BEREITS_GESPIELT", vorherigesErgebnis: vorher?.ergebnis ?? null },
    };
  }

  // Schritt 2: Gewinn ziehen
  let segment;
  try {
    segment = await segmentZiehen(konfig, speicher, zufall);
  } catch (e) {
    // Ziehung fehlgeschlagen -> Reservierung freigeben, damit ein erneuter Versuch möglich ist
    await speicher.loeschen(tKey);
    protokoll({ ereignis: "fehler", teilnahmeId, meldung: String(e?.message ?? e), zeitpunkt: jetzt.toISOString() });
    return fehlerAntwort(500, "FEHLER");
  }

  const ergebnis = { segmentIndex: segment.index, segmentId: segment.id, typ: segment.typ, label: segment.label };
  const eintrag = { teilnahmeId, zeitpunkt: jetzt.toISOString(), ...ergebnis };

  // Schritt 3: Ergebnis festhalten und protokollieren
  await speicher.schreiben(tKey, { ...eintrag, status: "fertig", ergebnis });
  await speicher.schreiben(protokollSchluessel(eintrag), eintrag);
  protokoll({ ereignis: "dreh", ...eintrag });

  return { status: 200, body: { ok: true, ergebnis } };
}

function fehlerAntwort(status, code) {
  return { status, body: { ok: false, code } };
}
