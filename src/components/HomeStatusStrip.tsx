"use client"

import { useT } from "@/lib/contexts/TranslationContext"
import { usePSelector } from "@/lib/context"
import { APP_VERSION } from "@/generated/app-version"
import { HeartPulse, Github, Layers, Sparkles } from "lucide-react"

export function HomeStatusStrip() {
  const { t } = useT()
  const router = usePSelector((v) => v.router)

  return (
    <footer className="w-full mt-16 md:mt-24 border-t border-white/10 bg-zinc-950/80 backdrop-blur-2xl text-zinc-400 py-10 md:py-14 px-4 sm:px-6 relative z-10" data-testid="home-status">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 pb-8">
        
        {/* Brand Info & Mission */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo local */}
            <img
              src="/SpatialPosters.png"
              alt="SpatialPosters"
              className="h-8 md:h-10 w-auto cursor-pointer hover:brightness-110 transition-all"
              onClick={() => router.push("edit")}
            />
          </div>
          <p className="text-xs md:text-sm text-zinc-400 max-w-sm leading-relaxed">
            Elevating your Stremio media experience with high-definition dynamic posters, vector logos, rating badges, and real-time custom catalog integration.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Navigation</h4>
          <ul className="space-y-2 text-xs font-medium">
            <li>
              <button type="button" onClick={() => router.push("cataloghi")} className="hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t("ui.catalogs") || "Cataloghi Hub"}</span>
              </button>
            </li>
            <li>
              <button type="button" onClick={() => router.push("myposters")} className="hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer">
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t("ui.myPostersBtn") || "My Posters"}</span>
              </button>
            </li>
            <li>
              <a href="/status" className="hover:text-zinc-100 transition-colors flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t("ui.statusTitle") || "System Status"}</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Operational Status & Build */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Platform Health</h4>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t("ui.allSystemsOperational") || "All Systems Operational"}</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            <span>SpatialPosters v{APP_VERSION}</span>
          </div>
        </div>

      </div>

      {/* Bottom Hairline & Copyright */}
      <div className="max-w-6xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
        <p>© {new Date().getFullYear()} SpatialPosters. Open-source media enhancement project for Stremio.</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/TheAceOfficials/SpatialPosters"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
