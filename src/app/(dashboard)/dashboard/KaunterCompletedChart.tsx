"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface KaunterCompletedItem {
  kaunter: string;
  bilSelesai: number;
}

interface Props {
  data: KaunterCompletedItem[];
}

export default function KaunterCompletedChart({ data }: Props) {
  return (
    <div className="border-b border-gray-200 px-4 py-4">
      <h4 className="mb-3 font-semibold text-gray-800">
        Bilangan Selesai Setiap Kaunter
      </h4>
      <div className="h-72 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 12, right: 16, left: 0, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="kaunter"
                tick={{ fontSize: 12, fill: "#4b5563" }}
                label={{
                  value: "Kaunter",
                  position: "insideBottom",
                  offset: -8,
                  fill: "#6b7280",
                  fontSize: 12,
                }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#4b5563" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                formatter={(value) => [
                  Number(value).toLocaleString("ms-MY"),
                  "Bil Selesai",
                ]}
                labelFormatter={(label) => `Kaunter ${label}`}
                labelClassName="font-semibold"
              />
              <Bar
                dataKey="bilSelesai"
                name="Bil Selesai"
                fill="#059669"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Tiada transaksi selesai hari ini
          </div>
        )}
      </div>
    </div>
  );
}
