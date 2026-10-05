// Speicher-Adapter. Alle Adapter bieten dieselben Funktionen, damit die
// Spiellogik nicht wissen muss, wo die Daten liegen:
//
//   lesen(key)                     -> Wert | null
//   lesenMitVersion(key)           -> { wert, version } | null
//   anlegen(key, wert)             -> true, wenn neu angelegt; false, wenn es den Schlüssel schon gab
//   ersetzen(key, wert, version)   -> true, wenn die Version noch passte (sonst false)
//   schreiben(key, wert)           -> überschreibt ohne Bedingung
//   loeschen(key)                  -> entfernt den Eintrag
//   schluessel(prefix)             -> Liste aller Schlüssel mit diesem Anfang
//
// `anlegen` und `ersetzen` sind "atomar": Wenn zwei Anfragen gleichzeitig
// kommen, gewinnt genau eine. Darauf beruhen "1 Dreh pro Teilnahme" und
// "Kontingent wird nie überschritten".

import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Im Arbeitsspeicher – für automatische Tests und die Simulation. */
export class ArbeitsspeicherSpeicher {
  #daten = new Map();
  #zaehler = 0;

  async lesen(key) {
    const e = this.#daten.get(key);
    return e ? structuredClone(e.wert) : null;
  }
  async lesenMitVersion(key) {
    const e = this.#daten.get(key);
    return e ? { wert: structuredClone(e.wert), version: e.version } : null;
  }
  async anlegen(key, wert) {
    await Promise.resolve(); // simuliert, dass andere Anfragen dazwischenkommen können
    if (this.#daten.has(key)) return false;
    this.#daten.set(key, { wert: structuredClone(wert), version: String(++this.#zaehler) });
    return true;
  }
  async ersetzen(key, wert, version) {
    await Promise.resolve();
    const e = this.#daten.get(key);
    if (!e || e.version !== version) return false;
    this.#daten.set(key, { wert: structuredClone(wert), version: String(++this.#zaehler) });
    return true;
  }
  async schreiben(key, wert) {
    this.#daten.set(key, { wert: structuredClone(wert), version: String(++this.#zaehler) });
  }
  async loeschen(key) {
    this.#daten.delete(key);
  }
  async schluessel(prefix = "") {
    return [...this.#daten.keys()].filter((k) => k.startsWith(prefix)).sort();
  }
}

/**
 * Dateien in einem Ordner – für den lokalen Testmodus (`npm start`).
 * Jeder Schlüssel wird zu einer JSON-Datei. Gedacht für EINEN Prozess.
 */
export class DateiSpeicher {
  #ordner;
  #warteschlange = Promise.resolve();

  constructor(ordner) {
    this.#ordner = ordner;
  }

  #pfad(key) {
    return join(this.#ordner, encodeURIComponent(key) + ".json");
  }

  // Alle schreibenden Zugriffe nacheinander abarbeiten (einfaches Schloss).
  #exklusiv(fn) {
    const lauf = this.#warteschlange.then(fn, fn);
    this.#warteschlange = lauf.catch(() => {});
    return lauf;
  }

  async #roh(key) {
    try {
      return JSON.parse(await readFile(this.#pfad(key), "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }

  async #speichern(key, wert) {
    await mkdir(this.#ordner, { recursive: true });
    const ziel = this.#pfad(key);
    const tmp = ziel + ".tmp";
    await writeFile(tmp, JSON.stringify(wert, null, 2));
    await rename(tmp, ziel);
  }

  async lesen(key) {
    return this.#roh(key);
  }
  async lesenMitVersion(key) {
    return this.#exklusiv(async () => {
      const wert = await this.#roh(key);
      if (wert === null) return null;
      return { wert, version: JSON.stringify(wert) };
    });
  }
  async anlegen(key, wert) {
    return this.#exklusiv(async () => {
      if ((await this.#roh(key)) !== null) return false;
      await this.#speichern(key, wert);
      return true;
    });
  }
  async ersetzen(key, wert, version) {
    return this.#exklusiv(async () => {
      const aktuell = await this.#roh(key);
      if (aktuell === null || JSON.stringify(aktuell) !== version) return false;
      await this.#speichern(key, wert);
      return true;
    });
  }
  async schreiben(key, wert) {
    return this.#exklusiv(() => this.#speichern(key, wert));
  }
  async loeschen(key) {
    return this.#exklusiv(() => rm(this.#pfad(key), { force: true }));
  }
  async schluessel(prefix = "") {
    let dateien;
    try {
      dateien = await readdir(this.#ordner);
    } catch (e) {
      if (e.code === "ENOENT") return [];
      throw e;
    }
    return dateien
      .filter((d) => d.endsWith(".json"))
      .map((d) => decodeURIComponent(d.slice(0, -5)))
      .filter((k) => k.startsWith(prefix))
      .sort();
  }
}
