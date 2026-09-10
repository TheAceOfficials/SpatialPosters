/**
 * Stateless URL Config Token (stile AIOMetadata / RPDB)
 *
 * Codifica le preferenze utente in un token URL-safe compatto.
 * Firmato con HMAC-SHA256 per prevenire manomissioni.
 */

import crypto from "node:crypto"
import { z } from "zod"
// Batch B: clamp condiviso da image-utils.ts (semantica standard, senza round)
import { clamp } from "@/lib/image-utils"
import { BADGE_STYLES, RANKING_BADGE_STYLES } from "@/lib/badge-styles"

// ---- Zod schema (Batch C: sostituisce validazione manuale) ----

const badgeStyleSchema = z.enum(BADGE_STYLES)
const rankingBadgeStyleSchema = z.enum(RANKING_BADGE_STYLES)
const ribbonSideSchema = z.enum(["left", "right"])

const customCatalogSchema = z.object({
  id: z.string().max(64),
  name: z.string().max(100),
  type: z.enum(["movie", "series", "mixed"]),
  url: z.string().max(500),
  enabled: z.boolean().optional(),
})

export const configTokenSchema = z.object({
  globalBadges: z.boolean(),
  rankingBadges: z.boolean(),
  badgeGenre: z.boolean().optional(),
  badgeYear: z.boolean().optional(),
  badgeRating: z.boolean().optional(),
  badgeQuality: z.boolean().optional(),
  ratingSources: z.array(z.string().max(20)).optional(),
  badgeStyle: badgeStyleSchema,
  rankingBadgeStyle: rankingBadgeStyleSchema,
  blurEnabled: z.boolean(),
  blurIntensity: z.number().finite(),
  blurFade: z.number().finite(),
  blurDarkness: z.number().finite(),
  gradientHeight: z.number().finite(),
  networkLogo: z.boolean(),
  autoRotateClean: z.boolean(),
  // Opzionale (finding 13): i token generati prima dell'aggiunta del campo
  // (best-fit) non devono fallire il safeParse — il render usa il default del
  // server quando il campo è assente.
  logoFitEnabled: z.boolean().optional(),
  // customBadge con limite di lunghezza (finding 8): un valore illimitato
  // gonfierebbe il token firmato (URL condivise) e la label SVG del badge.
  customBadge: z.string().max(40).optional(),
  ribbonSide: ribbonSideSchema.optional(),
  catalogOrder: z.array(z.string().max(80)).optional(),
  catalogRenames: z.record(z.string().max(80), z.string().max(100)).optional(),
  customCatalogs: z.array(customCatalogSchema).optional(),
  disabledCatalogIds: z.array(z.string().max(80)).optional(),
  homeDisabledCatalogIds: z.array(z.string().max(80)).optional(),
  episodeMetadataSource: z.enum(["tmdb", "tvdb"]).optional(),
  hubMode: z.enum(["all", "catalogs", "search"]).optional(),
  // Regione classifiche (codice JW "IT"/"US"... o slug FlixPatrol): validazione
  // lasca di proposito, la normalizzazione fail-closed avviene in risoluzione.
  region: z.string().max(32).optional(),
})

export type PictoriumUserConfig = z.infer<typeof configTokenSchema>

// ---- HMAC setup ----

const HMAC_SECRET = process.env.ENCRYPTION_KEY_SECRET || process.env.CONFIG_HMAC_SECRET || ""

// In produzione senza secret: encodeConfig lancia e decodeConfig rifiuta i
// token unsigned (fail-closed, Batch A step 2 + Batch E). Il warning aiuta a
// individuare la causa quando un deploy parte senza la variabile d'ambiente.
if (process.env.NODE_ENV === "production" && !HMAC_SECRET) {
  console.error(
    "[pictorium] CONFIG_HMAC_SECRET (or ENCRYPTION_KEY_SECRET) is not set. " +
      "Config token encoding/decoding is fail-closed in production — encoding " +
      "throws and unsigned tokens are rejected. Set the secret to enable tokens.",
  )
}

/**
 * Encode a PictoriumUserConfig into a compact signed URL-safe token.
 * Formato: `base64url-json.hmac-base64url`
 *
 * In produzione richiede HMAC_SECRET: senza firma il payload è modificabile
 * da chiunque abbia accesso a localStorage (XSS, estensione, macchina condivisa),
 * quindi lancio un errore invece di emettere un token unsigned.
 * In dev/test senza HMAC_SECRET genera un token unsigned (utile per i test).
 */
export function encodeConfig(config: PictoriumUserConfig): string {
  if (process.env.NODE_ENV === "production" && !HMAC_SECRET) {
    throw new Error(
      "[pictorium] Cannot encode config token without HMAC_SECRET in production. " +
        "Set CONFIG_HMAC_SECRET (or ENCRYPTION_KEY_SECRET) to enforce token integrity.",
    )
  }
  const json = JSON.stringify(config)
  const b64 = Buffer.from(json, "utf-8").toString("base64url")
  if (!HMAC_SECRET) return b64
  const sig = crypto.createHmac("sha256", HMAC_SECRET).update(json).digest("base64url")
  return `${b64}.${sig}`
}

/**
 * Decode a config token back to a PictoriumUserConfig.
 * Verifica la firma HMAC se presente e se HMAC_SECRET è configurato.
 * Accetta token legacy (senza firma) solo in assenza di HMAC_SECRET.
 * Restituisce null in caso di token malformato o firma non valida (fail-safe).
 */
export function decodeConfig(token: string): PictoriumUserConfig | null {
  try {
    // Batch E (fail-closed): in produzione senza HMAC_SECRET rifiuta QUALSIASI
    // token — anche in formato firmato `b64.sig`. Senza secret non possiamo
    // verificare la firma, quindi un token firmato sarebbe indistinguibile da
    // un payload manomesso. Prima il check evitava solo i token unsigned,
    // lasciando passare `b64.sig` perché la verifica era dentro `if (HMAC_SECRET)`.
    if (!HMAC_SECRET && process.env.NODE_ENV === "production") return null

    let json: string
    const dotIdx = token.lastIndexOf(".")

    if (dotIdx > 0) {
      // Formato firmato: base64url.hmacsig
      const b64 = token.slice(0, dotIdx)
      const sig = token.slice(dotIdx + 1)
      json = Buffer.from(b64, "base64url").toString("utf-8")
      if (HMAC_SECRET) {
        const expected = crypto.createHmac("sha256", HMAC_SECRET).update(json).digest("base64url")
        if (expected.length !== sig.length) return null
        if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null
      }
    } else {
      // Token legacy (senza firma) — accettato solo in dev/test.
      // Batch E (fail-closed): in produzione i token unsigned sono rifiutati
      // anche senza HMAC_SECRET, perché il payload è modificabile da chiunque
      // abbia accesso a localStorage (XSS, estensione, macchina condivisa).
      if (HMAC_SECRET) return null
      if (process.env.NODE_ENV === "production") return null
      const normalized = token.replace(/-/g, "+").replace(/_/g, "/")
      const remainder = normalized.length % 4
      const padded = remainder !== 0
        ? normalized + "=".repeat(4 - remainder)
        : normalized
      json = Buffer.from(padded, "base64").toString("utf-8")
    }

    const parsed = JSON.parse(json)

    // Batch C: validazione via Zod — sostituisce la validazione manuale
    // con type narrowing automatico e messaggi di errore strutturati.
    const result = configTokenSchema.safeParse(parsed)
    if (!result.success) return null

    // Clamp difensivo dei numeri: impedisce a valori estremi da token firmato
    // (o profilo) di raggiungere sharp.blur con sigma enormi o gradienti fuori scala.
    // L'arrotondamento è esplicito a monte (Batch B: semantica standard di clamp).
    const clamped: PictoriumUserConfig = {
      ...result.data,
      blurIntensity: clamp(Math.round(result.data.blurIntensity), 1, 100),
      blurFade: clamp(Math.round(result.data.blurFade), 0, 100),
      blurDarkness: clamp(Math.round(result.data.blurDarkness), 0, 100),
      gradientHeight: clamp(Math.round(result.data.gradientHeight), 5, 100),
    }

    return clamped
  } catch {
    return null
  }
}