// Netlify Function: GET /api/admin  (Übersicht & CSV-Export, geschützt durch ADMIN_SCHLUESSEL)
// Hier muss pro Kampagne NICHTS geändert werden.
import konfig from "../../config/campaign.json" with { type: "json" };
import { NetlifySpeicher } from "../../server/speicher-netlify.mjs";
import { adminAnfrage } from "../../server/http.mjs";

export default async (request) =>
  adminAnfrage(request, {
    konfig,
    speicher: new NetlifySpeicher(konfig.kampagne.id, { testmodus: konfig.kampagne.testmodus === true }),
    adminSchluessel: process.env.ADMIN_SCHLUESSEL || "",
  });

export const config = { path: "/api/admin" };
