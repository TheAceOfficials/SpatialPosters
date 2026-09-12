"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import {
  X,
  Home,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Edit2,
  Check,
  RotateCcw,
  Power,
  Trash2,
  SlidersHorizontal,
  Film,
  Tv,
  Menu,
  CheckSquare,
  Square,
} from "lucide-react"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { SPATIALPOSTERS_CATALOGS } from "@/lib/catalog-definitions"
import { EmojiPicker } from "@/components/ui"

interface CatalogManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CatalogEntryItem {
  id: string
  name: string
  originalName: string
  type: "movie" | "series"
  isCustom: boolean
  customBaseId?: string
  enabled: boolean
  showInHome: boolean
}

export function CatalogManagerModal({ isOpen, onClose }: CatalogManagerModalProps) {
  const { t } = useT()
  const customCatalogs = usePSelector((v) => v.customCatalogs)
  const toggleCustomCatalog = usePSelector((v) => v.toggleCustomCatalog)
  const removeCustomCatalog = usePSelector((v) => v.removeCustomCatalog)
  const disabledCatalogIds = usePSelector((v) => v.disabledCatalogIds)
  const toggleBuiltinCatalog = usePSelector((v) => v.toggleBuiltinCatalog)
  const homeDisabledCatalogIds = usePSelector((v) => v.homeDisabledCatalogIds)
  const toggleCatalogHome = usePSelector((v) => v.toggleCatalogHome)
  const catalogOrder = usePSelector((v) => v.catalogOrder)
  const setCatalogOrder = usePSelector((v) => v.setCatalogOrder)
  const moveCatalog = usePSelector((v) => v.moveCatalog)
  const catalogRenames = usePSelector((v) => v.catalogRenames)
  const renameCatalog = usePSelector((v) => v.renameCatalog)
  const resetCatalogNames = usePSelector((v) => v.resetCatalogNames)
  const resetCatalogOrder = usePSelector((v) => v.resetCatalogOrder)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingId) setEditingId(null)
        else if (selectedIds.size > 0) setSelectedIds(new Set())
        else onClose()
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClickOutside)
    }, 50)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("click", handleClickOutside)
      clearTimeout(timer)
    }
  }, [isOpen, onClose, editingId, selectedIds])

  const allCatalogs = useMemo(() => {
    const list: CatalogEntryItem[] = []

    // Built-in catalogs
    for (const c of SPATIALPOSTERS_CATALOGS) {
      list.push({
        id: c.id,
        name: catalogRenames[c.id] || c.name,
        originalName: c.name,
        type: c.type,
        isCustom: false,
        enabled: !disabledCatalogIds.includes(c.id),
        showInHome: !homeDisabledCatalogIds.includes(c.id),
      })
    }

    // Custom catalogs
    for (const cc of customCatalogs) {
      const isCustomHomeDisabled = homeDisabledCatalogIds.includes(cc.id)
      if (cc.type === "mixed") {
        const mId = `pictorium-custom-movie-${cc.id}`
        const sId = `pictorium-custom-series-${cc.id}`
        list.push({
          id: mId,
          name: catalogRenames[mId] || `${cc.name} — ${t("ui.movie")}`,
          originalName: `${cc.name} — ${t("ui.movie")}`,
          type: "movie",
          isCustom: true,
          customBaseId: cc.id,
          enabled: cc.enabled !== false,
          showInHome: !isCustomHomeDisabled && !homeDisabledCatalogIds.includes(mId),
        })
        list.push({
          id: sId,
          name: catalogRenames[sId] || `${cc.name} — ${t("ui.tvSeries")}`,
          originalName: `${cc.name} — ${t("ui.tvSeries")}`,
          type: "series",
          isCustom: true,
          customBaseId: cc.id,
          enabled: cc.enabled !== false,
          showInHome: !isCustomHomeDisabled && !homeDisabledCatalogIds.includes(sId),
        })
      } else {
        const cId = `pictorium-custom-${cc.type}-${cc.id}`
        list.push({
          id: cId,
          name: catalogRenames[cId] || cc.name,
          originalName: cc.name,
          type: cc.type,
          isCustom: true,
          customBaseId: cc.id,
          enabled: cc.enabled !== false,
          showInHome: !isCustomHomeDisabled && !homeDisabledCatalogIds.includes(cId),
        })
      }
    }

    // Sort according to catalogOrder
    if (catalogOrder && catalogOrder.length > 0) {
      const orderMap = new Map<string, number>()
      catalogOrder.forEach((id, idx) => orderMap.set(id, idx))
      list.sort((a, b) => {
        const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999
        const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999
        return orderA - orderB
      })
    }

    return list
  }, [customCatalogs, disabledCatalogIds, homeDisabledCatalogIds, catalogOrder, catalogRenames, t])

  if (!isOpen) return null

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = allCatalogs.length > 0 && selectedIds.size === allCatalogs.length
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allCatalogs.map((c) => c.id)))
  }

  const startRename = (item: CatalogEntryItem) => {
    setEditingId(item.id)
    setEditName(item.name)
  }

  const saveRename = (id: string) => {
    if (editName.trim()) {
      renameCatalog(id, editName.trim())
    }
    setEditingId(null)
  }

  const cancelRename = () => {
    setEditingId(null)
  }

  const handleToggle = (item: CatalogEntryItem) => {
    if (item.isCustom && item.customBaseId) {
      toggleCustomCatalog(item.customBaseId)
    } else {
      toggleBuiltinCatalog(item.id)
    }
  }

  // Batch move operations
  const moveSelectedToTop = () => {
    if (selectedIds.size === 0) return
    const selectedList = allCatalogs.filter((c) => selectedIds.has(c.id)).map((c) => c.id)
    const remainingList = allCatalogs.filter((c) => !selectedIds.has(c.id)).map((c) => c.id)
    setCatalogOrder([...selectedList, ...remainingList])
  }

  const moveSelectedToBottom = () => {
    if (selectedIds.size === 0) return
    const selectedList = allCatalogs.filter((c) => selectedIds.has(c.id)).map((c) => c.id)
    const remainingList = allCatalogs.filter((c) => !selectedIds.has(c.id)).map((c) => c.id)
    setCatalogOrder([...remainingList, ...selectedList])
  }

  const moveSelectedUp = () => {
    if (selectedIds.size === 0) return
    const order = allCatalogs.map((c) => c.id)
    const next = [...order]
    for (let i = 1; i < next.length; i++) {
      if (selectedIds.has(next[i]) && !selectedIds.has(next[i - 1])) {
        const temp = next[i]
        next[i] = next[i - 1]
        next[i - 1] = temp
      }
    }
    setCatalogOrder(next)
  }

  const moveSelectedDown = () => {
    if (selectedIds.size === 0) return
    const order = allCatalogs.map((c) => c.id)
    const next = [...order]
    for (let i = next.length - 2; i >= 0; i--) {
      if (selectedIds.has(next[i]) && !selectedIds.has(next[i + 1])) {
        const temp = next[i]
        next[i] = next[i + 1]
        next[i + 1] = temp
      }
    }
    setCatalogOrder(next)
  }

  // Drag and drop handlers (support single & multi drag)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    const item = allCatalogs[index]
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `${index}`)

    if (!selectedIds.has(item.id)) {
      // Se trascina un elemento non selezionato, mantieni solo quello
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const draggedItem = allCatalogs[draggedIndex]

    if (selectedIds.has(draggedItem.id) && selectedIds.size > 1) {
      // Sposta tutti gli elementi selezionati insieme nel punto target
      const targetItem = allCatalogs[targetIndex]
      const selectedList = allCatalogs.filter((c) => selectedIds.has(c.id)).map((c) => c.id)
      const remainingList = allCatalogs.filter((c) => !selectedIds.has(c.id)).map((c) => c.id)

      const targetInRemaining = remainingList.indexOf(targetItem.id)
      const insertPos =
        targetInRemaining >= 0
          ? targetIndex > draggedIndex
            ? targetInRemaining + 1
            : targetInRemaining
          : remainingList.length

      remainingList.splice(insertPos, 0, ...selectedList)
      setCatalogOrder(remainingList)
    } else {
      const orderIds = allCatalogs.map((c) => c.id)
      const [movedItem] = orderIds.splice(draggedIndex, 1)
      orderIds.splice(targetIndex, 0, movedItem)
      setCatalogOrder(orderIds)
    }

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-[600px] max-w-[calc(100vw-1.5rem)] z-50 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-surface2/50">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="w-5 h-5 text-accent-orange" />
          <div>
            <h3 className="text-sm font-bold text-white">{t("ui.catMgrTitle")}</h3>
            <p className="text-[11px] text-muted">
              {t("ui.catMgrSubtitle")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("ui.close")}
          className="p-1.5 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Multi-Selection & Global Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface2/30 border-b border-white/10 text-xs gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-all font-medium text-[11px]"
          >
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-accent-orange" /> : <Square className="w-3.5 h-3.5" />}
            <span>{selectedIds.size > 0 ? t("ui.selectedCount", { count: selectedIds.size }) : t("ui.selectAll")}</span>
          </button>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1 bg-accent-orange/15 border border-accent-orange/30 px-2 py-0.5 rounded-lg text-accent-orange font-semibold text-[11px]">
              <span>{t("ui.moveGroup")}</span>
              <button
                type="button"
                onClick={moveSelectedToTop}
                title={t("ui.moveTop")}
                className="p-1 hover:bg-accent-orange/20 rounded transition-colors"
              >
                <ChevronsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={moveSelectedUp}
                title={t("ui.moveUp1")}
                className="p-1 hover:bg-accent-orange/20 rounded transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={moveSelectedDown}
                title={t("ui.moveDown1")}
                className="p-1 hover:bg-accent-orange/20 rounded transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={moveSelectedToBottom}
                title={t("ui.moveBottom")}
                className="p-1 hover:bg-accent-orange/20 rounded transition-colors"
              >
                <ChevronsDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="ml-1 text-[10px] underline hover:text-white"
              >
                {t("ui.deselect")}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {catalogOrder.length > 0 && (
            <button
              type="button"
              onClick={resetCatalogOrder}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-muted hover:text-zinc-200 hover:bg-white/5 transition-colors text-[11px]"
            >
              <RotateCcw className="w-3 h-3" /> {t("ui.resetOrder")}
            </button>
          )}
          {Object.keys(catalogRenames).length > 0 && (
            <button
              type="button"
              onClick={resetCatalogNames}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-muted hover:text-zinc-200 hover:bg-white/5 transition-colors text-[11px]"
            >
              <RotateCcw className="w-3 h-3" /> {t("ui.resetNames")}
            </button>
          )}
        </div>
      </div>

      {/* Catalog List */}
      <div className="p-4 space-y-2 overflow-y-auto flex-1 scrollbar-thin">
        {allCatalogs.map((item, index) => {
          const isEditing = editingId === item.id
          const isSelected = selectedIds.has(item.id)
          const isCustomRenamed = Boolean(catalogRenames[item.id] && catalogRenames[item.id] !== item.originalName)
          const isBeingDragged = draggedIndex === index
          const isDragTarget = dragOverIndex === index

          return (
            <div
              key={item.id}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                isBeingDragged
                  ? "opacity-25 border-dashed border-accent-orange/70 bg-accent-orange/5"
                  : isDragTarget
                  ? "border-accent-orange bg-accent-orange/15 scale-[1.01] shadow-lg"
                  : isSelected
                  ? "bg-accent-orange/10 border-accent-orange/40 shadow-sm"
                  : item.enabled
                  ? "bg-surface2/70 border-white/10 hover:border-white/20 shadow-sm"
                  : "bg-surface2/30 border-white/5 opacity-50"
              }`}
            >
              {/* Left: Checkbox + 3 lines Grip + Priority Index + Quick Arrows */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Selection Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelect(item.id)}
                  className="p-1 rounded-md text-muted hover:text-white transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-accent-orange" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {/* 3 lines Drag Handle */}
                <div
                  className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
                  title={
                    isSelected && selectedIds.size > 1
                      ? t("ui.dragMany", { count: selectedIds.size })
                      : t("ui.dragOne")
                  }
                >
                  <Menu className="w-4 h-4 stroke-[2.5]" />
                </div>

                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => (isSelected ? moveSelectedUp() : moveCatalog(item.id, "up"))}
                    title={t("ui.moveUp")}
                    className="p-0.5 rounded hover:bg-white/10 text-muted hover:text-white disabled:opacity-15 transition-colors"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={index === allCatalogs.length - 1}
                    onClick={() => (isSelected ? moveSelectedDown() : moveCatalog(item.id, "down"))}
                    title={t("ui.moveDown")}
                    className="p-0.5 rounded hover:bg-white/10 text-muted hover:text-white disabled:opacity-15 transition-colors"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                <span className="w-6 text-center text-xs font-mono font-bold text-muted">
                  #{index + 1}
                </span>
              </div>

              {/* Center: Title & inline edit */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-1.5">
                    <EmojiPicker
                      currentName={editName}
                      onSelectEmoji={(em) => {
                        const cleaned = editName.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{Emoji})\s*/u, "")
                        setEditName(`${em} ${cleaned}`)
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(item.id)
                          if (e.key === "Escape") cancelRename()
                        }}
                        className="flex-1 px-3 py-1.5 bg-surface border border-accent-orange/50 rounded-xl text-xs text-white focus:outline-none focus:border-accent-orange"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => saveRename(item.id)}
                        className="p-2 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 transition-colors"
                        title={t("ui.saveName")}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
                        title={t("ui.cancel")}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white truncate">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => startRename(item)}
                      className="p-1 rounded text-muted hover:text-white hover:bg-white/5 transition-colors shrink-0"
                      title={t("ui.renameCatalog")}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {isCustomRenamed && (
                      <button
                        type="button"
                        onClick={() => renameCatalog(item.id, "")}
                        className="text-[10px] text-accent-orange hover:underline shrink-0"
                        title={t("ui.origName", { name: item.originalName })}
                      >
                        {t("ui.restoreName")}
                      </button>
                    )}
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                        item.type === "movie"
                          ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                          : "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                      }`}
                    >
                      {item.type === "movie" ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                      {item.type === "movie" ? t("ui.movie") : t("ui.tvSeries")}
                    </span>
                    {item.isCustom && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        Custom
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleCatalogHome(item.id)}
                  title={
                    item.showInHome
                      ? t("ui.homeVisible")
                      : t("ui.homeHidden")
                  }
                  className={`p-1.5 rounded-xl border transition-colors ${
                    item.showInHome
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                      : "bg-white/5 border-white/5 text-muted hover:text-white"
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  title={item.enabled ? t("ui.disableStremio") : t("ui.enableStremio")}
                  className={`p-1.5 rounded-xl border transition-colors ${
                    item.enabled
                      ? "bg-accent-orange/15 border-accent-orange/30 text-accent-orange hover:bg-accent-orange/25"
                      : "bg-white/5 border-white/5 text-muted hover:text-white"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                {item.isCustom && item.customBaseId && (
                  <button
                    type="button"
                    onClick={() => removeCustomCatalog(item.customBaseId!)}
                    title={t("ui.deleteCatalog")}
                    className="p-1.5 rounded-xl border border-white/5 text-muted hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-surface2/40">
        <span className="text-xs text-muted font-medium">
          {t("ui.enabledCount", { count: allCatalogs.filter((c) => c.enabled).length })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-accent-orange text-white text-xs font-semibold hover:bg-accent-orange/90 active:scale-95 transition-all shadow-md"
        >
          {t("ui.done")}
        </button>
      </div>
    </div>
  )
}
