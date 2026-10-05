// Anbindung an das Formular der Teilnahme-Plattform.
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │ PLATZHALTER – sobald die Doku der Plattform vorliegt, wird hier          │
// │ festgelegt, auf welches Signal wir hören. Bis dahin werden ALLE          │
// │ üblichen Wege unterstützt. Das Rad wird freigeschaltet, sobald einer     │
// │ davon "Teilnahme erfolgreich" + Teilnahme-ID meldet:                     │
// │                                                                          │
// │ 1. Funktionsaufruf:  window.Gluecksrad.teilnahmeErfolgreich("ID-123")    │
// │ 2. Ereignis (Event): window.dispatchEvent(new CustomEvent(               │
// │        "teilnahme-erfolgreich", { detail: { teilnahmeId: "ID-123" } }))  │
// │ 3. Nachricht aus einem iframe (postMessage):                             │
// │        { type: "teilnahme-erfolgreich", teilnahmeId: "ID-123" }          │
// │ 4. URL-Parameter nach Weiterleitung, z. B. ?tid=ID-123                   │
// │        (nur wenn "integration.urlParameter" gesetzt ist)                 │
// │                                                                          │
// │ Name des Ereignisses, Name des ID-Feldes, erlaubte iframe-Herkunft und   │
// │ URL-Parameter stehen in config/campaign.json unter "integration".        │
// └──────────────────────────────────────────────────────────────────────────┘

/**
 * Hört auf die Erfolgsmeldung der Plattform und ruft `beiErfolg({ teilnahmeId, signatur })` EINMAL auf.
 */
export function plattformAnbinden(integration, beiErfolg) {
  const ereignis = integration.erfolgsEreignis || "teilnahme-erfolgreich";
  const idFeld = integration.idFeld || "teilnahmeId";
  const erlaubteHerkunft = integration.erlaubteHerkunft || [];
  let gemeldet = false;

  const melden = (teilnahmeId, signatur) => {
    if (gemeldet) return;
    if (typeof teilnahmeId === "number") teilnahmeId = String(teilnahmeId);
    if (typeof teilnahmeId !== "string" || teilnahmeId.trim() === "") {
      console.warn("[Glücksrad] Erfolgsmeldung ohne Teilnahme-ID erhalten – wird ignoriert.");
      return;
    }
    gemeldet = true;
    beiErfolg({ teilnahmeId: teilnahmeId.trim(), signatur: typeof signatur === "string" ? signatur : undefined });
  };

  // 1. Funktionsaufruf
  window.Gluecksrad = Object.freeze({ teilnahmeErfolgreich: (id, signatur) => melden(id, signatur) });

  // 2. Ereignis auf window oder document
  const beiEreignis = (e) => melden(e.detail?.[idFeld], e.detail?.signatur);
  window.addEventListener(ereignis, beiEreignis);
  document.addEventListener(ereignis, beiEreignis);

  // 3. postMessage (z. B. Formular in einem iframe)
  window.addEventListener("message", (e) => {
    const erlaubt = e.origin === location.origin || erlaubteHerkunft.includes(e.origin);
    if (!erlaubt) return;
    let d = e.data;
    if (typeof d === "string") {
      try { d = JSON.parse(d); } catch { return; }
    }
    if (d && (d.type === ereignis || d.event === ereignis)) {
      melden(d[idFeld] ?? d.detail?.[idFeld], d.signatur ?? d.detail?.signatur);
    }
  });

  // 4. URL-Parameter nach Weiterleitung
  if (integration.urlParameter) {
    const id = new URLSearchParams(location.search).get(integration.urlParameter);
    if (id) melden(id, new URLSearchParams(location.search).get("signatur") ?? undefined);
  }

  return { melden };
}

/**
 * Lädt den Skriptcode der Plattform aus der Datei in assets/ (z. B. assets/formular-einbettung.html)
 * und fügt ihn in die Seite ein. Enthaltene <script>-Tags werden ausgeführt – in der richtigen Reihenfolge.
 * Gibt false zurück, wenn die Datei leer ist (nur Kommentare).
 */
export async function formularEinbetten(container, pfad) {
  if (!pfad) return false;
  const antwort = await fetch(pfad, { cache: "no-cache" });
  if (!antwort.ok) throw new Error(`Formular-Datei "${pfad}" nicht gefunden`);
  const html = await antwort.text();
  if (html.replace(/<!--[\s\S]*?-->/g, "").trim() === "") return false;

  const vorlage = document.createElement("template");
  vorlage.innerHTML = html;
  const skripte = [...vorlage.content.querySelectorAll("script")];
  skripte.forEach((s) => s.remove());
  container.append(vorlage.content);

  for (const alt of skripte) {
    const neu = document.createElement("script");
    for (const { name, value } of alt.attributes) neu.setAttribute(name, value);
    neu.textContent = alt.textContent;
    const geladen = neu.src && !neu.async ? new Promise((r) => { neu.onload = neu.onerror = r; }) : null;
    container.append(neu);
    if (geladen) await geladen;
  }
  return true;
}

/** Demo-Formular für den Testmodus: simuliert die Plattform und löst das echte Erfolgs-Ereignis aus. */
export function demoFormularZeigen(container, integration) {
  const ereignis = integration.erfolgsEreignis || "teilnahme-erfolgreich";
  const idFeld = integration.idFeld || "teilnahmeId";
  container.innerHTML = `
    <form class="demo-formular" novalidate>
      <p class="demo-hinweis"><strong>Testmodus:</strong> Dieses Demo-Formular ersetzt das Formular Ihrer Plattform.
        Es erzeugt eine Test-Teilnahme-ID und schaltet das Rad frei – genau wie später die Plattform.</p>
      <label>Vorname <input type="text" name="vorname" autocomplete="given-name" value="Erika"></label>
      <label>E-Mail <input type="email" name="email" autocomplete="email" value="erika@example.com"></label>
      <label class="checkbox"><input type="checkbox" required checked> Ich akzeptiere die Teilnahmebedingungen.</label>
      <button class="knopf" type="submit">Teilnehmen</button>
    </form>`;
  container.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = "DEMO-" + crypto.getRandomValues(new Uint32Array(2)).join("").slice(0, 12);
    window.dispatchEvent(new CustomEvent(ereignis, { detail: { [idFeld]: id } }));
  });
}
