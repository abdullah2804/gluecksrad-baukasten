// Speicher-Adapter für Netlify Blobs (der eingebaute Datenspeicher von Netlify).
// Nutzt "bedingte Schreibvorgänge" (onlyIfNew / onlyIfMatch), damit gleichzeitige
// Anfragen sich nicht gegenseitig überschreiben.

import { getStore } from "@netlify/blobs";

export class NetlifySpeicher {
  #store;

  constructor(kampagnenId, { testmodus = false } = {}) {
    // Pro Kampagne ein eigener Speicher -> neue Kampagne startet automatisch
    // mit vollen Kontingenten. Testmodus-Daten sind von echten Daten getrennt.
    const name = `gluecksrad-${kampagnenId}${testmodus ? "-test" : ""}`.slice(0, 64);
    this.#store = getStore({ name, consistency: "strong" });
  }

  async lesen(key) {
    return (await this.#store.get(key, { type: "json" })) ?? null;
  }

  async lesenMitVersion(key) {
    const e = await this.#store.getWithMetadata(key, { type: "json" });
    if (!e) return null;
    return { wert: e.data, version: e.etag };
  }

  async anlegen(key, wert) {
    const { modified } = await this.#store.setJSON(key, wert, { onlyIfNew: true });
    return modified;
  }

  async ersetzen(key, wert, version) {
    const { modified } = await this.#store.setJSON(key, wert, { onlyIfMatch: version });
    return modified;
  }

  async schreiben(key, wert) {
    await this.#store.setJSON(key, wert);
  }

  async loeschen(key) {
    await this.#store.delete(key);
  }

  async schluessel(prefix = "") {
    const { blobs } = await this.#store.list({ prefix });
    return blobs.map((b) => b.key).sort();
  }
}
