import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import { PictoriumProvider, usePSelector } from "@/lib/context"
import { MOCK_CTX } from "./test-utils"
import type { PictoriumCtx } from "@/lib/context"
import { PosterEditorProvider } from "@/lib/contexts/PosterEditorContext"

describe("usePSelector", () => {
  it("re-renders only the component whose selected slice changed", () => {
    const langRender = vi.fn()
    const themeRender = vi.fn()

    function LangProbe() {
      const lang = usePSelector((v) => v.lang)
      langRender()
      return <span data-testid="lang">{lang}</span>
    }
    function ThemeProbe() {
      const theme = usePSelector((v) => v.theme)
      themeRender()
      return <span data-testid="theme">{theme}</span>
    }

    // Elemento figlio STABILE (stesso riferimento a ogni render): così l'unica
    // causa di re-render dei probe è la notifica dello store.
    const probes = (
      <>
        <LangProbe />
        <ThemeProbe />
      </>
    )

    let ctx: PictoriumCtx = { ...MOCK_CTX }
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <PosterEditorProvider>
        <PictoriumProvider value={ctx}>{children}</PictoriumProvider>
      </PosterEditorProvider>
    )

    const { rerender } = render(<Wrapper>{probes}</Wrapper>)
    expect(langRender).toHaveBeenCalledTimes(1)
    expect(themeRender).toHaveBeenCalledTimes(1)

    // Cambia solo lang (stesso riferimento figli): solo LangProbe ri-renderizza
    ctx = { ...ctx, lang: "en" }
    rerender(<Wrapper>{probes}</Wrapper>)

    expect(langRender).toHaveBeenCalledTimes(2)
    expect(themeRender).toHaveBeenCalledTimes(1)
  })

  it("throws when used outside the provider", () => {
    function Probe() {
      usePSelector((v) => v.lang)
      return null
    }
    expect(() => render(<Probe />)).toThrow("usePSelector must be inside SpatialProvider")
  })
})
