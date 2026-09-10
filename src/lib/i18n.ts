import en from "./translations/en.json"
import it from "./translations/it.json"
import fr from "./translations/fr.json"
import de from "./translations/de.json"
import es from "./translations/es.json"
import ja from "./translations/ja.json"
import ko from "./translations/ko.json"
import pt from "./translations/pt.json"
import he from "./translations/he.json"

export type Lang = keyof typeof dicts

const dicts: Record<string, Record<string, string>> = { en, it, fr, de, es, ja, ko, pt, he }

let _currentLang: string = "en"

export const BADGE_KEY_PREFIX = "__"

export function isPrefixedKey(val: string): boolean {
  return val.startsWith(BADGE_KEY_PREFIX)
}

export function badgeKey(val: string): string {
  return isPrefixedKey(val) ? val.slice(BADGE_KEY_PREFIX.length) : val
}

export function resolveLabel(val: string): string {
  return isPrefixedKey(val) ? t(badgeKey(val)) : val
}

export function resolveLabelFor(val: string, lang: string): string {
  return isPrefixedKey(val) ? createT(lang)(badgeKey(val)) : val
}

export function isRankKey(val: string | null): string | null {
  if (!val) return null
  if (isPrefixedKey(val)) {
    const key = badgeKey(val)
    if (key === "badge.today" || key === "badge.anime" || key === "badge.movie" || key === "badge.series") return key
    return null
  }
  if (val === "Oggi" || val === "Today" || val === "Aujourd'hui" || val === "Heute" || val === "Hoy" || val === "今日" || val === "오늘" || val === "Hoje" || val === "היום") return "badge.today"
  if (val === "Anime" || val === "アニメ" || val === "애니메이션" || val === "אנימה") return "badge.anime"
  if (val === "Film" || val === "Movie" || val === "Película" || val === "映画" || val === "영화" || val === "Filme" || val === "סרט") return "badge.movie"
  if (val === "Serie tv" || val === "TV series" || val === "Série TV" || val === "Serie de TV" || val === "Serie" || val === "TVシリーズ" || val === "TV 시리즈" || val === "סדרה") return "badge.series"
  return null
}

export function setLang(lang: string) {
  _currentLang = lang
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang
  }
}

export function getLang(): string {
  return _currentLang
}

function lookup(lang: string, key: string): string | undefined {
  return dicts[lang]?.[key] ?? dicts["en"]?.[key]
}

export function t(key: string, params?: Record<string, string | number>): string {
  let val = lookup(_currentLang, key) ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replaceAll(`{${k}}`, String(v))
    }
  }
  return val
}

export function createT(lang: string) {
  return (key: string, params?: Record<string, string | number>): string => {
    let val = lookup(lang, key) ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replaceAll(`{${k}}`, String(v))
      }
    }
    return val
  }
}
