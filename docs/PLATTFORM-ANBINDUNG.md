# Anbindung an das Formular Ihrer Plattform

> **Status: Platzhalter.** Die Doku der Plattform steht noch aus. Der Baukasten unterstützt
> bereits alle üblichen Wege, wie ein Formular „Teilnahme erfolgreich“ melden kann.
> Sobald die Doku da ist, wird nur noch die passende Einstellung gewählt.

## 1. Formular einbinden

Ihre Plattform liefert einen **Skriptcode** (Einbettungs-Code) für das Formular.

1. Öffnen Sie die Datei **`assets/formular-einbettung.html`**
2. Fügen Sie den Code der Plattform **unter** dem grauen Kommentarblock ein
3. Speichern – fertig. Das Formular erscheint im Kasten „Schritt 1“.

Der Code darf `<div>`- und `<script>`-Zeilen enthalten; Skripte werden in der richtigen
Reihenfolge ausgeführt.

## 2. Wie erfährt das Rad, dass die Teilnahme erfolgreich war?

Das Rad bleibt gesperrt, bis es eine **Erfolgsmeldung mit Teilnahme-ID** erhält.
Unterstützt werden diese vier Wege (in `app/js/plattform.js`):

| Weg | So sieht das bei der Plattform aus | Einstellung in `config/campaign.json` |
|---|---|---|
| **1. Ereignis (Event)** | Die Plattform löst ein JavaScript-Ereignis aus, z. B. `teilnahme-erfolgreich` mit der ID im Feld `teilnahmeId` | `integration.erfolgsEreignis` = Name des Ereignisses, `integration.idFeld` = Name des ID-Feldes |
| **2. Rückruf-Funktion (Callback)** | In den Einstellungen der Plattform kann man eine Funktion angeben, die nach dem Absenden aufgerufen wird | Dort eintragen: `Gluecksrad.teilnahmeErfolgreich(ID)` |
| **3. Nachricht aus einem iframe** | Das Formular läuft in einem eingebetteten Fenster und schickt eine Nachricht (`postMessage`) | `integration.erlaubteHerkunft` = Adresse der Plattform, z. B. `["https://formulare.plattform.de"]`, sowie `erfolgsEreignis` und `idFeld` |
| **4. Weiterleitung** | Nach dem Absenden leitet die Plattform auf unsere Seite weiter, z. B. `…/?tid=ABC123` | `integration.urlParameter` = `"tid"` |

**Beispiel für Weg 2:** Bietet die Plattform ein Feld „JavaScript nach erfolgreicher
Teilnahme“, tragen Sie dort ein (Platzhalter der Plattform für die ID verwenden):

```html
<script>Gluecksrad.teilnahmeErfolgreich("{{teilnahme_id}}");</script>
```

**Was wir aus der Plattform-Doku brauchen:**
1. Wie meldet das Formular den Erfolg? (Ereignis / Callback / postMessage / Weiterleitung)
2. Wie heißt das Feld mit der Teilnahme-ID, und wie sieht eine ID aus? (Länge, erlaubte Zeichen)
3. Kann die Plattform die ID signieren oder kann man eine ID bei der Plattform nachprüfen? (siehe unten)

Das ID-Format wird in `teilnahme.idMuster` hinterlegt. Standard: 4–64 Zeichen aus
Buchstaben, Ziffern, `_` und `-`.

## 3. Was passiert mit der ID?

Nach der Erfolgsmeldung wird das Rad freigeschaltet. Beim Klick auf „Rad drehen“ sendet die
Seite die ID an `/api/spin`:

```
POST /api/spin
{ "teilnahmeId": "ABC123", "signatur": "…optional…" }
```

Antworten des Servers:

| Antwort | Bedeutung | Was der Besucher sieht |
|---|---|---|
| `{ "ok": true, "ergebnis": { "segmentIndex": 2, "typ": "sofortgewinn", "label": "10 € Gutschein", … } }` | Gewinn ausgelost | Rad stoppt auf Feld 3, Ergebnis-Screen |
| `409` `BEREITS_GESPIELT` | Mit dieser ID wurde schon gedreht | Text `texte.bereitsGespielt` + das damalige Ergebnis |
| `400` `UNGUELTIGE_TEILNAHME` | ID fehlt, falsches Format oder ungültig | Text `texte.ungueltigeTeilnahme` |
| `403` `VOR_START` / `BEENDET` | Außerhalb des Kampagnenzeitraums | Text `texte.vorStart` / `texte.nachEnde` |
| `500` `FEHLER` | Technisches Problem | Text `texte.fehler`, erneuter Versuch möglich |

## Sicherheit: Ist die Teilnahme-ID echt?

Der Server garantiert: **Jede ID dreht höchstens einmal.** Er kann aber ohne Hilfe der
Plattform nicht wissen, ob eine ID **wirklich** aus einer echten Teilnahme stammt. Ein
technisch versierter Nutzer könnte sich sonst IDs ausdenken und `/api/spin` direkt
aufrufen. Zwei Lösungen sind vorbereitet – welche passt, hängt von der Plattform ab:

**Variante A – Signatur (empfohlen, wenn die Plattform es kann)**
Die Plattform berechnet zu jeder ID eine Signatur (HMAC-SHA256 mit einem geheimen
Schlüssel, den nur Plattform und Netlify kennen) und gibt sie zusammen mit der ID weiter.
Aktivieren: bei Netlify die Umgebungsvariable `TEILNAHME_SIGNATUR_SCHLUESSEL` mit
dem gemeinsamen Schlüssel anlegen. Danach werden nur noch korrekt signierte IDs akzeptiert.

**Variante B – Rückfrage bei der Plattform**
Hat die Plattform eine Schnittstelle („API“), über die man eine Teilnahme nachschlagen
kann, fragt der Server dort vor jedem Dreh nach. Die Stelle dafür ist vorbereitet in
`server/teilnahme.mjs` → Funktion `teilnahmeBeiPlattformBestaetigen`.

Solange keine der beiden Varianten aktiv ist, gilt nur die Format-Prüfung.
**Für eine Kampagne mit wertvollen Gewinnen sollte eine Variante vor dem Livegang aktiv sein.**

## Testen ohne Plattform

Im Testmodus (`"testmodus": true`, oder lokal mit `npm start`) erscheint ein
Demo-Formular. Es erzeugt IDs wie `DEMO-123456789012` und löst genau das Ereignis aus,
auf das das Rad hört – also denselben Weg wie später die Plattform.
IDs, die mit `DEMO-` beginnen, werden außerhalb des Testmodus immer abgelehnt.

Zum Ausprobieren der anderen Wege können Sie in der Browser-Konsole (F12) eingeben:

```js
Gluecksrad.teilnahmeErfolgreich("DEMO-1234")
// oder
window.dispatchEvent(new CustomEvent("teilnahme-erfolgreich", { detail: { teilnahmeId: "DEMO-5678" } }))
```
