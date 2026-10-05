// Netlify Function: POST /api/spin
// Hier muss pro Kampagne NICHTS geändert werden.
import konfig from "../../config/campaign.json" with { type: "json" };
import { NetlifySpeicher } from "../../server/speicher-netlify.mjs";
import { spinAnfrage } from "../../server/http.mjs";

export default async (request) => {
  const testmodus = konfig.kampagne.testmodus === true;
  return spinAnfrage(request, {
    konfig,
    speicher: new NetlifySpeicher(konfig.kampagne.id, { testmodus }),
    optionen: { testmodus, signaturSchluessel: process.env.TEILNAHME_SIGNATUR_SCHLUESSEL || "" },
  });
};

export const config = { path: "/api/spin" };
