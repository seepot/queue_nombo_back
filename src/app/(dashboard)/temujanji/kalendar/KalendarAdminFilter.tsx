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
  selectedDate: string;
  selectedState: string;
  selectedView: string;
  states: StateOption[];
}

export default function KalendarAdminFilter({
  branches,
  selectedBranch,
  selectedDate,
  selectedState,
  selectedView,
  states,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState(selectedState);
  const [branch, setBranch] = useState(selectedBranch);

  const filteredBranches = useMemo(
    () =>
      branches.filter((item) => {
        if (!state) return true;
        return item.idCawangan?.substring(2, 4) === state || item.negeri === state;
      }),
    [branches, state]
  );

  const go = (nextState: string, nextBranch: string) => {
    const params = new URLSearchParams();
    params.set("view", selectedView);
    params.set("tarikh", selectedDate);
    if (nextState) params.set("negeri", nextState);
    if (nextBranch) params.set("cawangan", nextBranch);
    router.push(`/temujanji/kalendar?${params.toString()}`);
  };

  const handleStateChange = (nextState: string) => {
    setState(nextState);
    setBranch("");
    go(nextState, "");
  };

  const handleBranchChange = (nextBranch: string) => {
    setBranch(nextBranch);
    go(state, nextBranch);
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Negeri
          </label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            onChange={(e) => handleStateChange(e.target.value)}
            value={state}
          >
            <option value="">Semua Negeri</option>
            {states.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cawangan
          </label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            onChange={(e) => handleBranchChange(e.target.value)}
            value={branch}
          >
            <option value="">Semua Cawangan</option>
            {filteredBranches.map((item) => (
              <option
                key={item.idCawangan || item.namaCawangan}
                value={item.idCawangan || ""}
              >
                {item.namaCawangan} ({item.idCawangan})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
