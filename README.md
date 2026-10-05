# 🎡 Glücksrad-Baukasten

Ein wiederverwendbares Glücksrad für Gewinnspiel-Aktionen.
**Pro Kampagne tauschen Sie nur zwei Dinge aus:**

1. die Datei **`config/campaign.json`** (Texte, Farben, Gewinne, Zeitraum)
2. die Bilder im Ordner **`assets/`** (Logo, Hintergrund, Gewinn-Grafiken)

Der Programmcode bleibt immer gleich.

---

## Was kann das Glücksrad?

- Läuft auf Handy, Tablet und Computer
- Das Rad dreht sich flüssig und stoppt genau auf dem Feld, das der **Server** ausgelost hat
- **Der Gewinn wird nie im Browser bestimmt** – Schummeln über den Browser ist nicht möglich
- Gewinnchancen (Gewichte) und Stückzahlen (Kontingente) pro Gewinn, z. B. 1 Hauptgewinn, 500 Sofortgewinne
- Ist ein Gewinn aufgebraucht, kann er nicht mehr gezogen werden – auch nicht, wenn viele gleichzeitig drehen
- **Jede Teilnahme kann nur ein einziges Mal drehen**
- Jeder Dreh wird protokolliert (Teilnahme-ID, Ergebnis, Zeitpunkt) – als Excel-Datei abrufbar
- Drei Ergebnis-Screens: **Niete**, **Sofortgewinn**, **Großgewinn** (mit Konfetti)
- Das Rad bleibt gesperrt, bis Ihr Teilnahme-Formular „Teilnahme erfolgreich“ meldet
- Kampagnenzeitraum: vor dem Start und nach dem Ende erscheint ein Hinweis statt des Rades

---

## Neue Kampagne in 5 Schritten

> Sie brauchen dafür keine Programmierkenntnisse. Alles, was Sie bearbeiten, sind
> eine Textdatei und ein Bilder-Ordner. Zum Bearbeiten der Textdatei eignet sich
> ein einfacher Editor, z. B. [Visual Studio Code](https://code.visualstudio.com/)
> (kostenlos) – er zeigt Tippfehler farbig an.
> Wenn Sie direkt auf GitHub arbeiten: Datei anklicken → Stift-Symbol (✏️) → ändern → „Commit changes“.

### Schritt 1: Grafiken austauschen

Legen Sie Ihre Bilder in den Ordner **`assets/`**:

| Datei | Wofür | Empfehlung |
|---|---|---|
| `logo.svg` (oder `.png`) | Logo oben auf der Seite | max. 84 px hoch dargestellt, SVG oder PNG mit transparentem Hintergrund |
| `hintergrund.svg` (oder `.jpg`) | Hintergrund der ganzen Seite | ca. 1920 × 1280 px, JPG unter 400 KB |
| `favicon.svg` | kleines Symbol im Browser-Tab | quadratisch |
| `segmente/…` | kleine Grafik auf einem Rad-Feld (optional) | quadratisch, SVG oder PNG, ca. 200 × 200 px |
| `ergebnis-niete.svg`, `ergebnis-gewinn.svg`, `ergebnis-hauptgewinn.svg` | Bild auf dem Ergebnis-Screen | quadratisch, ca. 320 × 320 px |

Sie können die Dateien einfach durch eigene mit **demselben Namen** ersetzen.
Wenn Ihre Dateien anders heißen, tragen Sie den neuen Namen in Schritt 2 ein.
Achtung: Groß-/Kleinschreibung zählt (`Logo.PNG` ist nicht `logo.png`).

### Schritt 2: `config/campaign.json` anpassen

Öffnen Sie `config/campaign.json` und ändern Sie, was in Anführungszeichen steht:

- **`kampagne.id`** – ein **neuer**, eindeutiger Kurzname, z. B. `"sommer-2027"`.
  *Wichtig:* Eine neue ID bedeutet: frische Kontingente und ein leeres Protokoll.
  Ändern Sie die ID **nicht während** einer laufenden Kampagne.
- **`kampagne.start`** und **`kampagne.ende`** – Zeitraum, z. B. `"2027-06-01T00:00:00+02:00"`
  (`+02:00` = Sommerzeit, `+01:00` = Winterzeit)
- **`texte`** – alle Texte auf der Seite
- **`ergebnisse`** – Überschrift, Text und Bild der drei Ergebnis-Screens.
  `{gewinn}` wird automatisch durch den Namen des Gewinns ersetzt.
- **`design.farben`** – Farben als Farbcode, z. B. `"#e8590c"`
  (Farbcodes finden Sie z. B. mit Googles „Color Picker“)
- **`design.schriften`** – Schriftart (Google-Fonts-Adresse oder eigene Datei in `assets/schriften/`)
- **`segmente`** – die Felder des Rades: Text, Typ, Gewicht, Kontingent, Farbe, Bild

Eine Erklärung **jedes einzelnen Eintrags** finden Sie in
👉 **[docs/KONFIGURATION.md](docs/KONFIGURATION.md)**.

> **Die drei häufigsten Tippfehler:**
> 1. Komma vergessen zwischen zwei Einträgen
> 2. Komma zu viel nach dem **letzten** Eintrag einer Liste
> 3. Anführungszeichen vergessen oder „typografische“ Anführungszeichen („ “) statt `"` verwendet
>
> Keine Sorge: Fehler werden beim Prüfen (Schritt 4) und beim Veröffentlichen mit
> Zeilennummer gemeldet. Eine fehlerhafte Konfiguration geht **nie** online.

### Schritt 3: Gewinne und Chancen festlegen

Jedes Feld im Abschnitt `segmente` sieht so aus:

```json
{ "id": "gutschein-10", "label": "10 € Gutschein", "typ": "sofortgewinn", "gewicht": 150, "kontingent": 500, "farbe": "#e8590c", "textfarbe": "#ffffff", "bild": "assets/segmente/gutschein.svg" }
```

- **`typ`**: `"niete"`, `"sofortgewinn"` oder `"grossgewinn"` – bestimmt den Ergebnis-Screen
- **`gewicht`**: wie wahrscheinlich das Feld ist, **im Verhältnis zu den anderen**.
  Beispiel: Summe aller Gewichte = 2.000, dieses Feld hat 100 → Chance 5 %.
- **`kontingent`**: wie oft dieser Gewinn insgesamt vergeben werden darf. Bei Nieten: `null`.
- **`id`**: ein eindeutiger Kurzname pro Feld (Kleinbuchstaben, Ziffern, Bindestriche)

Gut zu wissen:
- Ist ein Gewinn aufgebraucht, landet das Rad stattdessen auf anderen Feldern.
- Die Chancen gelten **pro Dreh**. Ein Hauptgewinn mit sehr kleiner Chance kann früh,
  spät oder – bei wenigen Teilnehmern – gar nicht fallen. Rechnen Sie mit der erwarteten
  Teilnehmerzahl: Bei 10.000 erwarteten Drehs und Gewicht-Anteil 0,01 % fällt der
  Hauptgewinn im Schnitt einmal.
- Mindestens ein Feld muss eine Niete sein.

### Schritt 4: Lokal testen

Siehe Abschnitt [„Lokaler Testmodus“](#lokaler-testmodus) unten. Kurz:

```
npm run pruefen      ← prüft die Konfiguration und zeigt die Gewinnchancen als Tabelle
npm run simulieren   ← spielt 10.000 Drehs zur Probe durch
npm start            ← startet die Seite auf Ihrem Computer
```

### Schritt 5: Veröffentlichen

1. In `config/campaign.json` **`"testmodus": false`** setzen
2. Formular-Code der Plattform in `assets/formular-einbettung.html` einfügen
   (siehe [docs/PLATTFORM-ANBINDUNG.md](docs/PLATTFORM-ANBINDUNG.md))
3. Änderungen speichern und auf GitHub hochladen („Commit“). Netlify veröffentlicht automatisch.

Die einmalige Einrichtung von Netlify ist hier beschrieben:
👉 **[docs/NETLIFY-DEPLOYMENT.md](docs/NETLIFY-DEPLOYMENT.md)**

---

## Lokaler Testmodus

So probieren Sie alles auf Ihrem eigenen Computer aus – ohne Netlify, ohne Internet-Konto.

**Einmalig vorbereiten:**
1. **Node.js** installieren: <https://nodejs.org> → Version „LTS“ herunterladen und installieren
   (einfach immer „Weiter“ klicken).
2. Diesen Projektordner auf Ihren Computer laden (auf GitHub: grüner Knopf „Code“ → „Download ZIP“, dann entpacken).

**Jedes Mal:**
1. Ein Terminal im Projektordner öffnen:
   - **Windows:** Projektordner im Explorer öffnen, oben in die Adresszeile `cmd` tippen, Enter
   - **Mac:** Rechtsklick auf den Ordner → „Neues Terminal beim Ordner“
2. Eintippen und Enter drücken:
   ```
   npm start
   ```
3. Im Browser öffnen: **<http://localhost:8888>**
4. Beenden: im Terminal **Strg + C** drücken

Im Testmodus …
- erscheint ein gelber Balken „Testmodus“ oben auf der Seite,
- gibt es ein **Demo-Formular**, das wie die echte Plattform eine Teilnahme-ID erzeugt und das Rad freischaltet,
- werden Änderungen an `config/campaign.json` sofort übernommen (Seite im Browser neu laden).

**Nützliche Adressen im Testmodus:**

| Adresse | Was passiert |
|---|---|
| <http://localhost:8888/?vorschau=niete> | Rad dreht auf eine Niete und zeigt den Niete-Screen (beliebig oft) |
| <http://localhost:8888/?vorschau=sofortgewinn> | dasselbe für einen Sofortgewinn |
| <http://localhost:8888/?vorschau=grossgewinn> | dasselbe für den Hauptgewinn – ideal, um das Design zu prüfen |
| <http://localhost:8888/api/admin?schluessel=test> | Übersicht: wie viele Drehs, wie viele Gewinne noch übrig |
| <http://localhost:8888/api/admin?schluessel=test&ansicht=csv> | Protokoll aller Drehs als Excel-Datei (CSV) |

**Weitere Befehle:**

| Befehl | Wirkung |
|---|---|
| `npm run pruefen` | Prüft `config/campaign.json` auf Fehler und zeigt die Gewinnchancen |
| `npm run simulieren` | Spielt 10.000 Drehs durch und zeigt, wie oft was gewonnen wurde (`npm run simulieren 50000` für mehr) |
| `npm run zuruecksetzen` | Löscht alle lokalen Test-Drehs, Kontingente sind wieder voll |
| `npm test` | Automatische Tests der Spiellogik (für Entwickler) |

---

## Ordnerstruktur

```
gluecksrad-baukasten/
├── config/
│   └── campaign.json          ← PRO KAMPAGNE ÄNDERN: Texte, Farben, Gewinne, Zeitraum
├── assets/                    ← PRO KAMPAGNE ÄNDERN: alle Bilder & das Plattform-Formular
│   ├── logo.svg
│   ├── hintergrund.svg
│   ├── favicon.svg
│   ├── ergebnis-*.svg         (Bilder der Ergebnis-Screens)
│   ├── segmente/              (Grafiken auf den Rad-Feldern)
│   ├── schriften/             (optional: eigene Schriftdateien)
│   └── formular-einbettung.html  (Skriptcode des Teilnahme-Formulars)
│
├── app/                       ┐
│   ├── index.html             │
│   ├── css/style.css          │  Webseite (Rad, Screens, Formular-Anbindung)
│   └── js/                    │
│       ├── app.js             │  Ablauf der Seite
│       ├── rad.js             │  Zeichnen & Drehen des Rades
│       ├── plattform.js       │  Anbindung an das Plattform-Formular (Platzhalter)
│       └── konfetti.js        ┘
├── netlify/functions/         ┐  Server-Funktionen bei Netlify:
│   ├── spin.mjs               │  /api/spin  – ermittelt den Gewinn
│   └── admin.mjs              │  /api/admin – Übersicht & Protokoll-Export
├── server/                    │  Spiellogik (Gewichte, Kontingente, 1 Dreh pro ID, Protokoll)
├── scripts/                   │  Testserver, Prüfen, Simulieren, Bauen
├── test/                      │  automatische Tests
├── docs/                      │  Anleitungen
├── netlify.toml               │  Netlify-Einstellungen
└── package.json               ┘  NICHT ÄNDERN – bleibt für jede Kampagne gleich
```

---

## So funktioniert es (vereinfacht)

```
 Besucher                 Webseite (Browser)                     Server (/api/spin)
    │  füllt Formular aus       │                                        │
    │ ────────────────────────► │  Plattform meldet „Teilnahme           │
    │                           │  erfolgreich“ + Teilnahme-ID           │
    │                           │  → Rad wird freigeschaltet             │
    │  klickt „Rad drehen“      │                                        │
    │ ────────────────────────► │  Rad dreht los und fragt den Server ─► │ prüft: Zeitraum? ID gültig?
    │                           │                                        │ schon gedreht? → ablehnen
    │                           │                                        │ lost Gewinn aus (Gewichte,
    │                           │                                        │ Kontingente), protokolliert
    │                           │ ◄──────────── „Feld Nr. 3“ ─────────── │
    │                           │  Rad bremst genau auf Feld 3 ab        │
    │ ◄──────────────────────── │  Ergebnis-Screen                       │
```

Der Browser erfährt Gewichte und Kontingente nie – er bekommt nur Texte, Farben und das Ergebnis.

---

## Wichtige Hinweise vor dem Livegang

- [ ] `"testmodus": false` in `config/campaign.json`
- [ ] Neue, eindeutige `kampagne.id`
- [ ] Zeitraum (`start`/`ende`) stimmt, inkl. Zeitzone
- [ ] Formular-Code in `assets/formular-einbettung.html` eingefügt und getestet
- [ ] `ADMIN_SCHLUESSEL` bei Netlify gesetzt (für Übersicht & Excel-Export)
- [ ] Impressum-, Datenschutz- und Teilnahmebedingungen-Links eingetragen
- [ ] Teilnahme-ID-Prüfung mit der Plattform abgestimmt (siehe unten)

> ⚠️ **Sicherheit der Teilnahme-IDs:** Der Server lässt jede ID nur einmal drehen.
> Solange er aber nicht überprüfen kann, ob eine ID **wirklich** von Ihrer Plattform
> stammt, könnte ein technisch versierter Nutzer sich selbst IDs ausdenken und mehrfach
> drehen. Dafür gibt es zwei vorbereitete Lösungen (Signatur oder Rückfrage bei der
> Plattform), die wir aktivieren, sobald die Plattform-Doku vorliegt.
> Details: [docs/PLATTFORM-ANBINDUNG.md](docs/PLATTFORM-ANBINDUNG.md#sicherheit-ist-die-teilnahme-id-echt)

Datenschutz: Im Protokoll werden nur Teilnahme-ID, Ergebnis und Zeitpunkt gespeichert –
keine Namen, E-Mail-Adressen oder IP-Adressen.
