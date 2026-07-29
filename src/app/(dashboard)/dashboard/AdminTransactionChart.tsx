"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TransactionChartItem {
  code: string;
  negeri: string;
  transaksi: number;
}

interface BranchTransactionItem {
  negeri: string;
  idCawangan: string;
  namaCawangan: string;
  jumlah: number;
}

interface Props {
  data: TransactionChartItem[];
  branches: BranchTransactionItem[];
  totalTransaksi: number;
}

export default function AdminTransactionChart({
  data,
  branches,
  totalTransaksi,
}: Props) {
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const selectedStateData = data.find((item) => item.code === selectedState);
  const selectedBranches = useMemo(
    () => branches.filter((item) => item.negeri === selectedState),
    [branches, selectedState]
  );

  const handleSelect = (code: string) => {
    setSelectedState((current) => (current === code ? null : code));
  };

  const handleChartSelect = (payload: unknown) => {
    const item =
      (payload as { payload?: TransactionChartItem })?.payload ||
      (payload as TransactionChartItem | undefined);

    if (item?.code) {
      handleSelect(item.code);
    }
  };

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
                    activePayload?: Array<{ payload?: TransactionChartItem }>;
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
                cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                formatter={(value) => [
                  Number(value).toLocaleString("ms-MY"),
                  "Transaksi",
                ]}
                labelClassName="font-semibold"
              />
              <Bar
                dataKey="transaksi"
                name="Transaksi"
                fill="#2563eb"
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
              <th className="px-3 py-2 text-center">Transaksi</th>
              <th className="px-3 py-2 text-center">Cawangan</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row, idx) => (
              <tr
                key={row.code}
                className={`hover:bg-blue-50 ${
                  selectedState === row.code ? "bg-blue-50" : ""
                }`}
              >
                <td className="px-3 py-2">{idx + 1}</td>
                <td className="px-3 py-2">
                  <button
                    className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                    onClick={() => handleSelect(row.code)}
                    type="button"
                  >
                    {row.negeri}
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 flex-1 max-w-[160px] rounded-full bg-gray-200">
                      <div
                        className="h-4 rounded-full bg-blue-500"
                        style={{
                          width: `${
                            totalTransaksi > 0
                              ? (row.transaksi / totalTransaksi) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-medium">
                      {row.transaksi.toLocaleString("ms-MY")}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    onClick={() => handleSelect(row.code)}
                    type="button"
                  >
                    {selectedState === row.code ? "Tutup" : "Lihat"}
                  </button>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-semibold">
              <td className="px-3 py-2" colSpan={2}>
                Jumlah
              </td>
              <td className="px-3 py-2 text-center">
                {totalTransaksi.toLocaleString("ms-MY")}
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
                Transaksi Cawangan: {selectedStateData.negeri}
              </h4>
              <p className="text-xs text-gray-500">
                Jumlah negeri:{" "}
                {selectedStateData.transaksi.toLocaleString("ms-MY")}
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
                    transaksi: branch.jumlah,
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
                    cursor={{ fill: "rgba(22, 163, 74, 0.08)" }}
                    formatter={(value) => [
                      Number(value).toLocaleString("ms-MY"),
                      "Transaksi",
                    ]}
                    labelClassName="font-semibold"
                  />
                  <Bar
                    dataKey="transaksi"
                    name="Transaksi"
                    fill="#16a34a"
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
                  <th className="px-3 py-2 text-center">Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {selectedBranches.map((branch, idx) => (
                  <tr key={branch.idCawangan} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {branch.idCawangan}
                    </td>
                    <td className="px-3 py-2">{branch.namaCawangan}</td>
                    <td className="px-3 py-2 text-center font-semibold">
                      {branch.jumlah.toLocaleString("ms-MY")}
                    </td>
                  </tr>
                ))}
                {selectedBranches.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-gray-400"
                      colSpan={4}
                    >
                      Tiada transaksi cawangan untuk negeri ini
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
