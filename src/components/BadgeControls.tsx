"use client"

import { useState } from "react"
import { Check, XCircle, Ruler, Cloud, Minus, Circle, ChevronDown, Star, Trophy, Tv, Flame, Sparkles, Palette, Layers } from "lucide-react"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { Toggle } from "@/components/Toggle"
import { SliderRow } from "@/components/SliderRow"
import { BadgeStyleSelector } from "@/components/ui"
import { getAwardBadgeLabel, getNominationBadgeLabel } from "@/lib/awards"
import { getSubGenreLabel } from "@/lib/subgenres"
import { getUpcomingReleaseLabel } from "@/lib/release-badge"
import { getNewSeasonLabel, isKDramaOrigin } from "@/lib/poster-badge"
import { isPrefixedKey, badgeKey } from "@/lib/i18n"
import { getAllBadgeOptions } from "@/lib/badge-priority"
import { defaultGradientHeightForPoster } from "@/lib/gradient-defaults"
import { UI_RATING_SOURCES } from "@/lib/ratings"
import { RatingSourceIcon } from "@/components/RatingSourceIcon"

export function BadgeControls() {
  const selected = usePSelector((v) => v.selected)
  const metaInfo = usePSelector((v) => v.metaInfo)
  const accentColor = usePSelector((v) => v.accentColor)
  const autoAccentColor = usePSelector((v) => v.autoAccentColor)
  const mdblistAnimeList = usePSelector((v) => v.mdblistAnimeList)
  const trendRank = usePSelector((v) => v.trendRank)
  const imdbTop250 = usePSelector((v) => v.imdbTop250)
  const setAccentColor = usePSelector((v) => v.setAccentColor)
  const previewPoster = usePSelector((v) => v.previewPoster)
  const { t, lang } = useT()
  const ed = usePosterEditor()
  const [now] = useState(() => Date.now())
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [editingValue, setEditingValue] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  if (!selected) return null


  const effectiveColor = accentColor || autoAccentColor || "#555555"
  const isCustomColor = Boolean(
    accentColor &&
    autoAccentColor &&
    accentColor.toLowerCase() !== autoAccentColor.toLowerCase()
  )

  return (
    <div className="space-y-3.5 text-xs">
      {/* CARD 1: Visibilità & Posizione Badge */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-accent-orange" />
            {t("ui.badgeSection")}
          </span>
        </div>

        {/* Master Toggle Genere / Rating */}
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              {t("ui.genreRatingBadge")}
            </span>
            <Toggle value={ed.globalBadges} onChange={(v) => ed.setGlobalBadges(v)} label={t("ui.genreRatingBadge")} />
          </div>

          {/* Sub-controlli Genere / Anno / Voto */}
          {ed.globalBadges && (
            <div className="pl-3 py-1 space-y-2 border-l-2 border-surface2 ml-1 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-muted">{t("ui.badgeGenre")}</span>
                <Toggle value={ed.badgeGenre} onChange={(v) => ed.setBadgeGenre(v)} label={t("ui.badgeGenre")} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">{t("ui.badgeYear")}</span>
                <Toggle value={ed.badgeYear} onChange={(v) => ed.setBadgeYear(v)} label={t("ui.badgeYear")} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">{t("ui.badgeRating")}</span>
                <Toggle value={ed.badgeRating} onChange={(v) => ed.setBadgeRating(v)} label={t("ui.badgeRating")} />
              </div>

              {/* Provider del voto accordion */}
              {ed.badgeRating && (
                <div className="pt-2 pb-1 space-y-2 border-t border-surface2/50">
                  <button
                    type="button"
                    onClick={() => setSourcesOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface2/70 hover:bg-surface2 text-zinc-200 hover:text-white border border-surface2 transition-all group cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400/30" />
                      <span>{t("ui.ratingSources")}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent-orange/15 text-accent-orange font-semibold border border-accent-orange/30">
                        {(ed.ratingSources ?? ["imdb", "tmdb"]).length}/16
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted group-hover:text-zinc-200 font-medium">
                      <span>{sourcesOpen ? "Chiudi" : "Configura"}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${sourcesOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>

                  {sourcesOpen && (
                    <div className="space-y-2 pt-0.5 animate-fade-in">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[10px] text-muted leading-tight">
                          {t("ui.ratingSourcesHint")}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => ed.setRatingSources(UI_RATING_SOURCES.map((s) => s.id))}
                            className="text-accent-orange hover:underline font-semibold transition-colors"
                          >
                            {t("ui.enableAll")}
                          </button>
                          <span className="text-zinc-600">·</span>
                          <button
                            type="button"
                            onClick={() => ed.setRatingSources(["imdb", "tmdb"])}
                            className="text-muted hover:text-zinc-200 transition-colors"
                          >
                            {t("ui.disableAll")}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                        {UI_RATING_SOURCES.map((s, idx) => {
                          const current = ed.ratingSources ?? ["imdb", "tmdb"]
                          const isSelected = current.includes(s.id)
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (current.length > 1) {
                                    ed.setRatingSources(current.filter((x) => x !== s.id))
                                  }
                                } else {
                                  ed.setRatingSources([...current, s.id])
                                }
                              }}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[10.5px] transition-all duration-150 border ${
                                isSelected
                                  ? "bg-accent-orange/[0.08] border-accent-orange/25 text-zinc-100 font-medium"
                                  : "bg-white/[0.03] border-white/[0.04] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 hover:border-white/[0.08]"
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <RatingSourceIcon id={s.id} className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{t(s.labelKey)}</span>
                              </span>
                              <span className={`text-[9px] font-mono ml-1 shrink-0 ${isSelected ? "text-accent-orange/70" : "text-zinc-600"}`}>
                                {idx + 1}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <hr className="border-surface2/50" />

        {/* Trend & Network logo & Ribbon side */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              {t("ui.trendBadge")}
            </span>
            <Toggle value={ed.rankingBadges} onChange={(v) => ed.setRankingBadges(v)} label={t("ui.trendBadge")} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {t("ui.badgeQuality")}
            </span>
            <Toggle value={ed.badgeQuality} onChange={(v) => ed.setBadgeQuality(v)} label={t("ui.badgeQuality")} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              {t("ui.networkLogo")}
            </span>
            <Toggle value={ed.networkLogo} onChange={(v) => ed.setNetworkLogo(v)} label={t("ui.networkLogo")} />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5 shrink-0">
              <Flame className="w-3.5 h-3.5 text-accent-orange" />
              {t("ui.badgePosition")}
            </span>
            <div className="grid grid-cols-2 gap-1 w-36 shrink-0">
              <button
                type="button"
                onClick={() => ed.setRibbonSide("left")}
                className={`w-full py-1 text-center rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                  ed.ribbonSide === "left"
                    ? "bg-white/20 text-white shadow-sm"
                    : "bg-white/5 text-muted hover:bg-white/10 hover:text-zinc-200"
                }`}
              >
                Nuvio
              </button>
              <button
                type="button"
                onClick={() => ed.setRibbonSide("right")}
                className={`w-full py-1 text-center rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                  ed.ribbonSide === "right"
                    ? "bg-white/20 text-white shadow-sm"
                    : "bg-white/5 text-muted hover:bg-white/10 hover:text-zinc-200"
                }`}
              >
                Stremio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: Badge Personalizzato & Classifica */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-zinc-200 flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {t("ui.customBadge")}
          </span>
          {editingValue === "customBadge" ? (
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={() => { const v = editText.trim(); ed.setCustomBadge(v || null); setEditingValue(null) }}
              onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur() } }}
              maxLength={40}
              className="editor-input w-44 max-w-[55%] min-w-0 text-right px-2 py-1 font-medium"
              placeholder={t("ui.customBadgePlaceholder")}
            />
          ) : (
            <select
              value={ed.customBadge ?? "__auto__"}
              onChange={(e) => {
                const v = e.target.value
                if (v === "__custom__") { setEditText(""); setEditingValue("customBadge") }
                else if (v === "__auto__") ed.setCustomBadge(null)
                else ed.setCustomBadge(v)
              }}
              className="editor-input w-44 max-w-[55%] min-w-0 text-right px-2 py-1 cursor-pointer truncate font-medium"
            >
              <option value="__auto__">{t("ui.auto")}</option>
              {(() => {
                if (!selected) return null
                const twoWeeks = 14 * 24 * 60 * 60 * 1000
                const isNewMovie = selected.media_type === "movie" && metaInfo.release_date ? (now - new Date(metaInfo.release_date).getTime()) < twoWeeks : false
                const isNewSeries = selected.media_type === "tv" && metaInfo.first_air_date ? (now - new Date(metaInfo.first_air_date).getTime()) < twoWeeks : false
                const award = metaInfo.awards?.length ? getAwardBadgeLabel(metaInfo.awards, t) : null
                const nomination = !award && metaInfo.nominations?.length ? getNominationBadgeLabel(metaInfo.nominations, t) : null
                const animeRankData = mdblistAnimeList?.find((a) => a.id === selected.id)
                const animeRank = animeRankData ? animeRankData.rank : null
                const studio = metaInfo.studios?.length ? metaInfo.studios[0] : null
                const tvType = selected.media_type === "tv" ? metaInfo.type : null
                const tvStatus = selected.media_type === "tv" ? metaInfo.status : null
                const extra = selected.media_type === "tv" ? (tvType?.toLowerCase() === "miniseries" || tvType?.toLowerCase() === "miniserie" ? t("badge.miniseries") : tvStatus?.toLowerCase() === "returning series" || tvStatus?.toLowerCase() === "in corso" ? t("badge.returning") : null) : null
                const upcomingRelease = getUpcomingReleaseLabel({
                  mediaType: selected.media_type === "tv" ? "tv" : "movie",
                  releaseDate: metaInfo.release_date,
                  firstAirDate: metaInfo.first_air_date,
                  locale: lang,
                  t,
                })
                const subGenre = getSubGenreLabel(metaInfo.keywords || [], lang)
                const newSeason = selected.media_type === "tv" ? getNewSeasonLabel({
                  lastAirDate: metaInfo.last_air_date,
                  firstAirDate: metaInfo.first_air_date,
                  seasonCount: metaInfo.number_of_seasons,
                  t,
                }) : null
                const isKDrama = selected.media_type === "tv" && isKDramaOrigin([
                  ...(metaInfo.networksDetailed ?? []),
                  ...(metaInfo.productionCompaniesDetailed ?? []),
                ].map((c) => c.origin_country).filter((c): c is string => !!c))
                const options = getAllBadgeOptions({
                  upcomingRelease, isNewMovie, isNewSeries, newSeason, animeRank, trendRank: trendRank,
                  award, nomination, studio,
                  director: metaInfo.director || null, subGenre, isKDrama, extra,
                  mediaType: selected.media_type === "tv" ? "tv" : "movie",
                  voteAverage: metaInfo.voteAverage, tvType, tvStatus,
                  imdbTop250: !!imdbTop250,
                })
                const savedMissing = ed.customBadge && !options.includes(ed.customBadge) ? ed.customBadge : null
                return (
                  <>
                    {options.map((o) => {
                      const display = isPrefixedKey(o) ? t(badgeKey(o)) : o
                      return <option key={o} value={o}>{display}</option>
                    })}
                    {savedMissing && (
                      <option value={savedMissing}>{isPrefixedKey(savedMissing) ? t(badgeKey(savedMissing)) : savedMissing}</option>
                    )}
                  </>
                )
              })()}
              <option value="__custom__">{t("ui.customOption")}</option>
            </select>
          )}
        </div>

        {/* Stile Badge Classifica */}
        <div className="pt-2 border-t border-surface2/50 space-y-1.5">
          <label className="text-[11px] text-muted font-medium block">{t("ui.styleRankingExtra")}</label>
          <BadgeStyleSelector
            value={ed.rankingBadgeStyle}
            options={["default", "colored", "pill"]}
            onChange={ed.setRankingBadgeStyle}
            t={t}
            accentColor={accentColor}
          />
        </div>
      </div>

      {/* CARD 3: Stile Genere & Colore d'Accento */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-accent-orange" />
            {t("ui.styleGenreBadge")}
          </span>
        </div>

        <BadgeStyleSelector
          value={ed.badgeStyle}
          options={["shadow", "pill", "bar", "colored", "bordo", "vetro"]}
          onChange={ed.setBadgeStyle}
          t={t}
          accentColor={accentColor}
        />

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface2/50">
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="color"
              value={effectiveColor.startsWith("#") && effectiveColor.length === 7 ? effectiveColor : "#555555"}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded shadow-sm shrink-0"
            />
            <input
              type="text"
              value={accentColor || autoAccentColor || ""}
              onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{6}$/.test(v)) setAccentColor(v) }}
              onBlur={(e) => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) e.target.value = accentColor || autoAccentColor || "" }}
              className="editor-input w-24 text-center px-2 py-1 font-mono text-[11px] shrink-0"
              placeholder="#555555"
            />
          </div>
          <div className="shrink-0 flex items-center">
            {isCustomColor ? (
              <button
                type="button"
                onClick={() => {
                  if (autoAccentColor) setAccentColor(autoAccentColor)
                  else setAccentColor(null)
                }}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors px-1.5 py-0.5 rounded bg-surface2/50 border border-surface2 hover:bg-surface2"
                title={t("ui.resetAutoColor")}
              >
                ↺ Reset
              </button>
            ) : (
              <span className="text-[10px] text-zinc-500 italic">
                {autoAccentColor ? "Auto-rilevato" : t("ui.noDominantColor")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CARD 4: Sfumatura & Blur di Sfondo */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3 space-y-2.5 shadow-sm">
        <button
          type="button"
          aria-label={ed.blurEnabled ? t("ui.blurDisabled") : t("ui.blurEnabled")}
          onClick={() => ed.setBlurEnabled(!ed.blurEnabled)}
          className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 ${
            ed.blurEnabled
              ? "bg-white/15 text-white shadow-sm border border-white/10"
              : "bg-white/5 text-muted hover:bg-white/10 hover:text-zinc-200 border border-transparent"
          }`}
        >
          {ed.blurEnabled ? (
            <>
              <Check className="w-3.5 h-3.5 text-accent-orange" />
              {t("ui.blurEnabled")}
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-zinc-500" />
              {t("ui.blurDisabled")}
            </>
          )}
        </button>

        {ed.blurEnabled && (
          <div className="space-y-1.5 pt-1 animate-fade-in">
            <SliderRow
              icon={<Ruler className="w-3.5 h-3.5" />}
              label={t("ui.height")}
              value={ed.gradientHeight}
              min={5}
              max={100}
              boundsMin={5}
              boundsMax={100}
              onChange={(v) => ed.setGradientHeight(v)}
              onDoubleClick={() => ed.setGradientHeight(defaultGradientHeightForPoster(previewPoster))}
              editingValue={editingValue}
              editText={editText}
              setEditingValue={setEditingValue}
              setEditText={setEditText}
              editingKey="gradHeight"
              suffix="%"
            />
            <SliderRow
              icon={<Cloud className="w-3.5 h-3.5" />}
              label={t("ui.intensity")}
              value={ed.blurIntensity}
              min={1}
              max={50}
              boundsMin={1}
              boundsMax={50}
              onChange={(v) => ed.setBlurIntensity(v)}
              onDoubleClick={() => ed.setBlurIntensity(5)}
              editingValue={editingValue}
              editText={editText}
              setEditingValue={setEditingValue}
              setEditText={setEditText}
              editingKey="blurIntensity"
              suffix="px"
            />
            <SliderRow
              icon={<Minus className="w-3.5 h-3.5" />}
              label={t("ui.fade")}
              value={ed.blurFade}
              min={0}
              max={100}
              boundsMin={0}
              boundsMax={100}
              onChange={(v) => ed.setBlurFade(v)}
              onDoubleClick={() => ed.setBlurFade(60)}
              editingValue={editingValue}
              editText={editText}
              setEditingValue={setEditingValue}
              setEditText={setEditText}
              editingKey="blurFade"
              suffix="%"
            />
            <SliderRow
              icon={<Circle className="w-3.5 h-3.5" />}
              label={t("ui.darkness")}
              value={ed.blurDarkness}
              min={0}
              max={100}
              boundsMin={0}
              boundsMax={100}
              onChange={(v) => ed.setBlurDarkness(v)}
              onDoubleClick={() => ed.setBlurDarkness(40)}
              editingValue={editingValue}
              editText={editText}
              setEditingValue={setEditingValue}
              setEditText={setEditText}
              editingKey="blurDarkness"
              suffix="%"
            />
          </div>
        )}
      </div>
    </div>
  )
}