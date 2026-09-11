"use client"

import type { PosterFitEntry } from "@/lib/usePosterFit"

interface FitDebugPanelProps {
  results: PosterFitEntry[]
  bestResult?: PosterFitEntry
  shortPath: (p: string) => string
  scoreClass: (s: number) => string
  t: (key: string, params?: Record<string, string | number>) => string
}

const REASON_MAP: Record<string, string> = {
  "Buon contrasto logo/sfondo": "Good logo/bg contrast",
  "Scarso contrasto logo/sfondo": "Poor logo/bg contrast",
  "Zona logo pulita": "Clean logo area",
  "Zona logo caotica": "Busy logo area",
  "Molti dettagli dietro il logo": "High detail behind logo",
  "Zona logo senza distrazioni": "Distraction-free logo area",
  "Dettagli nell'area logo": "Details in logo area",
  "Parte del logo su sfondo simile": "Part of logo on similar bg",
  "Colore logo simile allo sfondo": "Logo color similar to bg",
  "Zona logo non disponibile": "Logo area unavailable",
}

/** Pannello di debug del best-fit (estratto da PosterOptions). */
export function FitDebugPanel({ results, bestResult, shortPath, scoreClass, t }: FitDebugPanelProps) {
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-zinc-300 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-zinc-100">{t("ui.debugBestFit")}</span>
        <span className="text-zinc-500">{t("ui.candidates", { count: results.length })}</span>
      </div>

      {bestResult && (
        <div className="rounded-lg bg-accent-orange/10 border border-accent-orange/20 px-2 py-1.5 text-accent-orange">
          {t("ui.best")} <span title={bestResult.posterPath}>{shortPath(bestResult.posterPath)}</span> - score {bestResult.adjustedScore.toFixed(2)}
        </div>
      )}

      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {results.slice(0, 10).map((result, index) => (
          <div key={result.posterPath} className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-200" title={result.posterPath}>
                #{index + 1} {shortPath(result.posterPath)}
              </span>
              <span className={`font-semibold ${scoreClass(result.adjustedScore)}`}>
                {result.adjustedScore.toFixed(2)}
              </span>
            </div>

            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-zinc-500">
              <span>{t("ui.scoreBase")} {result.score.toFixed(2)}</span>
              <span>{t("ui.scoreQuality")} {result.qualityScore.toFixed(2)}</span>
              <span>{t("ui.scoreText")} {result.textPenalty.toFixed(2)}</span>
              <span>{t("ui.scoreLogo")} {result.logoZoneScore.toFixed(2)}</span>
              <span>{t("ui.scoreContrast")} {result.metrics.contrast.toFixed(2)}</span>
              <span>{t("ui.scoreDetail")} {result.metrics.lowDetailScore.toFixed(2)}</span>
            </div>

            {result.reasons.length > 0 && (
              <div className="mt-1 text-muted">
                {result.reasons.map((r) => REASON_MAP[r] || r).join(" - ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
