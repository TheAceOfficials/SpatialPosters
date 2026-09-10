/**
 * Compatibilità rename Posterium → Pictorium per le variabili d'ambiente.
 *
 * Il prefisso canonico è `PICTORIUM_*`; le vecchie `POSTERIUM_*` restano
 * supportate come fallback per non rompere deploy esistenti (Docker/Vercel/HF
 * già configurati) e al primo uso emettono un warning di deprecazione
 * (una sola volta per suffisso per processo).
 *
 * Precedenza: `PICTORIUM_X` vince sempre su `POSTERIUM_X` quando entrambe
 * sono impostate.
 */

const warnedLegacy = new Set<string>()

/**
 * Reads `SPATIALPOSTERS_<suffix>`, with fallback to `PICTORIUM_<suffix>` and `POSTERIUM_<suffix>`.
 * Returns `undefined` if none are set.
 */
export function envWithFallback(suffix: string): string | undefined {
  const primary = process.env[`SPATIALPOSTERS_${suffix}`]
  if (primary !== undefined) return primary

  const legacyPictorium = process.env[`PICTORIUM_${suffix}`]
  if (legacyPictorium !== undefined) return legacyPictorium

  const legacyPosteriumName = `POSTERIUM_${suffix}`
  const legacyPosterium = process.env[legacyPosteriumName]
  if (legacyPosterium !== undefined && !warnedLegacy.has(suffix)) {
    warnedLegacy.add(suffix)
    console.warn(`[spatialposters] ${legacyPosteriumName} is deprecated, use SPATIALPOSTERS_${suffix}`)
  }
  return legacyPosterium
}

/** Reset dello stato warn-once (solo test). */
export function __resetEnvCompatWarnings(): void {
  warnedLegacy.clear()
}
