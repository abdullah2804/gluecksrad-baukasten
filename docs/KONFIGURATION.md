# Alle Einstellungen in `config/campaign.json`

Die Datei ist im sogenannten **JSON-Format** geschrieben. Die Regeln in Kürze:

- Texte stehen in geraden Anführungszeichen: `"so"` (nicht „so“)
- Zahlen ohne Anführungszeichen: `150`
- `true` = ja, `false` = nein, `null` = kein Wert
- Zwischen zwei Einträgen steht ein **Komma**, nach dem **letzten** Eintrag **keins**
- Kommentare sind in JSON nicht erlaubt – deshalb steht die Erklärung hier

Nach jeder Änderung: `npm run pruefen` (oder einfach veröffentlichen – Netlify prüft auch).

---

## `kampagne`

| Eintrag | Beispiel | Bedeutung |
|---|---|---|
| `id` | `"sommer-2027"` | Eindeutiger Kurzname (3–40 Zeichen: Kleinbuchstaben, Ziffern, `-`). **Neue Kampagne = neue id** → Kontingente und Protokoll starten neu. Nie während einer laufenden Kampagne ändern! |
| `name` | `"Sommer-Gewinnspiel 2027"` | Interner Name (erscheint z. B. als Alternativtext des Logos) |
| `start` | `"2027-06-01T00:00:00+02:00"` | Beginn. Format: Jahr-Monat-Tag `T` Stunde:Minute:Sekunde, dann Zeitzone (`+02:00` Sommerzeit, `+01:00` Winterzeit) |
| `ende` | `"2027-08-31T23:59:59+02:00"` | Ende, gleiches Format |
| `testmodus` | `false` | `true` = Demo-Formular, Vorschau-Funktion und gelber Testbalken; Drehs zählen in einem getrennten Test-Speicher. **Für den Livegang `false`!** |

## `texte`

Alle Texte der Seite. `{start}` und `{ende}` werden im Text `vorStart` durch das Datum ersetzt.

| Eintrag | Wo erscheint er? |
|---|---|
| `seitentitel` | Titel im Browser-Tab |
| `ueberschrift` | Große Überschrift oben |
| `unterzeile` | Text unter der Überschrift |
| `formularHinweis` | Überschrift des Formular-Kastens („Schritt 1 …“) |
| `radGesperrt` | Über dem Rad, solange noch nicht teilgenommen wurde |
| `radFreigeschaltet` | Über dem Rad nach erfolgreicher Teilnahme |
| `drehenKnopf` | Beschriftung des Dreh-Knopfes |
| `drehtGerade` | Knopf-Beschriftung während das Rad dreht |
| `vorStart` | Hinweis vor Kampagnenbeginn (statt des Rades) |
| `nachEnde` | Hinweis nach Kampagnenende (statt des Rades) |
| `bereitsGespielt` | Wenn mit dieser Teilnahme schon gedreht wurde |
| `ungueltigeTeilnahme` | Wenn die Teilnahme-ID nicht akzeptiert wurde |
| `fehler` | Bei technischen Problemen |
| `fusszeile` | Kleiner Text ganz unten (optional) |
| `impressumLink`, `datenschutzLink`, `teilnahmebedingungenLink` | Links in der Fußzeile (mit `https://`; leer lassen `""` = Link wird nicht angezeigt) |

## `ergebnisse`

Drei Abschnitte: `niete`, `sofortgewinn`, `grossgewinn`. Jeder hat:

| Eintrag | Bedeutung |
|---|---|
| `ueberschrift` | Große Überschrift im Ergebnis-Fenster |
| `text` | Text darunter. `{gewinn}` wird durch den Namen des gewonnenen Feldes ersetzt, `{teilnahmeId}` durch die Teilnahme-ID |
| `bild` | Bild oben im Fenster, z. B. `"assets/ergebnis-gewinn.svg"` (leer `""` = kein Bild) |
| `knopfText` | Beschriftung des Knopfes |
| `knopfLink` | Leer `""` = Knopf schließt das Fenster. Mit Adresse (`https://…`) = Knopf öffnet diese Seite (z. B. Gutschein einlösen) |

Bei Gewinnen gibt es Konfetti, beim Großgewinn besonders viel.

## `design`

| Eintrag | Bedeutung |
|---|---|
| `farben.primaer` | Hauptfarbe (Akzente, Lade-Kreis) |
| `farben.sekundaer` | Zweitfarbe (Überschriften, Links) |
| `farben.hintergrund` | Seitenhintergrund (falls kein Hintergrundbild oder während es lädt) |
| `farben.text` | Normale Textfarbe |
| `farben.knopf`, `farben.knopfText` | Farbe und Schriftfarbe der Knöpfe |
| `farben.radRand` | Außenring und Mitte des Rades |
| `farben.zeiger` | Farbe des Zeigers oben am Rad |
| `farben.karte` | Hintergrund der weißen Kästen und des Ergebnis-Fensters |
| `schriften.ueberschrift` / `schriften.text` | `name` = Name der Schrift, `url` = Google-Fonts-Adresse **oder** eigene Datei, z. B. `"assets/schriften/hausschrift.woff2"`. Die Überschriften-Schrift wird auch auf dem Rad verwendet. |
| `logo` | Pfad zum Logo, z. B. `"assets/logo.svg"` (leer = kein Logo) |
| `hintergrundbild` | Pfad zum Hintergrundbild (leer = nur Hintergrundfarbe) |
| `favicon` | Symbol im Browser-Tab |

Farben werden als Farbcode geschrieben: `#` + 6 Zeichen, z. B. `"#e8590c"`.

**Google Fonts verwenden:** Auf <https://fonts.google.com> eine Schrift wählen → „Get font“ →
„Get embed code“ → die Adresse aus `href="…"` kopieren (beginnt mit `https://fonts.googleapis.com/css2?…`).
Hinweis Datenschutz: Google Fonts lädt von Google-Servern. Wer das vermeiden will, lädt die
Schriftdatei herunter, legt sie in `assets/schriften/` und trägt den Pfad ein.

## `rad`

| Eintrag | Beispiel | Bedeutung |
|---|---|---|
| `drehdauerSekunden` | `6` | Wie lange das Rad ungefähr dreht (2–15) |
| `beschriftungAnzeigen` | `true` | `false` = keine Texte auf dem Rad (z. B. wenn die Segmentbilder schon beschriftet sind) |
| `konfettiBeiGewinn` | `true` | Konfetti bei Gewinnen an/aus |

## `integration`

Siehe [PLATTFORM-ANBINDUNG.md](PLATTFORM-ANBINDUNG.md).

| Eintrag | Standard | Bedeutung |
|---|---|---|
| `formularDatei` | `"assets/formular-einbettung.html"` | Datei mit dem Skriptcode der Plattform |
| `erfolgsEreignis` | `"teilnahme-erfolgreich"` | Name des Ereignisses / der Nachricht, die „Teilnahme erfolgreich“ meldet |
| `idFeld` | `"teilnahmeId"` | Name des Feldes, in dem die Teilnahme-ID steckt |
| `erlaubteHerkunft` | `[]` | Nur bei Formular im iframe: Adresse(n) der Plattform, z. B. `["https://formulare.plattform.de"]` |
| `urlParameter` | `""` | Nur bei Weiterleitung: Name des Parameters mit der ID, z. B. `"tid"` |

## `teilnahme`

| Eintrag | Standard | Bedeutung |
|---|---|---|
| `idMuster` | `"^[A-Za-z0-9_-]{4,64}$"` | Welche Form eine Teilnahme-ID haben muss (4–64 Zeichen aus Buchstaben, Ziffern, `_`, `-`). Wird nach Vorlage der Plattform-Doku angepasst. |

## `segmente`

Die Felder des Rades, **im Uhrzeigersinn ab dem Zeiger oben**. 2 bis ca. 12 Felder sind
gut lesbar, mehr als 16 werden auf dem Handy zu klein.

| Eintrag | Beispiel | Bedeutung |
|---|---|---|
| `id` | `"gutschein-10"` | Eindeutiger Kurzname des Feldes (Kleinbuchstaben, Ziffern, `-`). Das Kontingent wird unter dieser id gezählt – während der Kampagne nicht ändern. |
| `label` | `"10 € Gutschein"` | Text auf dem Rad und für `{gewinn}` im Ergebnis-Screen |
| `typ` | `"sofortgewinn"` | `"niete"`, `"sofortgewinn"` oder `"grossgewinn"` |
| `gewicht` | `150` | Relative Wahrscheinlichkeit (siehe unten). `0` = wird nie gezogen (Deko-Feld) |
| `kontingent` | `500` | Wie oft dieser Gewinn insgesamt vergeben wird. Bei Nieten `null` |
| `farbe` | `"#e8590c"` | Hintergrundfarbe des Feldes |
| `textfarbe` | `"#ffffff"` | Schriftfarbe auf dem Feld |
| `bild` | `"assets/segmente/gutschein.svg"` | Kleine Grafik auf dem Feld (leer `""` = keine) |

### Wie rechnet man mit Gewichten?

Die Chance eines Feldes = sein Gewicht ÷ Summe aller Gewichte.

Beispiel mit Summe 2.101 (wie in der Demo):

| Feld | Gewicht | Chance |
|---|---|---|
| E-Bike | 1 | 1 ÷ 2.101 ≈ 0,05 % |
| 5 € Gutschein | 250 | 250 ÷ 2.101 ≈ 11,9 % |
| 4 × Niete | je 400 | je ≈ 19 % |

`npm run pruefen` zeigt diese Tabelle automatisch an, `npm run simulieren` spielt sie durch.

- Ist ein Kontingent aufgebraucht, wird das Feld nicht mehr gezogen. Seine Chance verteilt
  sich auf die übrigen Felder (vor allem die Nieten).
- Steht derselbe Gewinn auf mehreren Feldern, hat **jedes Feld sein eigenes Kontingent**.
  Beispiel: zwei Felder „5 € Gutschein“ mit je 500 → insgesamt bis zu 1.000 Gutscheine.
- **Faustregel für die Planung:** Erwartete Gewinne ≈ erwartete Drehs × Chance.
  Bei 20.000 erwarteten Teilnahmen und 2 % Chance werden etwa 400 Stück benötigt.
  Ist das Kontingent kleiner, ist es irgendwann leer – das ist gewollt und sicher.
