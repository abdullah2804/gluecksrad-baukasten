// Das Glücksrad (Canvas). Zeichnet die Segmente und dreht flüssig auf ein
// vorgegebenes Segment. WELCHES Segment, entscheidet ausschließlich der Server.

const VOLL = Math.PI * 2;
const mod = (a, n) => ((a % n) + n) % n;

export class Gluecksrad {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Array<{label,farbe,textfarbe,bild}>} segmente
   * @param {{randFarbe:string, schrift:string, beschriftung:boolean, dauerSekunden:number, beiSegmentwechsel?:Function}} optionen
   */
  constructor(canvas, segmente, optionen) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.segmente = segmente;
    this.o = optionen;
    this.winkel = 0;
    this.phase = "steht"; // steht | beschleunigen | abbremsen
    this.bilder = new Map();
    this.wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.vMax = (this.wenigBewegung ? 1 : 2.2) * VOLL; // Umdrehungen pro Sekunde -> rad/s
    this.letztesSegment = -1;

    this.#bilderLaden();
    new ResizeObserver(() => this.#groesseAnpassen()).observe(canvas);
    this.#groesseAnpassen();
  }

  get segmentWinkel() {
    return VOLL / this.segmente.length;
  }

  /** Index des Segments, das gerade unter dem Zeiger (oben) steht. */
  get segmentAmZeiger() {
    return Math.floor(mod(-this.winkel, VOLL) / this.segmentWinkel) % this.segmente.length;
  }

  #bilderLaden() {
    for (const s of this.segmente) {
      if (!s.bild || this.bilder.has(s.bild)) continue;
      const img = new Image();
      img.onload = () => this.#vorzeichnen();
      img.src = s.bild;
      this.bilder.set(s.bild, img);
    }
  }

  #groesseAnpassen() {
    const groesse = this.canvas.clientWidth;
    if (!groesse) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(groesse * dpr);
    this.canvas.height = Math.round(groesse * dpr);
    this.#vorzeichnen();
  }

  /** Statisches Radbild einmal vorzeichnen; beim Drehen wird es nur noch rotiert. */
  #vorzeichnen() {
    const g = this.canvas.width;
    if (!g) return;
    const off = (this.vorlage ??= document.createElement("canvas"));
    off.width = off.height = g;
    const c = off.getContext("2d");
    const r = g / 2;
    const rand = Math.max(6, g * 0.035);
    const ri = r - rand;
    const sw = this.segmentWinkel;

    c.clearRect(0, 0, g, g);
    c.save();
    c.translate(r, r);

    // Außenring
    c.beginPath();
    c.arc(0, 0, r - 1, 0, VOLL);
    c.fillStyle = this.o.randFarbe;
    c.fill();

    this.segmente.forEach((s, i) => {
      const a0 = -Math.PI / 2 + i * sw;
      const a1 = a0 + sw;
      const mitte = a0 + sw / 2;

      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, ri, a0, a1);
      c.closePath();
      c.fillStyle = s.farbe;
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.6)";
      c.lineWidth = Math.max(1, g * 0.003);
      c.stroke();

      // Segmentgrafik (innen)
      const img = s.bild && this.bilder.get(s.bild);
      if (img && img.complete && img.naturalWidth) {
        const abstand = ri * 0.32;
        const maxGroesse = Math.min(ri * 0.2, abstand * sw * 0.8);
        const verh = img.naturalWidth / img.naturalHeight;
        const w = verh >= 1 ? maxGroesse : maxGroesse * verh;
        const h = verh >= 1 ? maxGroesse / verh : maxGroesse;
        c.save();
        c.rotate(mitte);
        c.translate(abstand, 0);
        c.rotate(Math.PI / 2);
        c.drawImage(img, -w / 2, -h / 2, w, h);
        c.restore();
      }

      // Beschriftung (außen, entlang des Radius)
      if (this.o.beschriftung) {
        c.save();
        c.rotate(mitte);
        const maxBreite = ri * (img ? 0.5 : 0.62);
        const maxHoehe = ri * 0.7 * sw * 0.55; // Bogenbreite an der Textposition
        let schriftgroesse = Math.min(ri * 0.085, maxHoehe);
        c.font = `700 ${schriftgroesse}px ${this.o.schrift}`;
        while (c.measureText(s.label).width > maxBreite && schriftgroesse > ri * 0.045) {
          schriftgroesse -= 1;
          c.font = `700 ${schriftgroesse}px ${this.o.schrift}`;
        }
        c.fillStyle = s.textfarbe || "#fff";
        c.textAlign = "right";
        c.textBaseline = "middle";
        c.fillText(s.label, ri * 0.9, 0, maxBreite);
        c.restore();
      }
    });

    // Lämpchen im Rand
    const anzahl = this.segmente.length * 2;
    for (let i = 0; i < anzahl; i++) {
      const a = -Math.PI / 2 + (i * VOLL) / anzahl;
      c.beginPath();
      c.arc(Math.cos(a) * (r - rand / 2), Math.sin(a) * (r - rand / 2), rand * 0.22, 0, VOLL);
      c.fillStyle = i % 2 ? "rgba(255,255,255,0.95)" : "rgba(255,230,150,0.95)";
      c.fill();
    }

    // Nabe
    c.beginPath();
    c.arc(0, 0, ri * 0.13, 0, VOLL);
    c.fillStyle = this.o.randFarbe;
    c.fill();
    c.beginPath();
    c.arc(0, 0, ri * 0.06, 0, VOLL);
    c.fillStyle = "#fff";
    c.fill();

    c.restore();
    this.zeichnen();
  }

  zeichnen() {
    const { ctx: c, canvas } = this;
    const g = canvas.width;
    if (!this.vorlage) return;
    c.clearRect(0, 0, g, g);
    c.save();
    c.translate(g / 2, g / 2);
    c.rotate(this.winkel);
    c.drawImage(this.vorlage, -g / 2, -g / 2);
    c.restore();

    const seg = this.segmentAmZeiger;
    if (seg !== this.letztesSegment) {
      if (this.phase !== "steht") this.o.beiSegmentwechsel?.(seg);
      this.letztesSegment = seg;
    }
  }

  /** Schriften wurden nachgeladen -> neu zeichnen. */
  neuZeichnen() {
    this.#vorzeichnen();
  }

  /** Rad anwerfen, solange die Antwort vom Server noch unterwegs ist. */
  starteDrehung() {
    if (this.phase !== "steht") return;
    this.phase = "beschleunigen";
    this.v = 0;
    this.start = performance.now();
    this.zeitLetzterFrame = this.start;
    this.ziel = null;
    this.fertig = new Promise((resolve) => (this.#fertigMelden = resolve));
    requestAnimationFrame((t) => this.#frame(t));
  }

  #fertigMelden = () => {};

  /** Rad auf Segment `index` auslaufen lassen. Promise wird erfüllt, wenn es steht. */
  stoppeBei(index) {
    if (this.phase === "steht") this.starteDrehung();
    const sw = this.segmentWinkel;
    const versatz = (Math.random() - 0.5) * sw * 0.7; // nicht immer exakt mittig
    this.ziel = { winkel: mod(-((index + 0.5) * sw + versatz), VOLL) };
    return this.fertig;
  }

  /** Bei Fehlern: Rad sanft irgendwo auslaufen lassen. */
  auslaufen() {
    if (this.phase === "steht") return Promise.resolve();
    this.ziel = { winkel: mod(this.winkel + Math.random() * VOLL, VOLL), kurz: true };
    return this.fertig;
  }

  #frame(t) {
    const dt = Math.min(0.05, (t - this.zeitLetzterFrame) / 1000);
    this.zeitLetzterFrame = t;

    if (this.phase === "beschleunigen") {
      this.v = Math.min(this.vMax, this.v + (this.vMax / 0.6) * dt); // in 0,6 s auf volle Geschwindigkeit
      this.winkel += this.v * dt;
      if (this.v >= this.vMax && this.ziel) this.#abbremsenPlanen(t);
    } else if (this.phase === "abbremsen") {
      const p = Math.min(1, (t - this.bremsStart) / (this.bremsDauer * 1000));
      // Ease-out (kubisch): startet exakt mit der aktuellen Geschwindigkeit, endet bei 0
      this.winkel = this.bremsVon + this.bremsWeg * (1 - (1 - p) ** 3);
      if (p >= 1) {
        this.winkel = mod(this.winkel, VOLL);
        this.phase = "steht";
        this.zeichnen();
        this.#fertigMelden();
        return;
      }
    }

    this.zeichnen();
    requestAnimationFrame((n) => this.#frame(n));
  }

  #abbremsenPlanen(t) {
    const bisher = (t - this.start) / 1000;
    const gesamt = this.wenigBewegung ? 2 : this.o.dauerSekunden;
    const wunschDauer = this.ziel.kurz ? 1.5 : Math.max(2.5, gesamt - bisher);
    const rest = mod(this.ziel.winkel - this.winkel, VOLL);
    // Bremsweg so wählen, dass Geschwindigkeit nahtlos übergeht (Weg = v * Dauer / 3)
    const wunschWeg = (this.vMax * wunschDauer) / 3;
    const runden = this.ziel.kurz ? (rest < Math.PI ? 1 : 0) : Math.max(1, Math.round((wunschWeg - rest) / VOLL));
    this.bremsWeg = rest + runden * VOLL;
    this.bremsDauer = (3 * this.bremsWeg) / this.vMax;
    this.bremsVon = this.winkel;
    this.bremsStart = t;
    this.phase = "abbremsen";
  }
}
