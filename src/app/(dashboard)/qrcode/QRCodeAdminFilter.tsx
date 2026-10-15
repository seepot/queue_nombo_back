"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface StateOption {
  code: string;
  name: string;
}

interface BranchOption {
  idCawangan: string | null;
  namaCawangan: string;
  negeri: string | null;
}

interface Props {
  branches: BranchOption[];
  selectedBranch: string;
  selectedState: string;
  states: StateOption[];
}

import Image from "next/image";

// State Flag Icon using uploaded PNG files in /images/flags/
function StateFlag({ code, name }: { code: string; name: string }) {
  return (
    <div className="relative w-8 h-5 rounded overflow-hidden shadow-2xs shrink-0 border border-slate-300/60 bg-white">
      <Image
        src={`/images/flags/${code}.png`}
        alt={`Bendera ${name}`}
        fill
        sizes="32px"
        className="object-cover"
        priority
      />
    </div>
  );
}

export default function QRCodeAdminFilter({
  branches,
  selectedBranch,
  selectedState,
  states,
}: Props) {
  const router = useRouter();
  const [searchBranch, setSearchBranch] = useState("");

  // Map state codes to count of branches
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of branches) {
      const st = b.negeri || b.idCawangan?.substring(2, 4) || "";
      if (st) {
        counts[st] = (counts[st] || 0) + 1;
      }
    }
    return counts;
  }, [branches]);

  // Branches in selected state
  const branchesInState = useMemo(() => {
    let list = branches;
    if (selectedState) {
      list = branches.filter(
        (item) =>
          item.idCawangan?.substring(2, 4) === selectedState ||
          item.negeri === selectedState
      );
    }
    if (searchBranch.trim()) {
      const q = searchBranch.toLowerCase();
      list = list.filter(
        (item) =>
          item.namaCawangan.toLowerCase().includes(q) ||
          item.idCawangan?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [branches, selectedState, searchBranch]);

  const activeStateObj = states.find((s) => s.code === selectedState);

  const selectState = (stateCode: string) => {
    const params = new URLSearchParams();
    if (stateCode) params.set("negeri", stateCode);
    setSearchBranch("");
    router.push(`/qrcode${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const selectBranch = (branchId: string) => {
    const params = new URLSearchParams();
    if (selectedState) params.set("negeri", selectedState);
    if (branchId) params.set("cawangan", branchId);
    router.push(`/qrcode${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="space-y-5 mb-6">
      {/* 1. STATE CARDS SELECTOR */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
              1
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Pilih Negeri (16 Negeri &amp; Wilayah Persekutuan)
              </h3>
              <p className="text-[11px] text-slate-400">
                Klik mana-mana kad negeri untuk melihat senarai cawangan
              </p>
            </div>
          </div>

          {selectedState && (
            <button
              type="button"
              onClick={() => selectState("")}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center gap-1 self-start sm:self-auto"
            >
              <span>↺</span>
              <span>Papar Semua Negeri</span>
            </button>
          )}
        </div>

        {/* 16 State Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {states.map((st) => {
            const isSelected = selectedState === st.code;
            const count = stateCounts[st.code] || 0;

            return (
              <button
                key={st.code}
                type="button"
                onClick={() => selectState(isSelected ? "" : st.code)}
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30 scale-[1.02]"
                    : "bg-slate-50/70 hover:bg-blue-50/60 border-slate-200/80 hover:border-blue-300 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <StateFlag code={st.code} name={st.name} />
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isSelected ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </div>

                <div className="mt-2">
                  <strong className="text-xs font-bold truncate block leading-tight">
                    {st.name}
                  </strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BRANCH CARDS SELECTOR */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
              2
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Pilih Cawangan JPJ {activeStateObj ? `di ${activeStateObj.name}` : "(Seluruh Malaysia)"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {branchesInState.length} cawangan tersedia untuk semakan &amp; cetakan Kod QR
              </p>
            </div>
          </div>

          {/* Quick Search Branch in List */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Cari nama atau ID cawangan..."
              value={searchBranch}
              onChange={(e) => setSearchBranch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">
              🔍
            </span>
            {searchBranch && (
              <button
                type="button"
                onClick={() => setSearchBranch("")}
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Branch Cards Grid */}
        {branchesInState.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {branchesInState.map((b) => {
              const isSelected = selectedBranch === b.idCawangan;

              return (
                <button
                  key={b.idCawangan || b.namaCawangan}
                  type="button"
                  onClick={() => selectBranch(b.idCawangan || "")}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400/50 scale-[1.01]"
                      : "bg-slate-50/60 hover:bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs text-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong
                      className={`text-xs font-black truncate block ${
                        isSelected ? "text-white" : "text-slate-900 group-hover:text-blue-700"
                      }`}
                      title={b.namaCawangan}
                    >
                      {b.namaCawangan}
                    </strong>
                    {isSelected && (
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 shrink-0">
                        Dipilih
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-200/50">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isSelected ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      ID: {b.idCawangan || "-"}
                    </span>
                    <span
                      className={`text-[10px] font-bold flex items-center gap-1 ${
                        isSelected ? "text-emerald-300" : "text-emerald-600"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Kod QR Sedia
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Tiada cawangan dijumpai untuk carian &quot;{searchBranch}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
