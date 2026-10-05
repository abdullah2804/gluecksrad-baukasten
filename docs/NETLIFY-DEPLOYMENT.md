# Veröffentlichen mit Netlify

Netlify ist ein Dienst, der Webseiten und kleine Server-Funktionen bereitstellt.
Für ein Gewinnspiel reicht in der Regel der kostenlose Tarif.
Die Einrichtung machen Sie **einmal**. Danach wird jede Änderung, die Sie auf GitHub speichern,
automatisch veröffentlicht.

Sie brauchen:
- ein **GitHub-Konto**, auf dem dieses Projekt liegt
- ein **Netlify-Konto** (kostenlos, Anmeldung unter <https://app.netlify.com/signup> – am einfachsten „Sign up with GitHub“)

---

## A) Einmalige Einrichtung (ca. 10 Minuten)

### 1. Projekt mit Netlify verbinden

1. Bei Netlify anmelden: <https://app.netlify.com>
2. Auf **„Add new project“** (bzw. „Add new site“) → **„Import an existing project“** klicken
3. **„GitHub“** wählen und den Zugriff erlauben
4. Das Projekt **`gluecksrad-baukasten`** (bzw. Ihre Kopie davon) auswählen
5. Bei **„Branch to deploy“** den Zweig auswählen, der live gehen soll (meist `main`)
6. Alle anderen Felder **so lassen** – die Einstellungen kommen automatisch aus der Datei `netlify.toml`
   (Build command: `npm run bauen`, Publish directory: `dist`)
7. Auf **„Deploy“** klicken

Nach 1–2 Minuten ist die Seite online unter einer Adresse wie `https://zufallsname-123.netlify.app`.

### 2. Admin-Schlüssel festlegen (für Übersicht und Excel-Export)

1. In Netlify Ihr Projekt öffnen → **„Project configuration“** (bzw. „Site configuration“) → **„Environment variables“**
2. **„Add a variable“** → **„Add a single variable“**
3. Key: `ADMIN_SCHLUESSEL`
   Value: ein langes, schwer zu erratendes Passwort (z. B. 30 zufällige Zeichen aus einem Passwort-Generator)
4. Speichern
5. Damit die Änderung wirkt: **„Deploys“** → **„Trigger deploy“** → **„Deploy project“**

Danach erreichen Sie:
- **Übersicht:** `https://IHRE-ADRESSE/api/admin?schluessel=IHR-ADMIN-SCHLUESSEL`
  → Anzahl Drehs, vergebene und übrige Gewinne
- **Protokoll als Excel-Datei:** `https://IHRE-ADRESSE/api/admin?schluessel=IHR-ADMIN-SCHLUESSEL&ansicht=csv`
  → Liste aller Drehs (Zeitpunkt, Teilnahme-ID, Ergebnis, Gewinn). Öffnet sich direkt in Excel.

> Geben Sie diese Adressen nicht weiter – wer den Schlüssel kennt, sieht das Protokoll.
> Die Zeitangaben im Protokoll sind in UTC (deutsche Zeit = UTC + 1 Std. im Winter, + 2 Std. im Sommer).

### 3. Eigene Domain (optional)

Projekt → **„Domain management“** → **„Add a domain“** → Anweisungen folgen
(z. B. `gewinnspiel.ihre-firma.de`). Netlify richtet das HTTPS-Zertifikat automatisch ein.

### 4. Datenspeicher

Für die Speicherung von Kontingenten, „bereits gedreht“-Vermerken und Protokoll
nutzt der Baukasten **Netlify Blobs**. Das ist bei Netlify automatisch aktiv –
Sie müssen nichts einrichten.

- Jede Kampagne (`kampagne.id`) hat ihren **eigenen** Speicher.
  Neue ID = volle Kontingente, leeres Protokoll.
- Drehs im **Testmodus** landen in einem **getrennten** Test-Speicher und zählen nicht
  für die echte Kampagne.

---

## B) Eine neue Kampagne veröffentlichen

1. `config/campaign.json` und Bilder in `assets/` anpassen (siehe [README](../README.md))
2. Auf GitHub speichern („Commit changes“)
3. Netlify baut und veröffentlicht automatisch. Den Fortschritt sehen Sie unter **„Deploys“**.

**Wenn ein Deploy fehlschlägt** (roter Status „Failed“):
1. Auf den fehlgeschlagenen Deploy klicken
2. Im Log nach den Zeilen mit ❌ suchen – dort steht auf Deutsch, was in
   `config/campaign.json` nicht stimmt (z. B. „Die Datei assets/logo.png wurde nicht gefunden“)
3. Korrigieren, erneut speichern

Die bisherige Version bleibt online, bis ein Deploy erfolgreich war. Eine fehlerhafte
Konfiguration kann also nie live gehen.

---

## C) Zum Testen eine Vorschau-Seite nutzen (empfohlen)

So testen Sie eine neue Kampagne online, bevor sie live geht:

1. Auf GitHub einen neuen Zweig („Branch“) anlegen, z. B. `test-sommer-2027`, und dort
   `"testmodus": true` setzen
2. In Netlify: **„Project configuration“** → **„Build & deploy“** → **„Branches and deploy contexts“**
   → bei „Branch deploys“ **„All“** (oder den Zweig) wählen
3. Netlify erstellt eine eigene Test-Adresse, z. B. `https://test-sommer-2027--zufallsname-123.netlify.app`

Im Testmodus gibt es das Demo-Formular und die Vorschau-Adressen
(`?vorschau=grossgewinn` usw.), und die Ergebnisse zählen nicht.

---

## D) Weitere nützliche Funktionen in Netlify

| Wofür | Wo |
|---|---|
| Ältere Version wiederherstellen | „Deploys“ → älteren Deploy anklicken → „Publish deploy“ (Kontingente/Protokoll bleiben erhalten) |
| Live-Logs jedes Drehs ansehen | „Logs“ → „Functions“ → `spin` (jeder Dreh erscheint als Zeile mit `"ereignis":"dreh"`) |
| Seite kurzfristig sperren | einfach `kampagne.ende` auf einen vergangenen Zeitpunkt setzen und speichern |

---

## E) Optionale Umgebungsvariablen

Werden wie der Admin-Schlüssel unter **„Environment variables“** angelegt.

| Name | Wofür |
|---|---|
| `ADMIN_SCHLUESSEL` | Zugang zu Übersicht und Excel-Export (empfohlen) |
| `TEILNAHME_SIGNATUR_SCHLUESSEL` | Nur Teilnahme-IDs mit gültiger Signatur der Plattform werden akzeptiert. Siehe [PLATTFORM-ANBINDUNG.md](PLATTFORM-ANBINDUNG.md#sicherheit-ist-die-teilnahme-id-echt) |
