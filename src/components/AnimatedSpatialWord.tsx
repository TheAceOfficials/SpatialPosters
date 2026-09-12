"use client"

import { useState, useEffect } from "react"

const SPATIAL_VARIANTS = [
  "SpatialPosters",
  "SpatialAffiches",
  "SpatialPósters",
  "SpatialPosteres",
  "Spatialポスター",
  "Spatial포스터",
  "Spatial海报",
  "Spatialपोस्टर्स",
  "SpatialПостеры",
  "Spatialملصقات",
]

export function AnimatedSpatialWord() {
  const [index, setIndex] = useState(0)
  const [fadeState, setFadeState] = useState<"in" | "out">("in")

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeState("out")
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % SPATIAL_VARIANTS.length)
        setFadeState("in")
      }, 350) // duration of fade-out before updating text
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  return (
    <span className="inline-block relative overflow-hidden align-bottom px-1.5 py-0.5 rounded-lg bg-white/[0.06] border border-white/15 backdrop-blur-md shadow-inner">
      <span
        className={`inline-block font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 transition-all duration-300 transform ${
          fadeState === "in"
            ? "opacity-100 translate-y-0 scale-100 blur-0"
            : "opacity-0 -translate-y-2 scale-95 blur-sm"
        }`}
      >
        {SPATIAL_VARIANTS[index]}
      </span>
    </span>
  )
}
