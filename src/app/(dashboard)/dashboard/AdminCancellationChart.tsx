"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CancellationChartItem {
  code: string;
  negeri: string;
  batalKaunter: number;
  batalPengguna: number;
}

interface BranchCancellationItem {
  negeri: string;
  idCawangan: string;
  namaCawangan: string;
  batalKaunter: number;
  batalPengguna: number;
}

interface Props {
  data: CancellationChartItem[];
  branches: BranchCancellationItem[];
  totalBatalKaunter: number;
  totalBatalPengguna: number;
}

export default function AdminCancellationChart({
  data,
  branches,
  totalBatalKaunter,
  totalBatalPengguna,
}: Props) {
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const selectedStateData = data.find((item) => item.code === selectedState);
  const selectedBranches = useMemo(
    () => branches.filter((item) => item.negeri === selectedState),
    [branches, selectedState]
  );

  const totalBatal = totalBatalKaunter + totalBatalPengguna;

  const handleSelect = (code: string) => {
    setSelectedState((current) => (current === code ? null : code));
  };

  const handleChartSelect = (payload: unknown) => {
    const item =
      (payload as { payload?: CancellationChartItem })?.payload ||
      (payload as CancellationChartItem | undefined);

    if (item?.code) {
      handleSelect(item.code);
    }
  };

  const getBatalLabel = (name: unknown) =>
    name === "batalKaunter" || name === "Batal Kaunter"
      ? "Batal Kaunter"
      : "Batal Pengguna";

  return (
    <div>
      <div className="px-4 pt-4">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 16, right: 16, left: 0, bottom: 48 }}
              onClick={(state) => {
                const item = (
                  state as {
                    activePayload?: Array<{ payload?: CancellationChartItem }>;
                  }
                )?.activePayload?.[0]?.payload;
                if (item?.code) handleSelect(item.code);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="negeri"
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
                tick={{ fontSize: 11, fill: "#4b5563" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#4b5563" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(239, 68, 68, 0.08)" }}
                formatter={(value, name) => [
                  Number(value).toLocaleString("ms-MY"),
                  getBatalLabel(name),
                ]}
                labelClassName="font-semibold"
              />
              <Legend
                formatter={(value) =>
                  value === "batalKaunter" ? "Batal Kaunter" : "Batal Pengguna"
                }
              />
              <Bar
                dataKey="batalKaunter"
                fill="#ef4444"
                name="Batal Kaunter"
                onClick={handleChartSelect}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="batalPengguna"
                fill="#f59e0b"
                name="Batal Pengguna"
                onClick={handleChartSelect}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left">Bil.</th>
              <th className="px-3 py-2 text-left">Negeri</th>
              <th className="px-3 py-2 text-center">Batal Kaunter</th>
              <th className="px-3 py-2 text-center">Batal Pengguna</th>
              <th className="px-3 py-2 text-center">Jumlah Batal</th>
              <th className="px-3 py-2 text-center">Cawangan</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row, idx) => {
              const jumlah = row.batalKaunter + row.batalPengguna;

              return (
                <tr
                  key={row.code}
                  className={`hover:bg-red-50 ${
                    selectedState === row.code ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <button
                      className="font-medium text-red-700 hover:text-red-900 hover:underline"
                      onClick={() => handleSelect(row.code)}
                      type="button"
                    >
                      {row.negeri}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.batalKaunter.toLocaleString("ms-MY")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.batalPengguna.toLocaleString("ms-MY")}
                  </td>
                  <td className="px-3 py-2 text-center font-semibold">
                    {jumlah.toLocaleString("ms-MY")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                      onClick={() => handleSelect(row.code)}
                      type="button"
                    >
                      {selectedState === row.code ? "Tutup" : "Lihat"}
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-semibold">
              <td className="px-3 py-2" colSpan={2}>
                Jumlah
              </td>
              <td className="px-3 py-2 text-center">
                {totalBatalKaunter.toLocaleString("ms-MY")}
              </td>
              <td className="px-3 py-2 text-center">
                {totalBatalPengguna.toLocaleString("ms-MY")}
              </td>
              <td className="px-3 py-2 text-center">
                {totalBatal.toLocaleString("ms-MY")}
              </td>
              <td className="px-3 py-2" />
            </tr>
          </tbody>
        </table>
      </div>

      {selectedStateData && (
        <div className="border-t border-gray-200 bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <h4 className="font-bold text-gray-800">
                Batal Cawangan: {selectedStateData.negeri}
              </h4>
              <p className="text-xs text-gray-500">
                Jumlah negeri:{" "}
                {(
                  selectedStateData.batalKaunter +
                  selectedStateData.batalPengguna
                ).toLocaleString("ms-MY")}
              </p>
            </div>
            <button
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setSelectedState(null)}
              type="button"
            >
              Tutup
            </button>
          </div>
          <div className="px-4 pb-4">
            <div className="h-72 w-full rounded-lg border border-gray-200 bg-white p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={selectedBranches.map((branch) => ({
                    cawangan: branch.namaCawangan,
                    batalKaunter: branch.batalKaunter,
                    batalPengguna: branch.batalPengguna,
                  }))}
                  margin={{ top: 16, right: 16, left: 0, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="cawangan"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={90}
                    tick={{ fontSize: 11, fill: "#4b5563" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#4b5563" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(239, 68, 68, 0.08)" }}
                    formatter={(value, name) => [
                      Number(value).toLocaleString("ms-MY"),
                      getBatalLabel(name),
                    ]}
                    labelClassName="font-semibold"
                  />
                  <Legend
                    formatter={(value) =>
                      value === "batalKaunter"
                        ? "Batal Kaunter"
                        : "Batal Pengguna"
                    }
                  />
                  <Bar
                    dataKey="batalKaunter"
                    fill="#ef4444"
                    name="Batal Kaunter"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="batalPengguna"
                    fill="#f59e0b"
                    name="Batal Pengguna"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-white">
                <tr>
                  <th className="px-3 py-2 text-left">Bil.</th>
                  <th className="px-3 py-2 text-left">ID Cawangan</th>
                  <th className="px-3 py-2 text-left">Nama Cawangan</th>
                  <th className="px-3 py-2 text-center">Batal Kaunter</th>
                  <th className="px-3 py-2 text-center">Batal Pengguna</th>
                  <th className="px-3 py-2 text-center">Jumlah Batal</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {selectedBranches.map((branch, idx) => {
                  const jumlah = branch.batalKaunter + branch.batalPengguna;

                  return (
                    <tr key={branch.idCawangan} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {branch.idCawangan}
                      </td>
                      <td className="px-3 py-2">{branch.namaCawangan}</td>
                      <td className="px-3 py-2 text-center">
                        {branch.batalKaunter.toLocaleString("ms-MY")}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {branch.batalPengguna.toLocaleString("ms-MY")}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">
                        {jumlah.toLocaleString("ms-MY")}
                      </td>
                    </tr>
                  );
                })}
                {selectedBranches.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-gray-400"
                      colSpan={6}
                    >
                      Tiada statistik batal cawangan untuk negeri ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
