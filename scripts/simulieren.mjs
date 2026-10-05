// npm run simulieren [Anzahl]  –  spielt z. B. 10.000 Drehs mit der echten Logik durch
// (nur im Arbeitsspeicher) und zeigt, wie oft welcher Gewinn herauskommt.
import { dreheRad } from "../server/gluecksrad.mjs";
import { ArbeitsspeicherSpeicher } from "../server/speicher.mjs";
import { konfigLesenUndPruefen, meldungenAusgeben } from "./werkzeug.mjs";

const anzahl = Number(process.argv[2]) || 10000;
const { konfig, fehler, warnungen } = konfigLesenUndPruefen();
if (fehler.length) {
  meldungenAusgeben({ fehler, warnungen });
  process.exit(1);
}

const speicher = new ArbeitsspeicherSpeicher();
const jetzt = new Date(konfig.kampagne.start);
const zaehler = new Map(konfig.segmente.map((s) => [s.id, 0]));
const erschoepftNach = new Map();

console.log(`\nSimuliere ${anzahl.toLocaleString("de-DE")} Drehs für "${konfig.kampagne.name}" …\n`);
for (let i = 1; i <= anzahl; i++) {
  const { body } = await dreheRad(konfig, speicher, { teilnahmeId: `DEMO-${i}` }, { testmodus: true, jetzt, protokoll: () => {} });
  const id = body.ergebnis.segmentId;
  zaehler.set(id, zaehler.get(id) + 1);
  const s = konfig.segmente[body.ergebnis.segmentIndex];
  if (s.typ !== "niete" && zaehler.get(id) === s.kontingent) erschoepftNach.set(id, i);
}

console.log("  Segment                    Typ            Treffer      Anteil   Kontingent");
console.log("  " + "-".repeat(78));
for (const s of konfig.segmente) {
  const n = zaehler.get(s.id);
  const anteil = ((n / anzahl) * 100).toFixed(2).replace(".", ",") + " %";
  const k = s.typ === "niete" ? "–" : `${n}/${s.kontingent}${erschoepftNach.has(s.id) ? ` (leer nach Dreh ${erschoepftNach.get(s.id)})` : ""}`;
  console.log(`  ${s.label.padEnd(26)} ${s.typ.padEnd(14)} ${String(n).padStart(7)}   ${anteil.padStart(9)}   ${k}`);
}
const ueberzogen = konfig.segmente.filter((s) => s.typ !== "niete" && zaehler.get(s.id) > s.kontingent);
console.log(
  ueberzogen.length === 0
    ? "\n  ✅ Kein Gewinn wurde öfter vergeben, als sein Kontingent erlaubt.\n"
    : `\n  ❌ Kontingent überschritten bei: ${ueberzogen.map((s) => s.label).join(", ")}\n`
);
process.exitCode = ueberzogen.length === 0 ? 0 : 1;
