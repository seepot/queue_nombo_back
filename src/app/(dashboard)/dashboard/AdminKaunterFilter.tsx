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

export default function AdminKaunterFilter({
  branches,
  selectedBranch,
  selectedState,
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
    if (nextState) params.set("negeri", nextState);
    if (nextBranch) params.set("cawangan", nextBranch);
    router.push(`/dashboard${params.toString() ? `?${params.toString()}` : ""}`);
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
            value={state}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
            value={branch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Pilih Cawangan</option>
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
