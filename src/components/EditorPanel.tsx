"use client"

interface Props {
  title?: React.ReactNode
  tabs?: { key: string; label: string; count?: number }[]
  activeTab?: string
  onTabChange?: (key: string) => void
  /** Elemento extra in coda all'header (es. count pill, pill formato) */
  headerRight?: React.ReactNode
  /** Barra fissa in fondo al pannello (fuori dallo scroll del body), es. azioni */
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  "aria-label"?: string
}

export function EditorPanel({ title, tabs, activeTab, onTabChange, headerRight, footer, children, className = "", ["aria-label"]: ariaLabel }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!tabs || !activeTab || !onTabChange) return
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const dir = e.key === "ArrowRight" ? 1 : -1
      const currentIndex = tabs.findIndex(t => t.key === activeTab)
      const nextIndex = (currentIndex + dir + tabs.length) % tabs.length
      onTabChange(tabs[nextIndex].key)
    }
  }

  return (
    <section aria-label={ariaLabel} className={`editor-panel rounded-2xl border border-white/10 bg-zinc-950/75 shadow-2xl shadow-black/40 backdrop-blur-xl ${className}`}>
      {(title || tabs) && (
        <div className="editor-panel-header">
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            {title && <h3 className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">{title}</h3>}
            {tabs && (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 min-w-0 flex-1 justify-end" role="tablist" onKeyDown={handleKeyDown}>
                {tabs.map((tab) => (
                  <button type="button"
                    key={tab.key}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    tabIndex={activeTab === tab.key ? 0 : -1}
                    onClick={() => onTabChange?.(tab.key)}
                    className={`tab-chip h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all shrink-0 whitespace-nowrap ${activeTab === tab.key ? "tab-chip-active bg-accent-orange/15 text-accent-orange border-accent-orange/35" : "bg-white/5 text-muted border-white/10 hover:text-zinc-200 hover:bg-white/10"}`}
                  >
                    {tab.label}
                    {tab.count !== undefined && <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {headerRight && <span className="shrink-0 ml-auto flex items-center">{headerRight}</span>}
        </div>
      )}
      <div className="editor-panel-body scrollbar-none">
        {children}
      </div>
      {footer && (
        <div className="editor-panel-footer">{footer}</div>
      )}
    </section>
  )
}
