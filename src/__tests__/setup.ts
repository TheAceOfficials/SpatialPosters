import { expect, afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import * as matchers from "@testing-library/jest-dom/matchers"

import { _resetPinCache } from "@/lib/pin-auth"

expect.extend(matchers)

// I test simulano un'istanza pubblica (route admin aperte senza ADMIN_TOKEN):
// la modalità deve essere esplicita via POSTERIUM_PUBLIC_INSTANCE=1 (vedi auth.ts).
process.env.POSTERIUM_PUBLIC_INSTANCE = "1"

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  _resetPinCache()
  process.env.POSTERIUM_PUBLIC_INSTANCE = "1"
})

const itDict: Record<string, string> = {
  "badge.newMovie": "Nuovo film",
  "badge.newSeries": "Nuova serie",
  "badge.newEpisode": "Nuovo episodio",
  "badge.bingeWorthy": "Binge-Worthy",
  "badge.newSeason": "Nuova stagione",
  "badge.newSeasonN": "Nuova stagione S{n}",
  "badge.anime": "Anime",
  "badge.today": "Oggi",
  "badge.movie": "Film",
  "badge.series": "Serie",
  "badge.week": "Settimana",
  "badge.topRated": "Absolute Cinema",
  "badge.miniseries": "Miniserie",
  "badge.returning": "Ritorna",
  "badge.upcomingRelease": "In uscita {date}",
  "ui.deleteFailed": "Errore nella cancellazione di {count} poster",
  "ui.loadingCatalogs": "Caricamento cataloghi...",
  "ui.confirmDelete": "Eliminare questo poster?",
  "ui.confirmDeleteMsg": "Vuoi eliminare {title}? Non può essere annullata.",
  "ui.confirmDeleteSelected": "Eliminare {count} poster selezionati?",
  "ui.confirmDeleteSelectedMsg": "Questa azione rimuoverà {count} poster selezionati. Non può essere annullata.",
  "ui.retry": "Riprova",
  "ui.close": "Chiudi",
  "ui.back": "Indietro",
  "ui.next": "Avanti",
  "ui.errorDefaultTitle": "Qualcosa è andato storto",
  "ui.errorUnknown": "Errore sconosciuto",
  "ui.onboardingStart": "Inizia!",
  "ui.onboardingSkip": "Salta tutorial",
  "ui.slide": "Slide {n}",
  "ui.addonProxy": "Addon Proxy",
  "ui.scrollLeft": "Scorri a sinistra",
  "ui.scrollRight": "Scorri a destra",
  "ui.statusTmdbUnavailable": "Servizio TMDB non disponibile — alcuni dati potrebbero essere incompleti",
  "ui.rename": "Rinomina",
  "ui.collectionNamePh": "Nome collezione",
  "ui.collectionOptions": "Opzioni collezione",
  "ui.posterWithLogo": "Poster con logo",
  "ui.cleanPoster": "Poster pulito",
  "ui.emptyPostersSub": "Nessun poster salvato. Personalizza un poster dai cataloghi e apparirà qui.",
  "ui.emptyCollectionTitle": "Nessuna collezione",
  "ui.emptyCollectionSub": "Crea la tua prima collezione per organizzare i poster.",
  "ui.showAllPosters": "Mostra tutti ({count})",
  "ui.noFilteredResultsSub": "Nessun risultato corrisponde a questo filtro.",
  "ui.confirmDeleteCollection": "Elimina collezione",
  "ui.confirmDeleteCollectionMsg": "Eliminare \"{name}\"?",
  "ui.savedOn": "Salvato il",
  "ui.noCollections": "Questo poster non è in nessuna collezione.",
  "ui.openInEditor": "Apri nell'editor",
  "ui.profileLoaded": "Profilo caricato con successo!",
  "ui.loadError": "Errore di caricamento",
  "ui.profileUnlockHint": "Inserisci la password del profilo salvato",
  "ui.profileUnlock": "Accedi",
  "ui.continueWithoutProfile": "Continua senza profilo",
  "ui.proxyTitle": "Generatore Addon Proxy",
  "ui.proxySubtitle": "Inietta i poster di Pictorium in qualsiasi Add-on Stremio",
  "ui.proxyPasteLabel": "Incolla il link manifest.json dell'Add-on originale:",
  "ui.proxyPresets": "Preset rapidi:",
  "ui.proxyGeneratedLabel": "URL Addon Proxy generato:",
  "ui.proxyCopyLink": "Copia Link Proxy",
  "ui.proxyOpenStremio": "Apri su Stremio",
  "ui.proxyHint": "Inserisci l'URL di un add-on per generare il tuo link proxy personalizzato.",
  "ui.profileCreateOrAccess": "Crea o accedi ad un profilo per iniziare",
  "ui.uuidGenerating": "Generazione UUID...",
  "ui.copyUuid": "Copia UUID",
  "ui.aiomLinkTitle": "Link per AIO e custom URL:",
  "ui.aiomLinkDesc": "Usa questo template URL nei campi AIOMetadata o Custom URL della tua app o add-on per visualizzare i poster di Pictorium:",
  "ui.copyUrl": "Copia URL",
  "ui.copyUrlTooltip": "Copia l'URL del poster personalizzato da usare in AIOMetadata o Stremio",
  "ui.existingProfileUuid": "UUID Profilo Esistente",
  "ui.profileYourPassword": "La tua password",
  "ui.loadAndAccess": "Accedi & Carica Profilo",
  "badge.bingeWorthy": "Absolute Cinema",
  "badge.absoluteCinema": "Absolute Cinema",
  "badge.trending": "Di tendenza",
  "badge.trendingSeries": "Serie di tendenza",
  "badge.trendingAnime": "Anime di tendenza",
  "badge.director": "Di {name}",
  "badge.basedOn.novel": "Dal romanzo",
  "badge.basedOn.comic": "Dal fumetto",
  "badge.basedOn.videogame": "Dal videogioco",
  "badge.basedOn.trueStory": "Tratto da una storia vera",
  "badge.basedOn.story": "Da un racconto",
  "badge.basedOn.theater": "Dal teatro",
  "badge.basedOn.poetry": "Dalla poesia",
  "badge.basedOn.fallback": "Tratto da",
  "badge.winner": "Vincitore {name}",
  "badge.nominee": "Candidato {name}",
  "award.oscar": "Oscar",
  "award.bafta": "BAFTA",
  "award.golden_globe": "Golden Globe",
  "award.emmy": "Emmy",
  "award.david": "David",
  "award.venezia": "Venezia",
  "award.cannes": "Cannes",
  "franchise.mcu": "MCU",
  "franchise.dc_extended_universe": "DC Extended Universe",
  "franchise.star_wars": "Star Wars",
  "ui.setupPinTitle": "Proteggi il tuo pannello",
  "ui.setupPinSubtitle": "Imposta un PIN di sicurezza per accedere all'editor e salvare modifiche",
  "ui.setupPinSave": "Salva PIN e Inizia",
  "ui.setupPinSaving": "Salvataggio...",
  "ui.setupPinSkip": "Salta questo passaggio",
  "ui.setupPinMinDigits": "Il PIN deve contenere almeno 4 cifre",
  "ui.setupPinStremioNotice": "Manifest e poster Stremio restano aperti",
}

function mockT(key: string, params?: Record<string, string | number>): string {
  let val = itDict[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replace(`{${k}}`, String(v))
    }
  }
  return val
}

vi.mock("@/lib/i18n", () => ({
  t: mockT,
  createT: () => mockT,
  setLang: vi.fn(),
  getLang: () => "it",
  isPrefixedKey: (val: string) => val.startsWith("__"),
  badgeKey: (val: string) => val.startsWith("__") ? val.slice(2) : val,
  resolveLabel: (val: string) => mockT(val.startsWith("__") ? val.slice(2) : val),
  resolveLabelFor: (val: string, _lang: string) => mockT(val.startsWith("__") ? val.slice(2) : val),
  isRankKey: () => null,
  BADGE_KEY_PREFIX: "__",
}))
