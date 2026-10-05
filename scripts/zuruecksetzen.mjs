// npm run zuruecksetzen  –  löscht alle lokal gespielten Drehs und Kontingente.
import { rmSync } from "node:fs";
import { join } from "node:path";
import { WURZEL } from "./werkzeug.mjs";

rmSync(join(WURZEL, ".lokale-daten"), { recursive: true, force: true });
console.log("✅ Lokale Testdaten gelöscht. Alle Kontingente sind wieder voll.");
