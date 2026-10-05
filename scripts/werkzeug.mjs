// Gemeinsame Helfer für die Skripte (Prüfen, Bauen, Testserver).
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bildPfade, pruefeKonfiguration } from "../server/config.mjs";

export const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
export const KONFIG_DATEI = join(WURZEL, "config", "campaign.json");

/** Liest config/campaign.json. Bei Tippfehlern gibt es eine verständliche Meldung mit Zeilennummer. */
export function konfigLesen() {
  const text = readFileSync(KONFIG_DATEI, "utf8");
  try {
    return { konfig: JSON.parse(text), fehler: [] };
  } catch (e) {
    let wo = "";
    const pos = /position (\d+)/.exec(e.message);
    const zeileSpalte = /line (\d+) column (\d+)/.exec(e.message);
    if (zeileSpalte) wo = ` in Zeile ${zeileSpalte[1]}`;
    else if (pos) wo = ` in Zeile ${text.slice(0, Number(pos[1])).split("\n").length}`;
    return {
      konfig: null,
      fehler: [
        `config/campaign.json ist kein gültiges JSON${wo}.`,
        'Häufige Ursachen: fehlendes Komma zwischen zwei Einträgen, Komma nach dem letzten Eintrag, fehlende Anführungszeichen "…".',
        `Technische Meldung: ${e.message}`,
      ],
    };
  }
}

/** Liest und prüft die Konfiguration inkl. "existieren alle Bilder?". */
export function konfigLesenUndPruefen() {
  const { konfig, fehler } = konfigLesen();
  if (!konfig) return { konfig, fehler, warnungen: [] };
  const ergebnis = pruefeKonfiguration(konfig);
  for (const pfad of bildPfade(konfig)) {
    if (!pfad.startsWith("assets/")) {
      ergebnis.fehler.push(`Der Pfad "${pfad}" muss mit "assets/" beginnen (alle Dateien gehören in den Ordner assets).`);
    } else if (!existsSync(join(WURZEL, pfad))) {
      ergebnis.fehler.push(`Die Datei "${pfad}" wurde nicht gefunden. Liegt sie wirklich im Ordner assets? (Groß-/Kleinschreibung beachten)`);
    }
  }
  return { konfig, ...ergebnis };
}

export function meldungenAusgeben({ fehler, warnungen }) {
  for (const w of warnungen) console.log(`  ⚠️  ${w}`);
  for (const f of fehler) console.log(`  ❌ ${f}`);
}
