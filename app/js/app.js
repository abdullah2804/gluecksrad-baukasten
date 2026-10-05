// Hauptsteuerung der Seite. Muss pro Kampagne NICHT geändert werden.
// Ablauf: Konfiguration laden -> Design anwenden -> auf Teilnahme warten ->
//         Rad freischalten -> beim Drehen /api/spin fragen -> Ergebnis zeigen.

import { Gluecksrad } from "./rad.js";
import { demoFormularZeigen, formularEinbetten, plattformAnbinden } from "./plattform.js";
import { konfetti } from "./konfetti.js";

const $ = (id) => document.getElementById(id);
const SCHRIFT_FALLBACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

let K; // öffentliche Kampagnen-Konfiguration
let rad;
let teilnahme = null; // { teilnahmeId, signatur }
let dreht = false;

start().catch((e) => {
  console.error(e);
  document.body.classList.remove("laedt");
  $("ueberschrift").textContent = "Seite konnte nicht geladen werden";
  $("unterzeile").textContent = "Bitte laden Sie die Seite neu.";
});

async function start() {
  const antwort = await fetch("kampagne.json", { cache: "no-cache" });
  K = await antwort.json();
  if (K.konfigurationsfehler) {
    // Nur im lokalen Testmodus: Fehler in config/campaign.json direkt anzeigen
    document.body.classList.remove("laedt");
    $("ueberschrift").textContent = "Fehler in config/campaign.json";
    $("unterzeile").textContent = K.konfigurationsfehler.join(" • ");
    return;
  }

  designAnwenden();
  texteSetzen();

  const params = new URLSearchParams(location.search);
  const vorschau = K.kampagne.testmodus ? params.get("vorschau") : null;
  $("testmodus-banner").hidden = !K.kampagne.testmodus;

  const status = kampagnenStatus();
  if (status !== "aktiv" && !vorschau) {
    zeitraumHinweis(status);
    await schriftenBereit();
    document.body.classList.remove("laedt");
    return;
  }

  $("spielbereich").hidden = false;
  rad = new Gluecksrad($("rad"), K.segmente, {
    randFarbe: K.design.farben.radRand,
    schrift: schriftFamilie("ueberschrift"),
    beschriftung: K.rad.beschriftungAnzeigen !== false,
    dauerSekunden: K.rad.drehdauerSekunden,
    beiSegmentwechsel: zeigerTick,
  });
  $("rad").setAttribute("aria-label", "Glücksrad mit den Feldern: " + K.segmente.map((s) => s.label).join(", "));
  $("drehen-knopf").addEventListener("click", drehen);

  if (vorschau) {
    // ?vorschau=niete|sofortgewinn|grossgewinn – Ergebnis-Screens ansehen, ohne Server
    $("formular-bereich").hidden = true;
    $("spielbereich").classList.add("nur-rad");
    freischalten({ teilnahmeId: "VORSCHAU" });
  } else {
    plattformAnbinden(K.integration, freischalten);
    await formularLaden();
  }

  await schriftenBereit();
  rad.neuZeichnen();
  document.body.classList.remove("laedt");
}

// ---------------------------------------------------------------- Design & Texte

function designAnwenden() {
  const f = K.design.farben;
  const r = document.documentElement.style;
  r.setProperty("--primaer", f.primaer);
  r.setProperty("--sekundaer", f.sekundaer);
  r.setProperty("--hintergrund", f.hintergrund);
  r.setProperty("--text", f.text);
  r.setProperty("--knopf", f.knopf);
  r.setProperty("--knopf-text", f.knopfText);
  r.setProperty("--rad-rand", f.radRand);
  r.setProperty("--zeiger", f.zeiger);
  r.setProperty("--karte", f.karte);

  for (const [rolle, schrift] of Object.entries(K.design.schriften ?? {})) {
    if (!schrift?.name) continue;
    if (schrift.url && /^https?:\/\//.test(schrift.url)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = schrift.url;
      document.head.append(link);
    } else if (schrift.url) {
      // Eigene Schriftdatei aus assets/ (z. B. .woff2)
      const face = new FontFace(schrift.name, `url("${schrift.url}")`);
      document.fonts.add(face);
      face.load().catch(() => console.warn(`[Glücksrad] Schrift ${schrift.url} konnte nicht geladen werden.`));
    }
    r.setProperty(`--schrift-${rolle}`, schriftFamilie(rolle));
  }

  if (K.design.hintergrundbild) document.body.style.backgroundImage = `url("${K.design.hintergrundbild}")`;
  if (K.design.logo) {
    $("logo").src = K.design.logo;
    $("logo").alt = K.kampagne.name;
    $("logo").hidden = false;
  }
  if (K.design.favicon) $("favicon").href = K.design.favicon;
  document.querySelector('meta[name="theme-color"]')?.remove();
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = f.primaer;
  document.head.append(meta);
}

function schriftFamilie(rolle) {
  const name = K.design.schriften?.[rolle]?.name;
  return name ? `"${name}", ${SCHRIFT_FALLBACK}` : SCHRIFT_FALLBACK;
}

async function schriftenBereit() {
  const namen = Object.values(K.design.schriften ?? {}).map((s) => s?.name).filter(Boolean);
  // Höchstens 2 Sekunden warten – danach geht es mit Ersatzschrift weiter
  await Promise.race([
    Promise.all(namen.map((n) => document.fonts.load(`700 32px "${n}"`).catch(() => {}))),
    new Promise((r) => setTimeout(r, 2000)),
  ]);
}

function texteSetzen() {
  const t = K.texte;
  document.title = t.seitentitel;
  $("ueberschrift").textContent = t.ueberschrift;
  $("unterzeile").textContent = t.unterzeile;
  $("formular-hinweis").textContent = t.formularHinweis;
  $("rad-status").textContent = t.radGesperrt;
  $("drehen-knopf").textContent = t.drehenKnopf;
  $("fusszeile").textContent = t.fusszeile ?? "";

  const links = [
    ["Impressum", t.impressumLink],
    ["Datenschutz", t.datenschutzLink],
    ["Teilnahmebedingungen", t.teilnahmebedingungenLink],
  ];
  for (const [name, href] of links) {
    if (!href || !/^https?:\/\//.test(href)) continue;
    const a = document.createElement("a");
    a.href = href;
    a.textContent = name;
    a.target = "_blank";
    a.rel = "noopener";
    $("fuss-links").append(a);
  }
}

function kampagnenStatus() {
  const jetzt = Date.now();
  if (jetzt < Date.parse(K.kampagne.start)) return "vorher";
  if (jetzt > Date.parse(K.kampagne.ende)) return "beendet";
  return "aktiv";
}

function datumText(iso) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "long", timeStyle: "short" }) + " Uhr";
}

function zeitraumHinweis(status) {
  $("spielbereich").hidden = true;
  $("zeitraum-hinweis").hidden = false;
  $("zeitraum-text").textContent =
    status === "vorher"
      ? K.texte.vorStart.replace("{start}", datumText(K.kampagne.start)).replace("{ende}", datumText(K.kampagne.ende))
      : K.texte.nachEnde;
}

// ---------------------------------------------------------------- Formular & Freischaltung

async function formularLaden() {
  let eingebettet = false;
  try {
    eingebettet = await formularEinbetten($("formular-einbettung"), K.integration.formularDatei);
  } catch (e) {
    console.warn("[Glücksrad]", e.message);
  }
  if (K.kampagne.testmodus) demoFormularZeigen($("demo-formular"), K.integration);
  else if (!eingebettet) console.warn("[Glücksrad] Kein Formular eingebunden – bitte assets/formular-einbettung.html befüllen.");
}

function freischalten(daten) {
  if (teilnahme) return;
  teilnahme = daten;
  $("rad-buehne").classList.remove("gesperrt");
  $("drehen-knopf").disabled = false;
  $("rad-status").textContent = K.texte.radFreigeschaltet;

  if (!$("formular-bereich").hidden) {
    // Formular durch Bestätigung ersetzen und zum Rad scrollen (wichtig auf dem Handy)
    $("demo-formular").innerHTML = "";
    const ok = document.createElement("p");
    ok.className = "formular-erledigt";
    ok.textContent = "✓ " + K.texte.radFreigeschaltet;
    $("demo-formular").append(ok);
    $("rad-bereich").scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function sperren(meldung) {
  $("drehen-knopf").disabled = true;
  $("rad-status").textContent = meldung;
}

// ---------------------------------------------------------------- Drehen

async function drehen() {
  if (dreht || !teilnahme) return;
  dreht = true;
  $("drehen-knopf").disabled = true;
  $("drehen-knopf").textContent = K.texte.drehtGerade;
  $("rad-status").textContent = "";
  rad.starteDrehung();

  const vorschau = teilnahme.teilnahmeId === "VORSCHAU";
  const [antwort] = await Promise.all([
    vorschau ? vorschauErgebnis() : spinAnfragen(),
    new Promise((r) => setTimeout(r, 700)), // Rad soll mindestens kurz Schwung holen
  ]);

  if (antwort.ok) {
    await rad.stoppeBei(antwort.ergebnis.segmentIndex);
    $("drehen-knopf").textContent = K.texte.drehenKnopf;
    sperren("");
    ergebnisZeigen(antwort.ergebnis);
    if (vorschau) {
      // In der Vorschau darf beliebig oft gedreht werden
      dreht = false;
      $("drehen-knopf").disabled = false;
    }
    return;
  }

  await rad.auslaufen();
  dreht = false;
  $("drehen-knopf").textContent = K.texte.drehenKnopf;
  switch (antwort.code) {
    case "BEREITS_GESPIELT":
      sperren(K.texte.bereitsGespielt);
      if (antwort.vorherigesErgebnis) ergebnisZeigen(antwort.vorherigesErgebnis, { ohneKonfetti: true });
      break;
    case "UNGUELTIGE_TEILNAHME":
      sperren(K.texte.ungueltigeTeilnahme);
      break;
    case "VOR_START":
      zeitraumHinweis("vorher");
      break;
    case "BEENDET":
      zeitraumHinweis("beendet");
      break;
    default:
      // Netzwerk- oder Serverfehler: erneuter Versuch erlaubt
      $("rad-status").textContent = K.texte.fehler;
      $("drehen-knopf").disabled = false;
  }
}

async function spinAnfragen() {
  try {
    const r = await fetch("/api/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(teilnahme),
    });
    return await r.json();
  } catch {
    return { ok: false, code: "FEHLER" };
  }
}

/** Nur Testmodus (?vorschau=…): wählt zufällig ein Segment des gewünschten Typs – rein optisch. */
async function vorschauErgebnis() {
  const typ = new URLSearchParams(location.search).get("vorschau");
  const passend = K.segmente.map((s, i) => ({ ...s, i })).filter((s) => s.typ === typ);
  const liste = passend.length ? passend : K.segmente.map((s, i) => ({ ...s, i }));
  const s = liste[Math.floor(Math.random() * liste.length)];
  return { ok: true, ergebnis: { segmentIndex: s.i, segmentId: s.id, typ: s.typ, label: s.label } };
}

let tickTimer;
function zeigerTick() {
  const z = $("zeiger");
  z.classList.remove("tick");
  void z.offsetWidth; // Animation neu starten
  z.classList.add("tick");
  clearTimeout(tickTimer);
  tickTimer = setTimeout(() => z.classList.remove("tick"), 150);
}

// ---------------------------------------------------------------- Ergebnis-Screens

function ergebnisZeigen(ergebnis, { ohneKonfetti = false } = {}) {
  const screen = K.ergebnisse[ergebnis.typ] ?? K.ergebnisse.niete;
  const ersetzen = (text) =>
    text.replaceAll("{gewinn}", ergebnis.label).replaceAll("{teilnahmeId}", teilnahme?.teilnahmeId ?? "");

  const huelle = $("ergebnis");
  huelle.className = `ergebnis-huelle typ-${ergebnis.typ}`;
  $("ergebnis-ueberschrift").textContent = ersetzen(screen.ueberschrift);
  $("ergebnis-text").textContent = ersetzen(screen.text);

  const bild = $("ergebnis-bild");
  bild.hidden = !screen.bild;
  if (screen.bild) bild.src = screen.bild;

  const knopf = $("ergebnis-knopf");
  knopf.textContent = screen.knopfText;
  const link = screen.knopfLink && /^https?:\/\//.test(screen.knopfLink) ? screen.knopfLink : null;
  knopf.href = link ?? "#";
  knopf.onclick = link
    ? null
    : (e) => {
        e.preventDefault();
        huelle.hidden = true;
      };

  huelle.hidden = false;
  knopf.focus();

  if (!ohneKonfetti && ergebnis.typ !== "niete" && K.rad.konfettiBeiGewinn !== false) {
    const f = K.design.farben;
    konfetti($("konfetti"), [f.primaer, f.sekundaer, f.knopf, "#ffd43b", "#ffffff"], {
      menge: ergebnis.typ === "grossgewinn" ? 320 : 140,
      dauer: ergebnis.typ === "grossgewinn" ? 6000 : 3500,
    });
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("ergebnis").hidden) $("ergebnis").hidden = true;
});
