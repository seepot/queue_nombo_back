"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import BranchCounterDrilldownModal from "@/app/(dashboard)/dashboard/BranchCounterDrilldownModal";

interface SearchResultItem {
  id: string;
  category: "cawangan" | "menu" | "staf" | "tiket";
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  actionKind?: "navigate" | "drilldown";
  metadata?: {
    idCawangan?: string;
    namaCawangan?: string;
  };
}

export default function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Drilldown Modal from search
  const [drilldownBranch, setDrilldownBranch] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Toggle Command Palette via Global Keyboard Shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Search API Call with debouncing
  const performSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/carian?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.results || []);
        setSelectedIndex(0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, isOpen, performSearch]);

  // Handle Result Execution
  const executeItem = useCallback(
    (item: SearchResultItem) => {
      if (item.actionKind === "drilldown" && item.metadata?.idCawangan) {
        setDrilldownBranch({
          id: item.metadata.idCawangan,
          name: item.metadata.namaCawangan || item.title,
        });
        setIsOpen(false);
      } else {
        setIsOpen(false);
        router.push(item.href);
      }
    },
    [router]
  );

  // Arrow Key Navigation
  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        executeItem(results[selectedIndex]);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <>
      {/* Header Search Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition text-xs text-slate-400 cursor-pointer w-64 lg:w-80 group"
      >
        <span className="text-slate-400 group-hover:text-blue-600 transition">🔍</span>
        <span className="text-slate-500 font-medium truncate grow text-left">
          Cari cawangan, staf, tiket, menu...
        </span>
        <kbd className="font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 shadow-2xs group-hover:border-blue-300">
          ⌘K
        </kbd>
      </button>

      {/* Mobile Search Icon Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
        title="Carian Pintar (⌘K)"
      >
        <span>🔍</span>
      </button>

      {/* Spotlight Command Palette Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
              <span className="text-xl text-blue-700">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDownInput}
                placeholder="Taip cawangan (cth: Padang Jawa), staf, nombor tiket, atau menu..."
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 font-semibold text-sm sm:text-base outline-none"
              />
              {loading && <span className="animate-spin text-sm text-slate-400">🔄</span>}
              <kbd className="hidden sm:inline-block font-mono text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-500 shadow-2xs">
                ESC
              </kbd>
            </div>

            {/* Quick Filter Categories Header */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>{results.length} Padanan Dijumpai</span>
              <div className="hidden sm:flex items-center gap-3 text-[10px]">
                <span>Guna kekunci <strong className="font-mono text-slate-700">↑ ↓</strong> untuk pilih</span>
                <span><strong className="font-mono text-slate-700">ENTER</strong> untuk buka</span>
              </div>
            </div>

            {/* Results Scroll List */}
            <div
              ref={listRef}
              className="max-h-[50vh] overflow-y-auto p-2 divide-y divide-slate-100/60"
            >
              {results.length > 0 ? (
                results.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-3 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 font-mono ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : item.category === "cawangan"
                              ? "bg-blue-100 text-blue-900 border border-blue-200"
                              : item.category === "staf"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : item.category === "tiket"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {item.badge}
                        </span>

                        <div className="truncate">
                          <h5
                            className={`text-sm font-bold truncate ${
                              isSelected ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {item.title}
                          </h5>
                          <p
                            className={`text-xs truncate ${
                              isSelected ? "text-blue-100" : "text-slate-500"
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.actionKind === "drilldown" && (
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isSelected
                                ? "bg-white/30 text-white"
                                : "bg-blue-50 text-blue-800 border border-blue-200"
                            }`}
                          >
                            🖥️ Kaunter
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold ${
                            isSelected ? "text-white" : "text-slate-400"
                          }`}
                        >
                          ➔
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <span className="text-3xl block mb-1">🔍</span>
                  <p>Tiada padanan dijumpai untuk &quot;{query}&quot;</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cuba taip nama cawangan (cth: Padang Jawa), No KP staf, nombor tiket, atau menu.
                  </p>
                </div>
              )}
            </div>

            {/* Command Palette Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <span>⚡</span>
                <span>Carian Pintar JPJeQ v2</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Branch Counter Drilldown Modal triggered from Command Palette */}
      {drilldownBranch && (
        <BranchCounterDrilldownModal
          idCawangan={drilldownBranch.id}
          namaCawangan={drilldownBranch.name}
          onClose={() => setDrilldownBranch(null)}
        />
      )}
    </>
  );
}
