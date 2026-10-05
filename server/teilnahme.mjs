// Prüfung der Teilnahme-ID.
//
// Stufe 1 (immer aktiv):   Die ID muss zum Muster "teilnahme.idMuster" aus der Konfig passen.
// Stufe 2 (optional):      Ist die Umgebungsvariable TEILNAHME_SIGNATUR_SCHLUESSEL gesetzt,
//                          muss die Plattform jede ID mit diesem Schlüssel signieren
//                          (HMAC-SHA256, hex). Fälschungen werden dann abgelehnt.
// Stufe 3 (Platzhalter):   Rückfrage bei der Plattform, ob die ID wirklich existiert.
//                          -> teilnahmeBeiPlattformBestaetigen() unten ausfüllen,
//                             sobald die Plattform-Doku vorliegt.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function pruefeTeilnahmeId(teilnahmeId, signatur, konfig, { signaturSchluessel, testmodus } = {}) {
  if (typeof teilnahmeId !== "string") return false;
  if (!new RegExp(konfig.teilnahme.idMuster).test(teilnahmeId)) return false;

  // Im Testmodus erzeugt das Demo-Formular IDs, die mit "DEMO-" beginnen.
  // Außerhalb des Testmodus werden sie immer abgelehnt.
  const istDemo = teilnahmeId.startsWith("DEMO-");
  if (istDemo) return testmodus === true;

  if (signaturSchluessel) {
    if (typeof signatur !== "string" || !/^[0-9a-f]{64}$/i.test(signatur)) return false;
    const erwartet = createHmac("sha256", signaturSchluessel).update(teilnahmeId).digest();
    return timingSafeEqual(erwartet, Buffer.from(signatur, "hex"));
  }
  return true;
}

/**
 * PLATZHALTER: Hier kann später geprüft werden, ob die Plattform die Teilnahme
 * wirklich kennt (z. B. per Abfrage an deren Schnittstelle).
 * Rückgabe true = Teilnahme ist echt.
 */
// eslint-disable-next-line no-unused-vars
export async function teilnahmeBeiPlattformBestaetigen(teilnahmeId) {
  // TODO: Sobald die Plattform-Doku vorliegt, hier die Abfrage einbauen, etwa:
  //   const antwort = await fetch(`https://plattform.example/api/teilnahmen/${encodeURIComponent(teilnahmeId)}`,
  //     { headers: { Authorization: `Bearer ${process.env.PLATTFORM_API_SCHLUESSEL}` } });
  //   return antwort.ok;
  return true;
}

/** Teilnahme-IDs werden als Prüfsumme gespeichert (sichere Schlüssellänge, keine Sonderzeichen). */
export function teilnahmeSchluessel(teilnahmeId) {
  return "teilnahme/" + createHash("sha256").update(teilnahmeId).digest("hex");
}
