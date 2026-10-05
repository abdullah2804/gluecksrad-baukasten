// npm run pruefen  –  prüft config/campaign.json und zeigt eine Gewinn-Übersicht.
import { konfigLesenUndPruefen, meldungenAusgeben } from "./werkzeug.mjs";

const { konfig, fehler, warnungen } = konfigLesenUndPruefen();
console.log("\nPrüfe config/campaign.json …\n");
meldungenAusgeben({ fehler, warnungen });

if (fehler.length > 0) {
  console.log(`\n${fehler.length} Fehler gefunden. Bitte korrigieren und erneut prüfen.\n`);
  process.exit(1);
}

const summe = konfig.segmente.reduce((s, x) => s + x.gewicht, 0);
console.log(`  ✅ Konfiguration ist in Ordnung: "${konfig.kampagne.name}"`);
console.log(`     Zeitraum: ${new Date(konfig.kampagne.start).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} bis ${new Date(konfig.kampagne.ende).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}\n`);
console.log("  Segment                    Typ            Chance pro Dreh   Kontingent");
console.log("  " + "-".repeat(74));
for (const s of konfig.segmente) {
  const chance = summe > 0 ? ((s.gewicht / summe) * 100).toFixed(2).replace(".", ",") + " %" : "-";
  const kontingent = s.typ === "niete" ? "unbegrenzt" : String(s.kontingent);
  console.log(`  ${s.label.padEnd(26)} ${s.typ.padEnd(14)} ${chance.padStart(15)}   ${kontingent}`);
}
console.log("\n  Hinweis: Ist ein Gewinn aufgebraucht, fällt seine Chance den übrigen Segmenten zu.");
console.log("  Tipp: Mit \"npm run simulieren\" können Sie 10.000 Drehs zur Probe durchspielen.\n");
