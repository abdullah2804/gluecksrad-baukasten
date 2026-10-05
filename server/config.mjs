// Prüft die Kampagnen-Konfiguration und erzeugt daraus die öffentliche Variante
// für den Browser (ohne Gewichte und Kontingente).

export const ERGEBNIS_TYPEN = ["niete", "sofortgewinn", "grossgewinn"];

const PFLICHT_TEXTE = [
  "seitentitel", "ueberschrift", "unterzeile", "formularHinweis", "radGesperrt",
  "radFreigeschaltet", "drehenKnopf", "drehtGerade", "vorStart", "nachEnde",
  "bereitsGespielt", "ungueltigeTeilnahme", "fehler",
];

const FARBEN = ["primaer", "sekundaer", "hintergrund", "text", "knopf", "knopfText", "radRand", "zeiger", "karte"];

const istObjekt = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const istText = (v) => typeof v === "string" && v.trim() !== "";
const istFarbe = (v) => typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);

/**
 * Liefert { fehler: string[], warnungen: string[] }.
 * Die Meldungen sind bewusst auf Deutsch und ohne Fachbegriffe formuliert,
 * weil sie im Build-Log von Netlify bzw. bei `npm run pruefen` angezeigt werden.
 */
export function pruefeKonfiguration(k) {
  const fehler = [];
  const warnungen = [];
  if (!istObjekt(k)) return { fehler: ["Die Datei enthält kein gültiges Konfigurations-Objekt."], warnungen };

  // --- Kampagne ---
  const kampagne = k.kampagne;
  if (!istObjekt(kampagne)) {
    fehler.push('Der Abschnitt "kampagne" fehlt.');
  } else {
    if (!istText(kampagne.id) || !/^[a-z0-9-]{3,40}$/.test(kampagne.id)) {
      fehler.push('"kampagne.id" muss aus 3–40 Kleinbuchstaben, Ziffern oder Bindestrichen bestehen (z. B. "sommer-2027").');
    }
    const start = Date.parse(kampagne.start);
    const ende = Date.parse(kampagne.ende);
    if (Number.isNaN(start)) fehler.push('"kampagne.start" ist kein gültiges Datum. Format: "2027-06-01T00:00:00+02:00".');
    if (Number.isNaN(ende)) fehler.push('"kampagne.ende" ist kein gültiges Datum. Format: "2027-08-31T23:59:59+02:00".');
    if (!Number.isNaN(start) && !Number.isNaN(ende) && ende <= start) fehler.push('"kampagne.ende" liegt vor "kampagne.start".');
    if (typeof kampagne.testmodus !== "boolean") fehler.push('"kampagne.testmodus" muss true oder false sein.');
    if (kampagne.testmodus === true) {
      warnungen.push('TESTMODUS IST AN ("kampagne.testmodus": true). Vor dem Livegang auf false stellen!');
    }
  }

  // --- Texte ---
  if (!istObjekt(k.texte)) {
    fehler.push('Der Abschnitt "texte" fehlt.');
  } else {
    for (const name of PFLICHT_TEXTE) {
      if (!istText(k.texte[name])) fehler.push(`Der Text "texte.${name}" fehlt oder ist leer.`);
    }
  }

  // --- Ergebnis-Screens ---
  if (!istObjekt(k.ergebnisse)) {
    fehler.push('Der Abschnitt "ergebnisse" fehlt.');
  } else {
    for (const typ of ERGEBNIS_TYPEN) {
      const e = k.ergebnisse[typ];
      if (!istObjekt(e)) { fehler.push(`Der Ergebnis-Screen "ergebnisse.${typ}" fehlt.`); continue; }
      if (!istText(e.ueberschrift)) fehler.push(`"ergebnisse.${typ}.ueberschrift" fehlt.`);
      if (!istText(e.text)) fehler.push(`"ergebnisse.${typ}.text" fehlt.`);
      if (!istText(e.knopfText)) fehler.push(`"ergebnisse.${typ}.knopfText" fehlt.`);
    }
  }

  // --- Design ---
  if (!istObjekt(k.design) || !istObjekt(k.design.farben)) {
    fehler.push('Der Abschnitt "design.farben" fehlt.');
  } else {
    for (const name of FARBEN) {
      if (!istFarbe(k.design.farben[name])) fehler.push(`"design.farben.${name}" muss eine Farbe wie "#e8590c" sein.`);
    }
  }

  // --- Rad ---
  const dauer = k.rad?.drehdauerSekunden;
  if (typeof dauer !== "number" || dauer < 2 || dauer > 15) fehler.push('"rad.drehdauerSekunden" muss eine Zahl zwischen 2 und 15 sein.');

  // --- Teilnahme ---
  try {
    new RegExp(k.teilnahme?.idMuster ?? "");
    if (!istText(k.teilnahme?.idMuster)) fehler.push('"teilnahme.idMuster" fehlt.');
  } catch {
    fehler.push('"teilnahme.idMuster" ist kein gültiges Muster.');
  }

  // --- Segmente ---
  const segmente = k.segmente;
  if (!Array.isArray(segmente) || segmente.length < 2) {
    fehler.push('"segmente" muss eine Liste mit mindestens 2 Segmenten sein.');
  } else {
    if (segmente.length > 16) warnungen.push(`Das Rad hat ${segmente.length} Segmente – mehr als 16 sind auf dem Handy schwer lesbar.`);
    const ids = new Set();
    let gewichtSumme = 0;
    segmente.forEach((s, i) => {
      const wo = `Segment Nr. ${i + 1}${istText(s?.label) ? ` ("${s.label}")` : ""}`;
      if (!istObjekt(s)) { fehler.push(`${wo} ist ungültig.`); return; }
      if (!istText(s.id) || !/^[a-z0-9-]{1,40}$/.test(s.id)) fehler.push(`${wo}: "id" muss aus Kleinbuchstaben, Ziffern oder Bindestrichen bestehen.`);
      else if (ids.has(s.id)) fehler.push(`${wo}: Die id "${s.id}" kommt doppelt vor. Jede id darf nur einmal vorkommen.`);
      else ids.add(s.id);
      if (!istText(s.label)) fehler.push(`${wo}: "label" fehlt.`);
      if (!ERGEBNIS_TYPEN.includes(s.typ)) fehler.push(`${wo}: "typ" muss "niete", "sofortgewinn" oder "grossgewinn" sein.`);
      if (typeof s.gewicht !== "number" || !Number.isFinite(s.gewicht) || s.gewicht < 0) fehler.push(`${wo}: "gewicht" muss eine Zahl ab 0 sein.`);
      else gewichtSumme += s.gewicht;
      if (s.typ === "niete") {
        if (s.kontingent !== null && s.kontingent !== undefined) warnungen.push(`${wo}: Nieten haben kein Kontingent – der Wert wird ignoriert.`);
      } else if (!Number.isInteger(s.kontingent) || s.kontingent < 0) {
        fehler.push(`${wo}: "kontingent" muss eine ganze Zahl ab 0 sein (Anzahl verfügbarer Gewinne).`);
      }
      if (!istFarbe(s.farbe)) fehler.push(`${wo}: "farbe" muss eine Farbe wie "#e8590c" sein.`);
      if (s.textfarbe !== undefined && !istFarbe(s.textfarbe)) fehler.push(`${wo}: "textfarbe" muss eine Farbe wie "#ffffff" sein.`);
    });
    const nieten = segmente.filter((s) => s?.typ === "niete");
    if (nieten.length === 0) fehler.push('Es muss mindestens ein Segment vom Typ "niete" geben (wird genutzt, wenn Gewinne aufgebraucht sind).');
    if (gewichtSumme <= 0) fehler.push("Die Summe aller Gewichte muss größer als 0 sein.");

    // Mehrere Segmente mit demselben Gewinn teilen sich KEIN Kontingent – Hinweis geben.
    const labels = new Map();
    for (const s of segmente) {
      if (s?.typ && s.typ !== "niete") labels.set(s.label, (labels.get(s.label) ?? 0) + 1);
    }
    for (const [label, anzahl] of labels) {
      if (anzahl > 1) warnungen.push(`Der Gewinn "${label}" steht auf ${anzahl} Segmenten. Jedes Segment hat sein eigenes Kontingent – die Kontingente addieren sich.`);
    }
  }

  return { fehler, warnungen };
}

/** Kampagnenstatus zum Zeitpunkt `jetzt`: "vorher" | "aktiv" | "beendet". */
export function kampagnenStatus(k, jetzt = new Date()) {
  const t = jetzt.getTime();
  if (t < Date.parse(k.kampagne.start)) return "vorher";
  if (t > Date.parse(k.kampagne.ende)) return "beendet";
  return "aktiv";
}

/** Nur das, was der Browser braucht – Gewichte und Kontingente bleiben geheim. */
export function oeffentlicheKonfiguration(k, { testmodus } = {}) {
  return {
    kampagne: {
      id: k.kampagne.id,
      name: k.kampagne.name,
      start: k.kampagne.start,
      ende: k.kampagne.ende,
      testmodus: testmodus ?? k.kampagne.testmodus,
    },
    texte: k.texte,
    ergebnisse: k.ergebnisse,
    design: k.design,
    rad: k.rad,
    integration: k.integration ?? {},
    segmente: k.segmente.map((s) => ({
      id: s.id,
      label: s.label,
      typ: s.typ,
      farbe: s.farbe,
      textfarbe: s.textfarbe ?? "#ffffff",
      bild: s.bild ?? "",
    })),
  };
}

/** Alle Bildpfade aus der Konfiguration (für die Prüfung, ob die Dateien existieren). */
export function bildPfade(k) {
  const pfade = [k.design?.logo, k.design?.hintergrundbild, k.design?.favicon, k.integration?.formularDatei];
  for (const typ of ERGEBNIS_TYPEN) pfade.push(k.ergebnisse?.[typ]?.bild);
  for (const s of k.segmente ?? []) pfade.push(s?.bild);
  for (const schrift of Object.values(k.design?.schriften ?? {})) {
    if (schrift?.url && !/^https?:\/\//.test(schrift.url)) pfade.push(schrift.url);
  }
  return [...new Set(pfade.filter((p) => typeof p === "string" && p.trim() !== "" && !/^https?:\/\//.test(p)))];
}
