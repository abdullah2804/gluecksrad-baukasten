// Wird von Netlify bei jedem Deploy ausgeführt (siehe netlify.toml).
// Prüft die Konfiguration und stellt die Webseite im Ordner "dist" zusammen.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { oeffentlicheKonfiguration } from "../server/config.mjs";
import { konfigLesenUndPruefen, meldungenAusgeben, WURZEL } from "./werkzeug.mjs";

const { konfig, fehler, warnungen } = konfigLesenUndPruefen();
console.log("\nGlücksrad-Baukasten: Konfiguration wird geprüft …");
meldungenAusgeben({ fehler, warnungen });
if (fehler.length > 0) {
  console.log("\nDeploy abgebrochen: Bitte die oben genannten Fehler in config/campaign.json beheben.\n");
  process.exit(1);
}

const ziel = join(WURZEL, "dist");
rmSync(ziel, { recursive: true, force: true });
mkdirSync(ziel, { recursive: true });
cpSync(join(WURZEL, "app"), ziel, { recursive: true });
cpSync(join(WURZEL, "assets"), join(ziel, "assets"), { recursive: true });
writeFileSync(join(ziel, "kampagne.json"), JSON.stringify(oeffentlicheKonfiguration(konfig), null, 2));

console.log(`✅ Webseite für "${konfig.kampagne.name}" erstellt (Ordner dist).\n`);
