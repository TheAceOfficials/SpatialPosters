"use client"

export interface PosterTab {
  key: string
  label: string
  count: number
}

/**
 * Tab di selezione del gruppo poster (Clean / lingua). Estrazione da
 * PosterOptions per riuso e leggibilità: puro render, nessuna logica.
 */
export function PosterTabs({
  tabs,
  activeGroup,
  onSelect,
}: {
  tabs: PosterTab[]
  activeGroup: string
  onSelect: (key: string) => void
}) {
  if (tabs.length <= 1) return null
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none py-0.5">
      {tabs.map((tab) => (
        <button
          type="button"
          aria-label={tab.label}
          key={tab.key}
          onClick={() => onSelect(tab.key)}
          className={`tab-chip h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all shrink-0 ${activeGroup === tab.key ? "tab-chip-active bg-zinc-100 text-zinc-950 font-bold border-white/50 shadow-sm" : "bg-white/5 text-zinc-400 border-white/10 hover:text-zinc-200 hover:bg-white/10"}`}
        >
          {tab.label}
          <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>
        </button>
      ))}
    </div>
  )
}
